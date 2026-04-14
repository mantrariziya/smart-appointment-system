"""
Smart Healthcare Appointment Scheduling API
Flask backend with AI Triage, ML Prediction, and Dynamic Queue Management.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from logger import setup_logger

logger = setup_logger(__name__)

from ml import model as ml_model
from ml import scheduler as sched_engine
from ml.scheduler import PatientStatus

from routes.doctor_schedule import doctor_schedule_bp
from routes.appointments import appointment_bp
from routes.notifications import notification_bp
from routes.dataset import dataset_bp
from routes.reports import report_bp
from routes.history import history_bp
from routes.payments import payment_bp
from routes.license import license_bp
from routes.analytics import analytics_bp
from routes.otp import otp_bp

from services import whatsapp
from services import doctor_whatsapp
from services.scheduler import start_notification_scheduler

app = Flask(__name__)

# CORS - restrict to allowed origins in production
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
CORS(app, origins=allowed_origins)

app.register_blueprint(doctor_schedule_bp)
app.register_blueprint(appointment_bp)
app.register_blueprint(notification_bp)
app.register_blueprint(dataset_bp)
app.register_blueprint(report_bp)
app.register_blueprint(history_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(license_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(otp_bp)

logger.info("Initializing Healthcare Time Predictor...")
try:
    ml_model.initialize_predictor()
except Exception as e:
    logger.error(f"Failed to initialize predictor: {e}")

try:
    from ml.noshow import initialize_all_models
    initialize_all_models()
except Exception as e:
    logger.warning(f"Dataset models init warning: {e}")

# ==============================================================================
# MOCK DATABASE & DYNAMIC QUEUE MANAGER
# ==============================================================================
DOCTORS = [
    {"id": "doc1", "name": "Dr. Sarah Adams (Cardiology)", "experience": 15, "phone": "+919876543210"},
    {"id": "doc2", "name": "Dr. John Smith (General)", "experience": 8, "phone": "+919876543211"},
    {"id": "doc3", "name": "Dr. Emily Chen (Pediatrics)", "experience": 12, "phone": "+919876543212"}
]

class QueueManager:
    def __init__(self):
        self.queue = []
        self.counter = 1

    def add_patient(self, appointment_data):
        appointment_data['id'] = f"A{self.counter:04d}"
        appointment_data['created_at'] = datetime.now().isoformat()
        self.counter += 1
        self.queue.append(appointment_data)
        self.reorder_queue()
        return appointment_data

    def reorder_queue(self):
        self.queue.sort(key=lambda x: (
            not x.get('triage', {}).get('is_emergency', False),
            -x.get('triage', {}).get('severity', 1),
            x['created_at']
        ))
        for i, pt in enumerate(self.queue):
            pt['queue_position'] = i + 1

    def get_waiting_time(self):
        return sum(pt.get('predicted_time', 20) for pt in self.queue)

q_manager = QueueManager()

# ==============================================================================
# FLASK API ROUTES
# ==============================================================================

@app.route('/doctors', methods=['GET'])
def get_doctors():
    return jsonify({'success': True, 'doctors': DOCTORS}), 200

@app.route('/available-slots', methods=['POST'])
def get_slots():
    try:
        data = request.get_json()
        doctor_id = data.get('doctor_id')
        date = data.get('date')

        if not doctor_id or not date:
            return jsonify({'success': False, 'error': 'Missing doctor or date'}), 400

        from firebase import schedules as firebase_schedules
        from firebase import appointments as firebase_appointments
        from datetime import datetime as dt, timedelta

        doctor_schedule = firebase_schedules.get_doctor_schedules(doctor_id, date)
        appointments = firebase_appointments.get_doctor_appointments(doctor_id, include_emergency=False)
        doc_appts = [a for a in appointments if a.get('date') == date]

        base_times = []
        curr = dt.strptime("08:00 AM", "%I:%M %p")
        end_time = dt.strptime("11:59 PM", "%I:%M %p")
        while curr <= end_time:
            next_time = curr + timedelta(minutes=15)
            if next_time > end_time:
                break
            base_times.append(f"{curr.strftime('%I:%M %p')} - {next_time.strftime('%I:%M %p')}")
            curr = next_time

        taken_slots = [a.get('timeSlot') for a in doc_appts if a.get('timeSlot')]

        available = []
        for slot in base_times:
            if slot in taken_slots:
                continue
            slot_start_dt = dt.strptime(slot.split(' - ')[0], "%I:%M %p")
            if not doctor_schedule:
                available.append(slot)
                continue
            for schedule in doctor_schedule:
                schedule_start = dt.strptime(schedule['startTime'], "%H:%M")
                schedule_end = dt.strptime(schedule['endTime'], "%H:%M")
                if schedule_start <= slot_start_dt <= schedule_end and schedule['status'] == 'Available':
                    available.append(slot)
                    break

        return jsonify({'success': True, 'slots': available})
    except Exception as e:
        logger.exception(f"Error in get_slots: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': ml_model.predictor is not None})

@app.route('/queue', methods=['GET'])
def get_queue():
    q_manager.reorder_queue()
    return jsonify({'success': True, 'queue': q_manager.queue, 'waiting_time': q_manager.get_waiting_time()}), 200

@app.route('/waiting-time', methods=['GET'])
def get_waiting_time():
    return jsonify({'success': True, 'waiting_time': q_manager.get_waiting_time(), 'queue_length': len(q_manager.queue)}), 200

@app.route('/smart-book', methods=['POST'])
def smart_book():
    try:
        data = request.get_json()
        if not data or 'symptoms' not in data:
            return jsonify({'success': False, 'error': 'Missing symptoms data'}), 400

        name = data.get('name', 'Unknown')
        age = int(data.get('age', 30))
        visit_type = int(data.get('visit_type', 0))
        symptoms = data.get('symptoms', '')
        doctor_id = data.get('doctor_id', 'doc2')
        appt_date = data.get('date', datetime.now().strftime("%Y-%m-%d"))
        time_slot = data.get('time_slot', '09:00 AM')

        from firebase import schedules as firebase_schedules
        from datetime import datetime as dt

        slot_start_dt = dt.strptime(time_slot.split(' - ')[0], "%I:%M %p")
        doctor_schedule = firebase_schedules.get_doctor_schedules(doctor_id, appt_date)

        is_doctor_available = not doctor_schedule
        unavailable_reason = ""

        for schedule in doctor_schedule:
            schedule_start = dt.strptime(schedule['startTime'], "%H:%M")
            schedule_end = dt.strptime(schedule['endTime'], "%H:%M")
            if schedule_start <= slot_start_dt <= schedule_end:
                if schedule['status'] == 'Available':
                    is_doctor_available = True
                else:
                    unavailable_reason = f"Doctor is {schedule['status'].lower()}"
                    if schedule.get('reason'):
                        unavailable_reason += f" ({schedule['reason']})"
                break

        if not is_doctor_available and doctor_schedule:
            return jsonify({'success': False, 'error': f'Doctor unavailable at selected time. {unavailable_reason}', 'doctor_unavailable': True}), 400

        doctor_name = "Unknown"
        doctor_experience = 10
        for d in DOCTORS:
            if d['id'] == doctor_id:
                doctor_experience = d['experience']
                doctor_name = d['name']
                break

        result = ml_model.predict_from_symptoms({
            "symptoms": symptoms, "age": age, "visit_type": visit_type,
            "past_avg_time": 0.0, "doctor_experience": doctor_experience
        })

        appointment = {
            "name": name, "age": age, "visit_type": visit_type, "symptoms": symptoms,
            "triage": result['triage'], "predicted_time": result['predicted_time'],
            "recommendation": result['recommendation'], "doctor_id": doctor_id,
            "doctor_name": doctor_name, "date": appt_date, "time_slot": time_slot
        }

        final_appt = q_manager.add_patient(appointment)
        sched_engine.add_patient_to_engine(final_appt)

        patient_phone = data.get('phone')
        whatsapp_sent = False
        whatsapp_sid = None

        if patient_phone:
            wa_result = whatsapp.send_appointment_confirmation(patient_phone, final_appt)
            if wa_result['success']:
                whatsapp_sent = True
                whatsapp_sid = wa_result.get('message_sid')
                if result.get('triage', {}).get('is_emergency', False):
                    whatsapp.send_emergency_alert(patient_phone, final_appt)
            else:
                logger.warning(f"WhatsApp failed: {wa_result.get('error')}")
        else:
            logger.info("No phone number provided, skipping WhatsApp")

        final_appt['whatsapp_sent'] = whatsapp_sent
        if whatsapp_sid:
            final_appt['whatsapp_sid'] = whatsapp_sid

        if result.get('triage', {}).get('is_emergency', False):
            doctor_phone = next((d.get('phone') for d in DOCTORS if d['id'] == doctor_id), None)
            if doctor_phone:
                doc_wa_result = doctor_whatsapp.send_emergency_alert_to_doctor(doctor_phone, final_appt)
                if not doc_wa_result['success']:
                    logger.warning(f"Doctor WhatsApp failed: {doc_wa_result.get('error')}")
            else:
                logger.warning(f"No phone found for doctor {doctor_id}")

            try:
                from services.notification import send_emergency_alert
                send_emergency_alert(doctor_id=doctor_id, patient_name=name, doctor_phone=None, doctor_token=None)
            except Exception as notif_err:
                logger.warning(f"Emergency alert failed: {notif_err}")

        return jsonify({'success': True, 'appointment': final_appt, 'message': 'Successfully scheduled and processed!', 'whatsapp_sent': whatsapp_sent}), 200

    except Exception as e:
        logger.exception(f"Error in smart_book: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/ai-triage', methods=['POST'])
def ai_triage():
    try:
        data = request.get_json()
        symptoms = data.get('symptoms', '')
        if not symptoms:
            return jsonify({'success': False, 'error': 'Missing symptoms'}), 400
        triage = ml_model.predictor.analyze_symptoms(symptoms)
        return jsonify({'success': True, 'triage': triage}), 200
    except Exception as e:
        logger.exception(f"Error in ai_triage: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==============================================================================
# DYNAMIC RESCHEDULING ENGINE ROUTES
# ==============================================================================

@app.route('/reschedule/update-status', methods=['POST'])
def update_patient_status():
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        new_status = data.get('status')
        arrival_str = data.get('arrivalTime')

        if not patient_id or not new_status:
            return jsonify({'success': False, 'error': 'patientId and status are required'}), 400

        status_map = {
            'Waiting': PatientStatus.WAITING, 'Checked-in': PatientStatus.CHECKED_IN,
            'Delayed': PatientStatus.DELAYED, 'In-Progress': PatientStatus.IN_PROGRESS,
            'Completed': PatientStatus.COMPLETED,
        }
        status_enum = status_map.get(new_status)
        if not status_enum:
            return jsonify({'success': False, 'error': f'Invalid status: {new_status}'}), 400

        arrival_dt = None
        if arrival_str:
            arrival_dt = datetime.fromisoformat(arrival_str.replace('Z', '').split('+')[0])

        engine = sched_engine.get_engine()
        engine.updateStatus(patient_id, status_enum, arrival_dt)

        return jsonify({'success': True, 'queue': engine.getQueue(), 'notifications': engine.notifications_log[-5:]}), 200

    except Exception as e:
        logger.exception(f"Error in update_patient_status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/reschedule/emergency', methods=['POST'])
def escalate_emergency():
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        if not patient_id:
            return jsonify({'success': False, 'error': 'patientId required'}), 400

        engine = sched_engine.get_engine()
        engine.markEmergency(patient_id)

        return jsonify({'success': True, 'message': f'{patient_id} escalated to EMERGENCY.', 'queue': engine.getQueue(), 'notifications': engine.notifications_log[-5:]}), 200

    except Exception as e:
        logger.exception(f"Error in escalate_emergency: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/reschedule/queue', methods=['GET'])
def get_rescheduled_queue():
    engine = sched_engine.get_engine()
    return jsonify({'success': True, 'queue': engine.getQueue(), 'total': len(engine.all_tasks), 'notifications_triggered': len(engine.notifications_log)}), 200


@app.route('/reschedule/sync-firebase', methods=['POST'])
def sync_firebase_to_queue():
    try:
        from firebase import appointments as firebase_appointments
        result = firebase_appointments.get_all_appointments()
        if not result.get('success'):
            return jsonify({'success': False, 'error': 'Failed to fetch appointments from Firebase'}), 500

        appointments = result.get('appointments', [])
        pending_appointments = [apt for apt in appointments if apt.get('status', '').lower() in ['pending', 'confirmed']]

        synced_count = 0
        skipped_count = 0
        errors = []
        engine = sched_engine.get_engine()
        existing_ids = {task.patientId for task in engine.all_tasks.values()}

        for apt in pending_appointments:
            try:
                patient_id = apt.get('id', f"FB_{apt.get('userId', 'unknown')[:8]}")
                if patient_id in existing_ids:
                    skipped_count += 1
                    continue
                sched_engine.add_patient_to_engine({
                    'id': patient_id, 'name': apt.get('patientName', 'Unknown Patient'),
                    'age': apt.get('patientAge', 30), 'visit_type': 0,
                    'symptoms': apt.get('symptoms', ''), 'triage': apt.get('triage', {}),
                    'predicted_time': apt.get('predictedTime', 20), 'doctor_id': apt.get('doctorId', 'doc1'),
                    'doctor_name': apt.get('doctorName', 'Unknown Doctor'),
                    'date': apt.get('date', datetime.now().strftime("%Y-%m-%d")),
                    'time_slot': apt.get('timeSlot', '09:00 AM'),
                    'created_at': apt.get('createdAt', datetime.now().isoformat())
                })
                synced_count += 1
            except Exception as e:
                errors.append(f"Error syncing {apt.get('id')}: {str(e)}")

        return jsonify({'success': True, 'message': f'Synced {synced_count} appointments to queue', 'synced': synced_count, 'skipped': skipped_count, 'total_firebase': len(pending_appointments), 'queue_size': len(engine.all_tasks), 'errors': errors or None}), 200

    except Exception as e:
        logger.exception(f"Error in sync_firebase_to_queue: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/reschedule/notifications', methods=['GET'])
def get_notifications():
    engine = sched_engine.get_engine()
    return jsonify({'success': True, 'notifications': engine.notifications_log}), 200


def sync_firebase_on_startup():
    try:
        from firebase import appointments as firebase_appointments
        result = firebase_appointments.get_all_appointments()
        if not result.get('success'):
            return
        appointments = result.get('appointments', [])
        pending = [apt for apt in appointments if apt.get('status', '').lower() in ['pending', 'confirmed']]
        synced = 0
        for apt in pending:
            try:
                patient_id = apt.get('id', f"FB_{apt.get('userId', 'unknown')[:8]}")
                sched_engine.add_patient_to_engine({
                    'id': patient_id, 'name': apt.get('patientName', 'Unknown Patient'),
                    'age': apt.get('patientAge', 30), 'visit_type': 0,
                    'symptoms': apt.get('symptoms', ''), 'triage': apt.get('triage', {}),
                    'predicted_time': apt.get('predictedTime', 20), 'doctor_id': apt.get('doctorId', 'doc1'),
                    'doctor_name': apt.get('doctorName', 'Unknown Doctor'),
                    'date': apt.get('date', datetime.now().strftime("%Y-%m-%d")),
                    'time_slot': apt.get('timeSlot', '09:00 AM'),
                    'created_at': apt.get('createdAt', datetime.now().isoformat())
                })
                synced += 1
            except Exception as e:
                logger.warning(f"Skipped appointment {apt.get('id')}: {e}")
        logger.info(f"Synced {synced}/{len(pending)} appointments to queue")
    except Exception as e:
        logger.warning(f"Firebase sync failed: {e}")


if __name__ == '__main__':
    start_notification_scheduler(queue_getter=lambda: q_manager.queue, interval_seconds=60)
    sync_firebase_on_startup()
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    app.run(host=host, port=int(os.getenv('PORT', 5000)), debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')

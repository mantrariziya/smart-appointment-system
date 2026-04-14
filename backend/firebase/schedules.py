"""
Firebase Doctor Schedules Management
Handles doctor schedule CRUD operations with Firestore
"""
import os
from datetime import datetime
from google.cloud import firestore
from firebase.client import get_firestore_client

db = get_firestore_client()


def add_schedule(schedule_data):
    """
    Add new doctor schedule to Firestore
    
    Args:
        schedule_data (dict): Schedule details
            - doctorId (required)
            - doctorName (required)
            - date (required)
            - startTime (required)
            - endTime (required)
            - status (required): Available/Busy/Blocked
            - reason (optional)
    
    Returns:
        dict: {success: bool, scheduleId: str, message: str}
    """
    if not db:
        return {'success': False, 'message': 'Database not available'}
    
    try:
        # Validate required fields
        required_fields = ['doctorId', 'doctorName', 'date', 'startTime', 'endTime', 'status']
        for field in required_fields:
            if field not in schedule_data:
                return {'success': False, 'message': f'Missing required field: {field}'}
        
        # Prepare schedule document
        schedule = {
            'doctorId': schedule_data['doctorId'],
            'doctorName': schedule_data['doctorName'],
            'date': schedule_data['date'],
            'startTime': schedule_data['startTime'],
            'endTime': schedule_data['endTime'],
            'status': schedule_data['status'],
            'reason': schedule_data.get('reason', ''),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        # Add to Firestore
        doc_ref = db.collection('doctor_schedules').add(schedule)
        schedule_id = doc_ref[1].id
        
        
        return {
            'success': True,
            'scheduleId': schedule_id,
            'message': 'Schedule created successfully'
        }
        
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_doctor_schedules(doctor_id, date=None):
    """
    Get schedules for a specific doctor
    
    Args:
        doctor_id (str): Doctor's ID
        date (str, optional): Filter by specific date (YYYY-MM-DD)
    
    Returns:
        list: List of schedules
    """
    if not db:
        return []
    
    try:
        schedules = []
        schedules_ref = db.collection('doctor_schedules')
        
        # Query by doctor ID
        query = schedules_ref.where('doctorId', '==', doctor_id)
        
        # Optionally filter by date
        if date:
            query = query.where('date', '==', date)
        
        for doc in query.stream():
            schedule = doc.to_dict()
            schedule['id'] = doc.id
            schedules.append(schedule)
        
        # Sort by date and start time
        schedules.sort(key=lambda x: (x.get('date', ''), x.get('startTime', '')))
        
        return schedules
        
    except Exception as e:
        return []


def get_all_schedules(date=None):
    """
    Get all schedules, optionally filtered by date
    
    Args:
        date (str, optional): Filter by specific date (YYYY-MM-DD)
    
    Returns:
        list: List of all schedules
    """
    if not db:
        return []
    
    try:
        schedules = []
        schedules_ref = db.collection('doctor_schedules')
        
        if date:
            query = schedules_ref.where('date', '==', date)
        else:
            query = schedules_ref
        
        for doc in query.stream():
            schedule = doc.to_dict()
            schedule['id'] = doc.id
            schedules.append(schedule)
        
        # Sort by date, doctor, and start time
        schedules.sort(key=lambda x: (x.get('date', ''), x.get('doctorName', ''), x.get('startTime', '')))
        
        return schedules
        
    except Exception as e:
        return []


def update_schedule(schedule_id, update_data):
    """
    Update an existing schedule
    
    Args:
        schedule_id (str): Schedule document ID
        update_data (dict): Fields to update
    
    Returns:
        dict: {success: bool, message: str}
    """
    if not db:
        return {'success': False, 'message': 'Database not available'}
    
    try:
        doc_ref = db.collection('doctor_schedules').document(schedule_id)
        
        # Add updated timestamp
        update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
        
        doc_ref.update(update_data)
        
        
        return {
            'success': True,
            'message': 'Schedule updated successfully'
        }
        
    except Exception as e:
        return {'success': False, 'message': str(e)}


def delete_schedule(schedule_id):
    """
    Delete a schedule
    
    Args:
        schedule_id (str): Schedule document ID
    
    Returns:
        dict: {success: bool, message: str}
    """
    if not db:
        return {'success': False, 'message': 'Database not available'}
    
    try:
        db.collection('doctor_schedules').document(schedule_id).delete()
        
        return {
            'success': True,
            'message': 'Schedule deleted successfully'
        }
        
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_available_slots(doctor_id, date):
    """
    Get available time slots for a doctor on a specific date
    
    Args:
        doctor_id (str): Doctor's ID
        date (str): Date in YYYY-MM-DD format
    
    Returns:
        list: List of available time slots
    """
    if not db:
        return []
    
    try:
        schedules = get_doctor_schedules(doctor_id, date)
        
        # Filter only Available status schedules
        available_schedules = [s for s in schedules if s.get('status') == 'Available']
        
        # Format as slots
        slots = []
        for schedule in available_schedules:
            slots.append({
                'id': schedule['id'],
                'start_time': schedule['startTime'],
                'end_time': schedule['endTime'],
                'date': schedule['date']
            })
        
        return slots
        
    except Exception as e:
        return []


def get_doctor_status(doctor_id, date):
    """
    Get doctor availability status for a specific date
    
    Args:
        doctor_id (str): Doctor's ID
        date (str): Date in YYYY-MM-DD format
    
    Returns:
        dict: {has_availability: bool, available_slots: int, schedules: list}
    """
    if not db:
        return {'has_availability': False, 'available_slots': 0, 'schedules': []}
    
    try:
        schedules = get_doctor_schedules(doctor_id, date)
        available_schedules = [s for s in schedules if s.get('status') == 'Available']
        
        return {
            'has_availability': len(available_schedules) > 0,
            'available_slots': len(available_schedules),
            'schedules': schedules
        }
        
    except Exception as e:
        return {'has_availability': False, 'available_slots': 0, 'schedules': []}

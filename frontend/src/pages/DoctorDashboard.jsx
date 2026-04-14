import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import API_URL from '../services/api';
import PatientCard from '../components/doctor/PatientCard';
import Timer from '../components/doctor/Timer';
import AIInsight from '../components/doctor/AIInsight';
import NextPatients from '../components/doctor/NextPatients';
import NotesSection from '../components/doctor/NotesSection';
import Alert from '../components/doctor/Alert';
import EmptyState from '../components/doctor/EmptyState';
import LoadingState from '../components/doctor/LoadingState';
import StatsCard from '../components/doctor/StatsCard';
import KeyboardShortcuts from '../components/doctor/KeyboardShortcuts';
import HelpButton from '../components/doctor/HelpButton';
import VoiceReportGenerator from '../components/doctor/VoiceReportGenerator';

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [stats, setStats] = useState({ completed: 0, emergency: 0, avgTime: 0 });
  const [doctorName, setDoctorName] = useState('Dr. Unknown');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setDoctorId(user.uid);
        setDoctorName(user.displayName || user.email || 'Dr. Unknown');
        setDoctorEmail(user.email || '');
      } else {
        addAlert('Please log in to view appointments', 'error');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (doctorId) {
      fetchAppointments();
      const interval = setInterval(fetchAppointments, 10000);
      return () => clearInterval(interval);
    }
  }, [doctorId]);

  const fetchAppointments = async () => {
    if (!doctorId) return;
    try {
      const response = await fetch(`${API_URL}/appointments/doctor/${doctorId}`);
      const data = await response.json();
      if (data.success) {
        const appts = data.appointments || [];
        const sortedAppts = appts.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.timeSlot.localeCompare(b.timeSlot);
        });
        setAppointments(sortedAppts);
        const pendingAppts = sortedAppts.filter(a => a.status === 'pending');
        if (!currentPatient && pendingAppts.length > 0) setCurrentPatient(pendingAppts[0]);
        setStats(prev => ({
          ...prev,
          emergency: appts.filter(a => a.isEmergency && a.status === 'pending').length,
          completed: appts.filter(a => a.status === 'completed').length
        }));
      } else {
        addAlert('Failed to fetch appointments', 'error');
      }
    } catch (error) {
      addAlert('Network error - Could not connect to backend server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addAlert = (message, type = 'info') => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, message, type }]);
  };

  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const handleStartConsultation = async () => {
    if (!currentPatient) return;
    try {
      const response = await fetch(`${API_URL}/appointments/${currentPatient.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      const data = await response.json();
      if (data.success) {
        setIsConsulting(true);
        addAlert('Consultation started', 'success');
        fetchAppointments();
      } else {
        addAlert('Failed to start consultation', 'error');
      }
    } catch (error) {
      addAlert('Failed to start consultation', 'error');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentPatient) return;
    try {
      const response = await fetch(`${API_URL}/appointments/${currentPatient.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      const data = await response.json();
      if (data.success) {
        setIsConsulting(false);
        addAlert('Patient consultation completed', 'success');
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
        const pendingAppts = appointments.filter(a => a.status === 'pending' && a.id !== currentPatient.id);
        setCurrentPatient(pendingAppts.length > 0 ? pendingAppts[0] : null);
        fetchAppointments();
      } else {
        addAlert('Failed to complete consultation', 'error');
      }
    } catch (error) {
      addAlert('Failed to complete consultation', 'error');
    }
  };

  const handleSkipPatient = () => {
    if (!currentPatient) return;
    addAlert('Patient skipped', 'info');
    const pendingAppts = appointments.filter(a => a.status === 'pending' && a.id !== currentPatient.id);
    setCurrentPatient(pendingAppts.length > 0 ? pendingAppts[0] : null);
  };

  const handleSaveNotes = (patientId, notes) => {
    setConsultationNotes(notes);
    addAlert('Notes saved successfully', 'success');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {alerts.map((alert) => (
          <Alert key={alert.id} message={alert.message} type={alert.type} onClose={() => removeAlert(alert.id)} />
        ))}
      </div>

      <HelpButton />

      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                <span className="text-slate-800">Sma</span><span className="text-blue-600">Hosp</span> - Doctor Dashboard
              </h1>
              <p className="text-slate-500 mt-1">Manage your patient consultations</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAppointments}
                disabled={!doctorId}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${doctorId ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-sm text-slate-600">{doctorId ? 'Connected' : 'Not logged in'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{appointments.length} appointment(s) loaded</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard title="Pending" value={appointments.filter(a => a.status === 'pending').length} color="blue" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
            <StatsCard title="Completed Today" value={stats.completed} color="green" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatsCard title="Emergency Cases" value={stats.emergency} color="red" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
            <StatsCard title="Total Today" value={appointments.length} color="orange" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentPatient ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PatientCard patient={currentPatient} onStart={handleStartConsultation} onComplete={handleCompleteConsultation} onSkip={handleSkipPatient} />
              <NotesSection patientId={currentPatient.id} onSave={handleSaveNotes} />
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <button
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="font-bold text-lg">{showVoiceRecorder ? 'Hide' : 'Show'} Voice Report Generator</span>
                  </div>
                  <svg className={`w-6 h-6 transition-transform ${showVoiceRecorder ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showVoiceRecorder && (
                  <div className="mt-6">
                    <VoiceReportGenerator
                      doctorName={doctorName}
                      doctorEmail={doctorEmail}
                      patientInfo={{
                        name: currentPatient.patientName || currentPatient.name || 'Unknown Patient',
                        age: currentPatient.patientAge || currentPatient.age || 'N/A',
                        gender: currentPatient.patientGender || currentPatient.gender || 'N/A',
                        symptoms: currentPatient.symptoms || 'No symptoms recorded',
                        email: currentPatient.patientEmail || currentPatient.email || ''
                      }}
                      consultationNotes={consultationNotes}
                      appointmentId={currentPatient.id}
                      onReportGenerated={() => {
                        addAlert('Medical report generated successfully!', 'success');
                        setConsultationNotes('');
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <Timer predictedTime={currentPatient.predictedTime || currentPatient.predicted_time || 20} isActive={isConsulting} />
              <AIInsight patient={currentPatient} />
              <NextPatients patients={appointments.filter(a => a.status === 'pending' && a.id !== currentPatient?.id).slice(0, 5)} />
              <KeyboardShortcuts onStart={handleStartConsultation} onComplete={handleCompleteConsultation} onSkip={handleSkipPatient} isConsulting={isConsulting} />
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;

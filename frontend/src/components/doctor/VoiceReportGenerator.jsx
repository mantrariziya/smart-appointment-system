import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { sendReportToBoth, initEmailJS } from '../../services/email';
import API_URL from '../../services/api';

const VoiceReportGenerator = ({ doctorName, doctorEmail, patientInfo, consultationNotes, onReportGenerated, appointmentId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const languages = [
    { code: 'en-IN', name: 'English (India)', groqLang: 'English' },
    { code: 'hi-IN', name: 'हिंदी (Hindi)', groqLang: 'Hindi' },
    { code: 'mr-IN', name: 'मराठी (Marathi)', groqLang: 'Marathi' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', groqLang: 'Gujarati' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)', groqLang: 'Tamil' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)', groqLang: 'Telugu' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', groqLang: 'Kannada' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)', groqLang: 'Malayalam' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)', groqLang: 'Bengali' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)', groqLang: 'Punjabi' },
    { code: 'en-US', name: 'English (US)', groqLang: 'English' },
    { code: 'es-ES', name: 'Español (Spanish)', groqLang: 'Spanish' },
    { code: 'fr-FR', name: 'Français (French)', groqLang: 'French' },
    { code: 'de-DE', name: 'Deutsch (German)', groqLang: 'German' },
    { code: 'zh-CN', name: '中文 (Chinese)', groqLang: 'Chinese' },
    { code: 'ja-JP', name: '日本語 (Japanese)', groqLang: 'Japanese' },
    { code: 'ar-SA', name: 'العربية (Arabic)', groqLang: 'Arabic' },
  ];

  useEffect(() => {
    initEmailJS();
  }, []);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported. Please use Chrome or Edge.');
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => initializeRecognition())
      .catch(() => toast.error('Microphone access denied. Please allow microphone access.'));
  };

  const initializeRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        setTranscript('');
        setRecordingTime(0);
        timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        const langName = languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
        toast.success(`Recording started in ${langName}`);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript) setTranscript(prev => prev + finalTranscript);
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') toast.error('No speech detected.');
        else if (event.error === 'audio-capture') toast.error('Microphone not found.');
        else if (event.error === 'not-allowed') toast.error('Microphone permission denied.');
        else toast.error(`Recognition error: ${event.error}`);
        stopRecording();
      };

      recognition.onend = () => {
        if (isRecording && !isPaused) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      toast.error('Failed to initialize speech recognition');
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      toast.success('Recording resumed');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    toast.success('Recording stopped');
  };

  const processTranscript = async () => {
    const fullTranscript = transcript.trim();
    const notes = consultationNotes?.trim() || '';
    if (!fullTranscript && !notes) { toast.error('No transcript or notes to process'); return; }

    let combinedText = '';
    if (fullTranscript) combinedText += `Voice Recording:\n${fullTranscript}\n\n`;
    if (notes) combinedText += `Doctor's Written Notes:\n${notes}`;

    setIsProcessing(true);
    try {
      const groqLanguage = languages.find(l => l.code === selectedLanguage)?.groqLang || 'English';
      const response = await fetch(`${API_URL}/report/parse-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: combinedText, language: groqLanguage })
      });
      const data = await response.json();
      if (data.success) {
        const extracted = data.reportData;
        extracted.patientName = patientInfo?.name || extracted.patientName || 'Unknown Patient';
        extracted.age = patientInfo?.age || extracted.age || 'N/A';
        extracted.gender = patientInfo?.gender || extracted.gender || 'N/A';
        extracted.doctorName = doctorName || 'Dr. Unknown';
        setReportData(extracted);
        toast.success(`AI extracted medical information in ${groqLanguage}!`);
        if (onReportGenerated) onReportGenerated(extracted);
      } else {
        toast.error(data.error || 'Failed to process transcript');
      }
    } catch (error) {
      toast.error('Failed to process transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = async () => {
    if (!reportData) { toast.error('No report data to generate PDF'); return; }
    try {
      const sendEmail = window.confirm('Do you want to email this report to patient and doctor?\n\nOK = email + download PDF\nCancel = only download PDF');
      const response = await fetch(`${API_URL}/report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reportData, appointmentId })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Medical_Report_${reportData.patientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded successfully!');
        if (sendEmail) {
          const patientEmail = patientInfo?.email;
          if (!patientEmail && !doctorEmail) { toast.error('No email addresses available.'); return; }
          toast.loading('Sending emails...', { id: 'email-sending' });
          const emailResult = await sendReportToBoth({ patientEmail, patientName: reportData.patientName, doctorEmail, doctorName, reportData });
          toast.dismiss('email-sending');
          emailResult.success ? toast.success('Emails sent successfully!') : toast.error('Email sending failed');
        }
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const printReport = async () => {
    if (!reportData) { toast.error('No report data to print'); return; }
    try {
      const response = await fetch(`${API_URL}/report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reportData, appointmentId })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); window.URL.revokeObjectURL(url); }, 1000);
        };
        toast.success('Print dialog opened!');
      } else {
        toast.error('Failed to generate PDF for printing');
      }
    } catch (error) {
      toast.error('Failed to print report');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Voice Consultation Recorder
            </h3>
            <p className="text-gray-500 mt-1">Record consultation and generate AI-powered medical report</p>
          </div>
          {isRecording && (
            <div className="text-right">
              <div className="text-3xl font-bold text-red-600 flex items-center gap-2">
                <span className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></span>
                {formatTime(recordingTime)}
              </div>
              <p className="text-sm text-gray-500">Recording...</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Recording Language</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 font-medium"
          >
            <optgroup label="Indian Languages">
              {languages.filter(l => l.code.endsWith('-IN')).map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </optgroup>
            <optgroup label="Other Languages">
              {languages.filter(l => !l.code.endsWith('-IN')).map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </optgroup>
          </select>
          <p className="text-sm text-gray-500 mt-2">
            {isRecording
              ? <span className="text-orange-600 font-medium">Cannot change language during recording</span>
              : 'Select language before starting recording. AI will process in the same language.'
            }
          </p>
        </div>

        <div className="flex gap-4">
          {!isRecording ? (
            <button onClick={startRecording} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Start Recording
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button onClick={pauseRecording} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button onClick={resumeRecording} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resume
                </button>
              )}
              <button onClick={stopRecording} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {(transcript || consultationNotes) && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold text-gray-900">Content to Process</h4>
            <button onClick={processTranscript} disabled={isProcessing || isRecording} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2">
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing with AI...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Extract with AI
                </>
              )}
            </button>
          </div>

          {transcript && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-blue-600 mb-2">Voice Recording Transcript</h5>
              <div className="bg-blue-50 rounded-xl p-4 max-h-48 overflow-y-auto border border-blue-200">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{transcript}</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">{transcript.split(' ').length} words &bull; {transcript.length} characters</p>
            </div>
          )}

          {consultationNotes && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-green-600 mb-2">Doctor's Written Notes</h5>
              <div className="bg-green-50 rounded-xl p-4 max-h-48 overflow-y-auto border border-green-200">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{consultationNotes}</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">{consultationNotes.split(' ').length} words &bull; {consultationNotes.length} characters</p>
            </div>
          )}

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-800">AI will analyze both voice recording and written notes together to create a comprehensive medical report.</p>
          </div>
        </div>
      )}

      {reportData && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-lg border-2 border-green-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AI Extracted Medical Report
            </h4>
            <div className="flex gap-3">
              <button onClick={generatePDF} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
              <button onClick={printReport} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Patient Name</p>
                <p className="text-lg font-bold text-gray-900">{reportData.patientName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Age / Gender</p>
                <p className="text-lg font-bold text-gray-900">{reportData.age} / {reportData.gender}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Symptoms</p>
              <ul className="list-disc list-inside text-gray-700">
                {reportData.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Diagnosis</p>
              <ul className="list-disc list-inside text-gray-700">
                {reportData.diagnosis.map((diag, i) => <li key={i}>{diag}</li>)}
              </ul>
            </div>
            {reportData.medicines && reportData.medicines.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Medicines</p>
                <div className="space-y-2">
                  {reportData.medicines.map((med, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-3">
                      <p className="font-semibold text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceReportGenerator;

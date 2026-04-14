import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiLogIn, FiActivity } from 'react-icons/fi';
import API_URL from '../services/api';

// ─── Steps: 'login' | 'forgot' | 'otp' | 'reset' ───────────────────────────

const Login = () => {
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        toast.success(`Welcome back, ${userData.name}!`);
        if (userData.role === 'admin') navigate('/admin-dashboard');
        else if (userData.role === 'doctor') navigate('/doctor-dashboard');
        else navigate('/user-dashboard');
      } else {
        toast.error('User data not found');
        await auth.signOut();
      }
    } catch (error) {
      if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error.code)) {
        toast.error('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('OTP sent to your email!');
        setStep('otp');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch {
      toast.error('Failed to send OTP. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) { toast.error('Please enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('OTP verified!');
        setStep('reset');
      } else {
        toast.error(data.error || 'Invalid OTP');
      }
    } catch {
      toast.error('Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ─────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { toast.error('Please fill in all fields'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPassword)) { toast.error('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(newPassword)) { toast.error('Password must contain at least one number'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password reset successfully! Please login.');
        setStep('login');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch {
      toast.error('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Branding Panel ─────────────────────────────────────────────────────────
  const BrandPanel = () => (
    <div className="hidden md:flex md:w-2/3 lg:w-[75%] bg-blue-600 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900 relative justify-center items-center p-12 overflow-hidden group/brand">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50 mix-blend-screen">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
      </div>
      <div className="relative z-10 text-center animate-fadeIn max-w-4xl">
        <div className="inline-flex justify-center items-center w-28 h-28 rounded-[2.5rem] bg-white/10 backdrop-blur-xl mb-10 shadow-2xl border border-white/20 hover:scale-110 hover:rotate-6 transition-all duration-500 cursor-default">
          <FiActivity className="h-14 w-14 text-white drop-shadow-lg" />
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-[5.5rem] leading-[1.1] font-extrabold tracking-tight mb-8">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-blue-200">SmaHosp</span>
        </h1>
        <p className="text-xl lg:text-2xl font-light text-blue-100/90 mx-auto leading-relaxed max-w-2xl">
          Pioneering the future of healthcare management with seamless, intelligent, and secure appointments.
        </p>
      </div>
    </div>
  );

  const inputClass = "block w-full pl-12 py-3.5 border-2 border-white/80 focus:border-blue-500 text-sm bg-white/50 focus:bg-white transition-all duration-300 outline-none hover:border-blue-200 focus:ring-4 focus:ring-blue-500/20 rounded-2xl backdrop-blur-md";
  const btnClass = "group relative w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-xl shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden transform hover:-translate-y-1 active:translate-y-0";

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
      <BrandPanel />

      <div className="w-full md:w-1/3 lg:w-[25%] flex flex-col justify-center py-6 px-4 sm:px-8 relative z-20 overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/40">
        <div className="absolute top-[20%] right-[-10%] w-[120%] h-[60%] bg-blue-300/10 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="w-full max-w-md mx-auto flex flex-col h-full justify-center relative z-10">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-[2rem] p-8 sm:p-10">

            {/* ── LOGIN ── */}
            {step === 'login' && (
              <>
                <div className="mb-10">
                  <div className="md:hidden flex justify-center mb-8">
                    <div className="p-4 bg-white/80 rounded-[1.5rem] shadow-sm border border-white/50">
                      <FiActivity className="h-10 w-10 text-blue-600" />
                    </div>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight relative inline-block">
                    Sign In
                    <div className="absolute -bottom-2 left-1/2 md:left-0 transform -translate-x-1/2 md:translate-x-0 w-12 h-1 bg-blue-600 rounded-full"></div>
                  </h2>
                  <p className="mt-6 text-sm text-gray-500 font-medium">
                    New here?{' '}
                    <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-bold hover:underline underline-offset-4">Create an account</Link>
                  </p>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                  <div className="group/email relative">
                    <label className="block text-sm font-semibold text-gray-700 group-focus-within/email:text-blue-600 mb-2 ml-1">Email address</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400 group-focus-within/email:text-blue-500" />
                      </div>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="admin@hospital.com" />
                    </div>
                  </div>

                  <div className="group/password relative">
                    <label className="block text-sm font-semibold text-gray-700 group-focus-within/password:text-blue-600 mb-2 ml-1">Password</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400 group-focus-within/password:text-blue-500" />
                      </div>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                    </div>
                    <div className="flex justify-end mt-2 mr-1">
                      <button type="button" onClick={() => setStep('forgot')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline underline-offset-4">
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={loading} className={btnClass}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:translate-x-[150%] transition-transform duration-700"></div>
                      {loading ? (
                        <span className="flex items-center gap-3 relative z-10">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 relative z-10">
                          <FiLogIn className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          Sign in securely
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {step === 'forgot' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Forgot Password</h2>
                  <p className="text-sm text-gray-500">Enter your email and we'll send you a 6-digit OTP.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSendOtp}>
                  <div className="group/email relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Email address</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="your@email.com" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className={btnClass}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                  <button type="button" onClick={() => setStep('login')} className="w-full text-sm text-gray-500 hover:text-blue-600 font-semibold transition-colors">
                    &larr; Back to Login
                  </button>
                </form>
              </>
            )}

            {/* ── VERIFY OTP ── */}
            {step === 'otp' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Enter OTP</h2>
                  <p className="text-sm text-gray-500">We sent a 6-digit OTP to <strong>{email}</strong>. Valid for 10 minutes.</p>
                </div>
                <form className="space-y-6" onSubmit={handleVerifyOtp}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="block w-full py-4 text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 focus:border-blue-500 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 bg-white transition-all"
                      placeholder="------"
                    />
                  </div>
                  <button type="submit" disabled={loading} className={btnClass}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button type="button" onClick={() => { setStep('forgot'); setOtp(''); }} className="w-full text-sm text-gray-500 hover:text-blue-600 font-semibold transition-colors">
                    &larr; Resend OTP
                  </button>
                </form>
              </>
            )}

            {/* ── RESET PASSWORD ── */}
            {step === 'reset' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-2">New Password</h2>
                  <p className="text-sm text-gray-500">Set a new password for <strong>{email}</strong>.</p>
                </div>
                <form className="space-y-6" onSubmit={handleResetPassword}>
                  <div className="group/np relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">New Password</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Min. 6 characters" />
                    </div>
                  </div>
                  <div className="group/cp relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Confirm Password</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repeat password" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className={btnClass}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

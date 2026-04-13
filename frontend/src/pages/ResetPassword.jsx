import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = useMemo(() => searchParams.get('oobCode') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase config is missing. Set VITE_FIREBASE_* keys in frontend/.env.');
      return;
    }

    if (!oobCode) {
      setError('Invalid reset link. Please use the link sent to your email.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess('Password updated successfully. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      if (err?.code === 'auth/expired-action-code') {
        setError('This reset link has expired. Request a new password reset email.');
      } else if (err?.code === 'auth/invalid-action-code') {
        setError('This reset link is invalid. Request a new password reset email.');
      } else {
        setError('Unable to reset password. Please request a new reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="glass-panel w-full max-w-md p-10 rounded-3xl relative z-10 animate-fade-in-up">
        <h2 className="text-3xl font-bold font-['Outfit'] text-white text-center">Reset Password</h2>
        <p className="text-slate-400 mt-2 text-sm text-center">Enter your new password below.</p>

        <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
          {error && <div className="bg-rose-500/10 text-rose-400 px-4 py-3 rounded-xl text-sm border border-rose-500/20">{error}</div>}
          {success && <div className="bg-emerald-500/10 text-emerald-400 px-4 py-3 rounded-xl text-sm border border-emerald-500/20">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 font-semibold">
            {loading ? 'Please wait...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

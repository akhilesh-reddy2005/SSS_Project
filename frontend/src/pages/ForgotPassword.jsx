import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetLink('');

    try {
      const response = await api.post('/auth.php?action=forgot_password', { email });
      if (response.data.status === 'success') {
        setMessage(response.data.message || 'If the email exists, a reset link has been generated.');
        if (response.data.reset_link) {
          setResetLink(response.data.reset_link);
        }
      } else {
        setError(response.data.message || 'Unable to process request.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="glass-panel w-full max-w-md p-10 rounded-3xl relative z-10 animate-fade-in-up">
        <h2 className="text-3xl font-bold font-['Outfit'] text-white text-center">Forgot Password</h2>
        <p className="text-slate-400 mt-2 text-sm text-center">Enter your email to generate a password reset link.</p>

        <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
          {error && <div className="bg-rose-500/10 text-rose-400 px-4 py-3 rounded-xl text-sm border border-rose-500/20">{error}</div>}
          {message && <div className="bg-emerald-500/10 text-emerald-400 px-4 py-3 rounded-xl text-sm border border-emerald-500/20">{message}</div>}

          {resetLink && (
            <div className="bg-indigo-500/10 text-indigo-200 px-4 py-3 rounded-xl text-sm border border-indigo-500/20 break-words">
              Reset link: <a href={resetLink} className="underline">{resetLink}</a>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Email</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 font-semibold">
            {loading ? 'Please wait...' : 'Generate Reset Link'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Remembered your password?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

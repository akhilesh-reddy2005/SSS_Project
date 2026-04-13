import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Wallet, Loader2, UserPlus } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, loginWithGoogle } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await register(name, email, password);
      setSuccess(result?.message || 'Verification email sent. Please verify before sign in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Decorative blurred blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="glass-panel w-full max-w-md p-10 rounded-3xl relative z-10 animate-fade-in-up">
        <div className="text-center flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/30 mb-6">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold font-['Outfit'] text-white">Create Account</h2>
          <p className="text-slate-400 mt-2 text-sm">Sign up to start tracking your expenses.</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-500/10 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium border border-rose-500/20 flex items-center animate-scale-in">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium border border-emerald-500/20 animate-scale-in">
              {success}
            </div>
          )}
          
          <div className="space-y-5">
             <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center shadow-cyan-500/25 from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="tracking-wide font-semibold">Create Account</span>
              )}
            </button>
          </div>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-500 uppercase tracking-wider">
          <div className="h-px flex-1 bg-slate-700/60"></div>
          <span>Or</span>
          <div className="h-px flex-1 bg-slate-700/60"></div>
        </div>

        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          onError={setError}
          disabled={loading}
        />
        
        <div className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

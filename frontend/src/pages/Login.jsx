import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Wallet, Loader2, ArrowRight } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import InstallAppButton from '../components/InstallAppButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, loginWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
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
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="glass-panel w-full max-w-sm p-7 sm:p-8 rounded-2xl relative z-10 animate-fade-in-up">
        <div className="text-center flex flex-col items-center mb-6">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/30 mb-4">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-['Outfit'] text-white">Welcome Back</h2>
          <p className="text-slate-400 mt-2 text-sm">Sign in to manage your expenses.</p>
        </div>
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-500/10 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium border border-rose-500/20 flex items-center animate-scale-in">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}
          
          <div className="space-y-4">
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
          
          <div className="pt-1">
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center group">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="mr-2 tracking-wide font-semibold">Sign In</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <div className="text-right mt-3">
              <Link to="/forgot-password" className="text-sm text-indigo-300 hover:text-indigo-200">
                Forgot password?
              </Link>
            </div>
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

        <div className="mt-3">
          <InstallAppButton fullWidth className="py-3" />
        </div>
        
        <div className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;

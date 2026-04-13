import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';

const GoogleSignInButton = ({ onCredential, onError, disabled = false }) => {
  const [busy, setBusy] = useState(false);

  const handleGoogleClick = async () => {
    if (!isFirebaseConfigured) {
      onError?.('Firebase config is missing. Set VITE_FIREBASE_* keys in frontend/.env.');
      return;
    }

    try {
      setBusy(true);
      const result = await signInWithPopup(auth, googleProvider);
      onCredential(result.user);
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user') {
        onError?.('Google sign-in popup was closed before completion.');
      } else {
        onError?.('Google sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
        Google Sign-In is disabled. Set VITE_FIREBASE_* keys in frontend/.env.
      </div>
    );
  }

  return (
    <div className={disabled || busy ? 'opacity-60 pointer-events-none' : ''}>
      <button
        type="button"
        onClick={handleGoogleClick}
        className="w-full bg-white text-slate-800 hover:bg-slate-100 rounded-xl py-2.5 px-4 font-semibold text-sm transition flex items-center justify-center gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.21 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.003 13 24 13c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.169 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.19 0-9.626-3.329-11.288-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.037 12.037 0 0 1-4.084 5.571h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        {busy ? 'Connecting...' : 'Continue with Google'}
      </button>
    </div>
  );
};

export default GoogleSignInButton;
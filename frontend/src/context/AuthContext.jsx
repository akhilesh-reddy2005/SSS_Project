import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';

const getFirebaseAuthErrorMessage = (error) => {
  const code = error?.code || '';

  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is disabled in Firebase. Enable it in Firebase Console -> Authentication -> Sign-in method.';
  }

  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in instead.';
  }

  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }

  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use at least 6 characters.';
  }

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a bit and try again.';
  }

  return error?.message || 'Authentication failed. Please try again.';
};

const isLocalhost = () => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const isDemoUserEmail = (email) => {
  return String(email || '').trim().toLowerCase() === 'demo@example.com';
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const response = await api.get('/auth.php?action=me');
      if (response.data.status === 'success') {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const loginWithBackendFallback = async (email, password) => {
    const response = await api.post('/auth.php?action=login', { email, password });
    if (response.data.status === 'success') {
      setUser(response.data.user);
      return true;
    }

    throw new Error(response.data.message || 'Invalid email or password.');
  };

  const login = async (email, password) => {
    try {
      if (!isFirebaseConfigured || !auth) {
        if (isLocalhost() && isDemoUserEmail(email)) {
          return await loginWithBackendFallback(email, password);
        }

        throw new Error('Firebase config is missing. Set VITE_FIREBASE_* keys in frontend/.env.');
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      await reload(credential.user);

      if (!credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } catch (e) {
          // Ignore resend errors and still block access until verification.
        }

        await firebaseSignOut(auth);
        throw new Error('Please verify your email first. A verification email has been sent.');
      }

      const idToken = await credential.user.getIdToken();
      const response = await api.post('/auth.php?action=firebase', { idToken });

      if (response.data.status === 'success') {
        setUser(response.data.user);
        return true;
      }

      await firebaseSignOut(auth);
      throw new Error(response.data.message);
    } catch (error) {
      const isFirebaseCredentialError =
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found';

      if (isLocalhost() && isDemoUserEmail(email) && isFirebaseCredentialError) {
        return await loginWithBackendFallback(email, password);
      }

      if (error?.code) {
        throw new Error(getFirebaseAuthErrorMessage(error));
      }

      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase config is missing. Set VITE_FIREBASE_* keys in frontend/.env.');
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      await sendEmailVerification(credential.user);
      await firebaseSignOut(auth);

      return {
        requiresVerification: true,
        message: 'Verification email sent. Please verify your email before signing in.'
      };
    } catch (error) {
      if (error?.code) {
        throw new Error(getFirebaseAuthErrorMessage(error));
      }

      throw error;
    }
  };

  const loginWithGoogle = async (idToken) => {
    const response = await api.post('/auth.php?action=google', { idToken });
    if (response.data.status === 'success') {
      setUser(response.data.user);
      return true;
    }
    throw new Error(response.data.message || 'Google sign-in failed.');
  };

  const logout = async () => {
    await api.post('/auth.php?action=logout');
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  };

  const refreshUser = async () => {
    await checkUser();
  };

  const updateProfileName = async (name) => {
    const response = await api.post('/auth.php?action=update_profile', { name });
    if (response.data.status === 'success') {
      setUser(response.data.user);
      return response.data.user;
    }
    throw new Error(response.data.message || 'Unable to update profile.');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, refreshUser, updateProfileName, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

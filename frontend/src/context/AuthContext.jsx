import React, { createContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { ensureUserProfile, getUserProfile, updateUserProfileName } from '../services/firebaseData';

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

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        const profile = (await getUserProfile(firebaseUser.uid)) || (await ensureUserProfile(firebaseUser));
        setUser({
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: profile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || profile?.email || '',
          photoURL: firebaseUser.photoURL || profile?.photoURL || '',
          isAnonymous: firebaseUser.isAnonymous || false
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      if (!isFirebaseConfigured || !auth) {
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

      await ensureUserProfile(credential.user);
      setUser({
        id: credential.user.uid,
        uid: credential.user.uid,
        name: credential.user.displayName || credential.user.email?.split('@')[0] || 'User',
        email: credential.user.email || '',
        photoURL: credential.user.photoURL || '',
        isAnonymous: credential.user.isAnonymous || false
      });
      return true;
    } catch (error) {
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
      await ensureUserProfile(credential.user);

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

  const loginWithGoogle = async (firebaseUser) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase config is missing. Set VITE_FIREBASE_* keys in frontend/.env.');
    }

    if (!firebaseUser?.uid) {
      throw new Error('Google sign-in failed.');
    }

    await ensureUserProfile(firebaseUser);
    setUser({
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || '',
      isAnonymous: firebaseUser.isAnonymous || false
    });
    return true;
  };

  const loginAsDemo = async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase config is missing. Set VITE_FIREBASE_* keys in frontend/.env.');
    }

    const credential = await signInAnonymously(auth);
    await ensureUserProfile(credential.user);
    setUser({
      id: credential.user.uid,
      uid: credential.user.uid,
      name: 'Demo User',
      email: '',
      photoURL: '',
      isAnonymous: true
    });

    return true;
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  };

  const refreshUser = async () => {
    if (!auth?.currentUser) {
      setUser(null);
      return;
    }

    const firebaseUser = auth.currentUser;
    await reload(firebaseUser);
    const profile = (await getUserProfile(firebaseUser.uid)) || (await ensureUserProfile(firebaseUser));
    setUser({
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: profile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || profile?.email || '',
      photoURL: firebaseUser.photoURL || profile?.photoURL || '',
      isAnonymous: firebaseUser.isAnonymous || false
    });
  };

  const updateProfileName = async (name) => {
    if (!auth?.currentUser) {
      throw new Error('You must be signed in.');
    }

    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      throw new Error('Name is required.');
    }

    await updateProfile(auth.currentUser, { displayName: normalizedName });
    const userProfile = await updateUserProfileName(auth.currentUser.uid, normalizedName);
    setUser((prev) => ({
      ...(prev || {}),
      id: auth.currentUser.uid,
      uid: auth.currentUser.uid,
      name: userProfile.name,
      email: auth.currentUser.email || prev?.email || '',
      isAnonymous: auth.currentUser.isAnonymous || prev?.isAnonymous || false
    }));

    return userProfile;
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!auth?.currentUser?.email) {
      throw new Error('You must be signed in.');
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, loginAsDemo, logout, refreshUser, updateProfileName, changePassword, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

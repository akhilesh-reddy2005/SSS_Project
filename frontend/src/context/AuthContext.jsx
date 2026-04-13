import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

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

  const login = async (email, password) => {
    const response = await api.post('/auth.php?action=login', { email, password });
    if (response.data.status === 'success') {
      setUser(response.data.user);
      return true;
    }
    throw new Error(response.data.message);
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth.php?action=register', { name, email, password });
    if (response.data.status === 'success') {
      setUser(response.data.user);
      return true;
    }
    throw new Error(response.data.message);
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

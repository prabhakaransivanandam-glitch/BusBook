import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('busbook:token');
    const saved = JSON.parse(localStorage.getItem('busbook:user') || 'null');
    if (!token || !saved) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUser(saved);
    setRole(saved.role || 'passenger');
    setProfile(saved);

    api('/auth/me')
      .then((me) => {
        if (me?.profile) {
          setProfile(me.profile);
          setRole(me.profile.role);
          setUser({ ...saved, ...me.profile, displayName: me.profile.name });
          localStorage.setItem('busbook:user', JSON.stringify({ ...saved, ...me.profile }));
        }
      })
      .catch(() => {
        localStorage.removeItem('busbook:token');
        localStorage.removeItem('busbook:user');
        setUser(null);
        setRole(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    role,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    signIn: async (email, password) => {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
        authenticated: false,
      });
      localStorage.setItem('busbook:token', data.token);
      localStorage.setItem('busbook:user', JSON.stringify(data.user));
      setUser({ ...data.user, displayName: data.user.name });
      setRole(data.user.role);
      setProfile(data.user);
      return data.user.role;
    },
    signUp: async ({ name, phone, email, password }) => {
      const data = await api('/auth/register', {
        method: 'POST',
        body: { name, phone, email, password },
        authenticated: false,
      });
      localStorage.setItem('busbook:token', data.token);
      localStorage.setItem('busbook:user', JSON.stringify(data.user));
      setUser({ ...data.user, displayName: data.user.name });
      setRole(data.user.role);
      setProfile(data.user);
      return data.user.role;
    },
    signOutUser: async () => {
      localStorage.removeItem('busbook:token');
      localStorage.removeItem('busbook:user');
      setUser(null);
      setRole(null);
      setProfile(null);
    },
    resetPassword: async () => true,
    refreshSession: async () => {
      try {
        const me = await api('/auth/me');
        if (me?.profile) {
          setRole(me.profile.role);
          setProfile(me.profile);
        }
      } catch { /* ignore */ }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

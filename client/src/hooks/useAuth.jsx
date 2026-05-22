import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('farm_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('farm_token');
    if (token) {
      api.get('/auth/profile')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('farm_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('farm_token');
          localStorage.removeItem('farm_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, token } = res.data;
    localStorage.setItem('farm_token', token);
    localStorage.setItem('farm_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { user, token } = res.data;
    localStorage.setItem('farm_token', token);
    localStorage.setItem('farm_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const socialLogin = useCallback(async (email, name, avatar, provider) => {
    const res = await api.post('/auth/social-login', { email, name, avatar, provider });
    const { user, token } = res.data;
    localStorage.setItem('farm_token', token);
    localStorage.setItem('farm_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const phoneLogin = useCallback(async (phone) => {
    const res = await api.post('/auth/phone-login', { phone });
    return res.data;
  }, []);

  const verifyPhoneOtp = useCallback(async (phone, otp) => {
    const res = await api.post('/auth/phone-otp', { phone, otp });
    const { user, token } = res.data;
    localStorage.setItem('farm_token', token);
    localStorage.setItem('farm_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('farm_token');
    localStorage.removeItem('farm_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('farm_user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, socialLogin, phoneLogin, verifyPhoneOtp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

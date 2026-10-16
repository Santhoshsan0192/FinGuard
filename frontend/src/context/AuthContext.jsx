import React, { createContext, useContext, useState, useEffect } from 'react';
import finguardApi from '../api/finguardApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('finguard_token');
    const storedRole = localStorage.getItem('finguard_role');
    const storedUser = localStorage.getItem('finguard_user');
    
    if (token) {
      setUser(storedUser);
      setRole(storedRole);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await finguardApi.login(username, password);
      setUser(res.username);
      setRole(res.role);
      return { success: true, role: res.role };
    } catch (error) {
      const message = error.response?.data?.message || (error.message?.includes('Network') ? 'Network error connecting to backend (check CORS / port 8080)' : 'Invalid credentials');
      return { success: false, message };
    }
  };

  const logout = () => {
    finguardApi.logout();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

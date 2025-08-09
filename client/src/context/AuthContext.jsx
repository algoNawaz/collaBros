import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To check if initial user status is loaded

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Basic token validation (you might want to send to backend to verify fully)
      try {
        const decoded = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
        if (decoded.exp * 1000 > Date.now()) { // Check if token is expired
          setUser({ token, username: decoded.username || 'User', id: decoded.id }); // Add user ID from token
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      // Decode the token to get username and id
      const decoded = JSON.parse(atob(res.data.token.split('.')[1]));
      setUser({ token: res.data.token, username: decoded.username || 'User', id: decoded.id });
      return true;
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data.message : error.message);
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { username, email, password });
      localStorage.setItem('token', res.data.token);
      const decoded = JSON.parse(atob(res.data.token.split('.')[1]));
      setUser({ token: res.data.token, username: decoded.username || 'User', id: decoded.id });
      return true;
    } catch (error) {
      console.error('Registration error:', error.response ? error.response.data.message : error.message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

interface User {
  id: number;
  phone_number?: string;
  role: 'customer' | 'worker' | 'admin';
  is_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (access: string, refresh: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get('access_token');
      if (token) {
        try {
          // Assuming there's a `/users/me/` endpoint. If not, this logic might need adjustment.
          const res = await api.get('/users/me/'); 
          setUser(res.data);
        } catch (err) {
          console.error("Failed to fetch user on load", err);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (access: string, refresh: string) => {
    Cookies.set('access_token', access);
    Cookies.set('refresh_token', refresh);
    try {
      const res = await api.get('/users/me/');
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user after login", err);
      setUser(null);
    }
  };

  const logout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

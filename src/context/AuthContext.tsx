import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import { api, storage } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (roleOrEmail: string) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = storage.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
      } catch (err: any) {
        console.warn('Session verification failed:', err.message || err);
        // If session is expired or token is invalid, clear stale credentials
        if (
          err.message?.includes('Session expired') ||
          err.message?.includes('invalid token') ||
          err.message?.includes('Authentication required') ||
          err.message?.includes('Access denied')
        ) {
          storage.removeToken();
          storage.removeUser();
          setUser(null);
        } else {
          // If offline network error, keep local user
          const local = storage.getUser();
          if (local) setUser(local);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(identifier, password);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      storage.removeToken();
      storage.removeUser();
    } finally {
      setUser(null);
    }
  };

  const switchUser = async (target: string) => {
    let creds = { identifier: 'admin@company.com', password: 'admin123' };
    if (target === 'arun' || target === 'arun@company.com') {
      creds = { identifier: 'arun@company.com', password: 'arun123' };
    } else if (target === 'priya' || target === 'priya@company.com') {
      creds = { identifier: 'priya@company.com', password: 'priya123' };
    } else if (target === 'karthik' || target === 'karthik@company.com') {
      creds = { identifier: 'karthik@company.com', password: 'karthik123' };
    } else if (target === 'employee' || target === 'employee@company.com') {
      creds = { identifier: 'employee@company.com', password: 'employee123' };
    }
    await login(creds.identifier, creds.password);
  };

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // silent
    }
  };

  const clearError = () => setError(null);

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAdmin,
        isEmployee,
        login,
        logout,
        switchUser,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

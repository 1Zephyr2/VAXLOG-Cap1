import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'patient' | 'staff';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string, role: UserRole): boolean => {
    // Mock authentication - in real app, this would call an API
    if (email && password) {
      const mockUser: User = {
        id: '1',
        email,
        name: role === 'staff' ? 'Dr. Sarah Johnson' : 'Jessica Thompson',
        role,
        avatarUrl: role === 'staff' 
          ? 'https://i.pravatar.cc/300?img=47' 
          : 'https://i.pravatar.cc/300?img=5',
      };
      setUser(mockUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
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

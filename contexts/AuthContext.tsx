import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/api/authApi';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isVenueOwner: boolean;
  createdAt: string;
  updatedAt: string;
  profileImage?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (userData: User) => Promise<void>;
  register: (name: string, email: string, password: string, isVenueOwner: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('Checking logged-in status, token exists:', !!token);
        
        if (token) {
          const userData = await authApi.getProfile();
          console.log('User profile loaded:', userData);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking logged-in status:', error);
        // Clear invalid token
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const login = async (identifier: string, otp: string): Promise<void> => {
    try {
      console.log('Login context called with user data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Login context failed:', error);
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    isVenueOwner: boolean
  ): Promise<void> => {
    try {
      // This is handled in the register screen
      const userData = await authApi.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Registration context failed:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
      setUser(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear user anyway
      setUser(null);
      throw error;
    }
  };

  const updateUserProfile = async (data: FormData | Partial<User>): Promise<void> => {
    if (!user) throw new Error('User not logged in');

    try {
      console.log('Updating user profile:', data);
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authApi.getProfile();
      setUser(userData);
      console.log('User profile refreshed');
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUserProfile, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
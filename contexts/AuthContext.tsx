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
  login: () => Promise<void>;
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
        const savedUser = await AsyncStorage.getItem('user');
        
        if (token && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log('Loaded user from storage:', parsedUser);
          setUser(parsedUser);
          
          // Background sync to get fresh data
          try {
            const userData = await authApi.getProfile();
            console.log('Background sync fetched:', userData);
            setUser(userData);
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            console.log('Background profile sync successful');
          } catch (error) {
            console.error('Background profile sync failed:', error);
            // Keep the cached user data if sync fails
          }
        } else {
          console.log('No token or saved user found');
        }
      } catch (e) {
        console.error('Startup check failed', e);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  const login = async (): Promise<void> => {
    try {
      console.log('Starting login process...');
      setLoading(true);
      
      const userData = await authApi.getProfile();
      console.log('User data fetched from API:', userData);
      
      // Force state update with new object reference
      setUser({ ...userData });
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      console.log('Login successful, user state and storage updated');
      console.log('Current user state:', userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
      console.log('Login loading set to false');
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    isVenueOwner: boolean
  ): Promise<void> => {
    try {
      console.log('Starting registration process...');
      setLoading(true);
      const userData = await authApi.getProfile();
      setUser({ ...userData });
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('Registration successful');
    } catch (error) {
      console.error('Registration context failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('Starting logout process...');
      setLoading(true);
      
      // Clear state first
      setUser(null);
      
      // Then clear storage
      await authApi.logout();
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      // Always clear user even if API call fails
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
      console.log('Logout complete, loading set to false');
    }
  };

  const updateUserProfile = async (data: FormData | Partial<User>): Promise<void> => {
    if (!user) throw new Error('User not logged in');

    try {
      console.log('Updating user profile...');
      const updatedUser = await authApi.updateProfile(data);
      setUser({ ...updatedUser });
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      console.log('Refreshing user profile...');
      const userData = await authApi.getProfile();
      setUser({ ...userData });
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('User profile refreshed successfully');
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/api/authApi';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SESSION_TIMEOUT_MS, SESSION_EXPIRED_MESSAGE } from '@/contexts/sessionTimeout';


const clearSessionAndRedirect = async (message?: string) => {

  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('tokenIssuedAt');
    await AsyncStorage.removeItem('sessionExpiresAt');
  } finally {
    setTimeout(() => {
      if (message) {
        Alert.alert('Session expired', message, [{ text: 'Login', onPress: () => router.replace('/(auth)/login') }]);
      } else {
        router.replace('/(auth)/login');
      }
    }, 0);
  }
};

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
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearIfExpired = async (showMessage: boolean) => {
      const sessionExpiresAtRaw = await AsyncStorage.getItem('sessionExpiresAt');
      const sessionExpiresAt = sessionExpiresAtRaw ? Number(sessionExpiresAtRaw) : null;
      const token = await AsyncStorage.getItem('token');

      if (!token) return;
      if (!sessionExpiresAt || Number.isNaN(sessionExpiresAt)) return;

      if (Date.now() >= sessionExpiresAt) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('tokenIssuedAt');
        await AsyncStorage.removeItem('sessionExpiresAt');

        if (showMessage) {
          Alert.alert(
            'Session expired',
            'Please login again to continue.',
            [{ text: 'Login', onPress: () => router.replace('/(auth)/login') }],
          );
        } else {
          router.replace('/(auth)/login');
        }
      }
    };

    const checkLoggedIn = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');

        // Always require login after a reinstall / fresh start.
        // App storage can sometimes be restored from backups, so we intentionally
        // do not auto-rehydrate session from AsyncStorage on startup.
        if (token || savedUser) {
          // If user exists in storage, treat as expired/invalid and force fresh login.
          // Also, respect our explicit session expiry if it exists.
          await clearIfExpired(false);

          // Force login after reinstall / fresh start.
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('tokenIssuedAt');
          await AsyncStorage.removeItem('sessionExpiresAt');
          console.log('Auth session cleared on startup; user must login again');
        }

        // Start interval watcher only while provider is mounted
        intervalId = setInterval(() => {
          clearIfExpired(false);
        }, 15 * 1000);

        console.log('No authenticated user (forced login required)');

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
      setUser(null);
      await authApi.logout();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
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
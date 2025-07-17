import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://admin.bookvenue.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  // Send OTP for login via mobile
  login: async (mobile: string) => {
    try {
      const response = await api.post('/login', { mobile });
      console.log('Login OTP sent successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login Error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
  },

  // Send OTP for login via email
  loginEmail: async (email: string) => {
    try {
      const response = await api.post('/login-via-email', { email });
      console.log('Email Login OTP sent successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Email Login Error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to send OTP to email');
    }
  },

  // Send OTP for registration
  register: async (identifier: string) => {
    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail ? { email: identifier } : { mobile: identifier };
      console.log('Sending registration OTP:', payload);
      
      const response = await api.post('/register', payload);
      console.log('Registration OTP sent successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Register Error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to send registration OTP');
    }
  },

  // Verify OTP for login via mobile
  verifyOTP: async (mobile: string, otp: string) => {
    try {
      console.log('Verifying mobile OTP:', { mobile, otp });
      const response = await api.post('/verify-otp', { mobile, otp });
      console.log('Mobile OTP verification response:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error: any) {
      console.error('Mobile OTP Verification Error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to verify OTP');
    }
  },

  // Verify OTP for login via email
  verifyOTPEmail: async (email: string, otp: string) => {
    try {
      console.log('Verifying email OTP:', { email, otp });
      const response = await api.post('/verify-otp-via-email', { email, otp });
      console.log('Email OTP verification response:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error: any) {
      console.error('Email OTP Verification Error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to verify email OTP');
    }
  },

  // Verify OTP for registration
  verifyRegisterOTP: async (identifier: string, otp: string, name?: string) => {
    try {
      const isEmail = identifier.includes('@');
      const payload = {
        [isEmail ? 'email' : 'mobile']: identifier,
        otp,
        ...(name && { name })
      };
      
      console.log('Verifying registration OTP:', payload);
      const response = await api.post('/verify-register-user', payload);
      console.log('Registration OTP verification response:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error: any) {
      console.error('Register OTP Verification Error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to verify registration OTP');
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/get-user-details');
      const userData = response.data.user;
      
      const profileData = {
        id: userData.id.toString(),
        name: userData.name,
        email: userData.email,
        phone: userData.contact || userData.phone || userData.mobile,
        address: userData.address,
        isVenueOwner: false,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };
      
      console.log('Profile fetched successfully:', profileData);
      return profileData;
    } catch (error: any) {
      console.error('Get profile error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to get profile');
    }
  },

  updateProfile: async (userData: any) => {
    try {
      console.log('Updating profile:', userData);
      const response = await api.post('/profileUpdate', userData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Profile update response:', response.data);
      
      if (response.statusText === 'OK' || response.status === 200) {
        return response.data.user || userData;
      }
      
      throw new Error('Failed to update profile');
    } catch (error: any) {
      console.error('Profile update error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }
};
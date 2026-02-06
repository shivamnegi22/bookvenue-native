import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://admin.bookvenue.app/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');

  // Define routes that do NOT need a token
  const publicEndpoints = [
    '/login',
    '/register',
    '/login-via-email',
    '/verify-otp',
  ];
  const isPublic = publicEndpoints.some((endpoint) =>
    config.url?.endsWith(endpoint),
  );

  if (token && !isPublic) {
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
  },
);

export const authApi = {
  // Send OTP for login via mobile
  login: async (mobile: string) => {
    try {
      console.log('Sending login OTP to mobile:', mobile);
      const response = await api.post('/login', { mobile: mobile.toString() });
      return response.data;
    } catch (error: any) {
      // CHANGE: Log more detail to see what's actually happening
      console.log('Full Error Object:', JSON.stringify(error, null, 2));

      if (error.response) {
        // The server responded with a status code outside the 2xx range
        console.error('Data:', error.response.data);
        console.error('Status:', error.response.status);
        throw new Error(
          error.response.data.message || 'Server rejected OTP request',
        );
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(
          'No response from server. Check your internet connection.',
        );
      } else {
        throw new Error(error.message);
      }
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
      throw new Error(
        error.response?.data?.message || 'Failed to send OTP to email',
      );
    }
  },

  // Send OTP for registration
  register: async (mobile: string, name?: string) => {
    try {
      const payload = { mobile, name };
      console.log('Sending registration OTP:', payload);

      const response = await api.post('/register', payload);
      console.log('Registration OTP sent successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Register Error:', error.response?.data || error);
      throw new Error(
        error.response?.data?.message || 'Failed to send registration OTP',
      );
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
        // REMOVE THIS - don't save user here, let getProfile + login handle it
        // if (response.data.user) {
        //   await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        // }
      }
      return response.data;
    } catch (error: any) {
      console.error(
        'Mobile OTP Verification Error:',
        error.response?.data || error,
      );
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
        // REMOVE THIS - don't save user here, let getProfile + login handle it
        // if (response.data.user) {
        //   await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        // }
      }
      return response.data;
    } catch (error: any) {
      console.error(
        'Email OTP Verification Error:',
        error.response?.data || error,
      );
      throw new Error(
        error.response?.data?.message || 'Failed to verify email OTP',
      );
    }
  },

  // Verify OTP for registration
  verifyRegisterOTP: async (mobile: string, otp: string) => {
    try {
      const payload = {
        mobile,
        otp,
      };

      console.log('Verifying registration OTP:', payload);
      const response = await api.post('/verifyuser', payload);
      console.log('Registration OTP verification response:', response.data);

      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      console.error(
        'Register OTP Verification Error:',
        error.response?.data || error,
      );
      throw new Error(
        error.response?.data?.message || 'Failed to verify registration OTP',
      );
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
        updatedAt: userData.updated_at,
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
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Profile update response:', response.data);

      if (response.status === 200) {
        // Fetch updated profile data
        const updatedProfile = await api.get('/get-user-details');
        const updatedUserData = updatedProfile.data.user;

        return {
          id: updatedUserData.id.toString(),
          name: updatedUserData.name,
          email: updatedUserData.email,
          phone:
            updatedUserData.contact ||
            updatedUserData.phone ||
            updatedUserData.mobile,
          address: updatedUserData.address,
          profileImage: updatedUserData.image
            ? `https://admin.bookvenue.app/${updatedUserData.image}`
            : undefined,
          isVenueOwner: false,
          createdAt: updatedUserData.created_at,
          updatedAt: updatedUserData.updated_at,
        };
      }

      throw new Error('Failed to update profile');
    } catch (error: any) {
      console.error('Profile update error:', error.response?.data || error);
      throw new Error(
        error.response?.data?.message || 'Failed to update profile',
      );
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
  },
};

import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    getFcmToken();
  }
};

const getFcmToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    // TODO: Send this token to your backend (Shivam-Sir's API)
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
};


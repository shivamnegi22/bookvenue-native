import { getApp } from '@react-native-firebase/app';
import { Alert } from 'react-native';
import {
  getMessaging,
  onMessage,
  getToken,
  requestPermission,
  AuthorizationStatus,
  subscribeToTopic,
  setBackgroundMessageHandler
} from '@react-native-firebase/messaging';

// Initialize messaging instance
const app = getApp(); // Optional: getMessaging() works without this for the default app
const messaging = getMessaging(app);

export const requestUserPermission = async () => {
  // Use the standalone requestPermission function
  const authStatus = await requestPermission(messaging);

  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    await getFcmToken();
    await subscribeToAllUsers();
  }
};

export const getFcmToken = async () => {
  try {
    // Use the standalone getToken function
    const token = await getToken(messaging);
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.log('Error getting token:', error);
  }
};

export const subscribeToAllUsers = async () => {
  try {
    const messaging = getMessaging();
    // Every user will now listen to this "all_users" channel
    await subscribeToTopic(messaging, 'all_users');
    console.log('Successfully subscribed to all_users topic');
  } catch (error) {
    console.error('Topic subscription failed:', error);
  }
};

export const listenToForegroundMessages = () => {
  const unsubscribe = onMessage(getMessaging(), async (remoteMessage) => {
    Alert.alert(
      remoteMessage.notification.title,
      remoteMessage.notification.body,
    );
  });
  return unsubscribe;
};

// This handles notifications when the app is background or killed
setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log('Message handled in the background!', remoteMessage);
  // Optional: If you use a library like notifee , you can trigger a local notification here.
});
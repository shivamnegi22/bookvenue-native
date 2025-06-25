declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: 'https://admin.bookvenue.app/api';
      EXPO_PUBLIC_API_KEY: string;
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: string;
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    }
  }
}

// Ensure this file is treated as a module
export {};
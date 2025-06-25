import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext'; // make sure this path is correct

export default function AuthLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </AuthProvider>
  );
}

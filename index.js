import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be a function that returns the ExpoRouter component
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
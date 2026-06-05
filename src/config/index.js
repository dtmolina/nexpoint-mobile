// App-wide configuration. The API base URL is injected at build time from the
// EXPO_PUBLIC_API_URL env var (see .env.example), falling back to localhost for
// the iOS simulator.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

export const brand = {
  productName: 'Nexpoint',
  tagline: 'Sign in to your account',
};

// Keys used for persisted auth state in AsyncStorage.
export const STORAGE_KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  business: 'auth_business',
};

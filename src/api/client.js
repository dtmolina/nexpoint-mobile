import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../config';

// Single axios instance for the whole app. Unlike the web client this uses
// pure Bearer-token auth (no cookies / withCredentials), which is the right
// model for a native client talking to Laravel Sanctum's token guard.
const client = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach the persisted token to every request. The request interceptor may
// return a promise, so reading from AsyncStorage here is safe.
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a 401 the token is stale or revoked. Clear it and let the navigator fall
// back to the login screen. A subscriber hook reacts to the cleared state.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.token,
        STORAGE_KEYS.user,
        STORAGE_KEYS.business,
      ]);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// Pull a human-readable message out of a Laravel error response.
export const errorMessage = (error, fallback = 'Something went wrong.') =>
  error?.response?.data?.message || error?.message || fallback;

export default client;

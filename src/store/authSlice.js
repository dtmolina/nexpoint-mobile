import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { errorMessage } from '../api/client';
import { STORAGE_KEYS } from '../config';

const persist = async ({ token, user, business }) => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.token, token],
    [STORAGE_KEYS.user, JSON.stringify(user)],
    [STORAGE_KEYS.business, JSON.stringify(business ?? null)],
  ]);
};

const clearPersisted = () =>
  AsyncStorage.multiRemove([
    STORAGE_KEYS.token,
    STORAGE_KEYS.user,
    STORAGE_KEYS.business,
  ]);

// Rehydrate auth state from storage on cold start so a logged-in user lands
// straight on the bookings screen.
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const entries = await AsyncStorage.multiGet([
    STORAGE_KEYS.token,
    STORAGE_KEYS.user,
    STORAGE_KEYS.business,
  ]);
  const map = Object.fromEntries(entries);
  return {
    token: map[STORAGE_KEYS.token] || null,
    user: map[STORAGE_KEYS.user] ? JSON.parse(map[STORAGE_KEYS.user]) : null,
    business: map[STORAGE_KEYS.business] ? JSON.parse(map[STORAGE_KEYS.business]) : null,
  };
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(credentials);
    // Super admins have no fixed business — they pick one after login. Everyone
    // else must have a business assigned.
    const isSuperAdmin = data.user?.role === 'super_admin';
    if (!isSuperAdmin && !data.business) {
      return rejectWithValue('No business is assigned to your account.');
    }
    await persist(data);
    return data;
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Login failed.'));
  }
});

// Set the active business (super admin switching). Persisted so the choice
// survives a cold start.
export const selectBusiness = createAsyncThunk('auth/selectBusiness', async (business) => {
  await AsyncStorage.setItem(STORAGE_KEYS.business, JSON.stringify(business));
  return business;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {
    // Best effort: still clear local state even if the network call fails.
  }
  await clearPersisted();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    user: null,
    business: null,
    bootstrapped: false, // true once restoreSession finishes
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Triggered by the 401 interceptor to drop the user back to login.
    sessionExpired: (state) => {
      state.token = null;
      state.user = null;
      state.business = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.token = payload.token;
        state.user = payload.user;
        state.business = payload.business;
        state.bootstrapped = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.bootstrapped = true;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.token = payload.token;
        state.user = payload.user;
        state.business = payload.business;
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload || 'Login failed.';
      })
      .addCase(selectBusiness.fulfilled, (state, { payload }) => {
        state.business = payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.business = null;
      });
  },
});

export const { clearError, sessionExpired } = authSlice.actions;
export default authSlice.reducer;

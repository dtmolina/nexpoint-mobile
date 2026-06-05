import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
import { restoreSession, sessionExpired } from './src/store/authSlice';
import { setUnauthorizedHandler } from './src/api/client';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

function AppContent() {
  const dispatch = useDispatch();
  const bootstrapped = useSelector((s) => s.auth.bootstrapped);

  useEffect(() => {
    // Rehydrate the persisted session, and wire the 401 interceptor to redux so
    // an expired token drops the user back to the login stack.
    dispatch(restoreSession());
    setUnauthorizedHandler(() => dispatch(sessionExpired()));
    return () => setUnauthorizedHandler(null);
  }, [dispatch]);

  // Hold on a splash-style loader until storage is read, avoiding a login-screen
  // flash for already-authenticated users.
  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

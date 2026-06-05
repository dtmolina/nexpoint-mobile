import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import BusinessPickerScreen from '../screens/BusinessPickerScreen';
import BookingsScreen from '../screens/BookingsScreen';
import BookingDetailsScreen from '../screens/BookingDetailsScreen';

const Stack = createNativeStackNavigator();

const detailsOptions = {
  title: 'Booking',
  headerShown: true,
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.text },
  headerShadowVisible: false,
};

// Auth-gated navigation: the token in redux decides which stack renders, so
// login and the 401 interceptor switch screens declaratively.
//
// Super admins have no fixed business, so their stack also includes the business
// picker — used as the entry point until one is chosen, and reachable from the
// Bookings header to switch. Regular users go straight to their business.
export default function RootNavigator() {
  const { isAuthenticated, isSuperAdmin, business } = useAuth();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isSuperAdmin && !business ? 'BusinessPicker' : 'Bookings'}
    >
      {isSuperAdmin && (
        <Stack.Screen name="BusinessPicker" component={BusinessPickerScreen} />
      )}
      <Stack.Screen name="Bookings" component={BookingsScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} options={detailsOptions} />
    </Stack.Navigator>
  );
}

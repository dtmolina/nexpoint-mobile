import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { brand } from '../config';
import { colors, radius, spacing, typography } from '../theme';
import TextField from '../components/TextField';
import Button from '../components/Button';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Navigation away on success is handled by RootNavigator reacting to the auth
// token, so this screen only validates input and dispatches the login thunk.
export default function LoginScreen() {
  const { signIn, isLoading, error, dismissError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!email) next.email = 'Email is required';
    else if (!isEmail(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Minimum 8 characters';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = () => {
    if (error) dismissError();
    if (!validate()) return;
    signIn({ email: email.trim(), password });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoMark}>N</Text>
            </View>
            <Text style={styles.title}>{brand.productName}</Text>
            <Text style={styles.subtitle}>{brand.tagline}</Text>
          </View>

          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextField
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.field}
            />
            <TextField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
              style={styles.field}
            />
            <Button title="Sign In" onPress={onSubmit} loading={isLoading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    height: 64,
    width: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoMark: { color: '#ffffff', fontSize: 30, fontWeight: '800' },
  title: { ...typography.title },
  subtitle: { ...typography.muted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  field: { marginBottom: spacing.lg },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.danger, fontSize: 14 },
});

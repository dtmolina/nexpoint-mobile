import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { platformApi } from '../api/platformApi';
import { errorMessage } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';

// Super-admin business switcher. Reached after login when no business is active,
// and from the Bookings header to switch. Selecting a business sets it as active
// and routes to its bookings.
export default function BusinessPickerScreen({ navigation }) {
  const { user, business: activeBusiness, signOut, selectBusiness } = useAuth();

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchBusinesses = useCallback(async () => {
    try {
      const { data } = await platformApi.getBusinesses();
      setBusinesses(data.businesses || []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load businesses.'));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBusinesses().finally(() => setLoading(false));
  }, [fetchBusinesses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBusinesses().finally(() => setRefreshing(false));
  }, [fetchBusinesses]);

  const choose = async (biz) => {
    await selectBusiness(biz);
    navigation.navigate('Bookings');
  };

  const renderItem = ({ item }) => {
    const isActive = item.slug === activeBusiness?.slug;
    const disabled = !item.is_active;
    return (
      <Pressable
        onPress={() => !disabled && choose(item)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.card,
          isActive && styles.cardActive,
          disabled && styles.cardDisabled,
          pressed && !disabled && styles.cardPressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.slug}>{item.slug}</Text>
        </View>
        {disabled ? (
          <Text style={styles.inactiveTag}>Inactive</Text>
        ) : isActive ? (
          <Text style={styles.activeTag}>Current</Text>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Select a business</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
        </View>
        <Pressable onPress={signOut} hitSlop={8} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {error ? 'Something went wrong' : 'No businesses found'}
              </Text>
              <Text style={styles.emptyBody}>{error || 'There are no businesses to manage yet.'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.title },
  subtitle: { ...typography.muted, marginTop: 2 },
  signOut: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  signOutText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardDisabled: { opacity: 0.5 },
  cardPressed: { opacity: 0.7 },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryDark, fontWeight: '700', fontSize: 18 },
  cardBody: { flex: 1 },
  name: { ...typography.body, fontWeight: '600' },
  slug: { ...typography.caption, marginTop: 2 },
  chevron: { fontSize: 26, color: colors.textFaint, lineHeight: 26 },
  activeTag: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  inactiveTag: { color: colors.textFaint, fontWeight: '600', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: { ...typography.heading, marginBottom: spacing.xs },
  emptyBody: { ...typography.muted, textAlign: 'center' },
});

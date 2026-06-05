import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { bookingApi } from '../api/bookingApi';
import { errorMessage } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';
import StatusBadge from '../components/StatusBadge';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function BookingsScreen() {
  const navigation = useNavigation();
  const { business, signOut, isSuperAdmin } = useAuth();
  const slug = business?.slug;

  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Fetch a page of bookings. page 1 replaces the list; later pages append.
  const fetchPage = useCallback(
    async (page = 1) => {
      if (!slug) return;
      const params = { page, per_page: 15 };
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();

      try {
        const { data } = await bookingApi.getBookings(slug, params);
        setMeta(data.meta);
        setBookings((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setError(null);
      } catch (err) {
        setError(errorMessage(err, 'Could not load bookings.'));
      }
    },
    [slug, status, search]
  );

  // Reload from page 1 whenever the status filter or debounced search changes.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetchPage(1).finally(() => setLoading(false));
    }, search ? 350 : 0); // debounce typing, run filter changes immediately
    return () => clearTimeout(t);
  }, [fetchPage, search]);

  // Silently refetch page 1 when returning to the list (e.g. after confirming or
  // cancelling on the details screen), skipping the initial focus to avoid a
  // duplicate of the mount fetch above.
  const firstFocus = useRef(true);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      fetchPage(1);
    });
    return unsub;
  }, [navigation, fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1).finally(() => setRefreshing(false));
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (loadingMore || loading) return;
    if (!meta || meta.current_page >= meta.last_page) return;
    setLoadingMore(true);
    fetchPage(meta.current_page + 1).finally(() => setLoadingMore(false));
  }, [meta, loadingMore, loading, fetchPage]);

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('BookingDetails', { id: item.id })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.reference}>{item.reference}</Text>
        <StatusBadge status={item.status} label={item.status_label} />
      </View>
      <Text style={styles.customer}>{item.customer_name}</Text>
      <View style={styles.serviceRow}>
        {item.service?.color ? (
          <View style={[styles.dot, { backgroundColor: item.service.color }]} />
        ) : null}
        <Text style={styles.service}>{item.service?.name || 'Service'}</Text>
      </View>
      <Text style={styles.datetime}>
        {item.booking_date_formatted} · {item.time_range}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>
            {business?.name ? `${business.name} · ` : ''}
            {meta?.total ?? 0} total
          </Text>
        </View>
        {isSuperAdmin && (
          <Pressable onPress={() => navigation.navigate('BusinessPicker')} hitSlop={8} style={styles.headerAction}>
            <Text style={styles.headerActionText}>Switch</Text>
          </Pressable>
        )}
        <Pressable onPress={signOut} hitSlop={8} style={styles.headerAction}>
          <Text style={styles.headerActionText}>Sign out</Text>
        </Pressable>
      </View>

      <TextInput
        placeholder="Search name, email, reference…"
        placeholderTextColor={colors.textFaint}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />

      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(f) => f.value || 'all'}
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipRowContent}
        renderItem={({ item }) => {
          const active = item.value === status;
          return (
            <Pressable
              onPress={() => setStatus(item.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {error ? 'Something went wrong' : 'No bookings found'}
              </Text>
              <Text style={styles.emptyBody}>
                {error || 'Try adjusting your search or filters.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={styles.footer} />
            ) : null
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
  headerAction: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  headerActionText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  searchInput: {
    marginHorizontal: spacing.lg,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  },
  chipRow: { flexGrow: 0 },
  chipRowContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#ffffff' },
  listContent: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardPressed: { opacity: 0.7 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reference: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  customer: { ...typography.body, fontWeight: '600', marginTop: spacing.xs },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { height: 8, width: 8, borderRadius: 4 },
  service: { ...typography.muted },
  datetime: { ...typography.caption, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: { ...typography.heading, marginBottom: spacing.xs },
  emptyBody: { ...typography.muted, textAlign: 'center' },
  footer: { paddingVertical: spacing.lg },
});

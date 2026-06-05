import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { bookingApi } from '../api/bookingApi';
import { errorMessage } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';
import StatusBadge from '../components/StatusBadge';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Local YYYY-MM-DD key. Built from local date parts (not toISOString) so a cell
// keys to the same day the user sees, regardless of timezone offset.
const toKey = (date) => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
};

// Parse a YYYY-MM-DD key back to a local Date (avoids the UTC shift that
// `new Date('2026-06-06')` would introduce).
const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// Lay out a month as weeks (Sunday-first), padding leading/trailing cells with
// null so every week has seven slots.
const buildWeeks = (cursor) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { business } = useAuth();
  const slug = business?.slug;

  const todayKey = useMemo(() => toKey(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // The list endpoint has no date-range filter, so we pull a generous page
  // ordered by date and bucket it by day on the client. Plenty for typical
  // volumes; very large datasets would need a backend range filter.
  const fetchBookings = useCallback(async () => {
    if (!slug) return;
    try {
      const { data } = await bookingApi.getBookings(slug, {
        per_page: 200,
        sort: 'booking_date',
        order: 'asc',
      });
      const buckets = {};
      for (const b of data.data) {
        if (!b.booking_date) continue;
        (buckets[b.booking_date] ||= []).push(b);
      }
      setByDate(buckets);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the calendar.'));
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    fetchBookings().finally(() => setLoading(false));
  }, [fetchBookings]);

  // Silently refetch when returning to the screen, so status changes made on the
  // details screen show up. Skip the first focus to avoid duplicating the mount
  // fetch above.
  const firstFocus = useRef(true);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      fetchBookings();
    });
    return unsub;
  }, [navigation, fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings().finally(() => setRefreshing(false));
  }, [fetchBookings]);

  const weeks = useMemo(() => buildWeeks(monthCursor), [monthCursor]);
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedBookings = byDate[selectedKey] || [];
  const selectedLabel = parseKey(selectedKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const stepMonth = (delta) =>
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const goToday = () => {
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedKey(todayKey);
  };

  const renderCell = (date, index) => {
    if (!date) return <View key={`empty-${index}`} style={styles.cell} />;
    const key = toKey(date);
    const isSelected = key === selectedKey;
    const isToday = key === todayKey;
    const hasBookings = (byDate[key]?.length ?? 0) > 0;

    return (
      <Pressable key={key} style={styles.cell} onPress={() => setSelectedKey(key)}>
        <View
          style={[
            styles.dayCircle,
            isToday && !isSelected && styles.dayToday,
            isSelected && styles.daySelected,
          ]}
        >
          <Text
            style={[
              styles.dayText,
              isToday && !isSelected && styles.dayTextToday,
              isSelected && styles.dayTextSelected,
            ]}
          >
            {date.getDate()}
          </Text>
        </View>
        <View style={[styles.dot, hasBookings && !isSelected && styles.dotVisible]} />
      </Pressable>
    );
  };

  const header = (
    <View>
      <View style={styles.monthBar}>
        <Pressable onPress={() => stepMonth(-1)} hitSlop={10} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => stepMonth(1)} hitSlop={10} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => renderCell(date, wi * 7 + di))}
          </View>
        ))}
      </View>

      {!sameMonth(monthCursor, new Date()) && (
        <Pressable onPress={goToday} hitSlop={8} style={styles.todayBtn}>
          <Text style={styles.todayText}>Jump to today</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>{selectedLabel}</Text>
    </View>
  );

  const renderBooking = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('BookingDetails', { id: item.id })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.time}>{item.time_range}</Text>
        <StatusBadge status={item.status} label={item.status_label} />
      </View>
      <Text style={styles.customer}>{item.customer_name}</Text>
      <View style={styles.serviceRow}>
        {item.service?.color ? (
          <View style={[styles.serviceDot, { backgroundColor: item.service.color }]} />
        ) : null}
        <Text style={styles.service}>{item.service?.name || 'Service'}</Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={selectedBookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBooking}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {error ? 'Something went wrong' : 'No bookings on this day'}
            </Text>
            <Text style={styles.emptyBody}>
              {error || 'Pick another day from the calendar above.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navText: { fontSize: 22, color: colors.primary, lineHeight: 24 },
  monthLabel: { ...typography.heading },

  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: { flex: 1, textAlign: 'center', ...typography.caption, fontWeight: '600' },

  grid: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderWidth: 1, borderColor: colors.primary },
  daySelected: { backgroundColor: colors.primary },
  dayText: { ...typography.body },
  dayTextToday: { color: colors.primary, fontWeight: '700' },
  dayTextSelected: { color: '#ffffff', fontWeight: '700' },
  dot: { height: 5, width: 5, borderRadius: 2.5, marginTop: 2, backgroundColor: 'transparent' },
  dotVisible: { backgroundColor: colors.primary },

  todayBtn: { alignSelf: 'center', paddingVertical: spacing.sm },
  todayText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  sectionTitle: { ...typography.heading, fontSize: 17, marginTop: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardPressed: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { ...typography.body, fontWeight: '700', color: colors.text },
  customer: { ...typography.body, fontWeight: '600', marginTop: spacing.xs },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  serviceDot: { height: 8, width: 8, borderRadius: 4 },
  service: { ...typography.muted },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.xs },
  emptyTitle: { ...typography.heading, fontSize: 17 },
  emptyBody: { ...typography.muted, textAlign: 'center' },
});

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { bookingApi } from '../api/bookingApi';
import { errorMessage } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';

// One label/value line inside a card. `value` can be a string or a node.
function Row({ label, value, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : (
        <View style={styles.rowValueNode}>{value}</View>
      )}
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TimelineItem({ color, label, time }) {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, { backgroundColor: color }]} />
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineTime}>{time}</Text>
    </View>
  );
}

const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function BookingDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const { business } = useAuth();
  const slug = business?.slug;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const { data } = await bookingApi.getBooking(slug, id);
      setBooking(data.booking);
      setAdminNotes(data.booking.admin_notes || '');
      navigation.setOptions({ title: data.booking.reference });
    } catch (err) {
      Alert.alert('Not found', errorMessage(err, 'This booking could not be loaded.'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [slug, id, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  // Run a status transition after a native confirmation prompt.
  const runAction = (type, { title, message, confirmLabel }) => {
    Alert.alert(title, message, [
      { text: 'Back', style: 'cancel' },
      {
        text: confirmLabel,
        style: type === 'cancel' ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(true);
          try {
            const call =
              type === 'confirm'
                ? bookingApi.confirmBooking(slug, id)
                : type === 'complete'
                ? bookingApi.completeBooking(slug, id)
                : bookingApi.cancelBooking(slug, id, 'Cancelled by admin');
            const { data } = await call;
            setBooking(data.booking);
          } catch (err) {
            Alert.alert('Action failed', errorMessage(err, 'Could not update the booking.'));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const { data } = await bookingApi.updateNotes(slug, id, adminNotes);
      setBooking(data.booking);
      Alert.alert('Saved', 'Notes updated.');
    } catch (err) {
      Alert.alert('Save failed', errorMessage(err, 'Could not save notes.'));
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!booking) return null;

  const { service } = booking;
  const canConfirm = booking.status === 'pending';
  const canComplete = booking.status === 'confirmed';
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const showAdminNotes = booking.admin_notes !== undefined; // omitted by API for non-admins

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.reference}>{booking.reference}</Text>
        <StatusBadge status={booking.status} label={booking.status_label} />
      </View>

      {(canConfirm || canComplete || canCancel) && (
        <View style={styles.actions}>
          {canConfirm && (
            <Button
              title="Confirm"
              onPress={() =>
                runAction('confirm', {
                  title: 'Confirm Booking',
                  message: 'Confirm this booking? The customer will be notified.',
                  confirmLabel: 'Confirm',
                })
              }
              loading={actionLoading}
              style={styles.actionBtn}
            />
          )}
          {canComplete && (
            <Button
              title="Mark Complete"
              onPress={() =>
                runAction('complete', {
                  title: 'Mark as Completed',
                  message: 'Mark this booking as completed?',
                  confirmLabel: 'Mark Complete',
                })
              }
              loading={actionLoading}
              style={styles.actionBtn}
            />
          )}
          {canCancel && (
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() =>
                runAction('cancel', {
                  title: 'Cancel Booking',
                  message: 'This will cancel the booking and notify the customer.',
                  confirmLabel: 'Cancel Booking',
                })
              }
              loading={actionLoading}
              style={[styles.actionBtn, styles.cancelBtn]}
            />
          )}
        </View>
      )}

      <Card title="APPOINTMENT">
        <Row
          label="Service"
          value={
            <View style={styles.serviceValue}>
              {service?.color ? (
                <View style={[styles.dot, { backgroundColor: service.color }]} />
              ) : null}
              <Text style={styles.rowValue}>{service?.name || '—'}</Text>
            </View>
          }
        />
        <Row label="Date" value={booking.booking_date_formatted || '—'} />
        <Row label="Time" value={booking.time_range || '—'} />
        <Row label="Duration" value={service?.formatted_duration || '—'} />
        <Row
          label="Price"
          value={service?.price > 0 ? service?.formatted_price : 'Free'}
          last
        />
      </Card>

      <Card title="CUSTOMER">
        <Row label="Name" value={booking.customer_name} />
        <Row
          label="Email"
          value={
            <Text
              style={[styles.rowValue, styles.link]}
              onPress={() => Linking.openURL(`mailto:${booking.customer_email}`)}
            >
              {booking.customer_email}
            </Text>
          }
        />
        <Row
          label="Phone"
          value={
            booking.customer_phone ? (
              <Text
                style={[styles.rowValue, styles.link]}
                onPress={() => Linking.openURL(`tel:${booking.customer_phone}`)}
              >
                {booking.customer_phone}
              </Text>
            ) : (
              '—'
            )
          }
          last
        />
      </Card>

      <Card title="TIMELINE">
        <TimelineItem color={colors.textFaint} label="Created" time={formatDateTime(booking.created_at)} />
        {booking.confirmed_at ? (
          <TimelineItem color={colors.primary} label="Confirmed" time={formatDateTime(booking.confirmed_at)} />
        ) : null}
        {booking.completed_at ? (
          <TimelineItem color={colors.status.completed.text} label="Completed" time={formatDateTime(booking.completed_at)} />
        ) : null}
        {booking.cancelled_at ? (
          <TimelineItem color={colors.danger} label="Cancelled" time={formatDateTime(booking.cancelled_at)} />
        ) : null}
        {booking.cancellation_reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>
              <Text style={styles.reasonLabel}>Reason: </Text>
              {booking.cancellation_reason}
            </Text>
          </View>
        ) : null}
      </Card>

      {booking.notes ? (
        <Card title="CUSTOMER NOTES">
          <Text style={styles.notesText}>{booking.notes}</Text>
        </Card>
      ) : null}

      {showAdminNotes ? (
        <Card title="ADMIN NOTES">
          <TextInput
            value={adminNotes}
            onChangeText={setAdminNotes}
            placeholder="Internal notes…"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.notesInput}
          />
          <Button title="Save Notes" onPress={saveNotes} loading={savingNotes} style={styles.saveBtn} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reference: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, height: 46 },
  cancelBtn: { borderWidth: 1, borderColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...typography.muted },
  rowValue: { ...typography.body, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  rowValueNode: { flexShrink: 1, alignItems: 'flex-end' },
  serviceValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { height: 8, width: 8, borderRadius: 4 },
  link: { color: colors.primary },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  timelineDot: { height: 8, width: 8, borderRadius: 4 },
  timelineLabel: { ...typography.muted, width: 78 },
  timelineTime: { ...typography.body, flexShrink: 1 },
  reasonBox: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  reasonText: { color: colors.danger, fontSize: 14 },
  reasonLabel: { fontWeight: '700' },
  notesText: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  notesInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  saveBtn: { height: 46 },
});

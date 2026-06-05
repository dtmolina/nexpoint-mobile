import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

// Pill badge for a booking status, mirroring the web StatusBadge palette.
export default function StatusBadge({ status, label }) {
  const palette = colors.status[status] || colors.status.pending;
  const text = label || (status ? status[0].toUpperCase() + status.slice(1) : 'Pending');

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

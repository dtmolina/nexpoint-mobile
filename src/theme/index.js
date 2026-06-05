// Central design tokens. Keeping colors, spacing, and type scale in one place
// keeps screens consistent and makes future theming (dark mode, white-label) a
// single-file change.
export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: '#dbeafe',

  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e5e7eb',

  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',

  danger: '#dc2626',
  dangerSoft: '#fee2e2',

  // Booking status palette, mirrors the web StatusBadge component.
  status: {
    pending: { bg: '#fef9c3', text: '#854d0e' },
    confirmed: { bg: '#dbeafe', text: '#1e40af' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    completed: { bg: '#dcfce7', text: '#166534' },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textFaint },
};

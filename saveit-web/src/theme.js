export const colors = {
  primary: '#475569',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1',
  
  // Dark mode specific
  dark: {
    bg: '#1a1a1a',
    card: '#252525',
    border: '#2e2e2e',
    text: '#e5e5e5',
    textMuted: '#a1a1aa',
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
  },
}

export const getThemeColors = (isDark) => ({
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  bg: isDark ? colors.dark.bg : colors.light.bg,
  card: isDark ? colors.dark.card : colors.light.card,
  border: isDark ? colors.dark.border : colors.light.border,
  text: isDark ? colors.dark.text : colors.light.text,
  textMuted: isDark ? colors.dark.textMuted : colors.light.textMuted,
})

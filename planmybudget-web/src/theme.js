import { createTheme } from '@mantine/core'

export const colors = {
  primary: '#475569',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1',
}

const gray = [
  '#f9fafb',
  '#f3f4f6',
  '#e5e7eb',
  '#d1d5db',
  '#9ca3af',
  '#6b7280',
  '#4b5563',
  '#374151',
  '#1f2937',
  '#111827',
]

const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  primaryColor: 'gray',
  primaryShade: { light: 7, dark: 4 },
  defaultRadius: 'md',
  colors: {
    gray,
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
})

export default theme

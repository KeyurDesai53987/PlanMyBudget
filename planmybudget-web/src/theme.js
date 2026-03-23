import { MantineColorsTuple, createTheme } from '@mantine/core'

const gray: MantineColorsTuple = [
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

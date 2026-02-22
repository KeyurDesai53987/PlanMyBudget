import { Group, Button, Text, Box, ActionIcon, useMantineColorScheme } from '@mantine/core'
import { IconWallet, IconLogout, IconMoon, IconSun, IconSettings } from '@tabler/icons-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/transactions', label: 'Activity' },
  { to: '/budgets', label: 'Budget' },
  { to: '/goals', label: 'Goals' },
  { to: '/recurring', label: 'Recurring' },
  { to: '/categories', label: 'Categories' },
  { to: '/settings', label: 'Settings' },
]

function NavItem({ to, label }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: '8px 14px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        color: isActive ? 'white' : isDark ? '#a1a1aa' : '#475569',
        background: isActive ? '#475569' : 'transparent',
        transition: 'all 0.15s ease',
      })}
    >
      {label}
    </NavLink>
  )
}

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      onClick={() => toggleColorScheme()}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  )
}

export default function Navbar({ onLogout }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  
  return (
    <Box
      component="nav"
      style={{
        background: isDark ? '#1a1a1a' : 'white',
        borderBottom: `1px solid ${isDark ? '#2e2e2e' : '#e2e8f0'}`,
        padding: '10px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" style={{ flexShrink: 0 }}>
          <IconWallet size={24} stroke={1.5} />
          <Text fw={700} size="lg" style={{ whiteSpace: 'nowrap' }}>SaveIt</Text>
        </Group>
        
        <Group gap={4} wrap="nowrap" style={{ overflow: 'auto' }}>
          {navItems.map(item => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}
        </Group>
        
        <Group gap="xs">
          <ColorSchemeToggle />
          <Button 
            variant="subtle" 
            color="gray" 
            size="sm" 
            leftSection={<IconLogout size={16} />}
            onClick={onLogout}
            style={{ flexShrink: 0 }}
          >
            Logout
          </Button>
        </Group>
      </Group>
    </Box>
  )
}

import { Group, Button, Text, Box, ActionIcon, Drawer, Stack, useMantineColorScheme, Burger } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { IconWallet, IconLogout, IconMoon, IconSun, IconHome, IconBuildingBank, IconCreditCard, IconChartBar, IconTarget, IconRepeat, IconTag, IconSettings } from '@tabler/icons-react'
import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: IconHome },
  { to: '/accounts', label: 'Accounts', icon: IconBuildingBank },
  { to: '/transactions', label: 'Activity', icon: IconCreditCard },
  { to: '/budgets', label: 'Budget', icon: IconChartBar },
  { to: '/goals', label: 'Goals', icon: IconTarget },
  { to: '/recurring', label: 'Recurring', icon: IconRepeat },
  { to: '/categories', label: 'Categories', icon: IconTag },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

function NavItem({ to, label, icon: Icon, onClick }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: 500,
        color: isActive ? 'white' : isDark ? '#a1a1aa' : '#475569',
        background: isActive ? '#475569' : 'transparent',
        transition: 'all 0.15s ease',
      })}
    >
      {Icon && <Icon size={20} />}
      {label}
    </NavLink>
  )
}

function ColorSchemeToggle({ onClick }) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      onClick={() => { toggleColorScheme(); onClick?.(); }}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  )
}

export default function Navbar({ onLogout }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [opened, { open, close, toggle }] = useDisclosure(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleNavClick = () => {
    if (isMobile) close()
  }

  const handleLogout = () => {
    onLogout()
    if (isMobile) close()
  }

  return (
    <>
      <Box
        component="nav"
        style={{
          background: isDark ? '#1a1a1a' : 'white',
          borderBottom: `1px solid ${isDark ? '#2e2e2e' : '#e2e8f0'}`,
          padding: isMobile ? '10px 16px' : '10px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" style={{ flexShrink: 0 }}>
            <IconWallet size={24} stroke={1.5} />
            <Text fw={700} size="lg" style={{ whiteSpace: 'nowrap' }}>PlanMyBudget</Text>
          </Group>
          
          {!isMobile && (
            <Group gap={4} wrap="nowrap" style={{ overflow: 'auto' }}>
              {navItems.slice(0, -1).map(item => (
                <NavItem key={item.to} to={item.to} label={item.label} />
              ))}
            </Group>
          )}

          {isMobile ? (
            <Burger opened={opened} onClick={toggle} size="sm" />
          ) : (
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
          )}
        </Group>
      </Box>

      <Drawer
        opened={opened}
        onClose={close}
        title={<Group gap="xs"><IconWallet size={24} /> <Text fw={700}>PlanMyBudget</Text></Group>}
        size="280px"
        padding="md"
      >
        <Stack gap="xs">
          {navItems.slice(0, -1).map(item => {
            const Icon = item.icon
            return (
              <NavItem 
                key={item.to} 
                to={item.to} 
                label={item.label} 
                icon={Icon}
                onClick={handleNavClick}
              />
            )
          })}
          
          <Box style={{ borderTop: `1px solid ${isDark ? '#2e2e2e' : '#e2e8f0'}`, marginTop: '8px', paddingTop: '8px' }}>
            <ColorSchemeToggle onClick={close} />
            <Button 
              variant="subtle" 
              color="gray" 
              size="md" 
              fullWidth
              leftSection={<IconLogout size={18} />}
              onClick={handleLogout}
              style={{ marginTop: '8px' }}
            >
              Logout
            </Button>
          </Box>
        </Stack>
      </Drawer>
    </>
  )
}

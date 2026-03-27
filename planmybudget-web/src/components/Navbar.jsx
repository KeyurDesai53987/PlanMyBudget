import { useState, useEffect } from 'react'
import { Group, Button, Text, Box, ActionIcon, Drawer, Stack, useMantineColorScheme, Burger, Avatar, Menu, Divider, Image } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { IconLogout, IconMoon, IconSun, IconHome, IconBuildingBank, IconCreditCard, IconChartBar, IconTarget, IconRepeat, IconTag, IconSettings, IconUser, IconChevronDown, IconBell } from '@tabler/icons-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { colors } from '../theme'

const navItems = [
  { to: '/', label: 'Dashboard', icon: IconHome },
  { to: '/accounts', label: 'Accounts', icon: IconBuildingBank },
  { to: '/transactions', label: 'Activity', icon: IconCreditCard },
  { to: '/budgets', label: 'Budget', icon: IconChartBar },
  { to: '/goals', label: 'Goals', icon: IconTarget },
  { to: '/recurring', label: 'Recurring', icon: IconRepeat },
  { to: '/reminders', label: 'Reminders', icon: IconBell },
  { to: '/categories', label: 'Categories', icon: IconTag },
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
  const [opened, { close, toggle }] = useDisclosure(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [user, setUser] = useState({ name: '', email: '' })
  const navigate = useNavigate()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api('/profile')
        setUser({
          name: res.preferences?.name || 'User',
          email: res.preferences?.email || ''
        })
      } catch (err) {
        console.error(err)
      }
    }
    loadUser()
  }, [])

  const handleNavClick = () => {
    if (isMobile) close()
  }

  const handleLogout = () => {
    onLogout()
    if (isMobile) close()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
            <Image src="/logo.svg" w={28} h={28} radius="sm" />
            <Text fw={700} size="lg" style={{ whiteSpace: 'nowrap' }}>PlanMyBudget</Text>
          </Group>
          
          {!isMobile && (
            <Group gap={4} wrap="nowrap" style={{ overflow: 'auto' }}>
              {navItems.map(item => (
                <NavItem key={item.to} to={item.to} label={item.label} />
              ))}
            </Group>
          )}

          {isMobile ? (
            <Burger opened={opened} onClick={toggle} size="sm" />
          ) : (
            <Group gap="md">
              <ColorSchemeToggle />
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="subtle" color="gray" size="sm" px="xs">
                    <Group gap="xs">
                      <Avatar size={28} radius="xl" color="gray" style={{ background: colors.primary + '20' }}>
                        <Text size="xs" fw={600} style={{ color: colors.primary }}>{getInitials(user.name)}</Text>
                      </Avatar>
                      <Text size="sm" fw={500}>{user.name}</Text>
                      <IconChevronDown size={14} />
                    </Group>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Box px="sm" py="xs">
                    <Text size="sm" fw={500}>{user.name}</Text>
                    <Text size="xs" c="dimmed">{user.email}</Text>
                  </Box>
                  <Divider />
                  <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => { navigate('/settings'); }}>
                    Settings
                  </Menu.Item>
                  <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )}
        </Group>
      </Box>

      <Drawer
        opened={opened}
        onClose={close}
        title={<Group gap="xs"><Image src="/logo.svg" w={28} h={28} radius="sm" /> <Text fw={700}>PlanMyBudget</Text></Group>}
        size="280px"
        padding="md"
      >
        <Stack gap="xs">
          {navItems.map(item => {
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
            <Group gap="xs" mb="xs">
              <Avatar size={32} radius="xl" color="gray" style={{ background: colors.primary + '20' }}>
                <Text size="sm" fw={600} style={{ color: colors.primary }}>{getInitials(user.name)}</Text>
              </Avatar>
              <div>
                <Text size="sm" fw={500}>{user.name}</Text>
                <Text size="xs" c="dimmed">{user.email}</Text>
              </div>
            </Group>
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

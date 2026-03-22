import { useState, useEffect } from 'react'
import { Card, Text, Stack, Group, Button, SimpleGrid, Badge, Divider, useMantineColorScheme, Image, Container, ThemeIcon } from '@mantine/core'
import { IconWallet, IconChartBar, IconTarget, IconCalendar, IconRefresh, IconShield, IconDownload, IconMoon, IconSun, IconCheck } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { loginAsDemo } from '../api'

const features = [
  { icon: IconWallet, title: 'Multiple Accounts', desc: 'Track checking, savings, credit cards, and cash', color: '#3b82f6' },
  { icon: IconChartBar, title: 'Smart Budgets', desc: 'Set monthly limits and track spending', color: '#10b981' },
  { icon: IconTarget, title: 'Savings Goals', desc: 'Create goals and watch progress', color: '#f59e0b' },
  { icon: IconCalendar, title: 'Recurring', desc: 'Automate regular payments', color: '#8b5cf6' },
  { icon: IconRefresh, title: 'Data Sync', desc: 'Sync across all your devices', color: '#06b6d4' },
  { icon: IconShield, title: 'Secure', desc: 'Bank-level security for your data', color: '#ef4444' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark 
        ? 'linear-gradient(180deg, #1a1a1a 0%, #252525 100%)'
        : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '40px 20px'
    }}>
      <Container size="lg">
        <Stack gap={48} align="center" style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease-out' }}>
          
          <div style={{ textAlign: 'center' }}>
            <Group justify="center" mb="md">
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(71, 85, 105, 0.3)',
              }}>
                <Image src="/logo.svg" w={60} h={60} />
              </div>
              <Button
                variant="subtle"
                color="gray"
                onClick={toggleColorScheme}
                size="md"
                ml="md"
                style={{ borderRadius: 12 }}
              >
                {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
              </Button>
            </Group>
            <Text fw={700} style={{ fontSize: '2.5rem', letterSpacing: '-0.02em' }}>PlanMyBudget</Text>
            <Text size="lg" c="dimmed" maw={500} mx="auto" mt="xs">
              Take control of your finances with easy tracking, smart budgets, and beautiful insights.
            </Text>
          </div>

          <Group gap="md">
            <Button size="lg" color="dark" onClick={() => navigate('/login')} style={{ borderRadius: 12 }}>
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="light" 
              color="gray"
              component="a"
              href="https://github.com/KeyurDesai53987/PlanMyBudget"
              target="_blank"
              style={{ borderRadius: 12 }}
            >
              View on GitHub
            </Button>
          </Group>

          <Card shadow="xl" padding="xl" radius="xl" maw={500} w="100%" withBorder style={{ 
            background: isDark ? 'rgba(37, 37, 37, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
          }}>
            <Text fw={600} size="lg" mb="md" ta="center">Try the Demo</Text>
            <Stack gap="sm" align="center">
              <Badge size="lg" color="green" variant="light" leftSection={<IconCheck size={14} />}>
                No signup required
              </Badge>
              <Text size="sm" c="dimmed">Email: <Text span ff="monospace" fw={600}>demo@saveit.app</Text></Text>
              <Text size="sm" c="dimmed">Password: <Text span ff="monospace" fw={600}>password</Text></Text>
              <Button 
                variant="light" 
                color="gray" 
                mt="sm"
                size="md"
                onClick={async () => {
                  try {
                    await loginAsDemo()
                    navigate('/')
                    window.location.reload()
                  } catch (err) {
                    console.error('Demo login failed:', err)
                    alert('Demo login failed. Please try again.')
                  }
                }}
                style={{ borderRadius: 10 }}
              >
                Open Demo
              </Button>
            </Stack>
          </Card>

          <Stack gap="xl" w="100%" align="center">
            <Text fw={700} size="xl" ta="center">Features</Text>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg" w="100%">
              {features.map((f, i) => (
                <Card key={i} shadow="md" padding="lg" radius="lg" withBorder style={{ 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Stack gap="sm">
                    <ThemeIcon size={48} radius="md" variant="light" style={{ background: `${f.color}20`, color: f.color }}>
                      <f.icon size={24} />
                    </ThemeIcon>
                    <Text fw={600} size="md">{f.title}</Text>
                    <Text size="sm" c="dimmed" lineClamp={2}>{f.desc}</Text>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>

          <Card shadow="md" padding="xl" radius="lg" withBorder maw={500} w="100%" style={{
            background: isDark ? 'rgba(37, 37, 37, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
          }}>
            <Stack gap="md" align="center">
              <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                <IconDownload size={28} />
              </ThemeIcon>
              <Text fw={600} size="lg">Works Everywhere</Text>
              <Text size="sm" c="dimmed" ta="center">
                Use it on the web, install as an app on your phone, or download the desktop version for Mac.
              </Text>
              <Group gap="sm" mt="xs">
                <Badge variant="light" color="gray" size="md">Web App</Badge>
                <Badge variant="light" color="gray" size="md">PWA</Badge>
                <Badge variant="light" color="gray" size="md">macOS</Badge>
              </Group>
            </Stack>
          </Card>

          <Divider w="100%" />

          <Stack align="center" gap="sm">
            <Text size="sm" c="dimmed">
              Made with ❤️ • Open Source
            </Text>
            <Group gap="md">
              <Button 
                variant="subtle" 
                color="gray" 
                size="sm"
                component="a"
                href="https://github.com/KeyurDesai53987/PlanMyBudget"
                target="_blank"
              >
                GitHub
              </Button>
              <Button 
                variant="subtle" 
                color="gray" 
                size="sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            </Group>
          </Stack>
        </Stack>
      </Container>
    </div>
  )
}

import { Card, Text, Stack, Group, Button, SimpleGrid, Badge, Divider, useMantineColorScheme, Image, Container } from '@mantine/core'
import { IconWallet, IconChartBar, IconTarget, IconCalendar, IconRefresh, IconShield, IconDownload, IconMoon, IconSun } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

const features = [
  { icon: IconWallet, title: 'Multiple Accounts', desc: 'Track checking, savings, credit cards, and cash' },
  { icon: IconChartBar, title: 'Smart Budgets', desc: 'Set monthly limits and track spending' },
  { icon: IconTarget, title: 'Savings Goals', desc: 'Create goals and watch progress' },
  { icon: IconCalendar, title: 'Recurring', desc: 'Automate regular payments and subscriptions' },
  { icon: IconRefresh, title: 'Data Sync', desc: 'Sync across all your devices' },
  { icon: IconShield, title: 'Secure', desc: 'Bank-level security for your data' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#1a1a1a' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '40px 20px'
    }}>
      <Container size="lg">
        <Stack gap="xl" align="center">
          <div style={{ textAlign: 'center' }}>
            <Group justify="center" mb="md">
              <Image 
                src="/logo.svg" 
                w={80} 
                h={80} 
                radius="xl"
              />
              <Button
                variant="subtle"
                color="gray"
                onClick={toggleColorScheme}
                size="md"
                ml="md"
              >
                {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
              </Button>
            </Group>
            <Text size="xl" fw={700} style={{ fontSize: '2.5rem' }}>PlanMyBudget</Text>
            <Text size="lg" c="dimmed" maw={500} mx="auto" mt="xs">
              Take control of your finances with easy tracking, smart budgets, and beautiful insights.
            </Text>
          </div>

          <Group gap="md">
            <Button 
              size="lg" 
              color="gray"
              onClick={() => navigate('/login')}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="light"
              color="gray"
              component="a"
              href="https://github.com/KeyurDesai53987/PlanMyBudget"
              target="_blank"
            >
              View on GitHub
            </Button>
          </Group>

          <Card shadow="lg" padding="xl" radius="lg" maw={600} w="100%" withBorder>
            <Text fw={600} mb="md" ta="center">Try the Demo</Text>
            <Stack gap="xs" align="center">
              <Badge size="lg" color="green" variant="light">No signup required</Badge>
              <Text size="sm" c="dimmed">Email: <Text span ff="monospace" fw={500}>demo@saveit.app</Text></Text>
              <Text size="sm" c="dimmed">Password: <Text span ff="monospace" fw={500}>password</Text></Text>
              <Button 
                variant="light" 
                color="gray" 
                mt="xs"
                onClick={() => {
                  localStorage.setItem('token', 'demo-token')
                  navigate('/')
                  window.location.reload()
                }}
              >
                Open Demo
              </Button>
            </Stack>
          </Card>

          <div style={{ width: '100%', maxWidth: 900 }}>
            <Text fw={700} size="xl" ta="center" mb="xl">Features</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {features.map((f, i) => (
                <Card key={i} shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <f.icon size={32} color="#475569" />
                    <Text fw={600}>{f.title}</Text>
                    <Text size="sm" c="dimmed">{f.desc}</Text>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </div>

          <Card shadow="sm" padding="lg" radius="md" withBorder maw={600} w="100%">
            <Stack gap="sm" align="center">
              <IconDownload size={32} color="#475569" />
              <Text fw={600}>Works Everywhere</Text>
              <Text size="sm" c="dimmed" ta="center">
                Use it on the web, install as an app on your phone, or download the desktop version for Mac.
              </Text>
              <Group gap="md" mt="xs">
                <Badge variant="light">Web App</Badge>
                <Badge variant="light">PWA (Installable)</Badge>
                <Badge variant="light">macOS App</Badge>
              </Group>
            </Stack>
          </Card>

          <Divider w="100%" my="lg" />

          <Text size="sm" c="dimmed" ta="center">
            Made with ❤️ • Open Source
          </Text>

          <Group gap="lg">
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
      </Container>
    </div>
  )
}

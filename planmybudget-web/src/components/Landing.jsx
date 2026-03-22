import { Card, Text, Stack, Group, Button, SimpleGrid, Badge, Divider, useMantineColorScheme, Image, Container } from '@mantine/core'
import { IconWallet, IconChartBar, IconTarget, IconCalendar, IconRefresh, IconShield, IconDownload, IconMoon, IconSun } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const features = [
  { icon: IconWallet, title: 'Multiple Accounts', desc: 'Track checking, savings, credit cards, and cash', color: '#3b82f6' },
  { icon: IconChartBar, title: 'Smart Budgets', desc: 'Set monthly limits and track spending', color: '#10b981' },
  { icon: IconTarget, title: 'Savings Goals', desc: 'Create goals and watch progress', color: '#f59e0b' },
  { icon: IconCalendar, title: 'Recurring', desc: 'Automate regular payments and subscriptions', color: '#8b5cf6' },
  { icon: IconRefresh, title: 'Data Sync', desc: 'Sync across all your devices', color: '#06b6d4' },
  { icon: IconShield, title: 'Secure', desc: 'Bank-level security for your data', color: '#ef4444' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

const floatVariants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
}

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
}

const rotateVariants = {
  animate: {
    rotate: [0, 5, -5, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
  }
}

export default function Landing() {
  const navigate = useNavigate()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#1a1a1a' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '40px 20px',
      overflow: 'hidden'
    }}>
      <Container size="lg">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Stack gap="xl" align="center">
            <motion.div style={{ textAlign: 'center' }} variants={itemVariants}>
              <Group justify="center" mb="md">
                <motion.div
                  variants={floatVariants}
                  animate="animate"
                >
                  <Image 
                    src="/logo.svg" 
                    w={80} 
                    h={80} 
                    radius="xl"
                  />
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={toggleColorScheme}
                    size="md"
                    ml="md"
                  >
                    <motion.span
                      animate={{ rotate: isDark ? 0 : 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
                    </motion.span>
                  </Button>
                </motion.div>
              </Group>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Text size="xl" fw={700} style={{ fontSize: '2.5rem' }}>PlanMyBudget</Text>
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Text size="lg" c="dimmed" maw={500} mx="auto" mt="xs">
                  Take control of your finances with easy tracking, smart budgets, and beautiful insights.
                </Text>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Group gap="md">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    color="gray"
                    onClick={() => navigate('/login')}
                  >
                    Get Started
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                </motion.div>
              </Group>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.div whileHover={{ y: -5 }}>
                <Card shadow="lg" padding="xl" radius="lg" maw={600} w="100%" withBorder
                  style={{ 
                    background: isDark ? 'rgba(37, 37, 37, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Text fw={600} mb="md" ta="center">Try the Demo</Text>
                    <Stack gap="xs" align="center">
                      <Badge size="lg" color="green" variant="light">No signup required</Badge>
                      <Text size="sm" c="dimmed">Email: <Text span ff="monospace" fw={500}>demo@saveit.app</Text></Text>
                      <Text size="sm" c="dimmed">Password: <Text span ff="monospace" fw={500}>password</Text></Text>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
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
                      </motion.div>
                    </Stack>
                  </motion.div>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div style={{ width: '100%', maxWidth: 900 }} variants={itemVariants}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Text fw={700} size="xl" ta="center" mb="xl">Features</Text>
              </motion.div>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    whileHover={{ y: -10, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }}>
                      <Stack gap="sm">
                        <motion.div
                          whileHover={{ rotate: 360, scale: 1.2 }}
                          transition={{ duration: 0.5 }}
                        >
                          <f.icon size={32} color={f.color} />
                        </motion.div>
                        <Text fw={600}>{f.title}</Text>
                        <Text size="sm" c="dimmed">{f.desc}</Text>
                      </Stack>
                    </Card>
                  </motion.div>
                ))}
              </SimpleGrid>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.02 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder maw={600} w="100%">
                  <Stack gap="sm" align="center">
                    <motion.div
                      animate={{
                        y: [0, -5, 0],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <IconDownload size={32} color="#475569" />
                    </motion.div>
                    <Text fw={600}>Works Everywhere</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Use it on the web, install as an app on your phone, or download the desktop version for Mac.
                    </Text>
                    <Group gap="md" mt="xs">
                      <motion.div whileHover={{ scale: 1.1 }}>
                        <Badge variant="light">Web App</Badge>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }}>
                        <Badge variant="light">PWA (Installable)</Badge>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }}>
                        <Badge variant="light">macOS App</Badge>
                      </motion.div>
                    </Group>
                  </Stack>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Divider w="100%" my="lg" />
              <Text size="sm" c="dimmed" ta="center">
                Made with ❤️ • Open Source
              </Text>
              <Group gap="lg" justify="center" mt="md">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
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
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    variant="subtle" 
                    color="gray" 
                    size="sm"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </Button>
                </motion.div>
              </Group>
            </motion.div>
          </Stack>
        </motion.div>
      </Container>
    </div>
  )
}

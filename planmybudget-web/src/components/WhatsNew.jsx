import { Modal, Text, Stack, Group, Badge, Divider } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'

const CURRENT_VERSION = '1.1.0'

const changelog = {
  '1.1.0': [
    'PWA Support - Install on desktop/mobile',
    'Full Backup & Restore feature',
    'Loading skeletons for better UX',
    'Password strength indicator',
    'Remember me on login',
    'Mobile responsive improvements',
    'App updates for macOS',
    'Database performance improvements',
    'Security enhancements (Helmet, validation)'
  ],
  '1.0.0': [
    'User authentication',
    'Account management',
    'Transaction tracking',
    'Category management',
    'Budget planning',
    'Savings goals',
    'Recurring transactions',
    'Visual charts and analytics',
    'Dark/Light theme',
    'CSV export'
  ]
}

export function WhatsNewModal({ opened, onClose }) {
  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="What's New" 
      centered
      size="lg"
    >
      <Stack gap="lg">
        <Group justify="space-between">
          <Text fw={600}>PlanMyBudget</Text>
          <Badge color="gray" variant="light">v{CURRENT_VERSION}</Badge>
        </Group>
        
        <Divider />
        
        {Object.entries(changelog).map(([version, features]) => (
          <div key={version}>
            <Group mb="sm">
              <Badge color={version === CURRENT_VERSION ? 'green' : 'gray'} size="lg">
                v{version}
              </Badge>
              {version === CURRENT_VERSION && (
                <Badge color="green" variant="dot" size="xs">Latest</Badge>
              )}
            </Group>
            
            <Stack gap="xs">
              {features.map((feature, i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <IconCheck size={16} color="#10b981" style={{ marginTop: 2 }} />
                  <Text size="sm">{feature}</Text>
                </Group>
              ))}
            </Stack>
            
            {version !== CURRENT_VERSION && <Divider mt="md" />}
          </div>
        ))}
      </Stack>
    </Modal>
  )
}

export function checkForNewVersion() {
  const lastSeenVersion = localStorage.getItem('lastSeenVersion')
  if (lastSeenVersion !== CURRENT_VERSION) {
    localStorage.setItem('lastSeenVersion', CURRENT_VERSION)
    return true
  }
  return false
}

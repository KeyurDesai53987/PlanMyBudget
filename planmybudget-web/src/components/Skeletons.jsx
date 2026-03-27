import { Skeleton, SimpleGrid, Stack, Card } from '@mantine/core'

export function DashboardSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder>
            <Stack gap="sm">
              <Skeleton height={12} width="60%" />
              <Skeleton height={24} width="80%" />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      
      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Skeleton height={200} />
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Skeleton height={200} />
        </Card>
      </SimpleGrid>
      
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Skeleton height={200} />
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Skeleton height={200} />
        </Card>
      </SimpleGrid>
    </div>
  )
}

export function AccountsSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={200} mb="lg" />
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Skeleton height={40} />
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Skeleton height={16} width="60%" />
                  <Skeleton height={24} width="40%" />
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Card>
    </div>
  )
}

export function TransactionsSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={200} mb="lg" />
      <Stack gap="xs">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Skeleton height={16} width={120} mb={4} />
                <Skeleton height={12} width={80} />
              </div>
              <Skeleton height={20} width={60} />
            </div>
          </Card>
        ))}
      </Stack>
    </div>
  )
}

export function GoalsSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Card key={i} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
              <Skeleton height={20} width="70%" />
              <Skeleton height={8} radius="xl" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton height={12} width={100} />
                <Skeleton height={12} width={80} />
              </div>
            </Stack>
          </Card>
        ))}
      </Stack>
    </div>
  )
}

export function BudgetsSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton height={16} width={100} mb="xs" />
              <Skeleton height={8} radius="xl" mb="xs" />
              <Skeleton height={12} width={80} />
            </div>
          ))}
        </Stack>
      </Card>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {[1, 2, 3].map((i) => (
          <Card key={i} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Skeleton height={16} width={120} />
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={36} width={100} />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  )
}

export function CategoriesSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Skeleton height={40} width={40} radius="xl" />
              <Skeleton height={14} width="80%" />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  )
}

export function RecurringSkeleton() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Skeleton height={16} width={140} mb={4} />
                <Skeleton height={12} width={100} />
              </div>
              <Skeleton height={24} width={70} />
            </div>
          </Card>
        ))}
      </Stack>
    </div>
  )
}

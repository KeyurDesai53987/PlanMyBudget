import { Skeleton, SimpleGrid, Stack, Card } from '@mantine/core'

function ShimmerSkeleton({ children, className = '', style = {}, ...props }) {
  return (
    <div className={`skeleton-shimmer ${className}`} style={{ borderRadius: 4, ...style }}>
      <Skeleton {...props}>
        {children}
      </Skeleton>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div>
      <ShimmerSkeleton height={32} width={150} mb="lg" />
      
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder className="animated-card">
            <Stack gap="sm">
              <ShimmerSkeleton height={12} width="60%" />
              <ShimmerSkeleton height={24} width="80%" />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      
      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
          <ShimmerSkeleton height={200} />
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
          <ShimmerSkeleton height={200} />
        </Card>
      </SimpleGrid>
      
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
          <ShimmerSkeleton height={200} />
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
          <ShimmerSkeleton height={200} />
        </Card>
      </SimpleGrid>
    </div>
  )
}

export function AccountsSkeleton() {
  return (
    <div>
      <ShimmerSkeleton height={32} width={200} mb="lg" />
      <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
        <Stack gap="md">
          <ShimmerSkeleton height={40} />
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md" radius="md" withBorder className="animated-card">
                <Stack gap="xs">
                  <ShimmerSkeleton height={16} width="60%" />
                  <ShimmerSkeleton height={24} width="40%" />
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
      <ShimmerSkeleton height={32} width={200} mb="lg" />
      <Stack gap="xs">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder className="animated-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <ShimmerSkeleton height={16} width={120} mb={4} />
                <ShimmerSkeleton height={12} width={80} />
              </div>
              <ShimmerSkeleton height={20} width={60} />
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
      <ShimmerSkeleton height={32} width={150} mb="lg" />
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Card key={i} shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
            <Stack gap="sm">
              <ShimmerSkeleton height={20} width="70%" />
              <ShimmerSkeleton height={8} radius="xl" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <ShimmerSkeleton height={12} width={100} />
                <ShimmerSkeleton height={12} width={80} />
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
      <ShimmerSkeleton height={32} width={150} mb="lg" />
      <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
        <Stack gap="md">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <ShimmerSkeleton height={16} width={100} mb="xs" />
              <ShimmerSkeleton height={8} radius="xl" mb="xs" />
              <ShimmerSkeleton height={12} width={80} />
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
      <ShimmerSkeleton height={32} width={150} mb="lg" />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {[1, 2, 3].map((i) => (
          <Card key={i} shadow="sm" padding="lg" radius="md" withBorder className="animated-card">
            <Stack gap="md">
              <ShimmerSkeleton height={16} width={120} />
              <ShimmerSkeleton height={40} />
              <ShimmerSkeleton height={40} />
              <ShimmerSkeleton height={40} />
              <ShimmerSkeleton height={36} width={100} />
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
      <ShimmerSkeleton height={32} width={150} mb="lg" />
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder className="animated-card">
            <Stack gap="xs" align="center">
              <ShimmerSkeleton height={40} width={40} radius="xl" />
              <ShimmerSkeleton height={14} width="80%" />
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
      <ShimmerSkeleton height={32} width={150} mb="lg" />
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Card key={i} shadow="sm" padding="md" radius="md" withBorder className="animated-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <ShimmerSkeleton height={16} width={140} mb={4} />
                <ShimmerSkeleton height={12} width={100} />
              </div>
              <ShimmerSkeleton height={24} width={70} />
            </div>
          </Card>
        ))}
      </Stack>
    </div>
  )
}

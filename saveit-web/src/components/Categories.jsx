import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, Button, SimpleGrid, ActionIcon, Loader, Center, Modal } from '@mantine/core'
import { IconPlus, IconTrash, IconTag, IconEdit } from '@tabler/icons-react'
import { api } from '../api'
import { colors } from '../theme'

const DEFAULT_COLORS = [colors.primary, colors.success, colors.danger, colors.purple, colors.warning, colors.cyan, colors.pink, colors.indigo]

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, category: null })
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    try {
      const res = await api('/categories')
      setCategories(res.categories || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setSubmitting(true)
    try {
      await api('/categories', { method: 'POST', body: JSON.stringify({ name: formData.name }) })
      setFormData({ name: '' })
      setShowForm(false)
      loadCategories()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleEdit = (cat) => {
    setEditModal({ open: true, category: { ...cat } })
  }

  const handleEditSubmit = async () => {
    if (!editModal.category || !editModal.category.name.trim()) return
    setSubmitting(true)
    try {
      await api(`/categories/${editModal.category.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ name: editModal.category.name }) 
      })
      setEditModal({ open: false, category: null })
      loadCategories()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    try {
      await api(`/categories/${id}`, { method: 'DELETE' })
      loadCategories()
    } catch (err) { alert(err.message) }
  }

  if (loading) return (
    <Center h={400}>
      <Loader color="gray" />
    </Center>
  )

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Categories</Text>
        <Button 
          variant="light" 
          color="gray" 
          leftSection={<IconPlus size={16} />}
          onClick={() => { setShowForm(!showForm); setFormData({ name: '' }) }}
        >
          {showForm ? 'Cancel' : 'Add Category'}
        </Button>
      </Group>

      {showForm && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <Stack gap="md">
            <TextInput
              label="Category Name"
              placeholder="e.g., Groceries"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Button 
              fullWidth 
              color="gray" 
              loading={submitting}
              onClick={handleSubmit}
            >
              Add Category
            </Button>
          </Stack>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {categories.map((cat, idx) => {
          const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
          return (
            <Card key={cat.id} shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconTag size={22} style={{ color }} />
                  </div>
                  <div>
                    <Text fw={600}>{cat.name}</Text>
                    <Text size="xs" c="dimmed">Category</Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEdit(cat)}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    size="sm"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          )
        })}
      </SimpleGrid>
      
      {categories.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">No categories yet</Text>
      )}

      <Modal opened={editModal.open} onClose={() => setEditModal({ open: false, category: null })} title="Edit Category" centered>
        {editModal.category && (
          <Stack gap="sm">
            <TextInput
              label="Category Name"
              value={editModal.category.name}
              onChange={(e) => setEditModal({ ...editModal, category: { ...editModal.category, name: e.target.value } })}
            />
            <Button fullWidth color="gray" onClick={handleEditSubmit} loading={submitting}>
              Save Changes
            </Button>
          </Stack>
        )}
      </Modal>
    </div>
  )
}

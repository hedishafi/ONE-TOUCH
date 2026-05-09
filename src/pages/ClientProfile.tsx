import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Button, Avatar, TextInput, Badge, Paper, FileButton } from '@mantine/core';
import { IconUpload, IconMapPin, IconShieldCheck, IconCheck, IconCalendar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

export function ClientProfile() {
  const { currentUser, clientProfile } = useAuthStore();
  const [fullName, setFullName] = useState(clientProfile?.fullName ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [address, setAddress] = useState('Bole, Addis Ababa');
  const [altAddress, setAltAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      notifications.show({ title: 'Profile Updated', message: 'Your changes have been saved.', color: 'teal' });
    }, 900);
  };

  const createdAt = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <DashboardLayout title="Profile">
      <Stack gap="lg">

        {/* Avatar + badges */}
        <Card radius="lg" withBorder p="xl">
          <Group gap="xl" align="flex-start">
            <Stack align="center" gap="sm">
              <Box style={{ position: 'relative' }}>
                <Avatar size={90} radius="xl" color="teal" src={clientProfile?.selfieUrl}>
                  {fullName.charAt(0) || 'C'}
                </Avatar>
                <Box style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, background: T, borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCheck size={11} color="white" />
                </Box>
              </Box>
              <FileButton onChange={() => {}} accept="image/*">
                {(props) => (
                  <Button {...props} size="xs" variant="light" color="teal" leftSection={<IconUpload size={13} />}>
                    Upload Photo
                  </Button>
                )}
              </FileButton>
            </Stack>

            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={800} size="xl" c={N}>{fullName || 'Client'}</Text>
              <Text size="sm" c="dimmed">{email}</Text>
              <Group gap="xs" mt={4}>
                {currentUser?.phone && (
                  <Badge color="teal" size="sm" leftSection={<IconShieldCheck size={10} />}>Phone Verified</Badge>
                )}
                {currentUser?.email && (
                  <Badge color="blue" size="sm" leftSection={<IconShieldCheck size={10} />}>Email Verified</Badge>
                )}
              </Group>
              <Group gap={6} mt={4}>
                <IconCalendar size={14} color="gray" />
                <Text size="xs" c="dimmed">Member since {createdAt}</Text>
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Editable fields */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">Personal Information</Text>
          <Stack gap="md">
            <TextInput label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            <TextInput label="Email Address" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            <TextInput label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251..." />
          </Stack>
        </Card>

        {/* Addresses */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">Addresses</Text>
          <Stack gap="md">
            <TextInput
              label="Home Address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Bole, Addis Ababa"
              leftSection={<IconMapPin size={16} color={T} />}
            />
            <TextInput
              label="Alternative Address (optional)"
              value={altAddress}
              onChange={e => setAltAddress(e.target.value)}
              placeholder="e.g. Office, Kazanchis"
              leftSection={<IconMapPin size={16} color="gray" />}
            />
          </Stack>
        </Card>

        <Button size="md" radius="xl" loading={saving} onClick={save}
          style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none', width: 'fit-content' }}>
          Save Changes
        </Button>
      </Stack>
    </DashboardLayout>
  );
}

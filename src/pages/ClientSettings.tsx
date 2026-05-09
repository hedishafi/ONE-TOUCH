import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Button, Tabs, Switch, Select, Divider, PasswordInput, Paper, Modal, UnstyledButton, SimpleGrid } from '@mantine/core';
import { IconBell, IconShieldCheck, IconSun, IconMoon, IconDeviceDesktop, IconCheck, IconTrash, IconLock } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({ bookingUpdates: true, newMessages: true, promotions: false, emailNotifs: true, smsNotifs: true });
  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));
  const rows = [
    { key: 'bookingUpdates' as const, label: 'Booking Updates', desc: 'Status changes on your service requests' },
    { key: 'newMessages' as const, label: 'New Messages', desc: 'When a provider sends you a message' },
    { key: 'promotions' as const, label: 'Promotions', desc: 'Discounts and special offers' },
    { key: 'emailNotifs' as const, label: 'Email Notifications', desc: 'Receive alerts via email' },
    { key: 'smsNotifs' as const, label: 'SMS Notifications', desc: 'Receive alerts via text message' },
  ];
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">Notification Preferences</Text>
        <Stack gap={0}>
          {rows.map((row, i) => (
            <Box key={row.key}>
              {i > 0 && <Divider my="sm" />}
              <Group justify="space-between" wrap="nowrap">
                <Box><Text size="sm" fw={600}>{row.label}</Text><Text size="xs" c="dimmed">{row.desc}</Text></Box>
                <Switch checked={prefs[row.key]} onChange={() => toggle(row.key)} color="teal" />
              </Group>
            </Box>
          ))}
        </Stack>
        <Button mt="lg" size="sm" style={{ background: N }} onClick={() => notifications.show({ title: 'Saved', message: 'Notification preferences updated.', color: 'teal' })}>
          Save Preferences
        </Button>
      </Card>
    </Stack>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [cp, setCp] = useState(''); const [np, setNp] = useState(''); const [conf, setConf] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const changePw = () => {
    if (!cp) { notifications.show({ title: 'Error', message: 'Enter your current password.', color: 'red' }); return; }
    if (np.length < 8) { notifications.show({ title: 'Error', message: 'New password must be at least 8 characters.', color: 'red' }); return; }
    if (np !== conf) { notifications.show({ title: 'Error', message: 'Passwords do not match.', color: 'red' }); return; }
    setSaving(true);
    setTimeout(() => { setCp(''); setNp(''); setConf(''); setSaving(false); notifications.show({ title: 'Password Changed', message: 'Your password has been updated.', color: 'teal' }); }, 900);
  };

  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Group gap={8} mb="md"><IconLock size={18} color={N} /><Text fw={700}>Change Password</Text></Group>
        <Stack gap="md">
          <PasswordInput label="Current Password" value={cp} onChange={e => setCp(e.target.value)} placeholder="Enter current password" />
          <PasswordInput label="New Password" value={np} onChange={e => setNp(e.target.value)} placeholder="Min 8 characters" />
          <PasswordInput label="Confirm New Password" value={conf} onChange={e => setConf(e.target.value)} placeholder="Repeat new password" />
        </Stack>
        <Button mt="md" size="sm" style={{ background: N }} onClick={changePw} loading={saving}>Update Password</Button>
      </Card>

      <Card radius="lg" withBorder p="xl">
        <Group justify="space-between" wrap="nowrap">
          <Box>
            <Text fw={700}>Two-Factor Authentication</Text>
            <Text size="xs" c="dimmed">Add an extra layer of security to your account</Text>
          </Box>
          <Switch checked={twoFA} onChange={() => { setTwoFA(v => !v); notifications.show({ title: twoFA ? '2FA Disabled' : '2FA Enabled', message: twoFA ? 'Two-factor authentication has been turned off.' : 'Two-factor authentication is now active.', color: twoFA ? 'gray' : 'teal' }); }} color="teal" />
        </Group>
      </Card>

      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="xs">Privacy</Text>
        <Group justify="space-between" wrap="nowrap">
          <Box><Text size="sm" fw={600}>Show my profile picture to providers</Text><Text size="xs" c="dimmed">Providers can see your photo when you book</Text></Box>
          <Switch defaultChecked color="teal" />
        </Group>
      </Card>

      <Card radius="lg" withBorder p="xl" style={{ border: '1px solid #FCA5A5' }}>
        <Text fw={700} c="red" mb="xs">Danger Zone</Text>
        <Text size="sm" c="dimmed" mb="md">Permanently delete your account and all associated data. This action cannot be undone.</Text>
        <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={() => setDeleteOpen(true)}>Delete Account</Button>
      </Card>

      <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} centered radius="xl" title="Delete Account?" styles={{ content: { background: 'var(--ot-bg-card)' } }}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">This will permanently delete your account, bookings, and all data. This cannot be undone.</Text>
          <Group>
            <Button color="red" onClick={() => { setDeleteOpen(false); notifications.show({ title: 'Account Deleted', message: 'Your account has been scheduled for deletion.', color: 'red' }); }}>Yes, Delete</Button>
            <Button variant="light" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────
function AppearanceTab() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [lang, setLang] = useState('en');
  const opts = [
    { value: 'light' as const, label: 'Light', desc: 'Clean white interface', icon: <IconSun size={22} /> },
    { value: 'dark' as const, label: 'Dark', desc: 'Easy on the eyes', icon: <IconMoon size={22} /> },
    { value: 'auto' as const, label: 'System', desc: 'Follows your device', icon: <IconDeviceDesktop size={22} /> },
  ];
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb={4}>Theme</Text>
        <Text size="sm" c="dimmed" mb="lg">Choose how OneTouch looks for you.</Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {opts.map(opt => {
            const active = colorScheme === opt.value;
            return (
              <UnstyledButton key={opt.value} onClick={() => setColorScheme(opt.value)} style={{ width: '100%' }}>
                <Box style={{ borderRadius: 14, border: `2px solid ${active ? T : 'var(--ot-border)'}`, background: active ? `${T}10` : 'var(--ot-bg-row)', padding: 16, cursor: 'pointer', position: 'relative' }}>
                  {active && <Box style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: T, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={12} color="white" stroke={3} /></Box>}
                  <Group gap={10}><Box style={{ color: active ? T : 'var(--ot-text-muted)' }}>{opt.icon}</Box><Box><Text fw={700} size="sm" c={active ? T : 'var(--ot-text-body)'}>{opt.label}</Text><Text size="xs" c="dimmed">{opt.desc}</Text></Box></Group>
                </Box>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Card>

      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">Language</Text>
        <Select value={lang} onChange={v => setLang(v ?? 'en')}
          data={[{ value: 'en', label: 'English' }, { value: 'am', label: 'Amharic' }]}
          style={{ maxWidth: 240 }} />
      </Card>
    </Stack>
  );
}

// ─── CLIENT SETTINGS ─────────────────────────────────────────────────────────
export function ClientSettings() {
  const [tab, setTab] = useState<string | null>('notifications');
  return (
    <DashboardLayout title="Settings">
      <Group gap="sm" mb="md">
        <Box w={44} h={44} style={{ borderRadius: 12, background: `${N}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconShieldCheck size={20} color={N} />
        </Box>
        <Box><Text fw={800} size="lg" c={N}>Settings</Text><Text size="sm" c="dimmed">Manage your preferences and security.</Text></Box>
      </Group>
      <Tabs value={tab} onChange={setTab} styles={{ tab: { fontWeight: 600, fontSize: 14, paddingTop: 10, paddingBottom: 10 }, list: { borderBottom: '2px solid var(--ot-border)', gap: 4, marginBottom: 20 } }}>
        <Tabs.List>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>Notifications</Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>Password & Security</Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconSun size={16} />}>Appearance</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="notifications"><NotificationsTab /></Tabs.Panel>
        <Tabs.Panel value="security"><SecurityTab /></Tabs.Panel>
        <Tabs.Panel value="appearance"><AppearanceTab /></Tabs.Panel>
      </Tabs>
    </DashboardLayout>
  );
}

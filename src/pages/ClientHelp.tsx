import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Paper, Accordion, Button, Textarea, Select, SimpleGrid, Badge, Divider, FileButton } from '@mantine/core';
import { IconLifebuoy, IconMessageCircle, IconPhone, IconMail, IconAlertCircle, IconCheck, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const FAQS = [
  { q: 'How do I book a service?', a: 'Browse services, select a category, describe your problem, and connect with a nearby verified provider. Confirm the job and pay securely through TeleBirr.' },
  { q: 'How do I cancel a booking?', a: 'Go to My Requests, find the booking, and tap "Cancel". Cancellations made more than 1 hour before the scheduled time are free. Late cancellations may incur a small fee.' },
  { q: 'What if the provider doesn\'t show up?', a: 'If a provider doesn\'t arrive within 30 minutes of the agreed time, you can report a no-show. You will receive a full refund and we will reassign another provider.' },
  { q: 'How do payments work?', a: 'Payment is collected upfront via TeleBirr to confirm the booking. Funds are held securely and released to the provider only after you confirm the job is complete.' },
  { q: 'How is my data protected?', a: 'We use end-to-end encryption for all communications and payments. Your personal data is never shared with third parties without your consent. See our Privacy Policy for full details.' },
];

const MOCK_TICKETS = [
  { id: 'TKT-001', subject: 'Provider arrived late', status: 'Resolved', date: '3 days ago' },
  { id: 'TKT-002', subject: 'Overcharged for service', status: 'Open', date: '1 day ago' },
];

export function ClientHelp() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [booking, setBooking] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (!issueType || !description.trim()) { notifications.show({ title: 'Required', message: 'Please select an issue type and describe the problem.', color: 'red' }); return; }
    setSending(true);
    setTimeout(() => { setSending(false); setIssueType(''); setDescription(''); setBooking(''); notifications.show({ title: 'Report Submitted', message: 'Our team will review your report within 24 hours.', color: 'teal' }); }, 1000);
  };

  return (
    <DashboardLayout title="Help & Support">
      <Stack gap="lg">

        {/* Contact options */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {[
            { icon: <IconPhone size={22} />, label: 'Call Us', value: '8182', sub: 'Free · Mon–Sat 8am–8pm', color: T },
            { icon: <IconMail size={22} />, label: 'Email Support', value: 'support@onetouch.et', sub: 'Response within 24 hours', color: N },
            { icon: <IconMessageCircle size={22} />, label: 'Live Chat', value: 'Start Chat', sub: 'Available 9am–6pm', color: COLORS.success },
          ].map(item => (
            <Paper key={item.label} p="lg" radius="xl" withBorder style={{ background: 'var(--ot-bg-card)', textAlign: 'center' }}>
              <Box style={{ color: item.color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{item.icon}</Box>
              <Text fw={700} size="sm" c={N}>{item.label}</Text>
              <Text fw={800} size="sm" c={item.color} mt={4}>{item.value}</Text>
              <Text size="xs" c="dimmed" mt={2}>{item.sub}</Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* FAQs */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} size="md" mb="md" c={N}>Frequently Asked Questions</Text>
          <Accordion variant="separated" radius="lg">
            {FAQS.map((faq, i) => (
              <Accordion.Item key={i} value={String(i)}>
                <Accordion.Control><Text fw={600} size="sm">{faq.q}</Text></Accordion.Control>
                <Accordion.Panel><Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{faq.a}</Text></Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>

        {/* Report a Problem */}
        <Card radius="lg" withBorder p="xl">
          <Group gap={8} mb="md">
            <IconAlertCircle size={20} color={COLORS.error} />
            <Text fw={700} size="md" c={N}>Report a Problem</Text>
          </Group>
          <Stack gap="md">
            <Select label="Booking (optional)" placeholder="Select a booking" value={booking} onChange={v => setBooking(v ?? '')}
              data={[{ value: 'b1', label: 'Home Cleaning — 3 days ago' }, { value: 'b2', label: 'Plumbing — 1 week ago' }]} />
            <Select label="Issue Type" placeholder="Select issue type" value={issueType} onChange={v => setIssueType(v ?? '')}
              data={['Provider No-Show', 'Poor Quality', 'Overcharged', 'Other']} />
            <Textarea label="Description" placeholder="Describe the issue in detail..." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
            <Group>
              <FileButton onChange={() => {}} accept="image/*">
                {(props) => <Button {...props} variant="light" color="gray" size="sm" leftSection={<IconUpload size={14} />}>Attach Photo</Button>}
              </FileButton>
            </Group>
            <Button size="md" radius="xl" loading={sending} leftSection={<IconCheck size={16} />}
              style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none', width: 'fit-content' }} onClick={submit}>
              Submit Report
            </Button>
          </Stack>
        </Card>

        {/* My Tickets */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} size="md" mb="md" c={N}>My Support Tickets</Text>
          {MOCK_TICKETS.length === 0 ? (
            <Text size="sm" c="dimmed">No support tickets yet.</Text>
          ) : (
            <Stack gap={0}>
              {MOCK_TICKETS.map((t, i) => (
                <Box key={t.id}>
                  {i > 0 && <Divider my="sm" />}
                  <Group justify="space-between" wrap="nowrap">
                    <Box>
                      <Text size="sm" fw={600}>{t.subject}</Text>
                      <Text size="xs" c="dimmed">{t.id} · {t.date}</Text>
                    </Box>
                    <Badge color={t.status === 'Open' ? 'orange' : 'teal'} variant="light" size="sm">{t.status}</Badge>
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </Card>

      </Stack>
    </DashboardLayout>
  );
}

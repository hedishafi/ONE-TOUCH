import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Paper, Accordion, Button, Textarea, TextInput, Badge, Divider, SimpleGrid } from '@mantine/core';
import { IconLifebuoy, IconMessageCircle, IconPhone, IconMail, IconChevronDown, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ProviderLayout } from '../components/ProviderLayout';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const FAQS = [
  { q: 'How do I get paid for completed jobs?', a: 'Payments are processed through TeleBirr after the client confirms job completion. Funds are released to your account within 1–2 business days.' },
  { q: 'What happens if a client disputes a job?', a: 'If a client raises a dispute, our team reviews the case within 48 hours. You will be notified and asked to provide evidence. We aim to resolve disputes fairly for both parties.' },
  { q: 'How is the platform commission calculated?', a: 'A 10% platform fee is deducted from each completed job. This covers payment processing, platform maintenance, and customer support.' },
  { q: 'Can I cancel a job after accepting it?', a: 'Yes, but frequent cancellations may affect your rating and visibility. Always provide a reason when cancelling so we can improve job matching.' },
  { q: 'How do I improve my rating?', a: 'Complete jobs on time, communicate clearly with clients, and maintain professional standards. Clients rate you after each job — consistent quality leads to higher ratings.' },
  { q: 'What if a client does not pay?', a: 'Payment is collected upfront through TeleBirr before the client receives your phone number. This protects you from non-payment.' },
  { q: 'How do I update my service area?', a: 'Go to Settings → Profile and adjust your coverage radius. Changes take effect immediately.' },
];

export function ProviderHelp() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (!subject.trim() || !message.trim()) {
      notifications.show({ title: 'Required', message: 'Please fill in both subject and message.', color: 'red' });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubject(''); setMessage('');
      notifications.show({ title: 'Message Sent', message: 'Our support team will respond within 24 hours.', color: 'teal' });
    }, 1000);
  };

  return (
    <ProviderLayout title="Help & Support">
      <Stack gap="lg">

        {/* Contact options */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {[
            { icon: <IconPhone size={22}/>, label: 'Call Us', value: '8182', sub: 'Free · Mon–Sat 8am–8pm', color: T },
            { icon: <IconMail size={22}/>, label: 'Email Support', value: 'support@onetouch.et', sub: 'Response within 24 hours', color: N },
            { icon: <IconMessageCircle size={22}/>, label: 'Live Chat', value: 'Start Chat', sub: 'Available 9am–6pm', color: COLORS.success },
          ].map(item => (
            <Paper key={item.label} p="lg" radius="xl" withBorder style={{ background: 'var(--ot-bg-card)', textAlign: 'center' }}>
              <Box style={{ color: item.color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{item.icon}</Box>
              <Text fw={700} size="sm" c={N}>{item.label}</Text>
              <Text fw={800} size="sm" c={item.color} mt={4}>{item.value}</Text>
              <Text size="xs" c="dimmed" mt={2}>{item.sub}</Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Dispute notice */}
        <Paper p="md" radius="lg" style={{ background: `${COLORS.warning}12`, border: `1px solid ${COLORS.warning}44` }}>
          <Group gap={10}>
            <IconAlertCircle size={18} color={COLORS.warning}/>
            <Box>
              <Text fw={700} size="sm" c={N}>Have a dispute?</Text>
              <Text size="xs" c="dimmed">Use the contact form below and select "Dispute" as the subject. Our team resolves disputes within 48 hours.</Text>
            </Box>
          </Group>
        </Paper>

        {/* FAQs */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} size="md" mb="md" c={N}>Frequently Asked Questions</Text>
          <Accordion variant="separated" radius="lg">
            {FAQS.map((faq, i) => (
              <Accordion.Item key={i} value={String(i)}>
                <Accordion.Control>
                  <Text fw={600} size="sm">{faq.q}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{faq.a}</Text>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>

        {/* Contact form */}
        <Card radius="lg" withBorder p="xl">
          <Group gap={8} mb="md">
            <IconMessageCircle size={20} color={T}/>
            <Text fw={700} size="md" c={N}>Send us a message</Text>
          </Group>
          <Stack gap="md">
            <TextInput
              label="Subject"
              placeholder="e.g. Dispute with client, Payment issue..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <Textarea
              label="Message"
              placeholder="Describe your issue in detail..."
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <Button
              size="md"
              radius="xl"
              loading={sending}
              leftSection={<IconCheck size={16}/>}
              style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none', width: 'fit-content' }}
              onClick={submit}
            >
              Send Message
            </Button>
          </Stack>
        </Card>

      </Stack>
    </ProviderLayout>
  );
}

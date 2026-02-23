import { useState, useRef, useEffect } from 'react';
import {
  ActionIcon, Paper, Stack, Text, Group, TextInput,
  ScrollArea, Box, ThemeIcon, Transition, Badge,
} from '@mantine/core';
import { IconRobot, IconSend, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { COLORS } from '../utils/constants';
import type { HelpMessage } from '../types';

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  '/client/browse': ['How to book a service?', 'How does pricing work?', 'Is my payment secure?'],
  '/client/wallet': ['How to add funds?', 'What is cashback?', 'When is my payment released?'],
  '/client/loyalty': ['How do I earn rewards?', 'What is the Gold tier?', 'Can I withdraw cashback?'],
  '/provider/earnings': ['How is commission calculated?', 'When do I get paid?', 'How to reduce commission?'],
  '/provider/profile': ['How to optimize my profile?', 'How does rating affect me?', 'What is Elite Pro tier?'],
  '/provider/jobs': ['How do I accept a job?', 'What is Start Work?', 'How does tracking work?'],
  '/admin/fraud': ['How does fraud detection work?', 'How to handle flagged users?'],
  '/admin/disputes': ['How to resolve a dispute?', 'What is split resolution?'],
};

const DEFAULT_SUGGESTIONS = [
  'How does ONE TOUCH work?',
  'How are payments handled?',
  'Is my personal info safe?',
  'How do I get verified?',
];

const MOCK_RESPONSES: Record<string, string> = {
  'How to book a service?': 'To book: 1) Browse services by category, 2) Find a nearby provider on the map, 3) Tap "Call Free" to connect instantly, 4) Confirm the service price, and payment is secured in escrow.',
  'How does pricing work?': 'Providers set their own rates (hourly, fixed, or custom estimate). You confirm the price before any payment is charged. No hidden fees!',
  'Is my payment secure?': 'Yes! Payments are held in escrow and only released to the provider after you confirm the job is complete. You\'re always protected.',
  'How to add funds?': 'Go to Wallet → Top Up, and add funds using a credit/debit card. Funds are available instantly.',
  'What is cashback?': 'Cashback rewards are earned on every booking. Bronze: 3%, Silver: 5%, Gold: 7%. Cashback stays in your wallet for future bookings.',
  'Can I withdraw cashback?': 'Cashback rewards can only be used for future service bookings on ONE TOUCH. This keeps the ecosystem fair for everyone.',
  'How is commission calculated?': 'The platform charges 8–12% commission. As a Trusted Pro, you get a 2% discount. As an Elite Pro, you get a 4% reduction!',
  'How to optimize my profile?': 'Add portfolio images, write a detailed bio, maintain a 4.5+ rating, and respond quickly to calls. Higher response rates boost your search ranking.',
  'How does ONE TOUCH work?': 'ONE TOUCH connects clients with verified service providers based on your location. Browse → Call Free → Confirm price → Job starts. No bidding, just instant service!',
  'How are payments handled?': 'Payments go into escrow immediately after job confirmation. When the client confirms completion, funds are released to the provider minus the platform commission.',
  'Is my personal info safe?': 'Yes! Phone numbers are masked during calls. ID documents are used only for verification. We never share personal data with third parties.',
  'How do I get verified?': 'Upload a government ID and selfie during registration. Our team reviews your documents within 24 hours. You\'ll be notified once verified.',
  'How do I earn rewards?': 'Every booking earns cashback based on your loyalty tier. Book the same provider again for extra repeat-booking cashback bonuses!',
  'What is the Gold tier?': 'Gold tier clients get 7% cashback, priority support, featured placement in provider search, and exclusive access to Gold-tier events.',
  'How does fraud detection work?': 'AI monitors patterns like repeated cancellations, unusual call behavior, and direct contact bypass attempts. Flagged accounts enter a review queue.',
  'default': 'I\'m here to help! You can ask me about booking services, payments, loyalty rewards, how verification works, or anything about the ONE TOUCH platform.',
};

export function AIHelpCenter() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: t('help.greeting'),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const contextSuggestions =
    CONTEXT_SUGGESTIONS[location.pathname] ?? DEFAULT_SUGGESTIONS;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: HelpMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const response = MOCK_RESPONSES[text] ?? MOCK_RESPONSES['default'];
    const assistantMsg: HelpMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(Date.now() + 800).toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg]);
    }, 800);
  };

  return (
    <>
      {/* Floating Button */}
      <ActionIcon
        size={52}
        radius="xl"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 200,
          background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.tealDark} 100%)`,
          boxShadow: '0 4px 20px rgba(0,180,216,0.4)',
        }}
        onClick={() => setIsOpen(v => !v)}
        aria-label="Help"
      >
        {isOpen ? <IconX size={22} color="white" /> : <IconRobot size={22} color="white" />}
      </ActionIcon>

      {/* Chat Window */}
      <Transition mounted={isOpen} transition="pop" duration={200}>
        {(styles) => (
          <Paper
            style={{
              ...styles,
              position: 'fixed',
              bottom: 88,
              right: 24,
              width: 340,
              height: 480,
              zIndex: 199,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            shadow="xl"
            radius="lg"
            withBorder
          >
            {/* Header */}
            <Box
              p="md"
              style={{
                background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`,
                flexShrink: 0,
              }}
            >
              <Group gap="sm">
                <ThemeIcon size="lg" radius="xl" color="teal" variant="filled">
                  <IconRobot size={18} />
                </ThemeIcon>
                <Box>
                  <Text size="sm" fw={700} c="white">{t('help.title')}</Text>
                  <Group gap={4}>
                    <Box w={6} h={6} style={{ borderRadius: '50%', background: '#2ECC71' }} />
                    <Text size="xs" c="rgba(255,255,255,0.7)">Always Online</Text>
                  </Group>
                </Box>
              </Group>
            </Box>

            {/* Messages */}
            <ScrollArea flex={1} viewportRef={scrollRef} p="sm">
              <Stack gap="xs">
                {messages.map(msg => (
                  <Box
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box
                      maw="85%"
                      p="sm"
                      style={{
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user'
                          ? `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`
                          : '#F0F4FF',
                        color: msg.role === 'user' ? 'white' : COLORS.navyBlue,
                      }}
                    >
                      <Text size="sm" style={{ lineHeight: 1.5 }}>{msg.content}</Text>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </ScrollArea>

            {/* Suggestions */}
            <Box px="sm" pb="xs">
              <Text size="xs" c="dimmed" mb={4}>{t('help.suggestions')}</Text>
              <Group gap={4} style={{ flexWrap: 'wrap' }}>
                {contextSuggestions.slice(0, 3).map(s => (
                  <Badge
                    key={s}
                    size="sm"
                    variant="outline"
                    color="navy"
                    style={{ cursor: 'pointer', fontSize: 10 }}
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </Group>
            </Box>

            {/* Input */}
            <Box
              p="sm"
              style={{
                borderTop: '1px solid #E9ECEF',
                flexShrink: 0,
              }}
            >
              <Group gap="xs">
                <TextInput
                  flex={1}
                  placeholder={t('help.placeholder')}
                  value={inputValue}
                  onChange={e => setInputValue(e.currentTarget.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage(inputValue)}
                  size="sm"
                  radius="xl"
                />
                <ActionIcon
                  size="lg"
                  radius="xl"
                  style={{ background: COLORS.tealBlue }}
                  onClick={() => sendMessage(inputValue)}
                >
                  <IconSend size={14} color="white" />
                </ActionIcon>
              </Group>
            </Box>
          </Paper>
        )}
      </Transition>
    </>
  );
}

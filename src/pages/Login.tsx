/**
 * Login.tsx — Refined authentication screen
 * Design language aligned with 3-step signup flow.
 * Dark mode, role-based routing, validation, demo quick-fill.
 */
import { useState } from 'react';
import {
  Box, Button, Center, Container, Group, Paper,
  PasswordInput, Stack, Text, TextInput, Divider,
  Alert, Badge, useMantineColorScheme,
} from '@mantine/core';
import {
  IconShieldLock, IconArrowRight, IconMail, IconLock,
  IconAlertCircle, IconUser, IconBriefcase,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { DarkModeToggle } from '../components/DarkModeToggle';

// ─── Demo accounts ────────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { role: 'Client',    email: 'abebe.girma@gmail.com',      icon: 'client',   color: 'teal' },
  { role: 'Provider',  email: 'yohannes.teferi@gmail.com',  icon: 'provider', color: 'blue' },
  { role: 'Admin',     email: 'admin@onetouch.et',           icon: 'admin',    color: 'grape' },
] as const;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { colorScheme } = useMantineColorScheme();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [emailError, setEmailError]   = useState('');
  const [passError, setPassError]     = useState('');

  const validate = () => {
    let ok = true;
    if (!/^\S+@\S+/.test(email)) { setEmailError('Please enter a valid email address'); ok = false; }
    else setEmailError('');
    if (!password) { setPassError('Password is required'); ok = false; }
    else setPassError('');
    return ok;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      setLoading(false);
      if (result.success) {
        const user = useAuthStore.getState().currentUser;
        notifications.show({
          title: 'Welcome back!',
          message: `Signed in as ${user?.email}`,
          color: 'teal',
          icon: <IconShieldLock size={16} />,
        });
        if (user?.role === 'client')   navigate(ROUTES.clientDashboard);
        else if (user?.role === 'provider') navigate(ROUTES.providerDashboard);
        else navigate(ROUTES.adminDashboard);
      } else {
        setError(result.error ?? 'Sign in failed. Please check your credentials.');
      }
    }, 700);
  };

  const quickFill = (acc: typeof DEMO_ACCOUNTS[number]) => {
    setEmail(acc.email);
    setPassword('demo');
    setEmailError('');
    setPassError('');
    setError('');
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'var(--ot-bg-page)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Navbar — identical structure to signup Shell */}
      <Box style={{ background: 'var(--ot-nav-bg)', borderBottom: '1px solid var(--ot-nav-border)' }}>
        <Container size={680}>
          <Group justify="space-between" py={14}>
            <Group gap={10} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.landing)}>
              <Box
                w={36}
                h={36}
                style={{
                  borderRadius: 10,
                  background: COLORS.navyBlue,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconLock size={16} color={COLORS.lemonYellow} strokeWidth={2.5} />
              </Box>
              <Text fw={900} size="sm" c={COLORS.navyBlue} style={{ letterSpacing: '-0.3px' }}>
                ONE TOUCH
              </Text>
            </Group>
            <Group gap={8}>
              <DarkModeToggle />
              <LanguageSwitcher />
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Thin accent bar (matches signup) */}
      <Box style={{ height: 3, background: `linear-gradient(90deg, ${COLORS.navyBlue}, ${COLORS.tealBlue})` }} />

      <Center flex={1} py={48} px={16}>
        <Container size={480} w="100%">
          <Paper
            radius={20}
            p={{ base: 28, sm: 40 }}
            style={{
              border: '1px solid var(--ot-border)',
              boxShadow: '0 4px 28px rgba(0,0,128,0.07)',
              background: 'var(--ot-bg-card)',
            }}
          >
            <Stack gap={28}>
              {/* Header */}
              <Stack gap={6} align="center">
                <Box
                  w={56}
                  h={56}
                  style={{
                    borderRadius: 16,
                    background: `${COLORS.navyBlue}12`,
                    border: `1.5px solid ${COLORS.navyBlue}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconShieldLock size={28} color={COLORS.navyBlue} strokeWidth={1.8} />
                </Box>
                <Text fw={800} size="xl" c="var(--ot-text-navy)" mt={4}>
                  Welcome Back
                </Text>
                <Text size="sm" c="var(--ot-text-sub)" ta="center">
                  Sign in to your ONE TOUCH account
                </Text>
              </Stack>

              {/* Error alert */}
              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  radius="md"
                  withCloseButton
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <Stack gap={16}>
                  <TextInput
                    label="Email Address"
                    placeholder="you@example.com"
                    leftSection={<IconMail size={16} />}
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                    error={emailError}
                    size="md"
                    styles={{
                      label: { fontWeight: 600, fontSize: 13, color: 'var(--ot-text-navy)', marginBottom: 6 },
                    }}
                  />
                  <PasswordInput
                    label="Password"
                    placeholder="Your password"
                    leftSection={<IconLock size={16} />}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPassError(''); }}
                    error={passError}
                    size="md"
                    styles={{
                      label: { fontWeight: 600, fontSize: 13, color: 'var(--ot-text-navy)', marginBottom: 6 },
                    }}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    loading={loading}
                    rightSection={!loading && <IconArrowRight size={16} />}
                    mt={4}
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`,
                      height: 48,
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    Sign In
                  </Button>
                </Stack>
              </form>

              {/* Divider */}
              <Divider
                label={<Text size="xs" c="var(--ot-text-muted)">Quick demo access</Text>}
                labelPosition="center"
              />

              {/* Demo quick-fill */}
              <Stack gap={8}>
                {DEMO_ACCOUNTS.map(acc => (
                  <Box
                    key={acc.email}
                    onClick={() => quickFill(acc)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid var(--ot-border)',
                      background: 'var(--ot-bg-row)',
                      transition: 'all 0.18s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = COLORS.tealBlue;
                      (e.currentTarget as HTMLElement).style.background = 'rgba(0,128,128,0.05)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--ot-border)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--ot-bg-row)';
                    }}
                  >
                    <Group gap={10} justify="space-between">
                      <Group gap={10}>
                        <Box
                          w={32}
                          h={32}
                          style={{
                            borderRadius: 8,
                            background: acc.role === 'Client' ? `${COLORS.tealBlue}15` : acc.role === 'Provider' ? `${COLORS.navyBlue}12` : '#9B59B610',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {acc.role === 'Client'
                            ? <IconUser size={16} color={COLORS.tealBlue} />
                            : acc.role === 'Provider'
                            ? <IconBriefcase size={16} color={COLORS.navyBlue} />
                            : <IconShieldLock size={16} color="#9B59B6" />
                          }
                        </Box>
                        <Stack gap={2}>
                          <Text size="xs" fw={700} c="var(--ot-text-navy)">{acc.role}</Text>
                          <Text size="10px" c="var(--ot-text-muted)">{acc.email}</Text>
                        </Stack>
                      </Group>
                      <Badge size="xs" variant="light" color={acc.color}>Try</Badge>
                    </Group>
                  </Box>
                ))}
              </Stack>

              {/* Sign up link */}
              <Text size="sm" ta="center" c="var(--ot-text-sub)">
                Don't have an account?{' '}
                <Text
                  component="span"
                  c={COLORS.tealBlue}
                  fw={700}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(ROUTES.signup)}
                >
                  Create one now
                </Text>
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Center>

      <AIHelpCenter />
    </Box>
  );
}

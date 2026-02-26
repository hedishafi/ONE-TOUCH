/**
 * ChapaModal.tsx — Mocked Chapa payment integration
 *
 * Simulates the full Chapa payment gateway flow:
 * select method → enter details → processing → success / failure
 *
 * In production replace processPay() with a real Chapa API call.
 */
import { useState } from 'react';
import {
  Modal, Box, Text, Group, Stack, Button, Paper, ThemeIcon,
  Divider, Badge, SimpleGrid, Loader, Center, TextInput,
} from '@mantine/core';
import {
  IconCurrencyDollar, IconCheck, IconX, IconPhone, IconCreditCard,
  IconBuildingBank, IconShieldCheck, IconAlertCircle, IconLock,
  IconArrowRight,
} from '@tabler/icons-react';
import { COLORS, CURRENCY_SYMBOL } from '../utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChapaPaymentProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure?: () => void;
  amount: number;           // in ETB
  description: string;
  providerName: string;
  jobId: string;
}

type PayMethod = 'telebirr' | 'cbe_birr' | 'mpesa' | 'card';
type Stage = 'select' | 'details' | 'processing' | 'success' | 'failed';

const METHODS: { id: PayMethod; label: string; icon: React.ReactNode; color: string; hint: string }[] = [
  { id: 'telebirr', label: 'Telebirr', icon: <IconPhone size={22} />, color: '#007AFF', hint: 'Ethio Telecom mobile money' },
  { id: 'cbe_birr', label: 'CBE Birr', icon: <IconBuildingBank size={22} />, color: '#3A7D44', hint: 'Commercial Bank of Ethiopia' },
  { id: 'mpesa', label: 'M-Pesa', icon: <IconPhone size={22} />, color: '#00B42A', hint: 'Safaricom mobile money' },
  { id: 'card', label: 'Debit / Credit', icon: <IconCreditCard size={22} />, color: COLORS.navyBlue, hint: 'Visa / Mastercard' },
];

// Fake processing time (ms)
const PROCESSING_MS = 2800;

// ─── Component ────────────────────────────────────────────────────────────────
export function ChapaModal({
  opened, onClose, onSuccess, onFailure,
  amount, description, providerName, jobId,
}: ChapaPaymentProps) {
  const [stage, setStage] = useState<Stage>('select');
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [error, setError] = useState('');

  const navy = COLORS.navyBlue;
  const teal = COLORS.tealBlue;

  function handleSelectMethod(m: PayMethod) {
    setMethod(m);
    setStage('details');
    setError('');
  }

  function validate(): boolean {
    if (method === 'card') {
      if (cardNum.replace(/\s/g, '').length < 12) { setError('Enter a valid card number.'); return false; }
      if (!cardExp.match(/^\d{2}\/\d{2}$/)) { setError('Enter expiry as MM/YY.'); return false; }
      if (cardCvv.length < 3) { setError('Enter a valid CVV.'); return false; }
    } else {
      if (phone.replace(/\D/g, '').length < 9) { setError('Enter a valid phone number.'); return false; }
    }
    return true;
  }

  function handlePay() {
    if (!validate()) return;
    setError('');
    setStage('processing');
    // Simulate gateway round-trip
    setTimeout(() => {
      // In demo: always succeed. In prod: call real Chapa initiate-payment API.
      const success = true;
      if (success) {
        setStage('success');
        setTimeout(() => { onSuccess(); resetState(); }, 1600);
      } else {
        setStage('failed');
      }
    }, PROCESSING_MS);
  }

  function resetState() {
    setStage('select');
    setMethod(null);
    setPhone('');
    setCardNum('');
    setCardExp('');
    setCardCvv('');
    setError('');
  }

  const canClose = stage === 'select' || stage === 'failed';

  // ── UI helpers ────────────────────────────────────────────────────────────
  const inputStyle = {
    input: { background: '#F8F9FA', borderColor: '#DEE2E6', fontSize: 15 },
    label: { fontWeight: 600, color: navy },
  };

  return (
    <Modal
      opened={opened}
      onClose={() => { if (canClose) { onClose(); resetState(); } }}
      withCloseButton={canClose}
      centered
      radius="xl"
      size="md"
      title={
        <Group gap={10}>
          <Box w={32} h={32} style={{
            borderRadius: 9, background: `linear-gradient(135deg, ${navy}, ${teal})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconLock size={16} color="white" />
          </Box>
          <Box>
            <Text fw={800} size="sm" c={navy}>Secure Payment · Chapa</Text>
            <Text size="xs" c="dimmed">Commission for confirmed job</Text>
          </Box>
        </Group>
      }
      styles={{
        content: { background: 'white' },
        header: { background: 'white', borderBottom: '1px solid #F0F0F0', paddingBottom: 12 },
      }}
    >
      {/* ── Breakdown ─────────────────────────────────────────────────────── */}
      {stage !== 'processing' && stage !== 'success' && (
        <Paper p="md" radius="lg" mb="lg" style={{ background: '#F8FBFF', border: '1px solid #E8F0FF' }}>
          <Group justify="space-between" mb={6}>
            <Text size="sm" c="dimmed">Job</Text>
            <Text size="sm" fw={600}>{description}</Text>
          </Group>
          <Group justify="space-between" mb={6}>
            <Text size="sm" c="dimmed">Commission (10%)</Text>
            <Text size="sm" fw={700} c={COLORS.error}>
              {CURRENCY_SYMBOL} {amount.toFixed(2)}
            </Text>
          </Group>
          <Divider my={8} />
          <Group justify="space-between">
            <Text size="sm" fw={800} c={navy}>Total Due Now</Text>
            <Text size="md" fw={900} c={navy}>{CURRENCY_SYMBOL} {amount.toFixed(2)}</Text>
          </Group>
          <Group gap={5} mt={8}>
            <IconShieldCheck size={13} color={teal} />
            <Text size="xs" c={teal} fw={600}>Payment secured by Chapa · TxID: {jobId.slice(-8).toUpperCase()}</Text>
          </Group>
        </Paper>
      )}

      {/* ══ STAGE: SELECT ════════════════════════════════════════════════ */}
      {stage === 'select' && (
        <Stack gap="md">
          <Text size="sm" fw={600} c={navy}>Choose payment method</Text>
          <SimpleGrid cols={2} spacing={10}>
            {METHODS.map(m => (
              <Paper
                key={m.id}
                p="md"
                radius="lg"
                style={{
                  cursor: 'pointer', border: `2px solid #F0F0F0`,
                  transition: 'all 0.18s ease',
                  textAlign: 'center',
                }}
                onClick={() => handleSelectMethod(m.id)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = m.color;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${m.color}22`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#F0F0F0';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <Box style={{ color: m.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{m.icon}</Box>
                <Text size="sm" fw={700} c={navy}>{m.label}</Text>
                <Text size="10px" c="dimmed">{m.hint}</Text>
              </Paper>
            ))}
          </SimpleGrid>
          <Text size="xs" c="dimmed" ta="center" mt={4}>
            Demo mode: any amount will succeed · no real charge
          </Text>
        </Stack>
      )}

      {/* ══ STAGE: DETAILS ═══════════════════════════════════════════════ */}
      {stage === 'details' && method && (
        <Stack gap="md">
          <Group gap={8}>
            <IconArrowRight size={16} color={teal} style={{ cursor: 'pointer' }} onClick={() => { setStage('select'); setError(''); }} />
            <Text size="sm" fw={600} c={navy}>
              {METHODS.find(m => m.id === method)?.label} Details
            </Text>
          </Group>

          {error && (
            <Group gap={6} p={10} style={{ background: '#FFF0F0', borderRadius: 8 }}>
              <IconAlertCircle size={15} color={COLORS.error} />
              <Text size="xs" c={COLORS.error}>{error}</Text>
            </Group>
          )}

          {method === 'card' ? (
            <>
              <TextInput
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={cardNum}
                onChange={e => setCardNum(e.target.value)}
                styles={inputStyle}
                leftSection={<IconCreditCard size={16} />}
                maxLength={19}
              />
              <Group grow>
                <TextInput
                  label="Expiry (MM/YY)"
                  placeholder="09/28"
                  value={cardExp}
                  onChange={e => setCardExp(e.target.value)}
                  styles={inputStyle}
                  maxLength={5}
                />
                <TextInput
                  label="CVV"
                  placeholder="123"
                  value={cardCvv}
                  onChange={e => setCardCvv(e.target.value)}
                  styles={inputStyle}
                  maxLength={4}
                  type="password"
                />
              </Group>
            </>
          ) : (
            <TextInput
              label="Mobile Number"
              placeholder="+251 9XX XXX XXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              styles={inputStyle}
              leftSection={<IconPhone size={16} />}
            />
          )}

          <Button
            fullWidth size="md"
            style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
            onClick={handlePay}
          >
            Pay {CURRENCY_SYMBOL} {amount.toFixed(2)}
          </Button>
        </Stack>
      )}

      {/* ══ STAGE: PROCESSING ════════════════════════════════════════════ */}
      {stage === 'processing' && (
        <Center py={48}>
          <Stack align="center" gap={20}>
            <Box style={{ position: 'relative', width: 80, height: 80 }}>
              <Box style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: `3px solid ${teal}22`,
                animation: 'spin-ring 1.2s linear infinite',
              }} />
              <Box style={{
                position: 'absolute', inset: 6, borderRadius: '50%',
                background: `linear-gradient(135deg, ${navy}, ${teal})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconLock size={26} color="white" />
              </Box>
              <style>{`@keyframes spin-ring{to{transform:rotate(360deg)}}`}</style>
            </Box>
            <Text fw={700} size="md" c={navy}>Processing payment…</Text>
            <Text size="sm" c="dimmed">Connecting to Chapa gateway</Text>
          </Stack>
        </Center>
      )}

      {/* ══ STAGE: SUCCESS ═══════════════════════════════════════════════ */}
      {stage === 'success' && (
        <Center py={40}>
          <Stack align="center" gap={16}>
            <ThemeIcon size={72} radius="xl" style={{ background: COLORS.success }}>
              <IconCheck size={38} color="white" />
            </ThemeIcon>
            <Text fw={800} size="lg" c={navy}>Payment Successful!</Text>
            <Text size="sm" c="dimmed" ta="center">
              {CURRENCY_SYMBOL} {amount.toFixed(2)} paid via {METHODS.find(m => m.id === method)?.label ?? 'Chapa'}
            </Text>
            <Badge color="teal" variant="light" size="lg">Client contact details revealed</Badge>
          </Stack>
        </Center>
      )}

      {/* ══ STAGE: FAILED ════════════════════════════════════════════════ */}
      {stage === 'failed' && (
        <Center py={40}>
          <Stack align="center" gap={16}>
            <ThemeIcon size={72} radius="xl" color="red" variant="light">
              <IconX size={38} />
            </ThemeIcon>
            <Text fw={800} size="lg" c={navy}>Payment Failed</Text>
            <Text size="sm" c="dimmed">Something went wrong. Please try another method.</Text>
            <Button variant="light" color="red" onClick={() => { setStage('select'); setError(''); }}>
              Try Again
            </Button>
          </Stack>
        </Center>
      )}
    </Modal>
  );
}

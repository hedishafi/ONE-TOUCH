import { useState } from 'react';
import {
  Modal, Stepper, Stack, Text, Group, Avatar, Badge,
  Button, Divider, NumberInput, Box, ThemeIcon, Alert,
  Progress, ActionIcon,
} from '@mantine/core';
import {
  IconCheck, IconWallet, IconMapPin, IconBriefcase,
  IconStar, IconAlertCircle, IconCreditCard, IconTruck,
  IconPlayerPlay, IconFlagCheck, IconShieldCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useJobStore } from '../store/jobStore';
import { useAuthStore } from '../store/authStore';
import { MOCK_PROVIDER_PROFILES, MOCK_USERS } from '../mock/mockUsers';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import { COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatting';
import { storage, STORAGE_KEYS } from '../utils/storage';
import type { WalletTransaction } from '../types';

type FlowStep = 'agreement' | 'payment' | 'active' | 'in_progress' | 'completed';

interface JobFlowModalProps {
  opened: boolean;
  onClose: () => void;
  providerId: string;
  categoryId?: string;
}

export function JobFlowModal({ opened, onClose, providerId, categoryId = 'cat-001' }: JobFlowModalProps) {
  const [step, setStep] = useState<FlowStep>('agreement');
  const [estimatedPrice, setEstimatedPrice] = useState<number>(100);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { createJob, updateJobStatus } = useJobStore();
  const { currentUser, clientProfile } = useAuthStore();
  const provider = MOCK_PROVIDER_PROFILES.find(p => p.userId === providerId);
  const providerUser = MOCK_USERS.find(u => u.id === providerId);
  const category = MOCK_CATEGORIES.find(c => c.id === categoryId);
  const walletBalance = clientProfile?.walletBalance ?? 0;
  const commissionRate = 10;
  const commissionAmount = (estimatedPrice * commissionRate) / 100;
  const providerEarning = estimatedPrice - commissionAmount;
  const cashback = estimatedPrice * 0.05;

  const stepIndex: Record<FlowStep, number> = {
    agreement: 0,
    payment: 1,
    active: 2,
    in_progress: 3,
    completed: 4,
  };

  const handleConfirmAgreement = () => {
    if (!currentUser) return;
    const job = createJob({
      clientId: currentUser.id,
      providerId,
      categoryId,
      subcategoryId: provider?.subcategoryId ?? 'sub-001',
      status: 'pending_agreement',
      estimatedPrice,
      commissionRate,
      isRepeatBooking: false,
      clientLocation: { lat: 40.7128, lng: -74.006, address: '123 Main St, New York, NY' },
    });
    setActiveJobId(job.id);
    setStep('payment');
  };

  const handlePayment = () => {
    if (!activeJobId) return;
    updateJobStatus(activeJobId, 'active');

    // Deduct from wallet (mock)
    const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, []);
    const newTxn: WalletTransaction = {
      id: `txn-${Date.now()}`,
      userId: currentUser!.id,
      type: 'payment',
      amount: -estimatedPrice,
      balance: walletBalance - estimatedPrice,
      description: `Payment for ${category?.name ?? 'Service'} – secured in escrow`,
      jobId: activeJobId,
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.walletTransactions, [newTxn, ...txns]);

    notifications.show({
      title: '💳 Payment Secured!',
      message: `${formatCurrency(estimatedPrice)} is held safely in escrow.`,
      color: 'teal',
    });
    setStep('active');
  };

  const handleProviderStarted = () => {
    if (!activeJobId) return;
    updateJobStatus(activeJobId, 'in_progress', { startedAt: new Date().toISOString() });
    setStep('in_progress');
  };

  const handleConfirmCompletion = () => {
    if (!activeJobId) return;
    updateJobStatus(activeJobId, 'completed', {
      completedAt: new Date().toISOString(),
      finalPrice: estimatedPrice,
      commissionAmount,
      netProviderEarning: providerEarning,
      cashbackAmount: cashback,
    });

    // Add cashback transaction
    const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, []);
    const cashbackTxn: WalletTransaction = {
      id: `txn-cb-${Date.now()}`,
      userId: currentUser!.id,
      type: 'cashback',
      amount: cashback,
      balance: walletBalance - estimatedPrice + cashback,
      description: `5% cashback reward for ${category?.name ?? 'Service'}`,
      jobId: activeJobId,
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.walletTransactions, [cashbackTxn, ...txns]);

    notifications.show({
      title: '🎉 Job Completed!',
      message: `Payment released. You earned ${formatCurrency(cashback)} cashback!`,
      color: 'green',
    });
    setStep('completed');
  };

  const handleClose = () => {
    setStep('agreement');
    setEstimatedPrice(100);
    setActiveJobId(null);
    onClose();
  };

  const StepAgreement = () => (
    <Stack gap="md">
      <Group gap="md">
        <Avatar src={provider?.selfieUrl} size={56} radius="xl">{provider?.fullName[0]}</Avatar>
        <Box>
          <Text fw={700}>{provider?.fullName}</Text>
          <Text size="sm" c="dimmed">{category?.name}</Text>
          <Group gap={4} mt={2}>
            <IconShieldCheck size={12} color={COLORS.tealBlue} />
            <Text size="xs" c="teal.6">Verified Provider</Text>
          </Group>
        </Box>
      </Group>
      <Divider />
      <Stack gap="xs">
        <Text size="sm" fw={600}>Confirm Service Price</Text>
        <NumberInput
          label="Estimated Price (USD)"
          value={estimatedPrice}
          onChange={(v) => setEstimatedPrice(Number(v))}
          min={10}
          max={10000}
          prefix="$"
          step={10}
        />
        <Alert color="blue" radius="md" icon={<IconShieldCheck size={14} />}>
          <Text size="xs">Payment will be held in escrow and only released when you confirm the job is complete.</Text>
        </Alert>
        <Box p="sm" style={{ background: '#F8F9FA', borderRadius: 10 }}>
          <Group justify="space-between">
            <Text size="sm">Service Price</Text>
            <Text size="sm" fw={600}>{formatCurrency(estimatedPrice)}</Text>
          </Group>
          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">Platform Fee (10%)</Text>
            <Text size="xs" c="dimmed">-{formatCurrency(commissionAmount)}</Text>
          </Group>
          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">Provider Receives</Text>
            <Text size="xs" c="teal.6" fw={600}>{formatCurrency(providerEarning)}</Text>
          </Group>
          <Divider my="xs" />
          <Group justify="space-between">
            <Text size="sm" fw={700}>You Pay</Text>
            <Text size="md" fw={800} c="navy.7">{formatCurrency(estimatedPrice)}</Text>
          </Group>
        </Box>
      </Stack>
      <Button fullWidth size="md" onClick={handleConfirmAgreement} style={{ background: COLORS.navyBlue }}>
        Confirm Agreement
      </Button>
    </Stack>
  );

  const StepPayment = () => (
    <Stack gap="md">
      <Alert color="green" icon={<IconCheck size={14} />}>
        Agreement confirmed! Now secure your payment in escrow.
      </Alert>
      <Box p="md" style={{ background: '#F8F9FA', borderRadius: 12, border: `2px solid ${COLORS.tealBlue}` }}>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconWallet size={18} color={COLORS.navyBlue} />
            <Text fw={700}>Wallet Balance</Text>
          </Group>
          <Text fw={800} size="lg" c={walletBalance >= estimatedPrice ? 'green' : 'red'}>
            {formatCurrency(walletBalance)}
          </Text>
        </Group>
        {walletBalance < estimatedPrice ? (
          <Alert color="red" icon={<IconAlertCircle size={14} />} mb="md">
            Insufficient balance. Please add {formatCurrency(estimatedPrice - walletBalance)} to your wallet.
          </Alert>
        ) : (
          <Alert color="green" icon={<IconCheck size={14} />} mb="md">
            Sufficient balance to complete this payment.
          </Alert>
        )}
        <Group justify="space-between">
          <Text size="sm" fw={600}>Amount to Secure in Escrow</Text>
          <Text fw={700} c="navy.7">{formatCurrency(estimatedPrice)}</Text>
        </Group>
      </Box>
      <Button
        fullWidth size="md"
        leftSection={<IconShieldCheck size={16} />}
        onClick={handlePayment}
        disabled={walletBalance < estimatedPrice}
        style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.tealDark} 100%)` }}
      >
        Pay & Secure in Escrow
      </Button>
      <Button variant="subtle" size="sm" leftSection={<IconCreditCard size={14} />} color="gray">
        Add Payment Method (Card)
      </Button>
    </Stack>
  );

  const StepActive = () => (
    <Stack gap="md" align="center">
      <ThemeIcon size={64} radius="xl" color="teal" variant="light">
        <IconTruck size={32} />
      </ThemeIcon>
      <Text fw={700} size="lg" ta="center">Provider is On the Way!</Text>
      <Text c="dimmed" size="sm" ta="center">
        {provider?.fullName} has been notified and is heading to your location.
      </Text>
      <Box w="100%" p="md" style={{ background: '#F8F9FA', borderRadius: 12 }}>
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="dimmed">Estimated Arrival</Text>
          <Badge color="teal">~15 min</Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Job Status</Text>
          <Badge color="blue">Active</Badge>
        </Group>
      </Box>
      <Alert color="blue" w="100%">
        <Text size="xs">Simulate provider tapping "Start Work" below to advance the flow.</Text>
      </Alert>
      <Button fullWidth leftSection={<IconPlayerPlay size={16} />} onClick={handleProviderStarted} color="teal">
        [Simulate] Provider Starts Work
      </Button>
    </Stack>
  );

  const StepInProgress = () => (
    <Stack gap="md" align="center">
      <ThemeIcon size={64} radius="xl" color="navy" variant="light">
        <IconBriefcase size={32} />
      </ThemeIcon>
      <Text fw={700} size="lg" ta="center">Work In Progress</Text>
      <Text c="dimmed" size="sm" ta="center">
        {provider?.fullName} is currently working on your service. Live tracking is active.
      </Text>
      <Box w="100%" p="md" style={{ background: '#F8F9FA', borderRadius: 12 }}>
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="dimmed">Job Status</Text>
          <Badge color="teal">In Progress</Badge>
        </Group>
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="dimmed">Payment in Escrow</Text>
          <Text fw={600}>{formatCurrency(estimatedPrice)}</Text>
        </Group>
        <Progress value={60} color="teal" radius="xl" mt="sm" />
        <Text size="xs" c="dimmed" mt={4} ta="center">Job approximately 60% complete</Text>
      </Box>
      <Button fullWidth size="md" leftSection={<IconFlagCheck size={16} />} onClick={handleConfirmCompletion}
        style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)` }}>
        Confirm Job Completed
      </Button>
    </Stack>
  );

  const StepCompleted = () => (
    <Stack gap="md" align="center">
      <ThemeIcon size={80} radius="xl" color="green" variant="filled">
        <IconCheck size={40} />
      </ThemeIcon>
      <Text fw={800} size="xl" ta="center">Job Completed!</Text>
      <Box w="100%" p="md" style={{ background: '#F8F9FA', borderRadius: 12 }}>
        <Group justify="space-between" mb="xs">
          <Text size="sm">Service Amount</Text>
          <Text fw={600}>{formatCurrency(estimatedPrice)}</Text>
        </Group>
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="dimmed">Platform Commission (10%)</Text>
          <Text c="dimmed">-{formatCurrency(commissionAmount)}</Text>
        </Group>
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="teal.6">Provider Received</Text>
          <Text c="teal.6" fw={700}>{formatCurrency(providerEarning)}</Text>
        </Group>
        <Divider my="xs" />
        <Group justify="space-between">
          <Group gap={4}>
            <IconStar size={14} fill="#F5E642" color="#F5E642" />
            <Text size="sm" c="orange.6" fw={700}>Cashback Earned!</Text>
          </Group>
          <Text fw={800} c="orange.6">+{formatCurrency(cashback)}</Text>
        </Group>
      </Box>
      <Stack gap="xs" w="100%">
        <Text size="sm" fw={600}>Rate your experience</Text>
        <Group gap="xs" justify="center">
          {[1,2,3,4,5].map(r => (
            <ActionIcon key={r} variant="subtle" onClick={() => setReviewRating(r)} size="lg">
              <IconStar size={24} fill={r <= reviewRating ? '#F5E642' : 'none'} color={r <= reviewRating ? '#F5E642' : '#DEE2E6'} />
            </ActionIcon>
          ))}
        </Group>
        <Button fullWidth size="md" onClick={handleClose} style={{ background: COLORS.navyBlue }}>
          Done
        </Button>
      </Stack>
    </Stack>
  );

  const steps: Record<FlowStep, React.ReactNode> = {
    agreement: <StepAgreement />,
    payment: <StepPayment />,
    active: <StepActive />,
    in_progress: <StepInProgress />,
    completed: <StepCompleted />,
  };

  const titles: Record<FlowStep, string> = {
    agreement: 'Confirm Job Agreement',
    payment: 'Secure Payment in Escrow',
    active: 'Provider En Route',
    in_progress: 'Work In Progress',
    completed: 'Job Complete 🎉',
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconBriefcase size={18} color={COLORS.navyBlue} />
          <Text fw={700}>{titles[step]}</Text>
        </Group>
      }
      centered
      size="md"
      radius="lg"
    >
      <Stepper
        active={stepIndex[step]}
        size="xs"
        mb="lg"
        color="teal"
        styles={{ step: { padding: '0 4px' }, stepLabel: { display: 'none' } }}
      >
        {['Agreement', 'Payment', 'Active', 'In Progress', 'Done'].map(label => (
          <Stepper.Step key={label} />
        ))}
      </Stepper>
      {steps[step]}
    </Modal>
  );
}

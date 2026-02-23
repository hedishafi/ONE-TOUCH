import { Card, Group, Text, Badge, Stack, Button, Avatar, Box, Divider } from '@mantine/core';
import { IconMapPin, IconPlayerPlay, IconFlagCheck } from '@tabler/icons-react';
import { StatusBadge } from './StatusBadge';
import { MOCK_PROVIDER_PROFILES, MOCK_CLIENT_PROFILES } from '../mock/mockUsers';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import { formatCurrency, formatShortDate } from '../utils/formatting';
import { COLORS } from '../utils/constants';
import type { Job } from '../types';

interface JobCardProps {
  job: Job;
  viewAs: 'client' | 'provider';
  onStartWork?: (jobId: string) => void;
  onCompleteWork?: (jobId: string) => void;
}

export function JobCard({ job, viewAs, onStartWork, onCompleteWork }: JobCardProps) {
  const provider = MOCK_PROVIDER_PROFILES.find(p => p.userId === job.providerId);
  const client = MOCK_CLIENT_PROFILES.find(c => c.userId === job.clientId);
  const category = MOCK_CATEGORIES.find(c => c.id === job.categoryId);

  const otherPartyName = viewAs === 'client' ? (provider?.fullName ?? 'Provider') : (client?.fullName ?? 'Client');
  const otherPartyAvatar = viewAs === 'client' ? provider?.selfieUrl : undefined;

  return (
    <Card shadow="sm" radius="lg" withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Group gap="sm">
          <Avatar src={otherPartyAvatar} size={40} radius="xl" color="navy">
            {otherPartyName[0]}
          </Avatar>
          <Box>
            <Text fw={700} size="sm">{otherPartyName}</Text>
            <Text size="xs" c="dimmed">{category?.name}</Text>
          </Box>
        </Group>
        <StatusBadge status={job.status} />
      </Group>

      <Divider mb="sm" />

      <Stack gap={6}>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">Estimated Price</Text>
          <Text size="sm" fw={700} c="navy.7">{formatCurrency(job.estimatedPrice)}</Text>
        </Group>

        {job.finalPrice && (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Final Price</Text>
            <Text size="sm" fw={700} c="teal.6">{formatCurrency(job.finalPrice)}</Text>
          </Group>
        )}

        {job.commissionAmount && (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Platform Fee ({job.commissionRate}%)</Text>
            <Text size="xs" c="dimmed">-{formatCurrency(job.commissionAmount)}</Text>
          </Group>
        )}

        {job.netProviderEarning && viewAs === 'provider' && (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">You Earned</Text>
            <Text size="sm" fw={700} c="green">{formatCurrency(job.netProviderEarning)}</Text>
          </Group>
        )}

        {job.cashbackAmount && viewAs === 'client' && (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Cashback Earned</Text>
            <Text size="xs" fw={600} c="orange.6">+{formatCurrency(job.cashbackAmount)}</Text>
          </Group>
        )}

        <Group gap={4} mt={4}>
          <IconMapPin size={12} color={COLORS.tealBlue} />
          <Text size="xs" c="dimmed">{job.clientLocation.address}</Text>
        </Group>

        <Text size="xs" c="dimmed">Created: {formatShortDate(job.createdAt)}</Text>
        {job.isRepeatBooking && (
          <Badge size="xs" color="orange" variant="light">Repeat Booking</Badge>
        )}
      </Stack>

      {/* Provider action buttons */}
      {viewAs === 'provider' && (
        <Group mt="md" gap="sm">
          {job.status === 'active' && onStartWork && (
            <Button
              fullWidth
              size="sm"
              leftSection={<IconPlayerPlay size={14} />}
              color="teal"
              onClick={() => onStartWork(job.id)}
            >
              Start Work
            </Button>
          )}
          {job.status === 'in_progress' && onCompleteWork && (
            <Button
              fullWidth
              size="sm"
              leftSection={<IconFlagCheck size={14} />}
              style={{ background: COLORS.navyBlue }}
              onClick={() => onCompleteWork(job.id)}
            >
              Complete Work
            </Button>
          )}
        </Group>
      )}
    </Card>
  );
}

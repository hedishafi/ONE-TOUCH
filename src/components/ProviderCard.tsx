import {
  Card, Group, Avatar, Text, Badge, Button, Stack,
  Box, ActionIcon, Tooltip,
} from '@mantine/core';
import {
  IconPhone, IconHeart, IconHeartFilled, IconMapPin,
  IconShieldCheck, IconClock, IconCalendarPlus,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { RatingStars } from './RatingStars';
import { COLORS, PROVIDER_TIER_COLORS } from '../utils/constants';
import { formatPricingModel, formatDistance, formatProviderTier } from '../utils/formatting';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import type { ProviderProfile } from '../types';

interface ProviderCardProps {
  provider: ProviderProfile;
  distance: number;
  isSaved: boolean;
  onCall: (provider: ProviderProfile) => void;
  onBook: (provider: ProviderProfile) => void;
  onToggleSave: (userId: string) => void;
}

export function ProviderCard({
  provider,
  distance,
  isSaved,
  onCall,
  onBook,
  onToggleSave,
}: ProviderCardProps) {
  const { t } = useTranslation();

  const tierColor = PROVIDER_TIER_COLORS[provider.loyaltyTier as keyof typeof PROVIDER_TIER_COLORS] ?? COLORS.tealBlue;
  const tierLabel = formatProviderTier(provider.loyaltyTier);

  // Resolve category names from IDs
  const firstCatId = provider.categoryId;
  const cat = MOCK_CATEGORIES.find(c => c.id === firstCatId);
  const catName = cat?.name ?? 'General';

  return (
    <Card
      shadow="sm"
      radius="lg"
      withBorder
      style={{
        borderColor: provider.isOnline ? `${COLORS.tealBlue}30` : '#E9ECEF',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(27,42,74,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <Group align="flex-start" gap="md">
        {/* Avatar with online indicator */}
        <Box style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar
            src={provider.selfieUrl}
            size={64}
            radius="xl"
            style={{ border: `2px solid ${provider.isOnline ? COLORS.tealBlue : '#DEE2E6'}` }}
          >
            {provider.fullName?.[0] ?? 'P'}
          </Avatar>
          <Box
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: provider.isOnline ? '#2ECC71' : '#ADB5BD',
              border: '2px solid white',
            }}
          />
        </Box>

        {/* Info */}
        <Stack gap={4} flex={1} style={{ minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" truncate>{provider.fullName}</Text>
              <Tooltip label={`${tierLabel} Provider`} withArrow>
                <Box style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, flexShrink: 0 }} />
              </Tooltip>
            </Group>
            <ActionIcon
              variant="subtle"
              color={isSaved ? 'red' : 'gray'}
              size="sm"
              onClick={() => onToggleSave(provider.userId)}
              style={{ flexShrink: 0 }}
            >
              {isSaved ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
            </ActionIcon>
          </Group>

          <Text size="xs" c="dimmed">{catName}</Text>

          <Group gap="xs">
            <RatingStars rating={provider.rating} size={12} />
            <Text size="xs" c="dimmed">({provider.totalJobsCompleted})</Text>
          </Group>

          <Group gap="md" mt={2}>
            <Group gap={4}>
              <IconMapPin size={12} color={COLORS.tealBlue} />
              <Text size="xs" c="dimmed">{formatDistance(distance)}</Text>
            </Group>
            <Group gap={4}>
              <IconClock size={12} color={COLORS.tealBlue} />
              <Text size="xs" c="dimmed">~10 min</Text>
            </Group>
          </Group>

          <Group justify="space-between" mt="xs" align="flex-end">
            <Box>
              <Text size="xs" c="dimmed">Starting from</Text>
              <Text fw={700} size="md" c={COLORS.navyBlue}>
                {formatPricingModel(provider.pricingModel, provider.hourlyRate, provider.fixedRate)}
              </Text>
            </Box>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconCalendarPlus size={12} />}
                onClick={() => onBook(provider)}
                disabled={!provider.isOnline}
              >
                Book
              </Button>
              <Button
                size="xs"
                leftSection={<IconPhone size={12} />}
                style={{ background: provider.isOnline ? `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.tealDark} 100%)` : undefined }}
                onClick={() => onCall(provider)}
                disabled={!provider.isOnline}
              >
                {t('client.call_free')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Group>

      {/* Footer */}
      <Box mt="xs" pt="xs" style={{ borderTop: '1px solid #F1F3F5' }}>
        <Group gap={4} justify="space-between">
          <Group gap={4}>
            <IconShieldCheck size={12} color={COLORS.tealBlue} />
            <Text size="xs" c="teal.6" fw={500}>Identity Verified</Text>
          </Group>
          <Badge size="xs" color={provider.isOnline ? 'teal' : 'gray'} variant="light">
            {provider.isOnline ? 'Online' : 'Offline'}
          </Badge>
        </Group>
      </Box>
    </Card>
  );
}

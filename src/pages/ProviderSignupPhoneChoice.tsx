import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Radio,
  TextInput,
  Alert,
  Card,
} from '@mantine/core';
import { IconAlertCircle, IconPhone, IconCheck } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import * as providerService from '../services/providerOnboardingService';

interface LocationState {
  sessionId: string;
  extractedPhone: string;
  extractedData: any;
}

export const ProviderSignupPhoneChoice: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [phoneOption, setPhoneOption] = useState<'extracted' | 'custom'>('extracted');
  const [customPhone, setCustomPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = state.sessionId || '';
  const extractedPhone = state.extractedPhone || '';

  if (!sessionId || !extractedPhone) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} color="red" title={t('providerPhoneChoice.session_error_title')}>
          {t('providerPhoneChoice.session_error_msg')}
        </Alert>
        <Button mt="xl" onClick={() => navigate('/provider/onboarding/step1')}>
          {t('providerPhoneChoice.start_over')}
        </Button>
      </Container>
    );
  }

  const validatePhone = (phone: string): boolean => {
    // Ethiopian phone format: +251XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+251|0)\d{9}$/;
    return phoneRegex.test(phone.trim());
  };

  const handleContinue = async () => {
    try {
      let phoneToUse = extractedPhone;

      if (phoneOption === 'custom') {
        if (!customPhone.trim()) {
          setError(t('providerPhoneChoice.err_empty_phone'));
          return;
        }

        if (!validatePhone(customPhone)) {
          setError(t('providerPhoneChoice.err_invalid_phone'));
          return;
        }

        phoneToUse = customPhone.trim();
      }

      setLoading(true);
      setError(null);

      // Request OTP to selected phone
      await providerService.providerOTPRequest({
        session_id: sessionId,
        phone: phoneToUse,
      });

      notifications.show({
        title: t('providerPhoneChoice.otp_sent_title'),
        message: t('providerPhoneChoice.otp_sent_msg', { phone: phoneToUse }),
        color: 'green',
      });

      // Navigate to OTP verification screen
      navigate('/provider/onboarding/step3/verify-otp', {
        state: {
          sessionId,
          phone: phoneToUse,
        },
      });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        t('providerPhoneChoice.err_send_otp');
      setError(message);
      notifications.show({
        title: t('providerPhoneChoice.err_title'),
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} mb="sm">
            {t('providerPhoneChoice.title')}
          </Title>
          <Text color="dimmed">
            {t('providerPhoneChoice.sub')}
          </Text>
        </div>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Radio.Group value={phoneOption} onChange={(val: any) => setPhoneOption(val)}>
          <Stack gap="lg">
            {/* Option 1: Use Extracted Phone */}
            <Card
              p="lg"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                backgroundColor: phoneOption === 'extracted' ? '#f0f9ff' : undefined,
                borderColor: phoneOption === 'extracted' ? '#008080' : undefined,
              }}
              onClick={() => setPhoneOption('extracted')}
            >
              <Group gap="md">
                <Radio value="extracted" />
                <Stack gap="xs" flex={1}>
                  <Group justify="space-between">
                    <Text fw={500}>{t('providerPhoneChoice.use_extracted_label')}</Text>
                    <IconCheck size={20} color="#008080" />
                  </Group>
                  <Text size="sm" color="dimmed">
                    {t('providerPhoneChoice.use_extracted_sub')}
                  </Text>
                  <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#f5f5f5' }}>
                    <Group gap="xs">
                      <IconPhone size={18} />
                      <Text fw={500} size="lg">
                        {extractedPhone}
                      </Text>
                    </Group>
                  </Paper>
                </Stack>
              </Group>
            </Card>

            {/* Option 2: Enter Custom Phone */}
            <Card
              p="lg"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                backgroundColor: phoneOption === 'custom' ? '#f0f9ff' : undefined,
                borderColor: phoneOption === 'custom' ? '#008080' : undefined,
              }}
              onClick={() => setPhoneOption('custom')}
            >
              <Group gap="md">
                <Radio value="custom" />
                <Stack gap="xs" flex={1}>
                  <Text fw={500}>{t('providerPhoneChoice.use_custom_label')}</Text>
                  <Text size="sm" color="dimmed">
                    {t('providerPhoneChoice.use_custom_sub')}
                  </Text>
                  {phoneOption === 'custom' && (
                    <TextInput
                      placeholder={t('providerPhoneChoice.custom_phone_placeholder')}
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.currentTarget.value)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={loading}
                      leftSection={<IconPhone size={16} />}
                    />
                  )}
                </Stack>
              </Group>
            </Card>
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            onClick={() => navigate('/provider/onboarding/step1')}
            disabled={loading}
          >
            {t('providerPhoneChoice.back_btn')}
          </Button>
          <Button onClick={handleContinue} disabled={loading} loading={loading}>
            {loading ? t('providerPhoneChoice.sending_btn') : t('providerPhoneChoice.continue_btn')}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};

export default ProviderSignupPhoneChoice;

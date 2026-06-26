import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  FileButton,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconInfoCircle, IconUpload, IconUserCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { setupProviderProfile } from '../services/providerProfileService';
import { useServiceCatalog } from '../hooks/useServiceCatalog';

export default function ProviderProfileSetup() {
  const MIN_PRICE_RATIO = 0.5;
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [subServiceIds, setSubServiceIds] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const { categories, loading: catalogLoading, error: catalogError, localName } = useServiceCatalog();

  const previewUrl = useMemo(
    () => (profilePicture ? URL.createObjectURL(profilePicture) : null),
    [profilePicture],
  );
  const calculatedPriceMin = useMemo(
    () => (priceMax === '' ? '' : Math.round(Number(priceMax) * MIN_PRICE_RATIO)),
    [priceMax],
  );

  const selectedCategory = categories.find((category) => category.id === serviceCategoryId);
  const subServiceOptions =
    selectedCategory?.subcategories?.map((sub) => ({
      value: sub.id,
      label: localName(sub),
    })) ?? [];

  const validateForm = () => {
    if (!fullName.trim()) return t('providerProfileSetup.err_full_name');
    if (!serviceCategoryId) return t('providerProfileSetup.err_category');
    if (!subServiceIds.length) return t('providerProfileSetup.err_sub_service');
    if (priceMax === '') return t('providerProfileSetup.err_price_max_required');
    if (Number(priceMax) <= 0) return t('providerProfileSetup.err_price_max_zero');
    const min = Number(calculatedPriceMin);
    const max = Number(priceMax);
    if (min > max) return t('providerProfileSetup.err_price_min_exceeds');
    return null;
  };

  const handleSubmit = async () => {
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const categoryName = selectedCategory?.name ?? '';
      const subServiceNames = (selectedCategory?.subcategories ?? [])
        .filter((sub) => subServiceIds.includes(sub.id))
        .map((sub) => sub.name);

      await setupProviderProfile({
        full_name: fullName.trim(),
        service_category: categoryName,
        sub_services: subServiceNames,
        price_min: Number(calculatedPriceMin),
        price_max: Number(priceMax),
        bio: bio.trim(),
        profile_picture: profilePicture,
      });

      notifications.show({
        title: t('providerProfileSetup.saved_title'),
        message: t('providerProfileSetup.saved_msg'),
        color: 'green',
      });

      navigate('/provider/onboarding/step1');
    } catch (err: any) {
      const detail = err?.response?.data;
      const fallback = t('providerProfileSetup.err_save_fallback');
      const message =
        detail?.detail ||
        detail?.message ||
        detail?.full_name?.[0] ||
        detail?.service_category?.[0] ||
        detail?.sub_services?.[0] ||
        detail?.price_max?.[0] ||
        fallback;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group gap={12} align="flex-start">
            <Box
              w={44}
              h={44}
              style={{
                borderRadius: 12,
                background: 'rgba(0, 128, 128, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconUserCheck size={24} color="#008080" />
            </Box>
            <Stack gap={2}>
              <Title order={3}>{t('providerProfileSetup.title')}</Title>
              <Text size="sm" c="dimmed">{t('providerProfileSetup.subtitle')}</Text>
            </Stack>
          </Group>

          {/* Errors */}
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          {catalogError && (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              {catalogError}
            </Alert>
          )}

          {/* Profile picture */}
          <Group align="flex-start" gap="md">
            <Avatar src={previewUrl} size={72} radius="xl">
              {fullName ? fullName[0] : 'P'}
            </Avatar>
            <Stack gap={6}>
              <FileButton accept="image/*" onChange={setProfilePicture}>
                {(props) => (
                  <Button {...props} variant="light" leftSection={<IconUpload size={16} />}>
                    {profilePicture
                      ? t('providerProfileSetup.change_photo')
                      : t('providerProfileSetup.upload_photo')}
                  </Button>
                )}
              </FileButton>
              <Text size="xs" c="dimmed">{t('providerProfileSetup.photo_hint')}</Text>
            </Stack>
          </Group>

          {/* Full name */}
          <TextInput
            label={t('providerProfileSetup.full_name_label')}
            value={fullName}
            onChange={(event) => setFullName(event.currentTarget.value)}
            required
          />

          {/* Service category */}
          <Select
            label={t('providerProfileSetup.category_label')}
            placeholder={
              catalogLoading
                ? t('providerProfileSetup.category_loading')
                : t('providerProfileSetup.category_placeholder')
            }
            data={categories.map((category) => ({ value: category.id, label: localName(category) }))}
            value={serviceCategoryId}
            onChange={(value) => {
              setServiceCategoryId(value ?? '');
              setSubServiceIds([]);
            }}
            searchable
            required
          />

          {/* Sub services */}
          <MultiSelect
            label={t('providerProfileSetup.sub_services_label')}
            placeholder={
              serviceCategoryId
                ? t('providerProfileSetup.sub_services_placeholder')
                : t('providerProfileSetup.sub_services_placeholder_no_category')
            }
            data={subServiceOptions}
            value={subServiceIds}
            onChange={setSubServiceIds}
            searchable
            required
            disabled={!serviceCategoryId}
          />

          {/* Price range */}
          <Group grow>
            <Box>
              <Group gap={6} mb={4}>
                <Text size="sm" fw={500}>{t('providerProfileSetup.price_min_label')}</Text>
                <Tooltip
                  multiline
                  w={280}
                  withArrow
                  label={t('providerProfileSetup.price_min_tooltip')}
                >
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={t('providerProfileSetup.price_min_aria')}
                  >
                    <IconInfoCircle size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <NumberInput value={calculatedPriceMin} min={0} readOnly disabled required />
            </Box>
            <NumberInput
              label={t('providerProfileSetup.price_max_label')}
              value={priceMax}
              onChange={(value) => setPriceMax(value === '' ? '' : Number(value))}
              min={0}
              required
            />
          </Group>

          {/* Bio */}
          <Textarea
            label={t('providerProfileSetup.bio_label')}
            value={bio}
            onChange={(event) => setBio(event.currentTarget.value)}
            minRows={3}
            placeholder={t('providerProfileSetup.bio_placeholder')}
          />

          {/* Submit */}
          <Group justify="flex-end">
            <Button onClick={handleSubmit} loading={loading}>
              {t('providerProfileSetup.submit_btn')}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}

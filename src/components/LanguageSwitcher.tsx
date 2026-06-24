import { Button, Group, Text, Popover, Stack, Box } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';

// Only the two supported languages — English and Amharic
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [opened, setOpened] = useState(false);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    storage.set(STORAGE_KEYS.language, code);
    document.documentElement.dir = 'ltr'; // both en and am are LTR
    setOpened(false);
  };

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <Popover
      position="bottom-end"
      withArrow
      shadow="md"
      radius="12"
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setOpened(!opened)}
          aria-label="Select language"
          style={{
            color: '#000080',
            fontWeight: 700,
            fontSize: 13,
            padding: '6px 10px',
            height: 'auto',
            transition: 'all 0.2s ease',
            backgroundColor: opened ? 'rgba(0,128,128,0.1)' : 'transparent',
            border: `1px solid ${opened ? 'rgba(0,128,128,0.3)' : 'transparent'}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Text size="sm" style={{ lineHeight: 1 }}>{current.flag}</Text>
          <Text size="xs" fw={700} style={{ letterSpacing: '0.3px' }}>
            {current.label}
          </Text>
          <Text size="10px" style={{ opacity: 0.5, marginLeft: 2 }}>▼</Text>
        </Button>
      </Popover.Target>

      <Popover.Dropdown p="xs" style={{ minWidth: 148 }}>
        <Stack gap={4}>
          {LANGUAGES.map((lang) => {
            const isActive = i18n.language === lang.code;
            return (
              <Box
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                role="button"
                aria-pressed={isActive}
                style={{
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  transition: 'background 0.15s ease',
                  backgroundColor: isActive ? 'rgba(0,128,128,0.12)' : 'transparent',
                  border: `1px solid ${isActive ? '#008080' : 'rgba(0,0,137,0.08)'}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'rgba(0,128,128,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <Group justify="space-between" gap="sm" wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <Text size="md" style={{ lineHeight: 1 }}>{lang.flag}</Text>
                    <Text size="sm" fw={600} c={isActive ? '#008080' : '#000080'}>
                      {lang.label}
                    </Text>
                  </Group>
                  {isActive && <IconCheck size={14} color="#008080" />}
                </Group>
              </Box>
            );
          })}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

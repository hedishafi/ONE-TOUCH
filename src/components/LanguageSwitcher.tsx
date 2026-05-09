import { Button, Group, Text, Popover, Stack, Box } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [opened, setOpened] = useState(false);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    storage.set(STORAGE_KEYS.language, code);
    setOpened(false);
  };

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <Popover position="bottom-end" withArrow shadow="md" radius="12" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setOpened(!opened)}
          style={{
            color: 'var(--ot-text-navy)',
            fontWeight: 700,
            fontSize: 13,
            padding: '6px 12px',
            height: 'auto',
            letterSpacing: '0.3px',
            transition: 'all 0.2s ease',
            backgroundColor: opened ? 'rgba(0,128,128,0.1)' : 'transparent',
            border: `1px solid ${opened ? 'rgba(0,128,128,0.3)' : 'transparent'}`,
            borderRadius: 8,
          }}
        >
          {current.label}
        </Button>
      </Popover.Target>

      <Popover.Dropdown p="xs" style={{ minWidth: 130 }}>
        <Stack gap={4}>
          {LANGUAGES.map(lang => (
            <Box
              key={lang.code}
              px={12} py={8}
              style={{
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                background: i18n.language === lang.code
                  ? 'rgba(0,128,128,0.12)'
                  : 'transparent',
                border: `1px solid ${i18n.language === lang.code ? '#008080' : 'transparent'}`,
              }}
              onClick={() => handleChange(lang.code)}
              onMouseEnter={e => {
                if (i18n.language !== lang.code)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,128,128,0.07)';
              }}
              onMouseLeave={e => {
                if (i18n.language !== lang.code)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Group justify="space-between" gap="sm">
                <Text size="sm" fw={600}
                  c={i18n.language === lang.code ? '#008080' : 'var(--ot-text-navy)'}>
                  {lang.label}
                </Text>
                {i18n.language === lang.code && (
                  <IconCheck size={14} color="#008080" />
                )}
              </Group>
            </Box>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

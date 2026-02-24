import { Button, Group, Text, Popover, Stack, Box } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { SUPPORTED_LANGUAGES } from '../utils/constants';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [opened, setOpened] = useState(false);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    storage.set(STORAGE_KEYS.language, code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    setOpened(false);
  };

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];
  
  // Map codes to short forms and flags
  const shortCodeMap: Record<string, string> = {
    'en': 'EN',
    'am': 'AM',
    'om': 'OR',
  };

  return (
    <Popover position="bottom-end" withArrow shadow="md" radius="12" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setOpened(!opened)}
          style={{
            color: '#000080',
            fontWeight: 700,
            fontSize: 13,
            padding: '6px 12px',
            height: 'auto',
            letterSpacing: '0.5px',
            transition: 'all 0.2s ease',
            backgroundColor: opened ? 'rgba(0, 128, 128, 0.1)' : 'transparent',
            border: `1px solid ${opened ? 'rgba(0, 128, 128, 0.3)' : 'transparent'}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Text size="sm">{current.flag}</Text>
          <Text size="xs" fw={700} style={{ letterSpacing: '0.3px' }}>
            {shortCodeMap[current.code] || current.code.toUpperCase()}
          </Text>
          <Text size="10px" style={{ opacity: 0.6, marginLeft: '2px' }}>▼</Text>
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="md" style={{ minWidth: '140px' }}>
        <Stack gap="6px">
          {SUPPORTED_LANGUAGES.map(lang => (
            <Box
              key={lang.code}
              p="8px 12px"
              style={{
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: i18n.language === lang.code ? 'rgba(0, 128, 128, 0.15)' : 'transparent',
                border: i18n.language === lang.code ? '1px solid #008080' : '1px solid rgba(0,0,137,0.1)',
              }}
              onClick={() => handleChange(lang.code)}
              onMouseEnter={(e) => {
                if (i18n.language !== lang.code) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 128, 128, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (i18n.language !== lang.code) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <Group justify="space-between" gap="sm">
                <Group gap="8px">
                  <Text size="md">{lang.flag}</Text>
                  <Text size="sm" fw={600} c={i18n.language === lang.code ? '#008080' : '#000080'}>
                    {shortCodeMap[lang.code] || lang.code.toUpperCase()}
                  </Text>
                </Group>
                {i18n.language === lang.code && (
                  <IconCheck size={16} color="#008080" style={{ minWidth: '16px' }} />
                )}
              </Group>
            </Box>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

interface DarkModeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'light' | 'outline' | 'default';
}

export function DarkModeToggle({ size = 'md', variant = 'subtle' }: DarkModeToggleProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} position="bottom" withArrow>
      <ActionIcon
        onClick={toggleColorScheme}
        variant={variant}
        size={size}
        color={isDark ? 'yellow' : 'blue'}
        aria-label="Toggle dark mode"
        style={{ transition: 'all 0.2s ease' }}
      >
        {isDark
          ? <IconSun size={18} stroke={1.8} />
          : <IconMoon size={18} stroke={1.8} />
        }
      </ActionIcon>
    </Tooltip>
  );
}

import { createTheme, type MantineColorsTuple } from '@mantine/core';

const navyBlue: MantineColorsTuple = [
  '#E8EDF5', '#C5D1E8', '#A2B5DB', '#7F99CE', '#5C7DC1',
  '#3961B4', '#2D4D91', '#1A2E5C', '#0F1E38', '#050C1A',
];

const lemonYellow: MantineColorsTuple = [
  '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58',
  '#F5E642', '#F0D800', '#DEC400', '#C8B000', '#A89200',
];

const tealBlue: MantineColorsTuple = [
  '#E0F7FD', '#B2EBF9', '#7FDEF5', '#48CAE4', '#20BCD8',
  '#008080', '#006666', '#004D4D', '#003333', '#001A1A',
];

export const oneTouchTheme = createTheme({
  colors: {
    navy: navyBlue,
    lemon: lemonYellow,
    teal: tealBlue,
  },
  primaryColor: 'teal',
  primaryShade: { light: 5, dark: 7 },

  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontFamilyMonospace: "'Fira Code', monospace",

  defaultRadius: 'md',

  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.08)',
    sm: '0 2px 8px rgba(0, 0, 0, 0.10)',
    md: '0 4px 16px rgba(0, 0, 0, 0.12)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.14)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.16)',
  },

  headings: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontWeight: '700',
  },

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          transition: 'all 0.2s ease',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
      styles: {
        root: {
          border: '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease',
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
        shadow: 'xs',
      },
    },
  },
});

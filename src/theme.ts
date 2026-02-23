import { createTheme, type MantineColorsTuple } from '@mantine/core';

const navyBlue: MantineColorsTuple = [
  '#E8EDF5', '#C5D1E8', '#A2B5DB', '#7F99CE', '#5C7DC1',
  '#3961B4', '#2D4D91', '#213A6E', '#16274B', '#0F1E38',
];

const lemonYellow: MantineColorsTuple = [
  '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58',
  '#F5E642', '#F0D800', '#DEC400', '#C8B000', '#A89200',
];

const tealBlue: MantineColorsTuple = [
  '#E0F7FD', '#B2EBF9', '#7FDEF5', '#48CAE4', '#20BCD8',
  '#00B4D8', '#0096B4', '#007A96', '#005E78', '#00435A',
];

export const oneTouchTheme = createTheme({
  colors: {
    navy: navyBlue,
    lemon: lemonYellow,
    teal: tealBlue,
  },
  primaryColor: 'navy',
  primaryShade: { light: 6, dark: 8 },

  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontFamilyMonospace: "'Fira Code', monospace",

  defaultRadius: 'md',

  shadows: {
    xs: '0 1px 3px rgba(27, 42, 74, 0.08)',
    sm: '0 2px 8px rgba(27, 42, 74, 0.10)',
    md: '0 4px 16px rgba(27, 42, 74, 0.12)',
    lg: '0 8px 32px rgba(27, 42, 74, 0.15)',
    xl: '0 16px 48px rgba(27, 42, 74, 0.18)',
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
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
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

import { createTheme, responsiveFontSizes, Theme, ThemeOptions } from '@mui/material/styles';
import { PaletteOptions } from '@mui/material/styles/createPalette';

// Declare module augmentation for the `sx` prop
declare module '@mui/material/styles' {
  interface TypographyVariantsOptions {
    subtitle3?: React.CSSProperties;
  }

  interface TypographyVariants {
    subtitle3: React.CSSProperties;
  }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    subtitle3: true;
  }
}

// Extend the theme to include custom spacing and breakpoints
declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}

// Create a theme instance.
const themeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: '#3b82f6', // blue-500
      light: '#93c5fd', // blue-300
      dark: '#1d4ed8', // blue-700
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5cf6', // purple-500
      light: '#c4b5fd', // purple-300
      dark: '#6d28d9', // purple-700
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444', // red-500
      light: '#fca5a5', // red-300
      dark: '#b91c1c', // red-700
    },
    warning: {
      main: '#f59e0b', // amber-500
      light: '#fcd34d', // amber-300
      dark: '#b45309', // amber-700
    },
    info: {
      main: '#3b82f6', // blue-500
      light: '#93c5fd', // blue-300
      dark: '#1d4ed8', // blue-700
    },
    success: {
      main: '#10b981', // emerald-500
      light: '#6ee7b7', // emerald-300
      dark: '#047857', // emerald-700
    },
    background: {
      default: '#f9fafb', // gray-50
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937', // gray-800
      secondary: '#6b7280', // gray-500
      disabled: '#9ca3af', // gray-400
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
    subtitle3: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
        },
        sizeSmall: {
          padding: '6px 12px',
        },
        sizeLarge: {
          padding: '10px 20px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f9fafb',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  status: {
    danger: '#e53e3e',
  },
};

const theme = responsiveFontSizes(createTheme(themeOptions));

export default theme;

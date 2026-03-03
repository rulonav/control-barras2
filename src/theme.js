// src/theme.js
import { DefaultTheme } from 'react-native-paper';

// Definir colores personalizados
const colors = {
  primary: '#2196F3',
  secondary: '#4CAF50',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  background: '#f5f5f5',
  surface: '#ffffff',
  error: '#f44336',
  text: '#333333',
  onSurface: '#000000',
  disabled: '#9e9e9e',
  placeholder: '#666666',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

// Definir espaciado
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Definir tipografía
const typography = {
  fontFamily: 'System',
  h1: { fontSize: 24, fontWeight: 'bold' },
  h2: { fontSize: 20, fontWeight: 'bold' },
  h3: { fontSize: 18, fontWeight: 'bold' },
  body1: { fontSize: 16 },
  body2: { fontSize: 14 },
  caption: { fontSize: 12, color: colors.placeholder },
};

// Definir bordes
const borders = {
  radius: {
    small: 4,
    medium: 8,
    large: 12,
  },
  width: {
    thin: 1,
    thick: 2,
  },
};

// Combinar con el tema de react-native-paper
const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
    primary: colors.primary,
    accent: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    disabled: colors.disabled,
    placeholder: colors.placeholder,
    backdrop: colors.backdrop,
    error: colors.error,
  },
  spacing,
  typography,
  borders,
};

export default customTheme;
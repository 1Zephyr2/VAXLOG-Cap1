import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export const lightTheme = {
  mode: 'light' as const,
  colors: {
    primary: '#10b981',
    background: '#f0fdf4',
    card: '#ffffff',
    text: '#065f46',
    textSecondary: '#059669',
    textTertiary: '#10b981',
    border: '#d1fae5',
    borderLight: '#ecfdf5',
    success: '#10b981',
    successLight: '#dcfce7',
    successText: '#15803d',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningText: '#92400e',
    error: '#ef4444',
    errorLight: '#fee2e2',
    primaryLight: '#ecfdf5',
    iconBackground: '#ecfdf5',
    overlay: 'rgba(0, 0, 0, 0.5)',
    statusBar: 'dark-content' as const,
  },
};

export const darkTheme = {
  mode: 'dark' as const,
  colors: {
    primary: '#10b981',
    background: '#064e3b',
    card: '#047857',
    text: '#ecfdf5',
    textSecondary: '#d1fae5',
    textTertiary: '#a7f3d0',
    border: '#059669',
    borderLight: '#10b981',
    success: '#10b981',
    successLight: '#064e3b',
    successText: '#6ee7b7',
    warning: '#fbbf24',
    warningLight: '#78350f',
    warningText: '#fcd34d',
    error: '#f87171',
    errorLight: '#7f1d1d',
    primaryLight: '#047857',
    iconBackground: '#059669',
    overlay: 'rgba(0, 0, 0, 0.7)',
    statusBar: 'light-content' as const,
  },
};

export type Theme = typeof lightTheme | typeof darkTheme;

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  themeMode: 'light' | 'dark' | 'auto';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'auto'>('auto');

  const getTheme = (): Theme => {
    if (themeMode === 'auto') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getTheme();
  const isDark = theme.mode === 'dark';

  const toggleTheme = () => {
    setThemeModeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setThemeMode = (mode: 'light' | 'dark' | 'auto') => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setThemeMode, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

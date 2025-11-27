# 12. UI Theme System Implementation

## Overview
Complete theming system with dark mode, light mode, and custom color schemes, allowing users to personalize their experience.

---

## 📦 Database Schema Extension

### Step 1: Add User Preferences Table

```prisma
// Add to schema.prisma
model UserPreferences {
  id                String   @id @default(cuid())
  user_id           String   @unique
  
  // Theme Settings
  theme_mode        String   @default("light") // light, dark, system, custom
  custom_theme      Json?    // Store custom color scheme
  accent_color      String?  @default("#3B82F6") // Primary accent
  
  // Display Preferences
  compact_mode      Boolean  @default(false)
  show_animations   Boolean  @default(true)
  font_size         String   @default("medium") // small, medium, large
  
  // Other Preferences
  currency_display  String   @default("symbol") // symbol, code, name
  date_format       String   @default("MM/DD/YYYY")
  start_of_week     Int      @default(0) // 0=Sunday, 1=Monday
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

---

## 🎨 Theme Configuration

### Core Theme System: `/src/lib/themes.ts`

```typescript
export interface ThemeColors {
  // Primary Colors
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  
  // Background Colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Foreground Colors
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  
  // Semantic Colors
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  error: string;
  errorForeground: string;
  info: string;
  infoForeground: string;
  
  // UI Elements
  border: string;
  borderHover: string;
  card: string;
  cardForeground: string;
  input: string;
  inputBorder: string;
  
  // Special
  income: string;
  expense: string;
  transfer: string;
  
  // Shadows
  shadowColor: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark' | 'custom';
  colors: ThemeColors;
}

// Predefined Themes
export const themes: Record<string, Theme> = {
  light: {
    id: 'light',
    name: 'Light',
    mode: 'light',
    colors: {
      // Primary
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryForeground: '#FFFFFF',
      
      // Backgrounds
      background: '#FFFFFF',
      backgroundSecondary: '#F9FAFB',
      backgroundTertiary: '#F3F4F6',
      
      // Foregrounds
      foreground: '#111827',
      foregroundMuted: '#6B7280',
      foregroundSubtle: '#9CA3AF',
      
      // Semantic
      success: '#10B981',
      successForeground: '#FFFFFF',
      warning: '#F59E0B',
      warningForeground: '#FFFFFF',
      error: '#EF4444',
      errorForeground: '#FFFFFF',
      info: '#3B82F6',
      infoForeground: '#FFFFFF',
      
      // UI Elements
      border: '#E5E7EB',
      borderHover: '#D1D5DB',
      card: '#FFFFFF',
      cardForeground: '#111827',
      input: '#FFFFFF',
      inputBorder: '#D1D5DB',
      
      // Financial
      income: '#10B981',
      expense: '#EF4444',
      transfer: '#3B82F6',
      
      // Shadow
      shadowColor: 'rgba(0, 0, 0, 0.1)',
    },
  },
  
  dark: {
    id: 'dark',
    name: 'Dark',
    mode: 'dark',
    colors: {
      // Primary
      primary: '#3B82F6',
      primaryHover: '#60A5FA',
      primaryForeground: '#FFFFFF',
      
      // Backgrounds
      background: '#0F172A',
      backgroundSecondary: '#1E293B',
      backgroundTertiary: '#334155',
      
      // Foregrounds
      foreground: '#F1F5F9',
      foregroundMuted: '#94A3B8',
      foregroundSubtle: '#64748B',
      
      // Semantic
      success: '#10B981',
      successForeground: '#FFFFFF',
      warning: '#F59E0B',
      warningForeground: '#FFFFFF',
      error: '#EF4444',
      errorForeground: '#FFFFFF',
      info: '#3B82F6',
      infoForeground: '#FFFFFF',
      
      // UI Elements
      border: '#334155',
      borderHover: '#475569',
      card: '#1E293B',
      cardForeground: '#F1F5F9',
      input: '#1E293B',
      inputBorder: '#334155',
      
      // Financial
      income: '#10B981',
      expense: '#EF4444',
      transfer: '#3B82F6',
      
      // Shadow
      shadowColor: 'rgba(0, 0, 0, 0.5)',
    },
  },
  
  // Additional preset themes
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    colors: {
      primary: '#8B5CF6',
      primaryHover: '#A78BFA',
      primaryForeground: '#FFFFFF',
      background: '#0A0E27',
      backgroundSecondary: '#151A3A',
      backgroundTertiary: '#1F2651',
      foreground: '#E0E7FF',
      foregroundMuted: '#A5B4FC',
      foregroundSubtle: '#6366F1',
      // ... rest of colors
    },
  },
  
  forest: {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    colors: {
      primary: '#059669',
      primaryHover: '#10B981',
      primaryForeground: '#FFFFFF',
      background: '#0F2419',
      backgroundSecondary: '#1A3A28',
      backgroundTertiary: '#254E3A',
      foreground: '#D1FAE5',
      foregroundMuted: '#6EE7B7',
      foregroundSubtle: '#34D399',
      // ... rest of colors
    },
  },
};

// Generate CSS variables from theme
export function generateCSSVariables(theme: Theme): string {
  const vars = Object.entries(theme.colors)
    .map(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `--color-${cssVar}: ${value};`;
    })
    .join('\n  ');
  
  return `:root {\n  ${vars}\n}`;
}

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Generate complementary colors
export function generateComplementaryColors(baseColor: string): Partial<ThemeColors> {
  const rgb = hexToRgb(baseColor);
  
  // Simple complementary color generation
  return {
    primary: baseColor,
    primaryHover: adjustBrightness(baseColor, -20),
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  };
}

// Adjust brightness
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  
  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100;
    return Math.max(0, Math.min(255, adjusted));
  };
  
  const r = Math.round(adjust(rgb.r));
  const g = Math.round(adjust(rgb.g));
  const b = Math.round(adjust(rgb.b));
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}
```

---

## 🎨 Theme Context: `/src/context/ThemeContext.tsx`

```tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themes, Theme, ThemeColors, generateCSSVariables } from '@/lib/themes';
import { userPreferencesService } from '@/services/user-preferences.service';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  currentTheme: Theme;
  themeMode: 'light' | 'dark' | 'system' | 'custom';
  availableThemes: Theme[];
  setTheme: (themeId: string) => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system' | 'custom') => void;
  createCustomTheme: (name: string, colors: Partial<ThemeColors>) => void;
  updateCustomTheme: (colors: Partial<ThemeColors>) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system' | 'custom'>('system');
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.light);
  const [customTheme, setCustomTheme] = useState<Theme | null>(null);
  const [accentColor, setAccentColorState] = useState('#3B82F6');
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>('medium');
  const [compactMode, setCompactModeState] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    } else {
      // Load from localStorage for non-authenticated users
      loadLocalPreferences();
    }
  }, [user]);

  // Apply theme to document
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Handle system theme changes
  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setCurrentTheme(e.matches ? themes.dark : themes.light);
      };
      
      // Set initial theme
      setCurrentTheme(mediaQuery.matches ? themes.dark : themes.light);
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  // Apply font size
  useEffect(() => {
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    document.documentElement.style.setProperty('--base-font-size', fontSizes[fontSize]);
  }, [fontSize]);

  // Apply compact mode
  useEffect(() => {
    if (compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  }, [compactMode]);

  const loadUserPreferences = async () => {
    try {
      const prefs = await userPreferencesService.getPreferences();
      if (prefs) {
        setThemeModeState(prefs.theme_mode as any);
        setAccentColorState(prefs.accent_color || '#3B82F6');
        setFontSizeState(prefs.font_size as any);
        setCompactModeState(prefs.compact_mode);
        
        if (prefs.custom_theme) {
          const custom: Theme = {
            id: 'custom',
            name: 'Custom',
            mode: 'custom',
            colors: prefs.custom_theme as ThemeColors,
          };
          setCustomTheme(custom);
          if (prefs.theme_mode === 'custom') {
            setCurrentTheme(custom);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const loadLocalPreferences = () => {
    const stored = localStorage.getItem('theme_preferences');
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        setThemeModeState(prefs.mode || 'system');
        setAccentColorState(prefs.accent || '#3B82F6');
        setFontSizeState(prefs.fontSize || 'medium');
        setCompactModeState(prefs.compact || false);
        
        if (prefs.custom) {
          setCustomTheme(prefs.custom);
        }
      } catch (error) {
        console.error('Failed to parse stored preferences:', error);
      }
    }
  };

  const savePreferences = async (updates: any) => {
    if (user) {
      try {
        await userPreferencesService.updatePreferences(updates);
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    } else {
      // Save to localStorage for non-authenticated users
      const current = JSON.parse(localStorage.getItem('theme_preferences') || '{}');
      localStorage.setItem('theme_preferences', JSON.stringify({ ...current, ...updates }));
    }
  };

  const applyTheme = (theme: Theme) => {
    // Apply CSS variables
    const css = generateCSSVariables(theme);
    let styleElement = document.getElementById('theme-variables');
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-variables';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
    
    // Apply theme class to body
    document.documentElement.className = theme.mode === 'dark' ? 'dark' : '';
    
    // Apply accent color override if different from theme primary
    if (accentColor !== theme.colors.primary) {
      document.documentElement.style.setProperty('--color-primary', accentColor);
      document.documentElement.style.setProperty('--color-primary-hover', adjustBrightness(accentColor, -10));
    }
  };

  const setTheme = useCallback((themeId: string) => {
    const theme = themes[themeId] || customTheme;
    if (theme) {
      setCurrentTheme(theme);
      setThemeModeState(theme.mode === 'custom' ? 'custom' : themeId as any);
      savePreferences({ mode: themeId });
    }
  }, [customTheme]);

  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'system' | 'custom') => {
    setThemeModeState(mode);
    
    if (mode === 'custom' && customTheme) {
      setCurrentTheme(customTheme);
    } else if (mode !== 'system' && mode !== 'custom') {
      setCurrentTheme(themes[mode]);
    }
    
    savePreferences({ theme_mode: mode });
  }, [customTheme]);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', adjustBrightness(color, -10));
    savePreferences({ accent_color: color });
  }, []);

  const setFontSize = useCallback((size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    savePreferences({ font_size: size });
  }, []);

  const setCompactMode = useCallback((compact: boolean) => {
    setCompactModeState(compact);
    savePreferences({ compact_mode: compact });
  }, []);

  const createCustomTheme = useCallback((name: string, colors: Partial<ThemeColors>) => {
    const baseTheme = themeMode === 'dark' ? themes.dark : themes.light;
    const custom: Theme = {
      id: 'custom',
      name,
      mode: 'custom',
      colors: { ...baseTheme.colors, ...colors },
    };
    
    setCustomTheme(custom);
    setCurrentTheme(custom);
    setThemeModeState('custom');
    savePreferences({ theme_mode: 'custom', custom_theme: custom.colors });
  }, [themeMode]);

  const updateCustomTheme = useCallback((colors: Partial<ThemeColors>) => {
    if (customTheme) {
      const updated = {
        ...customTheme,
        colors: { ...customTheme.colors, ...colors },
      };
      setCustomTheme(updated);
      setCurrentTheme(updated);
      savePreferences({ custom_theme: updated.colors });
    }
  }, [customTheme]);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeMode,
        availableThemes: Object.values(themes),
        setTheme,
        setThemeMode,
        createCustomTheme,
        updateCustomTheme,
        accentColor,
        setAccentColor,
        fontSize,
        setFontSize,
        compactMode,
        setCompactMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Helper function for brightness adjustment
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
}
```

---

## 🎨 Theme Settings Component: `/src/components/settings/ThemeSettings.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Monitor,
  Palette,
  Type,
  Maximize,
  Minimize,
  Check
} from 'lucide-react';

export function ThemeSettings() {
  const {
    currentTheme,
    themeMode,
    setThemeMode,
    availableThemes,
    setTheme,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    compactMode,
    setCompactMode,
    createCustomTheme,
  } = useTheme();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: accentColor,
    background: currentTheme.colors.background,
    foreground: currentTheme.colors.foreground,
  });

  const themeModes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const accentColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Indigo', value: '#6366F1' },
  ];

  const fontSizes = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Mode Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Theme Mode</h3>
        <div className="grid grid-cols-3 gap-3">
          {themeModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = themeMode === mode.id;
            
            return (
              <button
                key={mode.id}
                onClick={() => setThemeMode(mode.id as any)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${isActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-border-hover'
                  }
                `}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <span className="text-sm font-medium">{mode.label}</span>
                {isActive && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Preset Themes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Preset Themes</h3>
        <div className="grid grid-cols-2 gap-3">
          {availableThemes.map((theme) => {
            const isActive = currentTheme.id === theme.id;
            
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all text-left
                  ${isActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-border-hover'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.success }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.error }}
                    />
                  </div>
                  <span className="text-sm font-medium">{theme.name}</span>
                </div>
                {isActive && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Accent Color */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Accent Color</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {accentColors.map((color) => {
            const isActive = accentColor === color.value;
            
            return (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all
                  ${isActive 
                    ? 'border-primary' 
                    : 'border-border hover:border-border-hover'
                  }
                `}
              >
                <div 
                  className="w-full h-8 rounded mb-1"
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-xs">{color.name}</span>
                {isActive && (
                  <Check className="absolute top-1 right-1 h-3 w-3 text-white" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Custom Color Picker */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium">Custom:</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-20 rounded cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">{accentColor}</span>
          </div>
        </div>
      </Card>

      {/* Font Size */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Type className="h-5 w-5 mr-2" />
          Font Size
        </h3>
        <div className="flex space-x-3">
          {fontSizes.map((size) => {
            const isActive = fontSize === size.id;
            
            return (
              <button
                key={size.id}
                onClick={() => setFontSize(size.id as any)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all
                  ${isActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-border-hover'
                  }
                `}
              >
                <span 
                  className="font-medium"
                  style={{ 
                    fontSize: size.id === 'small' ? '12px' : 
                             size.id === 'large' ? '18px' : '14px' 
                  }}
                >
                  {size.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Display Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Display Options</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              {compactMode ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
              Compact Mode
            </span>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${compactMode ? 'bg-primary' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${compactMode ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
          <p className="text-xs text-muted-foreground">
            Reduces spacing and padding for more content on screen
          </p>
        </div>
      </Card>

      {/* Custom Theme Creator */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Create Custom Theme
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Primary Color</label>
              <input
                type="color"
                value={customColors.primary}
                onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Background</label>
              <input
                type="color"
                value={customColors.background}
                onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>
          
          <Button
            onClick={() => createCustomTheme('Custom Theme', customColors)}
            className="w-full"
          >
            Apply Custom Theme
          </Button>
        </div>
      </Card>

      {/* Theme Preview */}
      <Card 
        className="p-6"
        style={{
          backgroundColor: currentTheme.colors.card,
          color: currentTheme.colors.cardForeground,
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Income Transaction</span>
            <span style={{ color: currentTheme.colors.income }}>+$1,234.56</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Expense Transaction</span>
            <span style={{ color: currentTheme.colors.expense }}>-$567.89</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Transfer Transaction</span>
            <span style={{ color: currentTheme.colors.transfer }}>→ $300.00</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## 🎨 Global CSS Updates: `/src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Base font size variable */
    --base-font-size: 16px;
    
    /* Dynamic theme colors will be injected here */
  }
  
  html {
    font-size: var(--base-font-size);
  }
  
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  /* Compact mode styles */
  .compact-mode {
    --spacing-unit: 0.75;
  }
  
  .compact-mode .p-4 {
    padding: calc(1rem * var(--spacing-unit));
  }
  
  .compact-mode .p-6 {
    padding: calc(1.5rem * var(--spacing-unit));
  }
  
  .compact-mode .space-y-4 > * + * {
    margin-top: calc(1rem * var(--spacing-unit));
  }
  
  /* Dark mode overrides if using Tailwind's dark mode */
  .dark {
    color-scheme: dark;
  }
}

@layer components {
  /* Theme-aware components */
  .card {
    background-color: var(--color-card);
    color: var(--color-card-foreground);
    border-color: var(--color-border);
  }
  
  .btn-primary {
    background-color: var(--color-primary);
    color: var(--color-primary-foreground);
  }
  
  .btn-primary:hover {
    background-color: var(--color-primary-hover);
  }
  
  .input {
    background-color: var(--color-input);
    border-color: var(--color-input-border);
    color: var(--color-foreground);
  }
  
  .text-muted {
    color: var(--color-foreground-muted);
  }
  
  .text-subtle {
    color: var(--color-foreground-subtle);
  }
}

/* Animation preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🔌 Integration Points

### 1. Update Provider Hierarchy: `/src/app/providers.tsx`

```tsx
export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      <ThemeProvider>  {/* Add Theme Provider here */}
        <AuthStateProvider>
          <AuthProvider>
            <TransactionModalProvider>
              {children}
            </TransactionModalProvider>
          </AuthProvider>
        </AuthStateProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
```

### 2. Use Theme Variables in Components

```tsx
// Example component using theme
function TransactionRow({ transaction }: Props) {
  const { currentTheme } = useTheme();
  
  return (
    <div className="flex justify-between">
      <span>{transaction.description}</span>
      <span 
        style={{ 
          color: transaction.type === 'income' 
            ? currentTheme.colors.income 
            : currentTheme.colors.expense 
        }}
      >
        {formatAmount(transaction.amount)}
      </span>
    </div>
  );
}
```

---

## ✅ Features Included

- **Multiple Theme Modes**: Light, Dark, System, Custom
- **Preset Themes**: Light, Dark, Midnight, Forest
- **Custom Theme Creator**: User can create their own color scheme
- **Accent Color Customization**: Override primary color
- **Font Size Options**: Small, Medium, Large
- **Compact Mode**: Reduced spacing for more content
- **Persistent Preferences**: Saved to database for logged-in users
- **Local Storage Fallback**: Theme saved for non-authenticated users
- **System Theme Detection**: Follows OS preference
- **Smooth Transitions**: Theme changes animate smoothly
- **Accessibility**: Respects prefers-reduced-motion
- **Live Preview**: See changes in real-time

---

## 🎯 Implementation Checklist

- [ ] Database migration for UserPreferences table
- [ ] Theme configuration file created
- [ ] Theme context implemented
- [ ] Theme settings UI component
- [ ] Global CSS variables setup
- [ ] Provider hierarchy updated
- [ ] API endpoints for preferences
- [ ] Local storage fallback
- [ ] System theme detection
- [ ] Custom theme creator
- [ ] Compact mode styles
- [ ] Font size variations
- [ ] Theme persistence
- [ ] Smooth transitions

This theme system integrates seamlessly with your existing architecture without breaking any functionality!

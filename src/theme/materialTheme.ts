import {
  argbFromHex,
  DynamicColor,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeTonalSpot,
  DynamicScheme,
} from '@material/material-color-utilities';
import { createSignal } from 'solid-js';

export interface ThemeConfig {
  isDark: boolean;
  color: string;
  contrastLevel: number;
}

const DEFAULT_THEME: ThemeConfig = {
  color: '#FF8811',
  isDark: true,
  contrastLevel: 0,
};

function createTheme(seedColor: string, isDark: boolean, contrastLevel: number): DynamicScheme {
  const argb = argbFromHex(seedColor);
  const hctSeedColor = Hct.fromInt(argb);
  return new SchemeTonalSpot(hctSeedColor, isDark, contrastLevel, '2025', 'phone');
}

function applyDynamicTheme(element: HTMLElement, scheme: DynamicScheme): void {
  for (const [key, value] of Object.entries(MaterialDynamicColors)) {
    if (value instanceof DynamicColor && !key.endsWith('PaletteKeyColor')) {
      const tokenName = value.name.replace(/_/g, '-');
      const argb = value.getArgb(scheme);
      const hex = hexFromArgb(argb);
      element.style.setProperty(`--md-sys-color-${tokenName}`, hex);
    }
  }
}

export function loadThemePreferences(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem('theme');
    if (raw) {
      const parsed = JSON.parse(raw);
      if ('color' in parsed && 'isDark' in parsed && 'contrastLevel' in parsed) {
        return parsed as ThemeConfig;
      }
    }
  } catch (e) {
    console.error('Failed to load theme preferences from localStorage:', e);
  }
  return DEFAULT_THEME;
}

export function applyTheme(preferences: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const theme = createTheme(preferences.color, preferences.isDark, preferences.contrastLevel);
  document.documentElement.dataset.theme = preferences.isDark ? 'dark' : 'light';
  document.body.dataset.theme = preferences.isDark ? 'dark' : 'light';
  applyDynamicTheme(document.documentElement, theme);
}

// Global Solid Signal for active theme preferences
const initialPrefs = loadThemePreferences();
export const [themeConfig, setThemeConfigSignal] = createSignal<ThemeConfig>(initialPrefs);

// Initial application
applyTheme(initialPrefs);

export function updateThemePreferences(updates: Partial<ThemeConfig>): void {
  const current = themeConfig();
  const next: ThemeConfig = { ...current, ...updates };
  setThemeConfigSignal(next);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('theme', JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save theme preferences to localStorage:', e);
    }
  }
  applyTheme(next);
}

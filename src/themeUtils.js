export const THEME_STORAGE_KEY = 'hf_theme';

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '');
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const int = Number.parseInt(safe, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const THEMES = [
  { key: 'default', label: 'Default Blue', primary: '#4169e1', dark: '#27408b', sidebar: '#2c3e6b' },
  { key: 'purple', label: 'Purple', primary: '#7b2d8b', dark: '#561e61', sidebar: '#3b1045' },
  { key: 'orange', label: 'Orange', primary: '#e67e22', dark: '#b95c0a', sidebar: '#7d3a0a' },
  { key: 'darkpink', label: 'Dark Pink', primary: '#c2185b', dark: '#880e4f', sidebar: '#6a0636' },
  { key: 'green', label: 'Green', primary: '#2e7d32', dark: '#1b5e20', sidebar: '#1a3d1b' },
  { key: 'blue', label: 'Blue', primary: '#1565c0', dark: '#0d47a1', sidebar: '#0a2d6e' },
  { key: 'darkblue', label: 'Dark Blue', primary: '#0d1b4b', dark: '#07102b', sidebar: '#060d20' },
  { key: 'black', label: 'Black', primary: '#111111', dark: '#000000', sidebar: '#1a1a1a' },
  { key: 'gold', label: 'Gold', primary: '#b8860b', dark: '#7d5c08', sidebar: '#4b3705' },
  { key: 'gray', label: 'Gray', primary: '#607d8b', dark: '#455a64', sidebar: '#2e3d45' }
];

export function applyTheme(key) {
  const theme = THEMES.find((t) => t.key === key) || THEMES[0];
  document.documentElement.style.setProperty('--theme-primary', theme.primary);
  document.documentElement.style.setProperty('--theme-primary-dark', theme.dark);
  document.documentElement.style.setProperty('--theme-sidebar-bg', theme.sidebar);
  document.documentElement.style.setProperty('--theme-soft-bg', rgba(theme.primary, 0.08));
  document.documentElement.style.setProperty('--theme-soft-border', rgba(theme.primary, 0.24));
  document.documentElement.style.setProperty('--theme-text-strong', theme.dark);
  document.documentElement.style.setProperty('--theme-text-muted', rgba(theme.dark, 0.75));
  document.documentElement.style.setProperty('--theme-surface', '#ffffff');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, key);
  } catch (_) {}
}

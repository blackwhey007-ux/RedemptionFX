/**
 * REDEMPTIONFX THEME TOGGLE
 * Theme management functions
 * Phoenix Rising - Dark & Light
 */

import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

/**
 * Get the current theme from localStorage or default to 'dark'
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  const savedTheme = localStorage.getItem('redemption-theme') as Theme | null;
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }
  
  // Default to dark theme
  return 'dark';
}

/**
 * Set the theme in localStorage and on the document element
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  // Save to localStorage
  localStorage.setItem('redemption-theme', theme);
  
  // Apply to document
  document.documentElement.setAttribute('data-theme', theme);
  
  // Dispatch custom event for components that need to react to theme changes
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

/**
 * Toggle between dark and light themes
 */
export function toggleTheme(): Theme {
  const currentTheme = getTheme();
  const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Initialize theme on page load
 * Call this as early as possible to prevent flash of unstyled content
 */
export function initTheme(): void {
  if (typeof window === 'undefined') return;
  
  const theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Listen for theme changes
 * Returns a cleanup function to remove the listener
 */
export function onThemeChange(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ theme: Theme }>;
    callback(customEvent.detail.theme);
  };
  
  window.addEventListener('theme-changed', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('theme-changed', handler);
  };
}

/**
 * Check if the user prefers dark mode based on system settings
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Auto-detect and set theme based on system preference
 * Only sets if no saved preference exists
 */
export function autoDetectTheme(): void {
  if (typeof window === 'undefined') return;
  
  const savedTheme = localStorage.getItem('redemption-theme');
  
  // Only auto-detect if no saved preference
  if (!savedTheme) {
    const theme: Theme = prefersDarkMode() ? 'dark' : 'light';
    setTheme(theme);
  }
}

/**
 * Get theme colors for current theme
 * Useful for canvas, charts, or programmatic color access
 */
export function getThemeColors() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    primary: computedStyle.getPropertyValue('--color-primary').trim(),
    secondary: computedStyle.getPropertyValue('--color-secondary').trim(),
    bgPrimary: computedStyle.getPropertyValue('--bg-primary').trim(),
    bgSecondary: computedStyle.getPropertyValue('--bg-secondary').trim(),
    textPrimary: computedStyle.getPropertyValue('--text-primary').trim(),
    textSecondary: computedStyle.getPropertyValue('--text-secondary').trim(),
    borderDefault: computedStyle.getPropertyValue('--border-default').trim(),
  };
}

/**
 * React hook for theme management (optional)
 * Use this in React components for reactive theme updates
 */
export function useThemeHook() {
  if (typeof window === 'undefined') {
    return { theme: 'dark' as Theme, setTheme, toggleTheme };
  }
  
  const [theme, setThemeState] = useState<Theme>(getTheme());
  
  useEffect(() => {
    // Initialize theme on mount
    initTheme();
  }, []);
  
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  };
  
  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setThemeState(newTheme);
    return newTheme;
  };
  
  return {
    theme,
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
  };
}



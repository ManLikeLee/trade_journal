export const THEME_STORAGE_KEY = 'tradejournal-theme';

export const THEME_INIT_SCRIPT = `(() => {
  try {
    const key = '${THEME_STORAGE_KEY}';
    const saved = window.localStorage.getItem(key);
    const theme = saved === 'dark' ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch (_) {}
})();`;

// Applies the stored theme before first paint to avoid a flash. External (not inline) so the CSP can forbid inline scripts.
try {
  var t = localStorage.getItem('theme');
  var dark = t === 'dark' || ((!t || t === 'system') && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (e) { /* storage blocked: keep the default theme */ }

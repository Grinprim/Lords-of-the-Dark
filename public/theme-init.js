// Sets the theme before first paint to avoid a flash. Kept as a separate file so the CSP can forbid inline scripts.
(function () {
  try {
    var saved = localStorage.getItem('lotd-theme');
    var theme = saved === 'light' || saved === 'dark' ? saved : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

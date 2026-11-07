// Applies the saved (or system) colour theme before first paint, then wires the header toggle.
(() => {
  const root = document.documentElement, media = matchMedia('(prefers-color-scheme: light)');
  let saved = null;
  try { saved = localStorage.getItem('qf-theme'); } catch { /* Storage can be blocked; follow the system theme. */ }
  const apply = theme => {
    root.dataset.theme = theme;
    for (const button of document.querySelectorAll('[data-set-theme]')) button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme));
  };
  apply(saved === 'light' || saved === 'dark' ? saved : media.matches ? 'light' : 'dark');
  media.addEventListener('change', e => { if (!saved) apply(e.matches ? 'light' : 'dark'); });
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    for (const button of document.querySelectorAll('[data-set-theme]')) button.onclick = () => {
      saved = button.dataset.setTheme;
      try { localStorage.setItem('qf-theme', saved); } catch { /* The choice still applies for this visit. */ }
      apply(saved);
    };
  });
})();

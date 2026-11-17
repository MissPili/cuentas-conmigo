// In any environment that is not production, show a ribbon so nobody mistakes a test copy for the real app.
const NAMES: Record<string, string> = { dev: 'DESARROLLO', qa: 'QA · PRUEBAS' };

export function showEnvironment(env: string = __ENV__): void {
  if (!env) return;
  const name = NAMES[env] ?? env.toUpperCase();
  document.title = `[${name}] ${document.title}`;
  const bar = document.createElement('div');
  bar.textContent = `${name} — no es la app real`;
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:2px 8px;text-align:center;font:700 12px/1.4 system-ui,sans-serif;letter-spacing:.04em;background:#b45309;color:#fff;pointer-events:none';
  document.body.prepend(bar);
  document.body.style.paddingTop = '22px';
}

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage';

describe('LoginPage (accesibilidad básica)', () => {
  const html = renderToStaticMarkup(<LoginPage onLoginSuccess={() => undefined} />);

  it('cada etiqueta está asociada a su campo', () => {
    expect(html).toContain('for="login-email"');
    expect(html).toContain('id="login-email"');
    expect(html).toContain('for="login-password"');
    expect(html).toContain('id="login-password"');
  });

  it('los campos tienen autocompletado para el navegador y gestores de contraseñas', () => {
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
  });

  it('el botón de mostrar contraseña tiene nombre accesible', () => {
    expect(html).toContain('aria-label="Mostrar contraseña"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('sin error no hay alerta; el envío sigue siendo un botón submit', () => {
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('Ingresar al Sistema');
  });
});
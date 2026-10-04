import * as fs from 'fs';
import * as path from 'path';

/**
 * Guardia de la decision 0029 (comprobanteUrl sin lista de hosts): mientras el
 * backend no haga peticiones HTTP salientes, una URL guardada no puede
 * convertirse en SSRF. Si este test falla porque se agrego un cliente HTTP o
 * un generador de PDF, revisar antes si alguno toca comprobanteUrl o cualquier
 * otra URL que venga del usuario y reabrir la decision.
 */
describe('el backend no hace peticiones HTTP salientes (decision 0029)', () => {
  const SALIENTE = new RegExp(
    [
      "from '(axios|node-fetch|undici|got|request|superagent|needle)'",
      "require\\('(axios|node-fetch|undici|got|request|superagent|needle)'\\)",
      '@nestjs/axios',
      "from '(node:)?https?'",
      "require\\('(node:)?https?'\\)",
      '\\bfetch\\(',
      'puppeteer|playwright|pdfkit|pdfmake|jspdf|html-pdf',
    ].join('|'),
  );

  const recorrer = (dir: string, acumulado: string[] = []): string[] => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta, acumulado);
      else if (/\.ts$/.test(entrada.name) && !/\.spec\.ts$/.test(entrada.name)) {
        acumulado.push(ruta);
      }
    }
    return acumulado;
  };

  it('src/ no importa clientes HTTP ni generadores de PDF y no llama a fetch()', () => {
    const src = path.resolve(__dirname, '..', '..');
    const infractores = recorrer(src)
      .filter((f) => SALIENTE.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(src, f));
    expect(infractores).toEqual([]);
  });
});

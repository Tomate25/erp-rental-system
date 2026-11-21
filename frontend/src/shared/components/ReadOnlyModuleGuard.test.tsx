import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReadOnlyModuleGuard, isWriteActionText } from './ReadOnlyModuleGuard';

describe('ReadOnlyModuleGuard', () => {
  it('renderiza el contenido del módulo sin inyectar etiquetas ni banners de Solo Lectura', () => {
    const html = renderToStaticMarkup(
      <ReadOnlyModuleGuard readOnly={true} moduleName="Clientes">
        <div>Contenido de Clientes</div>
      </ReadOnlyModuleGuard>,
    );

    expect(html).not.toContain('Modo Solo Lectura');
    expect(html).toContain('Contenido de Clientes');
  });

  it('renderiza el contenido intacto cuando readOnly es false', () => {
    const html = renderToStaticMarkup(
      <ReadOnlyModuleGuard readOnly={false} moduleName="Cotizaciones">
        <div>Contenido de Cotizaciones</div>
      </ReadOnlyModuleGuard>,
    );

    expect(html).toContain('Contenido de Cotizaciones');
  });

  it('identifica correctamente botones de escritura vs acciones seguras de lectura/exportación', () => {
    expect(isWriteActionText('Nuevo Cliente')).toBe(true);
    expect(isWriteActionText('Registrar Pago')).toBe(true);
    expect(isWriteActionText('Editar')).toBe(true);
    expect(isWriteActionText('Eliminar')).toBe(true);
    expect(isWriteActionText('Carga Masiva')).toBe(true);
    expect(isWriteActionText('Guardar Cambios', true)).toBe(true);

    expect(isWriteActionText('Exportar Excel')).toBe(false);
    expect(isWriteActionText('Generar PDF')).toBe(false);
    expect(isWriteActionText('Ver Detalle')).toBe(false);
    expect(isWriteActionText('Imprimir')).toBe(false);
    expect(isWriteActionText('Filtrar', true)).toBe(false);
    expect(isWriteActionText('Cerrar')).toBe(false);
  });
});

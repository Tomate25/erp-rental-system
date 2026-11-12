import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemStatusPage } from './SystemStatusPage';
import { ErrorBoundary } from './ErrorBoundary';

describe('SystemStatusPage Component', () => {
  it('debe renderizar el modo 404 por defecto únicamente con el botón de Volver al Inicio', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="404" />);

    expect(html).toContain('BM CONSTRUCCIONES');
    expect(html).toContain('ERP Rental System S.A.');
    expect(html).toContain('¡Zona Fuera del Mapa!');
    expect(html).toContain('Ruta Fuera del Mapa de Obra');
    expect(html).toContain('La página, recurso o cotización que intentas consultar no existe');
    // Botón principal único
    expect(html).toContain('Volver al Inicio');

    // Debe NO contener enlaces o botones que lleven a clientes o módulos secundarios
    expect(html).not.toContain('Panel de Módulos');
    expect(html).not.toContain('Cotizaciones');
    expect(html).not.toContain('Clientes');
    expect(html).not.toContain('Volver Atrás');
    expect(html).not.toContain('module=inventory');
    expect(html).not.toContain('module=quotations');
    expect(html).not.toContain('module=clients');
  });

  it('debe renderizar el modo 500 con mensajes de tranquilidad y botón de inicio', () => {
    const fakeError = new Error('Simulación de desconexión en base de datos');
    const html = renderToStaticMarkup(<SystemStatusPage code="500" error={fakeError} />);

    expect(html).toContain('Interrupción Inesperada en el Sistema');
    expect(html).toContain('Interrupción en la Maquinaria');
    expect(html).toContain('los datos de tu empresa y el inventario están 100% seguros y respaldados');
    expect(html).toContain('Volver al Inicio');
    expect(html).toContain('Ver diagnóstico técnico del fallo');
  });

  it('debe renderizar el modo 503 para labores de mantenimiento preventivo', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="503" />);

    expect(html).toContain('Servidor en Mantenimiento de Pista');
    expect(html).toContain('Mantenimiento Preventivo de Servidor');
    expect(html).toContain('Estamos optimizando la infraestructura del ERP');
    expect(html).toContain('Volver al Inicio');
  });

  it('debe renderizar el modo offline cuando el dispositivo pierde conexión', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="offline" />);

    expect(html).toContain('Se Perdió el Enlace con la Red');
    expect(html).toContain('Dispositivo Sin Conexión');
    expect(html).toContain('Tu equipo de trabajo o dispositivo móvil no puede comunicarse');
    expect(html).toContain('Volver al Inicio');
  });

  it('no debe mostrar barra conmutadora ni botones de vista previa en la parte superior', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="404" />);

    expect(html).not.toContain('VISTA PREVIA');
    expect(html).not.toContain('Conmutador interactivo de estados:');
  });
});

describe('ErrorBoundary Component', () => {
  it('renderiza normalmente los hijos cuando no hay error', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary>
        <div data-testid="contenido-seguro">Sistema funcionando normalmente</div>
      </ErrorBoundary>
    );

    expect(html).toContain('Sistema funcionando normalmente');
    expect(html).not.toContain('Interrupción Inesperada');
  });
});

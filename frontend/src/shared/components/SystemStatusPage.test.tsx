import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemStatusPage } from './SystemStatusPage';
import { ErrorBoundary } from './ErrorBoundary';

describe('SystemStatusPage Component', () => {
  it('debe renderizar el modo 404 por defecto con branding corporativo de BM Construcciones', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="404" />);

    expect(html).toContain('BM CONSTRUCCIONES');
    expect(html).toContain('ERP Rental System S.A.');
    expect(html).toContain('¡Zona Fuera del Mapa!');
    expect(html).toContain('Ruta Fuera del Mapa de Obra');
    expect(html).toContain('La página, recurso o cotización que intentas consultar no existe');
    expect(html).toContain('Volver al Panel Principal');
    expect(html).toContain('Volver Atrás');
  });

  it('debe renderizar el modo 500 con mensajes de tranquilidad e integridad de datos', () => {
    const fakeError = new Error('Simulación de desconexión en base de datos');
    const html = renderToStaticMarkup(<SystemStatusPage code="500" error={fakeError} />);

    expect(html).toContain('Interrupción Inesperada en el Sistema');
    expect(html).toContain('Interrupción en la Maquinaria');
    expect(html).toContain('los datos de tu empresa y el inventario están 100% seguros y respaldados');
    expect(html).toContain('Reintentar Operación');
    expect(html).toContain('Ver diagnóstico técnico del fallo');
  });

  it('debe renderizar el modo 503 para labores de mantenimiento preventivo', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="503" />);

    expect(html).toContain('Servidor en Mantenimiento de Pista');
    expect(html).toContain('Mantenimiento Preventivo de Servidor');
    expect(html).toContain('Estamos optimizando la infraestructura del ERP');
    expect(html).toContain('Comprobar Disponibilidad');
  });

  it('debe renderizar el modo offline cuando el dispositivo pierde conexión', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="offline" />);

    expect(html).toContain('Se Perdió el Enlace con la Red');
    expect(html).toContain('Dispositivo Sin Conexión');
    expect(html).toContain('Tu equipo de trabajo o dispositivo móvil no puede comunicarse');
    expect(html).toContain('Reconectar Ahora');
  });

  it('debe mostrar la barra conmutadora de prueba si allowModeSwitch es true', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="404" allowModeSwitch={true} />);

    expect(html).toContain('VISTA PREVIA');
    expect(html).toContain('Conmutador interactivo de estados:');
    expect(html).toContain('404');
    expect(html).toContain('500');
    expect(html).toContain('503');
    expect(html).toContain('OFFLINE');
  });

  it('debe renderizar atajos rápidos a los módulos esenciales de la empresa', () => {
    const html = renderToStaticMarkup(<SystemStatusPage code="404" />);

    expect(html).toContain('Panel de Módulos');
    expect(html).toContain('Maquinaria');
    expect(html).toContain('Cotizaciones');
    expect(html).toContain('Clientes');
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

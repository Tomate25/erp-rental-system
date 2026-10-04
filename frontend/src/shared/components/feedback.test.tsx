import { renderToStaticMarkup } from 'react-dom/server';
import { Inbox } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';
import { ErrorAlert } from './ErrorAlert';
import { LoadingState } from './LoadingState';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('se anuncia como estado y tiene texto para lectores de pantalla', () => {
    const html = renderToStaticMarkup(<Spinner />);
    expect(html).toContain('role="status"');
    expect(html).toContain('<span class="sr-only">Cargando</span>');
    expect(html).toContain('animate-spin');
    expect(html).toContain('aria-hidden="true"');
  });

  it('tamaño y tono cambian las clases; el borde de 3px usa border-3', () => {
    expect(renderToStaticMarkup(<Spinner />)).toContain('w-8 h-8 border-3 border-[#1A73E8]');
    expect(renderToStaticMarkup(<Spinner size="sm" tone="white" />)).toContain('w-4 h-4 border-2 border-white');
    expect(renderToStaticMarkup(<Spinner size="lg" tone="slate" />)).toContain('w-10 h-10 border-4 border-[#37474F]');
  });

  it('usa la etiqueta indicada', () => {
    expect(renderToStaticMarkup(<Spinner label="Guardando" />)).toContain('>Guardando</span>');
  });
});

describe('LoadingState', () => {
  it('muestra el mensaje y el indicador', () => {
    const html = renderToStaticMarkup(<LoadingState message="Cargando contratos..." />);
    expect(html).toContain('Cargando contratos...');
    expect(html).toContain('role="status"');
    expect(html).toContain('animate-spin');
  });
});

describe('EmptyState', () => {
  it('muestra título y descripción', () => {
    const html = renderToStaticMarkup(<EmptyState icon={Inbox} title="No hay clientes" description="Da de alta el primero." />);
    expect(html).toContain('<h3');
    expect(html).toContain('No hay clientes');
    expect(html).toContain('Da de alta el primero.');
    expect(html).toContain('bg-[#E8F0FE]');
  });

  it('sin descripción ni acción no dibuja esos bloques; el tono neutro cambia el icono', () => {
    const html = renderToStaticMarkup(<EmptyState icon={Inbox} title="Sin resultados" tone="neutral" />);
    expect(html).not.toContain('<p class');
    expect(html).toContain('bg-[#F4F6F9]');
    expect(html).not.toContain('mt-5');
  });

  it('dibuja la acción cuando se pasa', () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Vacío">
        <button type="button">Crear</button>
      </EmptyState>,
    );
    expect(html).toContain('<button type="button">Crear</button>');
  });
});

describe('ErrorAlert', () => {
  it('se anuncia como alerta con el mensaje', () => {
    const html = renderToStaticMarkup(<ErrorAlert message="No se pudo cargar la lista." />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('No se pudo cargar la lista.');
  });

  it('el botón Reintentar solo aparece si hay onRetry', () => {
    expect(renderToStaticMarkup(<ErrorAlert message="x" />)).not.toContain('Reintentar');
    const html = renderToStaticMarkup(<ErrorAlert message="x" onRetry={() => undefined} />);
    expect(html).toContain('Reintentar');
    expect(html).toContain('type="button"');
  });
});
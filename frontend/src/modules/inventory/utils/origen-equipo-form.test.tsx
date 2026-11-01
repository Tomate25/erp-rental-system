import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrigenEquipoFields, OrigenProveedorNota } from '../components/OrigenEquipoFields';
import { NewProductModal } from '../components/NewProductModal';
import { UnitDetailDrawer } from '../components/UnitDetailDrawer';
import {
  emptyOrigenEquipoForm,
  origenEquipoFormHasErrors,
  toOrigenEquipoWrite,
  validateOrigenEquipoForm,
} from './origen-equipo-form';

describe('validateOrigenEquipoForm', () => {
  it('no exige proveedor cuando el origen es propio', () => {
    const errores = validateOrigenEquipoForm({
      ...emptyOrigenEquipoForm(),
      proveedorNombre: '',
      precioProveedor: '',
    });
    expect(errores).toEqual({});
    expect(origenEquipoFormHasErrors(errores)).toBe(false);
  });

  it('exige nombre y precio en córdobas cuando el origen es proveedor', () => {
    const vacio = validateOrigenEquipoForm({
      origenEquipo: 'PROVEEDOR',
      proveedorNombre: '   ',
      precioProveedor: '',
      disponibleParaRenta: true,
    });
    expect(vacio.proveedorNombre).toMatch(/proveedor/i);
    expect(vacio.precioProveedor).toMatch(/precio/i);
    expect(origenEquipoFormHasErrors(vacio)).toBe(true);

    const negativo = validateOrigenEquipoForm({
      origenEquipo: 'PROVEEDOR',
      proveedorNombre: 'Andamios del Norte',
      precioProveedor: '-5',
      disponibleParaRenta: true,
    });
    expect(negativo.precioProveedor).toMatch(/negativo/);
  });

  it('acepta proveedor con precio y el toggle de renta', () => {
    const errores = validateOrigenEquipoForm({
      origenEquipo: 'PROVEEDOR',
      proveedorNombre: ' Andamios del Norte ',
      precioProveedor: '420.5',
      disponibleParaRenta: false,
    });
    expect(errores).toEqual({});
  });
});

describe('toOrigenEquipoWrite', () => {
  it('limpia proveedor y precio al volver a propio y conserva el costo fuera de este payload', () => {
    const payload = toOrigenEquipoWrite({
      origenEquipo: 'PROPIO',
      proveedorNombre: 'Andamios del Norte',
      precioProveedor: '420',
      disponibleParaRenta: true,
    });
    expect(payload).toEqual({
      origenEquipo: 'PROPIO',
      proveedorNombre: null,
      precioProveedor: null,
      disponibleParaRenta: true,
    });
    expect(payload).not.toHaveProperty('costoAdquisicion');
  });

  it('recorta el nombre y manda el precio que cobra el proveedor', () => {
    expect(
      toOrigenEquipoWrite({
        origenEquipo: 'PROVEEDOR',
        proveedorNombre: '  Andamios del Norte  ',
        precioProveedor: '420.5',
        disponibleParaRenta: false,
      }),
    ).toEqual({
      origenEquipo: 'PROVEEDOR',
      proveedorNombre: 'Andamios del Norte',
      precioProveedor: 420.5,
      disponibleParaRenta: false,
    });
  });
});

describe('campos de origen en la UI', () => {
  it('oculta proveedor y precio cuando el origen es propio', () => {
    const html = renderToStaticMarkup(
      <OrigenEquipoFields value={emptyOrigenEquipoForm()} onChange={() => undefined} />,
    );
    expect(html).toContain('Propio (flota BM)');
    expect(html).toContain('Disponible para rentar');
    expect(html).not.toContain('Precio del proveedor');
    expect(html).not.toContain('Nombre del proveedor');
  });

  it('muestra proveedor, precio en córdobas y el toggle cuando el origen es proveedor', () => {
    const html = renderToStaticMarkup(
      <OrigenEquipoFields
        value={{
          origenEquipo: 'PROVEEDOR',
          proveedorNombre: '',
          precioProveedor: '',
          disponibleParaRenta: true,
        }}
        onChange={() => undefined}
        errors={{
          proveedorNombre: 'El proveedor es requerido para equipos en subalquiler.',
          precioProveedor: 'Indique el precio que cobra el proveedor.',
        }}
      />,
    );
    expect(html).toContain('Proveedor (préstamo / subalquiler)');
    expect(html).toContain('Precio del proveedor (C$)');
    expect(html).toContain('Disponible para rentar');
    expect(html).toContain('No es la tarifa A, B o C');
    expect(html).toContain('El proveedor es requerido');
  });

  it('el alta de producto incluye el selector de origen', () => {
    const html = renderToStaticMarkup(
      <NewProductModal
        existingProducts={[]}
        existingCodes={[]}
        existingSerials={[]}
        categories={[{ id: 'cat-1', nombre: 'Andamios' }]}
        brands={[{ id: 'marca-1', nombre: 'BM' }]}
        sucursales={[{ id: 'suc-1', nombre: 'Managua' }]}
        isOpen
        onClose={() => undefined}
        onSubmit={async () => undefined}
        onSelectExistingProduct={() => undefined}
      />,
    );
    expect(html).toContain('Registrar Nuevo Producto en Inventario');
    expect(html).toContain('Origen del equipo');
    expect(html).toContain('Propio (flota BM)');
    expect(html).not.toContain('Precio del proveedor (C$)');
  });

  it('la ficha de la unidad muestra nombre, precio y si se puede rentar', () => {
    const html = renderToStaticMarkup(
      <UnitDetailDrawer
        isOpen
        onClose={() => undefined}
        canEdit
        onSaveOrigen={async () => undefined}
        unit={{
          id: 'eq-1',
          codigo: 'AND-01',
          productoNombre: 'Andamio',
          marca: 'BM',
          modelo: 'Marco',
          serie: 'S/N',
          estado: 'DISPONIBLE',
          tipoControl: 'POR_CANTIDAD',
          historialMantenimiento: [],
          origenEquipo: 'PROVEEDOR',
          proveedorNombre: 'Andamios del Norte',
          precioProveedor: 420,
          disponibleParaRenta: true,
        }}
      />,
    );
    expect(html).toContain('Proveedor · Andamios del Norte');
    expect(html).toContain('C$');
    expect(html).toContain('420');
    expect(html).toContain('Disponible para rentar');
    expect(html).toContain('Guardar origen');
  });
});

describe('OrigenProveedorNota', () => {
  it('no pinta nada si el equipo es propio', () => {
    expect(renderToStaticMarkup(<OrigenProveedorNota origenEquipo="PROPIO" />)).toBe('');
  });

  it('indica cuando el equipo de proveedor no se promueve', () => {
    const html = renderToStaticMarkup(
      <OrigenProveedorNota
        origenEquipo="PROVEEDOR"
        proveedorNombre="RentAll"
        precioProveedor={80}
        disponibleParaRenta={false}
      />,
    );
    expect(html).toContain('RentAll');
    expect(html).toContain('No disponible para rentar');
  });
});

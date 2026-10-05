import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  MSG_SIN_SUCURSAL_PARA_CONTRATO,
  MSG_SUCURSAL_NO_ENCONTRADA,
  resolveSucursalIdEnEmpresa,
} from './tenant.util';

describe('resolveSucursalIdEnEmpresa', () => {
  const dbCon = (resultado: { id: string } | null) => ({
    sucursal: { findFirst: jest.fn().mockResolvedValue(resultado) },
  });

  it('usa la sucursal indicada si es de la empresa', async () => {
    const db = dbCon({ id: 'suc-1' });
    await expect(resolveSucursalIdEnEmpresa(db, 'suc-1', 'emp-1')).resolves.toBe('suc-1');
    expect(db.sucursal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'suc-1', empresaId: 'emp-1' } }),
    );
  });

  it('una sucursal de otra empresa responde 404 sin revelar que existe', async () => {
    const db = dbCon(null);
    const llamada = resolveSucursalIdEnEmpresa(db, 'suc-ajena', 'emp-1');
    await expect(llamada).rejects.toThrow(NotFoundException);
    await expect(llamada).rejects.toThrow(MSG_SUCURSAL_NO_ENCONTRADA);
  });

  it('sin sucursal indicada toma la mas antigua de la empresa del token', async () => {
    const db = dbCon({ id: 'suc-primera' });
    await expect(resolveSucursalIdEnEmpresa(db, undefined, 'emp-1')).resolves.toBe('suc-primera');
    expect(db.sucursal.findFirst).toHaveBeenCalledWith({
      where: { empresaId: 'emp-1' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  });

  it('si la empresa no tiene sucursales responde 400 con mensaje claro y no inventa un id', async () => {
    const db = dbCon(null);
    const llamada = resolveSucursalIdEnEmpresa(db, null, 'emp-1');
    await expect(llamada).rejects.toThrow(BadRequestException);
    await expect(llamada).rejects.toThrow(
      'No existe una sucursal disponible para generar el contrato.',
    );
    expect(MSG_SIN_SUCURSAL_PARA_CONTRATO).toBe(
      'No existe una sucursal disponible para generar el contrato.',
    );
  });

  it('falla cerrado sin empresaId (403) y no consulta la base', async () => {
    const db = dbCon({ id: 'suc-1' });
    await expect(resolveSucursalIdEnEmpresa(db, undefined, '')).rejects.toThrow(ForbiddenException);
    expect(db.sucursal.findFirst).not.toHaveBeenCalled();
  });
});

describe('ningun id de sucursal inventado en el codigo', () => {
  // Se arma con concatenacion para que este archivo no contenga el literal.
  const LITERAL = 'default' + '-sucursal';

  const recorrer = (dir: string, acumulado: string[] = []): string[] => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name !== 'node_modules') recorrer(ruta, acumulado);
      } else if (/\.(ts|js|mjs)$/.test(entrada.name)) {
        acumulado.push(ruta);
      }
    }
    return acumulado;
  };

  it('src/ y scripts/ no usan el literal que rompia la FK de contratos', () => {
    const backend = path.resolve(__dirname, '..', '..', '..');
    const raices = [path.join(backend, 'src'), path.join(backend, 'scripts')].filter(fs.existsSync);
    const conLiteral = raices
      .flatMap((r) => recorrer(r))
      .filter((f) => fs.readFileSync(f, 'utf8').includes(LITERAL));
    expect(conLiteral).toEqual([]);
  });
});

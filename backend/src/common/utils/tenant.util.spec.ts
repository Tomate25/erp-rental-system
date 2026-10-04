import { ForbiddenException } from '@nestjs/common';
import { assertEmpresaId } from './tenant.util';

describe('assertEmpresaId', () => {
  it('devuelve el empresaId válido', () => {
    expect(assertEmpresaId('empresa-a')).toBe('empresa-a');
  });

  it.each([undefined, null, '', '   '])(
    'rechaza empresaId vacío (%p) en lugar de omitir el filtro',
    (valor) => {
      expect(() => assertEmpresaId(valor as any)).toThrow(ForbiddenException);
    },
  );
});
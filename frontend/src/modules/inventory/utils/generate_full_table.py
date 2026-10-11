import openpyxl, re
from collections import defaultdict

wb = openpyxl.load_workbook(r'C:\Users\abdia\Downloads\inventario_tarifas_junio2026.xlsx', data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))[1:]

# Categorización y normalización precisa
items = []
for r in rows:
    cod = str(r[0]).strip() if r[0] else ''
    desc = str(r[1]).strip() if r[1] else ''
    desc = re.sub(r'\s+', ' ', desc)
    cant = int(r[2]) if r[2] is not None else 0
    tarifa = str(r[3]).strip() if r[3] else ''
    tipo = str(r[4]).strip() if r[4] else ''
    marca = str(r[5]).strip() if r[5] else 'N/D'
    modelo = str(r[6]).strip() if r[6] else ''
    serie = str(r[7]).strip() if r[7] else ''
    items.append({
        'codigo': cod, 'desc': desc, 'cant': cant, 'tarifa': tarifa,
        'tipo': tipo, 'marca': marca, 'modelo': modelo, 'serie': serie
    })

def normalize_item(it):
    cod = it['codigo']
    d = it['desc'].upper()
    m = it['marca'].upper()
    c = it['cant']

    # 1. MAQUINARIA AMARILLA (Por hora)
    if cod == '08-01':
        return ('Maquinaria Amarilla', 'Minicargador Caterpillar 236D3', 'POR HORA', 'SERIALIZADO', 'CATERPILLAR')
    elif cod == '08-02':
        return ('Maquinaria Amarilla', 'Retroexcavadora Müller MR406', 'POR HORA', 'SERIALIZADO', 'MULLER')
    elif cod == '08-03':
        return ('Maquinaria Amarilla', 'Minicargador Bobcat S570', 'POR HORA', 'SERIALIZADO', 'BOBCAT')
    elif cod == '08-04':
        return ('Maquinaria Amarilla', 'Retroexcavadora JCB 3CX', 'POR HORA', 'SERIALIZADO', 'JCB')

    # 2. COMPACTACION (01-)
    if 'COMPACTADORA MASALTA' in d:
        return ('Compactación', 'Compactadora / Bailarina Masalta', 'POR DIA', 'SERIALIZADO', 'MASALTA')
    if 'COMPACTADORA WAKER' in d or 'COMPACTADORA WACKER' in d:
        return ('Compactación', 'Compactadora / Bailarina Wacker Neuson', 'POR DIA', 'SERIALIZADO', 'WACKER')
    if 'COMPACTADORA MBW' in d:
        return ('Compactación', 'Compactadora / Bailarina MBW', 'POR DIA', 'SERIALIZADO', 'MBW')
    if 'VIBROPLANCHA' in d:
        marca_nom = it['marca'].title() if it['marca'] != 'N/D' else 'Estándar'
        return ('Compactación', f'Vibroplancha Compactadora ({marca_nom})', 'POR DIA', 'SERIALIZADO', it['marca'])
    if 'RODO' in d:
        if 'HOMBRE A BORDO' in d:
            if '0.80' in d or '0.8' in d:
                return ('Compactación', 'Rodillo Compactador Hombre a Bordo 0.8 TM', 'POR DIA', 'SERIALIZADO', it['marca'])
            elif '1.5' in d:
                return ('Compactación', 'Rodillo Compactador Hombre a Bordo 1.5 TM', 'POR DIA', 'SERIALIZADO', it['marca'])
            elif '3TM' in d or '3 TM' in d or 'JCB' in d:
                return ('Compactación', 'Rodillo Compactador Hombre a Bordo JCB 3 TM', 'POR DIA', 'SERIALIZADO', 'JCB')
            return ('Compactación', 'Rodillo Compactador Hombre a Bordo', 'POR DIA', 'SERIALIZADO', it['marca'])
        elif 'DOBLE' in d:
            return ('Compactación', 'Rodillo de Empuje Doble Tambor 3/4 TM', 'POR DIA', 'SERIALIZADO', it['marca'])
        else:
            return ('Compactación', 'Rodillo de Empuje Sencillo Cipsa 0.5 TM', 'POR DIA', 'SERIALIZADO', 'CIPSA')

    # 3. CONCRETO (02- / 03-)
    if 'MESCLADORA' in d or 'MEZCLADORA' in d:
        sacos = '2 Sacos' if '2' in d else ('1 Saco' if '1' in d else 'Estándar')
        m_s = 'Cipsa' if ('CIPSA' in d or 'CIPSA' in m) else ('Joper' if ('JOPER' in d or 'JOPER' in m) else it['marca'].title())
        return ('Concreto', f'Mezcladora de Concreto {sacos} ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
    if 'ALLANADORA' in d:
        return ('Concreto', 'Allanadora de Concreto 36" (Helicóptero)', 'POR DIA', 'SERIALIZADO', it['marca'])
    if 'PLATO PARA ALLANADORA' in d:
        return ('Concreto', 'Plato Flotador para Allanadora 36"', 'POR DIA', 'POR_CANTIDAD', it['marca'])
    if 'VIBRADOR' in d:
        if 'COMBUSTION' in d:
            m_s = 'Cipsa' if ('CIPSA' in d or 'CIPSA' in m) else ('Wacker Neuson' if 'WAK' in d else it['marca'].title())
            return ('Concreto', f'Vibrador de Concreto a Combustión ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
        elif 'ELECTRICO' in d:
            m_s = 'Enar' if ('ENAR' in d or 'ENAR' in m) else ('Masalta' if 'MASALTA' in d else it['marca'].title())
            return ('Concreto', f'Vibrador de Concreto Eléctrico ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
        return ('Concreto', 'Vibrador de Concreto', 'POR DIA', 'SERIALIZADO', it['marca'])
    if 'CORTADORA' in d and 'CONCRETO' in d:
        return ('Concreto', f'Cortadora de Pavimento / Concreto ({it["marca"].title()})', 'POR DIA', 'SERIALIZADO', it['marca'])
    if 'CODAL' in d:
        return ('Concreto', 'Codal de Aluminio 3.00 m', 'POR DIA', 'POR_CANTIDAD', it['marca'])
    if 'REVOCADORA' in d:
        return ('Concreto', 'Revocadora de Mortero', 'POR DIA', 'POR_CANTIDAD', it['marca'])

    # 4. BOMBAS (04-)
    if 'BOMBA' in d:
        m_s = 'MPower' if ('MPOPWER' in d or 'MPOWER' in d or 'MPOWER' in m) else it['marca'].title()
        return ('Bombeo', f'Motobomba Tragasólidos 3" ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
    if 'MANGUERA' in d:
        return ('Bombeo', 'Manguera de Descarga / Succión / Neumática', 'POR DIA', 'POR_CANTIDAD', it['marca'])

    # 5. GENERACION Y SOLDADURA (03- / 05-)
    if 'TORRE DE ILUMINACION' in d:
        m_s = 'Cipsa' if ('CIPSA' in d or 'CIPSA' in m) else ('Doosan' if 'DOOSAN' in d else ('MPower' if 'MPOWER' in d else it['marca'].title()))
        return ('Generación e Iluminación', f'Torre de Iluminación Diésel ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
    if 'SOLDADOR' in d or 'SOLDADOE' in d:
        m_s = 'Lincoln Electric' if 'LINCOLN' in d else ('MPower' if ('MPOWER' in d or 'MPOWER' in m) else it['marca'].title())
        return ('Generación e Iluminación', f'Motosoldador / Generador Diésel ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
    if 'GENERADOR' in d:
        m_s = it['marca'].title() if it['marca'] != 'N/D' else ('Truper' if 'TRUPER' in d else 'Estándar')
        return ('Generación e Iluminación', f'Generador Eléctrico ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)
    if 'ROTOMARTILLO' in d or 'DEMOLEDOR' in d:
        m_s = 'Hilti' if 'HILTI' in d else ('DeWalt' if 'DEWALT' in d else ('Milwaukee' if 'MILWAKEE' in d else it['marca'].title()))
        return ('Demolición y Perforación', f'Rotomartillo / Demoledor ({m_s})', 'POR DIA', 'SERIALIZADO', m_s)

    # 6. ENCOFRADO Y PLACAS (02-)
    if 'PLACA' in d:
        dim_m = re.search(r'(\d+)\s*X\s*(\d+)', d)
        dim = f"{dim_m.group(1)}x{dim_m.group(2)}" if dim_m else "Especial"
        return ('Encofrado y Placas', f'Placa Metálica Swymons {dim}', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'CUÑAS' in d or ('CU' in d and 'AS' in d):
        if 'ESPECIAL' in d:
            return ('Encofrado y Placas', 'Cuñas Especiales de Encofrado', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        return ('Encofrado y Placas', 'Cuñas Estándar de Encofrado', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'ALINEADOR' in d:
        return ('Encofrado y Placas', 'Alineadores de Placas', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'BARUL' in d:
        if 'BAZUKA' in d or 'CARGA' in d:
            return ('Encofrado y Placas', 'Barul de Carga Galvanizado Bazuka', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        elif 'PEQUE' in d or '1.05' in d:
            return ('Encofrado y Placas', 'Barul Galvanizado Pequeño (1.05x1.80)', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        elif 'LARGO' in d:
            return ('Encofrado y Placas', 'Barul Galvanizado Largo', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        elif 'NARANJA' in d:
            return ('Encofrado y Placas', 'Barul Convencional Naranja Grande', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        return ('Encofrado y Placas', 'Barul Galvanizado Convencional', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'ESQUINERO' in d:
        dim_m = re.search(r'(\d+)\s*X\s*(\d+)\s*X\s*(\d+)', d)
        dim = f"{dim_m.group(1)}x{dim_m.group(2)}x{dim_m.group(3)}" if dim_m else "Estándar"
        return ('Encofrado y Placas', f'Esquinero de Encofrado {dim}', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'AJUSTE' in d or 'FILLER' in d:
        dim_m = re.search(r'(\d+)\s*X\s*(\d+)\s*X\s*(\d+)', d)
        dim = f"{dim_m.group(1)}x{dim_m.group(2)}x{dim_m.group(3)}" if dim_m else "Estándar"
        return ('Encofrado y Placas', f'Ajuste Metálico Filler {dim}', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'TENSORES' in d:
        return ('Encofrado y Placas', 'Tensores de Placas', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'CABEZAL EN U' in d:
        return ('Encofrado y Placas', 'Cabezal en U para Puntal/Andamio (Canasta)', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')

    # 7. ANDAMIOS Y ALTURA (06-)
    if 'ANDAMIO' in d:
        if 'CARGA' in d:
            dim_m = re.search(r'(\d+)\s*PIES', d)
            pies = f" {dim_m.group(1)} Pies" if dim_m else ""
            return ('Andamios y Altura', f'Andamio de Carga Heavy Duty{pies}', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        elif 'CERTIFICADO' in d:
            return ('Andamios y Altura', 'Andamio Certificado Galvanizado (1.27x1.90)', 'POR DIA', 'POR_CANTIDAD', 'FORCE')
        elif 'INDUST' in d:
            return ('Andamios y Altura', 'Andamio Industrial Swymons', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
        return ('Andamios y Altura', 'Andamio Estándar Marco Metálico (BMC)', 'POR DIA', 'POR_CANTIDAD', 'BMC')
    if 'PLATAFORMA' in d:
        tipo_plat = 'Certificada' if 'CERTIFICADA' in d else 'Estándar'
        return ('Andamios y Altura', f'Plataforma de Trabajo Metálica {tipo_plat}', 'POR DIA', 'POR_CANTIDAD', it['marca'])
    if 'RODOS DE ANDAMIO' in d or 'RODOS' in d and 'ANDAMIO' in d:
        return ('Andamios y Altura', 'Rodos Giratorios con Freno para Andamio', 'POR DIA', 'POR_CANTIDAD', it['marca'])
    if 'NIVELADOR' in d:
        dim_str = '2"' if '2"' in d else '1-1/4"'
        return ('Andamios y Altura', f'Husillo Nivelador para Andamio {dim_str}', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'ESCALERAS' in d and 'ANDAMIO' in d:
        return ('Andamios y Altura', 'Escalera de Acceso Interno para Andamio', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'PLATO BASE' in d and 'ANDAMIO' in d:
        return ('Andamios y Altura', 'Plato Base para Andamio de Carga', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'PRENSA' in d and 'ANDAMIO' in d:
        return ('Andamios y Altura', 'Prensa de Fijación para Andamio', 'POR DIA', 'POR_CANTIDAD', 'SWYMONS')
    if 'ARNES' in d or 'LINEA' in d:
        return ('Andamios y Altura', 'Equipo de Protección Anticaídas (Arnés / Línea)', 'POR DIA', 'POR_CANTIDAD', it['marca'])

    # 8. TRANSPORTE (07-)
    if cod.startswith('07-') or 'CAMION' in d:
        return ('Transporte y Logística', f'Unidad de Transporte / Camión ({it["desc"]})', 'POR DIA', 'SERIALIZADO', it['marca'])

    return ('Accesorios y Varios', it['desc'].title(), 'POR DIA', 'SERIALIZADO' if c == 1 else 'POR_CANTIDAD', it['marca'])

grouped_table = defaultdict(lambda: {
    'codigos': [], 'descs_originales': set(), 'cant_total': 0,
    'tarifa': '', 'tipo_control': '', 'marca': '', 'familia': ''
})

for it in items:
    fam, prod, tar, ctrl, m = normalize_item(it)
    key = (fam, prod)
    grouped_table[key]['codigos'].append(it['codigo'])
    grouped_table[key]['descs_originales'].add(it['desc'])
    grouped_table[key]['cant_total'] += it['cant']
    grouped_table[key]['tarifa'] = tar
    grouped_table[key]['tipo_control'] = ctrl
    grouped_table[key]['marca'] = m
    grouped_table[key]['familia'] = fam

print(f"Total productos normalizados únicos: {len(grouped_table)}")
tot_unidades = sum(g['cant_total'] for g in grouped_table.values())
tot_codigos = sum(len(g['codigos']) for g in grouped_table.values())
print(f"Verificación: {tot_codigos} códigos, {tot_unidades} unidades")

# Reglas de Negocio ERP Rental Management System

Este documento detalla las reglas de negocio clave que regirán el comportamiento lógico y los cálculos financieros del **ERP Rental Management System**. Estas reglas deben ser implementadas tanto en las validaciones del Backend (NestJS) como en la interfaz del Frontend (React).

---

## 1. Gestión de Tarifas de Renta

La renta de maquinaria pesada no se calcula como un producto ordinario. Se basa en tres esquemas de tarifas de tiempo y horas de operación.

### A. Estructura de Tarifas por Períodos
El sistema manejará tres tarifas por equipo:
- **Tarifa Diaria (1-6 días)**: Tarifa base por día de renta.
- **Tarifa Semanal (7-29 días)**: Tarifa con descuento implícito, aplicable a periodos de 7 días.
- **Tarifa Mensual (30+ días)**: La tarifa más económica por día, aplicable por periodos de 30 días.

$$\text{Costo Base} = \text{Dias Rentados} \times \text{Tarifa Aplicable}$$

*Regla de Optimización de Tarifa:* Si el cliente renta por 6 días a la tarifa diaria, pero el costo total excede la tarifa semanal, el sistema automáticamente propondrá aplicar la tarifa semanal para incentivar la retención del equipo y mejorar la relación comercial.

### B. Control de Horómetros (Uso Excesivo)
La tarifa de renta estándar cubre un turno normal de trabajo de **8 horas de motor por día** (48 horas por semana, 200 horas por mes).
- En el despacho se registra el `horometro_inicial`.
- En la devolución se registra el `horometro_final`.
- El uso total de horas es $\text{Horas Usadas} = \text{horometro\_final} - \text{horometro\_inicial}$.
- Las **Horas Permitidas** se calculan como $\text{Dias de Renta} \times 8 \text{ horas/dia}$.
- Si $\text{Horas Usadas} > \text{Horas Permitidas}$, se calculará un cobro adicional por **Horas Extra**:

$$\text{Tarifa Hora Extra} = \frac{\text{Tarifa Diaria}}{8} \times 1.25 \quad (\text{Recargo del } 25\%)$$
$$\text{Cargo Extra} = (\text{Horas Usadas} - \text{Horas Permitidas}) \times \text{Tarifa Hora Extra}$$

---

## 2. Operaciones y Estados de la Maquinaria

### A. Entrega y Checklist (Despacho)
Ningún equipo puede salir de la sucursal sin un **Despacho** autorizado asociado a un **Contrato**.
- **Registro Fotográfico Obligatorio**: Al menos 4 fotos que demuestren el estado físico (frente, atrás, lateral derecho, lateral izquierdo).
- **Checklist de Seguridad**: Validación de niveles de fluidos (aceite, refrigerante), luces, frenos, alarma de reversa y llantas/orugas.
- Si el checklist reporta una falla crítica (ej. fuga de aceite hidráulico), el sistema bloqueará la entrega y cambiará el estado del equipo a `MANTENIMIENTO`.

### B. Devolución e Inspección de Daños
Al retornar el equipo:
- Se genera un acta de devolución con el horómetro actual.
- Si se detectan daños o faltantes (ej. pintura dañada por colisión, rotura de mangueras por mal uso):
  1. Se marca la devolución con `danios_detectados = true`.
  2. El equipo pasa automáticamente a `MANTENIMIENTO`.
  3. Se genera un registro de mantenimiento correctivo y se notifica al área comercial para facturar el costo de la reparación al cliente (usando el depósito en garantía).

---

## 3. Depósitos en Garantía y Facturación

### A. Depósito en Garantía
- Todos los contratos requieren un depósito en garantía calculado con base en el valor de reposición del equipo (típicamente del 10% al 20% del valor del equipo, o el equivalente a una semana de renta).
- Este depósito no se factura como ingreso; se registra como una cuenta por pagar al cliente (pasivo) hasta la devolución segura del equipo.

### B. Ciclo de Facturación
- **Rentas Cortas (< 30 días)**: Se factura el 100% por adelantado antes del despacho del equipo.
- **Rentas Largas (30+ días)**: Se factura de forma mensual anticipada. El sistema generará una factura recurrente cada 30 días automáticamente.
- **Factura de Cierre**: Al momento del retorno, se calcula el balance final (cargos por horas extras, cargos por daños, cargos por combustible faltante). Si hay saldo a favor, se devuelve el depósito; si hay saldo en contra, se aplica el depósito al pago de la factura de cierre.

---

## 4. Políticas de Mantenimiento Preventivo

Para salvaguardar la vida útil de los activos, el ERP monitoreará activamente el uso de la maquinaria pesada:
- **Mantenimiento Programado**: Se activará una alerta visual de mantenimiento preventivo cuando el equipo esté a **25 horas** de cumplir su ciclo de servicio (ej. cada 250 horas de motor de acuerdo con el horómetro).
- **Bloqueo de Renta**: Si un equipo excede en 10 horas su límite de servicio programado (ej. horómetro > 260 horas desde el último servicio), el sistema cambiará su estado a `MANTENIMIENTO` de manera autónoma y evitará que sea asignado a nuevas cotizaciones o contratos hasta que se registre el mantenimiento completado.

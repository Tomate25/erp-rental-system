# 📐 Diagramas de Arquitectura y Flujos de Trabajo ERP (Compatibles con Draw.io)

> **Instrucciones para importar en Draw.io:**
> 1. Abre [Draw.io](https://app.diagrams.net/).
> 2. En el menú superior, ve a **Arrange (Organizar) > Insert (Insertar) > Advanced (Avanzado) > Mermaid**.
> 3. Copia y pega cualquiera de los bloques de código `mermaid` que se muestran a continuación y haz clic en **Insert**.

---

## 1. 📊 Mapa General de Módulos (Activos vs. Inactivos)

```mermaid
graph TD
    classDef activo fill:#2e7d32,stroke:#1b5e20,color:#ffffff,stroke-width:2px;
    classDef inactivo fill:#c62828,stroke:#b71c1c,color:#ffffff,stroke-width:2px,stroke-dasharray: 5 5;
    classDef core fill:#1565c0,stroke:#0d47a1,color:#ffffff,stroke-width:2px;

    subgraph ERP_SYSTEM["🏗️ SISTEMA ERP DE ALQUILER DE MAQUINARIA"]
        subgraph MODULOS_ACTIVOS["✅ Módulos Activos (En Producción)"]
            A1["🔑 Autenticación & Seguridad<br/>(JWT, Sesión Única, RBAC)"]:::activo
            A2["👥 Gestión de Clientes<br/>(Directorio RFC/Empresas)"]:::activo
            A3["📦 Inventario & Catálogo<br/>(Producto Comercial vs Unidad Física)"]:::activo
            A4["📄 Cotizaciones Comerciales<br/>(Internas y Solicitud Pública)"]:::activo
            A5["📜 Gestión de Contratos<br/>(Generación desde Cotización)"]:::activo
            A6["🚚 Operaciones & Logística<br/>(Solicitudes Despacho/Retorno e Inspecciones)"]:::activo
            A7["💳 Facturación & Cobros<br/>(Facturas y Control de Pago)"]:::activo
            A8["🔧 Mantenimiento de Maquinaria<br/>(Preventivo / Correctivo)"]:::activo
            A9["⏱️ Lectura de Horómetros<br/>(Seguimiento de Horas de Uso)"]:::activo
            A10["📅 Disponibilidad & Reservas<br/>(Calendario de Maquinaria)"]:::activo
        end

        subgraph MODULOS_INACTIVOS["❌ Módulos Inactivos / Futuras Fases"]
            I1["🛒 Compras & Proveedores<br/>(Órdenes de Compra y Repuestos)"]:::inactivo
            I2["👷 Recursos Humanos & Operadores<br/>(Asignación de choferes y nómina)"]:::inactivo
            I3["📊 Contabilidad General & Libro Mayor<br/>(Asientos contables e impuestos)"]:::inactivo
            I4["📈 Reportes BI & Analytics<br/>(Dashboards ejecutivos avanzados)"]:::inactivo
            I5["📡 Telemetría GPS / IoT<br/>(Captura automática de horómetros por sensores)"]:::inactivo
        end
    end
```

---

## 2. 🔄 Flujo de Trabajo Operativo Principal (End-to-End)

Este diagrama representa el ciclo de vida completo de un equipo desde la cotización hasta el retorno y mantenimiento.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 👤 Cliente / Cliente Web
    participant Comercial as 💼 Área Comercial
    participant Inventario as 📦 Inventario / Catálogo
    participant Operaciones as 🚚 Operaciones / Logística
    participant Mantenimiento as 🔧 Mantenimiento
    participant Facturacion as 💳 Facturación

    %% Paso 1: Cotización
    Cliente->>Comercial: Solicitud de Cotización (Vía web o ejecutiva)
    Comercial->>Inventario: Consulta disponibilidad de Productos / Equipos
    Inventario-->>Comercial: Confirma disponibilidad
    Comercial->>Cliente: Envía Cotización Oficial (Estado: BORRADOR / PENDIENTE)
    Cliente->>Comercial: Aprueba Cotización (Estado: ACEPTADA)

    %% Paso 2: Contrato
    Comercial->>Operaciones: Genera Contrato de Alquiler desde Cotización (Estado: ACTIVO)

    %% Paso 3: Operaciones - Despacho
    Operaciones->>Operaciones: Registra Solicitud de Despacho (Estado: PENDIENTE -> APROBADA)
    Operaciones->>Operaciones: Crea Orden de Despacho e Inspección de Salida (Combustible, motor, fotos)
    Operaciones->>Inventario: Actualiza Equipo a Estado: DESPACHADO (o resta stock por cantidad)

    %% Paso 4: Operaciones - Retorno
    Note over Cliente,Operaciones: Maquinaria en uso por el cliente...
    Operaciones->>Operaciones: Registra Solicitud de Retorno (Recolección)
    Operaciones->>Operaciones: Crea Orden de Retorno e Inspección de Daños
    Operaciones->>Operaciones: Registra Horómetro Final y calcula Horas Trabajadas

    alt Si el equipo regresa sin daños
        Operaciones->>Inventario: Retorna Equipo a Estado: DISPONIBLE
    else Si el equipo presenta daños o requiere servicio
        Operaciones->>Mantenimiento: Registra Mantenimiento (Preventivo / Correctivo)
        Operaciones->>Inventario: Cambia Equipo a Estado: EN_MANTENIMIENTO
        Mantenimiento->>Inventario: Al completar servicio, cambia Equipo a Estado: DISPONIBLE
    end

    %% Paso 5: Facturación
    Facturacion->>Cliente: Genera Factura desde Cotización / Contrato
    Cliente->>Facturacion: Realiza pago (Factura pasa a Estado: PAGADA)
```

---

## 3. 🧩 Flujos Específicos por Módulo Activo

### A. Módulo de Inventario (Separación Producto vs. Equipo)
```mermaid
graph LR
    P[Catalog: Producto Comercial] -->|Define precio día/hora, modelo, marca| E1[Unidad Física #1: Serie ABC-01 / Horómetro: 150 hrs]
    P -->|Define precio día/hora, modelo, marca| E2[Unidad Física #2: Serie ABC-02 / Horómetro: 320 hrs]
    
    E1 --> ST{Estado del Equipo}
    ST -->|Disponible| D[DISPONIBLE]
    ST -->|Despachado| R[RENTADO / DESPACHADO]
    ST -->|Falla / Daño| M[EN_MANTENIMIENTO]
```

### B. Módulo de Operaciones (Solicitudes -> Despachos -> Retornos)
```mermaid
flowchart TD
    C[Contrato Activo] --> SD[Solicitud de Despacho]
    SD -->|Aprobación| OD[Orden de Despacho + Inspección Salida]
    OD -->|Cambia estado a DESPACHADO| EQ[Equipo en Alquiler]
    
    EQ --> SR[Solicitud de Retorno]
    SR -->|Aprobación| OR[Orden de Retorno + Inspección Daños + Horómetro]
    
    OR --> CK{¿Tiene daños?}
    CK -->|No| DISP[Equipo Disponible]
    CK -->|Sí| MAN[Orden de Mantenimiento]
```

### C. Módulo de Mantenimiento y Horómetros
```mermaid
flowchart LR
    H[Lectura de Horómetro] -->|Registra uso| EQ[Actualiza Horómetro de Equipo]
    
    M[Mantenimiento Programado] -->|En Proceso| ST1[Equipo pasa a EN_MANTENIMIENTO]
    ST1 -->|Ejecución de Mantenimiento| MT[Servicio Preventivo/Correctivo + Registro de Costos]
    MT -->|Completado| ST2[Equipo retorna a DISPONIBLE + Actualiza Horómetro Servicio]
```

---

## 📌 Módulos y su Estado de Implementación

| Módulo | Tipo | Estado Actual | Descripción |
| :--- | :--- | :--- | :--- |
| **Autenticación & Seguridad** | Backend / Frontend | 🟢 **ACTIVO** | Login, tokens JWT, verificación de sesión única por dispositivo, RBAC. |
| **Clientes** | Backend / Frontend | 🟢 **ACTIVO** | CRUD completo de clientes, datos de facturación (RFC/RUC), direcciones. |
| **Inventario** | Backend / Frontend | 🟢 **ACTIVO** | Separación entre Producto Comercial (Precios) and Equipos Físicos (Series/Horómetros). |
| **Cotizaciones** | Backend / Frontend | 🟢 **ACTIVO** | Cotizaciones internas, solicitudes públicas `/public-request`, control de versiones. |
| **Contratos** | Backend / Frontend | 🟢 **ACTIVO** | Creación de Contratos automáticos desde cotizaciones aceptadas. |
| **Operaciones** | Backend / Frontend | 🟢 **ACTIVO** | Solicitudes de Despacho/Retorno, Órdenes de Despacho e Inspecciones de Daños. |
| **Facturación** | Backend / Frontend | 🟢 **ACTIVO** | Facturación desde cotización y control de estado de pago (Pendiente / Pagada). |
| **Mantenimiento** | Backend / Frontend | 🟢 **ACTIVO** | Registro de mantenimientos preventivos y correctivos, afectación de disponibilidad. |
| **Horometros** | Backend / Frontend | 🟢 **ACTIVO** | Registro de lectura de horómetros por inspección o campo y horas trabajadas. |
| **Disponibilidad** | Backend / Frontend | 🟢 **ACTIVO** | Consulta de reservas por rango de fechas para maquinaria. |
| **Compras / Repuestos** | N/A | 🔴 **INACTIVO** | Planeado para fase futura (Gestión de proveedores y repuestos de mantenimiento). |
| **Recursos Humanos** | N/A | 🔴 **INACTIVO** | Planeado para fase futura (Asignación de operadores y choferes de transporte). |
| **Contabilidad General** | N/A | 🔴 **INACTIVO** | Planeado para fase futura (Libro mayor, balances contables e impuestos integrados). |
| **Telemetría GPS / IoT** | N/A | 🔴 **INACTIVO** | Planeado para fase futura (Captura automática de horómetros vía GPS/IoT). |

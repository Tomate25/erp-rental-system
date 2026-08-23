# 🔄 Flujos de Trabajo Detallados por Módulo (Viaje de Datos Paso a Paso)

> **Instrucciones para visualizar:**
> Copia cualquier bloque `mermaid` a continuación y pégalo en [https://mermaid.live](https://mermaid.live) o en Draw.io (**Arrange > Insert > Advanced > Mermaid**).

---

## 1. 🌐 Diagrama Global de Datos Integrado (Viaje Completo del Dato)

Este diagrama muestra cómo viaja la información entre **todos** los módulos del ERP en una transacción real de alquiler de maquinaria:

```mermaid
flowchart TD
    subgraph S1["1. AUTENTICACIÓN & SEGURIDAD"]
        U[Usuario inicia sesión] --> JWT[Token JWT generado con empresaId y roles]
        JWT --> SEC[Aislamiento Tenant en cada consulta DB]
    end

    subgraph S2["2. INVENTARIO & CATÁLOGO COMERCIAL"]
        PROD[Producto Comercial: Marca, Categoría, Precio Día/Hora] -->|Plantilla de precios| EQ[Unidad Física: Serie, Horómetro, Estado]
    end

    subgraph S3["3. COTIZACIÓN & VENTAS"]
        CLI[Cliente Seleccionado] --> COT[Cotización Comercial: BORRADOR / PENDIENTE]
        PROD -->|Selecciona modelo/precio| COT
        COT -->|Aprobación por Cliente| COT_APP[Cotización ACEPTADA]
    end

    subgraph S4["4. CONTRATO DE ALQUILER"]
        COT_APP -->|Genera Automático| CONTRATO[Contrato Activo: CON-0001]
        EQ -->|Reserva disponibilidad| CONTRATO
    end

    subgraph S5["5. OPERACIONES & LOGÍSTICA"]
        CONTRATO --> SOL_DESP[Solicitud de Despacho: SOL-DESP-0001]
        SOL_DESP -->|Aprobación Operativa| DESP[Orden de Despacho + Inspección de Salida]
        DESP -->|Actualiza Estado| EQ_RENT[Equipo Estado: DESPACHADO / RENTADO]
        
        EQ_RENT --> SOL_RET[Solicitud de Retorno: SOL-RET-0001]
        SOL_RET -->|Recolección| RET[Orden de Retorno + Inspección Daños]
    end

    subgraph S6["6. HORÓMETROS & MANTENIMIENTO"]
        RET --> LECT_HOR[Registro de Horómetro Final]
        LECT_HOR -->|Calcula horas| EQ
        
        RET -->|¿Tiene Daños?| COND{Evaluación de Estado}
        COND -->|Sin Daños| EQ_DISP[Equipo Estado: DISPONIBLE]
        COND -->|Con Daños / Mantenimiento Requerido| MAN[Mantenimiento: PREVENTIVO / CORRECTIVO]
        MAN -->|En Proceso| EQ_MAN[Equipo Estado: EN_MANTENIMIENTO]
        MAN -->|Completado| EQ_DISP
    end

    subgraph S7["7. FACTURACIÓN & COBROS"]
        COT_APP --> FAC[Factura Comercial: FAC-0001]
        FAC -->|Registro de Cobro| PAG[Factura Estado: PAGADA]
    end
```

---

## 2. 🔍 Flujo Detallado Módulo por Módulo

### 🔑 Módulo 1: Autenticación, Usuarios y Multitenancy
```mermaid
sequenceDiagram
    autonumber
    actor Usuario as 👤 Usuario ERP
    participant UI as 🖥️ Frontend (React SPA)
    participant AuthAPI as 🛡️ AuthController
    participant Strategy as 🔑 JwtStrategy
    participant DB as 🗄️ PostgreSQL (Prisma)

    Usuario->>UI: Ingresa Email y Password
    UI->>AuthAPI: POST /api/v1/auth/login
    AuthAPI->>DB: Busca Usuario por Email
    DB-->>AuthAPI: Retorna Usuario + Roles + Password Hash + SessionToken
    AuthAPI->>AuthAPI: Valida contraseña bcrypt y genera JWT
    AuthAPI->>DB: Actualiza sessionToken activo
    AuthAPI-->>UI: Devuelve Bearer JWT + User Info

    Note over UI,Strategy: Cada petición posterior incluye 'Authorization: Bearer <token>'
    UI->>Strategy: Request a Endpoint Protegido (ej. /inventory)
    Strategy->>DB: Valida si sessionToken de JWT coincide con DB (Sesión Única)
    Strategy-->>UI: Acceso permitido con empresaId e id de sucursal
```

---

### 📦 Módulo 2: Inventario (Catálogo Comercial vs. Unidades Físicas)
```mermaid
flowchart LR
    subgraph CATALOGO["Catálogo Comercial (Producto)"]
        P1[Nombre: Excavadora 20 Ton]
        P2[Marca: Caterpillar / Categoria: Amarilla]
        P3[Precio Renta Día: $250.00 / Hora: $35.00]
    end

    subgraph UNIDADES["Unidades Físicas (Equipo / Serie)"]
        E1[Serie: CAT-2024-001 / Horómetro: 120.5 hrs]
        E2[Serie: CAT-2024-002 / Horómetro: 450.0 hrs]
        E3[Serie: CAT-2024-003 / Horómetro: 890.0 hrs]
    end

    CATALOGO -->|Hereda Precios y Especificaciones| UNIDADES

    E1 --> S1[Estado: DISPONIBLE]
    E2 --> S2[Estado: DESPACHADO / EN OBRA]
    E3 --> S3[Estado: EN_MANTENIMIENTO]
```

---

### 📄 Módulo 3: Cotizaciones & Clientes
```mermaid
stateDiagram-v2
    [*] --> PublicRequest: Petición desde Sitio Web Cliente
    [*] --> Draft: Registro Interno por Ejecutivo
    PublicRequest --> Draft: Se asigna Folio COT-0001
    Draft --> EnRevision: Envío a Cliente para Revisión
    EnRevision --> Rechazada: Cliente Rechaza Cotización
    EnRevision --> NuevaVersion: Re-negociación de Precios / Equipos
    NuevaVersion --> EnRevision: Genera v2 (COT-0001-v2)
    EnRevision --> Aceptada: Cliente Aprueba Cotización
    Aceptada --> Contrato: Genera Contrato de Alquiler
    Aceptada --> Factura: Genera Factura Comercial
```

---

### 🚚 Módulo 4: Operaciones, Logística e Inspecciones
```mermaid
flowchart TD
    A[Contrato Activo CON-0001] --> B[Crear Solicitud de Despacho]
    B --> C{Aprobación Operativa}
    C -->|Rechazada| D[Solicitud Cancelada]
    C -->|Aprobada| E[Generar Orden de Despacho]
    
    E --> F[Realizar Inspección de Salida]
    F -->|Revisión de Nivel Combustible, Aceite, Llantas, Motor, Fotos| G[Checklist de Salida Aprobado]
    G --> H[Equipo pasa a Estado: DESPACHADO]
    
    H --> I[Equipo trabajando en obra del cliente]
    I --> J[Crear Solicitud de Retorno / Recolección]
    J --> K[Generar Orden de Retorno]
    K --> L[Realizar Inspección de Daños + Lectura de Horómetro Final]
    
    L --> M{¿Daños Detectados?}
    M -->|No| N[Equipo retorna a DISPONIBLE]
    M -->|Sí| O[Genera Reporte de Daños y Envía a Mantenimiento]
```

---

### 🔧 Módulo 5: Mantenimiento y Control de Horómetros
```mermaid
flowchart LR
    subgraph HOROMETRO["Módulo de Horómetros"]
        H1[Lectura Inspección Campo / Retorno] --> H2[Calcula Horas Trabajadas = Horómetro Nuevo - Anterior]
        H2 --> H3[Actualiza Horómetro Acumulado del Equipo]
    end

    subgraph MANTENIMIENTO["Módulo de Mantenimiento"]
        M1[Reporte de Daño u Horómetro de Servicio Alcanzado] --> M2[Crea Registro Mantenimiento PREVENTIVO/CORRECTIVO]
        M2 --> M3[Cambia Estado de Equipo a: EN_MANTENIMIENTO]
        M3 --> M4[Registro de Mano de Obra, Repuestos y Costos]
        M4 --> M5[Marca Mantenimiento como COMPLETADO]
        M5 --> M6[Cambia Estado de Equipo a: DISPONIBLE + Actualiza Horómetro Ultimo Servicio]
    end

    H3 -->|Dispara alerta preventivo| M1
```

---

### 💳 Módulo 6: Facturación & Cobros
```mermaid
sequenceDiagram
    autonumber
    participant Cotizacion as 📄 Cotización Aceptada
    participant Billing as 💳 BillingService
    participant FacturaDB as 🗄️ Facturas (DB)
    participant Cliente as 👤 Cliente

    Cotizacion->>Billing: invoiceQuotation(cotizacionId)
    Billing->>FacturaDB: Crea Factura con Folio FAC-0001 (Estado: PENDIENTE)
    Billing-->>Cliente: Emisión de Factura Oficial
    Cliente->>Billing: Realiza Pago de Factura
    Billing->>FacturaDB: markAsPaid(facturaId)
    FacturaDB-->>Billing: Actualiza Estado a PAGADA
```

---

## 📌 Resumen de Flujo de Datos por Módulo

| Módulo | Entrada (Input) | Proceso Principal | Salida (Output) |
| :--- | :--- | :--- | :--- |
| **Autenticación** | Email + Password | Validación bcrypt + token JWT + sesión única por dispositivo | Token JWT + Menú de Roles |
| **Clientes** | Razón Social, RFC, Contacto | Registro multitenant por `empresaId` | Cliente habilitado para Cotizar |
| **Inventario** | Producto Comercial + Datos de Equipo | Separación de Precios/Catálogo vs Series/Horómetros físicos | Equipos listos para Cotizar/Despachar |
| **Cotizaciones** | Solicitud Cliente / Precios | Cálculo de subtotales, impuestos y versiones | Cotización `ACEPTADA` o `RECHAZADA` |
| **Contratos** | Cotización `ACEPTADA` | Bloqueo de equipos y emisión de contrato `ACTIVO` | Contrato `CON-XXXX` |
| **Operaciones** | Contrato `ACTIVO` | Solicitud Despacho/Retorno + Inspección Salida/Daños | Equipos en Estado `DESPACHADO` o `RETORNO` |
| **Mantenimiento** | Inspección con Daños u Horómetro | Servicio Preventivo/Correctivo + Control de Costos | Equipo Reparado en Estado `DISPONIBLE` |
| **Horómetros** | Lectura física o en campo | Cálculo de `horasTrabajadas = horometroNuevo - anterior` | Horómetro actualizado en Equipo |
| **Facturación** | Cotización / Contrato | Generación de comprobante fiscal y gestión de cobros | Factura `PAGADA` |

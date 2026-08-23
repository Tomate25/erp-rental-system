# 🌐 Código Completo para Visualizadores Web (Mermaid Live & PlantText)

---

## 🎨 OPCIÓN 1: Visualizador Mermaid Live Editor
👉 **Sitio Web:** [https://mermaid.live](https://mermaid.live)  
*Simplemente abre el enlace, borra el texto de la izquierda y pega el siguiente código completo.*

### 1. Mapa Completo de Módulos (Activos vs Inactivos)

```mermaid
graph TD
    classDef activo fill:#2e7d32,stroke:#1b5e20,color:#ffffff,stroke-width:2px;
    classDef inactivo fill:#c62828,stroke:#b71c1c,color:#ffffff,stroke-width:2px,stroke-dasharray: 5 5;

    subgraph ERP_SYSTEM["🏗️ ERP ALQUILER DE MAQUINARIA"]
        subgraph MODULOS_ACTIVOS["✅ MÓDULOS ACTIVOS (100% OPERATIVOS)"]
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

        subgraph MODULOS_INACTIVOS["❌ MÓDULOS INACTIVOS / FUTURAS FASES"]
            I1["🛒 Compras & Proveedores<br/>(Órdenes de Compra y Repuestos)"]:::inactivo
            I2["👷 Recursos Humanos & Operadores<br/>(Asignación de choferes y nómina)"]:::inactivo
            I3["📊 Contabilidad General & Libro Mayor<br/>(Asientos contables e impuestos)"]:::inactivo
            I4["📈 Reportes BI & Analytics<br/>(Dashboards ejecutivos avanzados)"]:::inactivo
            I5["📡 Telemetría GPS / IoT<br/>(Captura automática de horómetros por sensores)"]:::inactivo
        end
    end
```

### 2. Flujo Operativo End-to-End (Ciclo de Alquiler)

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 👤 Cliente / Web
    participant Comercial as 💼 Comercial
    participant Inventario as 📦 Inventario
    participant Operaciones as 🚚 Operaciones
    participant Mantenimiento as 🔧 Mantenimiento
    participant Facturacion as 💳 Facturación

    Cliente->>Comercial: Solicitud de Cotización (Web o Ejecutiva)
    Comercial->>Inventario: Consulta disponibilidad
    Inventario-->>Comercial: Confirma disponibilidad
    Comercial->>Cliente: Cotización Oficial (PENDIENTE)
    Cliente->>Comercial: Aprueba Cotización (ACEPTADA)

    Comercial->>Operaciones: Genera Contrato (ACTIVO)
    Operaciones->>Operaciones: Solicitud de Despacho (PENDIENTE -> APROBADA)
    Operaciones->>Operaciones: Orden de Despacho + Inspección de Salida
    Operaciones->>Inventario: Equipo pasa a Estado: DESPACHADO

    Note over Cliente,Operaciones: Maquinaria en uso por el cliente...
    Operaciones->>Operaciones: Solicitud de Retorno
    Operaciones->>Operaciones: Crea Orden de Retorno + Inspección Daños + Horómetro

    alt Sin Daños
        Operaciones->>Inventario: Equipo pasa a Estado: DISPONIBLE
    else Con Daños / Mantenimiento Requerido
        Operaciones->>Mantenimiento: Registra Mantenimiento
        Operaciones->>Inventario: Equipo pasa a Estado: EN_MANTENIMIENTO
        Mantenimiento->>Inventario: Al finalizar servicio, Equipo pasa a DISPONIBLE
    end

    Facturacion->>Cliente: Emite Factura desde Cotización
    Cliente->>Facturacion: Registro de Pago (PAGADA)
```

---

## 🎨 OPCIÓN 2: Visualizador PlantText (PlantUML)
👉 **Sitio Web:** [https://www.planttext.com](https://www.planttext.com)  
*Abre PlantText y pega el siguiente código PlantUML completo.*

```plantuml
@startuml
skinparam componentStyle uml2
skinparam packageStyle rectangle

package "🏗️ SISTEMA ERP DE ALQUILER DE MAQUINARIA" {
  package "✅ MÓDULOS ACTIVOS (100% OPERATIVOS)" #LightGreen {
    [🔑 Autenticación & Seguridad] as Auth
    [👥 Gestión de Clientes] as Clients
    [📦 Inventario (Producto vs Equipo)] as Inventory
    [📄 Cotizaciones (Interna / Pública)] as Quotations
    [📜 Gestión de Contratos] as Contracts
    [🚚 Operaciones (Despacho / Retorno)] as Operations
    [💳 Facturación & Cobros] as Billing
    [🔧 Mantenimiento (Preventivo / Correctivo)] as Maintenance
    [⏱️ Lectura de Horómetros] as Horometros
    [📅 Disponibilidad & Reservas] as Availability
  }

  package "❌ MÓDULOS INACTIVOS / FUTURAS FASES" #FFCCCC {
    [🛒 Compras & Proveedores] as Purchases
    [👷 Recursos Humanos & Operadores] as HR
    [📊 Contabilidad General & Libro Mayor] as Accounting
    [📈 Reportes BI & Analytics] as Reports
    [📡 Telemetría GPS / IoT] as IoT
  }
}

Auth --> Clients
Clients --> Quotations
Quotations --> Contracts
Contracts --> Operations
Operations --> Inventory
Operations --> Horometros
Operations --> Maintenance
Quotations --> Billing

@enduml
```

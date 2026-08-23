--
-- PostgreSQL database dump
--

\restrict ozgcxS0WGFyXTwbJgJMscJST0VLXuCjUCAMYOmgqTiOQmm6xZltAxvsEon8RVan

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_sucursal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_empresa_id_fkey;
ALTER TABLE IF EXISTS ONLY public.usuario_roles DROP CONSTRAINT IF EXISTS usuario_roles_usuario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.usuario_roles DROP CONSTRAINT IF EXISTS usuario_roles_rol_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sucursales DROP CONSTRAINT IF EXISTS sucursales_empresa_id_fkey;
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS solicitudes_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rol_permisos DROP CONSTRAINT IF EXISTS rol_permisos_rol_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rol_permisos DROP CONSTRAINT IF EXISTS rol_permisos_permiso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reservas DROP CONSTRAINT IF EXISTS reservas_equipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reservas DROP CONSTRAINT IF EXISTS reservas_contrato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS pagos_factura_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.mantenimientos DROP CONSTRAINT IF EXISTS mantenimientos_equipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.facturas DROP CONSTRAINT IF EXISTS facturas_factura_padre_id_fkey;
ALTER TABLE IF EXISTS ONLY public.facturas DROP CONSTRAINT IF EXISTS facturas_contrato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.facturas DROP CONSTRAINT IF EXISTS facturas_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS equipos_sucursal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS equipos_marca_id_fkey;
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS equipos_empresa_id_fkey;
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS equipos_categoria_id_fkey;
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS devoluciones_sucursal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS devoluciones_contrato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_devolucion DROP CONSTRAINT IF EXISTS detalle_devolucion_equipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_devolucion DROP CONSTRAINT IF EXISTS detalle_devolucion_devolucion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_despacho DROP CONSTRAINT IF EXISTS detalle_despacho_equipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_despacho DROP CONSTRAINT IF EXISTS detalle_despacho_despacho_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_cotizacion DROP CONSTRAINT IF EXISTS detalle_cotizacion_equipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_cotizacion DROP CONSTRAINT IF EXISTS detalle_cotizacion_cotizacion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_contratos DROP CONSTRAINT IF EXISTS detalle_contratos_equipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_contratos DROP CONSTRAINT IF EXISTS detalle_contratos_contrato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.despachos DROP CONSTRAINT IF EXISTS despachos_sucursal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.despachos DROP CONSTRAINT IF EXISTS despachos_contrato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_asesor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_sucursal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_cotizacion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contactos_cliente DROP CONSTRAINT IF EXISTS contactos_cliente_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clientes DROP CONSTRAINT IF EXISTS clientes_empresa_id_fkey;
ALTER TABLE IF EXISTS ONLY public.auditorias DROP CONSTRAINT IF EXISTS auditorias_usuario_id_fkey;
DROP INDEX IF EXISTS public.usuarios_email_key;
DROP INDEX IF EXISTS public.sucursales_codigo_key;
DROP INDEX IF EXISTS public.roles_nombre_key;
DROP INDEX IF EXISTS public.permisos_codigo_key;
DROP INDEX IF EXISTS public.marcas_nombre_key;
DROP INDEX IF EXISTS public.facturas_folio_key;
DROP INDEX IF EXISTS public.equipos_numero_serie_key;
DROP INDEX IF EXISTS public.empresas_rfc_key;
DROP INDEX IF EXISTS public.cotizaciones_token_publico_key;
DROP INDEX IF EXISTS public.contratos_codigo_key;
DROP INDEX IF EXISTS public.contactos_cliente_email_key;
DROP INDEX IF EXISTS public.categorias_nombre_key;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.usuario_roles DROP CONSTRAINT IF EXISTS usuario_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.sucursales DROP CONSTRAINT IF EXISTS sucursales_pkey;
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS solicitudes_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.rol_permisos DROP CONSTRAINT IF EXISTS rol_permisos_pkey;
ALTER TABLE IF EXISTS ONLY public.reservas DROP CONSTRAINT IF EXISTS reservas_pkey;
ALTER TABLE IF EXISTS ONLY public.permisos DROP CONSTRAINT IF EXISTS permisos_pkey;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS pagos_pkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_pkey;
ALTER TABLE IF EXISTS ONLY public.marcas DROP CONSTRAINT IF EXISTS marcas_pkey;
ALTER TABLE IF EXISTS ONLY public.mantenimientos DROP CONSTRAINT IF EXISTS mantenimientos_pkey;
ALTER TABLE IF EXISTS ONLY public.facturas DROP CONSTRAINT IF EXISTS facturas_pkey;
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS equipos_pkey;
ALTER TABLE IF EXISTS ONLY public.empresas DROP CONSTRAINT IF EXISTS empresas_pkey;
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS devoluciones_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_devolucion DROP CONSTRAINT IF EXISTS detalle_devolucion_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_despacho DROP CONSTRAINT IF EXISTS detalle_despacho_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_cotizacion DROP CONSTRAINT IF EXISTS detalle_cotizacion_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_contratos DROP CONSTRAINT IF EXISTS detalle_contratos_pkey;
ALTER TABLE IF EXISTS ONLY public.despachos DROP CONSTRAINT IF EXISTS despachos_pkey;
ALTER TABLE IF EXISTS ONLY public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_pkey;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_pkey;
ALTER TABLE IF EXISTS ONLY public.contactos_cliente DROP CONSTRAINT IF EXISTS contactos_cliente_pkey;
ALTER TABLE IF EXISTS ONLY public.clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE IF EXISTS ONLY public.categorias DROP CONSTRAINT IF EXISTS categorias_pkey;
ALTER TABLE IF EXISTS ONLY public.auditorias DROP CONSTRAINT IF EXISTS auditorias_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.usuarios;
DROP TABLE IF EXISTS public.usuario_roles;
DROP TABLE IF EXISTS public.sucursales;
DROP TABLE IF EXISTS public.solicitudes;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.rol_permisos;
DROP TABLE IF EXISTS public.reservas;
DROP TABLE IF EXISTS public.permisos;
DROP TABLE IF EXISTS public.pagos;
DROP TABLE IF EXISTS public.notificaciones;
DROP TABLE IF EXISTS public.marcas;
DROP TABLE IF EXISTS public.mantenimientos;
DROP TABLE IF EXISTS public.facturas;
DROP TABLE IF EXISTS public.equipos;
DROP TABLE IF EXISTS public.empresas;
DROP TABLE IF EXISTS public.devoluciones;
DROP TABLE IF EXISTS public.detalle_devolucion;
DROP TABLE IF EXISTS public.detalle_despacho;
DROP TABLE IF EXISTS public.detalle_cotizacion;
DROP TABLE IF EXISTS public.detalle_contratos;
DROP TABLE IF EXISTS public.despachos;
DROP TABLE IF EXISTS public.cotizaciones;
DROP TABLE IF EXISTS public.contratos;
DROP TABLE IF EXISTS public.contactos_cliente;
DROP TABLE IF EXISTS public.clientes;
DROP TABLE IF EXISTS public.categorias;
DROP TABLE IF EXISTS public.auditorias;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."TipoMantenimiento";
DROP TYPE IF EXISTS public."TipoFactura";
DROP TYPE IF EXISTS public."TipoCobro";
DROP TYPE IF EXISTS public."MetodoPago";
DROP TYPE IF EXISTS public."EstadoSolicitud";
DROP TYPE IF EXISTS public."EstadoReserva";
DROP TYPE IF EXISTS public."EstadoNotificacion";
DROP TYPE IF EXISTS public."EstadoMantenimiento";
DROP TYPE IF EXISTS public."EstadoFactura";
DROP TYPE IF EXISTS public."EstadoEquipo";
DROP TYPE IF EXISTS public."EstadoCotizacion";
DROP TYPE IF EXISTS public."EstadoContrato";
DROP TYPE IF EXISTS public."CondicionPagoFactura";
DROP TYPE IF EXISTS public."CanalNotificacion";
--
-- Name: CanalNotificacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CanalNotificacion" AS ENUM (
    'EMAIL',
    'WHATSAPP'
);


ALTER TYPE public."CanalNotificacion" OWNER TO postgres;

--
-- Name: CondicionPagoFactura; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CondicionPagoFactura" AS ENUM (
    'CONTADO',
    'CREDITO'
);


ALTER TYPE public."CondicionPagoFactura" OWNER TO postgres;

--
-- Name: EstadoContrato; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoContrato" AS ENUM (
    'ACTIVO',
    'FINALIZADO',
    'CANCELADO',
    'EN_DISPUTA'
);


ALTER TYPE public."EstadoContrato" OWNER TO postgres;

--
-- Name: EstadoCotizacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoCotizacion" AS ENUM (
    'BORRADOR',
    'PENDIENTE',
    'ENVIADA',
    'VISTA',
    'EN_REVISION',
    'ACEPTADA',
    'RECHAZADA',
    'VENCIDA',
    'CANCELADA'
);


ALTER TYPE public."EstadoCotizacion" OWNER TO postgres;

--
-- Name: EstadoEquipo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoEquipo" AS ENUM (
    'DISPONIBLE',
    'RESERVADO',
    'RENTADO',
    'RETORNO',
    'MANTENIMIENTO',
    'BAJA'
);


ALTER TYPE public."EstadoEquipo" OWNER TO postgres;

--
-- Name: EstadoFactura; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoFactura" AS ENUM (
    'PENDIENTE',
    'PAGADA',
    'VENCIDA',
    'CANCELADA'
);


ALTER TYPE public."EstadoFactura" OWNER TO postgres;

--
-- Name: EstadoMantenimiento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoMantenimiento" AS ENUM (
    'PROGRAMADO',
    'EN_PROCESO',
    'COMPLETADO',
    'CANCELADO'
);


ALTER TYPE public."EstadoMantenimiento" OWNER TO postgres;

--
-- Name: EstadoNotificacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoNotificacion" AS ENUM (
    'PENDIENTE',
    'ENVIADO',
    'ENTREGADO',
    'FALLIDO'
);


ALTER TYPE public."EstadoNotificacion" OWNER TO postgres;

--
-- Name: EstadoReserva; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoReserva" AS ENUM (
    'PENDIENTE',
    'CONFIRMADA',
    'CANCELADA'
);


ALTER TYPE public."EstadoReserva" OWNER TO postgres;

--
-- Name: EstadoSolicitud; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoSolicitud" AS ENUM (
    'PENDIENTE',
    'COTIZADA',
    'RECHAZADA',
    'CANCELADA'
);


ALTER TYPE public."EstadoSolicitud" OWNER TO postgres;

--
-- Name: MetodoPago; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MetodoPago" AS ENUM (
    'TRANSFERENCIA',
    'TARJETA',
    'EFECTIVO',
    'CHEQUE'
);


ALTER TYPE public."MetodoPago" OWNER TO postgres;

--
-- Name: TipoCobro; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TipoCobro" AS ENUM (
    'POR_DIA',
    'POR_HORA'
);


ALTER TYPE public."TipoCobro" OWNER TO postgres;

--
-- Name: TipoFactura; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TipoFactura" AS ENUM (
    'ESTANDAR',
    'ANTICIPO',
    'RECTIFICATIVA',
    'CARGO_DANOS'
);


ALTER TYPE public."TipoFactura" OWNER TO postgres;

--
-- Name: TipoMantenimiento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TipoMantenimiento" AS ENUM (
    'PREVENTIVO',
    'CORRECTIVO'
);


ALTER TYPE public."TipoMantenimiento" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: auditorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditorias (
    id text NOT NULL,
    usuario_id text,
    accion text NOT NULL,
    entidad_tipo text NOT NULL,
    entidad_id text NOT NULL,
    detalles text NOT NULL,
    ip_direccion text NOT NULL,
    user_agent text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.auditorias OWNER TO postgres;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    is_linea_amarilla boolean DEFAULT false NOT NULL
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id text NOT NULL,
    empresa_id text NOT NULL,
    nombre text NOT NULL,
    razon_social text,
    rfc text,
    direccion text,
    email_facturacion text,
    telefono text,
    whatsapp_habilitado boolean DEFAULT false NOT NULL,
    whatsapp_numero text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    cedula text,
    condicion_pago text,
    limite_credito double precision,
    numero_cliente text,
    tel_claro text,
    tel_convencional text,
    tel_movistar text,
    vendedor text
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: contactos_cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contactos_cliente (
    id text NOT NULL,
    cliente_id text NOT NULL,
    nombre text NOT NULL,
    puesto text,
    email text NOT NULL,
    telefono text NOT NULL,
    password text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contactos_cliente OWNER TO postgres;

--
-- Name: contratos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contratos (
    id text NOT NULL,
    sucursal_id text NOT NULL,
    cliente_id text NOT NULL,
    cotizacion_id text,
    codigo text NOT NULL,
    fecha_inicio timestamp(3) without time zone NOT NULL,
    fecha_fin timestamp(3) without time zone NOT NULL,
    estado public."EstadoContrato" DEFAULT 'ACTIVO'::public."EstadoContrato" NOT NULL,
    deposito_garantia double precision DEFAULT 0.0 NOT NULL,
    condiciones text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contratos OWNER TO postgres;

--
-- Name: cotizaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cotizaciones (
    id text NOT NULL,
    cliente_id text NOT NULL,
    estado public."EstadoCotizacion" DEFAULT 'BORRADOR'::public."EstadoCotizacion" NOT NULL,
    fecha_emision timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vence timestamp(3) without time zone NOT NULL,
    subtotal double precision NOT NULL,
    iva double precision NOT NULL,
    total double precision NOT NULL,
    condiciones text,
    token_publico text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    asesor_id text,
    atencion text,
    descuento double precision DEFAULT 0 NOT NULL,
    email text,
    numero_cotizacion text NOT NULL,
    proyecto text,
    referencia text,
    telefono text,
    validez_dias integer DEFAULT 15 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    deposito_garantia double precision DEFAULT 0.0 NOT NULL
);


ALTER TABLE public.cotizaciones OWNER TO postgres;

--
-- Name: despachos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.despachos (
    id text NOT NULL,
    sucursal_id text NOT NULL,
    contrato_id text NOT NULL,
    operador_nombre text,
    vehiculo_envio text,
    fecha_despacho timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comentarios text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.despachos OWNER TO postgres;

--
-- Name: detalle_contratos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_contratos (
    id text NOT NULL,
    contrato_id text NOT NULL,
    equipo_id text NOT NULL,
    precio_renta double precision NOT NULL,
    horometro_inicial double precision NOT NULL
);


ALTER TABLE public.detalle_contratos OWNER TO postgres;

--
-- Name: detalle_cotizacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_cotizacion (
    id text NOT NULL,
    cotizacion_id text NOT NULL,
    descripcion text NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario double precision NOT NULL,
    subtotal double precision NOT NULL,
    descuento double precision DEFAULT 0 NOT NULL,
    dias integer DEFAULT 1,
    equipo_id text,
    horas integer,
    tipo_cobro public."TipoCobro" DEFAULT 'POR_DIA'::public."TipoCobro" NOT NULL
);


ALTER TABLE public.detalle_cotizacion OWNER TO postgres;

--
-- Name: detalle_despacho; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_despacho (
    id text NOT NULL,
    despacho_id text NOT NULL,
    equipo_id text NOT NULL,
    horometro double precision NOT NULL,
    checklist_ok boolean DEFAULT true NOT NULL,
    fotos_urls text[]
);


ALTER TABLE public.detalle_despacho OWNER TO postgres;

--
-- Name: detalle_devolucion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_devolucion (
    id text NOT NULL,
    devolucion_id text NOT NULL,
    equipo_id text NOT NULL,
    horometro double precision NOT NULL,
    danios_detectados boolean DEFAULT false NOT NULL,
    descripcion_danios text,
    fotos_urls text[]
);


ALTER TABLE public.detalle_devolucion OWNER TO postgres;

--
-- Name: devoluciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devoluciones (
    id text NOT NULL,
    sucursal_id text NOT NULL,
    contrato_id text NOT NULL,
    fecha_devolucion timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recibido_por text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.devoluciones OWNER TO postgres;

--
-- Name: empresas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresas (
    id text NOT NULL,
    nombre text NOT NULL,
    rfc text NOT NULL,
    email text NOT NULL,
    telefono text,
    direccion text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.empresas OWNER TO postgres;

--
-- Name: equipos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipos (
    id text NOT NULL,
    empresa_id text NOT NULL,
    sucursal_id text NOT NULL,
    categoria_id text NOT NULL,
    marca_id text NOT NULL,
    modelo text NOT NULL,
    numero_serie text,
    descripcion text,
    estado public."EstadoEquipo" DEFAULT 'DISPONIBLE'::public."EstadoEquipo" NOT NULL,
    horometro double precision DEFAULT 0.0 NOT NULL,
    precio_renta_dia double precision NOT NULL,
    costo_adquisicion double precision,
    fecha_adquisicion timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    cantidad_disponible integer DEFAULT 1 NOT NULL,
    cantidad_total integer DEFAULT 1 NOT NULL,
    codigo text,
    minimo_horas integer DEFAULT 4,
    precio_renta_hora double precision
);


ALTER TABLE public.equipos OWNER TO postgres;

--
-- Name: facturas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facturas (
    id text NOT NULL,
    cliente_id text NOT NULL,
    contrato_id text NOT NULL,
    folio text NOT NULL,
    fecha_emision timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vence timestamp(3) without time zone NOT NULL,
    estado public."EstadoFactura" DEFAULT 'PENDIENTE'::public."EstadoFactura" NOT NULL,
    subtotal double precision NOT NULL,
    iva double precision NOT NULL,
    total double precision NOT NULL,
    pdf_url text,
    xml_url text,
    condicion_pago public."CondicionPagoFactura" DEFAULT 'CONTADO'::public."CondicionPagoFactura" NOT NULL,
    corte_numero integer,
    descuento_global double precision DEFAULT 0.0 NOT NULL,
    factura_padre_id text,
    plazo_credito_dias integer,
    retencion_iva double precision DEFAULT 0.0 NOT NULL,
    tipo_factura public."TipoFactura" DEFAULT 'ESTANDAR'::public."TipoFactura" NOT NULL
);


ALTER TABLE public.facturas OWNER TO postgres;

--
-- Name: mantenimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mantenimientos (
    id text NOT NULL,
    equipo_id text NOT NULL,
    tipo public."TipoMantenimiento" NOT NULL,
    estado public."EstadoMantenimiento" DEFAULT 'PROGRAMADO'::public."EstadoMantenimiento" NOT NULL,
    fecha_programacion timestamp(3) without time zone NOT NULL,
    fecha_ejecucion timestamp(3) without time zone,
    horometro_servicio double precision NOT NULL,
    descripcion text NOT NULL,
    costo double precision DEFAULT 0.0 NOT NULL,
    insumos_utilizados text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.mantenimientos OWNER TO postgres;

--
-- Name: marcas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marcas (
    id text NOT NULL,
    nombre text NOT NULL
);


ALTER TABLE public.marcas OWNER TO postgres;

--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificaciones (
    id text NOT NULL,
    cliente_id text,
    evento text NOT NULL,
    canal public."CanalNotificacion" NOT NULL,
    destino text NOT NULL,
    asunto text,
    mensaje text NOT NULL,
    estado public."EstadoNotificacion" DEFAULT 'PENDIENTE'::public."EstadoNotificacion" NOT NULL,
    token_publico text,
    fecha_envio timestamp(3) without time zone,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notificaciones OWNER TO postgres;

--
-- Name: pagos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagos (
    id text NOT NULL,
    factura_id text NOT NULL,
    monto double precision NOT NULL,
    fecha_pago timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metodo public."MetodoPago" NOT NULL,
    referencia text,
    comprobante_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.pagos OWNER TO postgres;

--
-- Name: permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permisos (
    id text NOT NULL,
    codigo text NOT NULL,
    descripcion text
);


ALTER TABLE public.permisos OWNER TO postgres;

--
-- Name: reservas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservas (
    id text NOT NULL,
    contrato_id text NOT NULL,
    equipo_id text NOT NULL,
    fecha_inicio timestamp(3) without time zone NOT NULL,
    fecha_fin timestamp(3) without time zone NOT NULL,
    estado public."EstadoReserva" DEFAULT 'PENDIENTE'::public."EstadoReserva" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reservas OWNER TO postgres;

--
-- Name: rol_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol_permisos (
    rol_id text NOT NULL,
    permiso_id text NOT NULL
);


ALTER TABLE public.rol_permisos OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id text NOT NULL,
    nombre text NOT NULL,
    descripcion text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: solicitudes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes (
    id text NOT NULL,
    cliente_id text NOT NULL,
    fecha_uso timestamp(3) without time zone NOT NULL,
    duracion_dias integer NOT NULL,
    comentarios text,
    estado public."EstadoSolicitud" DEFAULT 'PENDIENTE'::public."EstadoSolicitud" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.solicitudes OWNER TO postgres;

--
-- Name: sucursales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sucursales (
    id text NOT NULL,
    empresa_id text NOT NULL,
    nombre text NOT NULL,
    codigo text NOT NULL,
    direccion text NOT NULL,
    telefono text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sucursales OWNER TO postgres;

--
-- Name: usuario_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_roles (
    usuario_id text NOT NULL,
    rol_id text NOT NULL
);


ALTER TABLE public.usuario_roles OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id text NOT NULL,
    empresa_id text NOT NULL,
    sucursal_id text,
    email text NOT NULL,
    password text NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    bloqueado boolean DEFAULT false NOT NULL,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    requiere_cambio_password boolean DEFAULT false NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7d95c128-7310-4996-9c63-dfe5ff86335f	b9b330f8012a5e2becd87050c12744a6253bf4e7c33d8bd80ec197531820e16b	2026-07-23 19:15:00.497916-06	20260724011500_init_database_schema	\N	\N	2026-07-23 19:15:00.166105-06	1
8f1f298e-2b42-42a2-bf52-f99ba6b8a052	44212ef3f8c132f7f79e023e79dc7663abb9c5789138b1f54fba84da688747d6	2026-07-23 22:40:59.226186-06	20260724044059_add_failed_attempts_and_lock	\N	\N	2026-07-23 22:40:59.219503-06	1
d4808e06-e012-4b23-a7c0-5488043a17e7	b96842798d5c3e7cf22aaca4d1f03dff7b0105277f84a4112aebb0ca0238d040	2026-07-23 23:04:59.324204-06	20260724050459_add_stock_quantities	\N	\N	2026-07-23 23:04:59.318665-06	1
\.


--
-- Data for Name: auditorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditorias (id, usuario_id, accion, entidad_tipo, entidad_id, detalles, ip_direccion, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, nombre, descripcion, is_linea_amarilla) FROM stdin;
b92abc2f-3484-4b25-b5c8-e36a6de54628	Elevación	\N	f
fe954eee-6d5e-45da-955b-8d5217866797	Excavación	\N	f
bd297421-8e3c-4208-b03f-41652ebe979e	Generación de Energía	\N	f
7e06189e-620d-4668-a197-f537d1e2956d	Compresión de Aire	\N	f
59f292fe-63bc-4796-b96b-de9d2abfcac5	Carga y Transporte	\N	f
4d401d0f-3dbd-4541-8769-a41ff462f3ac	COMPACTACION	\N	f
182ff0ca-4f33-4e2e-b23b-9a93115935c8	CONCRETO	\N	f
f3f3fec7-76c2-46ae-9904-431a46486ddf	DEMOLICION	\N	f
dd7e511d-6784-481d-80af-2eed9980a880	ANDAMIOS	\N	f
b19df1d2-b22f-4c0a-9b97-adbe8bfe9379	TRANSPORTE	\N	f
af16b6d5-8b0b-46b0-b0fb-215c7ff8483b	MAQUINA AMARILLA	\N	f
a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	CONCRETO Y FORMALETAS	\N	f
01b408dd-1a7f-40d3-bc0c-473041340c39	GENERADORES E ILUMINACION	\N	f
6722129a-5844-4a85-a5b2-e8b5ad62070b	BOMBAS E HIDROLAVADORAS	\N	f
999479bf-7454-4248-8a17-7d107460bedd	DEMOLICION Y PERFORACION	\N	f
df37a60f-4932-4a21-9ce9-e3c69898ee4e	ANDAMIOS Y SEGURIDAD	\N	f
003eafc6-be96-48e7-85af-5568c4d45d78	VEHICULOS Y TRANSPORTE	\N	f
f5875f65-d150-4b20-a410-77541f71b907	MAQUINARIA PESADA	\N	f
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id, empresa_id, nombre, razon_social, rfc, direccion, email_facturacion, telefono, whatsapp_habilitado, whatsapp_numero, created_at, updated_at, cedula, condicion_pago, limite_credito, numero_cliente, tel_claro, tel_convencional, tel_movistar, vendedor) FROM stdin;
857cfd46-47c3-4994-b3d6-dd12744d2e0d	fedb4b05-e281-4956-9367-5a0530976e60	EDWIN CASTILLO	\N	\N	\N	\N	5818-5515	f	\N	2026-08-07 03:00:41.124	2026-08-07 03:00:41.124	\N	CONTADO	\N	00061	\N	\N	5818-5515	NYLSKA JOHANNY GARCIA CASTILLO
1bac5d45-72bd-4344-9db3-e3ea2e72610e	fedb4b05-e281-4956-9367-5a0530976e60	GEOVANNY BERRIOS/CONSTRUMAQ	\N	J0310000304734	SABANA GRANDE-BISMARCK MARTINEZ	\N	5867-7732	f	\N	2026-08-07 03:00:41.04	2026-08-07 03:00:41.04	\N	CRÉDITO 30 DIAS	550000	00002	\N	\N	5867-7732	NYLSKA JOHANNY GARCIA CASTILLO
33a3770f-d79f-49eb-886d-09299eb8c5a1	fedb4b05-e281-4956-9367-5a0530976e60	AVINICA	\N	\N	TIPITAPA	\N	8227-5573	f	\N	2026-08-07 03:00:41.046	2026-08-07 03:00:41.046	J0310000402680	CRÉDITO 30 DIAS	36500	00003	\N	\N	8227-5573	NYLSKA JOHANNY GARCIA CASTILLO
7945d296-43e9-45ca-8d45-53600288aba4	fedb4b05-e281-4956-9367-5a0530976e60	ALDO VILLACHICA/ DISCARSA	\N	J0210000118642	KM 9.5 CARRETERA A MASAYA	\N	5700-4055	f	\N	2026-08-07 03:00:41.048	2026-08-07 03:00:41.048	001-200797-0030M	CRÉDITO 30 DIAS	36500	00004	5700-4118	\N	5700-4055	NYLSKA JOHANNY GARCIA CASTILLO
b7f95e64-067b-40e3-b6ec-5c994b1430f5	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO ALBERTO TAPIA	\N	\N	BO. SANTA ANA JINOTEPE-CARAZO	\N	5703-6587	f	\N	2026-08-07 03:00:41.051	2026-08-07 03:00:41.051	041-220956-0005V	CONTADO	\N	00005	\N	\N	5703-6587	NYLSKA JOHANNY GARCIA CASTILLO
81d6986d-f2b1-4be3-953b-73e78da286e0	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS JOSE HERNANDEZ	\N	\N	CIUDAD SANDINO ZONA N°8	\N	8584-8913	f	\N	2026-08-07 03:00:41.052	2026-08-07 03:00:41.052	001-261268-0002K	CONTADO	\N	00006	\N	\N	8584-8913	NYLSKA JOHANNY GARCIA CASTILLO
2d398565-d042-48dd-bac8-d7e780e7b5f3	fedb4b05-e281-4956-9367-5a0530976e60	ALEXANDER ANTONIO BARRERA	\N	\N	MANAGUA	\N	7540-9610	f	\N	2026-08-07 03:00:41.054	2026-08-07 03:00:41.054	201-141084-0000K	CONTADO	\N	00007	\N	\N	7540-9610	NYLSKA JOHANNY GARCIA CASTILLO
fabdb5ef-0a9e-4884-af9d-b9756ebbd4b8	fedb4b05-e281-4956-9367-5a0530976e60	BRIGIDO SEQUEIRA AGUILAR	\N	\N	MANAGUA	\N	7750-1470	f	\N	2026-08-07 03:00:41.055	2026-08-07 03:00:41.055	002-080688-0001P	CONTADO	\N	00008	\N	\N	7750-1470	ARLES DAVID CENTENO
d0cfa887-3506-4752-840f-69ea571fcd12	fedb4b05-e281-4956-9367-5a0530976e60	DICKERSON AREVALO/ ARTE&TECNICA	\N	086041276001V	MANAGUA	\N	7653-5338	f	\N	2026-08-07 03:00:41.058	2026-08-07 03:00:41.058	\N	CONTADO	\N	00009	\N	\N	7653-5338	NYLSKA JOHANNY GARCIA CASTILLO
522cc36a-b213-43fe-b6e6-80ff9f8f5695	fedb4b05-e281-4956-9367-5a0530976e60	VICTOR MARIN / EC CONSTRUCCIONES	\N	J0310000273898	MANAGUA	\N	7662-4732	f	\N	2026-08-07 03:00:41.061	2026-08-07 03:00:41.061	001-281299-1078Q	CONTADO	\N	00010	5800-6487	\N	7662-4732	NYLSKA JOHANNY GARCIA CASTILLO
28627ac0-7e0b-4059-be0a-66fad6ebc3e2	fedb4b05-e281-4956-9367-5a0530976e60	EDDY LEOPOLDO SOLORZANO	\N	\N	MASAYA	\N	8883-5216	f	\N	2026-08-07 03:00:41.064	2026-08-07 03:00:41.064	\N	CONTADO	\N	00011	\N	\N	8883-5216	NYLSKA JOHANNY GARCIA CASTILLO
f0bbf14d-b00e-4a0f-9f62-28ca080756e1	fedb4b05-e281-4956-9367-5a0530976e60	ALEJANDRO RODRIGUEZ/ IECSA	\N	J0310000071403	MASAYA-TICUANTEPE	\N	5721-7051	f	\N	2026-08-07 03:00:41.065	2026-08-07 03:00:41.065	\N	CRÉDITO 30 DIAS	360000	00012	2276-3063	\N	5721-7051	NYLSKA JOHANNY GARCIA CASTILLO
305a34f9-49ba-4c81-8a24-08b1a799758c	fedb4b05-e281-4956-9367-5a0530976e60	ARELIS OROZCO/ AMB CONSTRUCCIONES	\N	\N	MASAYA	\N	8135-3029	f	\N	2026-08-07 03:00:41.067	2026-08-07 03:00:41.067	\N	CONTADO	\N	00013	\N	\N	8135-3029	ARLES DAVID CENTENO
24ed8c0e-a6b3-4cd9-a310-bcf861d60d22	fedb4b05-e281-4956-9367-5a0530976e60	LINDA RUIZ/DINAMO S.A	\N	J0310000396558	MANAGUA	\N	8488-7878	f	\N	2026-08-07 03:00:41.068	2026-08-07 03:00:41.068	\N	CONTADO	\N	00014	\N	\N	8488-7878	NYLSKA JOHANNY GARCIA CASTILLO
ade9bc77-3faf-4215-807b-61574ee8362f	fedb4b05-e281-4956-9367-5a0530976e60	NICASIO GAITAN	\N	\N	NINDIRI-MASAYA	\N	8841-0520	f	\N	2026-08-07 03:00:41.069	2026-08-07 03:00:41.069	365-301282-0003Y	CONTADO	\N	00015	\N	\N	8841-0520	NYLSKA JOHANNY GARCIA CASTILLO
4c391123-9644-414b-9d13-c76a14dc9c94	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALONSO MORALES/ SOAGROS.A	\N	J0310000082227	GRANADA	\N	7737-1273	f	\N	2026-08-07 03:00:41.071	2026-08-07 03:00:41.071	201-301286-0006D	CONTADO	\N	00016	\N	\N	7737-1273	NYLSKA JOHANNY GARCIA CASTILLO
e912cd29-a1b1-4223-902b-76c6b7f3b961	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL ZAGUIRREZ/ COICSA	\N	J0310000055262	SAN FRANCISCO LIBRE	\N	8851-7348	f	\N	2026-08-07 03:00:41.072	2026-08-07 03:00:41.072	484-231155-0000Q	CONTADO	\N	00017	\N	\N	8851-7348	NYLSKA JOHANNY GARCIA CASTILLO
cbdea273-f70c-4676-a5c7-51e40d9e71bc	fedb4b05-e281-4956-9367-5a0530976e60	PISCINAS PACIFIC S.A /EMIR LOPEZ	\N	J0310000101698	AVENIDA BOLIBAR HOSPITAL MILITAR 21/2 C AL NORTE	\N	8679-2898	f	\N	2026-08-07 03:00:41.073	2026-08-07 03:00:41.073	001-261187-0020U	CONTADO	\N	00018	\N	\N	8679-2898	NYLSKA JOHANNY GARCIA CASTILLO
61a6712f-69d9-4612-93a8-3e54ddc69625	fedb4b05-e281-4956-9367-5a0530976e60	ISAAC HERRERA MONTENEGRO	\N	\N	BO. SAN JUAN COSTADO NORTE PARQUE SAN JUAN	\N	8272-1021	f	\N	2026-08-07 03:00:41.074	2026-08-07 03:00:41.074	161-131288-0012R	CONTADO	\N	00019	\N	\N	8272-1021	NYLSKA JOHANNY GARCIA CASTILLO
dc398535-cd43-4b29-b913-0ae921b7cd01	fedb4b05-e281-4956-9367-5a0530976e60	RADAL CONSTRUCCIONES/HUMBERTO FLORES	\N	J0310000234817	MASAYA	\N	5864-7735	f	\N	2026-08-07 03:00:41.075	2026-08-07 03:00:41.075	001-070890-0040P	CONTADO	\N	00020	\N	\N	5864-7735	ARLES DAVID CENTENO
c01d2e07-fc69-444b-9115-125b8e3c506a	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALVAREZ MALDONADO	\N	\N	\N	\N	8658-3322	f	\N	2026-08-07 03:00:41.076	2026-08-07 03:00:41.076	361-040893-0001K	CONTADO	\N	00021	\N	\N	8658-3322	NYLSKA JOHANNY GARCIA CASTILLO
aaff05ed-b644-471c-9f90-c6f2b1fafb28	fedb4b05-e281-4956-9367-5a0530976e60	MICHELLE PINO/ OPEN SERVICES S.A	\N	J0310000317763	MANAGUA	\N	8273-8347	f	\N	2026-08-07 03:00:41.077	2026-08-07 03:00:41.077	\N	CONTADO	\N	00022	\N	\N	8273-8347	NYLSKA JOHANNY GARCIA CASTILLO
bffebc82-b88e-4fd8-ab61-020fe5eda015	fedb4b05-e281-4956-9367-5a0530976e60	YELKIN ANTONIO GONZALES VASQUEZ	\N	\N	LOMAS DE GUADALUPE - MANAGUA	\N	8731-4411	f	\N	2026-08-07 03:00:41.078	2026-08-07 03:00:41.078	001-310890-0017R	CONTADO	\N	00023	\N	\N	8731-4411	NYLSKA JOHANNY GARCIA CASTILLO
bff379d1-146e-4149-ac83-7b648de085df	fedb4b05-e281-4956-9367-5a0530976e60	MILDER ANTONIO RIOS VALLE	\N	\N	MASAYA- SANTO DOMINGO	\N	8121-4717	f	\N	2026-08-07 03:00:41.079	2026-08-07 03:00:41.079	\N	CONTADO	\N	00024	\N	\N	8121-4717	NYLSKA JOHANNY GARCIA CASTILLO
00057b3c-27e2-43aa-936b-1ee1b18294ff	fedb4b05-e281-4956-9367-5a0530976e60	ISAIAS CHAVEZ CHAVEZ	\N	\N	BO. JOSE ANTONIO JINOTEPE- CARAZO	\N	8285-2416	f	\N	2026-08-07 03:00:41.08	2026-08-07 03:00:41.08	041-250178-0004E	CONTADO	\N	00025	8828-9195	\N	8285-2416	NYLSKA JOHANNY GARCIA CASTILLO
99152d47-970f-4519-99ee-7fec9e6b388b	fedb4b05-e281-4956-9367-5a0530976e60	JOSE FELIX BOLAÑOS/MISION ADVENTISTA DE NICARAGUA	\N	\N	BO. LOS SOLANOS -MANAGUA	\N	8452-6634	f	\N	2026-08-07 03:00:41.081	2026-08-07 03:00:41.081	281-110274-0000W	CONTADO	\N	00026	\N	\N	8452-6634	NYLSKA JOHANNY GARCIA CASTILLO
13243971-1225-479f-aa60-e5162c4b4e66	fedb4b05-e281-4956-9367-5a0530976e60	LESTER MALTA MORENO	\N	\N	MANAGUA	\N	8852-2309	f	\N	2026-08-07 03:00:41.083	2026-08-07 03:00:41.083	\N	CRÉDITO 30 DIAS	5000	00027	\N	\N	8852-2309	BISMARK MURILLO
3ace7da2-14e1-49e2-a24c-2456605a7281	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO DAVILA ARROLIGA	\N	\N	BO. CARLOS FONSECA SAN LORENZO-BOACO	\N	8845-1899	f	\N	2026-08-07 03:00:41.084	2026-08-07 03:00:41.084	365-170288-0002W	CONTADO	\N	00028	\N	\N	8845-1899	NYLSKA JOHANNY GARCIA CASTILLO
0e769490-2726-4031-8818-befc1a18b2a6	fedb4b05-e281-4956-9367-5a0530976e60	DENNIS MELENDEZ	\N	\N	MANAGUA	\N	8812-6436	f	\N	2026-08-07 03:00:41.085	2026-08-07 03:00:41.085	\N	CRÉDITO 30 DIAS	36500	00029	\N	\N	8812-6436	ARLES DAVID CENTENO
c9baf1b9-592e-429e-87f6-f21b8d8998c6	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ROBERTO ORDEÑANA DUARTE	\N	\N	DISTRITO N° 5	\N	8620-3392	f	\N	2026-08-07 03:00:41.086	2026-08-07 03:00:41.086	561-241270-0001H	CONTADO	\N	00030	\N	\N	8620-3392	ARLES DAVID CENTENO
a5aa36e9-7210-4bb7-aef0-6f524895c350	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR JAVIER VIVAS ACOSTA	\N	\N	BARRIO LA FUENTE	\N	7653-6856	f	\N	2026-08-07 03:00:41.087	2026-08-07 03:00:41.087	001-060786-0006Q	CONTADO	\N	00031	\N	\N	7653-6856	NYLSKA JOHANNY GARCIA CASTILLO
9f9a89c2-b63c-4717-8807-6c46247917c9	fedb4b05-e281-4956-9367-5a0530976e60	ALEJANDRO RODRIGUEZ/ IECSA	\N	J0310000071403	VERACRUZ	\N	5721-7051	f	\N	2026-08-07 03:00:41.088	2026-08-07 03:00:41.088	\N	CRÉDITO 30 DIAS	160000	00032	2276-3063	\N	5721-7051	NYLSKA JOHANNY GARCIA CASTILLO
5eaafedc-4426-47e0-9ba6-ff7f110fe0d3	fedb4b05-e281-4956-9367-5a0530976e60	LUIS MANUEL MARTINEZ AGUIRRE	\N	\N	BARRIO MEMORIAL SANDINO	\N	8841-3504	f	\N	2026-08-07 03:00:41.089	2026-08-07 03:00:41.089	\N	CONTADO	\N	00033	\N	\N	8841-3504	NYLSKA JOHANNY GARCIA CASTILLO
5d8413c6-9a19-46da-b4fc-b5d9493f83dd	fedb4b05-e281-4956-9367-5a0530976e60	ALFREDO JOSE MARTINEZ GABURARDI	\N	\N	CAMOAPA	\N	8275-3835	f	\N	2026-08-07 03:00:41.09	2026-08-07 03:00:41.09	\N	CONTADO	\N	00034	\N	\N	8275-3835	ARLES DAVID CENTENO
0af3712a-fb09-4512-b3e4-428f4890a018	fedb4b05-e281-4956-9367-5a0530976e60	JOHANDER JOSE HERNANDEZ RIOS	\N	\N	SAN MARCOS/ CARAZO	\N	8552-1288	f	\N	2026-08-07 03:00:41.092	2026-08-07 03:00:41.092	283-030387-000A	CONTADO	\N	00035	\N	\N	8552-1288	NYLSKA JOHANNY GARCIA CASTILLO
7713c832-667e-4958-aba1-8374d65ad0aa	fedb4b05-e281-4956-9367-5a0530976e60	CESAR ULISES CUAREZMA ARELLANO	\N	0012406790020B	MANAGUA	\N	7713-3739	f	\N	2026-08-07 03:00:41.092	2026-08-07 03:00:41.092	001-240679-0020B	CONTADO	\N	00036	\N	\N	7713-3739	NYLSKA JOHANNY GARCIA CASTILLO
07c2863f-5130-4fd6-9aa3-dbf1922ff6bc	fedb4b05-e281-4956-9367-5a0530976e60	AIR SOLUTION,S.A.	\N	J0310000289468	DE LOS SEMAFOROS DE LA VICKY 3C AL NORTE Y 11/2C AL ESTE.	\N	8759-2242	f	\N	2026-08-07 03:00:41.094	2026-08-07 03:00:41.094	\N	CONTADO	\N	00037	\N	2225-5527	8759-2242	NYLSKA JOHANNY GARCIA CASTILLO
1d281eb3-ebaa-4f61-8b36-680f20da8139	fedb4b05-e281-4956-9367-5a0530976e60	CONAD, CONCILIO GENERAL DE LAS ASAMBLES DE DIOS	\N	J0810000095135	ROTONDA JEAN PAUL GENIE 400MTS ABJO 200 MTS AL SUR	\N	2270-7170	f	\N	2026-08-07 03:00:41.096	2026-08-07 03:00:41.096	\N	CONTADO	\N	00038	\N	2270-7170	\N	NYLSKA JOHANNY GARCIA CASTILLO
8ab1407b-db8a-4d20-b727-9eb28683c639	fedb4b05-e281-4956-9367-5a0530976e60	SUDICON &CIA.LTDA.	\N	J0310000124108	ESTATUA DE MONSEÑOR LEZCANO 1C ALSUR, 4C AL ESTE ,MANO DERECHA.	\N	2250-0112	f	\N	2026-08-07 03:00:41.104	2026-08-07 03:00:41.104	\N	CONTADO	\N	00039	\N	2250-0112	\N	NYLSKA JOHANNY GARCIA CASTILLO
9a2928d5-046f-4f22-b557-59f9f625a813	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO JOSE SALINAS VEGA	\N	\N	ZONA 2 , DE LA IGLESIA BETANIA 75VARAS AL NORTE, CASA N#F-11	\N	5751-4197	f	\N	2026-08-07 03:00:41.105	2026-08-07 03:00:41.105	125-120782-0000A	CONTADO	\N	00040	\N	\N	5751-4197	NYLSKA JOHANNY GARCIA CASTILLO
4167f2eb-cb06-4508-a3b0-87bbb71ef3f3	fedb4b05-e281-4956-9367-5a0530976e60	MIRNA MURILLO MONTES	\N	\N	TICUANTEPE	\N	\N	f	\N	2026-08-07 03:00:41.106	2026-08-07 03:00:41.106	\N	CRÉDITO 30 DIAS	90000	00041	\N	\N	\N	YESSEL ANAHY CERPAS ARTOLA
f7872f4a-4521-40a3-b6d2-67f8cb83004e	fedb4b05-e281-4956-9367-5a0530976e60	BYRON MARTINEZ	\N	\N	MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.107	2026-08-07 03:00:41.107	\N	CRÉDITO 30 DIAS	350000	00042	\N	\N	\N	YESSEL ANAHY CERPAS ARTOLA
5ebc1123-7b5f-4a3b-af21-1b34fd05b5ab	fedb4b05-e281-4956-9367-5a0530976e60	PRINCASA (PEPSI) EXPECIALISTAS EN SOLDADURA INOXIDABLE	\N	\N	MANAGUA	\N	8679-0435	f	\N	2026-08-07 03:00:41.108	2026-08-07 03:00:41.108	\N	CONTADO	\N	00043	\N	\N	8679-0435	NYLSKA JOHANNY GARCIA CASTILLO
81569566-07a7-46da-8aae-4dec603e775c	fedb4b05-e281-4956-9367-5a0530976e60	JUAN DANILO VILLANUEVA ROSTRAN	\N	\N	\N	\N	8435-7606	f	\N	2026-08-07 03:00:41.109	2026-08-07 03:00:41.109	001-120383-0036B	CONTADO	\N	00044	\N	\N	8435-7606	NYLSKA JOHANNY GARCIA CASTILLO
dcd0808f-5275-4e1e-a6f2-28e444744a03	fedb4b05-e281-4956-9367-5a0530976e60	GERMAN RODOLFO ALEMAN SUAREZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.111	2026-08-07 03:00:41.111	001-131272-0005N	CONTADO	\N	00045	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
a315f447-e796-4a4c-bad8-89753a55460b	fedb4b05-e281-4956-9367-5a0530976e60	DISCARSA /ALDO VILLACHICA.	\N	\N	KM 9.5 C. MASAYA	WWW.discarsa.net	5700-4055	f	\N	2026-08-07 03:00:41.112	2026-08-07 03:00:41.112	\N	CONTADO	\N	00046	\N	2276-1765/ 2276-0064	5700-4055	NYLSKA JOHANNY GARCIA CASTILLO
36f86b09-db62-4263-a142-fc764d64ad5f	fedb4b05-e281-4956-9367-5a0530976e60	MEYLING ABREGO (CAFE LAS MARIAS)	\N	\N	\N	\N	8986-9471	f	\N	2026-08-07 03:00:41.114	2026-08-07 03:00:41.114	\N	CONTADO	\N	00047	\N	\N	8986-9471	NYLSKA JOHANNY GARCIA CASTILLO
926b7e32-feb7-4b07-b709-f897c5a71e78	fedb4b05-e281-4956-9367-5a0530976e60	PLUTARCO GONZALES	\N	\N	\N	\N	8883-4534	f	\N	2026-08-07 03:00:41.114	2026-08-07 03:00:41.114	\N	CONTADO	\N	00048	\N	\N	8883-4534	NYLSKA JOHANNY GARCIA CASTILLO
c79cec79-b346-4871-90be-70ad60cdbc06	fedb4b05-e281-4956-9367-5a0530976e60	MARIO ORTIZ	\N	\N	\N	\N	8689-4068	f	\N	2026-08-07 03:00:41.115	2026-08-07 03:00:41.115	\N	CONTADO	\N	00049	\N	\N	8689-4068	NYLSKA JOHANNY GARCIA CASTILLO
f6ceecc2-fd1d-4b65-b9a4-ca8b28f2d40f	fedb4b05-e281-4956-9367-5a0530976e60	ROGER PERRIRA	\N	\N	\N	\N	7821-0309	f	\N	2026-08-07 03:00:41.116	2026-08-07 03:00:41.116	\N	CONTADO	\N	00050	\N	\N	7821-0309	NYLSKA JOHANNY GARCIA CASTILLO
a0845e90-abf5-404d-96e2-01058b2e3c7a	fedb4b05-e281-4956-9367-5a0530976e60	JOSUE VIVAS (HOTEL MOZONTE)	\N	\N	\N	\N	8933-9595	f	\N	2026-08-07 03:00:41.117	2026-08-07 03:00:41.117	\N	CONTADO	\N	00051	\N	\N	8933-9595	NYLSKA JOHANNY GARCIA CASTILLO
79c733dc-5f32-41d6-ba1a-bcf941fc843c	fedb4b05-e281-4956-9367-5a0530976e60	KENNER QUIÑONES	\N	\N	\N	\N	7714-5616	f	\N	2026-08-07 03:00:41.118	2026-08-07 03:00:41.118	\N	CRÉDITO 30 DIAS	100000	00052	\N	\N	7714-5616	NYLSKA JOHANNY GARCIA CASTILLO
159a7bae-717d-4585-85ad-5666bac5b412	fedb4b05-e281-4956-9367-5a0530976e60	KENIA ROSIBEL ZAMORA CASTILLO	\N	\N	RESD. CIUDAD EL DORAL , CASA U-64 KM 18 C. NUEVA A LEON.	\N	7838-6629	f	\N	2026-08-07 03:00:41.118	2026-08-07 03:00:41.118	001-190492-0047L	CRÉDITO 30 DIAS	100000	00053	\N	\N	7838-6629	NYLSKA JOHANNY GARCIA CASTILLO
13f7f4ae-4c76-4683-a725-42b5f39fa0cc	fedb4b05-e281-4956-9367-5a0530976e60	EC CONTRUCCIONES	\N	\N	\N	\N	7662-4732	f	\N	2026-08-07 03:00:41.119	2026-08-07 03:00:41.119	\N	CONTADO	\N	00054	\N	\N	7662-4732	NYLSKA JOHANNY GARCIA CASTILLO
85e13a9a-de9f-45f2-81ad-07b0b471fe21	fedb4b05-e281-4956-9367-5a0530976e60	PALO PEREZ	\N	\N	\N	\N	8112-6625	f	\N	2026-08-07 03:00:41.12	2026-08-07 03:00:41.12	\N	CONTADO	\N	00055	\N	\N	8112-6625	NYLSKA JOHANNY GARCIA CASTILLO
55e84f97-b589-4d3f-b059-eb48ffcfa30c	fedb4b05-e281-4956-9367-5a0530976e60	JULIO CESAR VALLADARES ARAUZ	\N	\N	BO: JAVIER CUADRA, ESTATUA DE MONTOYA 4 C. AL NORTE, 85 VRS AL ESTE MANO IZQ.	\N	8881-7811	f	\N	2026-08-07 03:00:41.121	2026-08-07 03:00:41.121	001-040977-0044C	CRÉDITO 30 DIAS	18500	00056	\N	\N	8881-7811	NYLSKA JOHANNY GARCIA CASTILLO
3895cf6d-1ac3-4bc8-8fb0-5d480b27c4b3	fedb4b05-e281-4956-9367-5a0530976e60	MARIO AVELLAN	\N	\N	\N	\N	8482-6437	f	\N	2026-08-07 03:00:41.121	2026-08-07 03:00:41.121	\N	CONTADO	\N	00057	\N	\N	8482-6437	NYLSKA JOHANNY GARCIA CASTILLO
46b5cd2e-fd53-424f-b203-356f1dbe7011	fedb4b05-e281-4956-9367-5a0530976e60	DON LEOPOLDO	\N	\N	\N	\N	8883-5216	f	\N	2026-08-07 03:00:41.122	2026-08-07 03:00:41.122	\N	CONTADO	\N	00058	\N	\N	8883-5216	NYLSKA JOHANNY GARCIA CASTILLO
79fb52fc-fced-42ea-a509-bdb334ec9f62	fedb4b05-e281-4956-9367-5a0530976e60	GRUPO LEONIDAS LIZ VASQUEZ	\N	\N	\N	\N	8880-1553	f	\N	2026-08-07 03:00:41.123	2026-08-07 03:00:41.123	\N	CONTADO	\N	00059	\N	\N	8880-1553	NYLSKA JOHANNY GARCIA CASTILLO
16eec7c0-535e-4b76-a864-01766b5e3275	fedb4b05-e281-4956-9367-5a0530976e60	MARIO TAYLOR	\N	\N	\N	\N	8150-9670	f	\N	2026-08-07 03:00:41.123	2026-08-07 03:00:41.123	\N	CONTADO	\N	00060	\N	\N	8150-9670	NYLSKA JOHANNY GARCIA CASTILLO
fca8338e-9917-4eb0-8af7-7e6fb757981d	fedb4b05-e281-4956-9367-5a0530976e60	FERNANDO FONSECA	\N	\N	\N	\N	7626-3969	f	\N	2026-08-07 03:00:41.125	2026-08-07 03:00:41.125	\N	CONTADO	\N	00062	\N	\N	7626-3969	NYLSKA JOHANNY GARCIA CASTILLO
8ac38a0a-efd8-457b-96f1-5ff585a74737	fedb4b05-e281-4956-9367-5a0530976e60	ARQ AREVALO	\N	\N	\N	\N	7653-5338	f	\N	2026-08-07 03:00:41.126	2026-08-07 03:00:41.126	\N	CONTADO	\N	00063	\N	\N	7653-5338	NYLSKA JOHANNY GARCIA CASTILLO
390291ec-99f0-4a8f-b420-5ee836a737af	fedb4b05-e281-4956-9367-5a0530976e60	MAURICIO ANTONIO MAIRENA CORTEZ	\N	0011503910014Q	\N	\N	7740-7209	f	\N	2026-08-07 03:00:41.127	2026-08-07 03:00:41.127	\N	CONTADO	\N	00064	\N	\N	7740-7209	NYLSKA JOHANNY GARCIA CASTILLO
d4e30322-9c22-410f-a122-5196e237faf2	fedb4b05-e281-4956-9367-5a0530976e60	KENIA VELASQUEZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.129	2026-08-07 03:00:41.129	\N	CRÉDITO 30 DIAS	19000	00065	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
08212180-4a33-44be-8a8d-84ad2ec89855	fedb4b05-e281-4956-9367-5a0530976e60	ADAN EFRAIN AVENDAÑO ESTRADA	\N	\N	BO.OMAR TORRIJOS,DONDE FUE FERRETERIA JOROBO 3C AL SUR, 25 VRS ESTE,  CASA N. K-2	\N	\N	f	\N	2026-08-07 03:00:41.13	2026-08-07 03:00:41.13	001-010983-0033N	CONTADO	\N	00066	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
ddf318fd-73d5-409b-b4d6-02e627f82342	fedb4b05-e281-4956-9367-5a0530976e60	CLIENTE FRECUENTE	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.132	2026-08-07 03:00:41.132	\N	CONTADO	\N	00067	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
95f13251-f5d5-4492-9e46-056dc1d4888e	fedb4b05-e281-4956-9367-5a0530976e60	FRANCIS VALDIVIA RIVAS /RAFAEL GARCIA	\N	0422304700000B	IGLESIA LAS PALMAS 1 C ABAJO 20 VRS AL LAGO	\N	81161400	f	\N	2026-08-07 03:00:41.133	2026-08-07 03:00:41.133	\N	CRÉDITO 30 DIAS	54000	00068	\N	22660296	81161400	ARLES DAVID CENTENO
a82bd5ff-618d-46b5-bb0c-9e2ca83aff92	fedb4b05-e281-4956-9367-5a0530976e60	ENRIQUE ULISES ROSAS RAMIREZ(AVINICA)	\N	J0310000402680	CARRETERA NORTE TIPITAPA SAN BENITO KM 22.5 ANTIGUO POLLO ESTRELLA.	\N	\N	f	\N	2026-08-07 03:00:41.135	2026-08-07 03:00:41.135	\N	CRÉDITO 30 DIAS	36500	00069	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
c46992c1-3aa4-4a0a-bc61-31e5f876683a	fedb4b05-e281-4956-9367-5a0530976e60	OSWALDO RUGAMA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.136	2026-08-07 03:00:41.136	\N	CRÉDITO 30 DIAS	150000	00070	\N	\N	\N	ARLES DAVID CENTENO
baca3a16-b7d3-4cf4-8cde-99ac2ee05a60	fedb4b05-e281-4956-9367-5a0530976e60	ADUARDO PADILLA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.137	2026-08-07 03:00:41.137	\N	CONTADO	\N	00071	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
379b1472-1240-4c2f-9b08-baba924bc7b4	fedb4b05-e281-4956-9367-5a0530976e60	YADER ISRAEL VANEGAS ZAMORA	\N	\N	BARRIO LA FUENTE PANADERIA LA FUENTE 1 C AL SUR 1 C AL ESTE	\N	5801-0809	f	\N	2026-08-07 03:00:41.138	2026-08-07 03:00:41.138	001-271186-0032Q	CONTADO	17500	00072	\N	\N	5801-0809	ARLES DAVID CENTENO
50bcc56b-1e28-42cd-813f-a44733c79f30	fedb4b05-e281-4956-9367-5a0530976e60	CANDY MADRIZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.14	2026-08-07 03:00:41.14	\N	CRÉDITO 30 DIAS	36500	00073	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
b05e24e9-4394-4843-a939-bf372c2592e0	fedb4b05-e281-4956-9367-5a0530976e60	LIDIET DEL CARMEN GARCIA MORENO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.141	2026-08-07 03:00:41.141	601-181190-0001A	CONTADO	\N	00074	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
f31ce67e-e801-44b6-8630-a1698b4a270f	fedb4b05-e281-4956-9367-5a0530976e60	WILMER CASTRO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.142	2026-08-07 03:00:41.142	\N	CONTADO	\N	00075	\N	\N	\N	ARLES DAVID CENTENO
dafb292b-09df-4745-a39b-819a7f020347	fedb4b05-e281-4956-9367-5a0530976e60	DONALD CASTRO JARQUIN	\N	\N	\N	\N	8833-8074	f	\N	2026-08-07 03:00:41.143	2026-08-07 03:00:41.143	001-151066-0091F	CRÉDITO 30 DIAS	78000	00076	\N	\N	8833-8074	ARLES DAVID CENTENO
5dce008e-71fa-4d87-83b7-c00f34216d0c	fedb4b05-e281-4956-9367-5a0530976e60	CASA DE MI GLORIA CENTRAL(MARJURIE)	\N	J0810000095135	ROTONDA JEAN PAUL GENIE 400 MTRS ABAJO 200 MTRS AL SUR	\N	2270-7170	f	\N	2026-08-07 03:00:41.145	2026-08-07 03:00:41.145	\N	CRÉDITO 30 DIAS	90000	00077	2270-7170	\N	\N	ARLES DAVID CENTENO
27eb56fe-2bce-4140-8e5a-c4a6f3514999	fedb4b05-e281-4956-9367-5a0530976e60	ADA ROBLETO (DESAROLLOS ATLANTIC, S. A.)	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.146	2026-08-07 03:00:41.146	\N	CRÉDITO 30 DIAS	36500	00078	\N	\N	\N	ARLES DAVID CENTENO
57548311-d628-4044-bf01-f3e0fd9cbe53	fedb4b05-e281-4956-9367-5a0530976e60	XIOMARA DEL CARMEN SOTO MONTES	\N	\N	BO: CRISTO REY, DE DOMDE FUE LOS BALCONES 1 C. OESTE, 1 C. AL NORTE 10 VRS ESTE.	\N	\N	f	\N	2026-08-07 03:00:41.147	2026-08-07 03:00:41.147	001-150270-0067F	CONTADO	\N	00079	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
f1b4d7ea-4814-4b95-93bb-fb77d6ff01e1	fedb4b05-e281-4956-9367-5a0530976e60	LEONARDO MADRIGAL	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.148	2026-08-07 03:00:41.148	\N	CONTADO	\N	00080	\N	\N	\N	ARLES DAVID CENTENO
b6dc4a79-af41-480f-bc13-b2d72f767ef9	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO JOSE BERMUDEZ OBANDO	\N	\N	TEUSTEPE - BOACO CENTRO DE SALUD SANTA RITA 2 C AL NORTE 11/2 C AL OESTE	\N	8923-8003	f	\N	2026-08-07 03:00:41.149	2026-08-07 03:00:41.149	361-190190-0005S	CONTADO	100000	00081	7678-9444	\N	8923-8003	ARLES DAVID CENTENO
1bcbce32-1363-46cf-814b-36ede8b851a8	fedb4b05-e281-4956-9367-5a0530976e60	BERLING TIFFER	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.15	2026-08-07 03:00:41.15	\N	CONTADO	\N	00082	\N	\N	\N	ARLES DAVID CENTENO
49b4907a-de42-453d-85c5-5667288bf3f0	fedb4b05-e281-4956-9367-5a0530976e60	IBASA (NINOSKA)	\N	J0310000163677	\N	\N	7634-5456	f	\N	2026-08-07 03:00:41.151	2026-08-07 03:00:41.151	\N	CONTADO	\N	00083	8398-3947	\N	7634-5456	NYLSKA JOHANNY GARCIA CASTILLO
f33d619e-f8b7-4404-b1cc-7f222961f1b7	fedb4b05-e281-4956-9367-5a0530976e60	RODOLFO ESCOBAR	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.152	2026-08-07 03:00:41.152	\N	CONTADO	\N	00084	\N	\N	\N	ARLES DAVID CENTENO
268bf366-0b4b-4b12-bbae-f9f20fd10b84	fedb4b05-e281-4956-9367-5a0530976e60	STHEPANI BUSTAMMANTE	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.153	2026-08-07 03:00:41.153	\N	CRÉDITO 30 DIAS	36500	00085	\N	\N	\N	ARLES DAVID CENTENO
3ff78df7-ecd9-4646-99c1-269bd6f92c8f	fedb4b05-e281-4956-9367-5a0530976e60	HARIN ELIU CORDERO BLANDON	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.154	2026-08-07 03:00:41.154	441-100387	CONTADO	\N	00086	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
0c83c041-907e-4e80-a12f-769cb6662d45	fedb4b05-e281-4956-9367-5a0530976e60	ALFREDO ANTONIO MARTINEZ CACERES (DESARROLLO ATANTIC, S. A.)	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.156	2026-08-07 03:00:41.156	001-170285-0018A	CRÉDITO 30 DIAS	70000	00087	\N	\N	\N	ARLES DAVID CENTENO
13376258-a995-4835-b157-89996f88aabd	fedb4b05-e281-4956-9367-5a0530976e60	JOSE RUBEN VIVAS MORALES (HOTEL MOZONTE)	\N	\N	VILLA FONTANA, EDIFICIO CLARO, 5 C. AL SUR.	\N	\N	f	\N	2026-08-07 03:00:41.157	2026-08-07 03:00:41.157	001-180693-0061G	CONTADO	\N	00088	\N	\N	\N	ARLES DAVID CENTENO
39c6f7d8-ca3b-4e00-ba31-ae10ab83f805	fedb4b05-e281-4956-9367-5a0530976e60	CIRO ISAAC CRUZ AMADOR	\N	\N	VILLA LIBERTAD , FARMACIA MARREN, 3 C. AL NORTE, 25 VRS AL OESTE.	\N	\N	f	\N	2026-08-07 03:00:41.158	2026-08-07 03:00:41.158	001-160992-0022K	CONTADO	\N	00089	\N	\N	\N	ARLES DAVID CENTENO
26371cd3-5209-4dfc-b14b-33e8bc054529	fedb4b05-e281-4956-9367-5a0530976e60	HARRINTON CINCO	\N	\N	BARRIO GRENADA ENTRADA PRINCIPAL HOSPITAL MANOLO MORALES 5 C AL SUR	\N	8748-1403	f	\N	2026-08-07 03:00:41.16	2026-08-07 03:00:41.16	445-100181-0000C	CONTADO	\N	00090	\N	\N	8748-1403	ARLES DAVID CENTENO
05b68bba-25d6-4345-9fae-bdb2cd5afffa	fedb4b05-e281-4956-9367-5a0530976e60	MILTON ÑURINDA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.161	2026-08-07 03:00:41.161	001-150599-104K	CONTADO	\N	00091	\N	\N	\N	ARLES DAVID CENTENO
4e0f4636-b113-44ce-a0a0-78bb24af61fb	fedb4b05-e281-4956-9367-5a0530976e60	COMTECH	\N	\N	ALTAMIRA	\N	\N	f	\N	2026-08-07 03:00:41.162	2026-08-07 03:00:41.162	J0310000000603	CRÉDITO 30 DIAS	38000	00092	\N	\N	\N	ARLES DAVID CENTENO
475d7c97-507e-4403-b6c9-a081e800f9cb	fedb4b05-e281-4956-9367-5a0530976e60	JICCSA	\N	\N	MASAYA	\N	\N	f	\N	2026-08-07 03:00:41.164	2026-08-07 03:00:41.164	\N	CONTADO	\N	00093	\N	\N	\N	ARLES DAVID CENTENO
3ac24701-4490-4cd4-a8fb-cda2452a576e	fedb4b05-e281-4956-9367-5a0530976e60	ARIEL GARCIA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.165	2026-08-07 03:00:41.165	\N	CONTADO	\N	00094	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
20853bb1-cd56-403a-82e4-ab4ad84d6d31	fedb4b05-e281-4956-9367-5a0530976e60	CONSTRUMARKET DE NICARGUA S,A	\N	J0310000018448	MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.165	2026-08-07 03:00:41.165	\N	CRÉDITO 30 DIAS	400000	00095	\N	\N	\N	ARLES DAVID CENTENO
d3cede30-bf96-4695-8b50-a642df86aa19	fedb4b05-e281-4956-9367-5a0530976e60	RUDDY ANTONIO SANCHEZ RUGAMA	\N	\N	BO. EL RIGUERO, IGLESIA MARIA DE LOS ANGELES 1/2 C AL ESTE CASA #7	\N	8868-6724	f	\N	2026-08-07 03:00:41.166	2026-08-07 03:00:41.166	001-090987-0062Q	CONTADO	\N	00097	\N	\N	8868-6724	ARLES DAVID CENTENO
b87aabe5-5219-4c98-91e6-0bf6857591e3	fedb4b05-e281-4956-9367-5a0530976e60	ANTONIO OROZCO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.167	2026-08-07 03:00:41.167	\N	CONTADO	\N	00098	\N	\N	\N	ARLES DAVID CENTENO
d9018094-6567-4d4b-8ffd-23d93b2cca1d	fedb4b05-e281-4956-9367-5a0530976e60	CESAR SALAZAR FLORES	\N	\N	COLONIA EL PERIODISTA CASA # 4	\N	8633-1819	f	\N	2026-08-07 03:00:41.167	2026-08-07 03:00:41.167	202-051070-0000J	CONTADO	\N	00099	\N	\N	8633-1819	ARLES DAVID CENTENO
3d892fed-67eb-40d0-b3c1-7ac7846f50dc	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ARMANDO GARCIA ARUZ	\N	\N	BO. LARREYNAGA, ESQUINA NOROESTE DEL PUENTE LARREYNAGA	\N	88445065	f	\N	2026-08-07 03:00:41.168	2026-08-07 03:00:41.168	441-090783-0007R	CONTADO	\N	00100	\N	\N	88445065	AGNEL CASTILLO
f7287606-b267-406d-b087-e638fe15b22f	fedb4b05-e281-4956-9367-5a0530976e60	MIGUEL ANGEL ALARCON DIAZ	\N	\N	REPARTO CHICK TERCERA ETAPA TERMINAL DE BUSES 108-109 1 C AL SUR CASA D505	\N	8561-4964	f	\N	2026-08-07 03:00:41.169	2026-08-07 03:00:41.169	001-070970-0005R	CONTADO	\N	00101	\N	\N	8561-4964	ARLES DAVID CENTENO
ba2798d3-2c81-4ca4-a0ee-bb3b6507fa96	fedb4b05-e281-4956-9367-5a0530976e60	OLIVERA, S.A / BYRON OLIVERA	\N	J0310000351074	\N	\N	8126-2172	f	\N	2026-08-07 03:00:41.17	2026-08-07 03:00:41.17	121-300994-0001L	CRÉDITO 30 DIAS	4760000	00102	\N	2298-0220	8126-2172	ARLES DAVID CENTENO
3ffffba3-c5e1-4ab5-b6a4-c98ccbd7dad4	fedb4b05-e281-4956-9367-5a0530976e60	LUIS GARCIA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.172	2026-08-07 03:00:41.172	\N	CONTADO	\N	00103	\N	\N	\N	ARLES DAVID CENTENO
1596da34-2831-4d28-a0e4-aee94dafd443	fedb4b05-e281-4956-9367-5a0530976e60	ELVIS ESPINOZA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.191	2026-08-07 03:00:41.191	\N	CRÉDITO 30 DIAS	100000	00104	\N	\N	\N	ARLES DAVID CENTENO
c59f310e-7f67-4bb7-8983-1760a10ae3eb	fedb4b05-e281-4956-9367-5a0530976e60	TOBIAS ALVAREZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.192	2026-08-07 03:00:41.192	\N	CONTADO	\N	00105	\N	\N	\N	ARLES DAVID CENTENO
4e214672-f728-4c06-ba60-83414b2cfa02	fedb4b05-e281-4956-9367-5a0530976e60	EDUARDO PADILLA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.192	2026-08-07 03:00:41.192	\N	CRÉDITO 30 DIAS	100000	00106	\N	\N	\N	ARLES DAVID CENTENO
c2326748-d509-4e59-8d34-88eda22f8bb7	fedb4b05-e281-4956-9367-5a0530976e60	EMIR WEST	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.193	2026-08-07 03:00:41.193	\N	CRÉDITO 30 DIAS	350000	00107	\N	\N	\N	YESSEL ANAHY CERPAS ARTOLA
7279c4ba-78cd-43e5-a2fd-3767d8782f7e	fedb4b05-e281-4956-9367-5a0530976e60	BISMARCK MURILLO MONTES	\N	0010708940036N	TICUANTEPE	bismurillo@hotmail.com.ni	8657-9832	f	\N	2026-08-07 03:00:41.195	2026-08-07 03:00:41.195	001-070894-0036N	CRÉDITO 30 DIAS	600000	00109	8522-7826	\N	8657-9832	NYLSKA JOHANNY GARCIA CASTILLO
d1675582-b788-4182-854b-42917692693e	fedb4b05-e281-4956-9367-5a0530976e60	CLAUDIA ROSALES	\N	\N	\N	\N	7651-9675	f	\N	2026-08-07 03:00:41.195	2026-08-07 03:00:41.195	\N	CRÉDITO 30 DIAS	37000	00110	\N	\N	7651-9675	ARLES DAVID CENTENO
08025652-c560-4c9e-83a6-3a8328ddcc58	fedb4b05-e281-4956-9367-5a0530976e60	ING CARLOS BONE	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.196	2026-08-07 03:00:41.196	\N	CRÉDITO 30 DIAS	75000	00111	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
6ad01b2e-559b-4cff-b206-91c6441d560c	fedb4b05-e281-4956-9367-5a0530976e60	MARLON CHAVEZ / CONAD	\N	J0810000095135	CARRETERA MASAYA ESQUIPULAS	\N	8480-4913	f	\N	2026-08-07 03:00:41.197	2026-08-07 03:00:41.197	\N	CONTADO	\N	00112	\N	\N	8480-4913	NYLSKA JOHANNY GARCIA CASTILLO
4eed78ed-c182-46ec-ab14-e1b293b4e080	fedb4b05-e281-4956-9367-5a0530976e60	HALMER ROYEN VANEGAS ROSALES	\N	\N	COMARCA LOS VANEGAS	\N	77945198	f	\N	2026-08-07 03:00:41.198	2026-08-07 03:00:41.198	007-221088-001H	CONTADO	\N	00113	\N	\N	77945198	ARLES DAVID CENTENO
928b0064-bb7a-4a96-94c6-3a114a978f72	fedb4b05-e281-4956-9367-5a0530976e60	MARLON ANTONIO RODRIGUEZ TREJOS	\N	\N	BO. LOMA LINDA MANAGUA	\N	7868-2399	f	\N	2026-08-07 03:00:41.198	2026-08-07 03:00:41.198	001-181085-0023K	CONTADO	\N	00114	\N	\N	7868-2399	ARLES DAVID CENTENO
ad76443d-2186-4271-99bc-32cb96e6e2e2	fedb4b05-e281-4956-9367-5a0530976e60	RAMON ANTONIO SARAVIA MENDEZ	\N	\N	BARRIO CANADA SURESTE	\N	81064349	f	\N	2026-08-07 03:00:41.199	2026-08-07 03:00:41.199	361-190990-0004T	CONTADO	\N	00115	\N	\N	81064349	ARLES DAVID CENTENO
3c000435-dc19-4989-bbf2-5e68f5d8dfa5	fedb4b05-e281-4956-9367-5a0530976e60	FRANKLIN FRANCISCO PEREZ LOPEZ	\N	\N	VILLA ESPERANZA	\N	81352862	f	\N	2026-08-07 03:00:41.199	2026-08-07 03:00:41.199	001-051285-0054D	CONTADO	\N	00116	\N	\N	81352862	ARLES DAVID CENTENO
a803d15d-cd84-43b8-a785-9d752b78437f	fedb4b05-e281-4956-9367-5a0530976e60	RONY LOPEZ	\N	\N	\N	\N	89216315	f	\N	2026-08-07 03:00:41.2	2026-08-07 03:00:41.2	\N	CONTADO	\N	00117	\N	\N	89216315	ARLES DAVID CENTENO
ebec781a-377c-4e16-a8fa-4395efafd896	fedb4b05-e281-4956-9367-5a0530976e60	YERIS ANTONIO GARCIA MADRIGAL	\N	\N	VERACRUZ EL CALVARIO 1/2 C AL ESTE	\N	81573361	f	\N	2026-08-07 03:00:41.201	2026-08-07 03:00:41.201	401-010881-0000N	CONTADO	\N	00118	\N	\N	81573361	ARLES DAVID CENTENO
43cde3c0-0306-46c8-a123-e6da809f16f8	fedb4b05-e281-4956-9367-5a0530976e60	MIGUEL ANGEL PEREZ AGUIRE	\N	\N	C SANDINO ZONA 8 PARADA DE BUS 280	\N	78743695	f	\N	2026-08-07 03:00:41.202	2026-08-07 03:00:41.202	001-270889-0064P	CONTADO	\N	00119	\N	\N	78743695	ARLES DAVID CENTENO
1209d438-02b8-428a-bf69-bdc6b241d264	fedb4b05-e281-4956-9367-5a0530976e60	NAP INGENIEROS S,A	\N	J0310000002436	REPARTO SAN JUAN REGISTRO DE LA PROPIEDAD 100 MTS NORTE, 200 MTS ESTE, 15 MTS SUR CASA 194	\N	82193213	f	\N	2026-08-07 03:00:41.202	2026-08-07 03:00:41.202	\N	CRÉDITO 30 DIAS	55000	00120	2270-9997	\N	82193213	ARLES DAVID CENTENO
083671fc-004b-469c-9c21-7cae1e5d2aad	fedb4b05-e281-4956-9367-5a0530976e60	ROGER ANTONIO PAVON ROMERO	\N	\N	CMCA SAN PEDRO, KM 17 CARRETERA A MASAYA	\N	8542-7353	f	\N	2026-08-07 03:00:41.203	2026-08-07 03:00:41.203	007-130892-0000C	CONTADO	\N	00121	\N	\N	8542-7353	ARLES DAVID CENTENO
15be8fbd-5c9e-4e1f-9f7a-1024353a4d86	fedb4b05-e281-4956-9367-5a0530976e60	ISAMAR DE LOS ANGELES SILVA CALERO	\N	\N	\N	\N	89986313	f	\N	2026-08-07 03:00:41.203	2026-08-07 03:00:41.203	001-160492-0009N	CONTADO	\N	00122	\N	\N	89986313	ARLES DAVID CENTENO
16fc159f-fa61-4bc5-9264-df8ebff612b7	fedb4b05-e281-4956-9367-5a0530976e60	NORMAN MENDOZA/ RIGOBERTO ENMANUEL MENDOZA	\N	\N	CMCA SANTA ANITA KM 10.5 CARRETERA SUR	\N	\N	f	\N	2026-08-07 03:00:41.204	2026-08-07 03:00:41.204	161-250387-000B	CONTADO	\N	00123	\N	\N	\N	AGNEL CASTILLO
a2f32491-654b-4223-bb5f-cbf9f1bc04ce	fedb4b05-e281-4956-9367-5a0530976e60	JUNIELKA ISAMAR MENDOZA LEIVA/ MULTISERVICIOS MENDOZA	\N	\N	LOMAS DE GUADALUPE BOMBA 168 5 C ARRIBA	\N	84397582	f	\N	2026-08-07 03:00:41.205	2026-08-07 03:00:41.205	449-220498-0001B	CRÉDITO 30 DIAS	1000000	00124	\N	\N	84397582	ARLES DAVID CENTENO
3a4b9294-9c89-468a-ab58-2a9eac1d3a35	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO YASSIN CAJINA GUTIERREZ	\N	\N	RESD. VILLA CAROLINA N°2 KM 13.2 CARRETERA A MASAYA CASA N°17	\N	\N	f	\N	2026-08-07 03:00:41.205	2026-08-07 03:00:41.205	001-130782-0031E	CONTADO	\N	00125	\N	\N	\N	ARLES DAVID CENTENO
ec8d4e08-ac68-4da5-b5c4-7cc2e7fdd83a	fedb4b05-e281-4956-9367-5a0530976e60	MILTON EDWARD SILVA HERNANDEZ / SUNLIGHTLED	\N	J0910000258570	CMCA LAS VIUDAS UNAN 4 KM S. MANAGUA	\N	8750-9847	f	\N	2026-08-07 03:00:41.206	2026-08-07 03:00:41.206	001-041187-0057M	\N	\N	00126	\N	\N	8750-9847	ARLES DAVID CENTENO
2d68d949-fd27-42b7-a82f-37a6fbe1c75e	fedb4b05-e281-4956-9367-5a0530976e60	MARIANO JOSE VALLE HERNANDEZ	\N	\N	BO. BERTHA CALDERON	\N	8776-3718	f	\N	2026-08-07 03:00:41.208	2026-08-07 03:00:41.208	001-270888-0016S	\N	\N	00127	\N	\N	8776-3718	NYLSKA JOHANNY GARCIA CASTILLO
45bc61e9-ffd8-4445-b1de-e98c63993764	fedb4b05-e281-4956-9367-5a0530976e60	GENERACION SOLAR	\N	\N	\N	\N	8385-2580	f	\N	2026-08-07 03:00:41.368	2026-08-07 03:00:41.368	\N	CRÉDITO 30 DIAS	37000	00315	\N	\N	8385-2580	AGNEL CASTILLO
5eac8b00-a01c-4ffc-8329-0d20cc833f6b	fedb4b05-e281-4956-9367-5a0530976e60	LINO JOSE LOPEZ LOPEZ	\N	\N	NIQUIBOHOMO BARIO MARIA AUXILIADORA	\N	78328950	f	\N	2026-08-07 03:00:41.208	2026-08-07 03:00:41.208	406-240993-0000R	CRÉDITO 15 DIAS	18000	00128	\N	\N	78328950	ARLES DAVID CENTENO
fcd3d6d6-b282-4f50-bb81-368ccdb58bd8	fedb4b05-e281-4956-9367-5a0530976e60	ENPREMAR  / OSCAR MARENCO	\N	\N	SEMAFAROS DE  LA CAÑADA 1C ARRIBA	\N	58594911	f	\N	2026-08-07 03:00:41.21	2026-08-07 03:00:41.21	\N	CRÉDITO 30 DIAS	70000	00129	58594911	\N	\N	ARLES DAVID CENTENO
d3b41fff-4751-4b11-be0d-524feb21c90c	fedb4b05-e281-4956-9367-5a0530976e60	JORDAN ALFONSO MARENCO LEYVA	\N	\N	BARRIO SAN FRANCISCO DE ASIS POZO DE ENACAL 1 C AL ESTE 3 C AL SUR	\N	8385-2196	f	\N	2026-08-07 03:00:41.211	2026-08-07 03:00:41.211	0010-160404-0049J	CONTADO	\N	00130	\N	\N	8385-2196	ARLES DAVID CENTENO
4ae1a0ff-6698-415e-942e-9f8674305311	fedb4b05-e281-4956-9367-5a0530976e60	INVERSIONES PANORAMA	\N	J0310000087423	KM 13 CARRETERA MASAYA 100 MTRS AL SUR OESTE	\N	89270270	f	\N	2026-08-07 03:00:41.212	2026-08-07 03:00:41.212	J0310000087423	CONTADO	\N	00131	\N	\N	89270270	ARLES DAVID CENTENO
b83a3955-c5b1-4f02-9d73-32fe5937ea35	fedb4b05-e281-4956-9367-5a0530976e60	JOSE DANIEL ESTRADA HERNANDEZ	\N	\N	CMCA SANTO DOMINGO KM 10.5 CARRETERA A MASAYA 150 VRS S.	\N	8815-8134	f	\N	2026-08-07 03:00:41.213	2026-08-07 03:00:41.213	001-221182-0066N	\N	\N	00132	8905-6975	\N	8815-8134	ARLES DAVID CENTENO
2ce4969c-8432-45c9-82a1-10debfe58bb8	fedb4b05-e281-4956-9367-5a0530976e60	NORGEN UZIEL ALTAMIRANO JUAREZ	\N	\N	ESTELI  BARIO ALFREDO LAZO	\N	57945508	f	\N	2026-08-07 03:00:41.215	2026-08-07 03:00:41.215	161-050594-0006P	CONTADO	\N	00133	57945508	\N	\N	ARLES DAVID CENTENO
698bc707-1048-4666-bbbd-17af563e06a9	fedb4b05-e281-4956-9367-5a0530976e60	CONCILIO GENERAL DE LAS ASAMBLEAS DE DIOS	\N	\N	ROTONDA JEAN PAUL 400 MTR ABAJO 200 MTR AL SUR	\N	\N	f	\N	2026-08-07 03:00:41.216	2026-08-07 03:00:41.216	J0810000095165	CRÉDITO 15 DIAS	18312	00134	\N	\N	\N	ARLES DAVID CENTENO
a781caf8-a29c-4df4-95fb-9058e67b5166	fedb4b05-e281-4956-9367-5a0530976e60	CHELSEA BLANDON / IESHUA FERNANDO UMAÑA GUERRERO	\N	\N	BO. SAN FRANCISCO GASOLINERA PUMA LOS BRASILES 2C N. 1C E.	\N	8805-0183	f	\N	2026-08-07 03:00:41.217	2026-08-07 03:00:41.217	001-220206-1035V	CRÉDITO 30 DIAS	36000	00135	\N	\N	8805-0183	NYLSKA JOHANNY GARCIA CASTILLO
9e5aa9ac-4194-492e-9ffb-f762f8f06c07	fedb4b05-e281-4956-9367-5a0530976e60	ADELAYDA PATRICIA ZELEDON CASTILLO / IGLESIA EL ALFARERO	\N	\N	VA GOTHEL KM 14 CARRETERA A MASAYA 4.5 KM HACIA VERACRUZ	\N	8488-8869	f	\N	2026-08-07 03:00:41.217	2026-08-07 03:00:41.217	001-290975-0007P	CONTADO	\N	00136	\N	\N	8488-8869	NYLSKA JOHANNY GARCIA CASTILLO
e1b48183-9ef3-48e8-bf25-c301ca091b89	fedb4b05-e281-4956-9367-5a0530976e60	FERNANDO JOSE OBANDO VIVAS/GEOPAV.	\N	\N	\N	\N	8420-9403	f	\N	2026-08-07 03:00:41.218	2026-08-07 03:00:41.218	001-110584-0031B	CRÉDITO 30 DIAS	37000	00137	\N	\N	8420-9403	NYLSKA JOHANNY GARCIA CASTILLO
bc610243-4c4a-4609-86d6-747385af0bc7	fedb4b05-e281-4956-9367-5a0530976e60	KEYLA VARGAS / RIVER SALGADO	\N	5672106870000F	COLONIA MIGUEL BONILLA COMEDOR UNAM 3 C AL SUR CASA # 156	\N	8472-3959	f	\N	2026-08-07 03:00:41.22	2026-08-07 03:00:41.22	441-100979-0008E	CRÉDITO 15 DIAS	15000	00138	\N	\N	8472-3959	ARLES DAVID CENTENO
d2b5e155-1263-451b-aa05-da9330c93266	fedb4b05-e281-4956-9367-5a0530976e60	ALBA NUBIA ARANA SELVA	\N	\N	BO. ENRIQUE SMITH, ROTONDA SANTO DOMINGO 20 VRS N M/D	\N	7758-4440	f	\N	2026-08-07 03:00:41.221	2026-08-07 03:00:41.221	001-131097-1005B	\N	\N	00139	\N	\N	7758-4440	NYLSKA JOHANNY GARCIA CASTILLO
c663b002-a409-4749-beb8-57b73923b33e	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ANTONIO ÑURINDA TORREZ	\N	\N	RUBENIA CASA K - 18	\N	88899399	f	\N	2026-08-07 03:00:41.222	2026-08-07 03:00:41.222	001-300777-0063D	CRÉDITO 15 DIAS	18500	00140	\N	\N	88899399	ARLES DAVID CENTENO
1a01a1d3-463e-4ad1-8664-661bd7f652b3	fedb4b05-e281-4956-9367-5a0530976e60	REGINA DE LOS ANGELES DAVILA REYES	\N	\N	BO. ZONA CENTRAL IGLESIA EL CALVARIO 1/2 C N LA CONQUISTA/CARAZO	\N	8511-9249	f	\N	2026-08-07 03:00:41.223	2026-08-07 03:00:41.223	001-060198-1005W	\N	\N	00141	\N	\N	8511-9249	ARLES DAVID CENTENO
3c519214-db91-483d-a9fb-d87488223386	fedb4b05-e281-4956-9367-5a0530976e60	FRANKLIN ANTONIO AGUIRRE VELASQUEZ	\N	\N	C SANDINO ZONA 5 TERMINAL RUTA 115 1C AL SUR 1C AL ESTE CASA A -13	\N	\N	f	\N	2026-08-07 03:00:41.224	2026-08-07 03:00:41.224	001-090988-0069S	CONTADO	\N	00142	\N	\N	\N	ARLES DAVID CENTENO
0b2a28d2-5aab-476b-ac8c-a50b4be5070e	fedb4b05-e281-4956-9367-5a0530976e60	GLADIS MARIA JARQUIN OROZCO	\N	\N	\N	\N	86855137	f	\N	2026-08-07 03:00:41.224	2026-08-07 03:00:41.224	450-230969-0001L	CONTADO	\N	00143	\N	\N	86855137	ARLES DAVID CENTENO
192546c9-51f7-4a57-93db-520df06d9cd2	fedb4b05-e281-4956-9367-5a0530976e60	OMAR FRANCISCO PANIAGUA CASTRO / KREATIVOS PROMOCIONALES	\N	0010801890011U	BO. SANTA ROSA CASA DE LAS MANGUERAS 3 1/2 C / MANAGUA	\N	8493-6055	f	\N	2026-08-07 03:00:41.226	2026-08-07 03:00:41.226	001-280991-0035F	\N	\N	00144	\N	\N	8493-6055	NYLSKA JOHANNY GARCIA CASTILLO
9aa55150-199e-461d-84b4-d6c474a293b1	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ANTONIO PALACIOS MEDRANO	\N	\N	VILLA FONTANA SUR CLUB TERAZA 2.4 KM AL SUR	\N	82729083	f	\N	2026-08-07 03:00:41.226	2026-08-07 03:00:41.226	001-230567-0006S	CONTADO	\N	00145	\N	\N	82729083	AGNEL CASTILLO
330bcde8-b343-4739-8cb0-66a850776a35	fedb4b05-e281-4956-9367-5a0530976e60	JADER URY MARENCO	\N	\N	MONTE FRESCO  KM15.5 C SUR	\N	77317931	f	\N	2026-08-07 03:00:41.227	2026-08-07 03:00:41.227	001-031090-0060Q	CONTADO	\N	00146	\N	\N	77317931	AGNEL CASTILLO
a1c83bbc-dedf-4735-87bc-d4b92fcc74e1	fedb4b05-e281-4956-9367-5a0530976e60	KEVIN NAVARRO/ TINTA PUBLICIDAD	\N	J031 0000 453136	\N	\N	8391-5889	f	\N	2026-08-07 03:00:41.228	2026-08-07 03:00:41.228	\N	\N	\N	00147	\N	\N	8391-5889	NYLSKA JOHANNY GARCIA CASTILLO
d64cba68-0be9-4e57-8828-ba28ff78a317	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALBERTO NARVAEZ WEIMAR	\N	\N	\N	\N	15294184	f	\N	2026-08-07 03:00:41.229	2026-08-07 03:00:41.229	001-060882-0033X	CONTADO	\N	00148	\N	\N	15294184	ARLES DAVID CENTENO
ae82fe95-6a21-4fdc-b529-56a848d13e6a	fedb4b05-e281-4956-9367-5a0530976e60	MILAGROS DE LOS ANGELES ALEMAN GAITAN / TECNOVISION	\N	\N	BO. CARLOS FONSECA DISTRIBUIDORA LIBERTAD 75 VRS S	\N	8822-5852	f	\N	2026-08-07 03:00:41.23	2026-08-07 03:00:41.23	408-240289-0001D	\N	\N	00149	\N	\N	8822-5852	AGNEL CASTILLO
8e3bdf49-192d-45ce-86d8-832d35c9cb65	fedb4b05-e281-4956-9367-5a0530976e60	CREA SOLUCIONES S,A	\N	J0310000250375	CENTRO COMERCIAL MANAGUA FERETERIA EL CENTRO	\N	\N	f	\N	2026-08-07 03:00:41.231	2026-08-07 03:00:41.231	\N	CRÉDITO 30 DIAS	1000000	00150	\N	\N	\N	ARLES DAVID CENTENO
882ab849-352c-479c-ba9e-a044ac8d176b	fedb4b05-e281-4956-9367-5a0530976e60	ENGEL GUTIERREZ / PROYECTOS	\N	\N	\N	\N	8927-6481	f	\N	2026-08-07 03:00:41.231	2026-08-07 03:00:41.231	\N	CRÉDITO 30 DIAS	37000	00151	\N	\N	8927-6481	NYLSKA JOHANNY GARCIA CASTILLO
7b4266ad-5cc8-46ad-a470-f55c4a2f6b6d	fedb4b05-e281-4956-9367-5a0530976e60	DELMAR GALARZA / GALARZAS Y VILCHEZ	\N	\N	\N	\N	89500303	f	\N	2026-08-07 03:00:41.232	2026-08-07 03:00:41.232	\N	CRÉDITO 30 DIAS	18500	00152	\N	\N	89500303	ARLES DAVID CENTENO
f5c2912f-11cc-4c7c-a648-0c3f3fc49a45	fedb4b05-e281-4956-9367-5a0530976e60	AMERICAN SUNSHINE TECH SOCIEDA /MANUEL VILLALOBOS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.233	2026-08-07 03:00:41.233	\N	\N	\N	00153	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
352b2609-567f-47d9-99e1-de50d5bc69c9	fedb4b05-e281-4956-9367-5a0530976e60	RICARDO JOSE HERNANDEZ POTOY	\N	\N	GRANADA REPARTO SABANETA BILLARES CASTILLO 21/2 C ESTE	\N	81795519	f	\N	2026-08-07 03:00:41.234	2026-08-07 03:00:41.234	2012710880009B	CONTADO	\N	00154	\N	\N	81795519	ARLES DAVID CENTENO
71b75868-9f16-442f-8d07-c8c37a92f133	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO SOZA OROZCO	\N	\N	BARIO STA ELENA ENTRADA PRINCIPAL 8 C AL NORTE	\N	77342713	f	\N	2026-08-07 03:00:41.234	2026-08-07 03:00:41.234	449-040181-0002U	CRÉDITO 15 DIAS	30000	00155	\N	\N	77342713	ARLES DAVID CENTENO
a1186d88-43e8-4c7f-9041-b7094fde99d8	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO ANTONIO BONILLA / SOLUCIONES VIALES S.A	\N	J031 0000 120862	BA. PEDRO JOAQUIN CHAMORRO CASA HACIENDA 5C O 1/2 C N CASA NH-23	\N	8925-7744	f	\N	2026-08-07 03:00:41.236	2026-08-07 03:00:41.236	001-190970-0018G	\N	\N	00156	8841-0520	\N	8925-7744	NYLSKA JOHANNY GARCIA CASTILLO
d897a202-4698-48a7-8d59-e25cc4189911	fedb4b05-e281-4956-9367-5a0530976e60	CLAUDIA MARIELA ESTRADA ZUNIGA	\N	\N	RESIDEN. RUBENIA CENTRO ESCOLAR RUBENIA 1 1/2 C E. CASA N°B-6 M/I	\N	\N	f	\N	2026-08-07 03:00:41.237	2026-08-07 03:00:41.237	001-100176-0083X	\N	\N	00157	\N	\N	\N	ARLES DAVID CENTENO
89dc6660-327e-4c59-8664-ce2846745ba9	fedb4b05-e281-4956-9367-5a0530976e60	JOSEPH ISAIAS  CHIRIBOGA GONZALES	\N	\N	REPARTO CAMILO ORTEGA DONDE FUE LA ROCARGO 4 C AL NORTE 1 C AL ESTE 20 VRS AL SUR	\N	8643-1400	f	\N	2026-08-07 03:00:41.238	2026-08-07 03:00:41.238	001-141101-1078L	CRÉDITO 30 DIAS	36500	00158	\N	\N	8643-1400	ARLES DAVID CENTENO
adb84790-bc49-4ef2-b45c-0aaa4971b893	fedb4b05-e281-4956-9367-5a0530976e60	RONALD GRANADOS	\N	\N	\N	\N	8882-4117	f	\N	2026-08-07 03:00:41.239	2026-08-07 03:00:41.239	\N	\N	\N	00159	\N	\N	8882-4117	NYLSKA JOHANNY GARCIA CASTILLO
5edaa60d-ad72-4874-897f-af970eba1c22	fedb4b05-e281-4956-9367-5a0530976e60	SERVICIOS DE INGENIERIA GAUBY S,A	\N	J0310000388741	\N	SERVICIOSDEINGENIERIAGAUBY@GMAIL.COM	8988-2346	f	\N	2026-08-07 03:00:41.241	2026-08-07 03:00:41.241	\N	CRÉDITO 15 DIAS	80000	00160	8469-4070	8852-4391	8988-2346	ARLES DAVID CENTENO
4b4fe9ae-7041-4454-9fd4-9ecc63dcd817	fedb4b05-e281-4956-9367-5a0530976e60	JIMMI JOSUE LOPEZ	\N	\N	BO. 18 DE MAYO, CENTRO DE SALUD WALTER FERRETY 6 C O 1/2 C S	\N	8266-2651	f	\N	2026-08-07 03:00:41.241	2026-08-07 03:00:41.241	001-271192-0056J	\N	\N	00161	8886-6371	\N	8266-2651	NYLSKA JOHANNY GARCIA CASTILLO
8fe27cc7-5b50-4ed5-a50d-b2cd4df95f88	fedb4b05-e281-4956-9367-5a0530976e60	CASA MCGREGOR	\N	J031 000000 5737	\N	\N	\N	f	\N	2026-08-07 03:00:41.243	2026-08-07 03:00:41.243	\N	\N	\N	00162	\N	\N	\N	ARLES DAVID CENTENO
a4181608-6a7d-4fcc-baad-6f77a5618ec5	fedb4b05-e281-4956-9367-5a0530976e60	ARQ. ADILIA LUNA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.243	2026-08-07 03:00:41.243	\N	\N	\N	00164	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
21bdbd96-3326-436e-8724-bda1c380f9b1	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO JOSE ZAPATA SOBALVARRO / SERVICIOS GRANELEROS SIETE MR	\N	J031 0000 386935	MANAGUA	\N	5757-7337	f	\N	2026-08-07 03:00:41.244	2026-08-07 03:00:41.244	001-120882-0012N	\N	\N	00165	\N	\N	5757-7337	NYLSKA JOHANNY GARCIA CASTILLO
0ff54a59-6b92-4e6b-8e3d-0daaa471df2d	fedb4b05-e281-4956-9367-5a0530976e60	VICTOR MANUEL CERDA BRICEÑO/ CONSTRUCCION Y CONSULTORIA CERDA INGENIEROS S.A	\N	J031 0000 259534	BO. SANTA JUANA ESCUELA DE TALENTO 2 C S	\N	\N	f	\N	2026-08-07 03:00:41.245	2026-08-07 03:00:41.245	001-200287-0009L	\N	\N	00167	\N	\N	\N	ARLES DAVID CENTENO
5c874719-76a4-4224-bed5-1b208ca3e8ce	fedb4b05-e281-4956-9367-5a0530976e60	EDDY ANTONIO PAVON AGUIRRE	\N	\N	BO. SAN IGNMACIO KM 25 CARRETERA LA CONCEPCION/ MASAYA	\N	8850-5277	f	\N	2026-08-07 03:00:41.246	2026-08-07 03:00:41.246	409-211183-0000E	\N	\N	00168	\N	\N	8850-5277	NYLSKA JOHANNY GARCIA CASTILLO
153bde5b-25b3-43f7-a374-72d4970246e0	fedb4b05-e281-4956-9367-5a0530976e60	GICCSA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.247	2026-08-07 03:00:41.247	\N	CRÉDITO 30 DIAS	100000	00169	\N	\N	\N	ARLES DAVID CENTENO
fc5a2017-9f9b-49e9-8d95-72a9b95666e0	fedb4b05-e281-4956-9367-5a0530976e60	MAURICIO JOSE DELGADO TALAVERA	\N	\N	BO. SAN SEBASTIAN MITAB 2 C N 175 MTRS E CASA N° 1003	\N	8880-0111	f	\N	2026-08-07 03:00:41.248	2026-08-07 03:00:41.248	202-201071-0003P	\N	\N	00170	\N	\N	8880-0111	NYLSKA JOHANNY GARCIA CASTILLO
8f69e630-de9e-4c72-8e20-e61be526687f	fedb4b05-e281-4956-9367-5a0530976e60	MULTI INVERSIONES INMOBILIARIAS /HAROLD GIOVANY PEREZ BARRIOS	\N	\N	COLONIA PRIMERO DE MAYO CASA B-569	\N	86101518	f	\N	2026-08-07 03:00:41.249	2026-08-07 03:00:41.249	001-280475-0036L	CONTADO	\N	00171	\N	\N	86101518	ARLES DAVID CENTENO
0bb3b880-57a8-4542-8554-5ea0f191938c	fedb4b05-e281-4956-9367-5a0530976e60	SERVIMNIC/ WILBER JOSE GUEVARA MARTINEZ	\N	0010412840020u	CALLE 27 DE MAYO DEL PALI 1.2 C ARRIBA	gerencia@servimnic.com	7710-3240	f	\N	2026-08-07 03:00:41.251	2026-08-07 03:00:41.251	001-041284-0020U	CONTADO	\N	00172	\N	\N	7710-3240	ARLES DAVID CENTENO
f6f4245d-8711-4d86-aa24-b4eaf5d0c3ff	fedb4b05-e281-4956-9367-5a0530976e60	JOSE RENE HERNANADEZ QUINTERO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.252	2026-08-07 03:00:41.252	001-070787-0018A	CONTADO	\N	00173	\N	\N	\N	AGNEL CASTILLO
22f05f6e-f64d-4348-bf08-f2b5d1e316d0	fedb4b05-e281-4956-9367-5a0530976e60	MILTON JOSUE RUEDA GUZMAN	\N	\N	RESIDENCIAL LOS CORTEZ CASA G-9	\N	81410240	f	\N	2026-08-07 03:00:41.253	2026-08-07 03:00:41.253	001-040794-0053T	CONTADO	\N	00174	\N	\N	81410240	ARLES DAVID CENTENO
d2b93d19-ed26-4d35-aa8d-0ab898c23fa9	fedb4b05-e281-4956-9367-5a0530976e60	SILVIO JOSE BORGEN FLORES	\N	\N	RTO SAN JUAN CASA 580	\N	88512008	f	\N	2026-08-07 03:00:41.253	2026-08-07 03:00:41.253	001-120182-0003H	CONTADO	\N	00176	\N	\N	88512008	ARLES DAVID CENTENO
8a138945-521a-4047-9082-8cc3dadfbc77	fedb4b05-e281-4956-9367-5a0530976e60	RAYMUNDO ANTONIO GUTIEREZ GARCIA	\N	\N	BARIO SAN JUAN POLICIA 1 C AL SUR JINOTEPE	\N	86651047	f	\N	2026-08-07 03:00:41.254	2026-08-07 03:00:41.254	408-150358-0002K	CRÉDITO 15 DIAS	73248	00177	\N	\N	86651047	ARLES DAVID CENTENO
13c336e1-c0e9-4171-8ee9-40224b996734	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR	\N	\N	\N	\N	84371830	f	\N	2026-08-07 03:00:41.255	2026-08-07 03:00:41.255	\N	CONTADO	\N	00178	\N	\N	84371830	ARLES DAVID CENTENO
c45ab603-4058-40b3-9d6d-24bfdf843945	fedb4b05-e281-4956-9367-5a0530976e60	HARLING HAZEL LEZCANO HERRERA	\N	0030108810007Y	CMCA ZAMBRANO DEL CEMENTERIO 2C AL SUR, 1/2 C AL ESTE, TIPITAPA	\N	5501-6379	f	\N	2026-08-07 03:00:41.256	2026-08-07 03:00:41.256	001-171203-1046D	CONTADO	\N	00179	\N	\N	5501-6379	ARLES DAVID CENTENO
8001ef34-5fb6-4e6c-855a-66bcb23ed3ca	fedb4b05-e281-4956-9367-5a0530976e60	JOHNY JUNIOR RIVERA RIVERA	\N	\N	\N	\N	7866-8441	f	\N	2026-08-07 03:00:41.257	2026-08-07 03:00:41.257	\N	CRÉDITO 30 DIAS	37000	00180	\N	\N	7866-8441	NYLSKA JOHANNY GARCIA CASTILLO
736ab222-78ef-48ed-9bb3-736461d85385	fedb4b05-e281-4956-9367-5a0530976e60	ELIETH  DE LOS ANGELES  OBANDO MALTEZ	\N	\N	BARRIO WALTER FERRETI DONDE FUE CENTRO DE SALUD 1 C ABAJO	\N	7825-0747	f	\N	2026-08-07 03:00:41.257	2026-08-07 03:00:41.257	001-030492-0025C	CONTADO	\N	00181	\N	\N	7825-0747	ARLES DAVID CENTENO
3e789d2f-aee0-4322-ad76-f9a414b35782	fedb4b05-e281-4956-9367-5a0530976e60	JHONNY RODAS	\N	\N	\N	\N	89884513	f	\N	2026-08-07 03:00:41.258	2026-08-07 03:00:41.258	\N	CONTADO	\N	00183	\N	\N	89884513	AGNEL CASTILLO
a7b5b595-ef0a-4f36-884a-7562d3639ef1	fedb4b05-e281-4956-9367-5a0530976e60	MARIO ALBERTO TORRES RIVAS	\N	\N	\N	\N	85597283	f	\N	2026-08-07 03:00:41.259	2026-08-07 03:00:41.259	\N	CONTADO	\N	00184	\N	\N	85597283	AGNEL CASTILLO
3ac8f467-9e87-4b4e-8589-aa1d0514ab98	fedb4b05-e281-4956-9367-5a0530976e60	AIR SOLUTION, S.A	\N	\N	\N	\N	82446588	f	\N	2026-08-07 03:00:41.26	2026-08-07 03:00:41.26	\N	CONTADO	\N	00185	88834050	\N	82446588	AGNEL CASTILLO
66126be8-9585-4ae4-ab9a-d6197b36ed75	fedb4b05-e281-4956-9367-5a0530976e60	ERICK ARMANDO REYES MEMBREÑO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.261	2026-08-07 03:00:41.261	001-070488-0053N	CONTADO	\N	00186	\N	\N	\N	AGNEL CASTILLO
0c1f5c72-77b8-4ec5-a358-caf873fec2d7	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO JOEL ALFARO PALACIOS	\N	\N	CM CHIQUILISTAGUA KM 14 CARRETERA VIEJA LEON 600 VRS NORTE	\N	85900994	f	\N	2026-08-07 03:00:41.262	2026-08-07 03:00:41.262	001-300590-0032L	CONTADO	\N	00187	\N	\N	85900994	AGNEL CASTILLO
cf6fc137-ea68-4e6d-a65a-44cd0c169481	fedb4b05-e281-4956-9367-5a0530976e60	MARWELL JOSE PEÑA REYES/ SIMPLIFICALO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.263	2026-08-07 03:00:41.263	\N	CONTADO	\N	00188	\N	\N	\N	AGNEL CASTILLO
14128142-25d6-406a-8487-f60cf7ba65a5	fedb4b05-e281-4956-9367-5a0530976e60	WALTER JAVIER GARCIA SUAZO	\N	\N	BO PANTASMA HOSPITAL MANOLO MORALES 1 C AL SUR 1/2 C AL OESTE 35 VRS AL NORTE CASA A-21	\N	84576077	f	\N	2026-08-07 03:00:41.265	2026-08-07 03:00:41.265	\N	\N	\N	00189	\N	\N	84576077	AGNEL CASTILLO
4584be61-5874-4348-9d18-59f5ccc8b54e	fedb4b05-e281-4956-9367-5a0530976e60	L-C CONSTRUYEN / ARIEL GARCIA	\N	J0310000144400	PISTA EL MAYOREO FARMACIA RECONCILIACION 50 MTRS ABAJO	\N	85650396	f	\N	2026-08-07 03:00:41.266	2026-08-07 03:00:41.266	\N	CRÉDITO 15 DIAS	109872	00190	2252-1070	\N	85650396	ARLES DAVID CENTENO
cfadef87-f75a-4d9c-bd08-4efe20cffbbf	fedb4b05-e281-4956-9367-5a0530976e60	MUNKEL S.A /HARDING ENRIQUE ORTEGA RIVERA	\N	\N	\N	\N	82728139	f	\N	2026-08-07 03:00:41.267	2026-08-07 03:00:41.267	\N	CONTADO	\N	00191	\N	\N	82728139	AGNEL CASTILLO
b6b0f992-e28b-435a-b6dc-0278674f55e1	fedb4b05-e281-4956-9367-5a0530976e60	EDDY ARIEL HERNANDEZ SANCHEZ	\N	\N	CM LA BORGOYA CENTRO DE SALUD 250 VR-TICUANTEPE	\N	89741818	f	\N	2026-08-07 03:00:41.268	2026-08-07 03:00:41.268	007-040578-0000P	\N	\N	00192	\N	\N	89741818	AGNEL CASTILLO
f2399f76-2312-4689-89a1-57751d63af60	fedb4b05-e281-4956-9367-5a0530976e60	EMPRESA HOLDIN S,A / ADA ROBLETO	\N	J0310000435979	\N	\N	8957-6732	f	\N	2026-08-07 03:00:41.269	2026-08-07 03:00:41.269	\N	CRÉDITO 30 DIAS	73248	00193	\N	\N	8957-6732	ARLES DAVID CENTENO
4a1b47c8-e593-4017-a43e-3a93b851474c	fedb4b05-e281-4956-9367-5a0530976e60	LT SUDICONS / CARLOS LARGAESPADA	\N	J0310000124108	ESTATUA MONSEÑOR LEZCANO 1 C AL SUR 4 C AL ESTE	CELATOSUDICONS@HOTMAIL.COM	8877-6006	f	\N	2026-08-07 03:00:41.271	2026-08-07 03:00:41.271	\N	CRÉDITO 30 DIAS	37000	00194	8505-1978	2250-0112	8877-6006	ARLES DAVID CENTENO
be5e2203-2032-45cb-81f6-88a5058d9b19	fedb4b05-e281-4956-9367-5a0530976e60	SIMA ( JORGE EDUARDO SANCHEZ MOLINA	\N	\N	REPARTO MANUEL DE JESUS RIVERA CASA B-27	\N	8642-6048	f	\N	2026-08-07 03:00:41.271	2026-08-07 03:00:41.271	\N	CONTADO	\N	00195	\N	\N	8642-6048	NYLSKA JOHANNY GARCIA CASTILLO
cc5e70c6-0233-44a1-9193-6a33a5fbf25d	fedb4b05-e281-4956-9367-5a0530976e60	MARJORIE SCARLETH MORALES MIRANDA	\N	\N	BARRIO ORONTE CENTENO PARADA COLEGIO GASPAR GARCIA 3 C AL ESTE  TIPITAPA	\N	8100-3489	f	\N	2026-08-07 03:00:41.272	2026-08-07 03:00:41.272	001-110101-1071G	CONTADO	\N	00196	\N	\N	8100-3489	ARLES DAVID CENTENO
47727d49-81e9-4eb9-8484-8a28393c2b94	fedb4b05-e281-4956-9367-5a0530976e60	JONATHAN DAVID MENDIETA CRUZ	\N	\N	BARRIO SAN JUDAS CEIBO 3 C AL SUR 5 C OESTE	\N	\N	f	\N	2026-08-07 03:00:41.273	2026-08-07 03:00:41.273	001-080995-0059R	CONTADO	\N	00197	\N	\N	\N	ARLES DAVID CENTENO
f3d600ec-55d6-4ceb-ab21-b94b4fea0b2c	fedb4b05-e281-4956-9367-5a0530976e60	BOOZER OTTO SAMUEL	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.274	2026-08-07 03:00:41.274	B260-657-66-338-0	\N	\N	00198	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
90e8c878-ef2e-4096-8f42-018afb931696	fedb4b05-e281-4956-9367-5a0530976e60	JIMMI JHON ARAGON ESPINALES	\N	\N	VILLA RECONCILIACION PLANTA ELECTRICA 11/2 C AL OESTE	\N	84034326	f	\N	2026-08-07 03:00:41.275	2026-08-07 03:00:41.275	127-041078-0006N	CONTADO	\N	00200	\N	\N	84034326	ARLES DAVID CENTENO
5d07e538-134f-4a60-a9bc-43948492cd24	fedb4b05-e281-4956-9367-5a0530976e60	OSWALDO CORTEZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.276	2026-08-07 03:00:41.276	\N	CONTADO	\N	00201	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
49f66cb2-7d59-4db7-8173-0f5ca4181f1e	fedb4b05-e281-4956-9367-5a0530976e60	JORGE LUIS ZUNIGA ORTIZ	\N	\N	COMARCA EL RAIZON KM 201/2 C MASAYA 800 VRS AL NORTE	\N	8774-8068	f	\N	2026-08-07 03:00:41.277	2026-08-07 03:00:41.277	001-080875-0000E	CRÉDITO 15 DIAS	19000	00202	\N	\N	8774-8068	ARLES DAVID CENTENO
afec8035-4d92-44f3-b208-153dd2627cb6	fedb4b05-e281-4956-9367-5a0530976e60	OSWALDO MEZA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.277	2026-08-07 03:00:41.277	\N	CONTADO	\N	00203	\N	\N	\N	ARLES DAVID CENTENO
9f3eb139-bda0-4e79-95a0-9404841b9537	fedb4b05-e281-4956-9367-5a0530976e60	FREDDY JAVIER ALFARO PEREZ/CONALFASA	\N	\N	BO NACIONES UNIDAS, RUTS 108/109, 2C ESTE ,4C SUR, CASA B32	\N	\N	f	\N	2026-08-07 03:00:41.278	2026-08-07 03:00:41.278	001-091287-0015J	CRÉDITO 30 DIAS	30000	00204	\N	\N	\N	AGNEL CASTILLO
2835ef68-835b-4d4f-9293-038adeb55618	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL VILLALOBOS	\N	\N	\N	\N	5826-3133	f	\N	2026-08-07 03:00:41.279	2026-08-07 03:00:41.279	\N	CRÉDITO 30 DIAS	100000	00205	\N	\N	5826-3133	NYLSKA JOHANNY GARCIA CASTILLO
e8ff3f5b-e5d6-4ea2-ab44-3ed51dd46c4e	fedb4b05-e281-4956-9367-5a0530976e60	JUANA DE JESUS ESPAÑA/ COCME	\N	J091 0000 108525	BO. SAN CRISTOBAL SEMAFAROS EL DORADO 20 VRAS S. CASA N°1	\N	8425-7669	f	\N	2026-08-07 03:00:41.28	2026-08-07 03:00:41.28	001-010763-0045W	\N	\N	00206	\N	\N	8425-7669	NYLSKA JOHANNY GARCIA CASTILLO
2ef19ffb-531a-41dc-a5b2-a76b968f8427	fedb4b05-e281-4956-9367-5a0530976e60	ROGER ANTONIO CORTEZ ACOSTA	\N	\N	BO:MARTIN LUTHER KING,CDI AURA LILA MENDOZA 3C. ESTE.	\N	\N	f	\N	2026-08-07 03:00:41.281	2026-08-07 03:00:41.281	001-101279-006F	CRÉDITO 30 DIAS	45000	00207	\N	\N	\N	ARLES DAVID CENTENO
94c75aeb-8ad2-4fa7-adac-83458292f9e6	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ESPINOZA	\N	\N	\N	\N	8639-5958	f	\N	2026-08-07 03:00:41.282	2026-08-07 03:00:41.282	\N	CONTADO	\N	00208	\N	\N	8639-5958	ARLES DAVID CENTENO
cfdb105c-8c82-4006-9773-87510d973b3e	fedb4b05-e281-4956-9367-5a0530976e60	ELVIS COREA	\N	\N	\N	\N	5745-5138	f	\N	2026-08-07 03:00:41.282	2026-08-07 03:00:41.282	\N	CONTADO	\N	00209	\N	\N	5745-5138	ARLES DAVID CENTENO
8a6517b8-e478-49e6-b10a-e96c4d53b8f9	fedb4b05-e281-4956-9367-5a0530976e60	DENIS ALFREDO CALERO RAMIREZ	\N	\N	BO;CUBA, PUEBTE GADALA MARIA AC OESTE,25 VRS SUR MANI IZQ	\N	88770622	f	\N	2026-08-07 03:00:41.283	2026-08-07 03:00:41.283	001-141169-0025W	CONTADO	\N	00210	\N	\N	88770622	NYLSKA JOHANNY GARCIA CASTILLO
d11deb1e-2b08-42b1-b081-0c296e87b66b	fedb4b05-e281-4956-9367-5a0530976e60	DANIEL ANTONIO SANTANA REYES	\N	\N	BARIO SANTA ROSA DEL PUENTE 30 DE MAYO 120 VRS AL OESTE	\N	8691-1609	f	\N	2026-08-07 03:00:41.284	2026-08-07 03:00:41.284	401-310385-0001A	CONTADO	\N	00211	\N	\N	8691-1609	ARLES DAVID CENTENO
be8d38ce-a850-4db4-b18f-b0d5becaa591	fedb4b05-e281-4956-9367-5a0530976e60	WALTER JAVIER GONZALES FLORES	\N	\N	BARIO AMERCAS 1 GRUPO D ANDEN 4 CASA 1760	\N	8852-4491	f	\N	2026-08-07 03:00:41.285	2026-08-07 03:00:41.285	001-080865-0067G	CONTADO	\N	00212	\N	\N	8852-4491	ARLES DAVID CENTENO
3addb335-38db-46c8-b777-d0f246a82c9c	fedb4b05-e281-4956-9367-5a0530976e60	AMILCAR JOSE PEREZ ALVARADO	\N	\N	\N	\N	8362-2357	f	\N	2026-08-07 03:00:41.287	2026-08-07 03:00:41.287	281-250874-0014G	CRÉDITO 30 DIAS	37000	00213	\N	\N	8362-2357	ARLES DAVID CENTENO
358f83d7-ad65-402e-bc54-79b1e2c7d2e5	fedb4b05-e281-4956-9367-5a0530976e60	SANTIAGO ADOLFO TENORIO SANCHEZ	\N	\N	RPTO BIELL BIENNEN KEISER 3 C AL SUR SAN MARCOS	\N	8943-2235	f	\N	2026-08-07 03:00:41.288	2026-08-07 03:00:41.288	041-081181-0000M	CONTADO	\N	00214	\N	\N	8943-2235	ARLES DAVID CENTENO
fcfb73f3-5ac7-43b3-bcf1-fb16b7beb728	fedb4b05-e281-4956-9367-5a0530976e60	LEOPOLDO SOLORZANO	\N	\N	\N	\N	8883-5216	f	\N	2026-08-07 03:00:41.289	2026-08-07 03:00:41.289	001-051156-0039N	CRÉDITO 30 DIAS	5000	00215	\N	\N	8883-5216	NYLSKA JOHANNY GARCIA CASTILLO
fc64de5f-5f89-4be4-842e-af87375cdd02	fedb4b05-e281-4956-9367-5a0530976e60	GARRIT WAYNE	\N	\N	COMARCA MIRAMAR DEL PARQUE 225 MTRS AL NORTE	\N	84096995	f	\N	2026-08-07 03:00:41.29	2026-08-07 03:00:41.29	160120200441	CONTADO	\N	00217	\N	\N	84096995	ARLES DAVID CENTENO
01d01e75-58c3-4456-9710-a7ac3687d9b9	fedb4b05-e281-4956-9367-5a0530976e60	GECONSA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.291	2026-08-07 03:00:41.291	J0310000090998	CRÉDITO 30 DIAS	40000	00218	\N	\N	\N	ARLES DAVID CENTENO
c5aebcc2-f46e-4ea7-a690-febb0b958cf6	fedb4b05-e281-4956-9367-5a0530976e60	DAVID LENIN MENDOZA SALAZAR	\N	\N	REPARTO MONSERRAT 1RA CALLE 4 C AL NORTE	\N	5806-8688	f	\N	2026-08-07 03:00:41.292	2026-08-07 03:00:41.292	081-270780-0014T	CONTADO	\N	00219	\N	\N	5806-8688	ARLES DAVID CENTENO
59761de6-a786-4f79-9e52-e30967d1e883	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ALEJANDRO PADILLA ORTIZ	\N	\N	\N	\N	8664-6810	f	\N	2026-08-07 03:00:41.293	2026-08-07 03:00:41.293	001-011288-0042Q	CRÉDITO 15 DIAS	37000	00220	\N	\N	8664-6810	ARLES DAVID CENTENO
ffa77130-b1bd-4412-95b6-3ecac649b63e	fedb4b05-e281-4956-9367-5a0530976e60	ING CELESTE /HAYN INGENIEROS S,A	\N	\N	J0310000159025	\N	8988-4913	f	\N	2026-08-07 03:00:41.293	2026-08-07 03:00:41.293	\N	CRÉDITO 15 DIAS	37000	00221	\N	\N	8988-4913	ARLES DAVID CENTENO
818bca16-d702-4d9a-a8d6-6ca7665bfaa6	fedb4b05-e281-4956-9367-5a0530976e60	GABRIELA IRIGOYEN	\N	\N	\N	\N	8883-7804	f	\N	2026-08-07 03:00:41.294	2026-08-07 03:00:41.294	\N	CONTADO	\N	00222	\N	\N	8883-7804	ARLES DAVID CENTENO
db49b721-8fd4-4c74-a283-b219d96a2008	fedb4b05-e281-4956-9367-5a0530976e60	DANIEL ANTONIO ALVAREZ SANCHEZ	\N	\N	BO, ANDRES CASTRO, DONDE FUE LA NUNCIATURA 1C ESTE, 4C SUR.	\N	7726-0832	f	\N	2026-08-07 03:00:41.295	2026-08-07 03:00:41.295	001-290875-0007M	CRÉDITO 30 DIAS	37000	00223	\N	\N	7726-0832	AGNEL CASTILLO
d3d29c5e-e55c-4104-a6f5-e3971e4f6060	fedb4b05-e281-4956-9367-5a0530976e60	RAUL ANTONIO HERNANDEZ GONZALES	\N	\N	MANAGUA	\N	5795-3629	f	\N	2026-08-07 03:00:41.342	2026-08-07 03:00:41.342	161-121193-0005X	\N	\N	00283	\N	\N	5795-3629	NYLSKA JOHANNY GARCIA CASTILLO
0671a70a-b25a-4410-ad04-b12bc981988a	fedb4b05-e281-4956-9367-5a0530976e60	YADER MANUEL GAITAN GARCIA	\N	\N	CMCA LA REFORMA KM 38 CARRETERA GRANADA-MASAYA 150 VRS S 50 VRS E	\N	8930-2435	f	\N	2026-08-07 03:00:41.296	2026-08-07 03:00:41.296	201-290887-0009X	\N	\N	00224	\N	\N	8930-2435	NYLSKA JOHANNY GARCIA CASTILLO
6cfb9dbc-e047-4409-886d-7ba4bb4f30d3	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN ANTONIO MARENCO MORALES	\N	\N	\N	\N	7825-9364	f	\N	2026-08-07 03:00:41.297	2026-08-07 03:00:41.297	001-120396-0006X	CONTADO	\N	00225	\N	\N	7825-9364	ARLES DAVID CENTENO
aeefcf4c-521a-4e45-affa-7373c9114ae9	fedb4b05-e281-4956-9367-5a0530976e60	KAREN ELIZABETH MENDOZA RIVERA	\N	\N	CMCA SAN ANTONIO SUR GASOLINERA UNO 2 KM S 1 KM O	\N	8927-6896	f	\N	2026-08-07 03:00:41.297	2026-08-07 03:00:41.297	001-030184-0033K	CONTADO	\N	00226	\N	\N	8927-6896	NYLSKA JOHANNY GARCIA CASTILLO
2a58ae25-c329-4147-a6f7-aea89233266d	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ESTRADA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.298	2026-08-07 03:00:41.298	\N	\N	\N	00227	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
57bc14f6-1ef8-4353-9989-0c2f8afde71f	fedb4b05-e281-4956-9367-5a0530976e60	RODOLFO TAPIA / TAPIA INGENIEROS S,A	\N	\N	J0310000027390	\N	8152-8910	f	\N	2026-08-07 03:00:41.299	2026-08-07 03:00:41.299	\N	CONTADO	\N	00228	\N	\N	8152-8910	ARLES DAVID CENTENO
5edf3a4a-7cfc-44ae-82f4-a1aa722ced4f	fedb4b05-e281-4956-9367-5a0530976e60	RONALD ARIEL GOMEZ HODGSON	\N	\N	RESD. CASA REAL CALLE 3 CASA N° G-25	\N	8778-0073	f	\N	2026-08-07 03:00:41.299	2026-08-07 03:00:41.299	001-040588-0040Y	\N	\N	00229	\N	\N	8778-0073	NYLSKA JOHANNY GARCIA CASTILLO
5d058252-535a-4a54-a4ad-a5a86c6b5713	fedb4b05-e281-4956-9367-5a0530976e60	ANGEL ELIAS GONZALES GUILLEN	\N	\N	\N	\N	8816-5429	f	\N	2026-08-07 03:00:41.3	2026-08-07 03:00:41.3	001-271189-0072S	CONTADO	\N	00230	\N	\N	8816-5429	ARLES DAVID CENTENO
c53ebdbc-5840-49c5-b727-c90f82eb69fe	fedb4b05-e281-4956-9367-5a0530976e60	ERICK RODRIGO CERDA GARCIA	\N	\N	BARIO CRUZ DE MAYO ESCUELA 500 VRS AL SUR LA CONCHA	\N	8899-0596	f	\N	2026-08-07 03:00:41.3	2026-08-07 03:00:41.3	409-151202-1000A	CONTADO	\N	00231	\N	\N	8899-0596	ARLES DAVID CENTENO
a5ead556-e8e6-4f2e-8103-fc1777d43672	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO PABLO LAINEZ MOLINA	\N	\N	BARRIO 19 DE JULIO PORTON FUERZA NAVAL 11/2 C AL NORTE	\N	8928-9945	f	\N	2026-08-07 03:00:41.301	2026-08-07 03:00:41.301	001-160278-0029X	CONTADO	\N	00232	\N	\N	8928-9945	ARLES DAVID CENTENO
0e660321-9566-44a9-a019-761f1c33884d	fedb4b05-e281-4956-9367-5a0530976e60	PUBLIDEAS	\N	\N	CINE SALINAS 4 C ABAJO 1 C AL LAGO	\N	7723-0989	f	\N	2026-08-07 03:00:41.301	2026-08-07 03:00:41.301	J0310000364052	CONTADO	\N	00233	\N	\N	7723-0989	ARLES DAVID CENTENO
14411b57-adc3-4b18-aad1-44a42bab7137	fedb4b05-e281-4956-9367-5a0530976e60	UPPER PERFORMACE PRACTICE INGENIERING S.A	\N	J031 0000 374546	\N	\N	\N	f	\N	2026-08-07 03:00:41.303	2026-08-07 03:00:41.303	\N	CRÉDITO 30 DIAS	6000	00234	\N	\N	\N	ARLES DAVID CENTENO
1da63bda-36dc-4855-8916-7af942469294	fedb4b05-e281-4956-9367-5a0530976e60	ECOSOLAR ENERGY S.A	\N	J031 0000 213127	\N	\N	\N	f	\N	2026-08-07 03:00:41.303	2026-08-07 03:00:41.303	\N	\N	\N	00235	\N	\N	\N	ARLES DAVID CENTENO
6d8770dd-5929-45d3-95a4-083b627a771d	fedb4b05-e281-4956-9367-5a0530976e60	ESTEBAN ANTONIO PEREZ ORDOÑEZ	\N	\N	BARIO EL CALVARIO IGLESIA 3 C AL NORTE 20 VRS AL OESTE CHINANDEGA	\N	57574252	f	\N	2026-08-07 03:00:41.304	2026-08-07 03:00:41.304	081-051084-0013S	CONTADO	\N	00236	\N	\N	57574252	ARLES DAVID CENTENO
4afb9b2e-4bc4-4c03-b7b1-3a62722c4201	fedb4b05-e281-4956-9367-5a0530976e60	JUNIOR EDUARDO CHAVEZ	\N	\N	BARRIO RENE CISNERO PLAZA JULIO M 7 C AL NORTE 1/2 C AL ESTE	\N	8629-7094	f	\N	2026-08-07 03:00:41.305	2026-08-07 03:00:41.305	001-170687-0039N	CONTADO	\N	00237	\N	\N	8629-7094	ARLES DAVID CENTENO
3dced06e-6e32-48b8-8a85-e79e36cc2f99	fedb4b05-e281-4956-9367-5a0530976e60	MILTON ALEXANDER CABRERA LOASIGA	\N	\N	ZONA N°5 MERCADO 7C N 3C O CASA N°Q-7	\N	8353-2101	f	\N	2026-08-07 03:00:41.306	2026-08-07 03:00:41.306	001-040688-0051S	\N	\N	00238	\N	\N	8353-2101	ARLES DAVID CENTENO
ffc45dfb-54f8-479b-ae96-c9793f97271e	fedb4b05-e281-4956-9367-5a0530976e60	MARIO JOSE TORUÑO TREMINIO	\N	\N	VA. SANTA MARIA KM 13 CARRETERA A MASAYA 1 1/2 S. CASA N°3/ TICUANTEPE	\N	8608-1382	f	\N	2026-08-07 03:00:41.306	2026-08-07 03:00:41.306	364-180170-0000V	CRÉDITO 30 DIAS	37000	00239	\N	\N	8608-1382	NYLSKA JOHANNY GARCIA CASTILLO
9e7708b4-e99b-45b4-b68d-32f010c0d168	fedb4b05-e281-4956-9367-5a0530976e60	LAFISE LOGISTIC GROUP	\N	J031 0000 195340	\N	\N	\N	f	\N	2026-08-07 03:00:41.307	2026-08-07 03:00:41.307	\N	\N	\N	00240	\N	\N	\N	ARLES DAVID CENTENO
4b5016aa-ae21-4eb7-a675-634b8d3659a9	fedb4b05-e281-4956-9367-5a0530976e60	WILMER JOSE ORDOÑEZ	\N	\N	\N	\N	8678-4240	f	\N	2026-08-07 03:00:41.308	2026-08-07 03:00:41.308	\N	CONTADO	37000	00241	\N	\N	8678-4240	NYLSKA JOHANNY GARCIA CASTILLO
a477f6c0-8963-49dc-b6ff-3ba6713104ef	fedb4b05-e281-4956-9367-5a0530976e60	HARVEY GEOVANNY HERNANDEZ MAIRENA	\N	202-200171-0003P	CMCA LA CUAREZMA KM 10 CARRETERA A MASAYA 75 VRS E	MILTON DELGADO	8743-8663	f	\N	2026-08-07 03:00:41.309	2026-08-07 03:00:41.309	001-120784-0042D	\N	100000	00242	\N	\N	8743-8663	NYLSKA JOHANNY GARCIA CASTILLO
21f2c7ee-115f-4e39-90cf-c50944a3a39c	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS GUILLERMO DIAZ LOPEZ	\N	\N	\N	\N	7812-1486	f	\N	2026-08-07 03:00:41.31	2026-08-07 03:00:41.31	001-280991-0013G	\N	\N	00243	\N	\N	7812-1486	ARLES DAVID CENTENO
476cf1e2-2da5-4a13-82bd-33adf5be736e	fedb4b05-e281-4956-9367-5a0530976e60	COSELSA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.311	2026-08-07 03:00:41.311	\N	CONTADO	\N	00244	\N	\N	\N	ARLES DAVID CENTENO
749cb90e-e37d-44d7-9310-82980804e85a	fedb4b05-e281-4956-9367-5a0530976e60	DERLING ANTONIO MIRANDA DOÑA	\N	\N	BARIO EL EDEN 1 C AL NORTE 4 C AL ESTE 1 C AL NORTE	\N	5780-9593	f	\N	2026-08-07 03:00:41.312	2026-08-07 03:00:41.312	001-080681-0069J	CONTADO	\N	00245	\N	\N	5780-9593	ARLES DAVID CENTENO
e047cbb5-3ef4-495c-ae17-745ec728f983	fedb4b05-e281-4956-9367-5a0530976e60	JORGE ALBERTO VALLE HIDALGO	\N	\N	VI. COMBATIENDE DESCONOCIDO CLUB TERRAZA 2 KM S 1/2 KM O	\N	8889-4473	f	\N	2026-08-07 03:00:41.313	2026-08-07 03:00:41.313	001-160876-0027V	\N	\N	00246	\N	\N	8889-4473	ARLES DAVID CENTENO
61a63f6b-d003-4581-9937-88601b5a6234	fedb4b05-e281-4956-9367-5a0530976e60	BEST BRAND PACAS S.A /LISSETH SILVA	\N	J031 0000 140189	\N	\N	\N	f	\N	2026-08-07 03:00:41.314	2026-08-07 03:00:41.314	7614-0915	\N	\N	00247	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
cf92afa9-1b8f-4822-9782-ed3f08cec236	fedb4b05-e281-4956-9367-5a0530976e60	KARINA DE LOS ANGELES MOSCOSO SANDOBAL	\N	\N	COLONIA NICARAO RIO SECO PRIMERA ENTRADA 1 C AL OESTE	\N	8477-2557	f	\N	2026-08-07 03:00:41.315	2026-08-07 03:00:41.315	001-201293-0028P	CONTADO	\N	00248	\N	\N	8477-2557	ARLES DAVID CENTENO
92758862-b172-4b84-aed0-62615edb8553	fedb4b05-e281-4956-9367-5a0530976e60	ANA JULIETA GRADIZ BLANCO	\N	WILSON JARQUIN	BO. PANCASAN FRENTE TRIANGULO LA VIRGEN  PUERTO CABEZAS	\N	8427-2086	f	\N	2026-08-07 03:00:41.315	2026-08-07 03:00:41.315	608-111269-0000B	\N	\N	00249	8339-7009	\N	8427-2086	NYLSKA JOHANNY GARCIA CASTILLO
eacb0f17-dca3-4e02-9529-72264f32109f	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO ANTONIO RUGAMA CRUZ	\N	\N	ANEXO VILLA REVOLUCION SECTOR C NADEN 3 CASA 1	\N	8574-5725	f	\N	2026-08-07 03:00:41.316	2026-08-07 03:00:41.316	004-040861-0000Y	CONTADO	\N	00250	\N	\N	8574-5725	ARLES DAVID CENTENO
8bc2f8cc-597b-4ede-b0ec-05bc8dc6724a	fedb4b05-e281-4956-9367-5a0530976e60	SILVIO URIEL RODRIGUEZ ARBUROLA/ CONSTRUCCIONES MULTIPLESS	\N	0411405370003L	BO. LA PRIMAVERA DE DONDE FUE INDUSTRIAS DANTO 5 C. N	\N	8283-5087	f	\N	2026-08-07 03:00:41.317	2026-08-07 03:00:41.317	001-301283-0050P	\N	\N	00251	\N	\N	8283-5087	NYLSKA JOHANNY GARCIA CASTILLO
d2f1d66a-85af-46a1-a504-38bb46be1979	fedb4b05-e281-4956-9367-5a0530976e60	HAROLD ALEJANDRO VADO MEJIA	\N	\N	BARRIO SANTA ROSA PERFECTA 1 C AL SUR 1/2 C AL OSTE	\N	8450-0150	f	\N	2026-08-07 03:00:41.317	2026-08-07 03:00:41.317	001-091277-0052D	CONTADO	\N	00252	\N	\N	8450-0150	ARLES DAVID CENTENO
941db763-db43-48ea-bc12-2e70ce2560a2	fedb4b05-e281-4956-9367-5a0530976e60	ABRIL HAZAZEL MENBREÑO MENNICUCCI	\N	\N	RESD. CIUDAD EL DORAL KM 18.5 CARRETERA NUEVA LEON CASA N° M-72	\N	8577 - 2856	f	\N	2026-08-07 03:00:41.318	2026-08-07 03:00:41.318	001-210398-0020W	CONTADO	\N	00253	\N	\N	8577 - 2856	NYLSKA JOHANNY GARCIA CASTILLO
1877bb63-4489-4084-bbeb-6d409004f633	fedb4b05-e281-4956-9367-5a0530976e60	MARIA JOSE LOPEZ MORALES	\N	\N	BARRIO SANTA ANA IGLESIA 2 C AL SUR 1/2 C AL ESTE 20 VRS AL SUR	\N	8653-6063	f	\N	2026-08-07 03:00:41.319	2026-08-07 03:00:41.319	001-310361-0000X	CONTADO	\N	00254	\N	\N	8653-6063	ARLES DAVID CENTENO
0f0d5bc7-8d0c-4cab-a06f-c3f4ec0fb8ef	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO ANTONIO CHAVEZ CHAVEZ	\N	\N	BO. GUADALUPE FARMACIA PALACIO 1/2 C S.	\N	\N	f	\N	2026-08-07 03:00:41.32	2026-08-07 03:00:41.32	044-150287-0001P	\N	200000	00255	\N	\N	\N	AGNEL CASTILLO
e57625d1-c7ad-4e21-8997-e508394d995f	fedb4b05-e281-4956-9367-5a0530976e60	NICOLAS MAURICIO OBANDO CALERO	\N	\N	TICUENTEPE BARRIO JUAN RAMON PADILLA  CLOEGIO JOESE 1/2 C ARRIBA	\N	8799-7810	f	\N	2026-08-07 03:00:41.321	2026-08-07 03:00:41.321	001-020677-0002U	CRÉDITO 15 DIAS	37000	00256	\N	\N	8799-7810	ARLES DAVID CENTENO
0dac18ac-26b3-4959-9dea-b1362ea48f82	fedb4b05-e281-4956-9367-5a0530976e60	JERSAN ENRRIQUE REYNOSA MEDRANO	\N	\N	BARRIO MEDARDO ANDINO IGLESIA CATOLICA 2 C AL ESTE 1 C AL NORTE	\N	8964-7700	f	\N	2026-08-07 03:00:41.322	2026-08-07 03:00:41.322	007/201174-0000K	CONTADO	\N	00257	\N	\N	8964-7700	ARLES DAVID CENTENO
b1522a97-e59c-41b6-85ff-554c7912d5e3	fedb4b05-e281-4956-9367-5a0530976e60	R&S ENTERPRISE S,A	\N	J0310000104336	RECIDENCIAL SATELITE DE ASOSOSCA # 8 CIUDAD SANDINO	rs@grupors.com.ni	7885-5432	f	\N	2026-08-07 03:00:41.323	2026-08-07 03:00:41.323	\N	CONTADO	\N	00258	7885-5432	2269-0497	\N	ARLES DAVID CENTENO
3cdd27cf-d16d-44e5-a091-660d19bbb261	fedb4b05-e281-4956-9367-5a0530976e60	JACINTA DEL SOCORRO LOPEZ TELLEZ	\N	\N	BARRIO LAURELES SUR MOLINO FRANCIS # 2 1 C  AL ESTE 1/2 C AL NORTE	\N	8662-1471	f	\N	2026-08-07 03:00:41.324	2026-08-07 03:00:41.324	449-160859-0003D	CONTADO	\N	00259	\N	\N	8662-1471	ARLES DAVID CENTENO
be343e49-af50-4fa7-926c-ff3a0e4cfaf2	fedb4b05-e281-4956-9367-5a0530976e60	INNOVART MEDIA / TAMARA SALINAS	\N	J0910000276924	LAS COLINAS EMBAJADA DE ESPEÑA 1 C ABAJO MANO DERECHA	tamsalinas02@gmail.com	8396-6678	f	\N	2026-08-07 03:00:41.325	2026-08-07 03:00:41.325	\N	CONTADO	\N	00260	\N	\N	8396-6678	ARLES DAVID CENTENO
307fffc1-f627-4025-a04d-e8445dccf25a	fedb4b05-e281-4956-9367-5a0530976e60	NORDIC SOLAR S,A	\N	J0310000389756	VILLA FONTANA DEL BANCO AVANZ 150 MTRS AL SUR EDIFICIO ESCALA 4TO PISO	cosorio@ihcpower.com	8729-7932	f	\N	2026-08-07 03:00:41.327	2026-08-07 03:00:41.327	J0310000389756	CONTADO	\N	00261	\N	2299-6477	8729-7932	ARLES DAVID CENTENO
adfabb70-86ea-4104-a191-dfd86a460a55	fedb4b05-e281-4956-9367-5a0530976e60	URIEL ISAAC CHAVEZ SOLANO	\N	\N	BARRIO JOSE DOLORES ESTRADA DE LA MABER 4 C AL NORTE 1 C AL ESTE	\N	8863-2904	f	\N	2026-08-07 03:00:41.328	2026-08-07 03:00:41.328	001-300903-1022L	CONTADO	\N	00262	\N	\N	8863-2904	ARLES DAVID CENTENO
aea3b24d-eff2-4272-a7ad-1097a35ea1d0	fedb4b05-e281-4956-9367-5a0530976e60	KENER YURIEL PEREZ DOLMUS	\N	\N	\N	\N	7665-7627	f	\N	2026-08-07 03:00:41.329	2026-08-07 03:00:41.329	001-061089-0006T	CRÉDITO 30 DIAS	73248.6	00263	\N	\N	7665-7627	ARLES DAVID CENTENO
81c1c88c-e94f-4bd4-9cfe-2dd510c66bf1	fedb4b05-e281-4956-9367-5a0530976e60	KADER OLIVER GARCIA MIRANDA	\N	\N	COL. 10 DE JUNIO CRUZ ROJA DON BOSCO 4 C N. 75 VRS O. CASA N°B-380	\N	\N	f	\N	2026-08-07 03:00:41.33	2026-08-07 03:00:41.33	001-021280-0022P	CRÉDITO 30 DIAS	100000	00264	\N	\N	\N	ARLES DAVID CENTENO
8141c188-c039-4e7b-a00d-aaa4a43752c1	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ROBERTO MENDOZA ZUÑIGA	\N	\N	RESID, RUBENIA SEMAFAROS CONCEPCION PALACIOS 1 1/2C N. CA N° L-31	\N	\N	f	\N	2026-08-07 03:00:41.331	2026-08-07 03:00:41.331	001-140780-0103V	CONTADO	\N	00265	\N	\N	\N	ARLES DAVID CENTENO
3c361f39-4b90-49a1-a443-567b5d15d0a5	fedb4b05-e281-4956-9367-5a0530976e60	FERNANDO JOSE GARCIA ORTIZ	\N	\N	MANAGUA	\N	8281-5086	f	\N	2026-08-07 03:00:41.332	2026-08-07 03:00:41.332	001-171000-1016Y	\N	\N	00266	\N	\N	8281-5086	AGNEL CASTILLO
33ebe3a0-6179-43ef-8285-ce956cdb9bea	fedb4b05-e281-4956-9367-5a0530976e60	ANA CAROLINA PALACIOS MOREIRA	\N	\N	CARRETERA A VERACRUZ	\N	\N	f	\N	2026-08-07 03:00:41.332	2026-08-07 03:00:41.332	241-170574-0000J	CONTADO	\N	00267	\N	\N	\N	ARLES DAVID CENTENO
067cd3e1-f16f-4a34-b00f-9286776aab3b	fedb4b05-e281-4956-9367-5a0530976e60	WILMER JOSE LACAYO MARTINEZ	\N	\N	COMARCA POCHOCUAPE INSTITUTO LA INMACULADA 2 C AL SUR	\N	8952-2433	f	\N	2026-08-07 03:00:41.333	2026-08-07 03:00:41.333	001-190781-0054X	CONTADO	\N	00268	\N	\N	8952-2433	ARLES DAVID CENTENO
ba4fda42-47dc-4061-a1dd-353310bd4a80	fedb4b05-e281-4956-9367-5a0530976e60	ADRIAN PEREZ	\N	\N	\N	\N	8787-9409	f	\N	2026-08-07 03:00:41.333	2026-08-07 03:00:41.333	\N	CONTADO	\N	00269	\N	\N	8787-9409	NYLSKA JOHANNY GARCIA CASTILLO
a8f09698-e5d4-49c8-92ad-fa8bc8d855b7	fedb4b05-e281-4956-9367-5a0530976e60	EMILIO ANTONIO GOMEZ UBAU	\N	\N	MONSEÑOR LEZCANO BANCO POPULAR 2 C AL NORTE 1 C AL OESTE	\N	8200-2867	f	\N	2026-08-07 03:00:41.334	2026-08-07 03:00:41.334	201-301183-0002J	CONTADO	\N	00270	\N	\N	8200-2867	ARLES DAVID CENTENO
5d8790c5-6a8e-46be-9c32-8eeda835b91f	fedb4b05-e281-4956-9367-5a0530976e60	SILVIO AYALA	\N	\N	\N	\N	8830-5010	f	\N	2026-08-07 03:00:41.335	2026-08-07 03:00:41.335	\N	CONTADO	\N	00271	\N	\N	8830-5010	ARLES DAVID CENTENO
4e877b0e-099a-4461-a4a2-7845a145bb47	fedb4b05-e281-4956-9367-5a0530976e60	EQUI OFFI S.A/ NORLAN ARAGON	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.335	2026-08-07 03:00:41.335	88144114	CRÉDITO 30 DIAS	37000	00272	\N	\N	\N	AGNEL CASTILLO
40d5597f-d95d-4d20-8bdb-d5e74e4eb6cb	fedb4b05-e281-4956-9367-5a0530976e60	REGINSA DE NICARAGUA S,A /ROMEL ALFONSO SANCHEZ	\N	\N	BARRIO YURI ORDOÑEZ RESTAURANTE TANQUERIA 11/2 C AL ESTE TIPITAPA	\N	8603-1134	f	\N	2026-08-07 03:00:41.336	2026-08-07 03:00:41.336	J0310000038872	CONTADO	\N	00273	\N	\N	8603-1134	ARLES DAVID CENTENO
612b182e-e87d-436c-96fd-e91cf6a7f190	fedb4b05-e281-4956-9367-5a0530976e60	ARIEL JOSADEC PEREZ DIAZ	\N	\N	BARRIO FREDY SOLORZANO ESCUELA ANGELA CHAVEZ 50 MTRS AL SUR 1,200 MTRS AL ESTE CARAZO	\N	8439-9918	f	\N	2026-08-07 03:00:41.337	2026-08-07 03:00:41.337	616-270984-0004D	CONTADO	\N	00274	\N	\N	8439-9918	ARLES DAVID CENTENO
b3654ecf-2707-4367-ae34-067ab739c166	fedb4b05-e281-4956-9367-5a0530976e60	GARY HUMBERTO SOTOMAYOR CONTRERAS/ MAYRA DE SOTOMAYOR Y ASOCIADOS S,A	\N	J031 0000 283060	MANAGUA	\N	8768-0678	f	\N	2026-08-07 03:00:41.337	2026-08-07 03:00:41.337	180620152352	CRÉDITO 30 DIAS	37000	00275	8895-9646	\N	8768-0678	NYLSKA JOHANNY GARCIA CASTILLO
18b6c2ee-7f94-4f68-b95a-2c00ca9aeb98	fedb4b05-e281-4956-9367-5a0530976e60	ORLANDO AGUSTIN PANIAGUA VARGAS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.338	2026-08-07 03:00:41.338	001-051078-0018P	\N	\N	00276	\N	\N	\N	ARLES DAVID CENTENO
ec1dab0f-2c8f-400f-ac57-dca6bc413e91	fedb4b05-e281-4956-9367-5a0530976e60	ARIEL DE JESUS CACERES CARDOZA	\N	\N	COMARCA LOS LADINOS , CILEGIO AMERICANO 1-1/2 KM AL SUR	\N	7791-3712	f	\N	2026-08-07 03:00:41.339	2026-08-07 03:00:41.339	001-201182-0056X	CONTADO	\N	00277	\N	\N	7791-3712	AGNEL CASTILLO
1a53ba39-9cf5-47ab-bfe6-7b6937426c39	fedb4b05-e281-4956-9367-5a0530976e60	HENRRY LOPEZ	\N	\N	BARRIO PANTASMA CONTIGUO A COLCHONES CALDERA CASA # 38	\N	8611-9761	f	\N	2026-08-07 03:00:41.339	2026-08-07 03:00:41.339	002-080965-0001J	CONTADO	\N	00278	\N	\N	8611-9761	ARLES DAVID CENTENO
f5b8ff5f-3fdf-4696-a3ba-a00077662f94	fedb4b05-e281-4956-9367-5a0530976e60	GEORLENE IZAYANA VEGA LOPEZ	\N	OSCAR VEGA	BO. SAN JOSE ORIENTAL DONDE FUE CINE SALINAS 1C N 3 1/2 C E.	\N	7797-2764	f	\N	2026-08-07 03:00:41.34	2026-08-07 03:00:41.34	001-200801-1073Y	\N	\N	00279	\N	\N	7797-2764	NYLSKA JOHANNY GARCIA CASTILLO
54422ce6-a52e-4c13-918d-098406741cb0	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO JARQUIN	\N	\N	CMCA CRUZ DEL PARAISO DE DOINDE FUE RESTAURANTE EL ESTABLO 2 C S. 1 C O 1/2 C N	\N	8893-8427	f	\N	2026-08-07 03:00:41.34	2026-08-07 03:00:41.34	363-160669-0001N	\N	\N	00280	\N	\N	8893-8427	NYLSKA JOHANNY GARCIA CASTILLO
84a784c8-6a81-44e7-9de7-6a05980e4e09	fedb4b05-e281-4956-9367-5a0530976e60	GABRIEL ISAAC MENDOZA ARAUZ	\N	\N	VI. CUBA LIBRE TERMINAL DE RUTA 164 1 C. S. 1/2 C E. CASA N°I-282	\N	7734-1036	f	\N	2026-08-07 03:00:41.341	2026-08-07 03:00:41.341	001-191095-0057U	\N	\N	00281	\N	\N	7734-1036	NYLSKA JOHANNY GARCIA CASTILLO
7e69405e-3f09-4d7e-9d38-fda5d33ee540	fedb4b05-e281-4956-9367-5a0530976e60	MIGUEL ANGEL PEREZ AGUIRRE	\N	\N	ZONA N°9 PARADA DE BUS 280, 1C. E. 2C N. 2C. E.	\N	\N	f	\N	2026-08-07 03:00:41.342	2026-08-07 03:00:41.342	001-270889-0064P	\N	\N	00282	\N	\N	\N	ARLES DAVID CENTENO
8b11b33e-9478-4931-bdce-6f9b3f258f08	fedb4b05-e281-4956-9367-5a0530976e60	RICHARD FANOR ROBLES POVEDA	\N	\N	BARRIO 19 DE JULIO CASA RICARDO MORALES  50 VRS AL NORTE 2 C AL OESTE	\N	7731-9613	f	\N	2026-08-07 03:00:41.343	2026-08-07 03:00:41.343	001-060292-0056E	CONTADO	\N	00284	\N	\N	7731-9613	ARLES DAVID CENTENO
83c7acd1-4bf3-40a1-987f-34bbd1deded4	fedb4b05-e281-4956-9367-5a0530976e60	MIGUEL ANGEL URBINA AGUILERA	\N	\N	BARRIO PEDRO BENTANCOURT RESTAURANTE MADROÑO 1 C AL ESTE 4 C AL NORTE	\N	8162-8994	f	\N	2026-08-07 03:00:41.344	2026-08-07 03:00:41.344	001-050765-0043S	CONTADO	\N	00285	\N	\N	8162-8994	ARLES DAVID CENTENO
b58b816f-f721-4991-a3af-da60ea623bea	fedb4b05-e281-4956-9367-5a0530976e60	YAREL ANTONIO HERRERA ROMERO	\N	\N	LA TRINIDAD - ESTELI BARRIO  RAUL TINOCO IGLESIA BAUTISTA 11/2 C AL OESTE	\N	8949-0795	f	\N	2026-08-07 03:00:41.344	2026-08-07 03:00:41.344	161-240286-0002A	CONTADO	\N	00286	\N	\N	8949-0795	ARLES DAVID CENTENO
9776eff3-9065-4042-ad75-2b241bc3eb71	fedb4b05-e281-4956-9367-5a0530976e60	FENIX NEFTALI CAMILO DUARTE ESPINAL	\N	\N	MIRADOR DE LA SABANA SEMAFAROS ENTRADA S/GRANDE 2 C AL ESTE 1 C AL SUR CASA C-1	\N	8437-9474	f	\N	2026-08-07 03:00:41.345	2026-08-07 03:00:41.345	001-131287-0033M	CONTADO	\N	00287	\N	\N	8437-9474	ARLES DAVID CENTENO
f600d33e-98be-4279-99f8-ccf1400cba1c	fedb4b05-e281-4956-9367-5a0530976e60	ELIEZER JOSUE MORALES TALAVERA	\N	\N	LA CONCEPCION, MASAYA	\N	\N	f	\N	2026-08-07 03:00:41.345	2026-08-07 03:00:41.345	001-071194-0044R	\N	\N	00288	\N	\N	\N	ARLES DAVID CENTENO
ac8c0c0f-78c7-4fa9-a593-320dfd5d9707	fedb4b05-e281-4956-9367-5a0530976e60	DARLING DE LOS ANGELES ROMERO CRUZ	\N	\N	CMCA ESQUIPULAS KM 11 1/2 CARRETERA A MASAYA DE DONDE FUE CASA COMUNAL 1C S 1/2 C E	\N	8997-5959	f	\N	2026-08-07 03:00:41.346	2026-08-07 03:00:41.346	001-040184-0006H	\N	\N	00289	\N	\N	8997-5959	ARLES DAVID CENTENO
7b3c4d01-a8b1-48e6-9069-633c988fddd9	fedb4b05-e281-4956-9367-5a0530976e60	MARBELY  GONZALES	\N	\N	BARRIO JOSE DOLORES ESTRADA PORTON DE LA TOÑA 21/2 C AL ESTE	\N	7686-9317	f	\N	2026-08-07 03:00:41.347	2026-08-07 03:00:41.347	001-130667-0066S	CONTADO	\N	00290	\N	\N	7686-9317	ARLES DAVID CENTENO
dc2f5232-f8e8-4663-a519-1277dec585fd	fedb4b05-e281-4956-9367-5a0530976e60	WILFREDO HERNANDEZ	\N	\N	\N	\N	76929206	f	\N	2026-08-07 03:00:41.347	2026-08-07 03:00:41.347	\N	CONTADO	\N	00291	\N	\N	76929206	AGNEL CASTILLO
0d7000f2-7548-42c7-ad72-afcf770b9cc3	fedb4b05-e281-4956-9367-5a0530976e60	CEPROP/ ING MOISES ARAUZ	\N	\N	SISTEMA PENITENCIARIO	\N	\N	f	\N	2026-08-07 03:00:41.348	2026-08-07 03:00:41.348	\N	CRÉDITO 30 DIAS	37000	00292	\N	\N	\N	AGNEL CASTILLO
e5ce9669-4828-4793-b7a6-9ecd384b1998	fedb4b05-e281-4956-9367-5a0530976e60	CELESTE ORESTILLA BARBOSA CALERO	\N	\N	REPARTO MIRA FLORES DEL MUNICH 1 C AL ESTE 21/2 C AL NORTE	\N	5500-5639	f	\N	2026-08-07 03:00:41.348	2026-08-07 03:00:41.348	401-290596-0008G	CONTADO	\N	00293	\N	\N	5500-5639	ARLES DAVID CENTENO
921b58cc-2dff-4f2c-8d67-88d73ee5b2d5	fedb4b05-e281-4956-9367-5a0530976e60	KADER OLIVER GARCIA MIRANDA	\N	\N	\N	\N	5808-8820	f	\N	2026-08-07 03:00:41.349	2026-08-07 03:00:41.349	001-021280-0022P	\N	\N	00294	\N	\N	5808-8820	NYLSKA JOHANNY GARCIA CASTILLO
fe00777a-3e79-4f01-91d6-75eb1d13e136	fedb4b05-e281-4956-9367-5a0530976e60	NORMAN OMAR CORRALES PEREZ	\N	\N	BO: LA MORITA DE DONDE FUE RESTAURANTE EL QUETZAL, 1-1/2 C AL SUR.	\N	\N	f	\N	2026-08-07 03:00:41.35	2026-08-07 03:00:41.35	001-110486-0059P	\N	10000	00295	\N	\N	\N	AGNEL CASTILLO
9dc43f16-4571-4628-bdc0-d594444b952b	fedb4b05-e281-4956-9367-5a0530976e60	NELSON OMAR CORRALES PEREZ	\N	\N	BO LA MORITA DE DONDE FUE EL QUETZAL 1-1/2 C AL SUR	\N	\N	f	\N	2026-08-07 03:00:41.35	2026-08-07 03:00:41.35	\N	CONTADO	10000	00296	\N	\N	\N	AGNEL CASTILLO
30c05d0e-c075-433d-8c99-0b8feaf701a8	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS JOSE CHAVEZ CHAVEZ	\N	\N	JINOTEPE BARRIO JOSE A SANCHEZ CASA COMUNAL 150 MTRS AL OESTE	\N	8828-9195	f	\N	2026-08-07 03:00:41.351	2026-08-07 03:00:41.351	041-010277-0006R	CONTADO	\N	00297	\N	\N	8828-9195	NYLSKA JOHANNY GARCIA CASTILLO
5ad7b983-05a9-48ba-8ee5-5909875c2986	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ANGEL SOBALVARRO	\N	\N	BARRIO SOCRATES SANDINO DEL TANQUE ROJO 1 C AL SUR 1 C OESTE CASA # E137	\N	8965-3661	f	\N	2026-08-07 03:00:41.354	2026-08-07 03:00:41.354	001-250368-0022V	CONTADO	\N	00298	5707-9202	\N	8965-3661	ARLES DAVID CENTENO
443442d9-dfc2-4e7a-9256-568f4bf80702	fedb4b05-e281-4956-9367-5a0530976e60	JOHAN MARCEL AGUERO NUÑEZ	\N	\N	VI. 9 DE JUNIO COLEGIO CRISTIANO EL SENDERO DIVINO 1C S. CASA N° A-14 /MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.355	2026-08-07 03:00:41.355	001-090383-0031P	CRÉDITO 30 DIAS	37000	00299	\N	\N	\N	ARLES DAVID CENTENO
cf18da0a-28ca-4308-9b9b-4f12ce1fa96c	fedb4b05-e281-4956-9367-5a0530976e60	ISMAEL TORRES ESPINOZA	\N	\N	BO. LAURELES SUR HOTEL OASIS 2C S MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.356	2026-08-07 03:00:41.356	285-170669-0000H	\N	\N	00300	\N	\N	\N	ARLES DAVID CENTENO
361940b1-54d7-444e-9f41-906df1e55b19	fedb4b05-e281-4956-9367-5a0530976e60	LECONSA / FORVER ANTONIO LEON CHAVARRIA	\N	0012207760033J	BO. ALTAGRACIA IGLESIA CATOLICA 1/2 C N.	\N	8758 2767	f	\N	2026-08-07 03:00:41.357	2026-08-07 03:00:41.357	001-220776-0033J	CRÉDITO 30 DIAS	100000	00301	7615 9889	\N	8758 2767	NYLSKA JOHANNY GARCIA CASTILLO
2ed2d31e-14f1-4620-9dbf-f0cb6c30327f	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO TORRES	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.358	2026-08-07 03:00:41.358	8978-5712	\N	\N	00302	\N	\N	\N	ARLES DAVID CENTENO
8ecafcdf-47ce-4436-9a9f-3bcecd73e9bc	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO RAFAEL MORENO	\N	\N	ESQUIPULAS DE DONDE FUE LA CASA COMUNAL 2C SUR, 1C NORTE.	\N	8885-9717	f	\N	2026-08-07 03:00:41.358	2026-08-07 03:00:41.358	001-231061-0019W	CONTADO	20000	00303	\N	\N	8885-9717	NYLSKA JOHANNY GARCIA CASTILLO
e8604f82-f07a-4c69-86d7-331b49b80adf	fedb4b05-e281-4956-9367-5a0530976e60	FRANKLIN ANTONIO VASQUEZ ALEMAN	\N	\N	BO. RUBEN DARIO SUPERMERCADO MAXIPALI LAS COILAS 3 C N 2C O 45 VRS N M/I MANAGUA	\N	8885-6711	f	\N	2026-08-07 03:00:41.359	2026-08-07 03:00:41.359	001-220476-0024E	\N	\N	00304	\N	\N	8885-6711	NYLSKA JOHANNY GARCIA CASTILLO
be12b23c-5c65-4caa-bdf5-190a03d46ec1	fedb4b05-e281-4956-9367-5a0530976e60	LESTERH DAVID ESPINOZA TERCERO	\N	\N	BARRIO MARTHA QUEZADA ROTONDA PLAZA INTER1-1/2 C AL OESTE	\N	5701-6808	f	\N	2026-08-07 03:00:41.36	2026-08-07 03:00:41.36	001-211087-0000F	CONTADO	\N	00305	\N	\N	5701-6808	ARLES DAVID CENTENO
18997148-1559-43a6-bc4a-f64da064c819	fedb4b05-e281-4956-9367-5a0530976e60	ROMAN ENRIQUE MARTINEZ HUERTA	\N	\N	BO. CAMILO ORTEGA MONUMENTO 9 C S. 1 1/2 C E	\N	8573-9872	f	\N	2026-08-07 03:00:41.361	2026-08-07 03:00:41.361	001-061252-0038S	\N	\N	00306	\N	\N	8573-9872	NYLSKA JOHANNY GARCIA CASTILLO
710e603a-efbd-4d2a-abb7-1bf80f43748e	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO JOSE MOLINA CASTILLO	\N	\N	BARRIO 22 DE ENERO DEL AUTOCINEMA GANDO 3 C AL ESTE	\N	7784-7672	f	\N	2026-08-07 03:00:41.362	2026-08-07 03:00:41.362	007-240680-0003G	CONTADO	\N	00307	\N	\N	7784-7672	ARLES DAVID CENTENO
dda712b1-21b5-4a29-bd9c-62b328e2da43	fedb4b05-e281-4956-9367-5a0530976e60	EDGAR JHONATHAN OBREGON MORA	\N	\N	\N	\N	7688-2076	f	\N	2026-08-07 03:00:41.363	2026-08-07 03:00:41.363	001-011188-0028T	\N	\N	00308	\N	\N	7688-2076	NYLSKA JOHANNY GARCIA CASTILLO
51b3c63f-597c-4ca6-97de-be356b1e0a30	fedb4b05-e281-4956-9367-5a0530976e60	ARIEL HERNANDEZ	\N	\N	\N	\N	8242-4199	f	\N	2026-08-07 03:00:41.364	2026-08-07 03:00:41.364	\N	\N	\N	00309	\N	\N	8242-4199	AGNEL CASTILLO
0883bfc5-bfb0-4ed9-9656-3547a55a90bf	fedb4b05-e281-4956-9367-5a0530976e60	RIGOBERTO SALVADOR MORENO UGARTE	\N	\N	\N	\N	8883-5922	f	\N	2026-08-07 03:00:41.365	2026-08-07 03:00:41.365	121-260765-0005J	\N	\N	00310	\N	\N	8883-5922	NYLSKA JOHANNY GARCIA CASTILLO
b43e3631-0e70-4586-ac58-d2d7964d5b20	fedb4b05-e281-4956-9367-5a0530976e60	OTTO MARTINEZ VALERIO	\N	\N	\N	\N	5864-2747	f	\N	2026-08-07 03:00:41.365	2026-08-07 03:00:41.365	001-071282-0035D	\N	\N	00311	\N	\N	5864-2747	ARLES DAVID CENTENO
6e96b573-dc54-482f-a3ab-ac4f11f10d04	fedb4b05-e281-4956-9367-5a0530976e60	ENDRID RUGAMA/LINDA CASTILLO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.366	2026-08-07 03:00:41.366	\N	CRÉDITO 30 DIAS	50000	00313	\N	\N	\N	YESSEL ANAHY CERPAS ARTOLA
c6d84ee5-c766-41a4-b32d-18d558efc67a	fedb4b05-e281-4956-9367-5a0530976e60	JOSUE DAVID REYES CARDENAL	\N	\N	\N	\N	8954-7509	f	\N	2026-08-07 03:00:41.367	2026-08-07 03:00:41.367	401-031293-000D	\N	\N	00314	\N	\N	8954-7509	NYLSKA JOHANNY GARCIA CASTILLO
414aad70-8659-407f-a728-d8ea7a3e9ee3	fedb4b05-e281-4956-9367-5a0530976e60	HENRRYPERSA	\N	\N	MONSEÑOR LEZCANO HOSPITAL DERMATOLOGO 1 C AL SUR	\N	\N	f	\N	2026-08-07 03:00:41.369	2026-08-07 03:00:41.369	J0310000349347	CONTADO	\N	00316	\N	\N	\N	ARLES DAVID CENTENO
40cf4940-5041-46af-8bb9-60541e40a5dd	fedb4b05-e281-4956-9367-5a0530976e60	MARIA DOLORES LOPEZ BAQUEDANO	\N	\N	CONDOMINIO VILLAS CAROLINA 250 ENTRADA ESTANCIA DE SANTO DOMINGO 75 VRS E. CA N°4	\N	5860-5520	f	\N	2026-08-07 03:00:41.37	2026-08-07 03:00:41.37	001-210386-0075W	\N	\N	00317	\N	\N	5860-5520	ARLES DAVID CENTENO
bbb1fa06-a74a-4e95-b97b-1b3ae5eb7ff8	fedb4b05-e281-4956-9367-5a0530976e60	MARIO CASTILLO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.371	2026-08-07 03:00:41.371	\N	\N	\N	00319	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
523c06ed-283b-4b15-98b1-1ac7ff9b2afb	fedb4b05-e281-4956-9367-5a0530976e60	JONDER GERARDO LAFFITA GARCELL	\N	\N	VISTA DE MOMOTOMBO KM 19 C NUEVA A LEON	\N	8966-3792	f	\N	2026-08-07 03:00:41.372	2026-08-07 03:00:41.372	21082009029	CONTADO	\N	00320	\N	\N	8966-3792	ARLES DAVID CENTENO
1b53f376-b721-4403-9de7-17046b0ab90c	fedb4b05-e281-4956-9367-5a0530976e60	RUDY JOSE GOMEZ MALTEZ	\N	\N	BARRIO SAN ANTONIO SUR KM 10.5 CARRETERA A MASAYA	\N	8868-6724	f	\N	2026-08-07 03:00:41.373	2026-08-07 03:00:41.373	001-260275-0022D	CONTADO	\N	00321	\N	\N	8868-6724	ARLES DAVID CENTENO
21672044-73b8-43ea-bb1b-781228b15526	fedb4b05-e281-4956-9367-5a0530976e60	RICARDO JOSE ARGEÑAL LANZAS	\N	\N	RPTO RENE SCHICK I ETAPA DE DONDE FUE MADERERIAHALCON NEGRO 2 C E M/I	\N	8277-2169	f	\N	2026-08-07 03:00:41.374	2026-08-07 03:00:41.374	001-261167-0029N	\N	\N	00322	\N	\N	8277-2169	NYLSKA JOHANNY GARCIA CASTILLO
105d9554-2890-492f-8b9c-a63b8e4b93b1	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO JOSE BERMUDEZ BERMUDEZ	\N	\N	BARRIO 380 ENEL CENTRAL 2 C AL OESTE 3 C AL NORTE	\N	8973-4158	f	\N	2026-08-07 03:00:41.375	2026-08-07 03:00:41.375	045-290657-000A	CONTADO	\N	00323	8887-6200	\N	8973-4158	NYLSKA JOHANNY GARCIA CASTILLO
17542fa3-a508-488b-8753-670b59971d8d	fedb4b05-e281-4956-9367-5a0530976e60	JOSE MANUEL PAVON BALTODANO	\N	\N	BO. SAN RAFAEL TALLER DE MECANICA ENOC MENA 30 VRS S	\N	8389-5885	f	\N	2026-08-07 03:00:41.376	2026-08-07 03:00:41.376	565-280359-0001M	\N	\N	00324	\N	\N	8389-5885	NYLSKA JOHANNY GARCIA CASTILLO
8212f775-6fe9-48f0-9d2d-c716b8b2b10a	fedb4b05-e281-4956-9367-5a0530976e60	CLAUDIA RUIZ	\N	\N	MASAYA	\N	7742-8919	f	\N	2026-08-07 03:00:41.377	2026-08-07 03:00:41.377	401-010885-0006X	CRÉDITO 30 DIAS	37000	00325	\N	\N	7742-8919	NYLSKA JOHANNY GARCIA CASTILLO
7097bf7f-e7c5-4b16-9721-2863d6fec708	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO JOSE FLORES RODRIGUEZ	\N	\N	MANAGUA	\N	8632-9611	f	\N	2026-08-07 03:00:41.378	2026-08-07 03:00:41.378	888-291191-0001K	\N	\N	00326	\N	\N	8632-9611	ARLES DAVID CENTENO
9ceb52d6-2fbb-41a3-978b-5bd440f5de86	fedb4b05-e281-4956-9367-5a0530976e60	MULTISERVICIOS HERNANDEZ /FRANCISCO LOPEZ	\N	\N	\N	\N	8465-5228	f	\N	2026-08-07 03:00:41.379	2026-08-07 03:00:41.379	\N	CRÉDITO 30 DIAS	100000	00327	\N	\N	8465-5228	NYLSKA JOHANNY GARCIA CASTILLO
3b6143e1-aaf6-43dd-885e-1f3a390e421a	fedb4b05-e281-4956-9367-5a0530976e60	GUTIERREZ INGENIERIA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.38	2026-08-07 03:00:41.38	\N	\N	\N	00328	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
4e20c34d-5fa4-4ad7-bd96-f0ea17515119	fedb4b05-e281-4956-9367-5a0530976e60	JULIO CESAR DAVILA MENDOIZA	\N	\N	\N	\N	001-190101-1036L	f	\N	2026-08-07 03:00:41.381	2026-08-07 03:00:41.381	8254-2453	\N	\N	00329	\N	\N	001-190101-1036L	NYLSKA JOHANNY GARCIA CASTILLO
8a7fbca8-9269-43d1-a026-00a67ce0562a	fedb4b05-e281-4956-9367-5a0530976e60	REYNALDO ANTONIO OBANDO DUARTE/ COMERCIALIZADORA Y MULTISERVICIOS RYK	\N	004-210591-0000D	\N	\N	7533-3864	f	\N	2026-08-07 03:00:41.382	2026-08-07 03:00:41.382	001-280994-0045A	CRÉDITO 30 DIAS	37000	00330	\N	\N	7533-3864	ARLES DAVID CENTENO
7ca50977-c8d6-4039-8a23-bcdc3924e0fb	fedb4b05-e281-4956-9367-5a0530976e60	SANTOS JUSTINIANO LAZO SEVILLA	\N	\N	VILA VENEZUELA IGLESIA MADRE DE DIOS 11/2 C AL SUR 1/2 C AL OESTE CASA 3745	\N	8129-8597	f	\N	2026-08-07 03:00:41.383	2026-08-07 03:00:41.383	124-050977-0003L	CONTADO	\N	00331	\N	\N	8129-8597	ARLES DAVID CENTENO
35ba4e9e-d734-4f44-a3c7-4e6646f89d24	fedb4b05-e281-4956-9367-5a0530976e60	ALEXANDER CASTILLO MIRANDA	\N	\N	\N	\N	8637-7210	f	\N	2026-08-07 03:00:41.384	2026-08-07 03:00:41.384	123-220775-0000A	CONTADO	\N	00332	\N	\N	8637-7210	AGNEL CASTILLO
845cdfb5-712d-48d5-916a-36480f77eedb	fedb4b05-e281-4956-9367-5a0530976e60	ANA LETICIA SOLORZANO SILVA	\N	\N	COMARCA POCHOCUAPE CENTRO DE SALUD 100 VRS AL SUR	\N	8796-9481	f	\N	2026-08-07 03:00:41.385	2026-08-07 03:00:41.385	001-270887-0022E	CONTADO	\N	00333	\N	\N	8796-9481	ARLES DAVID CENTENO
0b08a495-948b-4bc6-ae75-65883cb4cf4f	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALBERTO AGUIRRE RUIZ	\N	\N	VILLA LIBERTAD IGLESIA SENDEROS DE LUZ 1 C AL OESTE 6 C AL SUR	\N	8358-5465	f	\N	2026-08-07 03:00:41.385	2026-08-07 03:00:41.385	001-210881-0070B	CONTADO	\N	00334	\N	\N	8358-5465	ARLES DAVID CENTENO
6c645cea-9102-4919-ad2c-bc4edc5b20e8	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO ALVARADO GUTIERREZ	\N	\N	\N	\N	8561-7183	f	\N	2026-08-07 03:00:41.386	2026-08-07 03:00:41.386	001-101280-0007Q	\N	\N	00335	\N	\N	8561-7183	NYLSKA JOHANNY GARCIA CASTILLO
d6e00c23-0d11-4fac-bae8-ea1b04c043e0	fedb4b05-e281-4956-9367-5a0530976e60	RODOLFO ANTONIO GARCIA CEDEÑO	\N	\N	\N	\N	8252-3866	f	\N	2026-08-07 03:00:41.386	2026-08-07 03:00:41.386	001-261089-0018A	\N	\N	00336	\N	\N	8252-3866	ARLES DAVID CENTENO
c9090a7f-142d-4042-9883-286e73ba9bf0	fedb4b05-e281-4956-9367-5a0530976e60	SERNICA/ENRRIQUE TRUJILLO	\N	001-2609700048E	ALTOS  LA SABANA 300 MTRS AL ESTE 1 C AL NORTE	SERNICA.SGRAL@GMAIL.COM	8873-1398	f	\N	2026-08-07 03:00:41.387	2026-08-07 03:00:41.387	0012609700048E	CONTADO	\N	00337	\N	\N	8873-1398	ARLES DAVID CENTENO
f4082a15-55f0-4c56-8a4d-ff7e06a1bd94	fedb4b05-e281-4956-9367-5a0530976e60	JAIR RODOLFO GONZALEZ SANCHEZ	\N	\N	RESID, BRUSELAS 4 ESQUINAS LAS JAGUITAS 90 MTS N CASA N° G-7	\N	8877-7162	f	\N	2026-08-07 03:00:41.388	2026-08-07 03:00:41.388	001-130870-0062K	CONTADO	\N	00338	\N	\N	8877-7162	ARLES DAVID CENTENO
835d6249-58dd-40a5-8a83-a15a7945e2b6	fedb4b05-e281-4956-9367-5a0530976e60	MIGUEL ANGEL DARCE RODRIGUEZ	\N	\N	CMCA LA CUAREZMA DONDE FUE EMBAJADA DE CUBA 4C S.	\N	\N	f	\N	2026-08-07 03:00:41.388	2026-08-07 03:00:41.388	001-311081-0087E	\N	\N	00339	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
7ff536a9-7829-4260-ac72-3fc41f77094a	fedb4b05-e281-4956-9367-5a0530976e60	MARCO ANTONIO MERCADO FLETES	\N	\N	MANAGUA / EL CRUCERO	\N	7600-7393	f	\N	2026-08-07 03:00:41.39	2026-08-07 03:00:41.39	001-070883-0000J	\N	100000	00340	\N	\N	7600-7393	NYLSKA JOHANNY GARCIA CASTILLO
4fbce892-0334-4ba1-a173-503a10a119e0	fedb4b05-e281-4956-9367-5a0530976e60	PABLO AMILCAR MENDEZ GONZALES	\N	\N	\N	\N	7837-1286	f	\N	2026-08-07 03:00:41.39	2026-08-07 03:00:41.39	089-100672-0000S	\N	\N	00341	\N	\N	7837-1286	NYLSKA JOHANNY GARCIA CASTILLO
6e776827-b3d5-42b0-bacd-f99485c96db1	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR ALEMAN	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.391	2026-08-07 03:00:41.391	5834-3094	\N	\N	00342	\N	\N	\N	ARLES DAVID CENTENO
a996aa86-92bc-4d08-b484-8948f7ede2c9	fedb4b05-e281-4956-9367-5a0530976e60	MARLON SALVADOR JUAREZ GONZALES	\N	\N	BARRIOS DENIS LARIOS TICUANTEPE TERMINAL DE BUSES 8 C AL SUR	\N	8953-0778	f	\N	2026-08-07 03:00:41.392	2026-08-07 03:00:41.392	001-270278-0006W	CONTADO	\N	00343	\N	\N	8953-0778	ARLES DAVID CENTENO
9dbab85c-3a0a-4caf-a137-346a14b7ea83	fedb4b05-e281-4956-9367-5a0530976e60	ARQ TOBIAS ALVAREZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.392	2026-08-07 03:00:41.392	8610-2238	CONTADO	\N	00344	\N	\N	\N	ARLES DAVID CENTENO
0a079536-7df9-4421-bd04-0ecb29a230d4	fedb4b05-e281-4956-9367-5a0530976e60	WILGER MIGUEL ROMAN VIVAS	\N	\N	VI. TISCAPA UCA 300 VRS N C.A N°23	\N	8420-9441	f	\N	2026-08-07 03:00:41.393	2026-08-07 03:00:41.393	001-110584-0031B	CRÉDITO 30 DIAS	100000	00346	8420-9410	\N	8420-9441	NYLSKA JOHANNY GARCIA CASTILLO
0f177e77-25c3-4f48-8d4e-5c023181bcaf	fedb4b05-e281-4956-9367-5a0530976e60	LOTINICA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.394	2026-08-07 03:00:41.394	\N	\N	\N	00348	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
527cc482-2ca5-466e-9036-e864a9ffd665	fedb4b05-e281-4956-9367-5a0530976e60	KAREN YAHAIRA MARTINEZ CONTRERAS	\N	\N	COMARCA LAS ENRAMADAS CUATRO ESQUINAS 600 VRS AL NORTE	\N	7884-6386	f	\N	2026-08-07 03:00:41.394	2026-08-07 03:00:41.394	291-210695-0001F	CONTADO	\N	00349	\N	\N	7884-6386	ARLES DAVID CENTENO
615d8f43-20ec-4e89-aafc-96b793676685	fedb4b05-e281-4956-9367-5a0530976e60	HAMILTOM JOSUE SILVA CORDOBA	\N	\N	VILLA JOSE BENITO ESCOBAR COLEGIO 1 ANDEN AL NORTE CASA B-41	\N	8811-2807	f	\N	2026-08-07 03:00:41.395	2026-08-07 03:00:41.395	001-070893-0049H	\N	\N	00350	\N	\N	8811-2807	ARLES DAVID CENTENO
2f91f089-6333-49e1-b0ff-696a008b5aec	fedb4b05-e281-4956-9367-5a0530976e60	JOSE DANIEL CHAVARRIA MEDINA	\N	\N	VILLA ARLEN SIU RESTAURANTE EL MADROÑO 3 C AL ESTE 1/2 C AL SUR	\N	7722-6331	f	\N	2026-08-07 03:00:41.395	2026-08-07 03:00:41.395	001-220988-0056G	\N	\N	00351	\N	\N	7722-6331	ARLES DAVID CENTENO
d4b144f0-9824-423d-a931-971177b28869	fedb4b05-e281-4956-9367-5a0530976e60	SERGIO ROGER PADILLA HERNANDEZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.396	2026-08-07 03:00:41.396	001-070484-0046C	CRÉDITO 30 DIAS	15000	00352	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
a1111048-98f2-47bd-a62a-04f25f48c9fb	fedb4b05-e281-4956-9367-5a0530976e60	ARMANDO JOSE ESTRADA ABEL	\N	\N	COMARCA SAN ANTONIO SUR KM 10.5 CARETERA MASAYA 2 KM AL SUR	\N	5786-4873	f	\N	2026-08-07 03:00:41.397	2026-08-07 03:00:41.397	007-260967-0001Y	CONTADO	\N	00353	\N	\N	5786-4873	ARLES DAVID CENTENO
e2ec5940-0230-4b49-a908-9449c8ffcf01	fedb4b05-e281-4956-9367-5a0530976e60	NINFA DEL SOCORRO ZAMORA MANZANARES	\N	\N	LAURELES SUR KOLA SHALER 8 C AL SUR	\N	7879-4452	f	\N	2026-08-07 03:00:41.397	2026-08-07 03:00:41.397	443-070380-0000E	CONTADO	\N	00354	\N	\N	7879-4452	ARLES DAVID CENTENO
d9582761-bce4-4991-8aee-29747da074c6	fedb4b05-e281-4956-9367-5a0530976e60	GEOVANY FRANCISCO AMADOR VELASQUEZ	\N	\N	BARRIO 18 DE MAYO CANCHA DEPORTIVA 1/2 C AL SUR	\N	8825-6694	f	\N	2026-08-07 03:00:41.398	2026-08-07 03:00:41.398	001-110575-0071T	CONTADO	\N	00355	\N	\N	8825-6694	ARLES DAVID CENTENO
ecf4bb2a-4eea-4b45-af78-fc8db8e7d9da	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN JAVIER GONZALES PEREZ	\N	\N	BARRIO NACIONES UNIDAS TERMINAL RUTA 165 2 C AL NORTE 1/2 AL ESTE	\N	8673-6212	f	\N	2026-08-07 03:00:41.399	2026-08-07 03:00:41.399	001-160783-0070X	CONTADO	\N	00356	\N	\N	8673-6212	ARLES DAVID CENTENO
c70b2186-b6db-45fd-8dec-d79c97e16013	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR ALBERTO LOPEZ	\N	\N	TICUANTEPE COMARCA HUMBERTO RUIZ KM 14 C MASAYA 500 VRS AL SUR	\N	8978-4548	f	\N	2026-08-07 03:00:41.399	2026-08-07 03:00:41.399	001-240289-0000Y	CONTADO	\N	00357	\N	\N	8978-4548	ARLES DAVID CENTENO
dc314552-37f4-45ab-8bfd-c26fc83f779b	fedb4b05-e281-4956-9367-5a0530976e60	RAUL OSWALDO TORRENTE LOPEZ	\N	\N	REPRTO MIRADOR SANTO DOMINGO CRUX DEL PARAISO 1KM PULPERIA CALDERA	\N	\N	f	\N	2026-08-07 03:00:41.4	2026-08-07 03:00:41.4	001-220385-0022W	CONTADO	17500	00358	\N	\N	\N	AGNEL CASTILLO
0c18842e-bdab-471a-8c2b-964e2af2adb0	fedb4b05-e281-4956-9367-5a0530976e60	MARCELINO / FABIO	\N	\N	\N	\N	8574-4531	f	\N	2026-08-07 03:00:41.401	2026-08-07 03:00:41.401	\N	CONTADO	\N	00359	\N	\N	8574-4531	ARLES DAVID CENTENO
6bbeda92-4e0c-425b-8d9d-9ef93b78cf1e	fedb4b05-e281-4956-9367-5a0530976e60	JAIME MUNGUIA TRANSPORTE Y MAQUINARIA	\N	0012101930034B	\N	\N	\N	f	\N	2026-08-07 03:00:41.402	2026-08-07 03:00:41.402	001-210193-0034B	CONTADO	37500	00360	\N	\N	\N	AGNEL CASTILLO
fe6a769f-b7c5-43f7-84ee-c0fb45f8a524	fedb4b05-e281-4956-9367-5a0530976e60	MAYRA DE LOS ANGELES ALVAREZ PORRAS	\N	\N	COMARCA LOS MADRIGALES SUR KM 17 C MASAYA 1.5 KM AL ESTE	\N	7792-0006	f	\N	2026-08-07 03:00:41.402	2026-08-07 03:00:41.402	001-121282-0005G	CONTADO	\N	00361	\N	\N	7792-0006	ARLES DAVID CENTENO
11705e44-2c88-4cce-b424-f52b1b2ae080	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO ANTONIO SAENZ GRIGSBY	\N	\N	ESTANCIA DE STO DOMINGO CALLE PANPLONA CASA # 7	\N	8577-9999	f	\N	2026-08-07 03:00:41.403	2026-08-07 03:00:41.403	001-130282-0053K	CONTADO	\N	00362	\N	\N	8577-9999	ARLES DAVID CENTENO
10d93ffe-4b4c-482b-9936-571c5f817e80	fedb4b05-e281-4956-9367-5a0530976e60	BISMARCK CALERO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.404	2026-08-07 03:00:41.404	\N	CONTADO	\N	00363	\N	\N	\N	ARLES DAVID CENTENO
780335d8-7f1e-4bc6-af62-63c06e628e4d	fedb4b05-e281-4956-9367-5a0530976e60	EMILIO EMILIO CUADRA KALTHOFF	\N	\N	\N	\N	8815-5513	f	\N	2026-08-07 03:00:41.405	2026-08-07 03:00:41.405	001-1603789-0032C	CONTADO	\N	00364	\N	\N	8815-5513	NYLSKA JOHANNY GARCIA CASTILLO
7bd42671-b09c-48f3-936f-b06fa5c67369	fedb4b05-e281-4956-9367-5a0530976e60	ERNESTO ASCENSION LOPEZ MAYORGA	\N	\N	\N	\N	5835-5307	f	\N	2026-08-07 03:00:41.405	2026-08-07 03:00:41.405	001-150883-0035P	\N	\N	00365	\N	\N	5835-5307	NYLSKA JOHANNY GARCIA CASTILLO
346c682c-440b-44b0-a0d3-bc6e194111e1	fedb4b05-e281-4956-9367-5a0530976e60	SMARTD / MAYNOR ALBERTO RUIZ SANCHEZ	\N	\N	\N	\N	7799-9337	f	\N	2026-08-07 03:00:41.406	2026-08-07 03:00:41.406	001-020988-0010N	\N	\N	00366	\N	\N	7799-9337	NYLSKA JOHANNY GARCIA CASTILLO
299cf168-8fe3-40ab-b058-a5df755c0804	fedb4b05-e281-4956-9367-5a0530976e60	IGNACIO JAVIER LPEZ RODRIGUEZ	\N	\N	BARRIO NEJAPA COLEGIO DIVINO PASTOR 300VRS AL OESTE	\N	8398-8069	f	\N	2026-08-07 03:00:41.407	2026-08-07 03:00:41.407	001-220591-0041X	CONTADO	\N	00367	\N	\N	8398-8069	ARLES DAVID CENTENO
4f69b87e-62f0-4eef-950f-49069198e416	fedb4b05-e281-4956-9367-5a0530976e60	ROLANDO DANIEL AGUILAR GONZALEZ/EUROAMBIENTE	\N	\N	CIUDADELA SAN MARTIN KM 24 C VIEJA TIPITAPA, QUINTA LOS AGUILARES	\N	\N	f	\N	2026-08-07 03:00:41.407	2026-08-07 03:00:41.407	003-130387-0003F	CONTADO	17000	00368	\N	\N	\N	ARLES DAVID CENTENO
a26c6901-6e7a-4553-8534-15cabd960c5e	fedb4b05-e281-4956-9367-5a0530976e60	YADER ABSALON BARQUERO SANCHEZ	\N	\N	CHONTALES / STO TOMAS BARRIO BUENA VISTA TIENDA MYM 6 C AL SUR	\N	8524-8279	f	\N	2026-08-07 03:00:41.408	2026-08-07 03:00:41.408	121-080288-00001H	CONTADO	\N	00369	\N	\N	8524-8279	ARLES DAVID CENTENO
fe1b095a-4ddc-472d-bae8-a24f14a7a6ea	fedb4b05-e281-4956-9367-5a0530976e60	LUIS EDGARDO OROZCO PINEL	\N	\N	VILLA VENEZUELA COLEGIO LA INMACULADA CONCEPCION 10 ANDENES AL SUR 600 MTRS AL ESTE	\N	7643-5738	f	\N	2026-08-07 03:00:41.408	2026-08-07 03:00:41.408	001-131294-0030V	CONTADO	\N	00370	\N	\N	7643-5738	ARLES DAVID CENTENO
9fafdf21-2b4e-48f7-bc56-f38789f92fda	fedb4b05-e281-4956-9367-5a0530976e60	EMILIO JOSE OBREGON MENA	\N	\N	\N	\N	8586-0871	f	\N	2026-08-07 03:00:41.409	2026-08-07 03:00:41.409	569-160292-0000T	CONTADO	\N	00371	\N	\N	8586-0871	ARLES DAVID CENTENO
42d51486-48e9-4a02-a6e1-252363049145	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ARMANDO / CONDOMINIO MADROÑO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.409	2026-08-07 03:00:41.409	\N	\N	\N	00372	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
07765bec-9586-4dc7-81b4-d89090ca7190	fedb4b05-e281-4956-9367-5a0530976e60	LESTER ENRRIQUE CASTILLO GARCIA	\N	\N	\N	\N	7785-8051	f	\N	2026-08-07 03:00:41.41	2026-08-07 03:00:41.41	\N	\N	\N	00373	\N	\N	7785-8051	NYLSKA JOHANNY GARCIA CASTILLO
ac034205-591c-4c87-bc10-e8307040b2c7	fedb4b05-e281-4956-9367-5a0530976e60	ARIEL DE JESUS BEJARANO VELASQUEZ	\N	\N	\N	\N	5781-9298	f	\N	2026-08-07 03:00:41.411	2026-08-07 03:00:41.411	001-200192-0065N	\N	\N	00374	\N	\N	5781-9298	NYLSKA JOHANNY GARCIA CASTILLO
2480d632-00f2-4975-8639-5d0dfb693a2a	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL SALVADOR SANCHEZ MONTENEGRO	\N	\N	BO. SIERRA MAESTRA IGLESIA DAMASCO 1 C.E	\N	8862-0099	f	\N	2026-08-07 03:00:41.411	2026-08-07 03:00:41.411	\N	CONTADO	\N	00375	\N	\N	8862-0099	NYLSKA JOHANNY GARCIA CASTILLO
f29f9275-fb94-42e5-9403-48248b161c2c	fedb4b05-e281-4956-9367-5a0530976e60	INNVENIO S.A	\N	J031 0000 255962	\N	\N	\N	f	\N	2026-08-07 03:00:41.412	2026-08-07 03:00:41.412	\N	\N	\N	00376	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
4cd65a2b-b205-4a91-8253-9b929cf6d13b	fedb4b05-e281-4956-9367-5a0530976e60	IVAN NOEL CHACON JAIME	\N	\N	GRANADA VILLA WALTER FERETI DEE CASA CLUB 1 C AL NORTE 26 VRS AL ESTE	\N	8468-4622	f	\N	2026-08-07 03:00:41.412	2026-08-07 03:00:41.412	201-231084-0002G	CONTADO	\N	00377	\N	\N	8468-4622	NYLSKA JOHANNY GARCIA CASTILLO
b253b764-1872-44ad-b1cc-7ee888bbed3b	fedb4b05-e281-4956-9367-5a0530976e60	KAREN YAHAIRA MARTINEZ CONTRERAS	\N	\N	COMARCA LAS ERAMADAS CUATRO ESQUINA 600 VRS AL NORTE	\N	7884-6386	f	\N	2026-08-07 03:00:41.414	2026-08-07 03:00:41.414	291-210695-0001F	\N	\N	00378	\N	\N	7884-6386	ARLES DAVID CENTENO
80d3d7f2-7375-48d0-b3a4-8ca9e4a250f4	fedb4b05-e281-4956-9367-5a0530976e60	EYTHAN ESTARLYN ESQUIVEL CAJINA	\N	\N	BARRIO BOER CST 2 C AL ESTE 1/2 C NORTE	\N	8860-2589	f	\N	2026-08-07 03:00:41.414	2026-08-07 03:00:41.414	001-260607-1031V	\N	\N	00379	\N	\N	8860-2589	ARLES DAVID CENTENO
0651f5f7-39c6-4c66-85a1-c526e23fea5a	fedb4b05-e281-4956-9367-5a0530976e60	ALEXANDER ANTONIO BARRERA	\N	\N	BARRIO BERTHA CALDERON COLEGIO MANUEL MONGALO 7 C AL SUR 1/2 C AL OESTE	\N	7540-9610	f	\N	2026-08-07 03:00:41.415	2026-08-07 03:00:41.415	201-141084-0000K	\N	\N	00380	\N	\N	7540-9610	ARLES DAVID CENTENO
5e9aa650-f367-49de-a6b4-fc0a5ccec0f4	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL ANTONIO DOÑA GARMENDEZ	\N	\N	COMARCA SAN ANTONIO SUR KM 16.5 C MASAYA 3 KM AL SUR	\N	8329-6079	f	\N	2026-08-07 03:00:41.415	2026-08-07 03:00:41.415	001-151067-0074G	\N	\N	00381	\N	\N	8329-6079	ARLES DAVID CENTENO
fb0e30be-3d49-43cf-a37c-0ddf70e28831	fedb4b05-e281-4956-9367-5a0530976e60	SEMACSA / FERNANDO OBANDO	\N	\N	ALTAMIRA	\N	8514-1940	f	\N	2026-08-07 03:00:41.416	2026-08-07 03:00:41.416	\N	CRÉDITO 30 DIAS	100000	00382	\N	\N	8514-1940	NYLSKA JOHANNY GARCIA CASTILLO
e2e90524-0347-45f3-9913-70770c3de763	fedb4b05-e281-4956-9367-5a0530976e60	OTTONIEL ENRIQUE DELGADO SEVILLA	\N	\N	\N	\N	8864-9631	f	\N	2026-08-07 03:00:41.417	2026-08-07 03:00:41.417	\N	\N	100000	00383	\N	\N	8864-9631	ARLES DAVID CENTENO
81ec2b0f-3e13-455e-bbd9-74d646039e39	fedb4b05-e281-4956-9367-5a0530976e60	SOLIDOS/ ROGER GEOVANNY SOLIS COLLADO	\N	\N	\N	\N	7757 3559	f	\N	2026-08-07 03:00:41.418	2026-08-07 03:00:41.418	\N	\N	\N	00384	\N	\N	7757 3559	ARLES DAVID CENTENO
d85ff7b5-072f-4133-80f1-3507f9701429	fedb4b05-e281-4956-9367-5a0530976e60	CUMAN ENERGY / ALVARO GARCIA	\N	\N	ENEL CENTRAL 1 C AL SUR	\N	7826-6789	f	\N	2026-08-07 03:00:41.418	2026-08-07 03:00:41.418	J0310000371881	CONTADO	\N	00385	\N	\N	7826-6789	ARLES DAVID CENTENO
1175b7a1-9768-4457-ab84-8ccaa750ceb1	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO JOSE CASTILLO LOPES	\N	\N	\N	\N	7651-8764	f	\N	2026-08-07 03:00:41.419	2026-08-07 03:00:41.419	\N	\N	\N	00386	\N	\N	7651-8764	ARLES DAVID CENTENO
36ed900a-e9d0-4446-bf10-bd57031a8ae1	fedb4b05-e281-4956-9367-5a0530976e60	RIGOBERTO OMAR FUERTE TOLEDO	\N	\N	AMERICAS # 1 GRUPO A ANDEN 8 CASA # 2127	\N	8577-1286	f	\N	2026-08-07 03:00:41.42	2026-08-07 03:00:41.42	612-051068-0000A	\N	\N	00387	\N	\N	8577-1286	ARLES DAVID CENTENO
5cb30a39-7e94-4847-89a6-795ae4d1b3dd	fedb4b05-e281-4956-9367-5a0530976e60	IVAN MARTINEZ	\N	\N	EXEL AUTOMOTRIZ	\N	\N	f	\N	2026-08-07 03:00:41.42	2026-08-07 03:00:41.42	\N	CRÉDITO 30 DIAS	17000	00388	\N	\N	\N	BISMARK MURILLO
bd4d83a3-25aa-424d-b4c1-f164a6bbb21e	fedb4b05-e281-4956-9367-5a0530976e60	ISAAC PARRILA ESPINOZA	\N	\N	BO. SAN MATIAS FRENTE PARQUE SAN MATIAS	\N	5877-6890	f	\N	2026-08-07 03:00:41.421	2026-08-07 03:00:41.421	166-040495-0000F	\N	\N	00389	\N	\N	5877-6890	NYLSKA JOHANNY GARCIA CASTILLO
1be3367b-6308-43a6-8af2-85ed9450eefa	fedb4b05-e281-4956-9367-5a0530976e60	CRISTOFER CHERLOT VARGAS MORALES	\N	\N	BARRIO HUGO CHAVEZ ENTRADA PRINCIPAL 9 ANDENES AL NORTE 40 VRS AL OESTE CASA # C-52	\N	7687-6028	f	\N	2026-08-07 03:00:41.422	2026-08-07 03:00:41.422	001-151188-0050X	\N	\N	00390	\N	\N	7687-6028	ARLES DAVID CENTENO
aae7ad57-1ba9-47cb-a708-112f60bef7a0	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR ROMERO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.422	2026-08-07 03:00:41.422	\N	\N	\N	00391	\N	\N	\N	YAHOSKA D'TRINIDAD
ad4f30cb-0efd-46a2-a37b-36d19a8a84b3	fedb4b05-e281-4956-9367-5a0530976e60	BIGO INGENIERIA Y TENOLOGIA S.A	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.423	2026-08-07 03:00:41.423	\N	\N	\N	00392	\N	\N	\N	ARLES DAVID CENTENO
1bacbd76-ae3e-4452-87b3-0c9b7f9ad886	fedb4b05-e281-4956-9367-5a0530976e60	NELSON HABRAHAM MARTINEZ RUGAMA	\N	\N	BARRIO SAN LUIS KM 10.5 CARETERA VIEJA A LEON 700VRS AL SUR	\N	8927-0656	f	\N	2026-08-07 03:00:41.423	2026-08-07 03:00:41.423	001-290881-0017L	\N	\N	00393	\N	\N	8927-0656	ARLES DAVID CENTENO
ec33f3c1-3121-4b75-bf09-315b82119a3e	fedb4b05-e281-4956-9367-5a0530976e60	ALMACENES EZA/ FRANCIS POTOSME	\N	\N	SEMAFOROS CLUB TERRAZA 1/2 ARRIBA	\N	8999-1391	f	\N	2026-08-07 03:00:41.424	2026-08-07 03:00:41.424	J0310000163588	CONTADO	\N	00394	\N	\N	8999-1391	ARLES DAVID CENTENO
a81bb3c3-ac5d-4d64-93d2-80e7de66094e	fedb4b05-e281-4956-9367-5a0530976e60	MARCOS ARCADIO GUTIERREZ	\N	\N	MANAGUA	\N	8819-8951	f	\N	2026-08-07 03:00:41.425	2026-08-07 03:00:41.425	001-120174-0074D	CRÉDITO 30 DIAS	18000	00395	\N	\N	8819-8951	YESSEL ANAHY CERPAS ARTOLA
987f3a72-62d3-4207-930c-680bd91c4ca0	fedb4b05-e281-4956-9367-5a0530976e60	MULTER	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.425	2026-08-07 03:00:41.425	\N	CRÉDITO 30 DIAS	5000	00396	\N	\N	\N	AGNEL CASTILLO
168cf7ce-2dda-4724-a89a-30d9d22b93a1	fedb4b05-e281-4956-9367-5a0530976e60	JOSE LUIS ROSTRAN OROZCO / TECNOSA	\N	\N	\N	\N	8668-5945	f	\N	2026-08-07 03:00:41.426	2026-08-07 03:00:41.426	001-010277-0002R	\N	\N	00397	\N	\N	8668-5945	NYLSKA JOHANNY GARCIA CASTILLO
dbfcb2b4-aa54-4379-94f6-4ce55196596e	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS D´TRINITI / OSCAR ACEVEDO	\N	\N	\N	\N	8118-8980	f	\N	2026-08-07 03:00:41.427	2026-08-07 03:00:41.427	\N	\N	\N	00398	\N	\N	8118-8980	ARLES DAVID CENTENO
5426fbc8-d02d-4f4c-8e70-be94f428f17a	fedb4b05-e281-4956-9367-5a0530976e60	SERGIO ANTONIO ROCHA MARTINEZ	\N	\N	BARRIO SAN ISIDRO DE BOLAS COLEGIO CRISTO OBRERO 1/2 C AL OESTE	\N	8988-2578	f	\N	2026-08-07 03:00:41.427	2026-08-07 03:00:41.427	001-180288-0019M	CONTADO	\N	00399	\N	\N	8988-2578	ARLES DAVID CENTENO
83d401d3-f75e-453c-8329-b15fbe8c3988	fedb4b05-e281-4956-9367-5a0530976e60	MAX CONTO DINARTE	\N	\N	BARRIO MARIA AXULIADORA RESTAURANTE LA BANDEJA 50 MTRS AL OESTE	\N	8708-7530	f	\N	2026-08-07 03:00:41.428	2026-08-07 03:00:41.428	406-230991-0000A	\N	\N	00400	\N	\N	8708-7530	ARLES DAVID CENTENO
a45f858d-a248-457b-8afa-23dbdead9f8b	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ALBERTO CRUZ JOYA	\N	\N	VILLA RECONCILIACION TRANSPORTE TUCSA 7 C AL OESTE 1/2 C AL NORTE	\N	8144-6029	f	\N	2026-08-07 03:00:41.429	2026-08-07 03:00:41.429	362-151176-0000M	\N	\N	00401	\N	\N	8144-6029	ARLES DAVID CENTENO
f0e1a8df-85b0-4ced-8ea5-b68c659e0ac3	fedb4b05-e281-4956-9367-5a0530976e60	NAHUM OBED BARBAS CIENFUEGOS	\N	\N	IGLESIA EL CALAVRIO 1.5 C AL SUR NINDIRI - MASAYA	\N	7739-1538	f	\N	2026-08-07 03:00:41.429	2026-08-07 03:00:41.429	444-050794-0001T	\N	\N	00402	\N	\N	7739-1538	ARLES DAVID CENTENO
e5d3fc3f-b6cd-4691-b394-efc8fa9c41c6	fedb4b05-e281-4956-9367-5a0530976e60	WILMER JOSE LOPEZ PALMA	\N	\N	BO,GERMAN POMARES, DEL TANQUE 14 SEPTIEMBRE, 7 C SUR, 3C ESTE CASA #22	\N	7615-2333	f	\N	2026-08-07 03:00:41.43	2026-08-07 03:00:41.43	001-170481-0066M	CRÉDITO 30 DIAS	100000	00403	\N	\N	7615-2333	NYLSKA JOHANNY GARCIA CASTILLO
8f65e88d-bc5b-4c76-9e63-e3fc65b8fb2d	fedb4b05-e281-4956-9367-5a0530976e60	ERICK ORTEGA	\N	\N	MANAGUA	\N	8380-0172	f	\N	2026-08-07 03:00:41.431	2026-08-07 03:00:41.431	\N	CONTADO	100000	00404	\N	\N	8380-0172	AGNEL CASTILLO
ce92f012-17b2-41d1-9c7d-905d0393ffb9	fedb4b05-e281-4956-9367-5a0530976e60	CASA DE MI GLORIA / TICUANTEPE	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.431	2026-08-07 03:00:41.431	\N	\N	\N	00405	\N	\N	\N	BISMARK MURILLO
5bae0753-e421-4de4-b48b-036ad0603323	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS JOSE ESPINOZA MARTINEZ	\N	\N	REPARTO MIRAFLORES SEMAFOROS SEMINARIO 2C AL ESTE 2C AL SUR 10 VRS AL ESTE	\N	8639-5958	f	\N	2026-08-07 03:00:41.432	2026-08-07 03:00:41.432	001-151265-0003D	CONTADO	\N	00406	\N	\N	8639-5958	ARLES DAVID CENTENO
1e353296-25a3-403c-b812-6fad57d8b6d3	fedb4b05-e281-4956-9367-5a0530976e60	JERAL ALFONSO CASTILLA GAMEZ	\N	\N	\N	\N	7787-3540	f	\N	2026-08-07 03:00:41.433	2026-08-07 03:00:41.433	616-070687-0002W	\N	\N	00407	\N	\N	7787-3540	AGNEL CASTILLO
5bc0af2a-e9c2-4200-a60f-e90d29897b9f	fedb4b05-e281-4956-9367-5a0530976e60	WALTER FRANCISCO OSEJO MORALES	\N	\N	\N	\N	8836-5891	f	\N	2026-08-07 03:00:41.433	2026-08-07 03:00:41.433	001-110886-0021Y	\N	\N	00408	\N	\N	8836-5891	NYLSKA JOHANNY GARCIA CASTILLO
d1851b9e-df28-4b8d-bfad-d390ac8d94d1	fedb4b05-e281-4956-9367-5a0530976e60	JOSE CABRERA	\N	\N	MANAGUA	\N	5764-6171	f	\N	2026-08-07 03:00:41.434	2026-08-07 03:00:41.434	\N	CONTADO	100000	00409	\N	\N	5764-6171	AGNEL CASTILLO
0259238b-ec66-4e6d-a4ec-c46768e86e04	fedb4b05-e281-4956-9367-5a0530976e60	ARLES DAVID CENTENO	\N	\N	MANAGUA	\N	5700-6521	f	\N	2026-08-07 03:00:41.435	2026-08-07 03:00:41.435	\N	CRÉDITO 30 DIAS	17000	00410	\N	\N	5700-6521	BISMARK MURILLO
f8d98f2e-dde5-4b51-90c2-136b3f09fa4f	fedb4b05-e281-4956-9367-5a0530976e60	VICTOR MANUEL GAITAN	\N	\N	\N	\N	8229-2269	f	\N	2026-08-07 03:00:41.435	2026-08-07 03:00:41.435	001-171255-0004N	\N	\N	00411	\N	\N	8229-2269	ARLES DAVID CENTENO
35c4cd8b-55de-44a0-b934-41a76cab7162	fedb4b05-e281-4956-9367-5a0530976e60	MINISTERIO INTERNACIONAL JESUS EL BUEN PASTOR	\N	\N	SEMAFAROS COLEGIO AMERICANO 2 C AL SUR	\N	8796-8990	f	\N	2026-08-07 03:00:41.436	2026-08-07 03:00:41.436	J0810000093701	CRÉDITO 30 DIAS	5000	00412	\N	\N	8796-8990	ARLES DAVID CENTENO
5456beb7-9ebd-4625-b975-f6affa97dc28	fedb4b05-e281-4956-9367-5a0530976e60	HENRY MAX ARIAS MENDIETA / SEPCO S.A	\N	J031 0000 243662	BO. ALTAGRACIA FRENTE IGLESIA NUESTRA SEÑORA DE ALTAGRACIA	\N	\N	f	\N	2026-08-07 03:00:41.437	2026-08-07 03:00:41.437	001-160591-0013 E	\N	\N	00413	\N	\N	\N	ARLES DAVID CENTENO
96e94b84-beba-4d48-be30-161a1913bd19	fedb4b05-e281-4956-9367-5a0530976e60	ELVIN ANTONIO ROMERO RUIZ	\N	\N	\N	\N	8777-3339	f	\N	2026-08-07 03:00:41.438	2026-08-07 03:00:41.438	\N	\N	\N	00414	\N	\N	8777-3339	NYLSKA JOHANNY GARCIA CASTILLO
e7d450c0-6878-45a6-a70b-86653e4dfcbb	fedb4b05-e281-4956-9367-5a0530976e60	AUTO LANDIA /SILVIO JOSE BORGEN FLORES	\N	\N	SEMAFOROS DE ENEL CENTRAL 1 C ARRIBA 3 C AL SUR	\N	8851-2008	f	\N	2026-08-07 03:00:41.438	2026-08-07 03:00:41.438	001-120182-0003H	\N	\N	00415	\N	\N	8851-2008	ARLES DAVID CENTENO
e968a086-243a-40d2-ae7a-9a5c18015fee	fedb4b05-e281-4956-9367-5a0530976e60	SANDRA SOFIA CARRERO ESCALANTE	\N	\N	BARRIO GRENADA REPOSTERIA DUYA MAGICA 4 C AL OESTE 1/2 C AL NORTE	\N	5749-8678	f	\N	2026-08-07 03:00:41.439	2026-08-07 03:00:41.439	091.280678-0000J	CONTADO	\N	00416	\N	\N	5749-8678	ARLES DAVID CENTENO
2d79fe0e-5428-4fb9-b213-8ee2de04e9c7	fedb4b05-e281-4956-9367-5a0530976e60	GERARDO ANTONIO TORRENTES LOPEZ	\N	\N	REPARTO EL MIRADOR CRUZ DEL PARAISO 1 KM AL SUR PULPERIA CALDERA	\N	8948-8963	f	\N	2026-08-07 03:00:41.44	2026-08-07 03:00:41.44	001-290389-0034D	CONTADO	\N	00417	\N	\N	8948-8963	ARLES DAVID CENTENO
f2e3012c-d8a5-43b5-b12b-a33ba841fe61	fedb4b05-e281-4956-9367-5a0530976e60	SCARLETH DEL SOCORRO MARTINEZ	\N	\N	TICUANTEPE REPARTO JUAN RAMON PADILLA COSTADO NORTE COLEGIO SAN JOSE	\N	8679-7390	f	\N	2026-08-07 03:00:41.441	2026-08-07 03:00:41.441	001-150391-0020W	\N	\N	00418	\N	\N	8679-7390	ARLES DAVID CENTENO
6e24f9e8-094f-4224-8923-0e61712e37fe	fedb4b05-e281-4956-9367-5a0530976e60	JIMMY JOEL ARRIAZA MORALES	\N	\N	COMARCA PIEDRA MENUDA COMEDOR INFANTIL 300 VRS AL OESTE	\N	7641-3102	f	\N	2026-08-07 03:00:41.442	2026-08-07 03:00:41.442	402-020195-0000L	CONTADO	\N	00419	\N	\N	7641-3102	ARLES DAVID CENTENO
69044571-236e-49e3-9450-5f7a5ef7820b	fedb4b05-e281-4956-9367-5a0530976e60	TECNOSA/ JOSE LUIS ROSTRAN	\N	\N	\N	\N	8822-5852	f	\N	2026-08-07 03:00:41.443	2026-08-07 03:00:41.443	001-191293-0041B	\N	\N	00420	\N	\N	8822-5852	NYLSKA JOHANNY GARCIA CASTILLO
bca37d2a-c6ee-4b70-9920-c10fb4f3706b	fedb4b05-e281-4956-9367-5a0530976e60	GCONSA / ALVARO ALARCON	\N	\N	\N	\N	8571-5644	f	\N	2026-08-07 03:00:41.444	2026-08-07 03:00:41.444	\N	\N	\N	00421	\N	\N	8571-5644	NYLSKA JOHANNY GARCIA CASTILLO
1e5088e6-367f-497e-be7d-a265da11d5bd	fedb4b05-e281-4956-9367-5a0530976e60	KLUANE NICARAGUA S,A / DAYANARA VALESKA BLASS	\N	J0310000077061	\N	\N	7553-1056	f	\N	2026-08-07 03:00:41.446	2026-08-07 03:00:41.446	007-290604-1000P	\N	\N	00422	\N	\N	7553-1056	ARLES DAVID CENTENO
b1be5e5a-b2a9-41b2-bf1e-f604cc0ea125	fedb4b05-e281-4956-9367-5a0530976e60	OMAR ENRRIQUE JARQUIN JARQUIN	\N	\N	COMARCA SAN JUAN LA PLAYWOOD HOSPITAL YOLANDA MAYORGA 3 KM AL ESTE FINCA LA MONTE HORED	\N	8485-7349	f	\N	2026-08-07 03:00:41.447	2026-08-07 03:00:41.447	445-200683-0000V	CONTADO	\N	00423	\N	\N	8485-7349	ARLES DAVID CENTENO
45476d14-d244-44a0-87b0-7997c24e645d	fedb4b05-e281-4956-9367-5a0530976e60	HARLING MANUEL LEZCANO GUTIERREZ	\N	\N	COMARCA CAPULIN # 1 KM 411/2 CARRETERA GRANADA /MASAYA400 VRS AL NORTE	\N	7806-3522	f	\N	2026-08-07 03:00:41.448	2026-08-07 03:00:41.448	003-010881-0007Y	\N	\N	00424	\N	\N	7806-3522	ARLES DAVID CENTENO
5b545d31-0247-44fd-a761-b4df8b9abbe4	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALONSO MELENDEZ MELENDEZ	\N	\N	KM 11.5 CARETERA MASAYA COMARCA GUADALUPE FRENTE A RESTAURANTE OASIS	\N	8906-3007	f	\N	2026-08-07 03:00:41.449	2026-08-07 03:00:41.449	270220180421	CONTADO	\N	00425	\N	\N	8906-3007	NYLSKA JOHANNY GARCIA CASTILLO
4c6cad98-f8a8-4e90-81ac-3710ed117322	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALONSO MELENDEZ MELENDEZ	\N	\N	KM 11.5 C A MASAYA, COMARCA GUADALUPE FRENTE A RESTAURANTE OASIS	\N	8266-4162	f	\N	2026-08-07 03:00:41.451	2026-08-07 03:00:41.451	\N	\N	\N	00426	\N	\N	8266-4162	NYLSKA JOHANNY GARCIA CASTILLO
3caf325b-8e5a-4579-b8a0-a92f7a971bc2	fedb4b05-e281-4956-9367-5a0530976e60	GERARDO JOSE LOPEZ MAYORGA	\N	\N	\N	\N	7792-1106	f	\N	2026-08-07 03:00:41.451	2026-08-07 03:00:41.451	001-190678-0001A	\N	\N	00427	\N	\N	7792-1106	NYLSKA JOHANNY GARCIA CASTILLO
04ce1c05-8520-4ce4-8bee-7694a17ab718	fedb4b05-e281-4956-9367-5a0530976e60	JORGE EDUARDO AMADOR REYES	\N	\N	BARRIO 19 DE JULIO REPUESTOS BURGOS 3 C AL OESTE 20 VRS AL NORTE	\N	8774-1954	f	\N	2026-08-07 03:00:41.452	2026-08-07 03:00:41.452	001-070789-0034G	CONTADO	\N	00428	\N	\N	8774-1954	ARLES DAVID CENTENO
8fd4c553-4956-4169-af65-736d6e525e97	fedb4b05-e281-4956-9367-5a0530976e60	MULTISERVICIOS Y CONSTRUCCIONES MIP/ MIGUEL PANTOJA BONILLA	\N	281 031099 1002K	CMCA LAS CUARESMAS ESTACION DE BOMBEROS LAS COLINAS 4C S 1C E M/D	\N	8435-8985	f	\N	2026-08-07 03:00:41.453	2026-08-07 03:00:41.453	001-040673-0003W	\N	\N	00429	\N	\N	8435-8985	NYLSKA JOHANNY GARCIA CASTILLO
460b26da-1d10-4b7a-afa2-3d544cf43637	fedb4b05-e281-4956-9367-5a0530976e60	BENJAMIN ANTONIO ALVAREZ PORRAS	\N	\N	CMCA LOS MADRIGALES SUR KM 17 CARRETERA MASAYA 600 MTS E 400 MTS S	\N	7662-9678	f	\N	2026-08-07 03:00:41.454	2026-08-07 03:00:41.454	001-050684-0010W	\N	\N	00430	\N	\N	7662-9678	ARLES DAVID CENTENO
79ae4be8-fb04-44b3-9cac-d93d977aa816	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALBERTO SANCHEZ AGUIRRE	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.454	2026-08-07 03:00:41.454	001-020587-0006N	CRÉDITO 30 DIAS	37000	00431	\N	\N	\N	ARLES DAVID CENTENO
27da52bf-08b7-435e-8fb7-d80d677fc563	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO MENDEZ	\N	\N	\N	\N	8843-2947	f	\N	2026-08-07 03:00:41.455	2026-08-07 03:00:41.455	\N	CONTADO	38000	00432	\N	\N	8843-2947	AGNEL CASTILLO
511d1057-5a52-4022-845c-92fbae75e739	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO STEVEN DIAZ LOPEZ	\N	\N	REPARTO SERRANIA KM12.5 C SUR 1.5 KM AL NORESTE	\N	88715819	f	\N	2026-08-07 03:00:41.456	2026-08-07 03:00:41.456	001-030376-0044D	CONTADO	\N	00433	\N	\N	88715819	ARLES DAVID CENTENO
def98285-61a0-4b7b-8f5a-4d8452d1b009	fedb4b05-e281-4956-9367-5a0530976e60	MARCO ANTONIO PRADO ARTIAGA	\N	\N	\N	\N	8249-6616	f	\N	2026-08-07 03:00:41.456	2026-08-07 03:00:41.456	081-241286-0000W	\N	\N	00434	\N	\N	8249-6616	ARLES DAVID CENTENO
8c49d53a-f0c6-4e14-9eeb-2cc1b8638871	fedb4b05-e281-4956-9367-5a0530976e60	JAIME JAVIER  CARDENAL MENDIETA	\N	\N	MANAGUA	\N	8875-8000	f	\N	2026-08-07 03:00:41.457	2026-08-07 03:00:41.457	001-220676-0028W	CONTADO	38000	00435	\N	\N	8875-8000	AGNEL CASTILLO
42b4db6c-c9e5-43d9-9cb9-8c93959f999d	fedb4b05-e281-4956-9367-5a0530976e60	ELVIN MIGUEL CARBALLO LOPEZ	\N	\N	BARRIO 22 DE ENERO IGLESIA DE FATIMA 3 C AL SUR 3 C AL ESTE	\N	7775-5017	f	\N	2026-08-07 03:00:41.458	2026-08-07 03:00:41.458	409-191282-0000M	\N	\N	00436	\N	\N	7775-5017	ARLES DAVID CENTENO
142d7017-af48-4026-81f5-5e246c6d12f5	fedb4b05-e281-4956-9367-5a0530976e60	JOSE FRANCISCO CHAVARRIA ARAGON	\N	\N	\N	\N	8376-4550	f	\N	2026-08-07 03:00:41.458	2026-08-07 03:00:41.458	004-021282-0000G	CRÉDITO 30 DIAS	100000	00437	\N	\N	8376-4550	NYLSKA JOHANNY GARCIA CASTILLO
77f86f05-df26-4760-8ccc-05a22bb287a5	fedb4b05-e281-4956-9367-5a0530976e60	JEFERSON LOPEZ	\N	\N	\N	\N	8179 0221	f	\N	2026-08-07 03:00:41.459	2026-08-07 03:00:41.459	\N	\N	100000	00438	\N	\N	8179 0221	NYLSKA JOHANNY GARCIA CASTILLO
0cacb40e-55ef-45b0-a8b9-015f20df7f19	fedb4b05-e281-4956-9367-5a0530976e60	ALLEN WILDERMAN GORDON CASTELLON	\N	\N	BARRIO FRANCISCO MORAZAN SEMAFAROS LINDA VISTA 1 C AL ESTE 3 C AL NORTE CASA # D-452	\N	\N	f	\N	2026-08-07 03:00:41.46	2026-08-07 03:00:41.46	001-180791-0030Q	CRÉDITO 30 DIAS	36700	00439	\N	\N	\N	ARLES DAVID CENTENO
87feccd9-92ff-4447-9e86-fcd30a67e19f	fedb4b05-e281-4956-9367-5a0530976e60	REINAR S.A	\N	J031 00000 95787	PLAZA EL SOL 2 C AL NORTE 1/2 C AL ESTE	jrenta@reinarsa.com	2228-1244	f	\N	2026-08-07 03:00:41.462	2026-08-07 03:00:41.462	\N	\N	200000	00440	2222-5137	\N	2228-1244	ARLES DAVID CENTENO
5da0a14f-1dfe-4485-b40c-9e9a7262bb59	fedb4b05-e281-4956-9367-5a0530976e60	JARDIN ORTEGA/OPTICAS MUNKEL	\N	\N	MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.653	2026-08-07 03:00:41.653	\N	CRÉDITO 30 DIAS	37000	00684	\N	\N	\N	AGNEL CASTILLO
61674a7e-cd94-40f7-9146-dd4d4ca4a6ab	fedb4b05-e281-4956-9367-5a0530976e60	INGENIERIA ESPECIALIZADA Y CONSTRUCCION S,A	\N	J031 00000 71403	VERACRUZ	\N	\N	f	\N	2026-08-07 03:00:41.463	2026-08-07 03:00:41.463	\N	CRÉDITO 30 DIAS	500000	00441	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
2043562e-1286-4d5a-9e8a-ba0901900d5d	fedb4b05-e281-4956-9367-5a0530976e60	REYNALDO AGUSTIN  CHAMORRO MENDOZA	\N	\N	URBANIZACION FLOR DE PINO INAFOR 1 KM AL NORTE CASA # P-569	\N	8699-2916	f	\N	2026-08-07 03:00:41.464	2026-08-07 03:00:41.464	201-270882-0002N	CONTADO	40000	00442	\N	\N	8699-2916	ARLES DAVID CENTENO
62b3403f-1fc7-44c7-a375-85375b0e5471	fedb4b05-e281-4956-9367-5a0530976e60	LOGAN MORAGA	\N	\N	\N	\N	8102-3636	f	\N	2026-08-07 03:00:41.465	2026-08-07 03:00:41.465	\N	CONTADO	\N	00443	\N	\N	8102-3636	AGNEL CASTILLO
78423bc8-b0c4-44ac-85fb-c0209be5fca2	fedb4b05-e281-4956-9367-5a0530976e60	MARIO JOSE CASTILLO REYES	\N	\N	CONDOMINIO ROMA CASA  # 2	\N	8487-5953	f	\N	2026-08-07 03:00:41.465	2026-08-07 03:00:41.465	001-180271-0001K	\N	\N	00444	\N	\N	8487-5953	NYLSKA JOHANNY GARCIA CASTILLO
e1f34205-0bb2-47ed-93af-8219df800203	fedb4b05-e281-4956-9367-5a0530976e60	JULIO BALLADARES	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.466	2026-08-07 03:00:41.466	\N	\N	\N	00445	\N	\N	\N	ARLES DAVID CENTENO
57d91464-b9f4-46ee-9b6a-bd26d736f1bb	fedb4b05-e281-4956-9367-5a0530976e60	Y	\N	\N	VALLE DE SANDINO SEGUNDA ETAPA BETEL LOTE # A4 CASA 9	\N	5801-0809	f	\N	2026-08-07 03:00:41.467	2026-08-07 03:00:41.467	001-271186-0032U	\N	\N	00446	\N	\N	5801-0809	ARLES DAVID CENTENO
6240b824-028f-49f2-a870-284abd02db26	fedb4b05-e281-4956-9367-5a0530976e60	MONICA TOLEDO RODRIGUEZ	\N	\N	COLINAS DE STA CRUZ ETAPA # 3 LOTE 12-A	\N	ARQ TOBIAS	f	\N	2026-08-07 03:00:41.469	2026-08-07 03:00:41.469	001-310774-0032N	\N	\N	00447	\N	\N	ARQ TOBIAS	ARLES DAVID CENTENO
71867fa8-9a80-4213-9296-766f3986ccaf	fedb4b05-e281-4956-9367-5a0530976e60	LESTER  JESUS URBINA MURILLO	\N	\N	BO CAMILO ORTEGA , TERMINAL RUTA 105,107, 3C AL OESTE, 1/2C AL NORTE	\N	8564-6396	f	\N	2026-08-07 03:00:41.47	2026-08-07 03:00:41.47	001-130683-0012W	CONTADO	\N	00448	\N	\N	8564-6396	NYLSKA JOHANNY GARCIA CASTILLO
8f3a24e8-8858-4cd7-bdaf-25c3be1b494a	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO RENATO RODRIGUEZ DEL VALLE	\N	\N	PORTON # 5 UNAN MANAGUA 4 C AL SUR CASA # 77 CONTIGUO A CLINICA GUADALUPE VILLA FONTANA	\N	8900-0017	f	\N	2026-08-07 03:00:41.471	2026-08-07 03:00:41.471	290820110284	\N	\N	00449	\N	\N	8900-0017	ARLES DAVID CENTENO
06050e23-ede7-467f-b999-cd83e102ae8c	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN JOSE ESQUIVEL	\N	\N	BARRIO ALTAGRACIA COLEGIO ENMANUEL MONGALO 7 C AL SUR 1 C AL OESTE	\N	8860-2589	f	\N	2026-08-07 03:00:41.472	2026-08-07 03:00:41.472	001-100469-0069Q	\N	\N	00450	\N	\N	8860-2589	AGNEL CASTILLO
20cd5256-c3fc-4592-af2c-7a401e840a0b	fedb4b05-e281-4956-9367-5a0530976e60	MANPRISA	\N	J0310000392935	\N	\N	\N	f	\N	2026-08-07 03:00:41.473	2026-08-07 03:00:41.473	\N	\N	\N	00451	\N	\N	\N	ARLES DAVID CENTENO
fe9f142a-4efd-4579-ac4f-d12d74f0ca71	fedb4b05-e281-4956-9367-5a0530976e60	JOSE DONEL ROCHA CACERES	\N	\N	VILLA FLOR NORTE COMEDOR ZEPOLAZO 1 C AL SUR	\N	8750-7773	f	\N	2026-08-07 03:00:41.474	2026-08-07 03:00:41.474	288-110594-0001F	\N	\N	00452	\N	\N	8750-7773	ARLES DAVID CENTENO
b66acc7e-32df-4d3e-aa70-bdd34d3d732d	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO ENRRIQUE LOPEZ SOLORZANO	\N	\N	NINDIRI	\N	7841-3842	f	\N	2026-08-07 03:00:41.475	2026-08-07 03:00:41.475	402-051175-0001S	\N	\N	00453	\N	\N	7841-3842	ARLES DAVID CENTENO
2c2a48fe-b217-4c52-8a67-a85f8749ec43	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO ANTONIO ARCE MOLINA	\N	\N	\N	\N	8897-8487	f	\N	2026-08-07 03:00:41.476	2026-08-07 03:00:41.476	001-301174-0054L	\N	\N	00454	\N	\N	8897-8487	NYLSKA JOHANNY GARCIA CASTILLO
604ce0e2-540b-4d23-9379-055faeb72d87	fedb4b05-e281-4956-9367-5a0530976e60	CODIPSA	\N	J0310000395543	KM 9 CARRETERA NUEVA A LEON	\N	\N	f	\N	2026-08-07 03:00:41.477	2026-08-07 03:00:41.477	\N	\N	\N	00455	\N	\N	\N	ARLES DAVID CENTENO
0e653d97-c397-417a-bb24-bfa29a2d3d43	fedb4b05-e281-4956-9367-5a0530976e60	HENRY DAVID PICHARDO BERRIOS	\N	\N	BO. LA FUENTE ,MADERERIA HALCON NEGRO 20 VRS O CASA N° C-51	\N	8705-5324	f	\N	2026-08-07 03:00:41.478	2026-08-07 03:00:41.478	001-191182-0031T	\N	\N	00456	\N	\N	8705-5324	NYLSKA JOHANNY GARCIA CASTILLO
09cb6809-c4de-45d4-bd7d-24e001e80495	fedb4b05-e281-4956-9367-5a0530976e60	PABLO ANTONIO AREAS DAVILA	\N	\N	CIUDAD JARDIN CALLE 14 DE SEPTIEMBRE CASA # N-29	\N	8463-1954	f	\N	2026-08-07 03:00:41.479	2026-08-07 03:00:41.479	081-150154-0003H	\N	\N	00457	\N	\N	8463-1954	ARLES DAVID CENTENO
a71dd809-d827-48fa-b26d-87e1b7c59c50	fedb4b05-e281-4956-9367-5a0530976e60	HERCTOR EFRAIN RIVERA COLON	\N	\N	\N	\N	8481-7131	f	\N	2026-08-07 03:00:41.48	2026-08-07 03:00:41.48	001-270973-0003M	\N	\N	00458	\N	\N	8481-7131	ARLES DAVID CENTENO
7308b7d8-2116-491d-85d1-98cc9e5981d4	fedb4b05-e281-4956-9367-5a0530976e60	HECTOR EFRAIN RIVERA COLON	\N	\N	\N	\N	8481-7131	f	\N	2026-08-07 03:00:41.481	2026-08-07 03:00:41.481	001-270973-0003M	CRÉDITO 30 DIAS	37000	00459	\N	\N	8481-7131	ARLES DAVID CENTENO
992f691b-5a6a-4c0b-a2f3-74ff73ea857e	fedb4b05-e281-4956-9367-5a0530976e60	ROGER EDUARDO VEGA RODRIGUEZ	\N	\N	\N	\N	5738-8764	f	\N	2026-08-07 03:00:41.481	2026-08-07 03:00:41.481	001-241179-0031V	\N	\N	00460	\N	\N	5738-8764	NYLSKA JOHANNY GARCIA CASTILLO
186cdbe3-396d-4b93-89eb-4ec02b05dd7c	fedb4b05-e281-4956-9367-5a0530976e60	AUGUSTO RIVERA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.482	2026-08-07 03:00:41.482	\N	\N	\N	00461	\N	\N	\N	BISMARK MURILLO
70b060d7-52a1-4c97-9e33-0fa2efd8452b	fedb4b05-e281-4956-9367-5a0530976e60	WILLIAM ADRIAN ZELAYA NARVAEZ	\N	\N	BO. QUINTA NINA DE DONDE FUE LA SELECTA 2 C O. 75 VRS N.	\N	7533 0458	f	\N	2026-08-07 03:00:41.482	2026-08-07 03:00:41.482	281-170574-0018Y	\N	\N	00462	\N	\N	7533 0458	NYLSKA JOHANNY GARCIA CASTILLO
78cdcfde-3b76-473d-9754-2b824155f104	fedb4b05-e281-4956-9367-5a0530976e60	LUBIANKA DANIELA HUETE MONCADA	\N	\N	BO. LOMA LINDA DE DONDE FUE SURTIDORA EL GASTON 1 1/2 C O.	\N	8351-6543	f	\N	2026-08-07 03:00:41.483	2026-08-07 03:00:41.483	001-171092-0028A	\N	\N	00463	\N	\N	8351-6543	ARLES DAVID CENTENO
2b9b2a12-5a03-4504-8f08-19ae5f77d011	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALBERTO ROMERO QUINTANILLA	\N	\N	SAN RAFAEL DEL SUR/ MASACHAPA COSTADO SUR DEL CAMPO DEPORTIVO	\N	8516-4616	f	\N	2026-08-07 03:00:41.484	2026-08-07 03:00:41.484	001-180879-0000E	\N	\N	00464	\N	\N	8516-4616	ARLES DAVID CENTENO
071c2401-1dee-4b12-ac69-24daf352b052	fedb4b05-e281-4956-9367-5a0530976e60	LARRY DAVID AVALOS MERCADO	\N	\N	\N	\N	7691-5654	f	\N	2026-08-07 03:00:41.484	2026-08-07 03:00:41.484	001-020785-0037V	\N	\N	00465	\N	\N	7691-5654	NYLSKA JOHANNY GARCIA CASTILLO
df5b1fa3-50a7-43af-8f9b-a9362a01f3b7	fedb4b05-e281-4956-9367-5a0530976e60	JOARA SARAI AGUILAR VANEGAS	\N	\N	RECIDENCIAL VALENCIA CALLE MARBELLA CASA # 17	\N	5821--1301	f	\N	2026-08-07 03:00:41.485	2026-08-07 03:00:41.485	001-120696-0005R	\N	\N	00466	\N	\N	5821--1301	ARLES DAVID CENTENO
cc77912c-a750-4727-98a0-9420ceea5375	fedb4b05-e281-4956-9367-5a0530976e60	LABORATORIOS RAMOS	\N	J0210000150015	\N	\N	\N	f	\N	2026-08-07 03:00:41.486	2026-08-07 03:00:41.486	\N	CONTADO	\N	00467	\N	\N	\N	ARLES DAVID CENTENO
8df50da5-a12c-4908-b723-f3325779d970	fedb4b05-e281-4956-9367-5a0530976e60	MARLON FABRICIO GATICA VARELA	\N	\N	MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.487	2026-08-07 03:00:41.487	001-070273-0040S	CONTADO	\N	00468	\N	\N	\N	AGNEL CASTILLO
7d9d3d88-17af-4aa1-87e8-9824326d488b	fedb4b05-e281-4956-9367-5a0530976e60	ARZECA S,A / CRISTHIAN MARIA VARELA	\N	J0310000392471	LISDA VISTA SUR TIENDAS 3 B 2 C AL SUR 75 VRS AL ESTE	\N	8633-0623	f	\N	2026-08-07 03:00:41.488	2026-08-07 03:00:41.488	001-181191-0011V	CONTADO	\N	00469	\N	\N	8633-0623	ARLES DAVID CENTENO
0013c7f2-d06c-4423-8afb-25058d3b9708	fedb4b05-e281-4956-9367-5a0530976e60	RICARDO ANTONIO VASQUEZ ARROLIGA	\N	\N	\N	\N	7624-7151	f	\N	2026-08-07 03:00:41.488	2026-08-07 03:00:41.488	001-190989-0003M	\N	\N	00470	\N	\N	7624-7151	NYLSKA JOHANNY GARCIA CASTILLO
92c2ad51-b8cc-44a4-95d7-6fefe1aecb38	fedb4b05-e281-4956-9367-5a0530976e60	DOMINGO MANUEL GAMEZ CALERO	\N	\N	RESIDENCIAL PALMANOVA KM14 C MASAYA 3 KM A VERACRUZ CALLE 7 CASA # 57	\N	5700-0905	f	\N	2026-08-07 03:00:41.489	2026-08-07 03:00:41.489	001-300791-0059X	\N	\N	00471	\N	\N	5700-0905	ARLES DAVID CENTENO
c37e9918-e9ec-47ae-8f78-825fc5f327f7	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO SAMUEL RODRIGUEZ MONCADA	\N	\N	BO. CARLOS FONSECA AMADOR CENTRO DE SALUD PEDRO ALTAMIRANO 1 C O M/D	\N	\N	f	\N	2026-08-07 03:00:41.49	2026-08-07 03:00:41.49	001-280175-0054L	\N	\N	00472	\N	\N	\N	BISMARK MURILLO
b2d71fe7-7d48-4379-87a6-ab1593541df2	fedb4b05-e281-4956-9367-5a0530976e60	CANDIDA ROSA MADRIZ DELGADO	\N	\N	CASA COMUNAL ESQUIPULAS 3 C ARRIBA	\N	8590-8603	f	\N	2026-08-07 03:00:41.49	2026-08-07 03:00:41.49	001-190563-0030G	\N	\N	00473	\N	\N	8590-8603	ARLES DAVID CENTENO
342ff989-c21f-4da7-bf52-a6a4c8a24738	fedb4b05-e281-4956-9367-5a0530976e60	RONNIE JOSE QUINTANILLA CRUZ	\N	\N	CHICHIGALPA  REPARTO  QUETZALIA PORTON ISA 2 C AL ESTE 1/2 C AL SUR 2 C AL ESTE	\N	8663-5723	f	\N	2026-08-07 03:00:41.491	2026-08-07 03:00:41.491	084-040391-0000U	\N	\N	00474	\N	\N	8663-5723	ARLES DAVID CENTENO
d3c53173-b979-472e-8bd2-a53deb7506a1	fedb4b05-e281-4956-9367-5a0530976e60	CUBAS ELECTRIC S,A	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.491	2026-08-07 03:00:41.491	\N	\N	\N	00475	\N	\N	\N	ARLES DAVID CENTENO
d10a44e3-e4b4-4aa2-8e47-510c91d15b2b	fedb4b05-e281-4956-9367-5a0530976e60	MILVIAN JOHANNA LOPEZ LARA	\N	\N	NAGAROTE BARRIO ORLANDO CACERES INSTITUTO FERNANDO SALAZAR 2 C AL SUR	\N	8903-8110	f	\N	2026-08-07 03:00:41.492	2026-08-07 03:00:41.492	001-101080-0002W	CONTADO	\N	00476	\N	\N	8903-8110	ARLES DAVID CENTENO
092ca256-02c5-424a-82c3-d41d07aac9d7	fedb4b05-e281-4956-9367-5a0530976e60	BIENESE RAICES UNIVERSALES S,A / BRUSA	\N	J0310000095973	BELLO HORIZONTE DE LA TAQUIZA 1 C AL SUR CASA IV-4	VENTAS@BRUSA.COM.NI	7872-5934	f	\N	2026-08-07 03:00:41.493	2026-08-07 03:00:41.493	J0310000095973	\N	\N	00477	\N	2248-4184	7872-5934	ARLES DAVID CENTENO
f1f09082-4535-4bcc-a843-9484acda3455	fedb4b05-e281-4956-9367-5a0530976e60	DEREK YAHIR SALINAS CHAVARRIA	\N	\N	ANEXO  EVENOR NOGUERA CASA # 12 TOLA /RIVAS	\N	8176-6615	f	\N	2026-08-07 03:00:41.494	2026-08-07 03:00:41.494	001-010905-1061E	\N	\N	00478	\N	\N	8176-6615	ARLES DAVID CENTENO
2ebc799a-c4c7-417a-9ac7-6e40504ce2b5	fedb4b05-e281-4956-9367-5a0530976e60	MARIA GABRIELA ALMANZA GARCIA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.495	2026-08-07 03:00:41.495	\N	CRÉDITO 30 DIAS	100000	00479	\N	\N	\N	YAHOSKA D'TRINIDAD
fa2fdcb4-b8db-49b0-97f8-794be2bb9394	fedb4b05-e281-4956-9367-5a0530976e60	LESDIS JOSE ACEVEDO REYES	\N	\N	COMARCA PORTOBANCO IGLESIA CATOLICA 2 KM AL OESTE LEON	\N	8232-2956	f	\N	2026-08-07 03:00:41.495	2026-08-07 03:00:41.495	291-181001-1000W	\N	\N	00480	\N	\N	8232-2956	ARLES DAVID CENTENO
a4fe7f53-ce46-4f48-8377-cb82de3f46ce	fedb4b05-e281-4956-9367-5a0530976e60	EDWIN ROBERTO LOPEZ ARROLIGA	\N	\N	BO. SAN LUIS SUR CENTRO DE SALUD FRANCISCO BUITRAGO 1 1/2 C S M/I	\N	7773-6528	f	\N	2026-08-07 03:00:41.496	2026-08-07 03:00:41.496	001-100591-0001D	\N	\N	00481	\N	\N	7773-6528	NYLSKA JOHANNY GARCIA CASTILLO
6d58900c-e8e4-46bf-81fd-53fd97dfcdf3	fedb4b05-e281-4956-9367-5a0530976e60	ELVIN JOSE SOTELO	\N	\N	ZONA N° 5 PUENTE 1 C O 1C N 1/2 C E CASA N° X-12	\N	8168-3262	f	\N	2026-08-07 03:00:41.497	2026-08-07 03:00:41.497	01-291092-0074B	\N	\N	00482	\N	\N	8168-3262	NYLSKA JOHANNY GARCIA CASTILLO
757f2f28-32ef-47d6-a596-0ebbc69e5118	fedb4b05-e281-4956-9367-5a0530976e60	MARVIN JAVIER PEREZ LOZANO	\N	\N	RECIDENCIAL MAYALES AGUJA 11 C AL SUR 1 C AL ESTE CASA #177	\N	8796-4602	f	\N	2026-08-07 03:00:41.497	2026-08-07 03:00:41.497	001-120788-0034X	\N	\N	00483	\N	\N	8796-4602	ARLES DAVID CENTENO
d23af6e0-8261-4a1a-879b-2b86e711b872	fedb4b05-e281-4956-9367-5a0530976e60	DIEGO SANTIAGO GUEVARA BLANCO	\N	\N	BO. EDGARD LANG DE DOND E FUE BANCO POPÚLAR 1/2 C S.	\N	\N	f	\N	2026-08-07 03:00:41.498	2026-08-07 03:00:41.498	001-031204-1044Q	\N	\N	00484	\N	\N	\N	BISMARK MURILLO
ebc4e430-163e-42ce-965d-3b165130f0f9	fedb4b05-e281-4956-9367-5a0530976e60	CORTEZ RENTACAR/ LUIS CORTEZ DOMINGUEZ	\N	J0310000243905	SEMAFAROS DE LA SANDACK MERCADO IVAN 2 C ARRIBA	\N	8802-4753	f	\N	2026-08-07 03:00:41.499	2026-08-07 03:00:41.499	\N	\N	\N	00485	8911-5202	2253-2887	8802-4753	ARLES DAVID CENTENO
5a133955-6f1a-4161-a570-df02fc97d447	fedb4b05-e281-4956-9367-5a0530976e60	IMELCO S,A /LILIAN LETICIA LINAREZ MATAMOROS	\N	J0310000431582	BARRIO CAMPO BRUCE IGLESIA SAN NICOLAS TOLENTINO 2 1/2 C AL ESTE	\N	8943-9577	f	\N	2026-08-07 03:00:41.5	2026-08-07 03:00:41.5	0601-2000-01715	CONTADO	\N	00486	\N	\N	8943-9577	ARLES DAVID CENTENO
e58bc8c9-a55c-4e53-8092-82fab1ae93b5	fedb4b05-e281-4956-9367-5a0530976e60	TECNOVISION NICARAGUA / MILAGROS ALEMAN GAITAN	\N	\N	\N	\N	506 7005 8895	f	\N	2026-08-07 03:00:41.501	2026-08-07 03:00:41.501	\N	\N	\N	00487	\N	\N	506 7005 8895	NYLSKA JOHANNY GARCIA CASTILLO
f3cddace-bb8e-470d-9c9a-d9e975bd1761	fedb4b05-e281-4956-9367-5a0530976e60	ALEJANDRO ANTONIO GALO LEIVA	\N	\N	\N	\N	8552-1401	f	\N	2026-08-07 03:00:41.501	2026-08-07 03:00:41.501	001-040787-0042U	CRÉDITO 30 DIAS	5000	00488	\N	\N	8552-1401	NYLSKA JOHANNY GARCIA CASTILLO
ddc72123-945a-4a1e-ab75-350adc6cb72d	fedb4b05-e281-4956-9367-5a0530976e60	DORIS FLORES TORREZ/ OCTAVIO JAVIER ARAGON JEREZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.502	2026-08-07 03:00:41.502	001-070892-001W	\N	\N	00489	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
9cae90ce-29a4-4023-919f-8c7bc4825824	fedb4b05-e281-4956-9367-5a0530976e60	RAUL ANTONIO ZUNIGA MATAMOROS	\N	\N	BARRIO JOSE SANTOS ZELAYA INSTITUTO NACIONAL DARIO 6C AL ESTE 11/2 C AL SUR CIUDDAD DARIO	\N	8747-3154	f	\N	2026-08-07 03:00:41.503	2026-08-07 03:00:41.503	001-080382-0010U	\N	\N	00490	\N	\N	8747-3154	ARLES DAVID CENTENO
e0721c9f-80db-487c-9b5f-77af6c3fe9b2	fedb4b05-e281-4956-9367-5a0530976e60	URIEL ISAAC CHAVEZ SOLANO	\N	\N	BARRIO JOSE DOLORES ESTRADA DE LA MABER 4 C AL NORTE 3 C AL ESTE	\N	8863-2904	f	\N	2026-08-07 03:00:41.504	2026-08-07 03:00:41.504	001-300903-1022L	\N	\N	00491	\N	\N	8863-2904	ARLES DAVID CENTENO
79ac0aef-e821-4f60-989a-40d1bccf4206	fedb4b05-e281-4956-9367-5a0530976e60	GEOVANNY RAUL JARQUIN FLORES	\N	\N	BO. GEORGINO ANDRADE COSTADO NORTE PARQUE RUBENIA 1C E 1C N 1C O	\N	8879 8183	f	\N	2026-08-07 03:00:41.504	2026-08-07 03:00:41.504	001-190779-0091Y	\N	\N	00492	\N	\N	8879 8183	NYLSKA JOHANNY GARCIA CASTILLO
3e14b9e1-e27b-40a3-83c1-236886b9c3cd	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ANTONIO PALACIOS MEDRANO	\N	\N	VILLA FONTANA SUR CLUB TERRAZA 2.4 KM AL SUR	\N	8272-9083	f	\N	2026-08-07 03:00:41.505	2026-08-07 03:00:41.505	001-230567-0006S	\N	\N	00493	\N	\N	8272-9083	ARLES DAVID CENTENO
fcb04108-cf3c-453a-adf6-2892486b5252	fedb4b05-e281-4956-9367-5a0530976e60	PERSIANAS DECORATIVAS	\N	J0510000026148	SEMAFAROS KM 10.5 CARRETERA MASAYA 3 C AL SUR FRENTE DEL AUTO HOTEL 10.5	\N	8875-0529	f	\N	2026-08-07 03:00:41.506	2026-08-07 03:00:41.506	\N	\N	\N	00494	\N	\N	8875-0529	ARLES DAVID CENTENO
f08bfb1e-5295-415b-ba66-079a4d194e8b	fedb4b05-e281-4956-9367-5a0530976e60	REY DAVID PRADO ARTEAGA	\N	\N	COMARCA BUENA VISTA KM 21 C MASAYA  800 MTS AL NORTE 200 VRS AL SUR	\N	8687-8790	f	\N	2026-08-07 03:00:41.507	2026-08-07 03:00:41.507	086-210482-0004B	\N	\N	00495	\N	\N	8687-8790	ARLES DAVID CENTENO
3533f365-f1cd-47ad-a065-d6794adf48ca	fedb4b05-e281-4956-9367-5a0530976e60	JOSE MERCEDES BARRIOS SEQUEIRA	\N	\N	CMCA EL CHILAMATE TANQUE ROJO 2 C SUROESTE	\N	8395-9042	f	\N	2026-08-07 03:00:41.508	2026-08-07 03:00:41.508	201-070868-0005Y	\N	\N	00496	\N	\N	8395-9042	ARLES DAVID CENTENO
aa5a346d-c9ef-4822-b34f-84c4a27507a1	fedb4b05-e281-4956-9367-5a0530976e60	TEODORO ANTONIO GUTIERREZ GUTIERREZ	\N	\N	BO. RENE POLANCO SUPER EXPRESS 5C. N. CASA N°S-10	\N	8645 4704	f	\N	2026-08-07 03:00:41.508	2026-08-07 03:00:41.508	001-071177-0063E	CRÉDITO 30 DIAS	100000	00497	\N	\N	8645 4704	NYLSKA JOHANNY GARCIA CASTILLO
d44f999f-46a3-4bcc-b8b2-cecea2706d04	fedb4b05-e281-4956-9367-5a0530976e60	BLADIMIR SALOMON LARA PARAMO	\N	\N	BO. NUEVA LIBIA ROTONDA LA VIRGEN 2C S.1C O. 1/2 N. CASA N°G-5	\N	8447-8902	f	\N	2026-08-07 03:00:41.509	2026-08-07 03:00:41.509	041-030976-003T	\N	\N	00498	\N	\N	8447-8902	ARLES DAVID CENTENO
d7ac4fc6-968e-4cfc-8bcd-ef8d6314478b	fedb4b05-e281-4956-9367-5a0530976e60	WALTER ANTONIO ARROLIGA CONDE	\N	\N	SABANA GRANDE 2DA IGLESIA DE CRISTO 3 C AL SUR	\N	7710-7706	f	\N	2026-08-07 03:00:41.51	2026-08-07 03:00:41.51	001-240971-0035F	\N	\N	00499	\N	\N	7710-7706	ARLES DAVID CENTENO
c659f9cd-d936-4699-801e-4b61fdad217d	fedb4b05-e281-4956-9367-5a0530976e60	CONCEPCION DE MARIA PERALTA PEREZ	\N	\N	COL. CUATRO DE MAYO COSTADO NORTE HOSPITAL AMISTAD MEXICO NICARAGUA	\N	\N	f	\N	2026-08-07 03:00:41.511	2026-08-07 03:00:41.511	203-080862-0002Q	\N	\N	00500	\N	\N	\N	BISMARK MURILLO
7933da36-d3c7-457e-948e-77faafc0ddfe	fedb4b05-e281-4956-9367-5a0530976e60	JULIO CESAR RIVERA DAVILA	\N	\N	COLONIA 10 DE JUNIO CRUZ ROJA DON BOSCO 41/2 C AL NORTE CASA C-614	\N	8822-2786	f	\N	2026-08-07 03:00:41.512	2026-08-07 03:00:41.512	441-120478-0000X	\N	\N	00501	\N	\N	8822-2786	ARLES DAVID CENTENO
58f21e88-e8ff-44c4-996c-45f5bce68679	fedb4b05-e281-4956-9367-5a0530976e60	ANUAR ALFONSO MANZANO	\N	\N	ROTONDA CRISTO REY 3 C AL SUR 1 C ABAJO 20 VRS AL LAGO	\N	57771346	f	\N	2026-08-07 03:00:41.512	2026-08-07 03:00:41.512	001-030980-0011K	\N	\N	00502	\N	\N	57771346	ARLES DAVID CENTENO
b513455d-cb6a-4a7b-aca0-5d0245d3a779	fedb4b05-e281-4956-9367-5a0530976e60	RICARDO FRANCISCO PEÑA ESPINALES	\N	\N	BARRIO LA REYNAGA PUENTE 5 C AL OESTE 25 VRS AL NORTE	\N	8751-2983	f	\N	2026-08-07 03:00:41.513	2026-08-07 03:00:41.513	001-230585-0053V	\N	\N	00503	\N	\N	8751-2983	ARLES DAVID CENTENO
7626b52e-4baa-4b78-97db-f9fd97399149	fedb4b05-e281-4956-9367-5a0530976e60	ARNOLD JOSEPH NAVARRO	\N	\N	CMCA. CEDRO GALAN KM 13 CARRETERA VIEJA LEON 500MTS S.	\N	8555-1616	f	\N	2026-08-07 03:00:41.514	2026-08-07 03:00:41.514	404-031282-0001R	\N	\N	00504	\N	\N	8555-1616	NYLSKA JOHANNY GARCIA CASTILLO
6b981800-1797-4159-8ab2-45d22640b9ae	fedb4b05-e281-4956-9367-5a0530976e60	JOSEPH ALFREDO OLIVAS	\N	\N	BARRIO SANTO DOMINGO IGLESIA STO DOMINGO 1 C AL SUR 1/2 C AL OESTE	\N	7809-6405	f	\N	2026-08-07 03:00:41.514	2026-08-07 03:00:41.514	001-100590-0043E	CRÉDITO 30 DIAS	\N	00505	\N	\N	7809-6405	ARLES DAVID CENTENO
7fe79e6f-0a6a-43b2-9a67-3597d955cb72	fedb4b05-e281-4956-9367-5a0530976e60	FELIX ROBERTO MENDOZA ESPINOZA	\N	\N	SAN LORENZO BOACO COMARCA TIERRA BLANCA FINCA JERUSALEN	\N	8775-1467	f	\N	2026-08-07 03:00:41.515	2026-08-07 03:00:41.515	288-121288-0000K	\N	\N	00506	\N	\N	8775-1467	ARLES DAVID CENTENO
4fcab583-98d7-4913-8313-febc5c03e1e1	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS  ALBERTO GARCIA MORALES	\N	\N	RPTO SAN JUAN DONDE FUE RESTAURANTE EL QUELITE 2C N. 1/2C E. CASA N°2	\N	\N	f	\N	2026-08-07 03:00:41.515	2026-08-07 03:00:41.515	001-120190-0004Q	\N	\N	00507	\N	\N	\N	ARLES DAVID CENTENO
fe951922-64c1-4fad-9ec9-e003c4f40431	fedb4b05-e281-4956-9367-5a0530976e60	HECTOR BETANCOURT	\N	\N	MANAGUA	\N	84817131	f	\N	2026-08-07 03:00:41.516	2026-08-07 03:00:41.516	\N	CRÉDITO 30 DIAS	37000	00508	\N	\N	84817131	BISMARK MURILLO
7bae0d0c-4859-4125-b55d-4f7a86482681	fedb4b05-e281-4956-9367-5a0530976e60	JUAN TELLEZ MORALES	\N	\N	\N	\N	76952593	f	\N	2026-08-07 03:00:41.516	2026-08-07 03:00:41.516	\N	CRÉDITO 30 DIAS	36000	00509	\N	\N	76952593	BISMARK MURILLO
bcbb64ee-1794-4fda-8eeb-ba5d033c88b7	fedb4b05-e281-4956-9367-5a0530976e60	EDUARDO SIMON RODRIGUEZ CARDOZA	\N	\N	CHINANDEGA. BO EL CALVARIO, CASA PELLAS 1C OESTE, 75 VRS NORTE	\N	\N	f	\N	2026-08-07 03:00:41.517	2026-08-07 03:00:41.517	\N	CRÉDITO 30 DIAS	36000	00510	\N	\N	\N	ARLES DAVID CENTENO
661c32b6-6cde-428e-829c-26254985393c	fedb4b05-e281-4956-9367-5a0530976e60	ARNOLD NAVARRO	\N	\N	\N	\N	85551616	f	\N	2026-08-07 03:00:41.518	2026-08-07 03:00:41.518	\N	CRÉDITO 30 DIAS	37000	00511	\N	\N	85551616	NYLSKA JOHANNY GARCIA CASTILLO
c6daf9f7-90dc-4ea8-8dc5-dc80b635bd6d	fedb4b05-e281-4956-9367-5a0530976e60	INVERSIONES BEL S,A	\N	J0310000107882	KM 14 CARRETERA MASAYA , 1900 MTRS A VERACRUZ	WWW.INVERSIONESBEL.COM	2270-1070	f	\N	2026-08-07 03:00:41.519	2026-08-07 03:00:41.519	J0310000107882	CRÉDITO 15 DIAS	1000	00512	8130-4306	\N	2270-1070	ARLES DAVID CENTENO
6fbfafb2-3d79-47b8-891a-f6ab304dcc22	fedb4b05-e281-4956-9367-5a0530976e60	JOSE URIEL ESTRADA LEIVA	\N	\N	BO. BELLA AURORA TERMINAL RUTA 168, 4 C S 2C E.	\N	8461-7122	f	\N	2026-08-07 03:00:41.52	2026-08-07 03:00:41.52	001-060489-0054G	\N	\N	00513	\N	\N	8461-7122	ARLES DAVID CENTENO
e9c44462-37b4-444b-9d02-d9acb5b5ca95	fedb4b05-e281-4956-9367-5a0530976e60	OSMAR ALBERTO GONZALES VANEGAS	\N	\N	\N	\N	8884-6403	f	\N	2026-08-07 03:00:41.521	2026-08-07 03:00:41.521	001-301282-0000Q	\N	100000	00514	\N	\N	8884-6403	NYLSKA JOHANNY GARCIA CASTILLO
319f06c4-2f85-4077-9c48-2eba985eb8bf	fedb4b05-e281-4956-9367-5a0530976e60	SILVIO ALONSO LOPEZ ORTIZ	\N	\N	COMARCA ZEMBRANO 1RA ENTRADA 11/2 C AL SUR TIPITAPA	\N	8627-1083	f	\N	2026-08-07 03:00:41.523	2026-08-07 03:00:41.523	003-271077-0002K	\N	\N	00515	\N	\N	8627-1083	ARLES DAVID CENTENO
72689cdd-cc5c-40cb-b21f-b2abf32b803f	fedb4b05-e281-4956-9367-5a0530976e60	LUIS MANUEL CASERES LOPEZ	\N	\N	BARRIO COLINAS DE LA BENDICION CEMENTERIO MILAGRO DE DIOS 2 C AL OESTE  4 C AL NORTE 1 C AL OESTE	\N	8112-0563	f	\N	2026-08-07 03:00:41.524	2026-08-07 03:00:41.524	001-140468-0059T	\N	\N	00516	\N	\N	8112-0563	ARLES DAVID CENTENO
e33f1c97-9032-44c8-a210-15b1d9d9d3b9	fedb4b05-e281-4956-9367-5a0530976e60	MANOS PROFECIONALES DE NICARAGUA S,A	\N	\N	BANPRO PORTEZUELO 2C AL SUR 1/2 CUADRA  ARRIBA	CONTABILIDAD@MAPRONICSA.COM	8252-2468	f	\N	2026-08-07 03:00:41.525	2026-08-07 03:00:41.525	J0310000099553	\N	\N	00517	2249-7078	2251-4872	8252-2468	ARLES DAVID CENTENO
8ef7e52e-c270-4407-a6e5-153a50a50386	fedb4b05-e281-4956-9367-5a0530976e60	KRISTOPHER ROBIN ANTONIO VALVERDE CISNEROS	\N	\N	BARRIO WALTER FERRETI COSTADO OESTE CENTRO DE SALUD CARLOS RUGAMA CASA # A-4	\N	7548-5536	f	\N	2026-08-07 03:00:41.527	2026-08-07 03:00:41.527	001-290596-0011D	\N	\N	00518	\N	\N	7548-5536	ARLES DAVID CENTENO
e5425f02-b4e3-4608-bbdc-c663afc9c03d	fedb4b05-e281-4956-9367-5a0530976e60	JOSE RUBEN FRANCO GUEVARA/OSCAR DAVILA	\N	\N	COMARCA SAN ANTONIO ENTRADA PRINCIPAL TEPEYAC 500MTRS AL ESTE/GRANADA	\N	\N	f	\N	2026-08-07 03:00:41.528	2026-08-07 03:00:41.528	204-150463-0000P	\N	\N	00519	\N	\N	\N	ARLES DAVID CENTENO
4d6ef55e-4110-47b6-adb7-e2e60c7b0e18	fedb4b05-e281-4956-9367-5a0530976e60	JUAN MARTIN BOLAÑOS MENDEZ	\N	\N	COL. LOS MAESTROS PREESCOLAR PEQUEÑO BENJAMIN 1C. E M/D	\N	8957-9787	f	\N	2026-08-07 03:00:41.529	2026-08-07 03:00:41.529	003-240690-0001F	\N	\N	00521	\N	\N	8957-9787	NYLSKA JOHANNY GARCIA CASTILLO
2d3182ec-eb04-4b26-9b49-ab86694de4e4	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS NICARAGUA CAMPOS	\N	\N	\N	\N	77293210	f	\N	2026-08-07 03:00:41.531	2026-08-07 03:00:41.531	001-081283-0002P	CONTADO	\N	00522	\N	77293210	\N	AGNEL CASTILLO
6e2061bd-8ed7-4b85-b8b7-3343a1735e7f	fedb4b05-e281-4956-9367-5a0530976e60	HENRY LOPEZ VALLECILLOS	\N	\N	RESD. LOMAS DEL VALLE  ENTRADA PRINCIPAL 5C E. CASA N.P-16	\N	89147344	f	\N	2026-08-07 03:00:41.533	2026-08-07 03:00:41.533	001-060598-1018X	\N	\N	00523	\N	\N	89147344	AGNEL CASTILLO
12008e1c-850d-4938-be8f-17d8e271b13c	fedb4b05-e281-4956-9367-5a0530976e60	ALEXANDER VANEGA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.535	2026-08-07 03:00:41.535	76198448	\N	\N	00524	\N	\N	\N	AGNEL CASTILLO
bb1442f4-ae27-4c72-bc51-31d1b597e0d1	fedb4b05-e281-4956-9367-5a0530976e60	MIGUEL ANGEL TALAVERA POLANCO	\N	\N	\N	\N	7851-4312	f	\N	2026-08-07 03:00:41.537	2026-08-07 03:00:41.537	0011111920012B	\N	\N	00525	\N	\N	7851-4312	ARLES DAVID CENTENO
754c55bc-0da9-4afd-8d95-0d988150987a	fedb4b05-e281-4956-9367-5a0530976e60	ELIAS GOMEZ GARCIA	\N	\N	VL. VENEZUELA GRIPO D , ANDEN 1 CASA N-1475	\N	89543050	f	\N	2026-08-07 03:00:41.539	2026-08-07 03:00:41.539	001-020180-0049W	\N	\N	00526	\N	89543050	\N	AGNEL CASTILLO
05dcf030-c6dc-48e2-af09-9981585fce91	fedb4b05-e281-4956-9367-5a0530976e60	NASER ZAMORA OBREGON	\N	\N	COLEGIO MAXIMO JEREZ DE DONDE FUE LAVANDERIA FENIX 1/2C. N CASA C-16	\N	83765004	f	\N	2026-08-07 03:00:41.54	2026-08-07 03:00:41.54	001-160875-0072A	\N	\N	00527	\N	\N	83765004	AGNEL CASTILLO
57ce9c15-c36d-493e-8ee9-07a0b396f3cb	fedb4b05-e281-4956-9367-5a0530976e60	ERNESTO SUARES  FUENTES	\N	\N	\N	\N	75162369	f	\N	2026-08-07 03:00:41.542	2026-08-07 03:00:41.542	441-010878-0012N	\N	\N	00528	\N	\N	75162369	AGNEL CASTILLO
543530a6-5758-4469-97eb-76cc74af09ed	fedb4b05-e281-4956-9367-5a0530976e60	JOSE LUIS RVAS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.544	2026-08-07 03:00:41.544	361-020184-0004M	\N	\N	00529	\N	\N	\N	AGNEL CASTILLO
79d0f45b-8aff-4734-a7df-83c5f4bf124c	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO JOAQUIN  GABO	\N	\N	\N	\N	87990380	f	\N	2026-08-07 03:00:41.545	2026-08-07 03:00:41.545	\N	\N	\N	00530	\N	\N	87990380	AGNEL CASTILLO
39a68fe3-4f61-4ca5-b51b-7a681a18330e	fedb4b05-e281-4956-9367-5a0530976e60	MRCOS VALENTIS	\N	\N	RESIDENCIAL SANJOACOCHE KILOMETRO 12 CARRETERA A MASAYA	\N	84650350	f	\N	2026-08-07 03:00:41.546	2026-08-07 03:00:41.546	\N	\N	\N	00531	\N	\N	84650350	AGNEL CASTILLO
776ac4f4-6068-482b-8255-51139722e717	fedb4b05-e281-4956-9367-5a0530976e60	MYNOR  GONZALES (ARMECAM)	\N	\N	\N	\N	81959294	f	\N	2026-08-07 03:00:41.547	2026-08-07 03:00:41.547	\N	\N	\N	00532	\N	\N	81959294	AGNEL CASTILLO
5d62af58-ead0-4246-9613-a7895f831f39	fedb4b05-e281-4956-9367-5a0530976e60	JORGE BUTILLO GUTIERREZ(TECNOSERVICIOS)	\N	\N	\N	\N	86441059	f	\N	2026-08-07 03:00:41.547	2026-08-07 03:00:41.547	\N	\N	\N	00533	\N	\N	86441059	AGNEL CASTILLO
027d63cd-dd28-4989-a722-aad3d7a6c41d	fedb4b05-e281-4956-9367-5a0530976e60	JOHAN NARVAEZ	\N	\N	BO. MILAGRO DE DIOS DE DONDE FUE LA SANDAX IVAN MONTENEGRO 17C S. 1C O	\N	86904733	f	\N	2026-08-07 03:00:41.548	2026-08-07 03:00:41.548	001-090301-1005T	\N	\N	00534	\N	\N	86904733	AGNEL CASTILLO
5b0fa698-88f7-4c2c-8f06-10c2d586e0a5	fedb4b05-e281-4956-9367-5a0530976e60	JOSE JAVIER ORTIZ CERDA	\N	\N	BO° LA CRUZ POZO CANAL 500 VRS OESTE	\N	8480-1889	f	\N	2026-08-07 03:00:41.549	2026-08-07 03:00:41.549	043-071275-0000J	CONTADO	\N	00535	\N	\N	8480-1889	AGNEL CASTILLO
1b327573-2323-4c8a-9db6-98d8d91debb3	fedb4b05-e281-4956-9367-5a0530976e60	LENIN CASTILLO (SOLAYRE )	\N	\N	\N	\N	82446588	f	\N	2026-08-07 03:00:41.55	2026-08-07 03:00:41.55	\N	\N	\N	00536	\N	\N	82446588	AGNEL CASTILLO
0745859a-a8f8-4b8b-a3d1-c53ec06a11f1	fedb4b05-e281-4956-9367-5a0530976e60	JUAN DIEGO PEREZ LARIOS	\N	\N	\N	\N	76273214	f	\N	2026-08-07 03:00:41.55	2026-08-07 03:00:41.55	401-190997-1003M	\N	\N	00537	\N	\N	76273214	AGNEL CASTILLO
16263e52-7ad3-4f43-979b-20e61a359ef6	fedb4b05-e281-4956-9367-5a0530976e60	JULIO ALBERTO MARQUEZ	\N	\N	RP. CAILAGUA ENTRADA PRINCIPAL 700 VRS 5C. 1C E. 2 C.S. MASAYA	\N	83637599	f	\N	2026-08-07 03:00:41.551	2026-08-07 03:00:41.551	401-290497-0002N	\N	\N	00538	\N	\N	83637599	AGNEL CASTILLO
4e62a0f4-7844-41c6-ae02-446fd5d31f28	fedb4b05-e281-4956-9367-5a0530976e60	RAMIRO VALLADARES (TECNI-GLASS)	\N	\N	\N	\N	78696061	f	\N	2026-08-07 03:00:41.552	2026-08-07 03:00:41.552	\N	\N	\N	00539	\N	\N	78696061	AGNEL CASTILLO
25c82db6-fc1d-4365-9ef9-a874bc11dace	fedb4b05-e281-4956-9367-5a0530976e60	GERMAN TINOCO (SINTER)	\N	\N	\N	\N	83727352	f	\N	2026-08-07 03:00:41.552	2026-08-07 03:00:41.552	\N	\N	\N	00540	\N	\N	83727352	AGNEL CASTILLO
87cd0b4a-3e88-465b-ac29-215030641617	fedb4b05-e281-4956-9367-5a0530976e60	DANIEL ERNESTO PASTORA MONTALVAN	\N	\N	LEON -BARRIO FUNDECI 3 ETAPA COSTADO ESTE AGENCIA POLLO ESTERLLA	\N	5878-0454	f	\N	2026-08-07 03:00:41.553	2026-08-07 03:00:41.553	281-070988-0002K	\N	\N	00541	\N	\N	5878-0454	ARLES DAVID CENTENO
fe37df94-4eac-4f73-8248-a95d31b8f739	fedb4b05-e281-4956-9367-5a0530976e60	BELKIS DONATINA AMADOR BONILLA	\N	\N	RESIDENCIAL SIERRAS DORADAS KM 16.8 C MASAYA 700 MTS AL OESTE CASA # M-1 TICUANTEPE	\N	5806-0528	f	\N	2026-08-07 03:00:41.554	2026-08-07 03:00:41.554	001-080684-0026V	\N	\N	00542	\N	\N	5806-0528	ARLES DAVID CENTENO
27073cfd-74e0-4d0b-9fd5-42055b17e2a0	fedb4b05-e281-4956-9367-5a0530976e60	GUILLERMO ALBERTO TOVAL JAENZ	\N	\N	BARRIO SAN CRISTOBAL SEMAFAROS EL DORADO 1/2 C AL SUR 1/2 C AL ESTE	\N	8692-7631	f	\N	2026-08-07 03:00:41.554	2026-08-07 03:00:41.554	001-021197-1027H	\N	\N	00543	\N	\N	8692-7631	ARLES DAVID CENTENO
95ac1f79-9fa9-486b-baee-4cf9664916de	fedb4b05-e281-4956-9367-5a0530976e60	ING. GUILLERMO BARRETO	\N	\N	\N	\N	88984276	f	\N	2026-08-07 03:00:41.555	2026-08-07 03:00:41.555	\N	CRÉDITO 30 DIAS	36000	00544	\N	\N	88984276	AGNEL CASTILLO
3834b99b-7660-4ace-8cfd-020268d06340	fedb4b05-e281-4956-9367-5a0530976e60	LIBRERIO OFFICE SOLUTION	\N	\N	\N	\N	77873540	f	\N	2026-08-07 03:00:41.555	2026-08-07 03:00:41.555	\N	CONTADO	\N	00545	\N	\N	77873540	AGNEL CASTILLO
848b5356-8238-4dbb-a9ff-c456eaa9e120	fedb4b05-e281-4956-9367-5a0530976e60	JOSE LUIS ZAMBRANA REYES	\N	\N	BARRIO NIÑOS HEROES Y MARTIRES DE AYAPAL IGLESIA HEBRON 1 C AL OESTE 1/2 C AL SUR CASA # G-5	\N	8802-9538	f	\N	2026-08-07 03:00:41.556	2026-08-07 03:00:41.556	001-140377-0043V	\N	\N	00546	\N	\N	8802-9538	ARLES DAVID CENTENO
5913dbb9-f76f-46b6-b8a5-de2c218ed8ed	fedb4b05-e281-4956-9367-5a0530976e60	ENOC ISAAC VALLE CAMPOS	\N	\N	CMCA LAS JAGUITAS ENTRADA PRINCIPAL 100 VRS S. M/I	\N	8428-3434	f	\N	2026-08-07 03:00:41.557	2026-08-07 03:00:41.557	366-271076-0001C	\N	\N	00547	\N	\N	8428-3434	NYLSKA JOHANNY GARCIA CASTILLO
84fcd5dc-dcc5-4285-9c0a-8df8b696cff0	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ALFREDO MOLINARES SOZA	\N	\N	BARRIO HIEALEAH 4 ETAPA TERMINAL COOPERATIVA 104 4 C AL SUR	\N	8242-2225	f	\N	2026-08-07 03:00:41.558	2026-08-07 03:00:41.558	442-080882-0002N	\N	\N	00548	\N	\N	8242-2225	ARLES DAVID CENTENO
f5e8a153-3a23-4985-9402-1f9dc41f185b	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO BENJAMIN GARCIA DIAZ	\N	\N	VI. MIGUEL GUTIERREZ CASA COMUNAL 20 VRS E CASA N°422	\N	8384-3050	f	\N	2026-08-07 03:00:41.558	2026-08-07 03:00:41.558	888-240290-0001V	\N	\N	00549	\N	\N	8384-3050	NYLSKA JOHANNY GARCIA CASTILLO
3b753e24-ec39-4c2f-acab-8d9781b51fe4	fedb4b05-e281-4956-9367-5a0530976e60	CONSTRUCCIONES DUARTE/ ALEX SOMARRIBA	\N	\N	\N	\N	5795 8434	f	\N	2026-08-07 03:00:41.559	2026-08-07 03:00:41.559	\N	\N	\N	00550	\N	\N	5795 8434	NYLSKA JOHANNY GARCIA CASTILLO
11fe3a1c-4f6f-4d95-b952-f84584985dc0	fedb4b05-e281-4956-9367-5a0530976e60	RIGOBERTO JESUS TREMINIO MARTINEZ	\N	\N	RESIDENCIAL LAS COLINAS EMBAJADA DE ESPEÑA 100 MTRS AL NORTE	\N	8633-3360	f	\N	2026-08-07 03:00:41.56	2026-08-07 03:00:41.56	604-311284-0001U	\N	\N	00551	\N	\N	8633-3360	YESSEL ANAHY CERPAS ARTOLA
97219f09-9106-4849-a3b8-3ed60347dba8	fedb4b05-e281-4956-9367-5a0530976e60	RAMIRO VALLADARES (TECNI- GLASS)	\N	\N	\N	\N	78696061	f	\N	2026-08-07 03:00:41.56	2026-08-07 03:00:41.56	\N	\N	40000	00552	\N	\N	78696061	AGNEL CASTILLO
fd563935-75b7-43fd-a312-9d079068eea5	fedb4b05-e281-4956-9367-5a0530976e60	GRUPO D & M	\N	\N	RECIDENCIAL LOMAS DEL VALLE AGUJA 2 C AL ESTE 2 C AL NORTE 1 C AL ESTE CASA # 115	\N	8404-6999	f	\N	2026-08-07 03:00:41.561	2026-08-07 03:00:41.561	J0310000230013	CONTADO	\N	00553	\N	\N	8404-6999	AGNEL CASTILLO
61f18cbc-58c4-44f5-ade8-c05ea4a5e931	fedb4b05-e281-4956-9367-5a0530976e60	PARK JINHIEE	\N	\N	RESIDENCIAL LOS ROBLES CASA *77, DEL HOSPITAL MONTE ESPAÑA 2C AL NORTE ,1C AL OESTE	\N	76656503	f	\N	2026-08-07 03:00:41.562	2026-08-07 03:00:41.562	07122004005S	\N	\N	00554	\N	\N	76656503	AGNEL CASTILLO
c792e111-47ac-476e-a2b8-56d02da15642	fedb4b05-e281-4956-9367-5a0530976e60	DIEGO MARCEL SANABRIA GOMEZ	\N	\N	\N	\N	8835-6315	f	\N	2026-08-07 03:00:41.563	2026-08-07 03:00:41.563	326-121168-0001B	\N	\N	00555	\N	\N	8835-6315	ARLES DAVID CENTENO
3788d783-bd36-46ee-b1b6-2d253d30b3f1	fedb4b05-e281-4956-9367-5a0530976e60	EUGENIO XAVIER ARGUELLO CALLEJAS	\N	\N	RPTO LOMAS DE MONSERRAT CONDOMINIO VILLA MARIA CASA N°3	\N	8850 3833	f	\N	2026-08-07 03:00:41.564	2026-08-07 03:00:41.564	281-011158-0000V	\N	\N	00556	\N	\N	8850 3833	NYLSKA JOHANNY GARCIA CASTILLO
cd56e364-6c64-4c5a-a454-6fdf82648883	fedb4b05-e281-4956-9367-5a0530976e60	JUAN ISABEL MONCADA LOPEZ	\N	\N	BARRIO LA FUENTE ESCUELA NORMAL 2 C AL ESTE 11/2 C AL SUR	\N	8541-0400	f	\N	2026-08-07 03:00:41.564	2026-08-07 03:00:41.564	001-010278-0064D	\N	\N	00557	\N	\N	8541-0400	ARLES DAVID CENTENO
aae27a4b-1121-4efb-8322-239ac72089bd	fedb4b05-e281-4956-9367-5a0530976e60	JUAN CARLOS RIVERA MALTEZ	\N	\N	\N	\N	77667747	f	\N	2026-08-07 03:00:41.565	2026-08-07 03:00:41.565	\N	CRÉDITO 30 DIAS	40000	00558	\N	\N	77667747	AGNEL CASTILLO
82ee4ecf-7f88-4f65-90a3-402ca06bf25d	fedb4b05-e281-4956-9367-5a0530976e60	BISMARCK ISRAEL MONTOYA VALDIVIA	\N	1612501920012Y	MANAGUA	\N	89991449	f	\N	2026-08-07 03:00:41.566	2026-08-07 03:00:41.566	\N	CRÉDITO 30 DIAS	37000	00559	\N	\N	89991449	YAHOSKA D'TRINIDAD
1050022a-2b33-46f9-864e-985f7d18b367	fedb4b05-e281-4956-9367-5a0530976e60	GRUPO SOL S.A.	\N	J0210000135547	KM 10.5 CARRETERA SUR ENTRADA COLEGIO ALEMAN 400 MTRS AL OESTE 200 MTRS AL NORTE 75 VRS AL OESTE CASA # 11	\N	8465-7085	f	\N	2026-08-07 03:00:41.567	2026-08-07 03:00:41.567	J0210000135547	CRÉDITO 30 DIAS	40000	00560	\N	\N	8465-7085	ARLES DAVID CENTENO
4250ab82-0a6e-4205-96fb-d36457e8e239	fedb4b05-e281-4956-9367-5a0530976e60	JOSE LUIS ROSTRAN OROZCO	\N	\N	VILLA DIGNIDAD TERCERA ETAPA 2 ANDENES AL SUR CASA 210	\N	8739-1447	f	\N	2026-08-07 03:00:41.568	2026-08-07 03:00:41.568	001-010277-0002R	\N	\N	00561	\N	\N	8739-1447	NYLSKA JOHANNY GARCIA CASTILLO
a0d4f770-ae43-4e1c-8003-83cd81cfd89f	fedb4b05-e281-4956-9367-5a0530976e60	DOUGLASS BOZZA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.569	2026-08-07 03:00:41.569	\N	\N	\N	00562	\N	\N	\N	AGNEL CASTILLO
fca00f9b-9489-4478-a4c1-32a0ac182200	fedb4b05-e281-4956-9367-5a0530976e60	KATHERIN MARCELA MORALES GAITAN	\N	\N	NANDAIME / GRANADA TIENDA GALLO MAS GALLO 11/2 C AL NORTE	\N	7783-2801	f	\N	2026-08-07 03:00:41.569	2026-08-07 03:00:41.569	001-140291-0031A	\N	\N	00563	\N	\N	7783-2801	ARLES DAVID CENTENO
e6f469a2-092f-47b8-badf-d112a1d8d8cf	fedb4b05-e281-4956-9367-5a0530976e60	GULNARA DEL CARMEN RODRIGUEZ REYES	\N	\N	BO. LOMAS DEL VALLE CASAA J-25	\N	87442760	f	\N	2026-08-07 03:00:41.59	2026-08-07 03:00:41.59	122-191073-0004L	\N	\N	00593	\N	\N	87442760	AGNEL CASTILLO
09fb67a3-548e-418e-98c3-4450f79f231d	fedb4b05-e281-4956-9367-5a0530976e60	C D L / OSCAR NOEL CROSS RIVERA	\N	J0310000112541	COLONIA FRANCISCO MORAZAN PORTON PRINCIPAL CENTRO DE SALUD 1/2 C AL OESTE CASA # A-150	OSCARC@SKYRIZONIC.COM	7877-1663	f	\N	2026-08-07 03:00:41.571	2026-08-07 03:00:41.571	001-151272-0006T	\N	\N	00564	\N	2278-6377	7877-1663	ARLES DAVID CENTENO
c32632f5-bafd-4f44-ad42-84e43b276acd	fedb4b05-e281-4956-9367-5a0530976e60	IRWING XAVIER ALONSO CHAMORRO	\N	\N	MANAGUA DE LOS ROBLES, ETAPA 4, COSTADO SUR FUNERARIA MONTE DE LOS OLIVOS.	\N	8980-3524	f	\N	2026-08-07 03:00:41.572	2026-08-07 03:00:41.572	001-061180-0101C	CRÉDITO 30 DIAS	37000	00565	\N	\N	8980-3524	NYLSKA JOHANNY GARCIA CASTILLO
f7917ea0-ac58-49d7-922d-1bdada06a41f	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR NOEL CROSS RIVERA	\N	\N	MANAGUA, COLONIA FRAANCISCO MORAZAN, PORTON PRINCIPAL CENTRO DE SALUD, 1/2 C OESTE, CASA  # A-160	\N	78771663	f	\N	2026-08-07 03:00:41.573	2026-08-07 03:00:41.573	001-151272-0006T	CRÉDITO 30 DIAS	37000	00566	\N	\N	78771663	ARLES DAVID CENTENO
331378e3-cf84-4d5d-b352-b38d97f665c4	fedb4b05-e281-4956-9367-5a0530976e60	REYNERIO EDGARDOSC PASTORA SANCHEZ	\N	\N	RECIDENSIAL VILLAS LINDORAS KM 13 CARRETERA MASAYA CASA # 13	\N	8854-6667	f	\N	2026-08-07 03:00:41.573	2026-08-07 03:00:41.573	28-290882-0010S	CRÉDITO 15 DIAS	5000	00567	\N	\N	8854-6667	ARLES DAVID CENTENO
5011ef8c-7efd-4bdb-83b8-731818099456	fedb4b05-e281-4956-9367-5a0530976e60	GUILLERMO MAHIDI BARRETO ROMERO	\N	\N	BARRIO MOBSEÑOR LEZCANO ESTATUA 4 C AL ESTE	\N	8898-4276	f	\N	2026-08-07 03:00:41.574	2026-08-07 03:00:41.574	001-080280-0009X	CRÉDITO 30 DIAS	37000	00568	\N	\N	8898-4276	AGNEL CASTILLO
775a034a-c23a-44bc-9910-17aa4243e28c	fedb4b05-e281-4956-9367-5a0530976e60	YOLANDA DEL SOCORRO ROMERO ALVARADO	\N	\N	VILLA EL ROSARIO ¿ 2DA EBRADA UNICA 7C AL SUR 4C OESTE 1/2 SUR N° B-1	\N	89114470	f	\N	2026-08-07 03:00:41.575	2026-08-07 03:00:41.575	1220505560000L	\N	\N	00569	89114470	\N	\N	ARLES DAVID CENTENO
dbd09550-9406-4141-8eae-a48dcf79ed50	fedb4b05-e281-4956-9367-5a0530976e60	MICHAEL DAVID SILVA RODRIGUEZ	\N	\N	COMARCA LAS SIERRITAS DE STO DOMINGO MINISUPER DELIMARKET 2 C AL ESTE 2 C AL NORTE 150 VRS AL ESTE	\N	8868-7524	f	\N	2026-08-07 03:00:41.576	2026-08-07 03:00:41.576	007-111296-1001Q	\N	\N	00570	\N	\N	8868-7524	ARLES DAVID CENTENO
cd4854fc-260a-4a44-b70d-d895450d7ce6	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ALFREDO BONILLA RAMIREZ	\N	\N	VILLA CUBA TERMINAL 164 1 C ARRIBA 1/2 C AL SUR	\N	8880-4687	f	\N	2026-08-07 03:00:41.577	2026-08-07 03:00:41.577	081-290764-0006B	\N	\N	00571	\N	\N	8880-4687	ARLES DAVID CENTENO
03e3a02b-87f3-4de2-930a-7231b9ce2d02	fedb4b05-e281-4956-9367-5a0530976e60	AUGUSTO CESAR HERNANDEZ SANCHEZ	\N	\N	BARRIO ALTAGRACIA MOLINOS OFELIA ROCHA 1 C AL OESTE 1/2 C AL SUR	\N	7754-2308	f	\N	2026-08-07 03:00:41.578	2026-08-07 03:00:41.578	004-170560-0000N	\N	\N	00572	\N	\N	7754-2308	AGNEL CASTILLO
1821bbc5-38cc-4767-b178-845ed5971b5c	fedb4b05-e281-4956-9367-5a0530976e60	MICHAEL ROQUE	\N	\N	\N	\N	85096846	f	\N	2026-08-07 03:00:41.579	2026-08-07 03:00:41.579	0012111880009R	\N	\N	00573	\N	\N	85096846	AGNEL CASTILLO
09f391c7-6fdd-4525-b253-c97b9b808532	fedb4b05-e281-4956-9367-5a0530976e60	JOSE BENITO ORTIZ ALVARADO	\N	\N	\N	\N	7741-1286	f	\N	2026-08-07 03:00:41.579	2026-08-07 03:00:41.579	\N	CRÉDITO 30 DIAS	37000	00574	\N	\N	7741-1286	BISMARK MURILLO
288f329f-0808-49ff-8674-1fb1806800cb	fedb4b05-e281-4956-9367-5a0530976e60	BREYDA GARCIA/MARIA DE LOS SANTOS MALIANOS	\N	\N	DE LA GAASOLINERA UNO PLAZA EL SOL 1/2C.N	\N	83249312	f	\N	2026-08-07 03:00:41.58	2026-08-07 03:00:41.58	561-011156-0004F	CONTADO	37000	00575	\N	\N	83249312	YAHOSKA D'TRINIDAD
436a2fe1-6672-4f35-8e18-ca2daf177444	fedb4b05-e281-4956-9367-5a0530976e60	DISTRIBUIDORA GLOBAL S.A/ EMIR LOPEZ	\N	J021 000040435	\N	\N	8619-2898	f	\N	2026-08-07 03:00:41.581	2026-08-07 03:00:41.581	\N	\N	\N	00576	\N	\N	8619-2898	NYLSKA JOHANNY GARCIA CASTILLO
a418720c-35e1-4ac4-9b2d-88d4c2b0ecd2	fedb4b05-e281-4956-9367-5a0530976e60	SERVICIOS MULTIPLES GUIDO	\N	\N	\N	\N	5755-2697	f	\N	2026-08-07 03:00:41.581	2026-08-07 03:00:41.581	\N	\N	\N	00577	\N	\N	5755-2697	AGNEL CASTILLO
50d5b9b3-27d3-47dc-8fe1-70d868496ea1	fedb4b05-e281-4956-9367-5a0530976e60	MARLON MELQUISEDEC RAMIREZ LOPEZ	\N	\N	BO.MEDARDO ANDINO IGLESIA CATOLICA SAGRADO CORAZON DE JESUS 1 C E. 1C S(TICUANTEPE)	\N	7704-9413	f	\N	2026-08-07 03:00:41.582	2026-08-07 03:00:41.582	007-090899-1000S	\N	\N	00578	\N	\N	7704-9413	AGNEL CASTILLO
7c8c720c-794d-4c0e-9070-dccd87e19030	fedb4b05-e281-4956-9367-5a0530976e60	CHISTOFER ADDRIEL HERNANDEZ GUTIERREZ	\N	\N	CMCA VERACRUZ CALVARIO 2C AL ESTE	\N	82402929	f	\N	2026-08-07 03:00:41.583	2026-08-07 03:00:41.583	402-221102-1000M	\N	\N	00579	\N	\N	82402929	AGNEL CASTILLO
ecf7e8e9-b370-4bd7-af2a-f6c4c8fd46bc	fedb4b05-e281-4956-9367-5a0530976e60	NORLAN ANTONIO ARAGON CHAVEZ	\N	\N	BO. JONATHAN GONZALES CASA PELLAS PLAZA ESPAÑA MANAGUA	\N	88144114	f	\N	2026-08-07 03:00:41.583	2026-08-07 03:00:41.583	202-301179-0000V	\N	\N	00580	\N	\N	88144114	AGNEL CASTILLO
a792b542-a44b-4121-8b63-49bc00e02548	fedb4b05-e281-4956-9367-5a0530976e60	RICHARD FANOR ROBLES POVEDA	\N	\N	BO. 19 DE JULIO SEMAFOS CASA RICARDO MORALES AVILES 50VRS XL 2C AL OESTE	\N	7731-9613	f	\N	2026-08-07 03:00:41.584	2026-08-07 03:00:41.584	001-060292-0056E	\N	\N	00581	\N	\N	7731-9613	AGNEL CASTILLO
b7aeeb7e-61b2-4942-86ad-f5b2c53cbd88	fedb4b05-e281-4956-9367-5a0530976e60	GUSTAVO ALEJANDRO MORENO SOMARRIBA	\N	\N	COM.GASPAR GARCIA LAVIANA KM13 CARRETERA MASAYA 800MTR SUROESTE	\N	\N	f	\N	2026-08-07 03:00:41.584	2026-08-07 03:00:41.584	001-050772-0002K	\N	\N	00582	\N	\N	\N	AGNEL CASTILLO
30c49a7b-aab3-4457-a0e4-e1c4cc6fbee5	fedb4b05-e281-4956-9367-5a0530976e60	JEYSON JOSE LEIVA LOPEZ	\N	\N	BO. SAN JOSE INSTITUTO DE MEDICINA LEGAL 1C E	\N	81735488	f	\N	2026-08-07 03:00:41.585	2026-08-07 03:00:41.585	001-180689-0002P	\N	\N	00583	\N	\N	81735488	AGNEL CASTILLO
6c65da7d-3e7a-4f1b-8d9c-6c997dd39a77	fedb4b05-e281-4956-9367-5a0530976e60	ARIEL ANTONIO HERNANDEZ- CONCRETERA TOTAL	\N	\N	CMCA. LA POMA KM34 1/2 , CARRETERA MASAYA - GRANADA	\N	82424199	f	\N	2026-08-07 03:00:41.586	2026-08-07 03:00:41.586	401-300399-1010T	CONTADO	\N	00584	\N	\N	82424199	AGNEL CASTILLO
ad8f4342-0547-4c3b-a11d-de2e897113e0	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO FRANCISCO FLORES  REAL	\N	\N	CMCA. LOS BRENES KM24.4 CARRETERA MANAGUA -MASAYA	\N	83833145	f	\N	2026-08-07 03:00:41.586	2026-08-07 03:00:41.586	001-130696-0011A	\N	\N	00585	\N	\N	83833145	AGNEL CASTILLO
7c7f22a5-edf8-4bb8-9930-13de0d123e8e	fedb4b05-e281-4956-9367-5a0530976e60	ROGER ALEJANDRO MORALES BERMUDEZ	\N	\N	RESIDENCIAL LAS BRISAS DONDE FUE EL RESTAURANTE ARAGON 2C N. 75 VRS E	\N	82888270	f	\N	2026-08-07 03:00:41.587	2026-08-07 03:00:41.587	8288827001-050268-0065 S	\N	\N	00586	\N	\N	82888270	AGNEL CASTILLO
39238ce0-61be-4971-8f44-05624197b1f3	fedb4b05-e281-4956-9367-5a0530976e60	GERARDO ANTONIO TORRENTE BENAVENTE	\N	\N	\N	\N	84447581	f	\N	2026-08-07 03:00:41.587	2026-08-07 03:00:41.587	001-180659-0016S	\N	\N	00587	\N	\N	84447581	AGNEL CASTILLO
a4aa0a76-7ae8-4b36-8296-4bb5bd74b5fb	fedb4b05-e281-4956-9367-5a0530976e60	MONICA JOSE NARVAES AGUINAGA	\N	\N	\N	\N	81443893	f	\N	2026-08-07 03:00:41.588	2026-08-07 03:00:41.588	001-270883-0057P	\N	\N	00588	\N	\N	81443893	AGNEL CASTILLO
257b37cc-1a04-4a90-b908-424e3516d688	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL DE JESUS DELGADO ORTIZ	\N	\N	BO. MEDARDO ANDINO IGLESIA CATOLICA SAGRADO CORAZON DE JESUS 1C AL NORTE	\N	76935145	f	\N	2026-08-07 03:00:41.588	2026-08-07 03:00:41.588	007-161093-0003 O	\N	\N	00589	\N	\N	76935145	AGNEL CASTILLO
ce8414b3-03c5-4a94-82a5-26fbe8c2a385	fedb4b05-e281-4956-9367-5a0530976e60	AUGUSTO CESAR CASTELOON ZUNIGA (GENESIS IMPRESIONES)	\N	\N	RESIDENCIAL. LOMAS DEL VALLE C.A. N*104	\N	\N	f	\N	2026-08-07 03:00:41.589	2026-08-07 03:00:41.589	001-040160-0071J	\N	\N	00590	\N	\N	\N	AGNEL CASTILLO
dd961799-d86a-4a06-80c2-33c9846f34e4	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR HUMBERTO MORALES URBINA	\N	\N	CMCA. ESQUIPULAS TERMINAL DE BUSES 2C AL S	\N	\N	f	\N	2026-08-07 03:00:41.589	2026-08-07 03:00:41.589	001-190172-0011V	\N	\N	00591	\N	\N	\N	AGNEL CASTILLO
a2908cd3-0d43-4e77-b60a-e20030f8e24e	fedb4b05-e281-4956-9367-5a0530976e60	MARVIN GARCIA	\N	\N	\N	\N	88505714	f	\N	2026-08-07 03:00:41.59	2026-08-07 03:00:41.59	\N	\N	\N	00592	\N	\N	88505714	AGNEL CASTILLO
202c14db-9957-438e-b166-40cc2411e7eb	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO MONTES ACUÑAQ	\N	\N	CMCA. MIRADOR DEL DONDE FUE ENABAS 50VRS AL OESTE	\N	83294074	f	\N	2026-08-07 03:00:41.591	2026-08-07 03:00:41.591	401-060386-1001C	\N	\N	00595	\N	\N	83294074	AGNEL CASTILLO
2b311ab0-a4e6-4570-b9fb-4fb748932dca	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR LENIN LANUZA ABURTO	\N	\N	BARRIO WILLIA DIAZ CASA DEL OBRERO 1 C AL OESTE 41/2 AL SUR	\N	7785-8710	f	\N	2026-08-07 03:00:41.591	2026-08-07 03:00:41.591	001-080485-0057L	\N	\N	00596	\N	\N	7785-8710	ARLES DAVID CENTENO
e51caef8-1b93-479c-82f9-98de9af021a8	fedb4b05-e281-4956-9367-5a0530976e60	GUTIERREZ PADILLA INGENIEROS/JEFFREY GUTIERREZ	\N	J051 00000 78598	\N	\N	7896-8921	f	\N	2026-08-07 03:00:41.592	2026-08-07 03:00:41.592	401-181290-0007K	\N	\N	00597	\N	\N	7896-8921	NYLSKA JOHANNY GARCIA CASTILLO
229a9858-5e95-4249-ba34-ec4c4240da48	fedb4b05-e281-4956-9367-5a0530976e60	VICENTE AMADO JARQUIN LOPEZ	\N	\N	RPTO EL MADROÑO JOSE DE LA CRUZ MENA 100MTS O.	\N	7660-2885	f	\N	2026-08-07 03:00:41.592	2026-08-07 03:00:41.592	201-090374-0007Q	\N	\N	00598	8804-4260	\N	7660-2885	NYLSKA JOHANNY GARCIA CASTILLO
146e2d6d-d3d9-4a0d-a54b-4e3525aa98d5	fedb4b05-e281-4956-9367-5a0530976e60	IVANIA AUXILIADORA HERNANDEZ GONZALES	\N	\N	BARRIO SANTA DELFINA COMPLEJO JUDICIAL 1 C AL NORTE 75 VRS AL OESTE	\N	5702-9675	f	\N	2026-08-07 03:00:41.593	2026-08-07 03:00:41.593	401-131083-0005W	\N	\N	00599	\N	\N	5702-9675	ARLES DAVID CENTENO
b9f62856-7d73-4fb4-983a-e0954b86f408	fedb4b05-e281-4956-9367-5a0530976e60	ING, EDGAR MONCADA CHACON/ HYBRICO NICARAGUA S.A	\N	J0310000339775	\N	\N	\N	f	\N	2026-08-07 03:00:41.594	2026-08-07 03:00:41.594	001-030771-0068H	CONTADO	\N	00600	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
84b6d2cb-3588-4928-bb89-d7fd78f94c3a	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO MONTES ACUÑA	\N	\N	COMARCA MIRADOR DE DONDE FUE ENABAS 50 VRS AL SUR	\N	77777222	f	\N	2026-08-07 03:00:41.595	2026-08-07 03:00:41.595	401-060386-1001C	CRÉDITO 30 DIAS	100000	00601	\N	\N	77777222	ARLES DAVID CENTENO
4b591b24-739f-4f52-8821-40e0c8b61c58	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN BERNABE ESPINOZA ACEVEDO	\N	\N	BARRIO EL CALVARIO BAR ROSY 1 C AL ESTE	\N	8113-3112	f	\N	2026-08-07 03:00:41.596	2026-08-07 03:00:41.596	044-011073-0000L	\N	\N	00602	\N	\N	8113-3112	ARLES DAVID CENTENO
0b32fcc4-8401-4a43-945f-f05b78bada68	fedb4b05-e281-4956-9367-5a0530976e60	KEVIN JAVIER VELEZ VALLE	\N	\N	RESIDENCIAL XOCHITLAN KM 10.5 CARRETERA MASAYA 2 KM AL SUR CASA # 104	\N	8797-1073	f	\N	2026-08-07 03:00:41.596	2026-08-07 03:00:41.596	001-091193-0010P	\N	\N	00603	\N	\N	8797-1073	ARLES DAVID CENTENO
203d5d67-972a-423a-8241-127cec209ecd	fedb4b05-e281-4956-9367-5a0530976e60	CODEPSA/ WILBERT RAFAEL VILLAREAL VASQUEZ	\N	J031 00000 83517	VI. MIGUEL GUTIERREZ FRENTE CASA COMUNAL CASA N°439	\N	7652 4953	f	\N	2026-08-07 03:00:41.597	2026-08-07 03:00:41.597	001-010189-0001T	CRÉDITO 15 DIAS	36000	00604	7652 4955	\N	7652 4953	NYLSKA JOHANNY GARCIA CASTILLO
c9a3e7bf-a41b-4394-abf9-32eae2a3a960	fedb4b05-e281-4956-9367-5a0530976e60	RAUL III HERNANDEZ CASTILLO	\N	\N	RESD. LOMAS DEL VALLE III ETAPA CASA N° 9-03	\N	8378-9874	f	\N	2026-08-07 03:00:41.598	2026-08-07 03:00:41.598	281-241178-0014C	CONTADO	18500	00605	\N	\N	8378-9874	AGNEL CASTILLO
d92cc3f2-f333-47f6-97ab-2b320deaddef	fedb4b05-e281-4956-9367-5a0530976e60	VIRGINIA VANEGA (INSS)	\N	\N	EDIFICIO 1907 INSS CONTIGUO AL CORREO NICARAGUA	\N	86706538	f	\N	2026-08-07 03:00:41.599	2026-08-07 03:00:41.599	\N	\N	36000	00606	\N	\N	86706538	AGNEL CASTILLO
97824877-420c-48a4-afd2-e6b88b14ab46	fedb4b05-e281-4956-9367-5a0530976e60	INSTITUTO NICARAGUENSE DE SEGURIDAD SOCIAL INSS	\N	J 1430000001889	EDIFICIO 1907 , CONTIGUA A CORREOS NICARAGUA	\N	86706538	f	\N	2026-08-07 03:00:41.6	2026-08-07 03:00:41.6	\N	CRÉDITO 8 DIAS	36000	00607	\N	\N	86706538	AGNEL CASTILLO
f076fd01-2b8f-4818-a8d5-dbe6dab968ba	fedb4b05-e281-4956-9367-5a0530976e60	ISAAC ALEJANDRO PICON MANZANARES	\N	\N	URBANIZACION JARDINES DE TIPITAPA TANQUE ENACAL 4 C AL ESTE 1 C AL SUR 75 VRS AL ESTE	\N	8162-0195	f	\N	2026-08-07 03:00:41.601	2026-08-07 03:00:41.601	001-071190-0049T	\N	\N	00608	\N	\N	8162-0195	ARLES DAVID CENTENO
09103f72-2cc3-4fd2-a4d5-bb0238644ccb	fedb4b05-e281-4956-9367-5a0530976e60	EMILIO JOSE GONZALES DIAS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.601	2026-08-07 03:00:41.601	6122011910001Q	\N	\N	00609	\N	\N	\N	AGNEL CASTILLO
7fa0393a-8f7d-4af6-8d33-142612429dca	fedb4b05-e281-4956-9367-5a0530976e60	ZAMIR JAFFET DAMHA LOPEZ	\N	\N	COMARCA EDUARDO CONTRERAS PARADA DE BUSES EL NANCITE 3 C AL OESTE	\N	8725-2315	f	\N	2026-08-07 03:00:41.602	2026-08-07 03:00:41.602	001-181094-0003P	\N	\N	00610	\N	\N	8725-2315	ARLES DAVID CENTENO
b29cc172-7dbf-4c13-be06-520cfa1b432a	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS JOSE GOMEZ CANALES	\N	\N	BARRIO MEMORIAL SANDINO RADIOS COASA 1 C ALS SUR 1 C AL OESTE 11/2 C AL SUR	\N	7810-3568	f	\N	2026-08-07 03:00:41.602	2026-08-07 03:00:41.602	001-151190-0025K	\N	\N	00611	\N	\N	7810-3568	ARLES DAVID CENTENO
eb38e0a2-0259-4a58-ad18-82802f007176	fedb4b05-e281-4956-9367-5a0530976e60	EVERTH NAPOLEON MENDOZA BERMUDEZ	\N	\N	BO. HEALEAH	\N	8947-1896	f	\N	2026-08-07 03:00:41.603	2026-08-07 03:00:41.603	001-190283-0026N	\N	\N	00612	\N	\N	8947-1896	NYLSKA JOHANNY GARCIA CASTILLO
ea9265ab-faeb-46c9-8b4a-93f048fd4c45	fedb4b05-e281-4956-9367-5a0530976e60	VIERICK ADOLFO LOPEZ PALACIOS	\N	\N	BARRIOS LOS CORTEZ DE LA IGLEISA DE CRISTO 11/2 AL NORTE	\N	8381-3128	f	\N	2026-08-07 03:00:41.603	2026-08-07 03:00:41.603	001-030380-0036X	\N	\N	00613	\N	\N	8381-3128	ARLES DAVID CENTENO
477988f8-a61d-40e2-a464-da2bd9496426	fedb4b05-e281-4956-9367-5a0530976e60	AQUILES ARSENIO MOJICA CARRANZA	\N	\N	CMCA. LOS MADRIGALES	\N	8960-3053	f	\N	2026-08-07 03:00:41.604	2026-08-07 03:00:41.604	001-011104-1004L	\N	\N	00614	\N	\N	8960-3053	ARLES DAVID CENTENO
becd7114-4147-41a8-b654-37795d178c27	fedb4b05-e281-4956-9367-5a0530976e60	JOSE LEON BUSTAMANTE COREA	\N	\N	BARRIO LAREYNAGA PUENTE EL EDEN 1 C AL OESTE 21/2 C AL NORTEV	\N	8244-9594	f	\N	2026-08-07 03:00:41.605	2026-08-07 03:00:41.605	001-311293-0067F	\N	\N	00615	\N	\N	8244-9594	ARLES DAVID CENTENO
2263892f-9980-4db7-a53f-5b88037fc039	fedb4b05-e281-4956-9367-5a0530976e60	IDILIO GUADALUPE CHAVARRIA CALDERON	\N	\N	BO. GUISQUILIAPA COSTADO SUROESTE ESCUELA JOSE MARIA GARCIA	\N	8131-2644	f	\N	2026-08-07 03:00:41.605	2026-08-07 03:00:41.605	041-121267-0007L	\N	\N	00616	\N	\N	8131-2644	ARLES DAVID CENTENO
79f122fb-894b-44b6-aecc-1f6e30201235	fedb4b05-e281-4956-9367-5a0530976e60	RENE RIVERA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.606	2026-08-07 03:00:41.606	\N	\N	\N	00617	\N	\N	\N	AGNEL CASTILLO
679ac9b5-b9e1-4a48-85d8-fa772b92fc67	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS MANUEL	\N	\N	\N	\N	76435501	f	\N	2026-08-07 03:00:41.606	2026-08-07 03:00:41.606	\N	\N	\N	00618	\N	\N	76435501	AGNEL CASTILLO
8fe77b91-1e9e-4607-8834-6cbb6612c874	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ANTONIO GALAN CARRANZA	\N	\N	JINOTEPE /CARAZO BARRIO SAN ANTONIO PARROQUIA 1 C AL SUR 1/2 C ESTE	\N	8900-1111	f	\N	2026-08-07 03:00:41.607	2026-08-07 03:00:41.607	041-270387-0002V	CONTADO	\N	00619	\N	\N	8900-1111	ARLES DAVID CENTENO
171ffc21-45c6-4218-be5b-47e9598ffe80	fedb4b05-e281-4956-9367-5a0530976e60	ALEXANDER ANTONIO LOPEZ URIARTE	\N	\N	BO.DUCALI ,CLINICA DON BOSCO 1 1/2 C. O	\N	8555-4732	f	\N	2026-08-07 03:00:41.608	2026-08-07 03:00:41.608	001-161277-0015D	\N	\N	00620	\N	\N	8555-4732	AGNEL CASTILLO
749b1781-73f5-4293-911e-6005e77b8eb6	fedb4b05-e281-4956-9367-5a0530976e60	ENEYDA YASKARA MEDINA RIVERA	\N	\N	CIUDAD EL DORAL KM 18 CARRETERA NUEVA LEON CASA # P-120	\N	8707-7426	f	\N	2026-08-07 03:00:41.609	2026-08-07 03:00:41.609	001-250790-0011Q	\N	\N	00621	\N	\N	8707-7426	ARLES DAVID CENTENO
b979ee73-62dd-4556-b472-61f94bfeec16	fedb4b05-e281-4956-9367-5a0530976e60	CONSTRUCTORA ELECTROMECANICA Y CIVIL S,A	\N	\N	KM 35 CARRETERA MASAYA / TIPITAPA	\N	5806-3611	f	\N	2026-08-07 03:00:41.61	2026-08-07 03:00:41.61	J0310000413738	\N	\N	00622	\N	\N	5806-3611	ARLES DAVID CENTENO
144cad5d-ec01-4e30-ac0a-cfa1afc16b9d	fedb4b05-e281-4956-9367-5a0530976e60	SARAI DEL CARMEN OBANDO MARTINEZ	\N	\N	BO RUBEN DARIO, PORTON CEMENTERIO MUNICIPAL 1-1/2 CUADRA ESTE.	\N	8723-9475	f	\N	2026-08-07 03:00:41.611	2026-08-07 03:00:41.611	441-290905-1005G	CONTADO	10000	00623	\N	\N	8723-9475	ARLES DAVID CENTENO
2d5009c7-fb3f-4b51-b159-c714391ee79a	fedb4b05-e281-4956-9367-5a0530976e60	ZONA FRANCA INDUSTRIAL SARATOGA	\N	J0310000095094	KM 15 CARRETERA NUEVA A LEON	\N	7735-0836	f	\N	2026-08-07 03:00:41.612	2026-08-07 03:00:41.612	J0310000095094	\N	\N	00624	\N	\N	7735-0836	ARLES DAVID CENTENO
5868b0ef-15d8-4e9d-ab90-d5b679b40f3e	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ENRRIQUE FLORES ALVARADO	\N	\N	CIUDAD DORAL CALLE 15 AVENIDA 40 CASA # Y-142	\N	8208-3719	f	\N	2026-08-07 03:00:41.613	2026-08-07 03:00:41.613	001-210690-0059C	\N	\N	00625	\N	\N	8208-3719	ARLES DAVID CENTENO
f9200b27-562c-40d8-b399-dc6846c8183c	fedb4b05-e281-4956-9367-5a0530976e60	DOUGLAS ALEXANDER DONAIRE MIRANDA/ DONAIRE ARQUITECTO NEXO	\N	0010102950020n	\N	\N	8975-8855	f	\N	2026-08-07 03:00:41.614	2026-08-07 03:00:41.614	001 010295 0020N	\N	\N	00626	\N	\N	8975-8855	NYLSKA JOHANNY GARCIA CASTILLO
266c6cf6-e3d2-4fc7-9d3f-d5f938aed876	fedb4b05-e281-4956-9367-5a0530976e60	UNIVERSIDAD CENTRAL DE NICARAGUA	\N	J0110000059064	DEL PALI ZUMEN 1C AL LAGO, 100 MTS AL NORTE	\N	87229022	f	\N	2026-08-07 03:00:41.616	2026-08-07 03:00:41.616	\N	\N	36000	00627	\N	\N	87229022	AGNEL CASTILLO
f546b3dd-706e-4ec8-aeb8-f9952d1172e1	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL HUEMBES	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.617	2026-08-07 03:00:41.617	\N	\N	\N	00628	\N	\N	\N	AGNEL CASTILLO
b899b282-d924-4c35-9309-3ac93fdb6f65	fedb4b05-e281-4956-9367-5a0530976e60	ADAN EFRAIN AVENDAÑO ESTRADA	\N	\N	BARRIO OMAR TORRIJOS FERRETERIA JOROBO 3 C AL SUR 25 VRS AL ESTE CASA # K-2	\N	5710-7091	f	\N	2026-08-07 03:00:41.618	2026-08-07 03:00:41.618	001-010983-0033N	\N	\N	00629	\N	\N	5710-7091	ARLES DAVID CENTENO
eb4a58c9-4e4c-47ad-b78c-85b058b5b33e	fedb4b05-e281-4956-9367-5a0530976e60	LUDWING ALBERTO MENDIETA REYES	\N	\N	VILLA 10 DE MAYO IGLESIA NAZARENO 11/2 C AL SUR CASA # L-217	\N	7865-3993	f	\N	2026-08-07 03:00:41.619	2026-08-07 03:00:41.619	001-300992-0017K	\N	\N	00630	\N	\N	7865-3993	ARLES DAVID CENTENO
18a30eca-47e3-4883-aa58-a7fa1ff44819	fedb4b05-e281-4956-9367-5a0530976e60	FRANKLIN ROCHA GUDIEL	\N	\N	\N	\N	84087945	f	\N	2026-08-07 03:00:41.62	2026-08-07 03:00:41.62	001-231183-0066K	\N	\N	00631	\N	\N	84087945	AGNEL CASTILLO
6501f381-2361-4e33-bac3-8ab1e2c650e4	fedb4b05-e281-4956-9367-5a0530976e60	GEMA IVEL MENDOZA OSORNO	\N	\N	RESIDENCIAL CASA REAL CALLE 12 CASA N° W-10	\N	88821964	f	\N	2026-08-07 03:00:41.621	2026-08-07 03:00:41.621	001-260178-0011T	\N	\N	00632	\N	88821964	\N	ARLES DAVID CENTENO
df11e4b4-4e8d-420f-932c-b0a0a44c011a	fedb4b05-e281-4956-9367-5a0530976e60	KATHERINE CASTILLO ARQDENIC	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.622	2026-08-07 03:00:41.622	\N	\N	\N	00633	\N	\N	\N	AGNEL CASTILLO
ea67f73e-45d7-4d15-ae94-cf3dd5e97b43	fedb4b05-e281-4956-9367-5a0530976e60	RUBEN AGUSTIN FONSECA CORTEZ	\N	\N	BO. MARIO LATINO IGLESIA BAUTISTA 2 C S./ CATARINA- MASAYA	\N	8852-7567	f	\N	2026-08-07 03:00:41.623	2026-08-07 03:00:41.623	001-031181-0026J	\N	\N	00634	\N	\N	8852-7567	NYLSKA JOHANNY GARCIA CASTILLO
20b3c361-b8c8-472f-b287-a64da9c8c8cf	fedb4b05-e281-4956-9367-5a0530976e60	ALEJANDRO ANTONIO VARGAS RIVAS	\N	\N	BO. JOSE DOLORES ESTRADA GASOLINERA UNO WASPAN 2 1/2 C N.	\N	8840-1556	f	\N	2026-08-07 03:00:41.623	2026-08-07 03:00:41.623	001-220147-0022Q	\N	\N	00635	\N	\N	8840-1556	ARLES DAVID CENTENO
411189db-dbe2-4ee4-8d15-b6cde225dd78	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALEJANDRO MONCADA SOTELO	\N	\N	BO. PANCASAN CENTRO OPTICO SAN LUIS- SOMOTO/MADRIZ	\N	8909-8280	f	\N	2026-08-07 03:00:41.624	2026-08-07 03:00:41.624	32-171079-0002H	\N	\N	00636	\N	\N	8909-8280	NYLSKA JOHANNY GARCIA CASTILLO
7d89c165-130f-41ca-a31d-ebaa75f97e21	fedb4b05-e281-4956-9367-5a0530976e60	SUNLIGHTLED S.A	\N	J0310000258570	\N	\N	\N	f	\N	2026-08-07 03:00:41.626	2026-08-07 03:00:41.626	\N	\N	360000	00637	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
f4615c19-2c29-410c-bd12-d2fb62b40c4f	fedb4b05-e281-4956-9367-5a0530976e60	MARCELA GARCIA	\N	\N	\N	\N	87850049	f	\N	2026-08-07 03:00:41.627	2026-08-07 03:00:41.627	\N	\N	\N	00638	\N	\N	87850049	AGNEL CASTILLO
3da38f14-0ad3-40ba-bed2-1ddc0dc62804	fedb4b05-e281-4956-9367-5a0530976e60	RAFAEL ARANA PICADO	\N	\N	RESIDENDIAL VALENCIA MERCADO IVAN MONTENEGRO 2C AL OESTE 2 C AL SUR CASA # 29	\N	8391-1601	f	\N	2026-08-07 03:00:41.627	2026-08-07 03:00:41.627	081-070960-0000G	\N	\N	00639	\N	\N	8391-1601	ARLES DAVID CENTENO
1b3dacc7-aa5c-43ec-a7a7-a70ddd032281	fedb4b05-e281-4956-9367-5a0530976e60	BAYARDO JOSE OROZCO VASQUEZ	\N	\N	BO. CAMILO ORTEGA TERMINAL DE RUTA 105, 4C S. 75 VRS E	\N	\N	f	\N	2026-08-07 03:00:41.628	2026-08-07 03:00:41.628	001-050986-0074A	\N	\N	00640	\N	\N	\N	AGNEL CASTILLO
be2dfcca-650b-4fce-910e-66bda0692967	fedb4b05-e281-4956-9367-5a0530976e60	AIDA ADILIA TORRENTES LOPEZ	\N	\N	RPTO EL MIRADOR DE DONDE FUE RESTAURANRE EL ESTABLO 2KM S.	\N	8479-1566	f	\N	2026-08-07 03:00:41.628	2026-08-07 03:00:41.628	001-070192-0021M	\N	\N	00641	\N	\N	8479-1566	NYLSKA JOHANNY GARCIA CASTILLO
2dff75c3-de78-431d-b90f-8389b3866c2a	fedb4b05-e281-4956-9367-5a0530976e60	VILMA VERONICA RIZO LOPEZ	\N	\N	RESIDENCIAL ESTANCIA DE STO DOMINGO 1 ETAPA CALLE SEGOVIA CASA # 17	\N	8882-1475	f	\N	2026-08-07 03:00:41.63	2026-08-07 03:00:41.63	241-050570-0002G	\N	\N	00642	\N	\N	8882-1475	ARLES DAVID CENTENO
e63688e7-0467-40c5-8ed7-6d354fa9e435	fedb4b05-e281-4956-9367-5a0530976e60	LIUD JAQUELIN TELLEZ MARTINEZ	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.63	2026-08-07 03:00:41.63	\N	\N	\N	00643	\N	\N	\N	AGNEL CASTILLO
8d4bc957-6b2b-4233-8f37-f89430c5dfda	fedb4b05-e281-4956-9367-5a0530976e60	WILMAR ENRIQUE NAVARRO BERRIOS	\N	\N	CMCA NEJAPA KM 9 1/2 CARRETERA VIEJA A LEON ENTRADA  PRINCIPAL 200 MTS N	\N	7800-9528	f	\N	2026-08-07 03:00:41.631	2026-08-07 03:00:41.631	001-130888-0044S	\N	\N	00644	\N	\N	7800-9528	NYLSKA JOHANNY GARCIA CASTILLO
3609934d-ab4b-4032-8ab0-09907a2be603	fedb4b05-e281-4956-9367-5a0530976e60	SERVICONS	\N	0010410930020H	\N	\N	\N	f	\N	2026-08-07 03:00:41.632	2026-08-07 03:00:41.632	\N	\N	\N	00645	\N	\N	\N	AGNEL CASTILLO
8df56966-8690-49af-8ae1-d78fad4ff34b	fedb4b05-e281-4956-9367-5a0530976e60	RONALDO DE JESUS GALAN OLIVARES	\N	\N	COMARCA LA BORGOÑA CENTRO DE SALUD 21/2 C SL OESTE	\N	8964-8565	f	\N	2026-08-07 03:00:41.632	2026-08-07 03:00:41.632	007-171172-0001Q	\N	\N	00646	\N	\N	8964-8565	BISMARK MURILLO
6b8535d1-899b-47f1-9be4-03656d97779a	fedb4b05-e281-4956-9367-5a0530976e60	MARVIN ANTONIO OROZCO BENAVIDEZ	\N	\N	BARRIO LAURELES SUR BAR ROSMARY 5 C AL SUR 1 C AL ESTE 1 C AL SUR	\N	8209-6084	f	\N	2026-08-07 03:00:41.633	2026-08-07 03:00:41.633	001-270993-0030M	\N	\N	00647	\N	\N	8209-6084	ARLES DAVID CENTENO
e41703cf-e27d-44f4-b67d-ba78d2d604e2	fedb4b05-e281-4956-9367-5a0530976e60	MARTIN GABRIEL ARCIA	\N	\N	URBANIZACION STA EDUVIGES 2 ETAPA AGUJA 9 ANDENES AL SUR 30 VRS AL ESTE	\N	8988-3094	f	\N	2026-08-07 03:00:41.633	2026-08-07 03:00:41.633	001-251185-0064B	\N	\N	00648	\N	\N	8988-3094	ARLES DAVID CENTENO
278a3af9-4bd6-4e30-a1db-77198148203c	fedb4b05-e281-4956-9367-5a0530976e60	FRANKLIN GEOVANNY COREA REYES	\N	\N	VILLA ROMA CENTRO DE SALUD EDGARD LANG 6C SUR 3C AL ESTE	\N	85704186	f	\N	2026-08-07 03:00:41.634	2026-08-07 03:00:41.634	001-220896-0052C	\N	\N	00649	\N	\N	85704186	ARLES DAVID CENTENO
e6dec412-606d-49a0-9f38-5b8ed1955ac7	fedb4b05-e281-4956-9367-5a0530976e60	JOEL MERCADO PARRALES	\N	\N	MASAYA BARRIO DIVINO NIÑO DESARME AGULIAR 200 MTS AL NORTE 1/2 C AL OESTE	\N	6448-2953	f	\N	2026-08-07 03:00:41.634	2026-08-07 03:00:41.634	401-100275-0006R	\N	\N	00650	\N	\N	6448-2953	ARLES DAVID CENTENO
77aa7049-07f0-45ff-b98b-d3a1df76f42b	fedb4b05-e281-4956-9367-5a0530976e60	JEFF ERICKSON BRITTON DOWNS/ CORN ISLAND	\N	\N	BO. NORTH END OSTADO ESTE AEROPUERTO	\N	5750-2596	f	\N	2026-08-07 03:00:41.635	2026-08-07 03:00:41.635	602-211155-0000N	\N	\N	00651	\N	\N	5750-2596	ARLES DAVID CENTENO
6f4da6bf-dc88-47e5-a800-23c07910829e	fedb4b05-e281-4956-9367-5a0530976e60	REAL PLAZA RENATO/ MILDER RIOS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.635	2026-08-07 03:00:41.635	\N	\N	\N	00652	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
acf86d5b-83f6-4b13-9499-11398fe24b6a	fedb4b05-e281-4956-9367-5a0530976e60	ROLANDO TORREZ CHAVARRIA	\N	\N	COLEGIO MONGALO 8 C AL SUR	\N	8378-2410	f	\N	2026-08-07 03:00:41.636	2026-08-07 03:00:41.636	001-261174-0091Y	\N	\N	00653	\N	\N	8378-2410	AGNEL CASTILLO
61cf0b70-0aff-4986-94a7-14f3221d75ef	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO JOSE SILVA	\N	\N	\N	\N	7711-9805	f	\N	2026-08-07 03:00:41.636	2026-08-07 03:00:41.636	001-090182-0077G	\N	\N	00654	\N	\N	7711-9805	AGNEL CASTILLO
fd9f21b3-b308-42b2-83fe-9be894386a22	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS JOSE SABORIO GUTIERREZ	\N	\N	ZONA 11 CIUDAD SANDINO COLEGIO ENRIQUE SMITCH 2 C AL NORTE 20 VRS AL ESTE CASA # B-2	\N	8456-6262	f	\N	2026-08-07 03:00:41.637	2026-08-07 03:00:41.637	202-080471-0002X	CRÉDITO 30 DIAS	1000000	00655	\N	\N	8456-6262	ARLES DAVID CENTENO
43076955-cf82-4b86-b8d2-d8cd108e14e1	fedb4b05-e281-4956-9367-5a0530976e60	LEONARDO JOSE DAVILA GUIDO	\N	\N	BARRIO CAMILO ORTEGA CEMENTERIO 2 C AL SUR 40 VRS AL OESTE	\N	8320-7610	f	\N	2026-08-07 03:00:41.637	2026-08-07 03:00:41.637	001-290990-0039S	\N	\N	00656	\N	\N	8320-7610	ARLES DAVID CENTENO
b1b2171d-6605-41bc-8596-74c8959b1dd7	fedb4b05-e281-4956-9367-5a0530976e60	DOMINGO DANIEL GUIDO USEDA	\N	\N	ZONA N°4 COLEGIO ROBERTO CLEMENTE 1C E CASA N° I-56 M/D	\N	8258-4280	f	\N	2026-08-07 03:00:41.639	2026-08-07 03:00:41.639	001-14383-0010C	\N	\N	00657	\N	\N	8258-4280	NYLSKA JOHANNY GARCIA CASTILLO
875c510e-c978-4c0c-91bf-ce2333feb631	fedb4b05-e281-4956-9367-5a0530976e60	JOSET ALEJANDRO CERDA RODRIGUEZ	\N	\N	BO. JONATHAN GONZALES FRENTE DONDE FUE LA DELEGACION MIFAM	\N	5810-2233	f	\N	2026-08-07 03:00:41.64	2026-08-07 03:00:41.64	001-150705-1060V	\N	\N	00658	\N	\N	5810-2233	AGNEL CASTILLO
372dba8c-d172-46be-9536-d2178559d0c0	fedb4b05-e281-4956-9367-5a0530976e60	MARCOS ANTONIO PRADO ARTIAGA	\N	\N	COMARCA BUENA VISTA KM 21 CARRETERA MASAYA 600 MTRS AL NORTE 200 VRS AL ESTE	\N	8249-6616	f	\N	2026-08-07 03:00:41.641	2026-08-07 03:00:41.641	081-241286-0000EW	\N	\N	00659	\N	\N	8249-6616	ARLES DAVID CENTENO
1b561698-0ea6-48e7-87bb-4729e7fe6f97	fedb4b05-e281-4956-9367-5a0530976e60	JOSE DANIEL GUEVARA VALLECILLOS	\N	\N	BO. 22 DE ENERO VETERINARIA PEPE PEPITO 1C .S	\N	\N	f	\N	2026-08-07 03:00:41.641	2026-08-07 03:00:41.641	001-120905-1097S	\N	\N	00660	\N	\N	\N	AGNEL CASTILLO
7f8ee65b-0564-4e21-a07c-ce5d1dc8b614	fedb4b05-e281-4956-9367-5a0530976e60	JOSE MERCEDES RODRIGUEZ LARGAESPADA	\N	\N	\N	\N	8322-1023	f	\N	2026-08-07 03:00:41.642	2026-08-07 03:00:41.642	004-080687-0001E	\N	\N	00661	\N	\N	8322-1023	ARLES DAVID CENTENO
7d6185c9-a21a-409d-9098-c7c4019f1614	fedb4b05-e281-4956-9367-5a0530976e60	GADIEL ANTONIO SANCHEZ	\N	\N	\N	\N	8970-5871	f	\N	2026-08-07 03:00:41.643	2026-08-07 03:00:41.643	\N	\N	\N	00662	\N	\N	8970-5871	AGNEL CASTILLO
c8de2cbb-0643-4d8a-ae89-b5e2818e460d	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO JAVIER ROCHA ARAGÓN	\N	\N	B 22 ENERO ENTRADA DE LOMAS DEL VALLE 1/2 C AL SUR	\N	76107945	f	\N	2026-08-07 03:00:41.643	2026-08-07 03:00:41.643	0011806870013M	\N	\N	00663	\N	76107945	\N	ARLES DAVID CENTENO
c432e673-6d0c-4e60-90c9-dd9d66c9af9b	fedb4b05-e281-4956-9367-5a0530976e60	ERVIN NIÑO	\N	\N	\N	\N	8945-1793	f	\N	2026-08-07 03:00:41.644	2026-08-07 03:00:41.644	001-090470-0066E	CRÉDITO 30 DIAS	37000	00664	\N	\N	8945-1793	AGNEL CASTILLO
8e42b009-8bfd-46ac-98e4-e20013f2d950	fedb4b05-e281-4956-9367-5a0530976e60	CEPRO / JAIME JAVIER BALDIZON ESPINOZA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.644	2026-08-07 03:00:41.644	001-020981-0080C	\N	\N	00665	\N	\N	\N	BISMARK MURILLO
78fd06ff-7f4f-4148-be71-b91d540283fa	fedb4b05-e281-4956-9367-5a0530976e60	LESTER CASTELLON PADILLA	\N	\N	RESD. SAN ANDRES KM 10 CARRETERA NUEVA LEON 1.8 KM CASA N P-10	\N	8396-4343	f	\N	2026-08-07 03:00:41.645	2026-08-07 03:00:41.645	281-270389-0004L	\N	\N	00666	\N	\N	8396-4343	ARLES DAVID CENTENO
b51aa433-4f12-45e7-8da2-cb94254a6481	fedb4b05-e281-4956-9367-5a0530976e60	WILMER ANTONIO ROMERO REYES	\N	\N	BO. LAS TORRES DE DONDE FUE PEPSI 6C N 3 C E	\N	8181-0063	f	\N	2026-08-07 03:00:41.645	2026-08-07 03:00:41.645	001-130488-0045S	\N	100000	00667	\N	\N	8181-0063	NYLSKA JOHANNY GARCIA CASTILLO
67b003d9-1fc1-4eac-b2d2-336c27b97d07	fedb4b05-e281-4956-9367-5a0530976e60	LIGIA MARIA BARAHONA ESPINOZA	\N	\N	BO. CRIST DEL ROSARIO ARBOLTO 2C. E 1 1/2 N	\N	7501-1505	f	\N	2026-08-07 03:00:41.646	2026-08-07 03:00:41.646	001-280992-0054V	\N	\N	00668	\N	\N	7501-1505	NYLSKA JOHANNY GARCIA CASTILLO
1df4a680-bf5f-4941-85d1-33cc7f26d26b	fedb4b05-e281-4956-9367-5a0530976e60	WINDERLIN MARIELYFLORES LUNA	\N	\N	ZONA 11 COSTADO NORTE COLEGIO ENRRIQUE SMITCH 1/2 C AL OESTE CASA # M-10	\N	8479-4769	f	\N	2026-08-07 03:00:41.646	2026-08-07 03:00:41.646	001-120700-1005G	\N	\N	00669	\N	\N	8479-4769	ARLES DAVID CENTENO
004baff4-e16a-40d1-83b2-e639900e2892	fedb4b05-e281-4956-9367-5a0530976e60	DEYTON GABRIEL MURILLO	\N	\N	BARRIO UNIVERSITARIO ENTRADA COUNTRY CLUB 3 C AL ESTE 4 C AL SUR	\N	8170-2949	f	\N	2026-08-07 03:00:41.647	2026-08-07 03:00:41.647	001-160598-1003S	\N	\N	00670	\N	\N	8170-2949	ARLES DAVID CENTENO
a8044943-2f62-4602-bafa-9b1951e5c21d	fedb4b05-e281-4956-9367-5a0530976e60	NOVEDOSA/ JORGE LUIS LOAISIGA GARCIA	\N	J031 0000 66809	BO. DOMITILA LUGO ROLTER 7 1/2 C N	\N	8480-7767	f	\N	2026-08-07 03:00:41.647	2026-08-07 03:00:41.647	001-30572-0007R	\N	\N	00671	\N	\N	8480-7767	NYLSKA JOHANNY GARCIA CASTILLO
24a97157-2727-4123-abe8-3cba1e1a7ef4	fedb4b05-e281-4956-9367-5a0530976e60	JASON EZER ORTIZ LÓPEZ	\N	\N	VILLA HOLANDA ESCUELA EL BUEN PASTOR 3C NORTE 30VRS ESTE	\N	86259906	f	\N	2026-08-07 03:00:41.648	2026-08-07 03:00:41.648	4010706970006H	\N	\N	00672	\N	86259906	\N	AGNEL CASTILLO
78ec259e-b8fd-4593-a100-ff963cae6292	fedb4b05-e281-4956-9367-5a0530976e60	GEOVANY MOISES GOMEZ AGUILAR	\N	\N	RESIDENCIAL SANTA ANITA KM 10.5 C SUR 300 MTRS AL NORTE	\N	8883-6807	f	\N	2026-08-07 03:00:41.648	2026-08-07 03:00:41.648	001-180885-0037M	\N	\N	00673	\N	\N	8883-6807	ARLES DAVID CENTENO
0e2294c3-4933-43a3-866d-9a2129f00e9e	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS DE JESUS MOJICA DUARTE	\N	\N	SECTOR N°1 ALCALDIA MINICIPAL 1C N.	\N	\N	f	\N	2026-08-07 03:00:41.648	2026-08-07 03:00:41.648	041-280380-000J	\N	\N	00674	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
a4370648-a0d1-4773-9642-5237cc336a3e	fedb4b05-e281-4956-9367-5a0530976e60	LESTER FRANCISCO TELLEZ ALVAREZ	\N	\N	REPARTO CUADRA ENTRADA HOSPITAL AL MASCOTA 3 C AL SUR 1 C AL ESTE	\N	7625-0598	f	\N	2026-08-07 03:00:41.649	2026-08-07 03:00:41.649	001-260681-0049B	\N	\N	00675	\N	\N	7625-0598	ARLES DAVID CENTENO
50ecce1e-bf7c-417f-aa51-d54698bb231a	fedb4b05-e281-4956-9367-5a0530976e60	FELIX QUEZADA	\N	\N	\N	\N	88834667	f	\N	2026-08-07 03:00:41.649	2026-08-07 03:00:41.649	\N	CONTADO	37000	00676	\N	\N	88834667	NYLSKA JOHANNY GARCIA CASTILLO
64060d22-b1bd-4f07-9cee-9424f001415f	fedb4b05-e281-4956-9367-5a0530976e60	ADRIAN SOZA	\N	\N	COL.CENTRO AMERICA MINI SUOPER 30 VRS AL ESTE, CASA 214	\N	58855812	f	\N	2026-08-07 03:00:41.65	2026-08-07 03:00:41.65	001-300705-1010Y	\N	37000	00677	\N	\N	58855812	BISMARK MURILLO
9869eb8c-f58b-4581-9e21-5ed99b013c44	fedb4b05-e281-4956-9367-5a0530976e60	JOSE MANUEL MENDOZA DELGADO	\N	\N	BARRIO MEXICO FARMACIA QUINTA AVENIDA 1 C AL NORTE 20 VRS AL ESTE CASA # 6	\N	8649-5553	f	\N	2026-08-07 03:00:41.65	2026-08-07 03:00:41.65	001-261273-0012T	CRÉDITO 30 DIAS	37000	00678	\N	\N	8649-5553	ARLES DAVID CENTENO
5db7aca6-8926-4480-bc7f-80f32f2dca91	fedb4b05-e281-4956-9367-5a0530976e60	EL HALCON / KAIBILA JULISSA PEREIRA ROMERO	\N	\N	COMARCA LAS CONCHITAS KM 17 CARRETERA TICUANTEPE 400 MTRS AL ESTE 80 MTRS AL SUR	\N	7652-3926	f	\N	2026-08-07 03:00:41.651	2026-08-07 03:00:41.651	286-060479-0002L	CRÉDITO 30 DIAS	37000	00679	\N	\N	7652-3926	ARLES DAVID CENTENO
1c8cc365-ac78-47b2-be30-901a4b9d81c9	fedb4b05-e281-4956-9367-5a0530976e60	CLAUDIA ISABEL VALLE CENTENO	\N	\N	COMARCA LOS LADINOS CENTRO DE SALUD 150 MTRS AL NORTE	\N	8516-1525	f	\N	2026-08-07 03:00:41.651	2026-08-07 03:00:41.651	406-251082-0000K	\N	\N	00680	\N	\N	8516-1525	AGNEL CASTILLO
f88bd65a-6f90-4fc2-b853-a56ccb5ea8a3	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ROSENDO VILCHEZ ZAVALA.	\N	\N	COL: CENTROAMERICA DISTRIBUIDORA EL TOPE 1C SUR 1C OESTE CASA # G-483	\N	\N	f	\N	2026-08-07 03:00:41.652	2026-08-07 03:00:41.652	001-070476-0022U	CRÉDITO 30 DIAS	37000	00681	\N	\N	\N	BISMARK MURILLO
d99280fa-71c9-4f76-a64f-c637223e6caa	fedb4b05-e281-4956-9367-5a0530976e60	MAURICIO NOEL GUIERREZ PICADO	\N	\N	COL. MAXIMO JEREZ CASA COMUNAL 2 AND N CASA N° B-84	\N	8861-2288	f	\N	2026-08-07 03:00:41.652	2026-08-07 03:00:41.652	001-071186-0062E	\N	\N	00682	\N	\N	8861-2288	NYLSKA JOHANNY GARCIA CASTILLO
3a4b3296-8742-4473-8b24-7a9ccf0e39a8	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO RAMON REYNOSA JIMENEZ	\N	\N	CMCA ESQUIPULAS KM 11 1/2 C. A MASAYA 2 KM S. M/D	\N	8287-1380	f	\N	2026-08-07 03:00:41.653	2026-08-07 03:00:41.653	401-101078-0005S	\N	\N	00683	\N	\N	8287-1380	NYLSKA JOHANNY GARCIA CASTILLO
4239e968-cb50-4e01-868a-3ea6bd8935bd	fedb4b05-e281-4956-9367-5a0530976e60	OLDEMAR HUMBERTO CALERO RIVAS	\N	\N	ANXO. VILLA ARLEN SIU, RESTAURANTE EL MADROÑO 6C. E	\N	\N	f	\N	2026-08-07 03:00:41.653	2026-08-07 03:00:41.653	001-160677-0060N	\N	30000	00685	\N	\N	\N	ARLES DAVID CENTENO
f819881d-6f8d-4166-8925-ee9720526e8b	fedb4b05-e281-4956-9367-5a0530976e60	BISMARCK LORENTE COLLADO/TRANCITO	\N	\N	MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.654	2026-08-07 03:00:41.654	\N	CRÉDITO 30 DIAS	37000	00686	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
5142b58a-66f1-4573-9183-2e89bb696721	fedb4b05-e281-4956-9367-5a0530976e60	MODESTO EMILIO BARRIOS JARQUIN	\N	\N	REST, LOS ROBLES, 2DA ETAPA CASA 121 MAANAGUA	\N	85815735	f	\N	2026-08-07 03:00:41.654	2026-08-07 03:00:41.654	001-070952-0008S	CONTADO	37000	00687	\N	\N	85815735	AGNEL CASTILLO
505d1ba2-f79e-4ae2-b588-b4235e776990	fedb4b05-e281-4956-9367-5a0530976e60	BYRON JOSE ESPINOZA VILCHEZ	\N	\N	BO. ARIEL DARCE PUENTE 14 DE SEPTIEMBRE 25 VRS O.	\N	8876- 8454	f	\N	2026-08-07 03:00:41.655	2026-08-07 03:00:41.655	001-061191-0040B	\N	\N	00688	\N	\N	8876- 8454	NYLSKA JOHANNY GARCIA CASTILLO
eece8543-3f9a-4c72-bd3a-88d6a40ab4d1	fedb4b05-e281-4956-9367-5a0530976e60	REYNALDO JOSÉ FLORES ALTAMIRANO	\N	\N	BO. U.R.R.S. PUENTE DESNIVEL 1C N 20 VRS OESTE	\N	77373336	f	\N	2026-08-07 03:00:41.655	2026-08-07 03:00:41.655	001-151162-0070L	\N	\N	00689	\N	\N	77373336	ARLES DAVID CENTENO
5e70a1fe-37fb-404e-9fe5-d2c2437b8ba5	fedb4b05-e281-4956-9367-5a0530976e60	ALBA ROSA MADRIGAL MARTINEZ	\N	\N	URB. MAYALES, 4 ESQUINAS ESQUIPULAS.900MTS. NOROESTE CASA N.237	\N	85884999	f	\N	2026-08-07 03:00:41.655	2026-08-07 03:00:41.655	001-010390-0025C	\N	\N	00690	\N	\N	85884999	NYLSKA JOHANNY GARCIA CASTILLO
d3afd724-686c-4801-a03a-9c59be5e15c4	fedb4b05-e281-4956-9367-5a0530976e60	GUILLERMO JOSE GUTIERREZ ROJAS	\N	\N	RPTO. MONTEFRESCO KM14 1/2 CARRETERA SUR 1C.E. 1C. S. CA.N.10	\N	84526647	f	\N	2026-08-07 03:00:41.656	2026-08-07 03:00:41.656	888-010862-0001M	\N	\N	00691	\N	\N	84526647	NYLSKA JOHANNY GARCIA CASTILLO
c0637189-18d7-42bc-bb26-0fb59c18e62d	fedb4b05-e281-4956-9367-5a0530976e60	ELIZA JAN LINDHOUT	\N	\N	MASAYA / ADMINISTRACION DE RENTE 1/2 C ABAJO	\N	7700-2990	f	\N	2026-08-07 03:00:41.656	2026-08-07 03:00:41.656	140220180452	\N	\N	00693	\N	\N	7700-2990	ARLES DAVID CENTENO
38e714ba-a872-44f2-af18-2406e23426c9	fedb4b05-e281-4956-9367-5a0530976e60	ECOSOLAR / MANUEL VILLALOBOS	\N	J031 0000 392811	\N	\N	5826-3133	f	\N	2026-08-07 03:00:41.657	2026-08-07 03:00:41.657	\N	\N	\N	00694	\N	\N	5826-3133	NYLSKA JOHANNY GARCIA CASTILLO
12df839e-c1d3-4eb6-b75c-fd20b21b44a3	fedb4b05-e281-4956-9367-5a0530976e60	JORGE ALBERTO MORALES PALACIOS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.658	2026-08-07 03:00:41.658	001-050370-0065N	\N	\N	00695	\N	\N	\N	AGNEL CASTILLO
7b5ea363-d6b7-427c-83a8-d2b162f5a219	fedb4b05-e281-4956-9367-5a0530976e60	SANTOS ISABEL MERCADO RAMIREZ	\N	\N	COMARCA LOS RINCONES IGLESIA CATOLICA VERACRUZ 800 MTRS AL NORTE	\N	\N	f	\N	2026-08-07 03:00:41.658	2026-08-07 03:00:41.658	408-080771-0001Y	\N	\N	00696	\N	\N	\N	AGNEL CASTILLO
a711097b-4655-4f54-b2dc-6dbb55d15be5	fedb4b05-e281-4956-9367-5a0530976e60	BYRON CAMILO RIVERA TORRES	\N	\N	BARRIO SAN JOSE ORIENTAL GIMNASIO NICARAO 3 C AL OESTE 1/2 C AL SUR	\N	8251-5931	f	\N	2026-08-07 03:00:41.659	2026-08-07 03:00:41.659	001-101097-0006L	\N	\N	00697	\N	\N	8251-5931	YAHOSKA D'TRINIDAD
64fcb532-5c43-4147-a522-2c683c479ec0	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO CARLOS COREA CASTAÑEDA	\N	\N	B SAN ANTONIO SUR KM 10 1/2 CARRETERS MASAYA 3KM SUR	\N	7631-4280	f	\N	2026-08-07 03:00:41.66	2026-08-07 03:00:41.66	001-190690-0000J	\N	\N	00698	\N	7631-4280	\N	ARLES DAVID CENTENO
37ae0c30-e30c-4720-8f76-f8713db450aa	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR DANILO DAVILA ACEVEDO	\N	\N	\N	\N	5872-2164	f	\N	2026-08-07 03:00:41.66	2026-08-07 03:00:41.66	081-171198-1009G	\N	\N	00699	\N	\N	5872-2164	ARLES DAVID CENTENO
bf74b40c-8cc7-4f73-a038-a4f80a1f9450	fedb4b05-e281-4956-9367-5a0530976e60	JOSE CERDA	\N	\N	BO.JONATHAN GONZALES FRENTE DONDE FUE DELEGACION MIFAM	\N	\N	f	\N	2026-08-07 03:00:41.661	2026-08-07 03:00:41.661	\N	\N	\N	00700	\N	\N	\N	AGNEL CASTILLO
1dcb32cb-b2de-4dfa-bb43-8610a4bb9df4	fedb4b05-e281-4956-9367-5a0530976e60	HERMAN ANTONIO GUEVARA MAYEN	\N	\N	VI. RECONCILIACION BLOQUERA HOWARD 7 AND N. 1/2 O	\N	8102-4145	f	\N	2026-08-07 03:00:41.662	2026-08-07 03:00:41.662	616-230588-0000S	\N	\N	00701	\N	\N	8102-4145	NYLSKA JOHANNY GARCIA CASTILLO
33ab3fc4-a6d5-40f1-abba-e344db102577	fedb4b05-e281-4956-9367-5a0530976e60	MARIO ABRAHAM ZAPATA PARAMO	\N	\N	REPARTO LAS JINOTEPES KM 12 CARRETERA SUR 1C ESTE 1C NORTE M/1	\N	8567-3821	f	\N	2026-08-07 03:00:41.662	2026-08-07 03:00:41.662	001-080277-0031N	\N	\N	00702	\N	8567-3821	\N	ARLES DAVID CENTENO
b91571a2-1788-4dd6-9ff2-5b04d9c9b506	fedb4b05-e281-4956-9367-5a0530976e60	URIEL ANONIO ROCHA ULLOA	\N	\N	\N	\N	5748 8197	f	\N	2026-08-07 03:00:41.663	2026-08-07 03:00:41.663	0030609870000B	\N	\N	00703	\N	\N	5748 8197	NYLSKA JOHANNY GARCIA CASTILLO
c961ec51-afad-454c-9bf7-9030d8449102	fedb4b05-e281-4956-9367-5a0530976e60	ADRIAN ISMAEL SOZA ORTIZ	\N	\N	RESIDENCIAL LAS DELICIAS ENTRADA LAS MERCEDES 8 C AL NORTE CASA # H-309	\N	5737-3514	f	\N	2026-08-07 03:00:41.664	2026-08-07 03:00:41.664	001-300487-0011X	\N	\N	00704	\N	\N	5737-3514	ARLES DAVID CENTENO
22fe3f58-ecf1-40e1-a3b4-6a2deed73dcc	fedb4b05-e281-4956-9367-5a0530976e60	INVERSIONES SILVA CORONADO S.A	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.664	2026-08-07 03:00:41.664	\N	\N	\N	00705	\N	\N	\N	BISMARK MURILLO
193a88f6-1228-4f82-a17a-395407dc44f7	fedb4b05-e281-4956-9367-5a0530976e60	SANDRA GUADALUPE JIMENEZ CORDOBA	\N	\N	CMCA. POCHOCUAPE IGLESIA CATOLICA 25VRS S	\N	89720379	f	\N	2026-08-07 03:00:41.665	2026-08-07 03:00:41.665	498-160865-0003R	\N	\N	00706	\N	\N	89720379	AGNEL CASTILLO
df5e4d4c-e32a-45a1-a7b8-98712b6faeb0	fedb4b05-e281-4956-9367-5a0530976e60	BERNARDO MARVIN NIÑO GONZALEZ	\N	\N	MANAGUA,BATAHOLA NORTE FERRETERIA EL GIGANTE 3C NORTE, 1C OESTE CASA 828	\N	83805879	f	\N	2026-08-07 03:00:41.666	2026-08-07 03:00:41.666	281-141268-0007J	CRÉDITO 30 DIAS	70000	00707	\N	\N	83805879	BISMARK MURILLO
1f26b5d3-508e-42ad-ac0f-d9a69fe58a86	fedb4b05-e281-4956-9367-5a0530976e60	GILBERTO ARMANDO MONTIEL MENDOZA	\N	\N	BO. MANUEL FERNANDEZ TERMINAL DE RUTA 118 1 C. O 3 1/2 C. N	\N	86870551	f	\N	2026-08-07 03:00:41.667	2026-08-07 03:00:41.667	001-010966-0067S	CRÉDITO 30 DIAS	100000	00708	\N	\N	86870551	AGNEL CASTILLO
7697ca0a-2e40-4589-88f6-b83ae245cdf7	fedb4b05-e281-4956-9367-5a0530976e60	RICARDO RENATO TELLEZ REYEZ	\N	\N	\N	\N	7825-9079	f	\N	2026-08-07 03:00:41.667	2026-08-07 03:00:41.667	001-121194-0004J	\N	\N	00709	\N	\N	7825-9079	NYLSKA JOHANNY GARCIA CASTILLO
a6f9ab29-4519-41ad-b32f-a6be9b0e2201	fedb4b05-e281-4956-9367-5a0530976e60	GUILLERMO JOSE LOPEZ CASTILLO	\N	\N	RESD. BOLONIA LUGO RENTA CAR BOLONIA 2 1/2 C S.	\N	8180-5757	f	\N	2026-08-07 03:00:41.668	2026-08-07 03:00:41.668	448-22029-0000X	\N	\N	00710	\N	\N	8180-5757	NYLSKA JOHANNY GARCIA CASTILLO
4ad11e82-bd9d-43f1-bf42-b263c990f9a4	fedb4b05-e281-4956-9367-5a0530976e60	KRISTOPHERRS NOEL MALTEZ GAYTAN	\N	\N	BARRIO SAN JUDAS PARADA LOS COCOS 11/2 C AL SUR	\N	8554-2240	f	\N	2026-08-07 03:00:41.668	2026-08-07 03:00:41.668	001-261286-0061B	\N	\N	00711	\N	\N	8554-2240	ARLES DAVID CENTENO
6555e95e-123d-46cb-977b-887a42b1c607	fedb4b05-e281-4956-9367-5a0530976e60	VACSA/ CLAUDIO RAFAEL LAINEZ CARRASCO	\N	J0310000341800	\N	\N	8753-8371	f	\N	2026-08-07 03:00:41.669	2026-08-07 03:00:41.669	089-290975-0004R	\N	\N	00712	8111-4870	\N	8753-8371	ARLES DAVID CENTENO
1305e3e5-7155-432e-a57d-409ce24785de	fedb4b05-e281-4956-9367-5a0530976e60	ALLAND JOSE AGUILAR VALLE	\N	\N	RESD. ALTOS DE SANTO DOMINGO EMPRESA ECAMI 1/2 C. O 250 MTS S. 75 MTS E. CASA N°7	\N	8786-1047	f	\N	2026-08-07 03:00:41.67	2026-08-07 03:00:41.67	001-170269-0021Q	\N	\N	00713	\N	\N	8786-1047	NYLSKA JOHANNY GARCIA CASTILLO
feb01911-c423-48a4-914d-03d229445b82	fedb4b05-e281-4956-9367-5a0530976e60	INTERAMERICAN SOLAR S,A /CRISTIAN REBECA OSORIO	\N	J031000042116	URBANIZACION MONTE NEBO 2DA ETAPA CALLE 8 CASA # A-157	\N	8729-7932	f	\N	2026-08-07 03:00:41.67	2026-08-07 03:00:41.67	001-270985-0045W	\N	\N	00714	\N	\N	8729-7932	ARLES DAVID CENTENO
efc8c546-137b-4d8b-b678-2d76970232ee	fedb4b05-e281-4956-9367-5a0530976e60	GONZALO MANUEL ARLEY CASTRO (MISION CRISTIANA CANTICO NUEVO)	\N	J0820000151570	BO. EL EDEN PORTON CEMENTERIO ORIENTAL 1 C. A. 1 1/2 C.O.	\N	84210010	f	\N	2026-08-07 03:00:41.671	2026-08-07 03:00:41.671	001-181087-0028E	\N	\N	00715	\N	\N	84210010	AGNEL CASTILLO
2d361630-65cd-409a-ae99-366989825794	fedb4b05-e281-4956-9367-5a0530976e60	JOSE PLUTARCO GONZALEZ ZEPEDA	\N	\N	RESIDENCIAL COIMBRA PRICESAMART 400 MTS O. CASA N° 11	\N	8883-4534	f	\N	2026-08-07 03:00:41.672	2026-08-07 03:00:41.672	0852205600000H	CRÉDITO 15 DIAS	50000	00716	\N	8883-4534	\N	ARLES DAVID CENTENO
3b1be207-b754-48bc-b6d9-2cceb9b2314b	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ALONSO MORALES GERRERO	\N	\N	COMARCA ALONSO GONZALES KM 171/2 CARRETERA XILOA 1 KM AL OESTE	\N	5845-7141	f	\N	2026-08-07 03:00:41.673	2026-08-07 03:00:41.673	001-251079-0010T	\N	\N	00717	\N	\N	5845-7141	ARLES DAVID CENTENO
2ef6e501-23f5-4deb-91af-fc237a2fbcca	fedb4b05-e281-4956-9367-5a0530976e60	CACSA /ILEANA MORENO LOPEZ	\N	J0310000194858	ESTELI / BARRIO STO DOMINGO PORTON PRINCIPAL UPOLI 21/2 C AL OESTE	calfaro_sa@yahoo.com	8833-1680	f	\N	2026-08-07 03:00:41.674	2026-08-07 03:00:41.674	161-011277-0004R	\N	30000	00718	8856-6277	2714-1436	8833-1680	ARLES DAVID CENTENO
14fb831d-2bd5-46d2-aba1-fcedc164904e	fedb4b05-e281-4956-9367-5a0530976e60	FRANKLIN ROBERTO RIVERA OROZCO	\N	\N	BO.22 DE ENERO DE DONDE FUE AUTOCINEMA GANDO 3C, E 1/2C S	\N	83998049	f	\N	2026-08-07 03:00:41.675	2026-08-07 03:00:41.675	001-130594-0027W	\N	\N	00719	\N	\N	83998049	AGNEL CASTILLO
c42fd8c3-2d9e-4421-ae27-0a205d66b32f	fedb4b05-e281-4956-9367-5a0530976e60	ERICK ANTONIO LEIVA	\N	\N	BO. ENRIQUE LORENTE CONTIGUO A CASA CHQUEO RUTA 108-109 CA. N E-455	\N	8149-7190	f	\N	2026-08-07 03:00:41.676	2026-08-07 03:00:41.676	001-181080-0082B	\N	\N	00720	\N	\N	8149-7190	NYLSKA JOHANNY GARCIA CASTILLO
39765b66-4972-4901-8505-32f3e2fc2177	fedb4b05-e281-4956-9367-5a0530976e60	GASPRO / EVERT MAURICIO TELLEZ VASQUEZ	\N	\N	MONSEÑOR LEZCANO DONDE FUE BANCO POPULAR 3C AL ESTE 1 C AL NORTE	\N	8252-6432	f	\N	2026-08-07 03:00:41.677	2026-08-07 03:00:41.677	001-101081-0148A	\N	\N	00721	\N	\N	8252-6432	ARLES DAVID CENTENO
2b73107f-c6fe-4f22-9dc7-351b207b5fad	fedb4b05-e281-4956-9367-5a0530976e60	ANIBAL ELIEZER MALTA CHAVEZ	\N	\N	\N	\N	8410-7135	f	\N	2026-08-07 03:00:41.678	2026-08-07 03:00:41.678	081-140998-1004G	CRÉDITO 30 DIAS	5000	00722	\N	\N	8410-7135	YESSEL ANAHY CERPAS ARTOLA
20065034-3961-46dc-8f80-c6b6e03f40f3	fedb4b05-e281-4956-9367-5a0530976e60	CELESTINO MARCELINO MARTINEZ	\N	\N	BO. MILAGRO DE DIOS DE DONDE FUE TERMINAL DE RUTA 195 3C. N. 1/2C. E.	\N	88842379	f	\N	2026-08-07 03:00:41.679	2026-08-07 03:00:41.679	085-060465-0000P	\N	\N	00723	\N	\N	88842379	AGNEL CASTILLO
5ca4e457-ca02-4b7b-a54b-e978cdc44609	fedb4b05-e281-4956-9367-5a0530976e60	EDUARDO JOSÉ MURILLO JARQUIN	\N	\N	BO SANTA ROSA, INCESA 1 1/2 SUR M/D	\N	7549-1401	f	\N	2026-08-07 03:00:41.68	2026-08-07 03:00:41.68	001-130967-0067N	\N	\N	00724	7549-1401	7549-1401	\N	ARLES DAVID CENTENO
328138df-b11f-47d3-b06a-f57cc62b5345	fedb4b05-e281-4956-9367-5a0530976e60	LAZARO ANDRES OROZCO RAYO	\N	\N	BO. HEROES Y MARTIRES DE AYAPAL PASO DESNIVEL NEJAPA	\N	77343413	f	\N	2026-08-07 03:00:41.681	2026-08-07 03:00:41.681	001-210692-0007K	\N	\N	00725	\N	\N	77343413	AGNEL CASTILLO
1af9cb06-22c7-4d6b-be44-b5d80a1f7c31	fedb4b05-e281-4956-9367-5a0530976e60	OMAR VIRGILIO GOMEZ HERNANDEZ	\N	\N	BO. COOPERATIVA MANOLO MORALES IGLESIA VILLA FLOR SUR 1C. S. 1C.E	\N	82574562	f	\N	2026-08-07 03:00:41.683	2026-08-07 03:00:41.683	001-040763-0048G	\N	\N	00726	\N	\N	82574562	AGNEL CASTILLO
cc6f2ffd-f8c8-4987-aede-9b4e40b07a32	fedb4b05-e281-4956-9367-5a0530976e60	VICTOR ISMAEL NORORI HERNANDEZ	\N	\N	BARRIO PEDRO JOAQUIN CHAMORRO CANCHA DEPORTIVA 2 C AL ESTE CASA # D-1	\N	7521-7569	f	\N	2026-08-07 03:00:41.685	2026-08-07 03:00:41.685	082-131169-0000B	\N	\N	00727	\N	\N	7521-7569	ARLES DAVID CENTENO
9df7e0aa-07f0-4a76-b3d9-4565fc2a13f4	fedb4b05-e281-4956-9367-5a0530976e60	JOSE DAVID BAQUEDANO GONZALEZ	\N	\N	RESD, CUIDAD SAN SEBASTIAN TERMINAL DE RUTA 112 800MTS S CA N°A-75	\N	8398-5237	f	\N	2026-08-07 03:00:41.686	2026-08-07 03:00:41.686	001-140178-0039M	\N	\N	00728	\N	\N	8398-5237	NYLSKA JOHANNY GARCIA CASTILLO
1b0a668d-9517-4e7e-ad09-41e4b8b812d9	fedb4b05-e281-4956-9367-5a0530976e60	CLEGIO HUMBERTO GARCIA ALVAREZ	\N	\N	\N	\N	8676-9790	f	\N	2026-08-07 03:00:41.687	2026-08-07 03:00:41.687	001-150981-0024U	\N	100000	00729	\N	\N	8676-9790	ARLES DAVID CENTENO
9155bafb-63ef-4c79-928e-a654d0cb0f73	fedb4b05-e281-4956-9367-5a0530976e60	BISMARK ANTONIO BUCARDO MARCHENA	\N	\N	BO. JUAN ALBERTO BLANDON, DONDE FUE DEPOSITO PEPSII 1C. SUR	\N	\N	f	\N	2026-08-07 03:00:41.688	2026-08-07 03:00:41.688	161-070674-0013R	\N	\N	00730	\N	\N	\N	AGNEL CASTILLO
a0389826-5127-4291-aa94-9931afff9bc2	fedb4b05-e281-4956-9367-5a0530976e60	JUAN MANUEL GARCIA GARCIA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.689	2026-08-07 03:00:41.689	001-101287-0059J	\N	\N	00731	\N	\N	\N	BISMARK MURILLO
1083f6f4-7d09-40e2-adc0-072902152611	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO MARTIN MEJIA HURTADO	\N	\N	VILLA MIGUEL GUTIERREZ CASA COMUNAL 2 C AL ESTE CASA # 458	\N	8667-4065	f	\N	2026-08-07 03:00:41.69	2026-08-07 03:00:41.69	001-141170-0012C	\N	\N	00732	\N	\N	8667-4065	ARLES DAVID CENTENO
1006c437-5a63-4ce2-b288-9f49dc5d2926	fedb4b05-e281-4956-9367-5a0530976e60	VANESA WINDOTEC	\N	\N	\N	\N	84941139	f	\N	2026-08-07 03:00:41.691	2026-08-07 03:00:41.691	001-100386-0041L	\N	\N	00733	\N	\N	84941139	AGNEL CASTILLO
ef7da65c-dfd1-4bdd-8177-dd8f21451ce6	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ABERLARDO ZAMBRANA CHAMORRO	\N	\N	RESD. CUIDAD EL DORAL KM181/2 CARRETERA NUEVA LEON CALLE 1 AVENIDA 22 CASA N°E-7	\N	86229437	f	\N	2026-08-07 03:00:41.691	2026-08-07 03:00:41.691	521-080986-0000U	\N	\N	00734	\N	\N	86229437	AGNEL CASTILLO
90309675-c562-4864-9c39-3d3536110d62	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL IGNACIO LACAYO RIVERA	\N	\N	RESD. PRADOS DE EUCALIPTO KM 14 1/2 C A MASAYA COSTADO SUR CANCHA DE FUTBOL CA N°66	\N	8883-5777	f	\N	2026-08-07 03:00:41.692	2026-08-07 03:00:41.692	001-131172-0067Y	\N	\N	00735	\N	\N	8883-5777	NYLSKA JOHANNY GARCIA CASTILLO
98c6894e-23d7-451a-8a66-1a2aa3c1f856	fedb4b05-e281-4956-9367-5a0530976e60	ELSA MENDOZA/EFRAIN ANTONIO SILES OBANDO	\N	\N	ANEXO, GRUTA XAVIER DETRAS DE MONTE CRISTO 21/2 C AL ESTE 11/2 C AL NORTE	\N	8787-9364	f	\N	2026-08-07 03:00:41.693	2026-08-07 03:00:41.693	121-070587-0002G	CRÉDITO 30 DIAS	5000	00736	\N	\N	8787-9364	ARLES DAVID CENTENO
7fa52e7c-02a4-454b-8427-2f23570d5c37	fedb4b05-e281-4956-9367-5a0530976e60	ORQUINSA	\N	J0310000185956	CHIQUILISTAGUA FRENTE A LOS TANQUES DE ENACAL	\N	8477-6282	f	\N	2026-08-07 03:00:41.694	2026-08-07 03:00:41.694	J0310000185956	CONTADO	\N	00737	\N	\N	8477-6282	ARLES DAVID CENTENO
8ae5597d-3988-4d07-9244-a27c1c9b7c3c	fedb4b05-e281-4956-9367-5a0530976e60	NORVIN ALBERTO ZAMORA ESCOTO	\N	\N	BARRIO NUEVO SUPER MERCADO PALI 4C E1/2 NORTE	\N	8385-8877	f	\N	2026-08-07 03:00:41.694	2026-08-07 03:00:41.694	448-12124-0002M	\N	\N	00738	\N	\N	8385-8877	AGNEL CASTILLO
f3b7778d-0ac3-4654-ae3a-51098ac53690	fedb4b05-e281-4956-9367-5a0530976e60	SERGIO MAURICIO GAGO ESPINOZA	\N	\N	DIRIAMBA COMARCA LOS RANCHOS PANIQUINES 11/2 KM AL OESTE	\N	8558-9046	f	\N	2026-08-07 03:00:41.695	2026-08-07 03:00:41.695	042-030185-0004L	\N	\N	00739	\N	\N	8558-9046	ARLES DAVID CENTENO
d0888458-2b32-4d18-8b01-7368b4379f93	fedb4b05-e281-4956-9367-5a0530976e60	ELIZABETH GUTIERREZ /KB COLECCION INTERNACIONAL S,A	\N	J0310000322902	BARRIO DOMITILA LUGO COCACOLA 5 C AL NORTE 31/2 C AL OESTE	\N	7776-7945	f	\N	2026-08-07 03:00:41.695	2026-08-07 03:00:41.695	001-230787-0051V	\N	\N	00740	\N	\N	7776-7945	ARLES DAVID CENTENO
4badbf06-d7d4-4340-b66f-863753267141	fedb4b05-e281-4956-9367-5a0530976e60	MILTON JOSUE RUEDA GUZMAN	\N	\N	RESIDENCIAL EL CORTEZ KM 14 CARRETERA MANAGUA-MASAYA 1.5M ESTE CASA CASA N° 9	\N	8717-1754	f	\N	2026-08-07 03:00:41.696	2026-08-07 03:00:41.696	001-040794-0053T	\N	\N	00741	\N	\N	8717-1754	AGNEL CASTILLO
27009aa2-c2d0-43e5-9cb6-d329034169e9	fedb4b05-e281-4956-9367-5a0530976e60	HAZEL GRACE JIRON NOGUERA	\N	\N	\N	\N	8590-9046	f	\N	2026-08-07 03:00:41.696	2026-08-07 03:00:41.696	001-060779-0010H	\N	\N	00742	\N	\N	8590-9046	NYLSKA JOHANNY GARCIA CASTILLO
0ba0e462-e513-4419-afae-fe0cd1a9c124	fedb4b05-e281-4956-9367-5a0530976e60	ALLAND MOISES GUADAMUZ MENDIETA	\N	\N	\N	\N	8938-6897	f	\N	2026-08-07 03:00:41.697	2026-08-07 03:00:41.697	001-030980-0025A	\N	\N	00743	\N	\N	8938-6897	BISMARK MURILLO
c769d802-93cd-4727-b6dd-5b5da4577d6e	fedb4b05-e281-4956-9367-5a0530976e60	ALDO JOSE CAMPOS PEÑA	\N	\N	MASAYA - COMARCA MADRIGALES SUR ENTRADA QUESILLOS EL BOSQUE 300 VRS AL NORTE	\N	8549-7191	f	\N	2026-08-07 03:00:41.697	2026-08-07 03:00:41.697	044-040494-0000P	\N	\N	00744	\N	\N	8549-7191	ARLES DAVID CENTENO
b684b4bc-3452-4a4d-a231-4f7554c6d461	fedb4b05-e281-4956-9367-5a0530976e60	MARIO ALEXANDER VELASQUEZ GONZALEZ	\N	\N	COL, UNIDAD DE PROPOSITO DE DONDE FUE GASOLINERA TEXACO 2 C N 1 1/2 C O.	\N	8414-4017	f	\N	2026-08-07 03:00:41.698	2026-08-07 03:00:41.698	001-070395-0001M	\N	\N	00745	\N	\N	8414-4017	NYLSKA JOHANNY GARCIA CASTILLO
c6cc739d-efeb-492c-9598-8350ac2dd547	fedb4b05-e281-4956-9367-5a0530976e60	WENDY YAHOSCA REYES MONTIEL	\N	\N	RESIDENCIAL LOS ARCOS INIFOM 1 1/2C SUR. CASA N° E-100	\N	5750-5770	f	\N	2026-08-07 03:00:41.698	2026-08-07 03:00:41.698	001-171182-0041A	CRÉDITO 30 DIAS	100000	00746	\N	\N	5750-5770	ARLES DAVID CENTENO
4ef92933-dfdf-48a2-84b2-7cff4c49098f	fedb4b05-e281-4956-9367-5a0530976e60	FREDDY GEOVANNY RIVAS GUTIERREZ	\N	\N	CMCA ESQUIPULAS PORTON PRINCIPAL IGLESIA CATOLICA 2C S.	\N	7799-3644	f	\N	2026-08-07 03:00:41.699	2026-08-07 03:00:41.699	007-300591-0000A	CRÉDITO 30 DIAS	100000	00747	\N	\N	7799-3644	NYLSKA JOHANNY GARCIA CASTILLO
d97f19f6-d107-4d22-8fc9-a5e7b0bb9161	fedb4b05-e281-4956-9367-5a0530976e60	JORGE LUIS RODRIGUEZ	\N	\N	BARRIO HUGO CHAVEZ ENTRADA PRINCIPAL 6 ANDENES AL NORTE 40 VRS AL ESTE	\N	8667-7111	f	\N	2026-08-07 03:00:41.699	2026-08-07 03:00:41.699	441-0580189-0003G	\N	15000	00748	\N	\N	8667-7111	YESSEL ANAHY CERPAS ARTOLA
4b396e6d-7716-4ff4-aeb2-ab1804fb21c4	fedb4b05-e281-4956-9367-5a0530976e60	NESTOR WILLIAN LARIOS FLORES	\N	\N	DIRIAMBA / BARRIO SAN FRANCISCO 6TA CALLE 200 VRS AL OESTE	\N	8247-4411	f	\N	2026-08-07 03:00:41.7	2026-08-07 03:00:41.7	041-040481-0010T	\N	\N	00749	\N	\N	8247-4411	ARLES DAVID CENTENO
bf654245-6a9b-424f-bf9d-ba5e4fcae472	fedb4b05-e281-4956-9367-5a0530976e60	ANA LILLIAM JAMES LUNA	\N	\N	COL. CENTROAMERICA ESTATUA SALVADOR MENDIETA 75 VRSS. CASA N° D-294	\N	8432 - 7229	f	\N	2026-08-07 03:00:41.7	2026-08-07 03:00:41.7	565-110979-0002G	CRÉDITO 30 DIAS	100000	00750	\N	\N	8432 - 7229	NYLSKA JOHANNY GARCIA CASTILLO
dc18c029-c689-4f4a-93f1-ecf4e34fcc8f	fedb4b05-e281-4956-9367-5a0530976e60	FELIX JAVIER MENDOZA JARQUIN	\N	\N	CMA, CRUZ DEL PARAISO PORTON N°6 GALERIAS SANTO DOMINGO 1 1/2KM.S	\N	\N	f	\N	2026-08-07 03:00:41.701	2026-08-07 03:00:41.701	001-200180-0087	\N	\N	00751	\N	\N	\N	AGNEL CASTILLO
92571a06-ab39-4548-a69a-fcc7039e0a9b	fedb4b05-e281-4956-9367-5a0530976e60	JUAN CARLOS ROBLETO LIRA	\N	\N	\N	\N	57959230	f	\N	2026-08-07 03:00:41.701	2026-08-07 03:00:41.701	616-181280-0002X	\N	\N	00752	\N	\N	57959230	NYLSKA JOHANNY GARCIA CASTILLO
4ec788c2-779f-4fcc-8a9c-d23718479bfc	fedb4b05-e281-4956-9367-5a0530976e60	ANTONIO JOSE FLORES MEZA	\N	\N	BO. MARIA AUXILIADORA, COSTDO SUR IGLESIA CATOLICA CA. N°17	\N	75059323	f	\N	2026-08-07 03:00:41.701	2026-08-07 03:00:41.701	001-130663-0037H	\N	\N	00753	\N	\N	75059323	AGNEL CASTILLO
fa64c520-8fdc-4078-933c-5c73455d731d	fedb4b05-e281-4956-9367-5a0530976e60	GERMAN ANTONIO SILVA GARCIA	\N	\N	NEJAPA DE DONDE FUE HOTEL NEJAPA 600 MTRS AL NORTE 100 VRS AL OESTE	\N	8750-0045	f	\N	2026-08-07 03:00:41.702	2026-08-07 03:00:41.702	001-021285-0049R	\N	\N	00754	\N	\N	8750-0045	ARLES DAVID CENTENO
794477ee-57c9-478b-ad5f-9bfc3231efe2	fedb4b05-e281-4956-9367-5a0530976e60	NOE DE JESUS ARCE PEREZ	\N	\N	BO. AMANDA AGGUILAR DE DONDE FUE EL CHAPARRAL 4C S. AC O. 1C S. CASA N°27	\N	8814-5787	f	\N	2026-08-07 03:00:41.702	2026-08-07 03:00:41.702	093-180760-0001C	\N	\N	00755	\N	\N	8814-5787	NYLSKA JOHANNY GARCIA CASTILLO
7f64a158-4ba8-47ea-9d2e-f45b678b369e	fedb4b05-e281-4956-9367-5a0530976e60	DAVID FRANCISCO VANEGAS MEDINA	\N	\N	COMARCA LOS VANEGAS KM 12.7 CARRETERA MASAYA1 KM AL ESTE	\N	8326-9114	f	\N	2026-08-07 03:00:41.703	2026-08-07 03:00:41.703	141-141290-0001S	\N	\N	00756	\N	\N	8326-9114	ARLES DAVID CENTENO
5c6cf9d9-4066-473f-bf55-ee73b1a47f71	fedb4b05-e281-4956-9367-5a0530976e60	NORMAN ESTEBAN VALDIVIA VALLE	\N	\N	VILLA EL ROSARIO KM 10 1/2 CARRETERA MASAYA 600 MTS OESTE CASA N°4	\N	8748-5362	f	\N	2026-08-07 03:00:41.703	2026-08-07 03:00:41.703	041-230179-0001R	\N	\N	00757	\N	\N	8748-5362	ARLES DAVID CENTENO
e62fbf55-7fdc-4ff7-a82d-5ebbc987212d	fedb4b05-e281-4956-9367-5a0530976e60	ALVARO JOSE CASTILLO	\N	\N	BARRIO SAN LUIS LADRILLERIA SAN JUAN 1 C AL NORTE	\N	8829-0895	f	\N	2026-08-07 03:00:41.704	2026-08-07 03:00:41.704	561-280366-0001E	\N	\N	00758	\N	\N	8829-0895	ARLES DAVID CENTENO
2a5019d5-d922-4574-abf3-78e81e5f2ac1	fedb4b05-e281-4956-9367-5a0530976e60	KENNETH ALBERTO FITORIA HERNANDEZ	\N	\N	\N	\N	85940280	f	\N	2026-08-07 03:00:41.705	2026-08-07 03:00:41.705	409-110902-1001X	\N	\N	00759	\N	\N	85940280	ARLES DAVID CENTENO
789802b6-b864-4cfe-9053-5e8c5f694bdd	fedb4b05-e281-4956-9367-5a0530976e60	DIDEPSA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.706	2026-08-07 03:00:41.706	\N	CRÉDITO 30 DIAS	100000	00760	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
e8ff10a3-8179-49bd-baa4-f68c0423a658	fedb4b05-e281-4956-9367-5a0530976e60	JOEL CALLET ALTAMIRANO VIVAS	\N	\N	BARRIO NAPOLEON ALTAMIRANO IGLESIA EL CALVARIO 800 VRS AL NORTE 25 VRS AL ESTE	\N	8391-4719	f	\N	2026-08-07 03:00:41.707	2026-08-07 03:00:41.707	007-200287-0000F	CRÉDITO 30 DIAS	5000	00761	\N	\N	8391-4719	ARLES DAVID CENTENO
798c3cf5-7215-47c8-a0bd-a998357d94a7	fedb4b05-e281-4956-9367-5a0530976e60	SOTERO ZAMORA LOPEZ	\N	\N	BARRIO LAURELES SUR BAR LA CAÑADA 2 C AL ESTE 2 C AL SUR	\N	8805-9242	f	\N	2026-08-07 03:00:41.708	2026-08-07 03:00:41.708	288-220472-0002T	\N	\N	00762	\N	\N	8805-9242	ARLES DAVID CENTENO
ab6e7d54-71ba-4b11-97de-288c67f41a4e	fedb4b05-e281-4956-9367-5a0530976e60	YERIS ANTONIO ARAICA MORALES	\N	\N	COMARCA LOS GARCIA CEMENTERIO 250 VARAS OESTE	\N	8166-1397	f	\N	2026-08-07 03:00:41.708	2026-08-07 03:00:41.708	004-270701-1000F	\N	\N	00763	\N	\N	8166-1397	BISMARK MURILLO
8462f9ec-3b3c-400a-a6ab-1695a4081ba0	fedb4b05-e281-4956-9367-5a0530976e60	HECTOR FELIPE GOMEZ MACHADO	\N	\N	SAN LORENZO / BOACO COMARCA SAN ANTONIO COLEGIO INMACULADA 150 MTRS AL NORTE	\N	7558-5531	f	\N	2026-08-07 03:00:41.709	2026-08-07 03:00:41.709	365-150271-0000H	\N	\N	00764	\N	\N	7558-5531	ARLES DAVID CENTENO
708f59f1-a7d0-447a-a368-f56b4ce838cc	fedb4b05-e281-4956-9367-5a0530976e60	JHONNY JADEL HERNANDEZ OBANDO	\N	\N	BARRIO ISRRAEL GALEANO PARQUE DEL CEIBO 1 C AL OESTE 1 C AL NORTE	\N	8164-89396	f	\N	2026-08-07 03:00:41.71	2026-08-07 03:00:41.71	610-290191-0006Q	\N	\N	00765	\N	\N	8164-89396	ARLES DAVID CENTENO
74ab6bb9-9871-4828-9bdf-720a8018b43b	fedb4b05-e281-4956-9367-5a0530976e60	YESSENIA ROSALES/ CONTRUCASA	\N	\N	\N	\N	8970-1175	f	\N	2026-08-07 03:00:41.711	2026-08-07 03:00:41.711	2810810760012U	\N	100000	00766	8979-2571	\N	8970-1175	NYLSKA JOHANNY GARCIA CASTILLO
2f527d31-2069-4728-93c3-c8310e9cf444	fedb4b05-e281-4956-9367-5a0530976e60	ARMANDO QUINTANILLA ORDOÑEZ	\N	\N	BARRIO TEODORO LOPEZ FRENTE AUTOLAVADO PALERMO  OCOTAL	\N	5834-0316	f	\N	2026-08-07 03:00:41.711	2026-08-07 03:00:41.711	481-060262-0000E	\N	\N	00767	\N	\N	5834-0316	ARLES DAVID CENTENO
dd520b79-8c33-4bdb-b6fc-2a487bd72a92	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO JAVIER CARRANZA MEJIA	\N	\N	BO. SAN SEBASTIAN PARQUE SAN SEBASTIAN 3 1/2 C. N	\N	\N	f	\N	2026-08-07 03:00:41.712	2026-08-07 03:00:41.712	001-100570-0079C	\N	\N	00768	\N	\N	\N	AGNEL CASTILLO
7a25750c-345b-4080-88af-dac0a0d26f1f	fedb4b05-e281-4956-9367-5a0530976e60	JORGE LUIS LAGUNA CHAVARRIA	\N	\N	\N	\N	8690 - 8422	f	\N	2026-08-07 03:00:41.712	2026-08-07 03:00:41.712	561 040781 0001W	\N	\N	00769	\N	\N	8690 - 8422	NYLSKA JOHANNY GARCIA CASTILLO
3fd8de09-7d35-440d-9e61-eb851f28a86e	fedb4b05-e281-4956-9367-5a0530976e60	BISMARK ANTONIO MARTINEZ GARCIA	\N	\N	ZONA 2. COLEGIO FE Y ALEGRIA SAN FRANCISCO JAVIER 2C ESTE 1C NORTE CASA N° G-27	\N	8285-1508	f	\N	2026-08-07 03:00:41.713	2026-08-07 03:00:41.713	002-060880-0005V	\N	\N	00770	\N	\N	8285-1508	AGNEL CASTILLO
94b36ad7-4339-48c7-a561-d17001b67e39	fedb4b05-e281-4956-9367-5a0530976e60	KLAUCO PLINIO GRADIZ ALVAREZ	\N	\N	WASPAN SUR DE DONDE FUE DANCING 21/2 C AL SUR 1 C AL OESTE	\N	8829-3318	f	\N	2026-08-07 03:00:41.713	2026-08-07 03:00:41.713	001-190779-0132T	\N	\N	00771	\N	\N	8829-3318	ARLES DAVID CENTENO
2234134e-e3ab-4063-b0c5-e9bf5457af49	fedb4b05-e281-4956-9367-5a0530976e60	JONY ANTONIO SALAZAR VELASQUEZ	\N	\N	\N	\N	8562-7588	f	\N	2026-08-07 03:00:41.714	2026-08-07 03:00:41.714	402-291298-1000M	CRÉDITO 30 DIAS	5000	00772	\N	\N	8562-7588	NYLSKA JOHANNY GARCIA CASTILLO
b4516a64-f56a-4bce-b586-d83f0cd79a9e	fedb4b05-e281-4956-9367-5a0530976e60	DAVID FRANCISCO VANEGAS MEDINA	\N	\N	\N	\N	8326-9114	f	\N	2026-08-07 03:00:41.714	2026-08-07 03:00:41.714	007-141290-0001S	\N	\N	00773	\N	\N	8326-9114	ARLES DAVID CENTENO
74dc0824-d12b-4e8d-92d9-752cd4206fc0	fedb4b05-e281-4956-9367-5a0530976e60	JERRY GEOVANNY LINARTE / FERROCON-SAN BENITO	\N	J031 301090 0036C	BO. SAN JUAN DETRAS DE LA IGLESIA CATOLICA  TIPITAPA/ MANAGUA	\N	7845-8133	f	\N	2026-08-07 03:00:41.715	2026-08-07 03:00:41.715	616-240395-0003W	\N	\N	00774	\N	\N	7845-8133	NYLSKA JOHANNY GARCIA CASTILLO
e62a1034-e97d-4ae9-8234-23f934de71bb	fedb4b05-e281-4956-9367-5a0530976e60	YESSEL CERPAS	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.715	2026-08-07 03:00:41.715	\N	CONTADO	\N	00775	\N	\N	\N	ARLES DAVID CENTENO
e67c605a-bca9-46a9-bf7b-bd09d453b40a	fedb4b05-e281-4956-9367-5a0530976e60	GRUPO SERVICIOS NICARAGUA	\N	J0310000384037	\N	\N	\N	f	\N	2026-08-07 03:00:41.716	2026-08-07 03:00:41.716	\N	CRÉDITO 30 DIAS	2000	00776	\N	\N	\N	ARLES DAVID CENTENO
b14d1e1c-32ea-4e7d-a5a9-de46bb434df1	fedb4b05-e281-4956-9367-5a0530976e60	MARIA ALARCAON	\N	\N	\N	\N	8837-5920	f	\N	2026-08-07 03:00:41.716	2026-08-07 03:00:41.716	\N	CRÉDITO 30 DIAS	26000	00777	\N	\N	8837-5920	ARLES DAVID CENTENO
a478fa6f-f9bb-4ed6-9b9b-a6086176b110	fedb4b05-e281-4956-9367-5a0530976e60	GASPRO NICARAGUA S,A	\N	J0310000284237	\N	\N	\N	f	\N	2026-08-07 03:00:41.717	2026-08-07 03:00:41.717	\N	CRÉDITO 30 DIAS	9000	00778	\N	\N	\N	ARLES DAVID CENTENO
358eb5c9-fc8e-465f-9e27-76e384f7a0a3	fedb4b05-e281-4956-9367-5a0530976e60	JOSE AGUSTIN HERNANDEZ SANCHEZ	\N	\N	BO. JULIO BUITRAGO MITRAB 4C. O. 2 C. S	\N	87843706	f	\N	2026-08-07 03:00:41.717	2026-08-07 03:00:41.717	001-270777-0044B	\N	\N	00779	\N	\N	87843706	AGNEL CASTILLO
7d3ad0c0-cf4e-4ee3-aa7f-1e94629c3287	fedb4b05-e281-4956-9367-5a0530976e60	JEFFERSON JOSE PARRALES VILLALTA	\N	\N	CMCA SANTO DOMINGO IGLESIA CATOLICA 1C E 1/2 C N. M/I	\N	8324-1950	f	\N	2026-08-07 03:00:41.718	2026-08-07 03:00:41.718	001-260793-0008X	\N	100000	00780	\N	\N	8324-1950	AGNEL CASTILLO
eb8c6a58-d700-4f1b-930c-728b048c47cf	fedb4b05-e281-4956-9367-5a0530976e60	ERVIN JOSE MARTINEZ ORTEGA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.719	2026-08-07 03:00:41.719	\N	\N	\N	00781	\N	\N	\N	AGNEL CASTILLO
f16102a4-8b41-4fe7-914e-acba45c13c9b	fedb4b05-e281-4956-9367-5a0530976e60	GABRIEL ABRAHAM ABSALON CHAVARRIA MENA	\N	\N	BO. JORGE DIMITROV DONDE FUE INSTITUTO SOIMON BOLIVAR 1C. E. 2C. S	\N	8888-8851	f	\N	2026-08-07 03:00:41.719	2026-08-07 03:00:41.719	001-051206-1054U	\N	100000	00782	\N	\N	8888-8851	AGNEL CASTILLO
9bc6390e-3c19-4182-bfc8-adf067bdec71	fedb4b05-e281-4956-9367-5a0530976e60	JUAN PABLO GUTIERREZ VASQUEZ	\N	\N	\N	\N	7615-9889	f	\N	2026-08-07 03:00:41.72	2026-08-07 03:00:41.72	001-040286-0011J	\N	100000	00783	\N	\N	7615-9889	NYLSKA JOHANNY GARCIA CASTILLO
4ae5c206-c9e4-4e98-8ef1-67d7106ca374	fedb4b05-e281-4956-9367-5a0530976e60	HELMAN JOSE LARIOS PERZ	\N	\N	BO. NANDAYOSI N°2 34 1/2 CARRETERA VIEJA LEON 4KM N.	\N	8197-1551	f	\N	2026-08-07 03:00:41.721	2026-08-07 03:00:41.721	004-051186-0003N	CRÉDITO 30 DIAS	100000	00784	\N	\N	8197-1551	NYLSKA JOHANNY GARCIA CASTILLO
df733446-8c6a-471b-99db-b599f515d5c8	fedb4b05-e281-4956-9367-5a0530976e60	JOSE FRANCISCO ASCENCION SOTO GOMEZ	\N	\N	RTO, SATELITE ASOSOSCA CASA N°2	\N	8495-0164	f	\N	2026-08-07 03:00:41.722	2026-08-07 03:00:41.722	281-230850-0000S	\N	100000	00785	\N	\N	8495-0164	ARLES DAVID CENTENO
42591cc1-c730-4219-8c1a-6acf8f3f59a7	fedb4b05-e281-4956-9367-5a0530976e60	SIASA/ ROBERTO NICOLAS TPIA MORALES	\N	\N	RPTO LOS CHILAMATES HOSPITAL SERMESA 2C S 25 VRAS E	\N	8380 9968	f	\N	2026-08-07 03:00:41.722	2026-08-07 03:00:41.722	401-161075-0005W	\N	100000	00787	\N	\N	8380 9968	NYLSKA JOHANNY GARCIA CASTILLO
375b2af1-9b9d-4794-bf67-06290418cac4	fedb4b05-e281-4956-9367-5a0530976e60	ARMANDO AVILIO HERNANDEZ VILLAVICENCIO	\N	\N	\N	\N	88262110	f	\N	2026-08-07 03:00:41.723	2026-08-07 03:00:41.723	\N	\N	\N	00788	\N	\N	88262110	AGNEL CASTILLO
90bc106c-0cbf-4d75-9fd0-1568f5d73080	fedb4b05-e281-4956-9367-5a0530976e60	WILBER LEE ARANDA LOPEZ	\N	\N	\N	\N	89932430	f	\N	2026-08-07 03:00:41.724	2026-08-07 03:00:41.724	001-151179-0020P	\N	\N	00789	\N	\N	89932430	AGNEL CASTILLO
227663dd-4566-42b0-a319-700ae7ccc8db	fedb4b05-e281-4956-9367-5a0530976e60	MARIO JOSÉ SANCHEZ GARCIA	\N	\N	COMARCA LA CURVA PULPERIA SAN ANTONIO 200VRS ESTE	\N	8995-2374	f	\N	2026-08-07 03:00:41.724	2026-08-07 03:00:41.724	406-010192-0001V	\N	5000	00790	\N	\N	8995-2374	ARLES DAVID CENTENO
db57e3ed-b7ac-4e78-a143-4730c9b79b00	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR FERMIN MENDOZA RODRIGUEZ	\N	\N	BARRIO 31 DE DICIEMBRE SEMAFOROS LA CAÑADA 21/2 C AL NORTE	\N	8558-3026	f	\N	2026-08-07 03:00:41.725	2026-08-07 03:00:41.725	081-030285-0013F	CRÉDITO 30 DIAS	5000	00791	\N	\N	8558-3026	ARLES DAVID CENTENO
c452c016-d953-4ad9-876a-10c39011a437	fedb4b05-e281-4956-9367-5a0530976e60	GUSTAVO ADOLFO ALDANA ALVAREZ	\N	\N	RECIDENCIAL LAS PALMERAS  CASA # E-22	\N	8219-3213	f	\N	2026-08-07 03:00:41.725	2026-08-07 03:00:41.725	001-240182-0006N	CRÉDITO 30 DIAS	5000	00792	\N	\N	8219-3213	ARLES DAVID CENTENO
01c3785e-87eb-4f0e-94f8-839e748035ad	fedb4b05-e281-4956-9367-5a0530976e60	WILMER ARNULFO ESPINOZA ACUÑA	\N	\N	BARRIO CAMILO CHAMORRO  DE DON DE FUE ROCARGO 5 C AL NORTE	\N	\N	f	\N	2026-08-07 03:00:41.726	2026-08-07 03:00:41.726	001-260882-0038W	CRÉDITO 8 DIAS	11000	00793	\N	\N	\N	AGNEL CASTILLO
c37f0fb7-b685-4f67-8262-ddfe4cd39a68	fedb4b05-e281-4956-9367-5a0530976e60	OSMAN ANTONIO DAVILA LOPEZ	\N	\N	\N	\N	8454 7459	f	\N	2026-08-07 03:00:41.726	2026-08-07 03:00:41.726	\N	\N	\N	00794	\N	\N	8454 7459	AGNEL CASTILLO
30c307ef-6e22-4ab0-9773-a83566ad3e47	fedb4b05-e281-4956-9367-5a0530976e60	MAYNOR YAMIL GONZALES DOÑA	\N	\N	BARRIO ARIEL DARCE DONDE FUE DUYA MAGICA 11/2 C AL ESTE	\N	8195-9294	f	\N	2026-08-07 03:00:41.727	2026-08-07 03:00:41.727	001-240701-1043T	CRÉDITO 30 DIAS	5000	00795	\N	\N	8195-9294	AGNEL CASTILLO
e1f00bca-56ea-4d90-a1d5-4488c6299116	fedb4b05-e281-4956-9367-5a0530976e60	FRANCISCO ALBERTO ALONSO ACEVEDO	\N	\N	BO. JOSÉ BENITO ESCOBAR 3RA CALLE CASA N°164	\N	78258500	f	\N	2026-08-07 03:00:41.727	2026-08-07 03:00:41.727	281-041279-0006B	CRÉDITO 30 DIAS	5000	00796	\N	\N	78258500	ARLES DAVID CENTENO
26299be2-805c-4fbe-8f5b-090f080d958d	fedb4b05-e281-4956-9367-5a0530976e60	JUSTO PASTOR MENDOZA SALAZAR	\N	\N	BO. LA TONGA INTA 3C SUR 1/2 CUADRA OESTE	\N	8729-0888	f	\N	2026-08-07 03:00:41.728	2026-08-07 03:00:41.728	121-010882-0003R	\N	20000	00797	\N	\N	8729-0888	ARLES DAVID CENTENO
e337ef05-8d1c-44ad-a2c9-b75b973832c5	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS EDUARDO CRUZ MAIRENA	\N	\N	\N	\N	88544695	f	\N	2026-08-07 03:00:41.728	2026-08-07 03:00:41.728	\N	\N	\N	00798	\N	\N	88544695	AGNEL CASTILLO
d13d2695-ed07-4ee5-82fc-9099fcd773bf	fedb4b05-e281-4956-9367-5a0530976e60	PATRICIA ZELEDON/ IGLESIA EL ALFARERO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.729	2026-08-07 03:00:41.729	\N	\N	100000	00799	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
24a9615f-e1f5-419f-a453-45a47418d975	fedb4b05-e281-4956-9367-5a0530976e60	MARIO MORENO RODRIGUEZ	\N	\N	BARRIO HEALEAH 2DA ESTAPA IGLESIA CATOLICA 3 C AL OESTE 1 C AL SUR 20 VRS AL OESTE	\N	8396-3443	f	\N	2026-08-07 03:00:41.73	2026-08-07 03:00:41.73	161-100471-0001N	CRÉDITO 30 DIAS	36000	00800	\N	\N	8396-3443	ARLES DAVID CENTENO
5564ba00-dc34-418c-8cba-00ee909a7c84	fedb4b05-e281-4956-9367-5a0530976e60	RAFAEL MURILLO/BM CONSTRUCCIONES	\N	\N	\N	\N	8556-1958	f	\N	2026-08-07 03:00:41.73	2026-08-07 03:00:41.73	\N	CRÉDITO 30 DIAS	30000	00801	\N	\N	8556-1958	ARLES DAVID CENTENO
cd26cbbf-8c8d-4025-b189-31feb7730f3f	fedb4b05-e281-4956-9367-5a0530976e60	JOSUE ABRAHAM MATUS DIAZ	\N	\N	RESID. CIUDAD JARDIN BANCENTRO 25VRS S. CASA N° K-8	\N	8953-3058	f	\N	2026-08-07 03:00:41.731	2026-08-07 03:00:41.731	001-160791-0008M	CRÉDITO 15 DIAS	100000	00802	\N	\N	8953-3058	YESSEL ANAHY CERPAS ARTOLA
bdcd898c-ec61-49fe-b4bf-3fc3d19fc23f	fedb4b05-e281-4956-9367-5a0530976e60	SERVICIOS PROFESIONALES TORREZ	\N	\N	ESQUIPULA DE LAS CUATRO ESQUINAS 500 MTS OESTE	\N	82738601	f	\N	2026-08-07 03:00:41.731	2026-08-07 03:00:41.731	0010603800069Q	\N	100000	00803	\N	\N	82738601	ARLES DAVID CENTENO
7a3fa8f0-00be-476f-a05b-7d4d0eb4af7b	fedb4b05-e281-4956-9367-5a0530976e60	CONSORCIO MANAGUA MECO LLANSA	\N	\N	SEMAFOROS ENEL CENTRAL 2 C ABAJO DONDE FUE DURMAN	\N	8823/1055	f	\N	2026-08-07 03:00:41.732	2026-08-07 03:00:41.732	J0310000474729	CRÉDITO 30 DIAS	332000	00804	\N	\N	8823/1055	ARLES DAVID CENTENO
805112cc-3fb2-42e0-9e89-d50e65109dc1	fedb4b05-e281-4956-9367-5a0530976e60	FREDDY JOSÉ REYES MORALES	\N	\N	CMCA. LAS JAGUITAS ENTRADA PRINCIPAL 1/2C SUR. 2C ESTE	\N	8275-6267	f	\N	2026-08-07 03:00:41.732	2026-08-07 03:00:41.732	001-130883-0075D	\N	100000	00805	\N	\N	8275-6267	YAHOSKA D'TRINIDAD
7354b702-d229-4a0c-9932-d002eff22143	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO JOSE CASTELLON PEREZ	\N	\N	BO. OSCAR TURCIOS DE DONDE FUE CINE SALINAS 2C O 5C S 1C O	\N	88168742	f	\N	2026-08-07 03:00:41.733	2026-08-07 03:00:41.733	001-140484-0054B	\N	\N	00806	\N	\N	88168742	AGNEL CASTILLO
3ce1236f-9ca6-4513-ac46-c2eb0599a087	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR DAVID MEJIA SOZA	\N	\N	TICUANTEPE REPARTO JUAN RAMON PADILLA 7MA CALLE ESCUELA SAN JOSE 1/2 AL OESTE 25 VRS AL NORTE	\N	7782-2330	f	\N	2026-08-07 03:00:41.733	2026-08-07 03:00:41.733	001-060693-0001Q	CRÉDITO 4 DÍAS	1600	00807	\N	\N	7782-2330	ARLES DAVID CENTENO
41fa5b29-78a7-423b-992a-cb66e764928e	fedb4b05-e281-4956-9367-5a0530976e60	JULIO CESAR RIVAS MERCADO	\N	\N	COL. CENTROAMERICA GASOLINERA UNO 75 VRS SUR	\N	7772-7369	f	\N	2026-08-07 03:00:41.734	2026-08-07 03:00:41.734	001-211182-0032Y	\N	100000	00808	\N	\N	7772-7369	ARLES DAVID CENTENO
f3833818-cc44-4629-918c-70c4811afb89	fedb4b05-e281-4956-9367-5a0530976e60	MISSAEL ANTONIO GALAN HERNANDEZ	\N	\N	CMCA BUENA VISTA KM 21 CARRETERA MASAYA MANAGUA 2 KM N.	\N	7838-9426	f	\N	2026-08-07 03:00:41.735	2026-08-07 03:00:41.735	401-100900-1007Y	\N	100000	00809	\N	\N	7838-9426	NYLSKA JOHANNY GARCIA CASTILLO
df655db2-50e0-4e50-b549-59c5ea2fcc2b	fedb4b05-e281-4956-9367-5a0530976e60	JORGE ELEAN VIVAS HERNANDEZ	\N	\N	COMARCA VERACRUZ COSTADO ESTE COLEGIO CRISTIANO OLIVO 2000MTRS AL NORTE	\N	8727-6529	f	\N	2026-08-07 03:00:41.735	2026-08-07 03:00:41.735	001-220398-1003S	CRÉDITO 8 DIAS	4000	00810	\N	\N	8727-6529	ARLES DAVID CENTENO
0827a61b-ce5f-44ef-a478-905b88035788	fedb4b05-e281-4956-9367-5a0530976e60	EDUARDO STALIN AMAYA LARIOS	\N	\N	URB, PREADERAS DE SANDINO I ETAPA CASA N°X-1	\N	8849-0950	f	\N	2026-08-07 03:00:41.736	2026-08-07 03:00:41.736	001-200575-0026P	\N	100000	00811	\N	\N	8849-0950	ARLES DAVID CENTENO
f17d4256-dc96-44a3-a896-3bc6b328e4ea	fedb4b05-e281-4956-9367-5a0530976e60	ARQ. ARTURO LANUZA/ BM CONSTRUCCIONES	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.736	2026-08-07 03:00:41.736	\N	\N	100000	00812	\N	\N	\N	NYLSKA JOHANNY GARCIA CASTILLO
f6184de5-241a-4915-8257-4bb7e53e29c1	fedb4b05-e281-4956-9367-5a0530976e60	ESTEBAN ANTONIO PEREZ ORDOÑEZ	\N	\N	BO. EL CALVARIO IGLESIA 3CN 20 VRS O.	\N	\N	f	\N	2026-08-07 03:00:41.737	2026-08-07 03:00:41.737	081 051084- 0013S	\N	100000	00813	\N	\N	\N	ARLES DAVID CENTENO
7a219c5b-c3af-45b4-9544-5b29927afd47	fedb4b05-e281-4956-9367-5a0530976e60	SERGIO DAVID SILVA QUINTERO	\N	\N	BO. MEMORIAL SANDINO SOMBRERO 4C. E. 1/2C SUR. 1C. E. M/D	\N	8766-1884	f	\N	2026-08-07 03:00:41.737	2026-08-07 03:00:41.737	001-100299-1000B	\N	100000	00814	\N	\N	8766-1884	ARLES DAVID CENTENO
b0fe02ba-9708-4e9a-aad7-e6d2949508f5	fedb4b05-e281-4956-9367-5a0530976e60	ANIELKA LORENA CORRALES RUGAMA	\N	\N	CMCA SABANAGRANDE CUADRO DE BEISBOL 1/2 C N.	\N	8638 9580	f	\N	2026-08-07 03:00:41.738	2026-08-07 03:00:41.738	001-180693-0005V	\N	100000	00815	\N	\N	8638 9580	ARLES DAVID CENTENO
e35d1caa-d8af-45e3-a0d1-a41d5486cad7	fedb4b05-e281-4956-9367-5a0530976e60	JONATHAN JOSUE DELGADILLO MENDEZ	\N	\N	BARRIO GEORGINO ANDRADE	\N	7663-2663	f	\N	2026-08-07 03:00:41.738	2026-08-07 03:00:41.738	001-060799-1032K	CRÉDITO 15 DIAS	5000	00816	\N	\N	7663-2663	ARLES DAVID CENTENO
b25b96a2-73d5-44c2-b9d8-e57a758fb491	fedb4b05-e281-4956-9367-5a0530976e60	MAYCOL GIOVANY RIOS MENDOZA	\N	\N	RESD.  EL CORTIJO DE LA SIERRAS KM 13 CARRETERA MASAYA CA N°B-26	\N	8717-8500	f	\N	2026-08-07 03:00:41.739	2026-08-07 03:00:41.739	362-070284-0001T	\N	100000	00817	\N	\N	8717-8500	NYLSKA JOHANNY GARCIA CASTILLO
e7fff30c-9622-4f9d-a87a-7ddf1ef705e7	fedb4b05-e281-4956-9367-5a0530976e60	MOISES FRANCISCO MAYORGA RAYO	\N	\N	BO° ENRIQUE LORENTE TERMINAL RUTA 108-109 1/2C. SUR	\N	8331-0280	f	\N	2026-08-07 03:00:41.74	2026-08-07 03:00:41.74	001-111294-0014Y	\N	100000	00818	\N	\N	8331-0280	ARLES DAVID CENTENO
ac07817c-3fb7-47e4-acb4-978e0ffd0a7d	fedb4b05-e281-4956-9367-5a0530976e60	GEORGE FRECH	\N	\N	RESD. LAS COLINAS EMBAJADA DE ESPAÑA 1/2 C. E. CASA N°A-210	\N	77338414	f	\N	2026-08-07 03:00:41.74	2026-08-07 03:00:41.74	001-011062-0078H	\N	\N	00819	\N	\N	77338414	ARLES DAVID CENTENO
7cb0f049-2dab-439b-bf1b-ab7d3125e162	fedb4b05-e281-4956-9367-5a0530976e60	INMAXSA	\N	\N	KM.10 CARRETERA MASAYA, GASOLINERA UNO 300 MTS AL SUROESTE	\N	8337-8502	f	\N	2026-08-07 03:00:41.741	2026-08-07 03:00:41.741	J0310000143633	\N	100000	00820	\N	\N	8337-8502	ARLES DAVID CENTENO
de37b90f-6699-49ef-b8a7-7026e93fc429	fedb4b05-e281-4956-9367-5a0530976e60	JAIME EFRAIN BLAS RUIZ	\N	\N	COM SAN JOSE DE LOS RIOS ESCUELA SAN JOSE 150 VRS S./ TICUANTEPE	\N	7746-3627	f	\N	2026-08-07 03:00:41.742	2026-08-07 03:00:41.742	007-111082-0001R	\N	100000	00822	\N	\N	7746-3627	NYLSKA JOHANNY GARCIA CASTILLO
5d736338-d8b8-439b-9139-97e00c1007a4	fedb4b05-e281-4956-9367-5a0530976e60	NIESKA JAVIERA MORALES ENRIQUEZ	\N	\N	\N	\N	8671-5416	f	\N	2026-08-07 03:00:41.743	2026-08-07 03:00:41.743	001-030796-0024Y	\N	100000	00823	\N	\N	8671-5416	NYLSKA JOHANNY GARCIA CASTILLO
ed3c777c-0ff0-463a-b44f-d82ba33a074d	fedb4b05-e281-4956-9367-5a0530976e60	GRUPO CONTI S.A	\N	\N	SEMAFOROS DEL CLUB TERRAZA 1 1/2 C ARRIBA	\N	8647-1674	f	\N	2026-08-07 03:00:41.743	2026-08-07 03:00:41.743	J0310000142491	\N	100000	00824	\N	\N	8647-1674	ARLES DAVID CENTENO
3b248e8f-4fb7-4e60-88c5-b31289625b11	fedb4b05-e281-4956-9367-5a0530976e60	ERVYN DE JESUS SANDOVAL URIZA	\N	\N	RESD. LAS BRISAS DE DONDE FUE RESTAURANTE CAPORAL 2C N CA N°P-98 M/I	\N	8915-5498	f	\N	2026-08-07 03:00:41.744	2026-08-07 03:00:41.744	001-041262-0044Q	\N	100000	00825	\N	\N	8915-5498	NYLSKA JOHANNY GARCIA CASTILLO
e28986d4-7845-4d2a-bbb3-ec2c7179ea42	fedb4b05-e281-4956-9367-5a0530976e60	CEPRO	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.745	2026-08-07 03:00:41.745	\N	\N	100000	00826	\N	\N	\N	BISMARK MURILLO
6e62cf22-d754-4640-ba0d-c50caa45fc43	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO JOAQUIN GAITAN RIVAS	\N	\N	BO. RENE POLANCO DE DONDE FUE CSA DE LA MUJER 6C N 1 1/2 C E. CASA N°N-25	\N	8621-4293	f	\N	2026-08-07 03:00:41.746	2026-08-07 03:00:41.746	202-301167-0000L	\N	100000	00827	\N	\N	8621-4293	NYLSKA JOHANNY GARCIA CASTILLO
a98d5ee9-b451-4462-a95b-01d659e32c6e	fedb4b05-e281-4956-9367-5a0530976e60	WALTER ANTONIO OBANDO PALACIOS	\N	\N	RECIDENCIAL MICHELANGELO AGUJA 2 C AL ESTE 1 C AL SUR 1 C AL ESTE 1/2 C AL NORTE CASA # 16	\N	8465-1333	f	\N	2026-08-07 03:00:41.747	2026-08-07 03:00:41.747	001-290377-0045F	CONTADO	\N	00828	\N	\N	8465-1333	ARLES DAVID CENTENO
7f047f28-cdad-47ac-8ef8-fcb455599577	fedb4b05-e281-4956-9367-5a0530976e60	YOLANDA EUGENIA SEVILLA LUCO	\N	\N	KM 39.5 CARRETERA CATARINA	\N	8883-3286	f	\N	2026-08-07 03:00:41.747	2026-08-07 03:00:41.747	001-151151-0012H	CONTADO	\N	00829	8244-3653	\N	8883-3286	ARLES DAVID CENTENO
f4dd975a-59a2-4489-a453-a1570a448799	fedb4b05-e281-4956-9367-5a0530976e60	MICHELE AUXILIADORA ORTEGA SANDIGO	\N	\N	REPARTO EL MIRADOR KM 8.5 CARRETERA MASAYA CASA # 79	\N	8997-2580	f	\N	2026-08-07 03:00:41.748	2026-08-07 03:00:41.748	001-050383-0025Y	CONTADO	\N	00830	\N	\N	8997-2580	ARLES DAVID CENTENO
b31f49b3-79ce-45cd-a268-d293aa142fbc	fedb4b05-e281-4956-9367-5a0530976e60	SEPSA / ELVIS VALLE	\N	J0310000146055	SEMAFOROS DE LA SUBASTA 1 C AL SUR 1 C AL ESTE	contabilidad@sepsa.com.ni	7886-5681	f	\N	2026-08-07 03:00:41.749	2026-08-07 03:00:41.749	J0310000146055	CONTADO	\N	00831	\N	2233-1012	7886-5681	ARLES DAVID CENTENO
6cd8a1f6-c7ab-47ae-8c36-0254c209cd65	fedb4b05-e281-4956-9367-5a0530976e60	EDUARDO GURDIAN GOMEZ	\N	\N	RECIDENCIAL CASA BLANCA KM 14 CARRETERA MASAYA 4 KM HACIA VERACRUZ CASA # H-13	\N	8760-6460	f	\N	2026-08-07 03:00:41.75	2026-08-07 03:00:41.75	001-130679-0040Y	CRÉDITO 30 DIAS	\N	00832	\N	\N	8760-6460	ARLES DAVID CENTENO
f3a28906-5d46-4a3d-b928-56c1ddc6f43d	fedb4b05-e281-4956-9367-5a0530976e60	CONCRETERA TOTAL S,A	\N	J0310000000247	KM 11.9 CARRETERA MASAYA	concreto@concreteratotal.com	2279-8710	f	\N	2026-08-07 03:00:41.751	2026-08-07 03:00:41.751	\N	CRÉDITO 15 DIAS	36700	00833	\N	\N	2279-8710	ARLES DAVID CENTENO
9c7a9e54-dad0-4e0a-8557-404f15679afc	fedb4b05-e281-4956-9367-5a0530976e60	EDWIN ALBERTO REYES MEJIA	\N	\N	\N	\N	81743026	f	\N	2026-08-07 03:00:41.752	2026-08-07 03:00:41.752	291-061278-0001E	\N	\N	00834	\N	\N	81743026	AGNEL CASTILLO
cf1c1699-3eaf-4bce-9d99-e816e471e6c7	fedb4b05-e281-4956-9367-5a0530976e60	NORMAN GABRIEL LÓPEZ AGUILAR	\N	\N	BO° MARTIN CASTELLON INDUSTRIA AVICOLA LA BARRANCADA 200MTS N	\N	8625-9281	f	\N	2026-08-07 03:00:41.754	2026-08-07 03:00:41.754	401-160991-0002A	\N	15000	00835	8762-7022	\N	8625-9281	AGNEL CASTILLO
61dd5ed2-c6df-4331-85f0-839cd62f794a	fedb4b05-e281-4956-9367-5a0530976e60	RENTABLES S,A	\N	J0310000332550	ROTONDA EL PERIODISTA 300 MTRS AL SUR FRENTE A SINTER	abministracion@rentablesnicaragua.com	7872-4097	f	\N	2026-08-07 03:00:41.755	2026-08-07 03:00:41.755	\N	CRÉDITO 30 DIAS	20000	00836	7652-1473	\N	7872-4097	ARLES DAVID CENTENO
1768ae08-7f01-4601-9fdd-649cf87fbd36	fedb4b05-e281-4956-9367-5a0530976e60	JUAN CARLOS NAVARRETE RIVERA	\N	\N	\N	\N	8697-9253	f	\N	2026-08-07 03:00:41.755	2026-08-07 03:00:41.755	001-300681-0051M	CONTADO	\N	00837	\N	\N	8697-9253	BISMARK MURILLO
3cbf761d-b6f0-418d-a066-94ffb8be9807	fedb4b05-e281-4956-9367-5a0530976e60	MANUEL JAVIER HUEMBES RODRIGUEZ	\N	\N	REPARTO EL AGUCATE CENTRO DE SALUD 600VRS SUR	\N	8388-0419	f	\N	2026-08-07 03:00:41.756	2026-08-07 03:00:41.756	001-160173-0018G	\N	50000	00838	\N	\N	8388-0419	ARLES DAVID CENTENO
1f00a68b-7022-4158-9e89-971620b037df	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO BENJAMIN GARCIA DIAZ	\N	\N	VILLA MIGUEL GUTIERREZ CASA COMUNAL20 VRS AL ESTE CASA # 422	\N	8384-3050	f	\N	2026-08-07 03:00:41.757	2026-08-07 03:00:41.757	888-240290-0001V	CONTADO	\N	00839	\N	\N	8384-3050	ARLES DAVID CENTENO
b5fc158f-b584-49ae-899f-0f9c98e80969	fedb4b05-e281-4956-9367-5a0530976e60	NILSON ABRHAM MARTINEZ RUGAMA	\N	\N	BO. SAN LUIS KM 10 1/2 CARRETERA VIEJA LEON 700 VRS S.	\N	8927-0656	f	\N	2026-08-07 03:00:41.757	2026-08-07 03:00:41.757	001-290881-0017L	\N	100000	00840	\N	\N	8927-0656	NYLSKA JOHANNY GARCIA CASTILLO
8718815f-dcbc-4ee8-b974-fcd794a3f819	fedb4b05-e281-4956-9367-5a0530976e60	TLACOCOTL	\N	\N	CIUDAD JARDIN DE DONDE FUE LA ITR 2C ARRIBA 75 A LAGO CASA N° P10	\N	8865-8888	f	\N	2026-08-07 03:00:41.758	2026-08-07 03:00:41.758	J0310000248516	\N	20000	00841	\N	\N	8865-8888	ARLES DAVID CENTENO
2cac1561-c0c0-4847-9661-5c353e81288a	fedb4b05-e281-4956-9367-5a0530976e60	DANIEL ERNESTO ORTEZ	\N	\N	VILLA SAN JACINTO IGLESIA CATOLICA 1 ANDEN AL NORTE 1/2 C AL OESTE CASA # C-1-162	\N	7644-3087	f	\N	2026-08-07 03:00:41.758	2026-08-07 03:00:41.758	001-170582-0027V	CONTADO	\N	00842	\N	\N	7644-3087	ARLES DAVID CENTENO
94bd742f-1b76-4f3b-b418-480db587daa6	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN JAVIER POLANCO MARTINEZ	\N	\N	CMCA PALO DE LECHE KM 25 CARRETERA SAN MARCOS/ ICUANTEPE	\N	8622-7905	f	\N	2026-08-07 03:00:41.759	2026-08-07 03:00:41.759	007-161081-0004L	\N	100000	00843	8756-3578	\N	8622-7905	NYLSKA JOHANNY GARCIA CASTILLO
13ecdc2f-568a-403a-93a4-d53885aeb82d	fedb4b05-e281-4956-9367-5a0530976e60	MILTON AGUSTIN GARCIA CALDERON	\N	\N	RESD. SAN ANDRES ROTONDA INTERNA 1CO 1C S 85MTS O CA. N°FC-17	\N	88940456	f	\N	2026-08-07 03:00:41.759	2026-08-07 03:00:41.759	001-040285	\N	\N	00844	\N	\N	88940456	AGNEL CASTILLO
25ac2e37-2511-47d0-814a-53e2250d55e5	fedb4b05-e281-4956-9367-5a0530976e60	ENGEL ALBERTO MORALES DELGADO	\N	\N	BO. MARTIN LUTHER KING CASA COMUNAL 2C. S 2C E. M/D	\N	8331 5542	f	\N	2026-08-07 03:00:41.76	2026-08-07 03:00:41.76	001 290199 1035Y	\N	100000	00845	\N	\N	8331 5542	NYLSKA JOHANNY GARCIA CASTILLO
39e9dda5-1b1a-43ec-a7fe-e2942304015e	fedb4b05-e281-4956-9367-5a0530976e60	RONALD SANTIAGO BELLO PICADO	\N	\N	BO° LA URSS ROTONDA RUBENIA 1C. OESTE 1C NORTE	\N	8879-9644	f	\N	2026-08-07 03:00:41.76	2026-08-07 03:00:41.76	362-230773-0000U	\N	50000	00846	\N	\N	8879-9644	ARLES DAVID CENTENO
0a548413-b9b9-4aca-b847-d764b32c5034	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO BRICEÑO AVILEZ	\N	\N	BARRIO DINAMARCA DONDE FUE EMBAJADA USA 25 VRS AL OESTE	\N	8244-9340	f	\N	2026-08-07 03:00:41.761	2026-08-07 03:00:41.761	001-010386-0008F	CONTADO	\N	00847	\N	\N	8244-9340	ARLES DAVID CENTENO
a443dc48-d990-4b7d-8bad-c9cd65eb935a	fedb4b05-e281-4956-9367-5a0530976e60	COINGELSA	\N	J0310000299595	LEON - ENTRADA VILLA 23 DE JULIO	consulta@coingelsa.es	7763-1225	f	\N	2026-08-07 03:00:41.762	2026-08-07 03:00:41.762	\N	CONTADO	\N	00848	8584-3966	\N	7763-1225	ARLES DAVID CENTENO
9832ee64-9252-49d8-83a1-d89dd2aaec98	fedb4b05-e281-4956-9367-5a0530976e60	MAURICIO ARIEL GARCIA	\N	\N	COM. EL CEDRO ESCUELA ESTRELLA DE BELEN 1KM E.	\N	7636-6187	f	\N	2026-08-07 03:00:41.763	2026-08-07 03:00:41.763	246-290990-0002N	\N	15000	00849	\N	\N	7636-6187	YAHOSKA D'TRINIDAD
05679678-8c6b-4d01-a8bf-7e5f3fb68ece	fedb4b05-e281-4956-9367-5a0530976e60	MARTIN EDUARDO GUERRERO BLNCO	\N	\N	\N	\N	88562320	f	\N	2026-08-07 03:00:41.763	2026-08-07 03:00:41.763	\N	\N	\N	00850	\N	\N	88562320	AGNEL CASTILLO
d733cdfe-3fc8-4dd4-a9fc-a749d6eba6e3	fedb4b05-e281-4956-9367-5a0530976e60	YADER JULIAN RODRIGUEZ RUGAMA	\N	\N	BO. ALTAGRACIA ESTATUA MONTOYA 4C S. M/D	\N	8284-4838	f	\N	2026-08-07 03:00:41.764	2026-08-07 03:00:41.764	001-180283-0020Q	\N	100000	00851	\N	\N	8284-4838	NYLSKA JOHANNY GARCIA CASTILLO
41ae77e7-7a05-4d44-b11c-6b03b53cbd4e	fedb4b05-e281-4956-9367-5a0530976e60	LUIS ANTONIO CHAVARRIA MARTINEZ	\N	\N	MANAGUA	\N	\N	f	\N	2026-08-07 03:00:41.765	2026-08-07 03:00:41.765	001-210750-0014C	CRÉDITO 30 DIAS	5000	00852	\N	\N	\N	BISMARK MURILLO
5293facb-dc08-49b4-80f3-0d609626d914	fedb4b05-e281-4956-9367-5a0530976e60	SERVIMAX S.A	\N	\N	CARRETERA MASAYA KM 19	\N	\N	f	\N	2026-08-07 03:00:41.765	2026-08-07 03:00:41.765	J0310000142360	\N	15000	00853	\N	\N	\N	ARLES DAVID CENTENO
61bdb75e-4521-4e0c-8577-0a3703db9fde	fedb4b05-e281-4956-9367-5a0530976e60	JHOAN CARRILLO CARRILLO	\N	\N	BARRIO 22 DE ENERO AUTOCINEMA GANDO 1 C AL ESTE	\N	8496-2170	f	\N	2026-08-07 03:00:41.766	2026-08-07 03:00:41.766	570-161202-1000C	CONTADO	\N	00854	\N	\N	8496-2170	ARLES DAVID CENTENO
4b5f3e70-0ded-457c-b17c-b2bb39e48639	fedb4b05-e281-4956-9367-5a0530976e60	DENIS ENRIQUE LAINEZ FLORES	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.767	2026-08-07 03:00:41.767	001-010178-0086L	\N	\N	00855	\N	\N	\N	AGNEL CASTILLO
5a92e831-551a-4c28-8179-691e078017fb	fedb4b05-e281-4956-9367-5a0530976e60	MARIO RODRIGUEZ REYES	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.767	2026-08-07 03:00:41.767	443-080966-0001X	\N	\N	00856	\N	\N	\N	AGNEL CASTILLO
c0e8f243-b8d0-4916-9a9d-bc599c3cd25e	fedb4b05-e281-4956-9367-5a0530976e60	JERALD DE LOS ANGELES CALERO CALDERON	\N	\N	VILLA RECONCILIACION BLOQUERA HOWARD 2 C AL SUR 1/2 C AL ESTE	\N	7699-2643	f	\N	2026-08-07 03:00:41.768	2026-08-07 03:00:41.768	001-170389-0011C	CONTADO	\N	00857	\N	\N	7699-2643	ARLES DAVID CENTENO
db079d78-2bc5-4049-b573-8a1b28ed8e52	fedb4b05-e281-4956-9367-5a0530976e60	ALEXANDER ANTONIO VASQUEZ	\N	\N	CMCA EL COCAL ESCUELA TENDERI 1KM. N.	\N	77567980	f	\N	2026-08-07 03:00:41.768	2026-08-07 03:00:41.768	402-030591-0000L	\N	\N	00858	\N	\N	77567980	ARLES DAVID CENTENO
a3665833-8860-4f9b-baa1-9a4e2c656e18	fedb4b05-e281-4956-9367-5a0530976e60	FACHADAS MODERNAS /EWDIN ANTONIO SARAVIA MARTINEZ	\N	\N	BARRIO PABLO UBEDA TANQUE 14 DE SEPTIEMBRE 6 C AL SUR 1 C AL OESTE 20 VRS AL NORTE CASA # B/3	\N	\N	f	\N	2026-08-07 03:00:41.769	2026-08-07 03:00:41.769	001-080681-0055T	CONTADO	\N	00859	\N	\N	\N	ARLES DAVID CENTENO
2b606ad6-d0d0-48c4-9105-17f2a76c2bd4	fedb4b05-e281-4956-9367-5a0530976e60	CONSTRUAYRE S.A	\N	\N	PASO A DESNIVEL PORTEZUELO, 1 1/2C AL SUR	\N	87998365	f	\N	2026-08-07 03:00:41.769	2026-08-07 03:00:41.769	JO310000456828	\N	\N	00860	\N	\N	87998365	AGNEL CASTILLO
b73df195-ea8d-4d1d-9236-e50cc34a63c1	fedb4b05-e281-4956-9367-5a0530976e60	HAMILTON GIOVANY MEDINA LOPEZ	\N	0031208810005V	TIPITAPA  BARRIO CRISTO REY PARA LOS COCOS 8 C AL NORTE 2 C AL ESTE	adiselservicio@gmail.com	8886-1847	f	\N	2026-08-07 03:00:41.77	2026-08-07 03:00:41.77	001-130403-1031B	\N	\N	00861	\N	\N	8886-1847	ARLES DAVID CENTENO
1576ff98-6151-4ccb-8c0c-9e6049ff55ea	fedb4b05-e281-4956-9367-5a0530976e60	COMERCIAL FRANKLIN LOPEZ/FRANCISCO JAVAIER NAVARRO	\N	J0310000068917	BARRIO 22 DE ANERO IGLESIA CATALICA 20 VRS AL ESTE	\N	8497-3115	f	\N	2026-08-07 03:00:41.771	2026-08-07 03:00:41.771	569-300974-00000S	CONTADO	\N	00862	\N	\N	8497-3115	ARLES DAVID CENTENO
fd5b117c-8274-4c3f-8fbd-a8b686bca5b2	fedb4b05-e281-4956-9367-5a0530976e60	WILLIAM ALONSO SÁNCHEZ	\N	\N	BO° ENRIQUE LORENTE DE DONDE FUE EL CINE IDEAL 3C OESTE. CASA N° A-25	\N	8498-0059	f	\N	2026-08-07 03:00:41.771	2026-08-07 03:00:41.771	001-040785-0022J	\N	15000	00863	\N	\N	8498-0059	ARLES DAVID CENTENO
8dc88adf-5f1a-41ae-ad4e-d68aab3815fc	fedb4b05-e281-4956-9367-5a0530976e60	WALTER JOSE GONZALES RIVERA	\N	\N	REPARTO SAN JUAN IGLESIA SANTA MARTHA 25 VRS AL ESTE CASA # K-43	\N	8384-0879	f	\N	2026-08-07 03:00:41.772	2026-08-07 03:00:41.772	001-181089-0031W	\N	\N	00864	\N	\N	8384-0879	ARLES DAVID CENTENO
aee6f134-fb4b-4dbb-890f-86a4f537bcc0	fedb4b05-e281-4956-9367-5a0530976e60	DAVID JOSE GONZALES PEREZ	\N	\N	VILLA VENEZUELA ANDEN 5 GRUPO G CASA # 3795	\N	8634-7740	f	\N	2026-08-07 03:00:41.773	2026-08-07 03:00:41.773	001-280575-0013S	CONTADO	\N	00865	\N	\N	8634-7740	ARLES DAVID CENTENO
ced3a38e-db9f-4398-97d3-8f6ee634c9af	fedb4b05-e281-4956-9367-5a0530976e60	SOAGRO/ HASSEL ARGENTINA ESPINAL LUNA	\N	J0310000082227	RPTO EDDY RUIZ BILLARES 2 C S. 1/2 C E	\N	8786 - 6789	f	\N	2026-08-07 03:00:41.774	2026-08-07 03:00:41.774	201-310789-0001B	\N	100000	00866	\N	\N	8786 - 6789	NYLSKA JOHANNY GARCIA CASTILLO
1f1c43e9-59d1-42d5-9052-f2b6b22a88f9	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN RENE GONZALES CASTRO	\N	\N	\N	\N	81598439	f	\N	2026-08-07 03:00:41.774	2026-08-07 03:00:41.774	001-090602-1005H	\N	\N	00867	\N	\N	81598439	AGNEL CASTILLO
5e65b8b9-d8b9-4321-9e8f-5150cf93b2fc	fedb4b05-e281-4956-9367-5a0530976e60	URIEL ANTONIO ROBLETO CASTELLON	\N	\N	BO. JONATHAN GONZALEZ ENITEL 75 VRS S.	\N	5797-3487	f	\N	2026-08-07 03:00:41.775	2026-08-07 03:00:41.775	001-270787-0052F	CRÉDITO 30 DIAS	100000	00868	\N	\N	5797-3487	NYLSKA JOHANNY GARCIA CASTILLO
3d6a20b3-f169-4149-8e25-38a8a5ec0178	fedb4b05-e281-4956-9367-5a0530976e60	ERVIN ANTONIO MORALES OROZCO	\N	\N	\N	\N	7824 9346	f	\N	2026-08-07 03:00:41.775	2026-08-07 03:00:41.775	001-310882-0054A	CONTADO	\N	00869	\N	\N	7824 9346	AGNEL CASTILLO
abb3311d-bfc8-4b8a-8a14-9770709f5a55	fedb4b05-e281-4956-9367-5a0530976e60	TONNY MANUEL DIAZ ABURTO	\N	\N	COMARCA LA HOYADA IGLESIA STO DOMINGO 2 KM AL SUR	\N	8445-0640	f	\N	2026-08-07 03:00:41.776	2026-08-07 03:00:41.776	001-281097-0026U	CONTADO	\N	00870	\N	\N	8445-0640	ARLES DAVID CENTENO
967aff0e-9f20-4fbf-b77b-dc5c739a0cb5	fedb4b05-e281-4956-9367-5a0530976e60	JUAN FRANCISCO SALGADO	\N	\N	BO° AUGUSTO CESAR SANDINO ENTRADA LAS COLINAS 6C SUR 3C OESTE. 1/2C NORTE. CASA N° I-8	\N	8452-7403	f	\N	2026-08-07 03:00:41.776	2026-08-07 03:00:41.776	361-160580-0007T	CRÉDITO 30 DIAS	28000	00871	\N	\N	8452-7403	BISMARK MURILLO
a506ca0e-b4f8-4c4f-a539-11622ff759bb	fedb4b05-e281-4956-9367-5a0530976e60	ARQUISO / ROBERTO DE LOS SANTOS OCON MORALES	\N	J0310000445230	MASAYA / COMARCA LA POMA PUENTE QUEBRADA HONDA 50 MTS  AL OESTE 50 MTSR AL NORTE	\N	8758-1769	f	\N	2026-08-07 03:00:41.777	2026-08-07 03:00:41.777	001-060679-0043M	CONTADO	\N	00872	\N	\N	8758-1769	ARLES DAVID CENTENO
c2da6453-0ca5-468c-8e02-74af84ae4893	fedb4b05-e281-4956-9367-5a0530976e60	JOSE JUNIOR CARRANZA ROMERO	\N	\N	VI. JERUSALEN ENTRADA PRINCIPAL 5C. E. 8C. S CASA N° E 37-137	\N	89809850	f	\N	2026-08-07 03:00:41.777	2026-08-07 03:00:41.777	001-210703-1020B	\N	\N	00873	\N	\N	89809850	AGNEL CASTILLO
c68e3314-e2df-4001-956d-645bdf4166c8	fedb4b05-e281-4956-9367-5a0530976e60	FILADELFO DE JESUS GUTIERREZ CERDA	\N	\N	BARRIO LOMA LINDA ENTRADA POCHOCUAPE 21/2 AL ESTE	\N	8792-4805	f	\N	2026-08-07 03:00:41.778	2026-08-07 03:00:41.778	041-051163-0000D	CONTADO	\N	00874	\N	\N	8792-4805	ARLES DAVID CENTENO
70b565ee-3062-4494-bab1-2f35aa9e0213	fedb4b05-e281-4956-9367-5a0530976e60	KEVIN ARGENIS CARRANZA LANDEROS	\N	\N	BO. NAZAEH ALCALDIA MUNICIAL 120 MTS E. 300 MTS N	\N	8257-3659	f	\N	2026-08-07 03:00:41.778	2026-08-07 03:00:41.778	401 030694 0003M	\N	100000	00875	\N	\N	8257-3659	ARLES DAVID CENTENO
9287562c-8a6a-4f5b-9efc-7bb207c080a6	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO LOVO FLORES	\N	\N	VI.PEDRO JOAQUIN CHAMORRO SEMAFOROS ROBELO 7C.N 1/2C. E	\N	86611927	f	\N	2026-08-07 03:00:41.779	2026-08-07 03:00:41.779	001-170762-0023N	\N	\N	00876	\N	\N	86611927	AGNEL CASTILLO
86ed3a22-16f0-472b-9905-4213a611cdb7	fedb4b05-e281-4956-9367-5a0530976e60	JOSE DE EL CARMEN SANDOVAL RODRIGUES	\N	\N	\N	\N	8325-6114	f	\N	2026-08-07 03:00:41.779	2026-08-07 03:00:41.779	569-301062-0000P	\N	\N	00877	\N	\N	8325-6114	ARLES DAVID CENTENO
efd1662e-9112-42da-843f-1bab9f2451d8	fedb4b05-e281-4956-9367-5a0530976e60	ANA ROSA AGUIRRE	\N	\N	BO 22 DE ENERO, IGLESIA CATOLICA1C ESTE,CASA# G113	\N	\N	f	\N	2026-08-07 03:00:41.78	2026-08-07 03:00:41.78	001-220265-0004E	CRÉDITO 30 DIAS	5000	00878	\N	\N	\N	AGNEL CASTILLO
e8b65ff6-6e87-45ce-a494-bce66d439677	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO ULISES GUTIERREZ MEZA	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.781	2026-08-07 03:00:41.781	489-130284-0000P	\N	\N	00879	\N	\N	\N	AGNEL CASTILLO
e83f6cfe-ae54-4857-8276-242996004db8	fedb4b05-e281-4956-9367-5a0530976e60	HAMILTON JOSUÉ SILVA CORDOBA	\N	\N	VI. JOSÉ BENITO ESCOBAR COLEGIO JOSÉ BENITO ESCOBAR 1C OESTE. 1AND N. CASA N°B-41	\N	8811-2807	f	\N	2026-08-07 03:00:41.781	2026-08-07 03:00:41.781	001-070893-0049H	\N	20000	00880	\N	\N	8811-2807	ARLES DAVID CENTENO
c265f16d-5db2-445b-a9cf-86aa3c160b92	fedb4b05-e281-4956-9367-5a0530976e60	FABIO RAMIREZ	\N	\N	\N	\N	8778-2541	f	\N	2026-08-07 03:00:41.782	2026-08-07 03:00:41.782	\N	CONTADO	\N	00881	\N	\N	8778-2541	ARLES DAVID CENTENO
6fb4cd09-5dc9-4468-8501-d98b14bee78f	fedb4b05-e281-4956-9367-5a0530976e60	REYNALDO JOSE GARCIA HERNANDEZ	\N	\N	MASATEPE/MACARIO BRENES COLEGIO MAESTRO CALIXTO MOYA	\N	8642-0369	f	\N	2026-08-07 03:00:41.782	2026-08-07 03:00:41.782	043-291260-0000N	CONTADO	\N	00882	\N	\N	8642-0369	ARLES DAVID CENTENO
bb12c83a-629f-40d1-ba45-baafc501f952	fedb4b05-e281-4956-9367-5a0530976e60	LUIS MANUEL BRAVO	\N	\N	\N	\N	8375-4388	f	\N	2026-08-07 03:00:41.782	2026-08-07 03:00:41.782	287 010577 0006P	\N	100000	00883	8913-3518	\N	8375-4388	NYLSKA JOHANNY GARCIA CASTILLO
2aee1e42-33ff-445d-9dba-a7b5e498d5ad	fedb4b05-e281-4956-9367-5a0530976e60	ENOC WILFREDO CASTILLO SALABLANCA	\N	\N	GRANADA / BARRIO CAÑALITO DE DONDE FUE EL HOSPITAL 5 C AL OESTE 1/2 C AL SUR	\N	8792-8164	f	\N	2026-08-07 03:00:41.783	2026-08-07 03:00:41.783	201-270781-0004P	CONTADO	\N	00884	\N	\N	8792-8164	NYLSKA JOHANNY GARCIA CASTILLO
19bc7c49-56e8-41a5-b687-aba0043ca24e	fedb4b05-e281-4956-9367-5a0530976e60	MATUEL NABEL RODRIGUEZ RUIZ	\N	\N	BO. LARREYNAGA PUENTE EL EDEN 1C OESTE M/D	\N	8684-8922	f	\N	2026-08-07 03:00:41.784	2026-08-07 03:00:41.784	121-061183-0002Q	CRÉDITO 15 DIAS	8000	00885	\N	\N	8684-8922	YESSEL ANAHY CERPAS ARTOLA
768ad7cf-4c15-47ad-8980-5f154cc21d8a	fedb4b05-e281-4956-9367-5a0530976e60	LEYMAN ERNESTO ULLOA RAMIREZ	\N	\N	BO. COLINAS DEL MEMORIAL SANDINO SOMBRERO 4C. S 2C. E 1/2C. S	\N	82572333	f	\N	2026-08-07 03:00:41.785	2026-08-07 03:00:41.785	201-031077-0001A	\N	\N	00886	\N	\N	82572333	AGNEL CASTILLO
44778b19-635d-45aa-ba54-83cb60dc1c7c	fedb4b05-e281-4956-9367-5a0530976e60	JUAN FRANCISCO OLIVARES ANDINO	\N	\N	TICUANTEPE	\N	7665-5108	f	\N	2026-08-07 03:00:41.786	2026-08-07 03:00:41.786	001-160669-0023R	CRÉDITO 30 DIAS	5000	00887	\N	\N	7665-5108	BISMARK MURILLO
723cb08e-a9b9-4463-8f5c-2753aa66bbff	fedb4b05-e281-4956-9367-5a0530976e60	FERNANDO ULISES ANTIGA	\N	\N	VI. BOSCO MONGE GRUPO F CASA N°615	\N	88661982	f	\N	2026-08-07 03:00:41.786	2026-08-07 03:00:41.786	401-110682-0004V	CONTADO	\N	00888	\N	\N	88661982	AGNEL CASTILLO
7f3a9c53-a644-44ff-8aaa-ec253c6851d2	fedb4b05-e281-4956-9367-5a0530976e60	EDUAR ALEXANDER TORRES ARRIANZA	\N	\N	BO° COLINAS DEL MEMORIAL SANDINO SOMBRERO 2C. E 1 C SUR 20 VRS ESTE	\N	7823-7411	f	\N	2026-08-07 03:00:41.787	2026-08-07 03:00:41.787	001-130490-0054R	\N	15000	00889	\N	\N	7823-7411	YESSEL ANAHY CERPAS ARTOLA
700b7bb0-5423-4cd4-91a8-650e28dd205f	fedb4b05-e281-4956-9367-5a0530976e60	DONALD ANTONIO RIVERA	\N	\N	BO° 22 DE ENERO DE DONDE FUE AUTOCINEMA	\N	8689-7270	f	\N	2026-08-07 03:00:41.788	2026-08-07 03:00:41.788	001-080273-0024C	\N	15000	00890	\N	\N	8689-7270	YESSEL ANAHY CERPAS ARTOLA
a4f871f7-70a9-4fce-8641-d9c1e5b501dc	fedb4b05-e281-4956-9367-5a0530976e60	LEONEL CASTILLO RAMIREZ	\N	\N	BO. LARGAESPADA REPUESTOS BURGOS 4 1/2 C. S.	\N	7530-5852	f	\N	2026-08-07 03:00:41.788	2026-08-07 03:00:41.788	366-061184-0003W	\N	\N	00891	\N	\N	7530-5852	ARLES DAVID CENTENO
fcda35f0-1cb7-4b61-a596-09bea6ed8777	fedb4b05-e281-4956-9367-5a0530976e60	TALAL MOHAMAD EL OKLI MAJZOUB	\N	\N	RESIDENCIAL EL CORTIJO DE LA SIERRA CASA N° D-3	\N	7720-5119	f	\N	2026-08-07 03:00:41.789	2026-08-07 03:00:41.789	777-010173-1000M	\N	8000	00892	\N	\N	7720-5119	YESSEL ANAHY CERPAS ARTOLA
c82f4e8b-c676-4ecd-867d-f7338c64d7fb	fedb4b05-e281-4956-9367-5a0530976e60	DARWIN GILBERTO VALLE COREA	\N	\N	BO° GEORGINO ANDRADE PORTON PRINCIPAL RUPAP 1 CUERPO 2C SUR CASA N° A-11	\N	8393-8048	f	\N	2026-08-07 03:00:41.789	2026-08-07 03:00:41.789	001-070885-0027C	\N	8000	00893	\N	\N	8393-8048	NYLSKA JOHANNY GARCIA CASTILLO
920f6003-642f-42ac-9577-68583a54e826	fedb4b05-e281-4956-9367-5a0530976e60	IMPORTACIONES Y SOLUCIONES HOREB	\N	\N	COSTADO IZQUIERDO A QUINTAS DEL PRADO	\N	\N	f	\N	2026-08-07 03:00:41.79	2026-08-07 03:00:41.79	J0310000338051	\N	10000	00894	\N	\N	\N	YESSEL ANAHY CERPAS ARTOLA
8d767627-0542-4e42-9bba-0aa9cd7a8a9b	fedb4b05-e281-4956-9367-5a0530976e60	ROJAS GONZALEZ CONSTRUCCIONES S.A	\N	\N	\N	\N	\N	f	\N	2026-08-07 03:00:41.791	2026-08-07 03:00:41.791	J0310000054886	\N	15000	00895	\N	\N	\N	YESSEL ANAHY CERPAS ARTOLA
22b6e60c-68e6-4883-a402-0722c6680315	fedb4b05-e281-4956-9367-5a0530976e60	MARLON ORLANDO CHAVEZ VELAZQUES	\N	\N	CMCA ESQUIPULAS RESIDENCIAL ERMITAS DE ESQUIPULAS 500VRS E.	\N	8480 4913	f	\N	2026-08-07 03:00:41.791	2026-08-07 03:00:41.791	001 010181 1000X	\N	100000	00896	\N	\N	8480 4913	NYLSKA JOHANNY GARCIA CASTILLO
d16d26e8-f2e1-471c-879f-77219b7080a8	fedb4b05-e281-4956-9367-5a0530976e60	FROYLAN ARMIN LAZO	\N	\N	BARRIO ENRIQUE SMITH ENTRADA PRINCIPAL 11/2 C AL SUR	\N	7769-9814	f	\N	2026-08-07 03:00:41.792	2026-08-07 03:00:41.792	001-010502-1048F	CONTADO	\N	00897	\N	\N	7769-9814	ARLES DAVID CENTENO
fa37435a-0cd0-4ae8-b972-c77c91a88859	fedb4b05-e281-4956-9367-5a0530976e60	ABRAHAN ELISEO RIVAS BLANCO	\N	\N	COMARCA SAN JOSE DE LA CAÑADA ESCUELA SAN JOSE 2 C AL SUR	\N	87664733	f	\N	2026-08-07 03:00:41.793	2026-08-07 03:00:41.793	443-060992-0002D	CONTADO	\N	00898	\N	\N	87664733	ARLES DAVID CENTENO
fed87af9-bb07-4f98-b240-312ef6dafab1	fedb4b05-e281-4956-9367-5a0530976e60	LUIS CARLOS ROBLERO SELVA	\N	\N	BO. CAMPO DE ATERRIZAJE LABORATORIO CEGUEL 1 1/2C. S	\N	82811265	f	\N	2026-08-07 03:00:41.793	2026-08-07 03:00:41.793	201-070887-0001R	\N	\N	00899	\N	\N	82811265	AGNEL CASTILLO
4629b4f8-e11d-4376-8c55-01a92eb5e9d7	fedb4b05-e281-4956-9367-5a0530976e60	MUNDO SERVICIOS/VICTOR AMAYA	\N	\N	DE LOS SEMAFOROS DE LINDA VISTA 1C A LAGO 1C ABAJO	\N	8550-2706	f	\N	2026-08-07 03:00:41.794	2026-08-07 03:00:41.794	0010710900019E	\N	15000	00900	\N	\N	8550-2706	YESSEL ANAHY CERPAS ARTOLA
e82a6e9c-2797-43f7-9526-3a50fcaf07be	fedb4b05-e281-4956-9367-5a0530976e60	REYNELL FERNANDO ACOSTA PEREZ	\N	\N	ANXO. 1RO DE MAYO GASOLINERA UNO LAS AMERICAS 1C O. 2 1/2C S. CASA N°26	\N	82209947	f	\N	2026-08-07 03:00:41.794	2026-08-07 03:00:41.794	081-260270-0000X	\N	\N	00901	\N	\N	82209947	AGNEL CASTILLO
be3f9b06-5851-4db3-a613-00b122b021d5	fedb4b05-e281-4956-9367-5a0530976e60	JOSE LUIS HERNADEZ NICARAGUA	\N	\N	VI RECONCILIACION BLOQUERA HOWARD 8 C N. 1/2 C. E.	\N	\N	f	\N	2026-08-07 03:00:41.795	2026-08-07 03:00:41.795	001-250583-0046D	\N	100000	00902	\N	\N	\N	BISMARK MURILLO
654aaede-d0df-467b-85ee-fe4424f104ec	fedb4b05-e281-4956-9367-5a0530976e60	REYNALDO ANTONIO RODRIGUEZ MATUS	\N	\N	RESD. LOMAS DEL VALLE ENTRADA PRICIPAL 4C. E 1/2C  S. CASA N°	\N	88546422	f	\N	2026-08-07 03:00:41.795	2026-08-07 03:00:41.795	121-130169-0004T	\N	\N	00903	\N	\N	88546422	AGNEL CASTILLO
331af5a8-e2ab-4e19-9d26-94cf19c9c319	fedb4b05-e281-4956-9367-5a0530976e60	DYM INGENIERIA Y SERVICIOS	\N	001-040389-0058A	URBANIZACION SANTA EDUBIGES SEGUNDA ESTAPA CASA J-11	\N	84039424	f	\N	2026-08-07 03:00:41.796	2026-08-07 03:00:41.796	\N	\N	\N	00904	\N	\N	84039424	AGNEL CASTILLO
386ed902-3de1-4ea3-9cf8-d775288ecff8	fedb4b05-e281-4956-9367-5a0530976e60	JOHN KEVIN REY BLANDON PALACIOS	\N	\N	VI. VENEZUELA SEMAFOROS IVAN MONTENEGRO 1. ESTE 6AND SUR M/D	\N	8655-7027	f	\N	2026-08-07 03:00:41.796	2026-08-07 03:00:41.796	001-060194-0004F	\N	8000	00905	\N	\N	8655-7027	YESSEL ANAHY CERPAS ARTOLA
4f8ed955-65f9-450e-ad68-7caedea9d9fd	fedb4b05-e281-4956-9367-5a0530976e60	MICHAEL ENRIQUE CUADRA GARCIA	\N	\N	BO. MARVIN MARIN ENTRAA SAN ISIDRO LIBERTADOR 4C. S. 2C O. M/I	\N	89517147	f	\N	2026-08-07 03:00:41.797	2026-08-07 03:00:41.797	001-110285-0001T	\N	\N	00906	\N	\N	89517147	AGNEL CASTILLO
7f3bc2fa-a5ff-46b5-b513-06dc972d22cc	fedb4b05-e281-4956-9367-5a0530976e60	CESAR ALEJANDRO ESPINOZA MEZA	\N	\N	RESD. SANTO DOMINGO COSTADO NORESTE IGLESIA LA SIERRITA	\N	8396 8969	f	\N	2026-08-07 03:00:41.797	2026-08-07 03:00:41.797	001-090764-0005Q	\N	100000	00907	\N	\N	8396 8969	NYLSKA JOHANNY GARCIA CASTILLO
bd723c02-c7d6-49de-8055-82697f3d8c9f	fedb4b05-e281-4956-9367-5a0530976e60	RUDY RICARDO BRIONES ROJAS	\N	\N	CMCA SAN ISIDRO DE CRUZ VERDE TERMINAL DE BUSES 1½C. E	\N	88988042	f	\N	2026-08-07 03:00:41.798	2026-08-07 03:00:41.798	001-080885-0042V	\N	\N	00908	\N	\N	88988042	AGNEL CASTILLO
a9edd839-da76-41dd-bed5-850f428c42de	fedb4b05-e281-4956-9367-5a0530976e60	ZHENG GUANGYU	\N	\N	MANAGUA-DEL MINISTERIO DE TRABAJO 3C AL NORTE 2C AL ESTE MANO IZQUIERDA	\N	5882 9536	f	\N	2026-08-07 03:00:41.798	2026-08-07 03:00:41.798	120620170124	\N	100000	00909	\N	\N	5882 9536	NYLSKA JOHANNY GARCIA CASTILLO
bd17113e-6fa5-4353-8e6e-99724c5aba3d	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO JOSÉ RUIZ CHAVEZ	\N	\N	SECTOR N°1 ALCALDIA MUNICIPAL 1/2 C AL NORTE	\N	5801-9964	f	\N	2026-08-07 03:00:41.799	2026-08-07 03:00:41.799	047-110272-0000N	\N	10000	00910	\N	\N	5801-9964	YESSEL ANAHY CERPAS ARTOLA
fb0a85fd-97a3-4eb6-a9b0-a008bd9d2d54	fedb4b05-e281-4956-9367-5a0530976e60	DOUGLAS ALBERTO MONTENEGRO CASTRO	\N	\N	BO. WASPAN SUR GASOLINERA UNO 3C SUR 2C OESTE	\N	8159-0979	f	\N	2026-08-07 03:00:41.8	2026-08-07 03:00:41.8	001-021178-0036J	\N	5000	00911	\N	\N	8159-0979	YESSEL ANAHY CERPAS ARTOLA
2fd85581-e6b2-4e62-a06d-342ce9f12d8c	fedb4b05-e281-4956-9367-5a0530976e60	MICHAELLE FRANCOIS DAMHA LOPEZ	\N	\N	BO. EDUARDO CONTRERAS KM 15 1/2 CARRETERA TICUANTEPE 100VRS O.	\N	5745 4312	f	\N	2026-08-07 03:00:41.8	2026-08-07 03:00:41.8	001 290493 0048D	\N	100000	00912	\N	\N	5745 4312	ARLES DAVID CENTENO
8423a414-e70e-4f85-907d-347b1def47aa	fedb4b05-e281-4956-9367-5a0530976e60	JOSÉ RAMÓN GUERRERO MEMBREÑO	\N	\N	BO° BLANCA SEGOVIA TERMINAL RUTA 109	\N	8423-2718	f	\N	2026-08-07 03:00:41.801	2026-08-07 03:00:41.801	001-190386-0050Q	\N	10000	00913	\N	\N	8423-2718	YESSEL ANAHY CERPAS ARTOLA
36770f62-2b39-437d-82e7-aadaf48aab34	fedb4b05-e281-4956-9367-5a0530976e60	CENTRO CULTURAL ALEMAN	\N	\N	CARRETERA SUR KM 10.5. 800 MTS AL SUROESTE COLEGIO ALEMAN	\N	8700-1924	f	\N	2026-08-07 03:00:41.801	2026-08-07 03:00:41.801	J0810000128319	\N	8000	00914	\N	\N	8700-1924	YESSEL ANAHY CERPAS ARTOLA
532c2bdb-7dd3-454e-91be-7eba019d43f0	fedb4b05-e281-4956-9367-5a0530976e60	JAIRO ADOLFO GOMEZ MORLES	\N	\N	VI. SANDINO GRUPO E CASA N° 696	\N	8864-6050	f	\N	2026-08-07 03:00:41.802	2026-08-07 03:00:41.802	201 250301 1002D	\N	100000	00915	8464-9660	\N	8864-6050	NYLSKA JOHANNY GARCIA CASTILLO
0c20aceb-3865-49f7-9baa-44d19181bb68	fedb4b05-e281-4956-9367-5a0530976e60	ROBERTO CARLOS CALERO HERNANDEZ	\N	\N	CMCA. LA POMA KM 32 1/2 CARRETERA MASAYA - GRANADA	\N	8189-8629	f	\N	2026-08-07 03:00:41.803	2026-08-07 03:00:41.803	401-100199-1005G	CRÉDITO 30 DIAS	8000	00916	\N	\N	8189-8629	YESSEL ANAHY CERPAS ARTOLA
6d20d1ca-1f05-4f59-9612-74cf3ce55202	fedb4b05-e281-4956-9367-5a0530976e60	MELVIN JOSE OBREGON CRUZ	\N	\N	BO. BUENA VISTA ESCUELA HISPANIDAD 4C. N. 1C O. M/D	\N	8185-1250	f	\N	2026-08-07 03:00:41.803	2026-08-07 03:00:41.803	001-201279-0010V	\N	100000	00917	\N	\N	8185-1250	NYLSKA JOHANNY GARCIA CASTILLO
9be0bc43-d799-412b-be21-caab32893f5e	fedb4b05-e281-4956-9367-5a0530976e60	IVAN ENRIQUE MARTINEZ OLIVAR	\N	\N	BO° GRENADA HOSPITAL ROBERTO CALDERÓN 2C SUR	\N	8604-3950	f	\N	2026-08-07 03:00:41.804	2026-08-07 03:00:41.804	604-291278-0009G	\N	\N	00918	\N	\N	8604-3950	YESSEL ANAHY CERPAS ARTOLA
24e76d14-9fba-41bd-8e8f-00480e9902c2	fedb4b05-e281-4956-9367-5a0530976e60	JORGE ELEAN VIVAS HERNANDEZ	\N	\N	COMCA. VERACRUZ COSTADO ESTE COLEGIO CRISTIANO OLIVO 200MTS N.	\N	8727-6529	f	\N	2026-08-07 03:00:41.825	2026-08-07 03:00:41.825	001-220398-1003S	\N	\N	00945	\N	\N	8727-6529	YESSEL ANAHY CERPAS ARTOLA
9048226f-5708-4064-8ae2-92c88156a8f0	fedb4b05-e281-4956-9367-5a0530976e60	SEVIALNICSA/YARED ANTONIO PALMA RODRIGUEZ	\N	J0310000236356	URB, XOCHITLAN KM 10 1/2 CARRETERA A MASAYA 1600 MTS S. CASA N°28	\N	8560 0893	f	\N	2026-08-07 03:00:41.804	2026-08-07 03:00:41.804	001-130595-0037C	CRÉDITO 30 DIAS	100000	00919	\N	\N	8560 0893	NYLSKA JOHANNY GARCIA CASTILLO
81584a45-dc93-43a3-ae69-d09c7d4afbf1	fedb4b05-e281-4956-9367-5a0530976e60	DANNI ELIEZER ALONSO MIRANDA	\N	\N	CMCA. MONTE FRESCO N°2 ESCUELA ELMER CHAVEZ 100MTS N	\N	82316050	f	\N	2026-08-07 03:00:41.805	2026-08-07 03:00:41.805	001-110885-0006N	\N	\N	00920	\N	\N	82316050	AGNEL CASTILLO
d7869477-574d-404b-b376-8c5139380a76	fedb4b05-e281-4956-9367-5a0530976e60	HOLMAN DENILSON PUTOY LOPEZ	\N	\N	BARRIO MONINBO PLAZA PEDRO JOAQUIN CHAMORRO 5 C AL SUR 75 VRS AL OESTE	\N	8979-3932	f	\N	2026-08-07 03:00:41.806	2026-08-07 03:00:41.806	401-240998-0004G	\N	\N	00921	\N	\N	8979-3932	ARLES DAVID CENTENO
09d8963d-af58-4160-a20a-bc63896996ba	fedb4b05-e281-4956-9367-5a0530976e60	PERLA IVONNE NORORI ZUNIGA	\N	\N	VILLA ISRRAEL 2DA ENTRADA PRADERAS EL DORAL 4 C AL NORTE 1/2 C AL OESTE	\N	8785-2407	f	\N	2026-08-07 03:00:41.807	2026-08-07 03:00:41.807	001-100781-0006B	\N	\N	00922	\N	\N	8785-2407	ARLES DAVID CENTENO
740d7053-070f-4302-8224-d56ffa83ef2a	fedb4b05-e281-4956-9367-5a0530976e60	JULIO CESAR CASTILLO CANALES	\N	\N	BO. HILARIO SANCHEZ EDIFICIO ARMANDO GUIDO 1C. N 1C E M/I	\N	8786 2888	f	\N	2026-08-07 03:00:41.807	2026-08-07 03:00:41.807	001-060198-001F	\N	100000	00923	\N	\N	8786 2888	NYLSKA JOHANNY GARCIA CASTILLO
77287b7e-5f9e-4d1d-adf0-2cb138057ca0	fedb4b05-e281-4956-9367-5a0530976e60	ARMANDO ARIEL COREA LOPEZ	\N	\N	NINDIRI-MASAYA INSTITUTO NACIONAL DE VERACRUZ 1 KM AL SUR 40 MTRS AL OESTE CASA # 1	\N	8887-0822	f	\N	2026-08-07 03:00:41.808	2026-08-07 03:00:41.808	001-170479-0026E	\N	\N	00924	\N	\N	8887-0822	ARLES DAVID CENTENO
368cd615-c8b7-48eb-bc69-5b5a445ca9f6	fedb4b05-e281-4956-9367-5a0530976e60	INNOVACIONES Y ACABADOS / JOSE DONIEL ROCHA	\N	2881105940001F	VILLA FLOR COMEDOR EL ZEPOLAZO 1 C AL SUR	\N	8750-7773	f	\N	2026-08-07 03:00:41.809	2026-08-07 03:00:41.809	288-110594-0001F	\N	\N	00925	\N	\N	8750-7773	ARLES DAVID CENTENO
c6362355-cab2-44e6-bc05-38605c566fb9	fedb4b05-e281-4956-9367-5a0530976e60	PROYECTO P32ASN/GLORIA PARRALES	\N	\N	LAS COLINAS DE CRIMINALISTA DE LA POLICÍA 15O MTS AL OESTE, 2C AL NORTE, 1C OESTE, 1C SUR, 75 MTS AL ESTE	\N	8507-9515	f	\N	2026-08-07 03:00:41.81	2026-08-07 03:00:41.81	001-270490-0014G-8	CRÉDITO 15 DIAS	8000	00926	\N	\N	8507-9515	YESSEL ANAHY CERPAS ARTOLA
7faf638c-8608-4516-a28d-1e036d2f5b3f	fedb4b05-e281-4956-9367-5a0530976e60	CESAR JOSE ANZOATEGUIGALLARDO	\N	\N	COL. 19 DE JULIO KM. 461/2 CARRETERA SAN MARCOS - MASATEPE	\N	87539453	f	\N	2026-08-07 03:00:41.811	2026-08-07 03:00:41.811	001-280270-0018F	\N	\N	00927	\N	\N	87539453	AGNEL CASTILLO
f045dc5b-6ba8-45d9-85ab-fe7f6e9baca9	fedb4b05-e281-4956-9367-5a0530976e60	JENNIER GUSTAVO GOMEZ MIRANDOA	\N	\N	BO. 30 DE MAYO IGLESIA NAZARENO 2C O. 1C N. 1/2 C O.	\N	8387-7959	f	\N	2026-08-07 03:00:41.812	2026-08-07 03:00:41.812	403-221182-0001J	CRÉDITO 30 DIAS	100000	00928	\N	\N	8387-7959	NYLSKA JOHANNY GARCIA CASTILLO
c9570059-1006-4a65-8198-94278c6e2138	fedb4b05-e281-4956-9367-5a0530976e60	ALEJANDRO ANTONIO SALINAS ALFARO	\N	\N	RESID. LOMAS DE MONSERRAT ENTRADA PRINCIPAL 100MTS NORTE CASA N° A-8	\N	8882-7757	f	\N	2026-08-07 03:00:41.813	2026-08-07 03:00:41.813	001-070854-0040K	\N	15000	00929	\N	\N	8882-7757	NYLSKA JOHANNY GARCIA CASTILLO
9cea1036-3ee1-4934-840a-719c6264b996	fedb4b05-e281-4956-9367-5a0530976e60	OSCAR RAMON TERCERO MARTINEZ	\N	\N	BARRIO LAURELES SUR TERMINAL 167 1C AL OESTE 1/2 C AL SUR	\N	5501-9639	f	\N	2026-08-07 03:00:41.814	2026-08-07 03:00:41.814	566-091168-0002S	\N	\N	00930	\N	\N	5501-9639	ARLES DAVID CENTENO
65da4299-6c0b-4ea5-9922-4bc7ed39084d	fedb4b05-e281-4956-9367-5a0530976e60	YARED ANTONIO PALMA RODRIGUEZ/ SEVIALNICSA	\N	J031 0000 236356	URB XOXHITLAN KM 10 1/2 CARRETRERA MASAYA 1600 MTS S. CASA N° 428	\N	8560 0893	f	\N	2026-08-07 03:00:41.815	2026-08-07 03:00:41.815	001-130595-0037C	\N	100000	00931	\N	\N	8560 0893	NYLSKA JOHANNY GARCIA CASTILLO
bd402445-c0e7-453d-8c67-1ddbc79e04cf	fedb4b05-e281-4956-9367-5a0530976e60	JORGE MASCIEL BUSTILLO GUTERREZ	\N	\N	COMARCA VERACRUZ CONTIGUO BAR JARDIN / NINIDIRI	\N	8644-1059	f	\N	2026-08-07 03:00:41.816	2026-08-07 03:00:41.816	401-300592-0010H	\N	\N	00932	\N	\N	8644-1059	AGNEL CASTILLO
040fea89-ab2b-4d14-a61f-aad28f472c11	fedb4b05-e281-4956-9367-5a0530976e60	ELVIS NOEL OROZCO AGUILAR	\N	\N	CMCA GUANACASTILLO  KM 35 CARRETERA MASAYA-TIPITAPA 100 MTS E. 50VRS S.	\N	8467 6356	f	\N	2026-08-07 03:00:41.817	2026-08-07 03:00:41.817	401-021180-0005V	\N	100000	00933	\N	\N	8467 6356	NYLSKA JOHANNY GARCIA CASTILLO
2cdafe9c-fbb2-4dcd-a822-8e794258d88b	fedb4b05-e281-4956-9367-5a0530976e60	ANGIE MARIA GUTIERREZ GUTIERREZ	\N	\N	TICUANTEPE COMARCA DENNIS LARIOS COSTADO ESTE IGLESIA CATOLICA	\N	8818-3107	f	\N	2026-08-07 03:00:41.818	2026-08-07 03:00:41.818	401-281202-1002R	\N	\N	00934	\N	\N	8818-3107	ARLES DAVID CENTENO
48adb284-acac-4e57-ad3d-c6addda4e0c1	fedb4b05-e281-4956-9367-5a0530976e60	JORGE ALBERTO ZAMORAN JIMENEZ	\N	\N	CMCA CEDRO GALAN KM 12 CARRETERA VIEJA A LEON 400MTS N.	\N	8883-4735	f	\N	2026-08-07 03:00:41.819	2026-08-07 03:00:41.819	042-250296-0002D	CRÉDITO 30 DIAS	100000	00935	\N	\N	8883-4735	ARLES DAVID CENTENO
374eba9b-de04-4687-b043-ddae76b11eef	fedb4b05-e281-4956-9367-5a0530976e60	RAMON ANTONIO HERNANDEZ ALEMAN	\N	\N	CMCA EMPALME SAN BENITO CEIBO 1C E. 1C N. M/D	\N	8549-0430	f	\N	2026-08-07 03:00:41.82	2026-08-07 03:00:41.82	001-131066-0054L	\N	100000	00936	\N	\N	8549-0430	NYLSKA JOHANNY GARCIA CASTILLO
e4d5b535-8944-4e7a-b391-2e146b749b6f	fedb4b05-e281-4956-9367-5a0530976e60	REPUESTOS AUTOMOTRICES OFT	\N	0010211940016A	RESIDENCIAL CUIDAD EL DORAL KM 18 CARRETERA NUEVA A LEON CASA N°T-112 CALLE 12 AVENIDA 22	\N	85302631	f	\N	2026-08-07 03:00:41.821	2026-08-07 03:00:41.821	\N	\N	\N	00937	\N	\N	85302631	AGNEL CASTILLO
a25e8894-0fab-4e6c-81b3-78a6acf3f989	fedb4b05-e281-4956-9367-5a0530976e60	CARLOS ALBERTO BERMUDEZ BERMUDEZ	\N	\N	SAN RAFAEL DEL SUR BARRIO EL MADROÑAL IGLESIA JORDAN 300 MTRS AL OESTE	\N	7829-0990	f	\N	2026-08-07 03:00:41.821	2026-08-07 03:00:41.821	002-151073-0006S	\N	\N	00938	\N	\N	7829-0990	ARLES DAVID CENTENO
d2f18538-5874-42bc-8e32-f681fcfc5d54	fedb4b05-e281-4956-9367-5a0530976e60	LESTER RAMIRO RIVERA CASTILLO	\N	\N	BO° LOS CORTEZ PRIMERA IGLESIA DE CRISTO 75 VRS N. M/D	\N	8183-6589	f	\N	2026-08-07 03:00:41.822	2026-08-07 03:00:41.822	001-050371-0065H	\N	8000	00939	\N	\N	8183-6589	ARLES DAVID CENTENO
763d6577-eb7f-4b41-ba6a-94c759334bac	fedb4b05-e281-4956-9367-5a0530976e60	COLEGIO AMERICANO/GERALD GROVANNY BEJARANO GUTIERREZ	\N	\N	BO. ANDRES CASTRO INTITUTI BENJAMIN ZELEDON 75 VRS O 75 VRS S.	\N	5711-0513	f	\N	2026-08-07 03:00:41.823	2026-08-07 03:00:41.823	405-301193-0000A	\N	100000	00940	\N	\N	5711-0513	NYLSKA JOHANNY GARCIA CASTILLO
f7ab8c8c-f4af-4bd5-98cc-ae63ca705f29	fedb4b05-e281-4956-9367-5a0530976e60	YAJAIRA  FRANCISCA JARQUIN SOLANO	\N	\N	COLONIA 04 DE MAYO HOSPITAL AMISTAD MEXICO NICARGUA 30 VRS AL SUR	\N	+1 (786)470-9270	f	\N	2026-08-07 03:00:41.823	2026-08-07 03:00:41.823	001-040174-0077P	\N	\N	00941	\N	\N	+1 (786)470-9270	ARLES DAVID CENTENO
6789f7a2-9613-48d1-aaaf-ed20d727e147	fedb4b05-e281-4956-9367-5a0530976e60	MARCOS ANTONIO GARCIA PALACIOS / GRUPO COEN AVANCE INGENIEROS S.A	\N	J031 0000 250960	RES. VILLA SOL CALLE 11 CASA N° D2-20 MANAGUA-MANAGUA	\N	8211-8073	f	\N	2026-08-07 03:00:41.823	2026-08-07 03:00:41.823	001-030901-1008X	\N	100000	00942	\N	\N	8211-8073	ARLES DAVID CENTENO
d29c6762-ae95-4cb0-8f22-318ef3cc616e	fedb4b05-e281-4956-9367-5a0530976e60	MARIO ALEJANDRO CHAVEZ VASQUEZ	\N	\N	BO. SAN ANTONIO IGLESIA SAN ANTONIO 60 VRS ESTE	\N	77871013	f	\N	2026-08-07 03:00:41.824	2026-08-07 03:00:41.824	081-200279-0006S	\N	\N	00943	\N	\N	77871013	AGNEL CASTILLO
1884fa3f-01e6-45c1-9174-f27b9b85a44d	fedb4b05-e281-4956-9367-5a0530976e60	IDILIA DEL CARMEN SANCHEZ AREVALO	\N	\N	BO° RICARDO RIVERA COSTADO SUR IGLESIA CUADRANGULAR	\N	8799-1673	f	\N	2026-08-07 03:00:41.824	2026-08-07 03:00:41.824	204-271069-0000W	\N	\N	00944	\N	\N	8799-1673	YESSEL ANAHY CERPAS ARTOLA
2b1815c7-cf86-4788-98a8-5a3d81496227	fedb4b05-e281-4956-9367-5a0530976e60	PEDRO ENRIQUE CALERO JARQUIN	\N	\N	COM. DIRITA KM 18 KM 1/2 CARRETERA MASAYA ENTRADA 300 VRS OESTE 1C SUR	\N	8808-4198	f	\N	2026-08-07 03:00:41.825	2026-08-07 03:00:41.825	007-220881-0001H	\N	\N	00946	\N	\N	8808-4198	YESSEL ANAHY CERPAS ARTOLA
36ec7c8a-e5c4-4856-b34a-1ccac9bcdcd9	fedb4b05-e281-4956-9367-5a0530976e60	ANGEL CRISOSTOMO URBINA	\N	\N	BO. LAURELES SUR COOPERATIVA DE TAXI CARLOS FONSECA 2C. SUR/ MANAGUA	\N	8385-0226	f	\N	2026-08-07 03:00:41.826	2026-08-07 03:00:41.826	001-170272-0064V	\N	100000	00947	\N	\N	8385-0226	NYLSKA JOHANNY GARCIA CASTILLO
959d6285-4f93-406a-85d7-11156d6b6549	fedb4b05-e281-4956-9367-5a0530976e60	CRISTHIAN ALEXANDER LOPEZ BLANCO	\N	\N	BO° EL GUAPINOL IGLESIA BAUTISTA 730 MTS SURESTE	\N	7782-4484	f	\N	2026-08-07 03:00:41.826	2026-08-07 03:00:41.826	001-160801-1025N	\N	\N	00948	\N	\N	7782-4484	YESSEL ANAHY CERPAS ARTOLA
19c7227f-c90a-464f-a5f4-6f477b7e7684	fedb4b05-e281-4956-9367-5a0530976e60	FRIO INDUSTRIAL S.A/EDUARDO ANTONIO CHAVARRIA CHAVEZ	\N	\N	BO. FELIX PEDRO CHAVARRIA DE DONDE FUE CLINICA VILLA FONTANA 4C. S.	\N	8930-8798	f	\N	2026-08-07 03:00:41.826	2026-08-07 03:00:41.826	001-270492-0033N	\N	100000	00949	5854-5118	\N	8930-8798	NYLSKA JOHANNY GARCIA CASTILLO
8db8916a-e30e-46f4-a098-659da8132f0c	fedb4b05-e281-4956-9367-5a0530976e60	GERARDO ANTONIO JARA VIVAS/NUÑEZ Y CARRANZA CONSTRUCCIONES , S.A	\N	J031 00000 88012	BO. FRANCISCO MEZA DE DONDE FUE RADIO ONDAS DE LUZ 2C. E. 1/2 C. N.	\N	8275-7191	f	\N	2026-08-07 03:00:41.827	2026-08-07 03:00:41.827	001-251295-0010U	\N	100000	00950	\N	\N	8275-7191	NYLSKA JOHANNY GARCIA CASTILLO
6f7ca826-4002-40f8-a5af-7c60ed6abcdc	fedb4b05-e281-4956-9367-5a0530976e60	VICTOR MANUEL GARCIA RIVERA	\N	\N	BO° JUAN CASTRO COLEGIO RESTAURACIÓN 1/2C SUR	\N	7507-9687	f	\N	2026-08-07 03:00:41.827	2026-08-07 03:00:41.827	408-211187-0001R	\N	\N	00951	\N	\N	7507-9687	YESSEL ANAHY CERPAS ARTOLA
166406ec-eaac-4141-a84b-43770ea3c2e0	fedb4b05-e281-4956-9367-5a0530976e60	ALLAN ALFONSO RODRIGUEZ GARCIA	\N	\N	RESD. LOMAS DEL VALLE AGUJA 5C E	\N	88532362	f	\N	2026-08-07 03:00:41.828	2026-08-07 03:00:41.828	001-210580-0066H	\N	\N	00952	\N	\N	88532362	AGNEL CASTILLO
0dedcbbd-5e2e-40bc-b900-b6708bdf16b3	fedb4b05-e281-4956-9367-5a0530976e60	WHITNEY CAROLINA MORAN ZELEDON	\N	\N	CIUDAD SANDINO VALLE SANTA ROSA BLOQUE C-6 CASA # 114	\N	8875-4226	f	\N	2026-08-07 03:00:41.828	2026-08-07 03:00:41.828	001-100882-0017G	\N	\N	00953	\N	\N	8875-4226	ARLES DAVID CENTENO
72cc4071-c2b8-44f8-9069-08ff0832e3b0	fedb4b05-e281-4956-9367-5a0530976e60	DARWIN URROZ	\N	\N	BO° HILARIO SANCHEZ ESCUELA MISIÓN IMPOSIBLE 1/2C OESTE	\N	8382-4219	f	\N	2026-08-07 03:00:41.828	2026-08-07 03:00:41.828	001-080787-0052P	\N	\N	00954	\N	\N	8382-4219	YESSEL ANAHY CERPAS ARTOLA
fe0b7e8a-ef96-4702-849d-3ff0376e6a9d	fedb4b05-e281-4956-9367-5a0530976e60	MARCOS MISAEL PASTRAN ROA	\N	\N	CMCA. EL TRANSITO CENTRO DE SALUD  1 1/2 C. E.	\N	5849-6908	f	\N	2026-08-07 03:00:41.829	2026-08-07 03:00:41.829	281-131007-1010Q	\N	100000	00955	5879-8470	\N	5849-6908	NYLSKA JOHANNY GARCIA CASTILLO
991d8c28-8bd4-4563-aa25-e85bc46364a1	fedb4b05-e281-4956-9367-5a0530976e60	ASEMA S.A/NOEL LÓPEZ	\N	\N	PALI DE 27 DE MAYO 2C ESTE 100 VRS AL SUR	\N	8631-3469	f	\N	2026-08-07 03:00:41.829	2026-08-07 03:00:41.829	J0310000427860	\N	\N	00956	\N	\N	8631-3469	YESSEL ANAHY CERPAS ARTOLA
728bca01-5f7b-4f7f-96a0-5eb01206878d	fedb4b05-e281-4956-9367-5a0530976e60	ORLANDO ANDRE LUNA VALLE /DOO ESTUDIO	\N	\N	RESD. LAS DELICIAS CASA N° L-394	\N	76452823	f	\N	2026-08-07 03:00:41.83	2026-08-07 03:00:41.83	001-151092-0023	\N	\N	00957	\N	\N	76452823	AGNEL CASTILLO
96ee8a04-e8d6-4c87-80a4-5e86ec84de65	fedb4b05-e281-4956-9367-5a0530976e60	JOSE ANTONIO RODRIGUEZ FERNANDEZ	\N	\N	ZONA N°5 , CEMENTARIO 3C SUR	\N	5830-3472	f	\N	2026-08-07 03:00:41.83	2026-08-07 03:00:41.83	121-250288-0002V	\N	\N	00958	\N	\N	5830-3472	YESSEL ANAHY CERPAS ARTOLA
321c03cd-e3a3-4159-a618-4a5d1930b24b	fedb4b05-e281-4956-9367-5a0530976e60	DANNY XAVIER FLORES DELGADO	\N	\N	BARRIO SAN CRISTOBAL SEMAFAROS EL DORADO 1 C AL SUR 1 C AL ESTE	\N	7881-8591	f	\N	2026-08-07 03:00:41.831	2026-08-07 03:00:41.831	001-220701-1006Y	CONTADO	\N	00959	\N	\N	7881-8591	ARLES DAVID CENTENO
b37bad5d-4d9e-45a2-ad2f-f1e33ccd4bce	fedb4b05-e281-4956-9367-5a0530976e60	JENA DONALD VALLE	\N	\N	BO° WALTER FERRETI COLEGIO SOLIDARIDAD CON LOS PUEBLOS	\N	8642-1398	f	\N	2026-08-07 03:00:41.832	2026-08-07 03:00:41.832	001-111286-0060S	\N	\N	00960	\N	\N	8642-1398	YESSEL ANAHY CERPAS ARTOLA
395d67c1-53a8-4740-96e9-9fb103ac6bb9	fedb4b05-e281-4956-9367-5a0530976e60	JOSE MEDINA/ PRINCASA	\N	\N	PEPSI	\N	8679-0435	f	\N	2026-08-07 03:00:41.832	2026-08-07 03:00:41.832	\N	CONTADO	\N	01	\N	\N	8679-0435	NYLSKA JOHANNY GARCIA CASTILLO
\.


--
-- Data for Name: contactos_cliente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contactos_cliente (id, cliente_id, nombre, puesto, email, telefono, password, activo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contratos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contratos (id, sucursal_id, cliente_id, cotizacion_id, codigo, fecha_inicio, fecha_fin, estado, deposito_garantia, condiciones, created_at, updated_at) FROM stdin;
6135c84a-ae27-415f-a661-53cb1122799c	a98976b2-12ba-4995-a541-6526e0e68405	321c03cd-e3a3-4159-a618-4a5d1930b24b	f002ee31-7941-4630-b12e-88b2e420a546	CTR-9828	2026-08-07 11:11:12.766	2026-09-06 11:11:12.766	ACTIVO	0	Condición de pago: CONTADO	2026-08-07 11:11:12.769	2026-08-07 11:11:12.769
3b7f72ef-9693-448a-a07b-015f782c792a	a98976b2-12ba-4995-a541-6526e0e68405	395d67c1-53a8-4740-96e9-9fb103ac6bb9	205cbfd7-72c1-4196-b379-bd9bb1bd6e90	CTR-8182	2026-08-07 11:19:44.24	2026-08-07 11:19:44.24	ACTIVO	0	Condición de pago: CONTADO	2026-08-07 11:19:44.241	2026-08-07 11:19:44.241
\.


--
-- Data for Name: cotizaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cotizaciones (id, cliente_id, estado, fecha_emision, fecha_vence, subtotal, iva, total, condiciones, token_publico, created_at, updated_at, asesor_id, atencion, descuento, email, numero_cotizacion, proyecto, referencia, telefono, validez_dias, version, deposito_garantia) FROM stdin;
f002ee31-7941-4630-b12e-88b2e420a546	321c03cd-e3a3-4159-a618-4a5d1930b24b	ACEPTADA	2026-08-07 11:09:17.086	2026-08-22 11:09:17.044	200	30	230	Condición de pago: CONTADO	7a7f6613-0682-4a85-8595-a4d3856f1db8	2026-08-07 11:09:17.086	2026-08-07 11:10:49.056	\N		0	anlrocha2006@gmail.com	COT-0001			7881-8591	15	1	0
205cbfd7-72c1-4196-b379-bd9bb1bd6e90	395d67c1-53a8-4740-96e9-9fb103ac6bb9	ACEPTADA	2026-08-07 11:19:18.807	2026-08-22 11:19:18.779	200	30	230	Condición de pago: CONTADO	9d9e165f-852c-4f8f-ac68-ec47aaacd8e6	2026-08-07 11:19:18.807	2026-08-07 11:19:24.504	\N		0	anlrocha2006@gmail.com	COT-0002			8679-0435	15	1	0
\.


--
-- Data for Name: despachos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.despachos (id, sucursal_id, contrato_id, operador_nombre, vehiculo_envio, fecha_despacho, comentarios, created_at) FROM stdin;
\.


--
-- Data for Name: detalle_contratos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_contratos (id, contrato_id, equipo_id, precio_renta, horometro_inicial) FROM stdin;
\.


--
-- Data for Name: detalle_cotizacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_cotizacion (id, cotizacion_id, descripcion, cantidad, precio_unitario, subtotal, descuento, dias, equipo_id, horas, tipo_cobro) FROM stdin;
1b78926e-4541-4631-9597-cdd2e4aa2a35	f002ee31-7941-4630-b12e-88b2e420a546	CAMION HYUNDAI MIGHTY	1	200	200	0	1	63567e29-27fc-4458-afc0-4eb73183e04b	\N	POR_DIA
c0cd54d4-9089-4ec7-bb5f-62a12793f02d	205cbfd7-72c1-4196-b379-bd9bb1bd6e90	PLATO BASE DE ANDAMIOS DE CARGA	1	200	200	0	1	102bfb7b-b672-427a-8994-5a3ef59de4a0	\N	POR_DIA
\.


--
-- Data for Name: detalle_despacho; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_despacho (id, despacho_id, equipo_id, horometro, checklist_ok, fotos_urls) FROM stdin;
\.


--
-- Data for Name: detalle_devolucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_devolucion (id, devolucion_id, equipo_id, horometro, danios_detectados, descripcion_danios, fotos_urls) FROM stdin;
\.


--
-- Data for Name: devoluciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devoluciones (id, sucursal_id, contrato_id, fecha_devolucion, recibido_por, created_at) FROM stdin;
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empresas (id, nombre, rfc, email, telefono, direccion, created_at, updated_at) FROM stdin;
fedb4b05-e281-4956-9367-5a0530976e60	Rental Machinery Nicaragua S.A.	RME260723AAA	contacto@rentalmachinery.com	5551234567	Av. Industrial 100, Ciudad Industrial	2026-07-24 01:20:52.07	2026-07-24 04:50:50.597
\.


--
-- Data for Name: equipos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipos (id, empresa_id, sucursal_id, categoria_id, marca_id, modelo, numero_serie, descripcion, estado, horometro, precio_renta_dia, costo_adquisicion, fecha_adquisicion, created_at, updated_at, cantidad_disponible, cantidad_total, codigo, minimo_horas, precio_renta_hora) FROM stdin;
6143dfc0-9c68-421b-b066-ba293c1d59d7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	EMR75R	H0753230599	COMPACTADORA MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.611	2026-08-07 02:49:10.611	1	1	01-02	4	\N
428e97cb-bdcf-4c25-be4c-ead4ddd7bb61	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MR70H	H07042303858	COMPACTADORA MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.619	2026-08-07 02:49:10.619	1	1	01-03	4	\N
90162cda-219d-42fd-a5c3-c41060628222	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MR75R	H07532313938	COMPACTADORA MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.621	2026-08-07 02:49:10.621	1	1	01-05	4	\N
f7412a7f-16c6-4fec-a911-6250b16d5b05	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	9b07acf2-38c4-45c8-b243-9423e5d5789b	BS50-4AS	11755386	COMPACTADORA WAKER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.624	2026-08-07 02:49:10.624	1	1	01-06	4	\N
3f42a6a1-5950-466b-8bc9-a0eaa0d1a9d2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	9b07acf2-38c4-45c8-b243-9423e5d5789b	BS60-4AS	11773056	COMPACTADORA WAKER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.626	2026-08-07 02:49:10.626	1	1	01-08	4	\N
b925572e-bbf0-4bae-aca6-4c465e7db058	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	f681dc69-c86b-4b0b-91f9-6d6d476f0f0c	MOTOR EH122D	\N	COMPACTADORA MBW	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.63	2026-08-07 02:49:10.63	1	1	01-10	4	\N
387debab-7626-4d03-9790-df215071f9e5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	f681dc69-c86b-4b0b-91f9-6d6d476f0f0c	MOTOR EH122D	\N	COMPACTADORA MBW	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.631	2026-08-07 02:49:10.631	1	1	01-11	4	\N
6a4c4b3b-2fa5-47c6-9ab9-872e2c9793ab	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	f681dc69-c86b-4b0b-91f9-6d6d476f0f0c	R480	\N	COMPACTADORA MBW	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.633	2026-08-07 02:49:10.633	1	1	01-15	4	\N
e56f250b-285a-46d2-b7b1-d01589cd66ca	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	9b07acf2-38c4-45c8-b243-9423e5d5789b	*BS50-4AS	11755385	COMPACTADORA WAKER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.634	2026-08-07 02:49:10.634	1	1	01-16	4	\N
c9040925-ebf1-453a-ba9e-6b4c8cd834d7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MR70H	H07042303908	COMPACTADORA MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.636	2026-08-07 02:49:10.636	1	1	01-17	4	\N
8f173050-380d-4515-88e3-a486c8e7bba1	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	9b07acf2-38c4-45c8-b243-9423e5d5789b	BS60-4AS	11773057	COMPACTADORA WAKER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.638	2026-08-07 02:49:10.638	1	1	01-18	4	\N
d890070f-7ec2-43a6-bf04-7ece9c6e5808	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ60PRO	24060044	COMPACTADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.641	2026-08-07 02:49:10.641	1	1	01-19	4	\N
b2e7e879-1089-4341-b326-3cb7948898f7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	8e6baede-b788-4301-b49d-1f29e7eda69d	PH80YD	21782403	COMPACTADORA ENAR DIESEL	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.643	2026-08-07 02:49:10.643	1	1	01-21	4	\N
ca8c9d87-6f63-4be3-ad6e-ee8a4a355a2e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	d6d971a2-0ff2-4273-8d1e-2485a2b233e6	MTX-60HF	Z1259	COMPACTADORA MIKASA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.645	2026-08-07 02:49:10.645	1	1	01-22	4	\N
da7fa8e8-2148-42cc-8ed0-40b489041b9f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	f681dc69-c86b-4b0b-91f9-6d6d476f0f0c	R480	\N	COMPACTADORA MBW	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.647	2026-08-07 02:49:10.647	1	1	01-24	4	\N
6d7bcda0-85a5-4ed0-bbd4-d9f45650efe5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	8e6baede-b788-4301-b49d-1f29e7eda69d	PH70E	\N	COMPACTADORA ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.648	2026-08-07 02:49:10.648	1	1	01-25	4	\N
4ecdfd4f-62d5-4012-9c01-e0205745df71	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	8e6baede-b788-4301-b49d-1f29e7eda69d	PH70E	\N	COMPACTADORA ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.649	2026-08-07 02:49:10.649	1	1	01-26	4	\N
5660a507-869c-49e4-aa14-fb1178cc5405	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	8e6baede-b788-4301-b49d-1f29e7eda69d	PH70E	\N	COMPACTADORA ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.651	2026-08-07 02:49:10.651	1	1	01-27	4	\N
2373d5b2-0137-4904-9c1e-6aedb53f0f11	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	f681dc69-c86b-4b0b-91f9-6d6d476f0f0c	R480	\N	COMPACTADORA MBW	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.653	2026-08-07 02:49:10.653	1	1	01-28	4	\N
7a7c96ab-933e-4c31-8310-e3b693a13c4b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ15PRO	\N	VIBROPLANCHA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.656	2026-08-07 02:49:10.656	1	1	01-31	4	\N
cd2f508d-0cac-433e-8393-90bd0b3510bd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	0079c5e6-04fc-4004-9762-60a7bee8c29b	SFP1250	12215389	VIBROPLANCHA STANLEY	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.658	2026-08-07 02:49:10.658	1	1	01-32	4	\N
fd512ca1-848f-42ad-a8a1-eba9f5c3b9f6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	8e6baede-b788-4301-b49d-1f29e7eda69d	4000W  5.5 HP	22008420053	VIBROPLANCHA ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.661	2026-08-07 02:49:10.661	1	1	01-33	4	\N
f63d2450-4e1d-4abb-8504-7113d33a3323	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	48be8768-3067-417b-b2bc-bd7d60f23ccf	PR8AR9	PR81503010	RODO DE EMPUJE SENCILLO CIPSA 0.5 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.663	2026-08-07 02:49:10.663	1	1	01-34	4	\N
14dbd4e1-a4ea-41de-a4b8-722487d13778	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	48be8768-3067-417b-b2bc-bd7d60f23ccf	PR8AR9	PR81211007	RODO DE EMPUJE SENCILLO  CIPSA 0.5 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.664	2026-08-07 02:49:10.664	1	1	01-35	4	\N
b636901a-ee51-4628-a238-5308d9247883	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	20fa75f4-1f13-486d-8cc8-d2becd41d104	RWY L32	AMARILLO	RODO DE EMPUJE DOBLE NO ARTICULADO 3/4 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.665	2026-08-07 02:49:10.665	1	1	01-37	4	\N
9334c208-5d99-4c35-b035-6854f7403002	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	20fa75f4-1f13-486d-8cc8-d2becd41d104	RWL35	37318081701A	RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.667	2026-08-07 02:49:10.667	1	1	01-38	4	\N
ee4fe8a3-a4b3-4107-9f42-6c215b59cdd2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	RWYL41	31612903203A	RODO HOMBRE A BORDO 0.80 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.678	2026-08-07 02:49:10.678	1	1	01-39	4	\N
003cd497-beb9-450a-9cae-005ae9c4ee00	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQRDL41	31640504210A	RODO HOMBRE A BORDO 0.80 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.68	2026-08-07 02:49:10.68	1	1	01-40	4	\N
51fb13cf-d69d-4b86-9773-6d07cd02cfe6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	RWYL51	21530703201A	RODO HOMBRE A BORDO 1.5 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.682	2026-08-07 02:49:10.682	1	1	01-41	4	\N
c2f284b1-80c9-45d1-8786-76d7e37d5ac4	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	RWYL51	21591203202A	RODO HOMBRE A BORDO 1.5 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.683	2026-08-07 02:49:10.683	1	1	01-42	4	\N
e2aefe2e-43c9-4091-8669-db4911a956ad	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	8e6baede-b788-4301-b49d-1f29e7eda69d	16DGHW	\N	VIBROPLANCHA ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.685	2026-08-07 02:49:10.685	1	1	01-43	4	\N
4544aa2d-c8d9-44e6-950d-0b0530516450	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	RWYL34BT	22422072206A	RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.687	2026-08-07 02:49:10.687	1	1	01-44	4	\N
22ca84d3-dcfd-4354-afee-21b18e5d5184	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	RWYL34BT	\N	RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.689	2026-08-07 02:49:10.689	1	1	01-45	4	\N
1607bba0-ddde-4c7c-bd0e-f1fa264f0c98	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SRQDWB34	22430604205A	RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.692	2026-08-07 02:49:10.692	1	1	01-46	4	\N
b71c01d1-b9fd-4d69-b2e2-fcf99336ced5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ60PRO	24070017	COMPACTADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.694	2026-08-07 02:49:10.694	1	1	01-47	4	\N
00c10471-5074-444a-a8ae-5d010ee60114	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ60PRO	24070019	COMPACTADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.696	2026-08-07 02:49:10.696	1	1	01-48	4	\N
1970fc7b-f999-4e84-850a-873e03125fe8	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ60PRO	24070059	COMPACTADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.699	2026-08-07 02:49:10.699	1	1	01-49	4	\N
13d443ee-1070-454a-a199-835672e96432	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MR75R	H0753230585	COMPACTADORA  MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.7	2026-08-07 02:49:10.7	1	1	01-50	4	\N
235ebcc2-d2e3-4055-a7f3-c13bc479be69	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MR75R	\N	COMPACTADORA MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.701	2026-08-07 02:49:10.701	1	1	01-51	4	\N
3d936b6d-a243-4a74-8e93-ed0e477e34ae	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ60PRO	24115227	COMPACTADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.703	2026-08-07 02:49:10.703	1	1	01-53	4	\N
dc14c835-868f-4af4-81fa-dbff6cfdc92b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ60PRO	24115169	COMPACTADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.704	2026-08-07 02:49:10.704	1	1	01-54	4	\N
82616e10-45c7-4188-9dc3-5e8d7e8e48de	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	4158eb02-6c3e-4511-876a-491401d3290c	LFV-80	202512100109	VIBROPLANCHA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.705	2026-08-07 02:49:10.705	1	1	01-55	4	\N
25d73752-d683-4dba-b91c-756906d86a12	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	4158eb02-6c3e-4511-876a-491401d3290c	LT6005	202444100191	COMPACTADORA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.707	2026-08-07 02:49:10.707	1	1	01-56	4	\N
ee9da2b6-ab75-4c1e-87ab-2f2c85e9d523	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	4158eb02-6c3e-4511-876a-491401d3290c	LT6005	202444100243	COMPACTADORA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.708	2026-08-07 02:49:10.708	1	1	01-57	4	\N
872f7549-37bd-47d0-aafd-9f6a88e84812	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	4158eb02-6c3e-4511-876a-491401d3290c	LT6005	202443100072	COMPACTADORA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.71	2026-08-07 02:49:10.71	1	1	01-58	4	\N
b4561c3a-48a1-47ee-9787-77969715afbd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	653e9ee1-cb4b-4bad-a76f-bf7a2da6f343	2.7 TM	CT260	RODO HOMBRE A BORDO JCB 3TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.711	2026-08-07 02:49:10.711	1	1	01-59	4	\N
1ed1f1ea-dd94-4f91-8b5e-e9702aadf88b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	48be8768-3067-417b-b2bc-bd7d60f23ccf	PR-8A/0.5 TM	PR8241003	RODO DE EMPUJE SENCILLO CIPSA 0.5 TM .	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.712	2026-08-07 02:49:10.712	1	1	01-60	4	\N
cef0b7e9-da3c-4c3e-80fb-0e0945048713	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	48be8768-3067-417b-b2bc-bd7d60f23ccf	PR8AR9	PR81402021	RODO DE EMPUJE SENCILLO CIPSA 0.5 TM	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.713	2026-08-07 02:49:10.713	1	1	01-61	4	\N
b3ee35e3-626a-474d-9a4a-d504f6d580b5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	0b620aae-b7ba-4888-8471-ff532b693b35	CR3	31139	VIBROPLANCHA WEBER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.714	2026-08-07 02:49:10.714	1	1	01-62	4	\N
0dae5b27-85d6-4f39-8e5b-1c2f2ba18892	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	0b620aae-b7ba-4888-8471-ff532b693b35	SRV660	20107983	COMPACTADORA WEBER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.715	2026-08-07 02:49:10.715	1	1	01-63	4	\N
875e0014-b349-4d70-b364-e46e785f31e5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	0b620aae-b7ba-4888-8471-ff532b693b35	SRV660	20107984	COMPACTADORA WEBER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.716	2026-08-07 02:49:10.716	1	1	01-64	4	\N
1c919fa5-6305-4c31-8407-678edd802287	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	4d401d0f-3dbd-4541-8769-a41ff462f3ac	0b620aae-b7ba-4888-8471-ff532b693b35	SRV660	20107985	COMPACTADORA WEBER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.718	2026-08-07 02:49:10.718	1	1	01-65	4	\N
a1081e04-26d6-4a9c-b0a8-7dedb0edf7cd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	20fa75f4-1f13-486d-8cc8-d2becd41d104	JC436	F2301052012	ALLANADORA MPOWER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.719	2026-08-07 02:49:10.719	1	1	02-01	4	\N
c96957c2-8f9c-4185-9672-1c00311ae649	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	TIFON909	24257801	ALLANADORA ENAR TIFON 36"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.72	2026-08-07 02:49:10.72	1	1	02-02	4	\N
a8fc2a85-b19f-41d4-a78a-7b660fff7d07	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	M-20-4	Q020124105	CORTADORA MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.721	2026-08-07 02:49:10.721	1	1	02-06	4	\N
107f77ae-e25a-453a-a611-b18884930cf3	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MVE2501-38	\N	VIBRADOR ELECTRICO MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.723	2026-08-07 02:49:10.723	1	1	02-08	4	\N
5bbf9de7-3352-47ca-b0ea-dfaed83ed47b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO(ROSCADO)	24030905	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.724	2026-08-07 02:49:10.724	1	1	02-10	4	\N
85dd6779-c31c-415c-83dc-e23627999376	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO(ROSCADO)	24040303	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.726	2026-08-07 02:49:10.726	1	1	02-11	4	\N
4331bd8c-7918-4598-aec5-8925d52b9eb2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	9b07acf2-38c4-45c8-b243-9423e5d5789b	A5000	\N	VIBRADOR COMBUSTION WAKER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.727	2026-08-07 02:49:10.727	1	1	02-13	4	\N
597079ba-91ee-4283-a960-7e6ff6cecb0e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MVMP6.5	\N	VIBRADOR COMBUSTION CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.728	2026-08-07 02:49:10.728	1	1	02-14	4	\N
107a3f77-0850-46aa-b63b-6aef5da305fd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MVMP6.5	\N	VIBRADOR COMBUSTION CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.729	2026-08-07 02:49:10.729	1	1	02-15	4	\N
16a2e3d7-2ccc-4031-bc6f-ef503e0892b0	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MVMP6.5	MV2311107	VIBRADOR COMBUSTION CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.73	2026-08-07 02:49:10.73	1	1	02-16	4	\N
ee2bcf6f-ff81-4a24-99ad-11938c36581b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO 115V	\N	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.731	2026-08-07 02:49:10.731	1	1	02-17	4	\N
5d1b91ee-c25c-4e92-97dc-37fe7280c392	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO 115V	\N	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.732	2026-08-07 02:49:10.732	1	1	02-18	4	\N
90de44c6-912d-4ccd-b35a-b98bb8cc5951	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	VE3HP	\N	VIBRADOR ELECTRICO CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.734	2026-08-07 02:49:10.734	1	1	02-19	4	\N
81a22255-d9a5-45bb-8bbf-460dcafc1fc7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	M20SMMP13A	MDSM2102006	MESCLADORA 2 SACOS CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.735	2026-08-07 02:49:10.735	1	1	02-20	4	\N
7907ec3e-012a-4445-9729-5bdb8e2cd41d	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	M20SMMP13A	MDSM2102012	MESCLADORA 2 SACOS CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.736	2026-08-07 02:49:10.736	1	1	02-21	4	\N
2f107ebd-c210-469f-a1b6-8aaacd1f1e40	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	ULTRAK9A	UM2405244	MESCLADORA 1 SACO CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.737	2026-08-07 02:49:10.737	1	1	02-22	4	\N
973bbe87-eaaa-4988-b345-8cc5a898a415	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	ULTRAHJL9A	UM2104517	MESCLADORA 1 SACO CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.738	2026-08-07 02:49:10.738	1	1	02-24	4	\N
5bc9d37c-dd19-4de4-bcd5-11c5bbc9adc3	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	f8a7004e-139e-4b42-8179-128fe54f188f	J1001	B59880	MESCLADORA 2 SACOS JOPER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.74	2026-08-07 02:49:10.74	1	1	02-26	4	\N
394a19f3-9a18-439b-a616-2a11060480ed	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	f8a7004e-139e-4b42-8179-128fe54f188f	J1001	B59877	MESCLADORA 2 SACOS JOPER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.741	2026-08-07 02:49:10.741	1	1	02-27	4	\N
f3e52ab8-2d3d-4fe2-bd0c-216afb00ba27	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	ULTRAPHJL9A	UP2309023	MESCLADORA 1 SACO CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.742	2026-08-07 02:49:10.742	1	1	02-30	4	\N
d6d68cad-b884-4c5e-b43e-39e5d544c025	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	289b4da0-7c46-4b88-a1e6-5be78b6039d0	SQ36PRO	\N	ALLANADORA SIMAQ	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.743	2026-08-07 02:49:10.743	1	1	02-32	4	\N
4ceeedf9-31dc-4e95-9e1c-695442532163	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	9b07acf2-38c4-45c8-b243-9423e5d5789b	MOTOR HONDA	\N	ALLANADORA WAKER NEUSON	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.745	2026-08-07 02:49:10.745	1	1	02-33	4	\N
5d3ff107-c555-4aaa-a877-3d22a368d6cc	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	6 LITRO	\N	REVOCADORA DE MORTERO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.746	2026-08-07 02:49:10.746	7	7	02-34	4	\N
2485c5b4-1f27-428f-9f0d-25331bf029b4	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MVE2501-38	\N	VIBRADOR ELECTRICO MASALTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.747	2026-08-07 02:49:10.747	1	1	02-36	4	\N
5d405b04-b393-43d5-9163-a2f80351a106	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	59c45c04-27f6-4217-bb44-5ca7bcf1cdbd	DXE37	\N	PISTOLA DE IMPACTO HILTI	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.747	2026-08-07 02:49:10.747	1	1	02-37	4	\N
35354bf3-47d0-4bb7-b471-51f875e5bbff	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	4X4	\N	PLACA 4X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.749	2026-08-07 02:49:10.749	0	0	02-115	4	\N
9ebe4ab3-b865-4911-8275-de575ca7c34a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	4X6	\N	PLACA 4X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.75	2026-08-07 02:49:10.75	1	1	02-83	4	\N
88a9ee2d-f8d9-4b21-8831-a87a3e58c00a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	4X8	\N	PLACA 4X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.751	2026-08-07 02:49:10.751	8	8	02-38	4	\N
a79481d7-d3bb-478b-b57d-83ae47dfd792	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	6X4	\N	PLACA 6X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.752	2026-08-07 02:49:10.752	1	1	02-39	4	\N
3584b42b-af89-4980-a7c7-d928876c3781	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	6X6	\N	PLACA 6X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.754	2026-08-07 02:49:10.754	0	0	02-40	4	\N
aaff15b6-b26d-4e84-8f07-49be9785a78f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	6X8	\N	PLACA 6X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.755	2026-08-07 02:49:10.755	21	21	02-41	4	\N
549b286a-2a72-4e24-9003-5a9e57667b97	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	8X4	\N	PLACA 8X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.757	2026-08-07 02:49:10.757	12	12	02-112	4	\N
451482c9-5fbd-451c-b63e-9ce07c89f417	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	8X6	\N	PLACA 8X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.759	2026-08-07 02:49:10.759	0	0	02-42	4	\N
b29016c5-cff2-401a-8a81-42da6e9b52a6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	8X8	\N	PLACA 8X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.76	2026-08-07 02:49:10.76	24	24	02-43	4	\N
def8b6e3-8e9c-42bf-8527-e614e3b2c89e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	10X4	\N	PLACA 10X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.761	2026-08-07 02:49:10.761	15	15	02-44	4	\N
c4296a81-aaa7-46ec-b925-251a00728163	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	10X6	\N	PLACA 10X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.762	2026-08-07 02:49:10.762	16	16	02-84	4	\N
8277df19-2618-4d8a-91ab-95f743468675	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	10X8	\N	PLACA 10X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.763	2026-08-07 02:49:10.763	30	30	02-45	4	\N
e79de2a2-e83c-463a-ad4d-ad91ecb8ae1e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	12X4	\N	PLACA 12X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.764	2026-08-07 02:49:10.764	5	5	02-46	4	\N
0d661148-3931-4fb9-ba0a-1738148311d4	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	12X6	\N	PLACA 12X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.765	2026-08-07 02:49:10.765	2	2	02-47	4	\N
0278dcd2-ed6c-4eee-84e9-b765f84a25bc	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	12x8	\N	PLACA 12X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.766	2026-08-07 02:49:10.766	146	146	02-48	4	\N
2a46cbbd-5f75-491e-ac4e-689f64420afa	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	14X4	\N	PLACA 14X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.767	2026-08-07 02:49:10.767	0	0	02-49	4	\N
71b11048-04b6-4c53-b09b-bf8888d9a8e1	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	14X6	\N	PLACA 14X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.768	2026-08-07 02:49:10.768	1	1	02-50	4	\N
ad5f9e8a-820d-4af0-bca6-18babc7cda6b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	14X8	\N	PLACA 14X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.769	2026-08-07 02:49:10.769	9	9	02-51	4	\N
d7cdea2b-4b19-4421-9227-2d09e0a952e3	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	16X4	\N	PLACA 16X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.77	2026-08-07 02:49:10.77	0	0	02-111	4	\N
b1a906f4-83cf-4ed7-bdce-ca66287242ec	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	16X5	\N	PLACA 16X5	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.771	2026-08-07 02:49:10.771	1	1	02-127	4	\N
53884647-e146-4594-9d11-7e5c96781f2a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	16X6	\N	PLACA 16X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.773	2026-08-07 02:49:10.773	3	3	02-52	4	\N
2e60df7c-0b69-441a-bce2-38306a0f4489	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	16X8	\N	PLACA 16X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.774	2026-08-07 02:49:10.774	17	17	02-53	4	\N
71b17516-6336-44fd-b56f-63d96ddd50dd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	18X4	\N	PLACA 18X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.776	2026-08-07 02:49:10.776	0	0	02-54	4	\N
5d916cdf-06ba-4a58-a8ad-0ca264358030	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	18X6	\N	PLACA 18X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.777	2026-08-07 02:49:10.777	2	2	02-55	4	\N
aeed95f0-44c5-4dde-96e1-c2d51ee96fbc	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	18X8	\N	PLACA 18X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.779	2026-08-07 02:49:10.779	23	23	02-56	4	\N
f94e801d-3229-47ab-9d66-9539847b012a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	20X4	\N	PLACA 20X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.78	2026-08-07 02:49:10.78	0	0	02-57	4	\N
21e18248-1742-46cd-8828-d58072aa6abe	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	20X6	\N	PLACA 20X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.781	2026-08-07 02:49:10.781	4	4	02-58	4	\N
952c221f-0be9-463b-b5ad-47179030f9b5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	20X8	\N	PLACA 20X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.782	2026-08-07 02:49:10.782	26	26	02-59	4	\N
646310cc-4ea9-4399-9db2-737a6945e01e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	22X4	\N	PLACA 22X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.783	2026-08-07 02:49:10.783	1	1	02-60	4	\N
4e49947d-d903-4c35-8e6f-08776f15ad0b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	22X6	\N	PLACA 22X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.784	2026-08-07 02:49:10.784	0	0	02-114	4	\N
824ab0a6-c39f-4c58-a762-09960e6b0b56	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	22X8	\N	PLACA 22X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.785	2026-08-07 02:49:10.785	17	17	02-61	4	\N
b0845c03-64e0-4f0b-8d9e-ae1e641520f6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	24X4	\N	PLACA 24X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.787	2026-08-07 02:49:10.787	75	75	02-62	4	\N
7d66cfe8-5186-4251-92ac-c1fd29907cd5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	24X5	\N	PLACA 24X5	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.789	2026-08-07 02:49:10.789	0	0	02-113	4	\N
d3ade0ec-b63f-4140-a97c-38f3308cd1de	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	24X6	\N	PLACA 24X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.791	2026-08-07 02:49:10.791	41	41	02-63	4	\N
b53b12c4-509b-48aa-b554-5f20964f9072	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	24X8	\N	PLACA 24X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.793	2026-08-07 02:49:10.793	858	858	02-64	4	\N
b5e5c6c9-5330-425f-b3b2-226f96c685fa	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	6X6X8	\N	ESQUINERO 6X6X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.794	2026-08-07 02:49:10.794	23	23	02-66	4	\N
c045a3fc-c947-42f7-b9fd-657e8dbca35c	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	STANDAR	\N	ALINEADORES DE PLACAS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.795	2026-08-07 02:49:10.795	1347	1347	02-67	4	\N
51a0101f-9c5b-4f65-86ee-6e24fc0c3e7f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	STANDAR	\N	CUÑAS STANDAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.796	2026-08-07 02:49:10.796	10187	10187	02-68	4	\N
cecd0a62-1c28-479b-ba59-5be5eb02a9a1	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	ESPECIAL	\N	CUÑAS ESPECIALES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.798	2026-08-07 02:49:10.798	751	751	02-69	4	\N
69a6b0b7-8257-4c7e-9c8a-104e4d0325d8	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	2MTS A 4MTS	2-4 MTS	BARUL CONVENCIONAL GRANDE NARANJA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.798	2026-08-07 02:49:10.798	396	396	02-70	4	\N
98b287a7-be80-4053-bcd2-0ebe9a86d495	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1.5MTS A 2MTS	1.5-2 MTS	BARUL CONVENCIONAL PEQUEÑO ROJO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.8	2026-08-07 02:49:10.8	0	0	02-71	4	\N
b65db236-9c06-4364-bfe0-6fe68c2f81ae	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1.90MTS	\N	FLOTA CANAL	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.801	2026-08-07 02:49:10.801	1	1	02-72	4	\N
182b6248-adaf-46a2-9348-6edcedd25b05	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1.50MTS	\N	FLOTA CANAL	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.802	2026-08-07 02:49:10.802	1	1	02-73	4	\N
056f060b-c00e-4722-bee5-491b784b92dc	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	0.90MTS	\N	FLOTA CANAL	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.803	2026-08-07 02:49:10.803	1	1	02-74	4	\N
cc693e9c-e59c-45f5-b73b-804a91a60223	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	0.50CM	\N	TENSORES DE PLACAS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.804	2026-08-07 02:49:10.804	50	50	02-75	4	\N
30bed212-ec3e-4ade-b664-1691af9b1c77	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1.80 MTS	\N	EXTENCION PARA FLOTA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.806	2026-08-07 02:49:10.806	5	5	02-76	4	\N
85dc2a7f-faab-41df-8ac8-e7f53b510d41	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	2X2X8	2X2X8	ESQUINERO 2X2X8	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.81	2026-08-07 02:49:10.81	23	23	02-77	4	\N
a181ccfc-928f-41ce-b97e-388416e9426c	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1X2X4	1X2X4	AJUSTE 1X2X4 (FILLER)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.812	2026-08-07 02:49:10.812	8	8	02-103	4	\N
1b70279c-81c9-4f59-bafb-115d22a0d230	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1X2X8	1X2X8	AJUSTE 1X2X8 (FILLER)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.813	2026-08-07 02:49:10.813	13	13	02-78	4	\N
a5fe038c-055e-4ec4-b95b-55ba42b528d9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	2X2X8	2X2X8-2	AJUSTE 2X2X8 (FILLER)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.814	2026-08-07 02:49:10.814	3	3	02-79	4	\N
49446db5-a8c6-4a56-9255-53fb8c075986	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	2x2x3	2X2X3	ESQUINERO 2X2X3	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.816	2026-08-07 02:49:10.816	9	9	02-80	4	\N
bc673291-a112-4abc-97ec-75bab4961929	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	GALVANIZADO	2-4 MTS-2	BARUL GALVANIZADO CONVENCIONAL	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.817	2026-08-07 02:49:10.817	224	224	02-81	4	\N
926960a8-6be8-4aba-a533-33d5f09a203e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	36"	\N	PLATO PARA ALLANADORA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.818	2026-08-07 02:49:10.818	3	3	02-82	4	\N
1cb93052-7e64-4134-9a53-95691935e5aa	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	7d6251eb-d839-4daf-9fc7-3914955811d6	PLEGABLE	8 PIES	ESCALERA 8 PIES PLEGABLE DE ALUMINIO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.82	2026-08-07 02:49:10.82	1	1	02-89	4	\N
84dcd214-b7f2-41c9-bbf7-7adca575e34b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	9b57a93b-2831-4d93-b7a4-da637e22e4be	PLEGABLE	6 PIES	ESCALERA 6 PIES PLEGABLE DE ALUMINIO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.821	2026-08-07 02:49:10.821	1	1	02-91	4	\N
ebf95a4e-9b59-44d4-9eaa-d8ab2c3bb269	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	b0f001a0-99f6-49a4-aa24-c16a4ec803cf	PLEGABLE	10 PIES	ESCALERA 10 PIES PLEGABLE DE FIBRA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.822	2026-08-07 02:49:10.822	1	1	02-93	4	\N
522b7888-9d45-409c-bfb1-914d699a20a1	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	4158eb02-6c3e-4511-876a-491401d3290c	FS400	H1U2023231001088	CORTADORA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.824	2026-08-07 02:49:10.824	1	1	02-94	4	\N
07669507-f451-4861-88d1-92bc8e9632e2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	4158eb02-6c3e-4511-876a-491401d3290c	FS400	H1U2023231000760	CORTADORA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.826	2026-08-07 02:49:10.826	1	1	02-95	4	\N
25c69af8-aaa3-4edc-9901-27d7d8ec0996	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	289b4da0-7c46-4b88-a1e6-5be78b6039d0	CIRCULAR	VERDE	VIBRADOR ELECTRICO SIMAQ VERDE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.828	2026-08-07 02:49:10.828	1	1	02-98	4	\N
6ca251f0-6f78-478e-a1bc-2579e908e058	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO	\N	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.829	2026-08-07 02:49:10.829	1	1	02-100	4	\N
1cdfbd8e-448e-4591-b9d7-63473ec20181	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO	\N	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.832	2026-08-07 02:49:10.832	1	1	02-101	4	\N
b7bcbd47-178a-4c51-8db6-13392e4e7109	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	3.20 MTS	\N	CODAL ALUMINIO DE 3.00 MTS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.833	2026-08-07 02:49:10.833	2	2	02-102	4	\N
df88cc68-a2a4-42d2-bfa3-5dc2774792b5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	2X2X4	\N	ESQUINERO 2X2X4	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.834	2026-08-07 02:49:10.834	0	0	02-105	4	\N
a44cc3b0-106b-487d-85ca-5f10520c48bd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	6X6X6	\N	ESQUINERO  6X6X6	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.836	2026-08-07 02:49:10.836	13	13	02-107	4	\N
6a5f46e7-100e-419d-80d2-a93b1657cfa2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	1.50X1.50	\N	BATEA PARA CONCRETO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.837	2026-08-07 02:49:10.837	1	1	02-108	4	\N
ebddccfe-c903-4caa-a881-8d72c6499fc5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	12X5	METALICA	PLACA METALICA DE 12X5	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.839	2026-08-07 02:49:10.839	79	79	02-109	4	\N
ecdce6d6-9daf-441e-9dd2-94d4a113cb23	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	TIFON 900H/36"	HONDA GX160	ALLANADORA ENAR TIFON 36"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.841	2026-08-07 02:49:10.841	1	1	02-116	4	\N
c3aeeac8-fdce-4ffc-bc92-411ccbcb1a6c	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO	24651211	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.843	2026-08-07 02:49:10.843	1	1	02-118	4	\N
4903c059-3fd5-4199-b3fb-de7b1c4a7c4a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	DINGO	24651212	VIBRADOR ELECTRICO ENAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.845	2026-08-07 02:49:10.845	1	1	02-119	4	\N
74a94139-61bb-4c1c-a1cf-be23201481a1	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	ALUMINIO	EXTENSIBLE	ESCALERA EXTENSIBLE DE ALUMINIO 10 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.846	2026-08-07 02:49:10.846	1	1	02-120	4	\N
3a3a69a0-01c0-44ad-bf39-bcc9a55029ca	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	f8a7004e-139e-4b42-8179-128fe54f188f	R200STLX	B59890	MESCLADORA 2 SACO JOPER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.847	2026-08-07 02:49:10.847	1	1	02-122	4	\N
7dbc4125-a277-4413-81a1-00f2e6c8d50e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	f8a7004e-139e-4b42-8179-128fe54f188f	R200STLX	B59899	MESCLADORA 2 SACOS JOPER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.849	2026-08-07 02:49:10.849	1	1	02-123	4	\N
792c3d32-4b02-49a1-ae82-cf46d71f5e82	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	4158eb02-6c3e-4511-876a-491401d3290c	FS-400-LV	2024361000538	CORTADORA  HUSQVARNA.	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.851	2026-08-07 02:49:10.851	1	1	02-124	4	\N
e4833dc6-029e-4de7-953e-9b34b5bcc7ad	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	BAZUKA	2-4 MTS-3	BARUL DE CARGA GALVANIZADO BAZUKA.	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.852	2026-08-07 02:49:10.852	190	190	02-125	4	\N
e3525eb4-f505-4c49-b2e0-490dcecc6b4f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	4158eb02-6c3e-4511-876a-491401d3290c	FS-400LV	2025024000058	CORTADORA HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.854	2026-08-07 02:49:10.854	1	1	02-126	4	\N
6bb2eee9-17e3-4b67-b229-3b0d4c58342d	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	8 PIES	8 PIES-2	ESCALERA PLEGABLE DE 8 PIES ALUMINIO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.855	2026-08-07 02:49:10.855	1	1	02-128	4	\N
bf11834f-f32b-4187-aae6-6f1c683a0fde	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	2	\N	BRIGITTE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.857	2026-08-07 02:49:10.857	2	2	02-129	4	\N
a20e2907-8434-4061-8290-4cead3c45a59	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	ULTRAPMP9A	UP2509006	MESCLADORA 1 SACO CIPSA POLIETILENO GX270	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.859	2026-08-07 02:49:10.859	1	1	02-130	4	\N
c128e1d8-e03a-47e6-8aa1-a4d0d1163ed2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	1.05X1.80	1.05X1.80	BARUL GALVANIZADO DE 1.05X1.80 PEQUEÑO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.86	2026-08-07 02:49:10.86	197	197	02-133	4	\N
2b0c80df-5f85-41bc-8952-465fd412e35f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	1e6d29b2-818a-4866-8d07-e0210280eedf	1.05X1.80	1.05X1.80-2	BARUL NARANJA PEQUEÑO 1.05X1.80	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.862	2026-08-07 02:49:10.862	20	20	02-148	4	\N
6a856972-4304-4767-b4bf-977da9a417ae	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MAXI 20	MDSM2508025	MESCLADORA DE 2 SACOS CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.863	2026-08-07 02:49:10.863	1	1	02-135	4	\N
0442e5c7-d4fa-4298-8a54-75e5798c0553	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	ULTRAMP9A	UM2508229	MESCLADORA DE 1 SACO CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.865	2026-08-07 02:49:10.865	1	1	02-136	4	\N
49797815-34af-43ab-ad85-67228ea38744	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	4158eb02-6c3e-4511-876a-491401d3290c	K4000	20245013029	CORTADORA ELECTRICA HUSQVARNA K4000	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.867	2026-08-07 02:49:10.867	1	1	02-140	4	\N
00776a8a-3d63-46a6-8ea0-f995955c09c9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	ab052fd1-fc62-4d95-883f-e3921c11c9c6	PLEGABLE	DE TIJERA	ESCALERA PLEGABLE 12 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.868	2026-08-07 02:49:10.868	1	1	02-141	4	\N
90547dee-61cf-4ca0-b554-e289101c2ced	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	8X8	100	PLATO BASE ANDAMIOS DE CARGA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.869	2026-08-07 02:49:10.869	21	21	02-144	4	\N
1c979e66-1686-4c84-9eb8-66da0fbafa69	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	12X12	200	CABEZAL EN U (CANASTA)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.871	2026-08-07 02:49:10.871	8	8	02-145	4	\N
859aaff6-5b4b-48ff-ad9c-3cb4c423cef0	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	c56d108e-5512-4ec6-91d8-77f8802d098f	3-5MTS	3-5MTS	BARUL GALVANIZADO LARGO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.872	2026-08-07 02:49:10.872	39	39	02-146	4	\N
dd6a30d1-e799-4f0d-8db2-b225163a0974	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	8e6baede-b788-4301-b49d-1f29e7eda69d	TIFON 900H/36"	GCBCH1485515	ALLANADORA ENAR TIFON 36"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.874	2026-08-07 02:49:10.874	1	1	02-147	4	\N
174d0aae-326b-447c-8ffa-a4748ef8be3d	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	0b620aae-b7ba-4888-8471-ff532b693b35	VS	13789	REGLETA VIBRATORIA WEBER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.876	2026-08-07 02:49:10.876	1	1	02-149	4	\N
d2204b87-c278-4c55-a274-b25c7c569acd	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MVR6	T1567445	VIBRADOR DE COMBUSTION CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.877	2026-08-07 02:49:10.877	1	1	02-150	4	\N
26f8823f-79be-4e8e-a757-08c7729dc78a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MVR6	T2150978	VIBRADOR DE COMBUSTION CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.878	2026-08-07 02:49:10.878	1	1	02-151	4	\N
b0df8beb-2ad3-4f20-b649-0ad6d38857d5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	MVR6	T1987527	VIBRADOR DE COMBUSTION CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.88	2026-08-07 02:49:10.88	1	1	02-152	4	\N
d11781cb-35b8-4e30-b996-5be68708830a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	M20SMHJL13A	MDSM2512004	MESCLADORA 2 SACOS CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.882	2026-08-07 02:49:10.882	1	1	02-153	4	\N
c99deef8-343b-49cc-83bf-a4fe297acd5a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	48be8768-3067-417b-b2bc-bd7d60f23ccf	M20SMHJL13A	MDSM2512003	MESCLADORA 2 SACOS CIPSA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.883	2026-08-07 02:49:10.883	1	1	02-154	4	\N
0ba93273-e550-4736-b4a2-616b0717b9d0	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	a5694e3c-3ee4-44ba-a6ba-b90da5d2c14e	12b5857f-a3b0-403a-bdd0-88126f96c094	4 UNDS	8"X14"	ASPAS DE ALLANADORA, JUEGO DE 4 PIEZAS.	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.884	2026-08-07 02:49:10.884	0	0	02-155	4	\N
89231d6f-21c8-4868-ac5d-e4baed360041	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	367abd20-a155-4239-bbc4-07ddf7b236ca	10,000 PLUS EAGLE	\N	SOLDADOR 10,000 LINCOLN ELECTRIC	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.885	2026-08-07 02:49:10.885	1	1	03-03	4	\N
fff8d955-07ab-4e62-b97d-3d338a7ed4e9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	367abd20-a155-4239-bbc4-07ddf7b236ca	10,000 PLUS EAGLE	\N	SOLDADOR 10,000 LINCOLN ELECTRIC	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.887	2026-08-07 02:49:10.887	1	1	03-04	4	\N
ddc4a4d7-b346-4687-89e7-aea8b5fa640a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	48be8768-3067-417b-b2bc-bd7d60f23ccf	CTIC6000	\N	TORRE DE ILUMINACION CIPSA AMARILLA 1	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.888	2026-08-07 02:49:10.888	1	1	03-12	4	\N
7b60cc81-e5e0-4764-bfc2-940c29bbacc6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	48be8768-3067-417b-b2bc-bd7d60f23ccf	CTIC6000	\N	TORRE DE ILUMINACION CIPSA GRIS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.89	2026-08-07 02:49:10.89	1	1	03-13	4	\N
3da17e40-1860-4418-b728-71d046f66211	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	236effd4-2c59-4773-9d8e-2f94c020906b	SCWKUB-60HZ-T4F	477923UHAAG08	TORRE DE ILUMINACION DOOSAN	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.892	2026-08-07 02:49:10.892	1	1	03-14	4	\N
f9b3c530-c0e1-4b86-82b5-1d8e55b5da25	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	d15a01b3-9ced-457e-9e9e-30296297c6aa	GP3300	\N	GENERADOR 3,300 TRUPER (NARANJA)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.893	2026-08-07 02:49:10.893	1	1	03-15	4	\N
88be25af-c6ca-477d-b53c-13c5ac9b5c89	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	AXQ1-200A	AZUL	GENERADOR 200A SOLDADOR MPOWER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.895	2026-08-07 02:49:10.895	1	1	03-17	4	\N
7d8d0c0a-375b-47fb-adf1-77af1a8d72f3	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	b900cacc-f794-409b-b4f1-6e85ae12c9a4	EDGE190DIESEL	JB/T9528-1999	GENERADOR SOLDADOR 190 HOGONG	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.897	2026-08-07 02:49:10.897	1	1	03-19	4	\N
f53e95ca-3e1b-4cdd-8eb8-b8d4c3c631ae	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	006d541f-4887-4a6d-bc5d-b883557ca4d9	FP8200K	\N	GENERADOR 200K FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.898	2026-08-07 02:49:10.898	1	1	03-20	4	\N
3563b74e-2f03-4841-8cc7-8b59721a278e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	006d541f-4887-4a6d-bc5d-b883557ca4d9	FP7000K	\N	GENERADOR 7,000K FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.899	2026-08-07 02:49:10.899	1	1	03-21	4	\N
fe30733d-c23e-4328-949e-b750ce8cb4e9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	d15a01b3-9ced-457e-9e9e-30296297c6aa	7,000W	\N	GENERADOR 7,000W TRUPER NARANJA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.901	2026-08-07 02:49:10.901	1	1	03-22	4	\N
14a8bcc4-557b-4040-a8c1-ebed07c0e7e6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	c70b38dd-40a8-4114-a826-d1f7e0d4dc2b	ELITE 225	NC510852R	GENERADOR HOBART 11,000 (RANGER)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.902	2026-08-07 02:49:10.902	1	1	03-23	4	\N
4e104b39-61c5-4054-83a4-1e8961078941	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	MPTI4500	MPTI0121000.1	TORRE DE ILUMINACION MPOWER GRIS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.903	2026-08-07 02:49:10.903	1	1	03-26	4	\N
a9384b6e-34a9-4440-a3d8-493bfd999a37	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	48be8768-3067-417b-b2bc-bd7d60f23ccf	CTIC6000	CTIC602407017	TORRE DE ILUMINACION CIPSA AMARILLA 2	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.905	2026-08-07 02:49:10.905	1	1	03-31	4	\N
71da1eea-3860-4863-8a40-cc9074fdc8b1	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	AXQ1-200AMP	MOTOR MPOWER	GENERADOR SOLDADOR MPOWER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.907	2026-08-07 02:49:10.907	1	1	03-32	4	\N
80789be7-e739-4ae8-aaab-f1ff8cd2b058	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	61254d1a-70ec-4295-85d4-5c23223470e5	DPK-DP-26	DPK202403509	GENERADOR DEPCO 23KVH	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.908	2026-08-07 02:49:10.908	1	1	03-33	4	\N
bccd1530-0692-47c4-bcbe-431dc06266b3	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	3500	AZUL-2	GENERADOR MPOWER 3500 PEQUEÑO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.91	2026-08-07 02:49:10.91	1	1	03-34	4	\N
bd207f5d-b3e3-47ce-b413-1ac7122f3bd4	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	3500	AZUL-3	GENERADOR MPOWER 3500 PEQUEÑO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.911	2026-08-07 02:49:10.911	1	1	03-35	4	\N
17cb090a-8822-43e8-82be-10daed4a4361	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	3500	AZUL-4	GENERADOR MPOWER 3500 PEQUEÑO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.912	2026-08-07 02:49:10.912	1	1	03-36	4	\N
adbcdb73-7ce3-47a7-8ccc-e40bd41ec697	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	12b5857f-a3b0-403a-bdd0-88126f96c094	CERTIFICADA	19 METROS	EXTENSION ELECTRICA CERTIFICADA 19 MTS.	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.913	2026-08-07 02:49:10.913	1	1	03-37	4	\N
50f4d2f2-e49e-422d-9f3a-b5be4ecaae78	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	12b5857f-a3b0-403a-bdd0-88126f96c094	CERTIFICADA	10.5 METROS	EXTENSION ELECTRICA CERTIFICADA 10.5 MTS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.915	2026-08-07 02:49:10.915	1	1	03-38	4	\N
382f79b2-fbb2-4654-9aaa-dd57330c5681	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	01b408dd-1a7f-40d3-bc0c-473041340c39	20fa75f4-1f13-486d-8cc8-d2becd41d104	AXQ1-200AMP	190FD-AXQ1-200A	GENERADOR SOLDADOE MPOWER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.916	2026-08-07 02:49:10.916	1	1	03-39	4	\N
3b3aa4db-294e-499e-8656-e8ec80d3742f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	20fa75f4-1f13-486d-8cc8-d2becd41d104	80WG	\N	BOMBAS TRAGA SOLIDO 3"MPOPWER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.917	2026-08-07 02:49:10.917	1	1	04-04	4	\N
b78bc41d-9434-4007-a0e3-a5f555f9d255	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	d019cc88-50f1-4a05-9f53-45ec046338fa	PWF2701SH	\N	HIDROLAVADORA 2700PSI POWER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.918	2026-08-07 02:49:10.918	1	1	04-05	4	\N
7f3f2705-6cf4-4987-a260-28cdfdad0cb5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	ab6a3020-75f3-4f45-8b6e-1e1c600c8ad1	HRHG 102	\N	HIDROESTATICA HELBERT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.919	2026-08-07 02:49:10.919	1	1	04-06	4	\N
f97743d6-b52f-4ca1-9fa7-8872e4da61ee	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	20fa75f4-1f13-486d-8cc8-d2becd41d104	HL3500/3500PSI	MOTOR MPOWER-2	HIDROLAVADORA  MPOPWER 3500PSI	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.92	2026-08-07 02:49:10.92	1	1	04-11	4	\N
608c579c-975d-4951-94b4-73bf3f0c0347	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	4966a7ab-2a92-4e1c-b7c7-4b40cbc9ce86	TP30 3001/3"	5121430025	BOMBAS TRAGA SOLIDO 3"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.922	2026-08-07 02:49:10.922	1	1	04-12	4	\N
f83f8df0-cf8f-49bc-b084-bb5b166c03b9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	38db2a57-d1d4-4a4c-a90c-3734c34d6650	IPOWER2700	PWF2701SH	HIDROLAVADORA IPOWER2700	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.924	2026-08-07 02:49:10.924	1	1	04-13	4	\N
aa19274b-a962-4277-993c-b569a797a9b8	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	1aebdbcc-4f4f-41ab-bb21-b067b28cbefb	TP3.0	5121430495	BOMBAS  DE AGUA DE  3" NUEVA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.926	2026-08-07 02:49:10.926	1	1	04-14	4	\N
77ef97f5-2c51-4ad1-9812-a79977f5ce8a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	6722129a-5844-4a85-a5b2-e8b5ad62070b	bf289e4e-b249-440a-8c69-3afbd9b84b1b	WT40HX	MOTOR GX390	BOMBA AGUA TRAGA SOLIDO 4"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.927	2026-08-07 02:49:10.927	1	1	04-15	4	\N
ba7e4ac4-9244-411f-9726-657dededce14	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	DW25980	027976	CHICHARRA ELECTRICA DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.928	2026-08-07 02:49:10.928	1	1	05-01	4	\N
617a09f7-c88b-442b-aae8-c4efd2e0ef3d	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	DW25980	030943	CHICHARRA ELECTRICA DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.929	2026-08-07 02:49:10.929	1	1	05-02	4	\N
20b6bd1b-3174-4387-a0aa-eca14a34f498	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	MARTILLO DEMOLEDOR FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.93	2026-08-07 02:49:10.93	1	1	05-04	4	\N
e804aa3f-d220-48c0-a0f4-a4ffc3538fb2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	2b30f088-1a42-419b-af8b-4bbe886e0fc8	5317-21	\N	ROTOMARTILLO DEMOLEDOR MILWAKEE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.931	2026-08-07 02:49:10.931	1	1	05-05	4	\N
dc6a0c7d-fd29-4528-81af-971303240372	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	DW25733	\N	ROTOMARTILLO DEMOLEDOR DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.932	2026-08-07 02:49:10.932	1	1	05-06	4	\N
2e1203c3-e7dc-4407-a7de-7039ca7af372	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	MARTILLO DEMOLEDOR FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.934	2026-08-07 02:49:10.934	1	1	05-07	4	\N
37ff333f-2960-42f8-a538-060ee4ea7073	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	59c45c04-27f6-4217-bb44-5ca7bcf1cdbd	74145	347192	ROTOMARTILLO TALADRO HILTI	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.935	2026-08-07 02:49:10.935	1	1	05-09	4	\N
750126ac-265e-4940-9456-30eec61dd2ae	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	MARTILLO DEMOLEDOR FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.936	2026-08-07 02:49:10.936	1	1	05-10	4	\N
cf7d73bd-715f-47a2-8bab-b03462fb7f89	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	01509cc9-1cf9-4c47-8ce8-9ef3ab0bf219	185KDPQCATT3	1000-3758	COMPRESOR SULLAIR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.937	2026-08-07 02:49:10.937	1	1	05-11	4	\N
ce146de3-df9e-40c8-b2c9-dff31fa96d95	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	01509cc9-1cf9-4c47-8ce8-9ef3ab0bf219	185KDPQCATT3	1000-3756	COMPRESOR SULLAIR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.938	2026-08-07 02:49:10.938	1	1	05-12	4	\N
b34d3c2d-dfd6-4261-a98d-0c4586bf0a54	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	HH20	ACEITE	CHICHARRA HIDRAULICA HYCON	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.939	2026-08-07 02:49:10.939	1	1	05-17	4	\N
33b8954e-00ab-4709-87a8-4d5b01b111b7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	SPB-30	\N	CHICHARRA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.94	2026-08-07 02:49:10.94	1	1	05-18	4	\N
572c449f-ee35-4e15-9cf9-e16d7b2143f6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	fd002215-fdf0-422e-9283-4928438c55a3	2"	\N	BROCA DE 2"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.941	2026-08-07 02:49:10.941	1	1	05-21	4	\N
269dac15-0021-4274-8a2b-468eba46e3cc	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	fd002215-fdf0-422e-9283-4928438c55a3	3"	\N	BROCA DE 3"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.942	2026-08-07 02:49:10.942	1	1	05-22	4	\N
58908349-d9d2-45cf-b05b-9a6aec5863f5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	fd002215-fdf0-422e-9283-4928438c55a3	4"	\N	BROCA DE 4"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.944	2026-08-07 02:49:10.944	1	1	05-23	4	\N
5b20186f-53c5-4238-afc6-16722ab10d21	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	fd002215-fdf0-422e-9283-4928438c55a3	5"	\N	BROCA DE 5"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.945	2026-08-07 02:49:10.945	1	1	05-24	4	\N
9ccf094c-bf19-4f4a-b234-48c0feb7c850	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	fd002215-fdf0-422e-9283-4928438c55a3	6"	\N	BROCA DE 6"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.946	2026-08-07 02:49:10.946	1	1	05-25	4	\N
261deac1-e6c1-4401-8db6-652b813a5a38	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	55e0b07a-a12c-4881-9e61-70ea7b42d1f3	CPS0.5	APP465458	COMPRESOR ATLAS COPCO (CHICAGO)	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.947	2026-08-07 02:49:10.947	1	1	05-27	4	\N
72cdce45-8fd3-4541-a7ea-a2df4f0cb107	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	d15a01b3-9ced-457e-9e9e-30296297c6aa	COMP-50LT	NUEVO	COMPRESOR PARA PINTAR TRUPER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.948	2026-08-07 02:49:10.948	1	1	05-30	4	\N
e27c70f8-c76a-40ab-85d9-209988b8f38f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	07a9e48c-9b91-4b8e-8ec3-c7ab51706c81	NEUMATIC	DEMOLICION	CHICHARRA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.949	2026-08-07 02:49:10.949	1	1	05-31	4	\N
a0fb508b-f598-4b91-a2b8-73f0aa4688bb	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	daf60176-0f27-4d0a-959b-4bba2225c1b4	3036	\N	TALADRO SACA NUCLEOS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.95	2026-08-07 02:49:10.95	1	1	05-32	4	\N
3506caf1-fe5c-4cfa-b7da-d28fd8af97d4	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	0079c5e6-04fc-4004-9762-60a7bee8c29b	D25980	STANLEY/DEWALT	CHICHARRA ELECTRICA STANLEY/DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.951	2026-08-07 02:49:10.951	1	1	05-33	4	\N
e87e0310-273a-4db1-bdcb-1e366a7bd656	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	MARTILLO DEMOLEDOR FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.952	2026-08-07 02:49:10.952	1	1	05-34	4	\N
c6c22dcb-95c0-4fe0-9fc6-b858f00e9e53	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	MARTILLO DEMOLEDOR FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.953	2026-08-07 02:49:10.953	1	1	05-35	4	\N
6748b064-7221-443f-bb01-fc0ebd54e684	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	SPB-30	\N	CHICHARRA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.955	2026-08-07 02:49:10.955	1	1	05-37	4	\N
9905ed9d-bfd7-44c5-86c7-e55bb7d86656	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	f54fb029-69af-4d8a-a83a-ca8f4167870f	SPB-30	\N	CHICHARRA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.956	2026-08-07 02:49:10.956	1	1	05-38	4	\N
846475ef-a527-4854-84ff-cfcd5b8e6309	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	2b30f088-1a42-419b-af8b-4bbe886e0fc8	4096	733C100241475	TALADRO SACA NUCLEOS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.957	2026-08-07 02:49:10.957	1	1	05-40	4	\N
70f84f3a-da64-49b9-a442-f42fc5a52904	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	0763d9ef-3e4b-467f-88cc-a83e183e00f1	CAUCHO REFORZADO	\N	MANGUERA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.957	2026-08-07 02:49:10.957	14	14	05-41	4	\N
81e200a7-10b6-49b4-b709-752e255eebbb	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	CHICHARRA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.958	2026-08-07 02:49:10.958	1	1	05-43	4	\N
52a5a161-d592-4c7e-bcc2-3dbf433ed438	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	D25712	302631	ROTOMARTILLO DEMOLEDOR DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.959	2026-08-07 02:49:10.959	1	1	05-45	4	\N
635e2586-030b-4920-bc74-fddc87cb21aa	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	12b5857f-a3b0-403a-bdd0-88126f96c094	SPB-30	\N	CHICHARRA NEUMATICA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.96	2026-08-07 02:49:10.96	1	1	05-46	4	\N
0910dc83-e699-463c-bd39-30950ed4474b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	3065	\N	MARTILLO DEMOLEDOR FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.961	2026-08-07 02:49:10.961	1	1	05-47	4	\N
b4417538-9831-4c25-aa48-0f94185b2cb7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	D25980	024803	CHICHARRA ELECTRICA DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.961	2026-08-07 02:49:10.961	1	1	05-48	4	\N
f4863c4a-039a-4db3-9b01-7a24d64a3422	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	59c45c04-27f6-4217-bb44-5ca7bcf1cdbd	TE-46	04-00011067	ROTOMARTILLO TALADRO HILTI	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.962	2026-08-07 02:49:10.962	1	1	05-49	4	\N
dac19e1e-69d8-4ed0-a09f-e3707683fcd2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	59c45c04-27f6-4217-bb44-5ca7bcf1cdbd	HILTI	ROJO	ROTOMARTILLO HILTI	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.963	2026-08-07 02:49:10.963	1	1	05-50	4	\N
ddd0cc3a-53f1-42ac-b25b-1b5a721a4ce0	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	b44a2f51-cf25-4e61-9645-c9613a85ac0c	3015	4400BMP	MARTILLO DEMOLEDOR FORCE PEQUEÑO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.963	2026-08-07 02:49:10.963	1	1	05-51	4	\N
651862e0-9e84-476c-b46b-d5b0953f21ab	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	47f946ba-925d-42ab-a2bf-4b02668f278e	001	10	PULIDORA MANUAL MAKITA GRANDE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.964	2026-08-07 02:49:10.964	1	1	05-53	4	\N
cb36d35b-6012-4b96-a303-157e4851d9bb	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	f54fb029-69af-4d8a-a83a-ca8f4167870f	S1777	010936	CHICHARRA NEUMATICA SULLIVAN	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.965	2026-08-07 02:49:10.965	1	1	05-54	4	\N
ffe1cdda-e46b-41c4-ac53-0ac4fb252613	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	f54fb029-69af-4d8a-a83a-ca8f4167870f	S1777	010934	CHICHARRA NEUMATICA SULLIVAN	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.966	2026-08-07 02:49:10.966	1	1	05-55	4	\N
6322f561-ef40-442b-b6a3-497562b2397c	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	f54fb029-69af-4d8a-a83a-ca8f4167870f	S1777	010937	CHICHARRA NEUMATICA SULLIVAN	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.967	2026-08-07 02:49:10.967	1	1	05-56	4	\N
be903051-bf1b-4fe8-abb1-e1b1c1f8ad8c	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	006d541f-4887-4a6d-bc5d-b883557ca4d9	TPB90	92LBS	CHICHARRA NEUMATICA FORCE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.968	2026-08-07 02:49:10.968	1	1	05-57	4	\N
6ed5d363-8230-4e02-9741-7223936437ce	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	D25980	033302	CHICHARRA ELECTRICA DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.968	2026-08-07 02:49:10.968	1	1	05-58	4	\N
b3576761-0018-4b47-b255-df0124f7a1a6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	448ead21-1100-4fe2-8997-9937159e2c22	D25980-B3	6488	CHICHARRA ELECTRICA DEWALT	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.97	2026-08-07 02:49:10.97	1	1	05-59	4	\N
57ebd3e7-5070-4342-8acd-b9b8667f32bb	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	1e6d29b2-818a-4866-8d07-e0210280eedf	1-1/2"	CONCRETO	BROCA DE CONCRETO 1-1/2"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.97	2026-08-07 02:49:10.97	1	1	05-60	4	\N
2d10eed2-181d-476f-bac0-e68e8dc14cf7	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	999479bf-7454-4248-8a17-7d107460bedd	4158eb02-6c3e-4511-876a-491401d3290c	DMS-240	20253310079	SACA NUCLEO HUSQVARNA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.971	2026-08-07 02:49:10.971	1	1	05-62	4	\N
8934488f-4db6-47f2-ae5c-ccb15b6ffce0	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	2MTS X 1.20MTS	\N	ANDAMIO INDUSTTRIAL	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.973	2026-08-07 02:49:10.973	20	20	06-01	4	\N
3ba21c4a-b293-4b4f-96ef-0604db316c05	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	1e6d29b2-818a-4866-8d07-e0210280eedf	2MTS X 2MTS	\N	ANDAMIO GRANDE	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.973	2026-08-07 02:49:10.973	4	4	06-02	4	\N
cba7670d-5076-4158-b7a5-5fc7fe4c87dc	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	1e6d29b2-818a-4866-8d07-e0210280eedf	1.50MTS X 1.70MTS	\N	ANDAMIO STANDAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.974	2026-08-07 02:49:10.974	1173	1173	06-03	4	\N
428749dd-9548-4cc4-a7af-09ef37ef7c2f	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	3X4	3X4	ANDAMIO DE CARGA 3 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.975	2026-08-07 02:49:10.975	18	18	06-32	4	\N
a52f95d6-fd82-4274-a00c-cb67af7b5cfa	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	4X4	4X4	ANDAMIO DE CARGA 4 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.976	2026-08-07 02:49:10.976	12	12	06-33	4	\N
38933da6-fd92-4688-93a0-38d90bdc1a08	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	5X4	5X4	ANDAMIO DE CARGA 5 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.977	2026-08-07 02:49:10.977	12	12	06-34	4	\N
63bef443-b16d-43f4-9f8d-394f3eed3a6e	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	6X4	6X4	ANDAMIO DE CARGA 6 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.977	2026-08-07 02:49:10.977	68	68	06-40	4	\N
749c5d0e-2669-4d71-bca4-f39e1988ae59	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	1e6d29b2-818a-4866-8d07-e0210280eedf	1.50 MTS LARGO	16"ANCHO	PLATAFORMA STANDAR	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.978	2026-08-07 02:49:10.978	192	192	06-05	4	\N
dcd97788-877f-49a4-94d2-425964390a93	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	6783295e-2ed3-459b-82d4-c3c2a460652f	STANDAR	\N	RODOS DE ANDAMIOS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.979	2026-08-07 02:49:10.979	110	110	06-07	4	\N
4cf61756-dcad-4351-9f54-b445769e0006	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	STANDAR	\N	ESCALERAS DE ANDAMIOS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.98	2026-08-07 02:49:10.98	19	19	06-08	4	\N
a0d4bd4b-bbab-48e1-ab31-e2c564d4a753	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	STANDAR	\N	NIVELADORES DE ANDAMIO DE 1-1/4"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.981	2026-08-07 02:49:10.981	50	50	06-09	4	\N
4760768f-1f10-4d05-9f2f-75760b2691b5	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	ab052fd1-fc62-4d95-883f-e3921c11c9c6	PE-OR 90 ANGLE	49779 12'A 24'	ESCALERA EXTENSIBLE DE FIBRA 12X24 PIES	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.982	2026-08-07 02:49:10.982	1	1	06-10	4	\N
31fab763-d1ef-449d-aeae-b9f31a665d22	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	DE CARGA	\N	NIVELADORES DE ANDAMIO DE CARGA DE 2"	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.983	2026-08-07 02:49:10.983	26	26	06-20	4	\N
838ea58e-ba81-4b5a-bc54-7d24a7605cb6	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	1e6d29b2-818a-4866-8d07-e0210280eedf	3-A	\N	ARNES DE SEGURIDAD	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.983	2026-08-07 02:49:10.983	8	8	06-25	4	\N
1cc4f222-63fc-4c1c-a0fb-1d635dd89834	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	006d541f-4887-4a6d-bc5d-b883557ca4d9	CERTIFICADO	GALVANIZADO	ANDAMIO CERTIFICADO GALVANIZADO 1.27X1.90	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.984	2026-08-07 02:49:10.984	102	102	06-26	4	\N
0969fc57-53c8-4b79-bd1a-d3be6498e213	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	006d541f-4887-4a6d-bc5d-b883557ca4d9	CERTIFICADO	GALVANIZADO-2	PLATAFORMA CERTIFICADA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.986	2026-08-07 02:49:10.986	14	14	06-28	4	\N
95b340a1-f530-4007-9409-a603ac43e90a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	b44a2f51-cf25-4e61-9645-c9613a85ac0c	VFORCE	VFORCE	RODOS DE ANDAMIO CERTIFICADO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.988	2026-08-07 02:49:10.988	12	12	06-29	4	\N
0622b411-9d01-402c-a89f-20b2c11791be	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	b44a2f51-cf25-4e61-9645-c9613a85ac0c	300 LBS	RETRACTIL	LINEAS DE VIDA RETRACTIL 300 LBS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.989	2026-08-07 02:49:10.989	3	3	06-31	4	\N
102bfb7b-b672-427a-8994-5a3ef59de4a0	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	PLATO	BASE	PLATO BASE DE ANDAMIOS DE CARGA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.991	2026-08-07 02:49:10.991	21	21	06-35	4	\N
3c9575c7-e8eb-40af-9088-f3b5e56b4f21	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	df37a60f-4932-4a21-9ce9-e3c69898ee4e	c56d108e-5512-4ec6-91d8-77f8802d098f	2X2	2X2	PRENSA PARA ANDAMIOS	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.992	2026-08-07 02:49:10.992	10	10	06-42	4	\N
99590d8e-fa9c-4d11-9a62-15c919cd7dd9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	b44a2f51-cf25-4e61-9645-c9613a85ac0c	LUX OFICE	6MX3.1MX2.8M	CONTENEDOR  OFICINA 20 PIES CLIMATIZADO.	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.994	2026-08-07 02:49:10.994	1	1	07-47	4	\N
73d60dcf-5bb5-4eeb-b7c5-caa7885747b2	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	f5875f65-d150-4b20-a410-77541f71b907	91971bc3-3e59-4c53-a46b-9e5ce22402d7	236D3	F9C01527	BOBCAT MINI CARGADOR AMARILLO.	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.995	2026-08-07 02:49:10.995	1	1	08-01	4	\N
cb56df65-a99c-492b-8065-dac0d3068f12	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	f5875f65-d150-4b20-a410-77541f71b907	650738ab-ef13-4823-a2a8-7249149a71fc	MR406	RDV00400EN0501188	RETROEXCAVADORA BACKHOE MULLER	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.996	2026-08-07 02:49:10.996	1	1	08-02	4	\N
abef9994-550e-49f1-9a5b-f5d63c613cde	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	f5875f65-d150-4b20-a410-77541f71b907	79ed14fe-fdea-4901-b55d-04d03a463f10	S570	B5N311233	BOBCAT MINI CARGADOR BLANCO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.998	2026-08-07 02:49:10.998	1	1	08-03	4	\N
1a5f2f68-cb4d-4036-bdd5-eb9a2a382c4a	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	f5875f65-d150-4b20-a410-77541f71b907	653e9ee1-cb4b-4bad-a76f-bf7a2da6f343	3CX	SD320/45064H00489540	RETROEXCAVADORABACKHOE JCB	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:10.999	2026-08-07 02:49:10.999	1	1	08-04	4	\N
7e771a98-b518-4ef0-92fc-78160b9a3878	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	7cf83b2d-d347-4b90-bbb4-8685519d57d6	H100/403017	D4BBR001488	CAMION H100 HYUNDAI BLANCO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:11	2026-08-07 02:49:11	1	1	07-49	4	\N
5622507f-6b32-4860-8ec4-65a92cc36823	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	16326f37-2c6e-49bb-88b2-7bd0e7fa6cdb	4900-4X2/255090	468TM2U595917	CAMION INTERNACIONAL ROJO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:11.001	2026-08-07 02:49:11.001	1	1	07-50	4	\N
eba57e1d-4c60-461b-a41c-bcb07ea65136	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	dbcdb2c9-54c0-45ce-8ba7-51adebf43297	FL-70/376458	60242212	CAMION FREIGHTLINER, BLANCO/NARANJA	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:11.002	2026-08-07 02:49:11.002	1	1	07-51	4	\N
c4e06e29-31f2-48de-af40-2e0a09c58cbf	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	7cf83b2d-d347-4b90-bbb4-8685519d57d6	H100/394532	D4BBP015155	CAMION H100 HYUNDAI BLANCO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:11.003	2026-08-07 02:49:11.003	1	1	07-52	4	\N
63567e29-27fc-4458-afc0-4eb73183e04b	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	7cf83b2d-d347-4b90-bbb4-8685519d57d6	CARGO/462344	D4DCSD402929	CAMION HYUNDAI MIGHTY	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:11.004	2026-08-07 02:49:11.004	1	1	07-53	4	\N
0bf2835e-bb02-43d2-b70b-a7c4e3172065	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	003eafc6-be96-48e7-85af-5568c4d45d78	16326f37-2c6e-49bb-88b2-7bd0e7fa6cdb	4300DT466/455748	466HM2U2012831	CAMION INTERNACIONAL BLANCO	DISPONIBLE	0	0	\N	\N	2026-08-07 02:49:11.006	2026-08-07 02:49:11.006	1	1	07-54	4	\N
\.


--
-- Data for Name: facturas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facturas (id, cliente_id, contrato_id, folio, fecha_emision, fecha_vence, estado, subtotal, iva, total, pdf_url, xml_url, condicion_pago, corte_numero, descuento_global, factura_padre_id, plazo_credito_dias, retencion_iva, tipo_factura) FROM stdin;
02b215f9-0b93-4ce0-bd9f-702bd9d87352	321c03cd-e3a3-4159-a618-4a5d1930b24b	6135c84a-ae27-415f-a661-53cb1122799c	FAC-12531	2026-08-07 11:11:12.775	2026-08-07 11:11:12.773	PAGADA	200	30	230	\N	\N	CONTADO	\N	0	\N	\N	0	ESTANDAR
d0895a03-e81a-4603-88c1-fc492110f9c7	395d67c1-53a8-4740-96e9-9fb103ac6bb9	3b7f72ef-9693-448a-a07b-015f782c792a	FAC-97144	2026-08-07 11:19:44.251	2026-08-07 11:19:44.249	PAGADA	200	30	230	\N	\N	CONTADO	\N	0	\N	0	0	ESTANDAR
\.


--
-- Data for Name: mantenimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mantenimientos (id, equipo_id, tipo, estado, fecha_programacion, fecha_ejecucion, horometro_servicio, descripcion, costo, insumos_utilizados, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marcas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marcas (id, nombre) FROM stdin;
c3f01562-63af-4f89-b961-ac383fcc58e2	Caterpillar
226b374e-24fb-4c96-856c-f6064c2572e7	John Deere
93f0eec1-6bfd-4fc9-89f6-54be0b3c6eed	JLG
d2eb6896-d3f8-4c3a-a1ba-6092afcf9ae0	Bobcat
75bac833-96b2-4e53-8018-d55af171a7b6	Komatsu
c8734c1a-97bf-44a5-888e-9b4b9bb04a43	Genie
14ae5cce-d3b0-48a2-831f-6140db9095d4	Cummins
89d527b7-3ea0-4ac8-bb7d-513a96d10a4a	MASALTA
9b07acf2-38c4-45c8-b243-9423e5d5789b	WAKER NEUSON
f681dc69-c86b-4b0b-91f9-6d6d476f0f0c	MBW
289b4da0-7c46-4b88-a1e6-5be78b6039d0	SIMAQ
8e6baede-b788-4301-b49d-1f29e7eda69d	ENAR
d6d971a2-0ff2-4273-8d1e-2485a2b233e6	MIKASA
0079c5e6-04fc-4004-9762-60a7bee8c29b	STANLEY
48be8768-3067-417b-b2bc-bd7d60f23ccf	CIPSA
20fa75f4-1f13-486d-8cc8-d2becd41d104	MPOWER
4158eb02-6c3e-4511-876a-491401d3290c	HUSQVARNA
653e9ee1-cb4b-4bad-a76f-bf7a2da6f343	JCB
0b620aae-b7ba-4888-8471-ff532b693b35	WEBER
f8a7004e-139e-4b42-8179-128fe54f188f	JOPER
12b5857f-a3b0-403a-bdd0-88126f96c094	N/D
59c45c04-27f6-4217-bb44-5ca7bcf1cdbd	HILTI
c56d108e-5512-4ec6-91d8-77f8802d098f	SWYMONS
7d6251eb-d839-4daf-9fc7-3914955811d6	CUPRUM
9b57a93b-2831-4d93-b7a4-da637e22e4be	INCO
b0f001a0-99f6-49a4-aa24-c16a4ec803cf	LOUSVILLE
ab052fd1-fc62-4d95-883f-e3921c11c9c6	STRONGWELL
367abd20-a155-4239-bbc4-07ddf7b236ca	LINCOLN ELECTRIC
236effd4-2c59-4773-9d8e-2f94c020906b	DOOSAN
d15a01b3-9ced-457e-9e9e-30296297c6aa	TRUPER
b900cacc-f794-409b-b4f1-6e85ae12c9a4	HOGONG
006d541f-4887-4a6d-bc5d-b883557ca4d9	FORCE
c70b38dd-40a8-4114-a826-d1f7e0d4dc2b	HOBART
61254d1a-70ec-4295-85d4-5c23223470e5	DEPCO
d019cc88-50f1-4a05-9f53-45ec046338fa	POWER
ab6a3020-75f3-4f45-8b6e-1e1c600c8ad1	HELBERT
4966a7ab-2a92-4e1c-b7c7-4b40cbc9ce86	KOHLER
38db2a57-d1d4-4a4c-a90c-3734c34d6650	IPOWER
1aebdbcc-4f4f-41ab-bb21-b067b28cbefb	EMPOWER
bf289e4e-b249-440a-8c69-3afbd9b84b1b	HONDA
448ead21-1100-4fe2-8997-9937159e2c22	DEWALT
2b30f088-1a42-419b-af8b-4bbe886e0fc8	MILWAKEE
01509cc9-1cf9-4c47-8ce8-9ef3ab0bf219	SULLAIR
fd002215-fdf0-422e-9283-4928438c55a3	HOTECHE
55e0b07a-a12c-4881-9e61-70ea7b42d1f3	ATLAS COPCO
07a9e48c-9b91-4b8e-8ec3-c7ab51706c81	CHICAGO
daf60176-0f27-4d0a-959b-4bba2225c1b4	FERTON
f54fb029-69af-4d8a-a83a-ca8f4167870f	SULLIVAN
0763d9ef-3e4b-467f-88cc-a83e183e00f1	RTI/GOOYEAR
b44a2f51-cf25-4e61-9645-c9613a85ac0c	VFORCE
47f946ba-925d-42ab-a2bf-4b02668f278e	MAKITA
1e6d29b2-818a-4866-8d07-e0210280eedf	BMC
6783295e-2ed3-459b-82d4-c3c2a460652f	RTI
91971bc3-3e59-4c53-a46b-9e5ce22402d7	CATERPILLAR
650738ab-ef13-4823-a2a8-7249149a71fc	MULLER
79ed14fe-fdea-4901-b55d-04d03a463f10	BOBCAT
7cf83b2d-d347-4b90-bbb4-8685519d57d6	HYUNDAI
16326f37-2c6e-49bb-88b2-7bd0e7fa6cdb	INTERNACIONAL
dbcdb2c9-54c0-45ce-8ba7-51adebf43297	FREIGHTLINER
b000f11d-c884-47d3-bf4c-3b26efd0aafc	GENÉRICO
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificaciones (id, cliente_id, evento, canal, destino, asunto, mensaje, estado, token_publico, fecha_envio, error, created_at) FROM stdin;
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos (id, factura_id, monto, fecha_pago, metodo, referencia, comprobante_url, created_at) FROM stdin;
\.


--
-- Data for Name: permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permisos (id, codigo, descripcion) FROM stdin;
68dfb026-a66f-4cb6-8804-66598849c2d4	CLIENT.CREATE	Crear nuevos clientes
ae2466b1-f600-418b-b6be-bd60f8d10d73	CLIENT.UPDATE	Editar clientes existentes
40cfd269-c72e-4e73-8a89-2b19586d5cbb	CLIENT.VIEW	Ver catálogo de clientes
ea1c800e-8776-4e3e-8d6c-b4bda932e5fc	QUOTE.CREATE	Crear cotizaciones
9ba89866-d731-4615-ab7f-3e958e115733	QUOTE.APPROVE	Aprobar cotizaciones comercialmente
416d5f06-3d4d-4f2b-b1d5-cbecbd085ace	CONTRACT.CREATE	Generar contratos de renta
a7284118-46b0-4ba4-80ab-102a52e9babc	INVENTORY.CREATE	Dar de alta maquinaria
755e4a8b-7981-4ec0-b0fc-efaa2cacf3d7	INVENTORY.VIEW	Ver inventario y disponibilidad
172043cf-960d-4c7c-bea3-1ed27dcb9b0d	DISPATCH.CREATE	Registrar despachos de equipos
dc1866b0-13ef-45a2-a73f-fe65c00f8cf7	RETURN.CREATE	Registrar devolución de equipos
d5dac051-c3b9-4d26-8beb-506c46208e04	REPORT.EXPORT	Exportar reportes de negocio
\.


--
-- Data for Name: reservas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservas (id, contrato_id, equipo_id, fecha_inicio, fecha_fin, estado, created_at) FROM stdin;
5451954a-a72d-4db3-9309-2a999bb29ca6	3b7f72ef-9693-448a-a07b-015f782c792a	102bfb7b-b672-427a-8994-5a3ef59de4a0	2026-08-07 11:19:44.24	2026-08-07 11:19:44.24	CONFIRMADA	2026-08-07 11:19:44.246
\.


--
-- Data for Name: rol_permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rol_permisos (rol_id, permiso_id) FROM stdin;
be5bd07a-2d53-422f-b535-72633447b8a3	68dfb026-a66f-4cb6-8804-66598849c2d4
be5bd07a-2d53-422f-b535-72633447b8a3	ae2466b1-f600-418b-b6be-bd60f8d10d73
be5bd07a-2d53-422f-b535-72633447b8a3	40cfd269-c72e-4e73-8a89-2b19586d5cbb
be5bd07a-2d53-422f-b535-72633447b8a3	ea1c800e-8776-4e3e-8d6c-b4bda932e5fc
be5bd07a-2d53-422f-b535-72633447b8a3	9ba89866-d731-4615-ab7f-3e958e115733
be5bd07a-2d53-422f-b535-72633447b8a3	416d5f06-3d4d-4f2b-b1d5-cbecbd085ace
be5bd07a-2d53-422f-b535-72633447b8a3	a7284118-46b0-4ba4-80ab-102a52e9babc
be5bd07a-2d53-422f-b535-72633447b8a3	755e4a8b-7981-4ec0-b0fc-efaa2cacf3d7
be5bd07a-2d53-422f-b535-72633447b8a3	172043cf-960d-4c7c-bea3-1ed27dcb9b0d
be5bd07a-2d53-422f-b535-72633447b8a3	dc1866b0-13ef-45a2-a73f-fe65c00f8cf7
be5bd07a-2d53-422f-b535-72633447b8a3	d5dac051-c3b9-4d26-8beb-506c46208e04
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion) FROM stdin;
be5bd07a-2d53-422f-b535-72633447b8a3	ADMIN	Administrador del sistema con acceso total
\.


--
-- Data for Name: solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitudes (id, cliente_id, fecha_uso, duracion_dias, comentarios, estado, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sucursales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sucursales (id, empresa_id, nombre, codigo, direccion, telefono, created_at, updated_at) FROM stdin;
a98976b2-12ba-4995-a541-6526e0e68405	fedb4b05-e281-4956-9367-5a0530976e60	Sucursal Central Nicaragua	SUC-CENTRAL	Av. Constituyentes 500, Lomas de Chapultepec	5559876543	2026-07-24 01:20:52.087	2026-07-24 04:50:50.605
\.


--
-- Data for Name: usuario_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_roles (usuario_id, rol_id) FROM stdin;
7fd60f03-b970-4558-9bb6-afef3d9dd3e9	be5bd07a-2d53-422f-b535-72633447b8a3
18ffb8d8-8458-4a93-baa3-5c8bf38fe492	be5bd07a-2d53-422f-b535-72633447b8a3
e03aa61d-65cd-41a1-becd-0f85234bacf8	be5bd07a-2d53-422f-b535-72633447b8a3
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, empresa_id, sucursal_id, email, password, nombre, apellido, activo, created_at, updated_at, bloqueado, intentos_fallidos, requiere_cambio_password) FROM stdin;
7fd60f03-b970-4558-9bb6-afef3d9dd3e9	fedb4b05-e281-4956-9367-5a0530976e60	a98976b2-12ba-4995-a541-6526e0e68405	admin@rental.com	$argon2id$v=19$m=65536,p=4,t=3$FiWV7JOd49gtK2JNFPed6w$61/71O+CVtxbKbQRHgAkoBHrdLst0jxVvKQrvND4onE	Administrador	Principal	t	2026-07-24 01:20:52.26	2026-07-24 01:20:52.26	f	0	f
18ffb8d8-8458-4a93-baa3-5c8bf38fe492	fedb4b05-e281-4956-9367-5a0530976e60	\N	prueba@gmail.com	$argon2id$v=19$m=65536,p=4,t=3$trI9PP9RKfrGAmEeg2+C8A$Gg8XSe9yg2Itzb4CN2uQc9l6xm27+d5e8/9uHqCbs0k	Ervin	lopeez	t	2026-07-24 02:13:13.982	2026-07-24 02:28:53.711	f	0	f
e03aa61d-65cd-41a1-becd-0f85234bacf8	fedb4b05-e281-4956-9367-5a0530976e60	\N	preuba2@gmail.com	$argon2id$v=19$m=65536,p=4,t=3$ZZpZzHBCtKils6Q4nJBlCw$MGZuVvj6A7dTKZ+JtSJYQbNAvnn8AfI+ie+2jEwnbco	Roger	Ortiz	t	2026-07-24 02:28:48.138	2026-07-24 02:31:24.568	f	0	f
ea17a74c-d056-45e5-ad99-dc7a9aeb74e3	fedb4b05-e281-4956-9367-5a0530976e60	\N	abdiasl085@gmail.com	$argon2id$v=19$m=65536,p=4,t=3$G/k0BGStLjE+ueQnlWFZQg$TxbqKHSZc+XdLgApj5vunt/D6G08OtD3eYMC+ZZltcY	Prueba	1	t	2026-07-24 04:46:27.576	2026-07-24 04:46:27.576	f	0	f
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: auditorias auditorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: contactos_cliente contactos_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contactos_cliente
    ADD CONSTRAINT contactos_cliente_pkey PRIMARY KEY (id);


--
-- Name: contratos contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);


--
-- Name: cotizaciones cotizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_pkey PRIMARY KEY (id);


--
-- Name: despachos despachos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_pkey PRIMARY KEY (id);


--
-- Name: detalle_contratos detalle_contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_contratos
    ADD CONSTRAINT detalle_contratos_pkey PRIMARY KEY (id);


--
-- Name: detalle_cotizacion detalle_cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_pkey PRIMARY KEY (id);


--
-- Name: detalle_despacho detalle_despacho_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_despacho
    ADD CONSTRAINT detalle_despacho_pkey PRIMARY KEY (id);


--
-- Name: detalle_devolucion detalle_devolucion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_pkey PRIMARY KEY (id);


--
-- Name: devoluciones devoluciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: equipos equipos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_pkey PRIMARY KEY (id);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- Name: mantenimientos mantenimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_pkey PRIMARY KEY (id);


--
-- Name: marcas marcas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marcas
    ADD CONSTRAINT marcas_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: reservas reservas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT reservas_pkey PRIMARY KEY (id);


--
-- Name: rol_permisos rol_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: solicitudes solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_pkey PRIMARY KEY (id);


--
-- Name: sucursales sucursales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id);


--
-- Name: usuario_roles usuario_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_pkey PRIMARY KEY (usuario_id, rol_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: categorias_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categorias_nombre_key ON public.categorias USING btree (nombre);


--
-- Name: contactos_cliente_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contactos_cliente_email_key ON public.contactos_cliente USING btree (email);


--
-- Name: contratos_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contratos_codigo_key ON public.contratos USING btree (codigo);


--
-- Name: cotizaciones_token_publico_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cotizaciones_token_publico_key ON public.cotizaciones USING btree (token_publico);


--
-- Name: empresas_rfc_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX empresas_rfc_key ON public.empresas USING btree (rfc);


--
-- Name: equipos_numero_serie_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX equipos_numero_serie_key ON public.equipos USING btree (numero_serie);


--
-- Name: facturas_folio_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX facturas_folio_key ON public.facturas USING btree (folio);


--
-- Name: marcas_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX marcas_nombre_key ON public.marcas USING btree (nombre);


--
-- Name: permisos_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permisos_codigo_key ON public.permisos USING btree (codigo);


--
-- Name: roles_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_nombre_key ON public.roles USING btree (nombre);


--
-- Name: sucursales_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sucursales_codigo_key ON public.sucursales USING btree (codigo);


--
-- Name: usuarios_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);


--
-- Name: auditorias auditorias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clientes clientes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contactos_cliente contactos_cliente_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contactos_cliente
    ADD CONSTRAINT contactos_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contratos contratos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contratos contratos_cotizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contratos contratos_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cotizaciones cotizaciones_asesor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_asesor_id_fkey FOREIGN KEY (asesor_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cotizaciones cotizaciones_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: despachos despachos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: despachos despachos_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_contratos detalle_contratos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_contratos
    ADD CONSTRAINT detalle_contratos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_contratos detalle_contratos_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_contratos
    ADD CONSTRAINT detalle_contratos_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_cotizacion detalle_cotizacion_cotizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_cotizacion detalle_cotizacion_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: detalle_despacho detalle_despacho_despacho_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_despacho
    ADD CONSTRAINT detalle_despacho_despacho_id_fkey FOREIGN KEY (despacho_id) REFERENCES public.despachos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_despacho detalle_despacho_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_despacho
    ADD CONSTRAINT detalle_despacho_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_devolucion detalle_devolucion_devolucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_devolucion_id_fkey FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_devolucion detalle_devolucion_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devoluciones devoluciones_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devoluciones devoluciones_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipos equipos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipos equipos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipos equipos_marca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES public.marcas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipos equipos_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facturas facturas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facturas facturas_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facturas facturas_factura_padre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_factura_padre_id_fkey FOREIGN KEY (factura_padre_id) REFERENCES public.facturas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mantenimientos mantenimientos_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notificaciones notificaciones_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagos pagos_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reservas reservas_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT reservas_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reservas reservas_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT reservas_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rol_permisos rol_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rol_permisos rol_permisos_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: solicitudes solicitudes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sucursales sucursales_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuario_roles usuario_roles_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuario_roles usuario_roles_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios usuarios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usuarios usuarios_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict ozgcxS0WGFyXTwbJgJMscJST0VLXuCjUCAMYOmgqTiOQmm6xZltAxvsEon8RVan


/*
-----------------------
| CREAR BASE DE DATOS |
-----------------------
*/

-- create database cardenal_go;


/*
-------------------------------
| HABILITAR EXTENSIÓN POSTGIS |
-------------------------------
*/

create extension if not exists postgis;


/*
----------------------------------------------------
| CREAR ESQUEMAS DE LAS TABLAS DE LA BASE DE DATOS |
----------------------------------------------------
*/

create schema cgo_aud;
create schema cgo_cat;
create schema cgo_usu;
create schema cgo_via;
create schema cgo_soc;
create schema cgo_adm;
create schema cgo_not;


/*
--------------------------------------
| CREAR TABLA Y TRIGGER DE AUDITORÍA |
--------------------------------------
*/

-- ALMACENAR EL HISTORIAL DE CAMBIOS DE TODA LA BASE DE DATOS
create table cgo_aud.auditoria(
    id bigint generated always as identity primary key,
    nombre_tabla varchar(100) not null,
    id_registro bigint not null,
    accion varchar(10) not null check(accion in ('insert', 'update', 'delete')),
    datos_antiguos jsonb,
    datos_nuevos jsonb,
    usuario_bd varchar(100) not null default current_user,
    fecha_hora_registro timestamptz(3) not null default now()
);

-- TRIGGER DE AUDITORÍA
create or replace function cgo_aud.fn_auditoria() returns trigger as $$
declare
    v_id_registro bigint;
    v_datos_antiguos jsonb;
    v_datos_nuevos jsonb;
begin
    if (tg_op = 'UPDATE' or tg_op = 'DELETE') then
        v_datos_antiguos := to_jsonb(old);
        v_id_registro := (v_datos_antiguos->>'id')::bigint;
    end if;
    if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
        v_datos_nuevos := to_jsonb(new);
        v_id_registro := (v_datos_nuevos->>'id')::bigint;
    end if;
    insert into cgo_aud.auditoria(
        nombre_tabla, 
        id_registro, 
        accion, 
        datos_antiguos, 
        datos_nuevos
    )
    values(
        tg_table_schema || '.' || tg_table_name,
        coalesce(v_id_registro, 0),
        lower(tg_op),
        v_datos_antiguos,
        v_datos_nuevos
    );
    if (tg_op = 'DELETE') then
        return old;
    else
        return new;
    end if;
end;
$$ language plpgsql;


/*
---------------------------------
| CREAR TABLAS DE TIPO CATÁLOGO |
---------------------------------
*/

-- ALMACENAR LOS ROLES DEL SISTEMA
create table cgo_cat.roles(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENAR LOS MÉTODOS DE PAGO DE LOS VIAJES
create table cgo_cat.metodos_pago(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null
);

-- ALMACENAR LOS ESTATUS DE LOS VIAJES
create table cgo_cat.estatus_viajes(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENAR LOS ESTATUS DE LAS SOLICITUDES DE VIAJES (PASAJERO - CONDUCTOR)
create table cgo_cat.estatus_solicitudes(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENAR LOS MOTIVOS DE LOS REPORTES DE LOS USUARIOS
create table cgo_cat.motivos_reportes(
    id smallint generated always as identity primary key,
    nombre varchar(50) unique not null,
    gravedad smallint not null check(gravedad between 1 and 10)
);

-- ALMACENAR LOS ESTATUS DE LOS REPORTES DE LOS USUARIOS
create table cgo_cat.estatus_reportes(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENAR LOS ESTATUS DE LOS USUARIOS ENTRE SÍ (EN EL SENTIDO SOCIAL)
create table cgo_cat.estatus_sociales(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null
);

-- ALMACENAR LOS TIPOS DE CHATS DEL SISTEMA
create table cgo_cat.tipos_chats(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null
);

-- ALMACENAR LOS ESTATUS DE LOS USUARIOS (INCLUYE SANCIONES POR MALA CONDUCTA)
create table cgo_cat.estatus_usuarios(
    id smallint generated always as identity primary key,
    nombre varchar(50) unique not null,
    dias_sancion smallint
);

-- ALMACENAR LOS TIPOS DE NOTIFICACIONES DEL SISTEMA
create table cgo_cat.tipos_notificaciones(
    id smallint generated always as identity primary key,
    nombre varchar(50) unique not null
);

-- ALMACENAR LOS ESTATUS DE LOS PAGOS Y TRANSFERENCIAS FINANCIERAS
create table cgo_cat.estatus_pagos(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);


/*
----------------------------
| CREAR TABLAS DE USUARIOS |
----------------------------
*/

-- ALMACENAR LA INFORMACIÓN DE LOS USUARIOS (CONDUCTORES, PASAJEROS Y ADMINISTRADORES)
create table cgo_usu.usuarios(
    id int generated always as identity primary key,
    nombre_completo varchar(255) not null,
    matricula varchar(9) unique not null check(length(matricula) = 9),
    correo_institucional varchar(100) unique not null check(correo_institucional like '%_@upq.edu.mx'),
    contrasena_hash varchar(255) not null,
    url_foto_perfil varchar(255) not null default 'cardenal_upq.png',
    calificacion_pasajero numeric(3, 2) default 5.00 check(calificacion_pasajero between 1.00 and 5.00),
    calificacion_conductor numeric(3, 2) default 5.00 check(calificacion_conductor between 1.00 and 5.00),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENAR LOS ROLES Y ESTATUS DE LOS USUARIOS
create table cgo_usu.roles_usuarios(
    id_usuario int not null references cgo_usu.usuarios(id) on update cascade,
    id_rol smallint not null references cgo_cat.roles(id) default 1,
    id_estatus smallint not null references cgo_cat.estatus_usuarios(id) default 1,
    primary key(id_usuario, id_rol)
);

-- ALMACENAR LA INFORMACIÓN DEL USUARIO (SI DECIDE SER CONDUCTOR)
create table cgo_usu.conductores(
    id int generated always as identity primary key,
    id_usuario int unique not null references cgo_usu.usuarios(id) on update cascade,
    telefono varchar(20) not null,
    licencia_conducir varchar(50) unique not null,
    url_foto_ine varchar(255) not null,
    ine_valida boolean default false,
    clabe_interbancaria varchar(18) check(clabe_interbancaria ~ '^[0-9]{18}$'),
    nombre_banco varchar(50),
    nombre_titular_cuenta varchar(255),
    id_cuenta_pasarela varchar(255),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENAR LA INFORMACIÓN DE LOS VEHÍCULOS DE LOS CONDUCTORES
create table cgo_usu.vehiculos(
    id int generated always as identity primary key,
    id_conductor int not null references cgo_usu.conductores(id) on update cascade,
    placa varchar(15) unique not null,
    color varchar(30) not null,
    modelo varchar(50) not null,
    anio smallint check(anio > 1990 and anio <= extract(year from now())::int + 1),
    fotos jsonb not null,
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENAR LA INFORMACIÓN NO SENSIBLE DE LAS TARJETAS DE LOS PASAJEROS
create table cgo_usu.tarjetas_pasajeros(
    id int generated always as identity primary key,
    id_usuario int not null references cgo_usu.usuarios(id) on update cascade,
    id_cliente_pasarela varchar(255) not null,
    token_pasarela varchar(255) not null,
    ultimos_cuatro_digitos char(4) not null check(ultimos_cuatro_digitos ~ '^[0-9]{4}$'),
    marca varchar(20) not null,
    es_favorita boolean default false,
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
----------------------------------------
| CREAR TABLAS DE VIAJES Y SOLICITUDES |
----------------------------------------
*/

-- ALMACENAR LA PUBLICACIÓN DE VIAJES DE LOS CONDUCTORES
create table cgo_via.viajes(
    id int generated always as identity primary key,
    id_vehiculo int not null references cgo_usu.vehiculos(id),
    id_estatus smallint not null references cgo_cat.estatus_viajes(id),
    ubicacion_inicio geometry(Point, 4326) not null,
    ubicacion_destino geometry(Point, 4326) not null,
    ruta_sugerida jsonb,
    fecha date not null,
    hora_inicio time not null,
    asientos_totales smallint not null check(asientos_totales > 0),
    asientos_disponibles smallint not null check(asientos_disponibles >= 0 and asientos_disponibles <= asientos_totales),
    fecha_hora_registro timestamptz(3) not null default now()
);
create index idx_viaje_ubicacion_inicio on cgo_via.viajes using gist(ubicacion_inicio);
create index idx_viaje_ubicacion_destino on cgo_via.viajes using gist(ubicacion_destino);

-- ALMACENAR LAS PARADAS INTERMEDIAS DE LA RUTA
create table cgo_via.paradas_viaje(
    id bigint generated always as identity primary key,
    id_viaje int not null references cgo_via.viajes(id),
    orden smallint not null,
    latitud numeric(10, 8) not null,
    longitud numeric(10, 8) not null
);
create index idx_paradas_viaje on cgo_via.paradas_viaje(id_viaje);

-- ALMACENAR LAS SOLICITUDES O RESERVAS DE VIAJES DE LOS PASAJEROS
create table cgo_via.solicitudes_viajes(
    id int generated always as identity primary key,
    id_viaje int not null references cgo_via.viajes(id),
    id_pasajero int not null references cgo_usu.usuarios(id),
    id_metodo_pago smallint not null references cgo_cat.metodos_pago(id),
    id_estatus smallint not null references cgo_cat.estatus_solicitudes(id),
    ubicacion_recogida geometry(Point, 4326) not null,
    ubicacion_bajada geometry(Point, 4326) not null,
    desvio_metros numeric(8, 2) not null check(desvio_metros >= 0.00),
    precio numeric(10, 2) not null check(precio >= 0),
    notas_adicionales varchar(255),
    es_grupal boolean default false,
    url_grupo varchar(255) unique,
    fecha_hora_registro timestamptz(3) not null default now()
);
create index idx_solicitudes_ubicacion_recogida on cgo_via.solicitudes_viajes using gist(ubicacion_recogida);
create index idx_solicitudes_ubicacion_bajada on cgo_via.solicitudes_viajes using gist(ubicacion_bajada);

-- ALMACENAR LOS REGISTROS DE LOS PAGOS Y TRANSFERENCIAS SPEI DE LOS PASAJEROS A LOS CONDUCTORES
create table cgo_via.pagos_transferencias(
    id bigint generated always as identity primary key,
    id_solicitud int not null references cgo_via.solicitudes_viajes(id),
    id_pasajero int not null references cgo_usu.usuarios(id),
    id_conductor int not null references cgo_usu.conductores(id),
    id_estatus_pago smallint not null references cgo_cat.estatus_pagos(id),
    id_transaccion_pasarela varchar(255) unique not null,
    monto_total numeric(10, 2) not null check(monto_total > 0),
    comision_plataforma numeric(10, 2) not null default 0.00 check(comision_plataforma >= 0),
    monto_neto_conductor numeric(10, 2) not null check(monto_neto_conductor > 0),
    check(monto_neto_conductor = monto_total - comision_plataforma),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENAR EL HISTORIAL DE UBICACIONES EN VIVO DE LOS VIAJES EN CURSO
create table cgo_via.historial_ubicaciones_viaje(
    id bigint generated always as identity primary key,
    id_viaje int not null references cgo_via.viajes(id),
    ubicacion geometry(Point, 4326) not null,
    velocidad_kmh smallint check(velocidad_kmh >= 0),
    fecha_hora_registro timestamptz(3) not null default now()
);
create index idx_historial_viaje on cgo_via.historial_ubicaciones_viaje(id_viaje);
create index idx_historial_ubicacion on cgo_via.historial_ubicaciones_viaje using gist(ubicacion);


/*
----------------------------------
| CREAR TABLAS DE CHATS Y SOCIAL |
----------------------------------
*/

-- ALMACENAR LA LISTA DE AMIGOS PARA PERMITIR CHATS ENTRE PASAJEROS
create table cgo_soc.amigos(
    id int generated always as identity primary key,
    id_usuario1 int not null references cgo_usu.usuarios(id) on update cascade,
    id_usuario2 int not null references cgo_usu.usuarios(id) on update cascade,
    id_estatus_social smallint not null references cgo_cat.estatus_sociales(id) default 1,
    fecha_hora_registro timestamptz(3) not null default now(),
    check(id_usuario1 != id_usuario2),
    unique(id_usuario1, id_usuario2)
);

-- ALMACENAR LA GESTIÓN DE LAS SALAS DE CHAT (VINCULADAS A UN VIAJE O DIRECTAS)
create table cgo_soc.chats(
    id int generated always as identity primary key,
    id_tipo_chat smallint not null references cgo_cat.tipos_chats(id),
    id_viaje int references cgo_via.viajes(id),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENAR LOS MENSAJES DENTRO DE LOS CHATS
create table cgo_soc.mensajes_chats(
    id bigint generated always as identity primary key,
    id_chat int not null references cgo_soc.chats(id),
    id_emisor int not null references cgo_usu.usuarios(id) on update cascade,
    id_receptor int not null references cgo_usu.usuarios(id) on update cascade,
    contenido text not null,
    leido boolean default false,
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
---------------------------------------------
| CREAR TABLAS DE CALIFICACIONES Y REPORTES |
---------------------------------------------
*/

-- ALMACENAR EL SISTEMA DE ESTRELLAS CRUZADO ENTRE CONDUCTOR Y PASAJERO
create table cgo_adm.calificaciones(
    id_viaje int not null references cgo_via.viajes(id),
    id_evaluador int not null references cgo_usu.usuarios(id),
    id_evaluado int not null references cgo_usu.usuarios(id),
    estrellas numeric(3, 2) default 5.00 check(estrellas between 1.00 and 5.00),
    comentarios_adicionales text,
    fecha_hora_registro timestamptz(3) not null default now(),
    check(id_evaluador != id_evaluado),
    primary key(id_viaje, id_evaluador, id_evaluado)
);

-- ALMACENAR LOS REPORTES CON EVIDENCIAS HACÍA LOS ADMINISTRADORES
create table cgo_adm.reportes(
    id int generated always as identity primary key,
    id_reportador int not null references cgo_usu.usuarios(id),
    id_reportado int not null references cgo_usu.usuarios(id),
    id_viaje int not null references cgo_via.viajes(id),
    id_motivo_reporte smallint references cgo_cat.motivos_reportes(id),
    motivo_personalizado text,
    evidencias jsonb,
    id_estado_reporte smallint not null references cgo_cat.estatus_reportes(id) default 1,
    notas_administrador text,
    fecha_hora_registro timestamptz(3) not null default now(),
    check(id_reportador != id_reportado)
);

-- ALMACENAR LAS SANCIONES APLICADAS A LOS USUARIOS POR LOS ADMINISTRADORES
create table cgo_adm.sanciones(
    id int generated always as identity primary key,
    id_usuario int not null references cgo_usu.usuarios(id),
    id_administrador int not null references cgo_usu.usuarios(id),
    id_estatus_usuario smallint not null references cgo_cat.estatus_usuarios(id),
    fecha_inicio date not null default current_date,
    fecha_fin date,
    vigente boolean default true,
    notas_administrador text,
    fecha_hora_registro timestamptz(3) not null default now(),
    check(fecha_fin is null or fecha_fin >= fecha_inicio)
);


/*
---------------------------------------
| CREAR TABLAS DE NOTIFICACIONES PUSH |
---------------------------------------
*/

-- ALMACENAR EL HISTORIAL DE NOTIFICACIONES PUSH ENVIADAS A LOS USUARIOS
create table cgo_not.notificaciones(
    id bigint generated always as identity primary key,
    id_usuario int not null references cgo_usu.usuarios(id),
    id_tipo_notificacion smallint not null references cgo_cat.tipos_notificaciones(id),
    titulo varchar(100) not null,
    cuerpo varchar(500) not null,
    leida boolean default false,
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
-----------------------------------------
| CREAR TRIGGERS Y FUNCIONES DE NEGOCIO |
-----------------------------------------
*/

-- TRIGGER PARA ACTUALIZAR EL PROMEDIO DE ESTRELLAS DE UN USUARIO AUTOMÁTICAMENTE
create or replace function cgo_adm.fn_actualizar_promedio_estrellas() returns trigger as $$
declare
    v_id_conductor_usuario int;
begin
    -- BUSCA EL ID DE USUARIO DEL CONDUCTOR DEL VIAJE
    select cond.id_usuario into v_id_conductor_usuario
    from cgo_via.viajes via
    join cgo_usu.vehiculos veh on via.id_vehiculo = veh.id
    join cgo_usu.conductores cond on veh.id_conductor = cond.id
    where via.id = new.id_viaje;
    if new.id_evaluado = v_id_conductor_usuario then
        -- SE ACTUALIZA SU CALIFICACIÓN COMO CONDUCTOR
        update cgo_usu.usuarios set calificacion_conductor = coalesce((
            select round(avg(estrellas), 2) from cgo_adm.calificaciones cal
            where cal.id_evaluado = new.id_evaluado and cal.id_viaje in (
                select v.id from cgo_via.viajes v
                join cgo_usu.vehiculos vh on v.id_vehiculo = vh.id
                join cgo_usu.conductores cd on vh.id_conductor = cd.id
                where cd.id_usuario = new.id_evaluado
            )
        ), 5.00) where id = new.id_evaluado;
    else
        -- SE ACTUALIZA SU CALIFICACIÓN COMO PASAJERO
        update cgo_usu.usuarios set calificacion_pasajero = coalesce((
            select round(avg(estrellas), 2) from cgo_adm.calificaciones cal
            where cal.id_evaluado = new.id_evaluado and cal.id_evaluado != (
                select cd.id_usuario from cgo_via.viajes v
                join cgo_usu.vehiculos vh on v.id_vehiculo = vh.id
                join cgo_usu.conductores cd on vh.id_conductor = cd.id
                where v.id = cal.id_viaje
            )
        ), 5.00) where id = new.id_evaluado;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_actualizar_estrellas
after insert or update on cgo_adm.calificaciones
for each row execute function cgo_adm.fn_actualizar_promedio_estrellas();

-- APLICAR TRIGGER DE AUDITORÍA A TABLAS RELEVANTES
create trigger tr_auditoria_usuarios
after insert or update or delete on cgo_usu.usuarios
for each row execute function cgo_aud.fn_auditoria();

create trigger tr_auditoria_conductores
after insert or update or delete on cgo_usu.conductores
for each row execute function cgo_aud.fn_auditoria();

create trigger tr_auditoria_viajes
after insert or update or delete on cgo_via.viajes
for each row execute function cgo_aud.fn_auditoria();

create trigger tr_auditoria_solicitudes
after insert or update or delete on cgo_via.solicitudes_viajes
for each row execute function cgo_aud.fn_auditoria();

create trigger tr_auditoria_pagos
after insert or update or delete on cgo_via.pagos_transferencias
for each row execute function cgo_aud.fn_auditoria();

create trigger tr_auditoria_reportes
after insert or update or delete on cgo_adm.reportes
for each row execute function cgo_aud.fn_auditoria();


/*
--------------------------------------------------------------------
| CREAR ÍNDICES DE OPTIMIZACIÓN DE CONSULTAS EN TABLAS RECURRENTES |
--------------------------------------------------------------------
*/

create index idx_tarjeta_usuario on cgo_usu.tarjetas_pasajeros(id_usuario);
create index idx_viaje_vehiculo on cgo_via.viajes(id_vehiculo);
create index idx_viaje_estatus on cgo_via.viajes(id_estatus);
create index idx_viaje_fecha on cgo_via.viajes(fecha);
create index idx_viaje_hora on cgo_via.viajes(hora_inicio);
create index idx_solicitud_viaje on cgo_via.solicitudes_viajes(id_viaje);
create index idx_solicitud_pasajero on cgo_via.solicitudes_viajes(id_pasajero);
create index idx_pago_solicitud on cgo_via.pagos_transferencias(id_solicitud);
create index idx_pago_pasajero on cgo_via.pagos_transferencias(id_pasajero);
create index idx_pago_conductor on cgo_via.pagos_transferencias(id_conductor);
create index idx_mensaje_chat on cgo_soc.mensajes_chats(id_chat);
create index idx_notificacion_usuario on cgo_not.notificaciones(id_usuario, leida);
create index idx_historial_fecha on cgo_via.historial_ubicaciones_viaje(fecha_hora_registro);
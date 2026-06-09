/*
-----------------------
| CREAR BASE DE DATOS |
-----------------------
*/

-- create database cardenal_go;


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

-- ALMACENA EL HISTORIAL DE CAMBIOS DE TODA LA BASE DE DATOS
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
create or replace function fn_auditoria() returns trigger as $$
begin
    if(tg_op = 'delete') then
        insert into cgo_aud.auditoria(nombre_tabla, id_registro, accion, datos_antiguos)
        values(tg_table_name, old.id, 'delete', row_to_json(old)::jsonb);
        return old;
    elsif(tg_op = 'update') then
        insert into cgo_aud.auditoria(nombre_tabla, id_registro, accion, datos_antiguos, datos_nuevos)
        values(tg_table_name, new.id, 'update', row_to_json(old)::jsonb, row_to_json(new)::jsonb);
        return new;
    elsif(tg_op = 'insert') then
        insert into cgo_aud.auditoria(nombre_tabla, id_registro, accion, datos_nuevos)
        values(tg_table_name, new.id, 'insert', row_to_json(new)::jsonb);
        return new;
    end if;
    return null;
end;
$$ language plpgsql;


/*
---------------------------------
| CREAR TABLAS DE TIPO CATÁLOGO |
---------------------------------
*/

-- ALMACENA LOS ROLES DEL SISTEMA
create table cgo_cat.roles(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENA LOS MÉTODOS DE PAGO DE LOS VIAJES
create table cgo_cat.metodos_pago(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null
);

-- ALMACENA LOS ESTATUS DE LOS VIAJES
create table cgo_cat.estatus_viajes(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENA LOS ESTATUS DE LAS SOLICITUDES DE LOS VIAJES (PASAJERO - CONDUCTOR)
create table cgo_cat.estatus_solicitudes(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENA LOS MOTIVOS DE LOS REPORTES DE LOS USUARIOS
create table cgo_cat.motivos_reportes(
    id smallint generated always as identity primary key,
    nombre varchar(50) unique not null,
    gravedad smallint not null check(gravedad between 1 and 10)
);

-- ALMACENA LOS ESTATUS DE LOS REPORTES DE LOS USUARIOS
create table cgo_cat.estatus_reportes(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null,
    descripcion varchar(255)
);

-- ALMACENA LOS ESTATUS DE LOS USUARIOS ENTRE SÍ (EN EL SENTIDO SOCIAL)
create table cgo_cat.estatus_sociales(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null
);

-- ALMACENA LOS TIPOS DE CHATS DEL SISTEMA
create table cgo_cat.tipos_chats(
    id smallint generated always as identity primary key,
    nombre varchar(20) unique not null
);

-- ALMACENA LOS ESTATUS DE LOS USUARIOS EN EL SISTEMA (INCLUYE SANCIONES POR MALA CONDUCTA)
create table cgo_cat.estatus_usuarios(
    id smallint generated always as identity primary key,
    nombre varchar(50) unique not null,
    dias_sancion smallint
);

-- ALMACENA LOS TIPOS DE NOTIFICACIONES DEL SISTEMA
create table cgo_cat.tipos_notificaciones(
    id smallint generated always as identity primary key,
    nombre varchar(50) unique not null
);

-- ALMACENA LOS ESTATUS DE LOS PAGOS Y TRANSFERENCIAS FINANCIERAS
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

-- ALMACENA LA INFORMACIÓN DE LOS USUARIOS DEL SISTEMA (CONDUCTORES, PASAJEROS Y ADMINISTRADORES)
create table cgo_usu.usuarios(
    id int generated always as identity primary key,
    nombre_completo varchar(255) not null,
    matricula varchar(9) unique not null check(length(matricula) = 9),
    correo_institucional varchar(20) unique not null check(correo_institucional like '%@upq.edu.mx' and length(correo_institucional) = 20),
    contrasena_hash varchar(255) not null,
    url_foto_perfil varchar(255) not null default 'cardenal_upq.png',
    calificacion_pasajero numeric(3, 2) default 5.00 check(calificacion_pasajero between 1.00 and 5.00),
    calificacion_conductor numeric(3, 2) default 5.00 check(calificacion_conductor between 1.00 and 5.00),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LAS RELACIONES MUCHOS A MUCHOS PARA ESTABLECER LOS ROLES Y ESTATUS DE LOS USUARIOS
create table cgo_usu.roles_usuarios(
    id_usuario int not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    id_rol smallint not null references cgo_cat.roles(id),
    id_estatus smallint not null references cgo_cat.estatus_usuarios(id) default 1,
    primary key(id_usuario, id_rol)
);

-- ALMACENA LA INFORMACIÓN DEL USUARIO (SI DECIDE SER CONDUCTOR)
create table cgo_usu.conductores(
    id int generated always as identity primary key,
    id_usuario int unique not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    telefono varchar(20) not null,
    licencia_conducir varchar(50) unique not null,
    url_foto_ine varchar(255) not null,
    ine_valida boolean default false,
    clabe_interbancaria varchar(18) check(length(clabe_interbancaria) = 18),
    nombre_banco varchar(50),
    nombre_titular_cuenta varchar(255),
    id_cuenta_pasarela varchar(255),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LA INFORMACIÓN DE LOS VEHÍCULOS DE LOS CONDUCTORES
create table cgo_usu.vehiculos(
    id int generated always as identity primary key,
    id_conductor int not null references cgo_usu.conductores(id) on update cascade on delete cascade,
    placa varchar(15) unique not null,
    color varchar(30) not null,
    modelo varchar(50) not null,
    anio smallint check(anio > 1990 and anio <= extract(year from now())::int + 1),
    fotos jsonb not null,
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LA INFORMACIÓN NO SENSIBLE DE LAS TARJETAS DE LOS PASAJEROS
create table cgo_usu.tarjetas_pasajeros(
    id int generated always as identity primary key,
    id_usuario int not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    id_cliente_pasarela varchar(255) not null,
    token_pasarela varchar(255) not null,
    ultimos_cuatro_digitos char(4) not null,
    marca varchar(20) not null,
    es_favorita boolean default false,
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
----------------------------------------
| CREAR TABLAS DE VIAJES Y SOLICITUDES |
----------------------------------------
*/

-- ALMACENA LA PUBLICACIÓN DE VIAJES DE LOS CONDUCTORES
create table cgo_via.viajes(
    id int generated always as identity primary key,
    id_vehiculo int not null references cgo_usu.vehiculos(id),
    id_estatus smallint not null references cgo_cat.estatus_viajes(id),
    latitud_inicio numeric(10, 8) not null,
    longitud_inicio numeric(10, 8) not null,
    latitud_destino numeric(10, 8) not null,
    longitud_destino numeric(10, 8) not null,
    ruta_sugerida jsonb,
    fecha date not null,
    hora_inicio time not null,
    asientos_totales smallint not null check(asientos_totales > 0),
    asientos_disponibles smallint not null check(asientos_disponibles >= 0),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LAS SOLICITUDES O RESERVAS DE VIAJES DE LOS PASAJEROS
create table cgo_via.solicitudes_viajes(
    id int generated always as identity primary key,
    id_viaje int not null references cgo_via.viajes(id),
    id_pasajero int not null references cgo_usu.usuarios(id),
    id_metodo_pago smallint not null references cgo_cat.metodos_pago(id),
    id_estatus smallint not null references cgo_cat.estatus_solicitudes(id),
    latitud_recogida numeric(10, 8) not null,
    longitud_recogida numeric(10, 8) not null,
    latitud_bajada numeric(10, 8) not null,
    longitud_bajada numeric(10, 8) not null,
    desvio_metros int default 0,
    precio numeric(10, 2) not null check(precio >= 0),
    notas_adicionales varchar(255),
    es_grupal boolean default false,
    url_grupo varchar(255) unique,
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LOS REGISTROS DE LOS PAGOS Y TRANSFERENCIAS SPEI DE LOS PASAJEROS A LOS CONDUCTORES
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
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
----------------------------------
| CREAR TABLAS DE CHATS Y SOCIAL |
----------------------------------
*/

-- ALMACENA LA LISTA DE AMIGOS PARA PERMITIR CHATS ENTRE PASAJEROS
create table cgo_soc.amigos(
    id int generated always as identity primary key,
    id_usuario1 int not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    id_usuario2 int not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    id_estatus_social smallint not null references cgo_cat.estatus_sociales(id) default 1,
    fecha_hora_registro timestamptz(3) not null default now(),
    unique(id_usuario1, id_usuario2)
);

-- ALMACENA LA GESTIÓN DE LAS SALAS DE CHAT (VINCULADAS A UN VIAJE O DIRECTAS)
create table cgo_soc.chats(
    id int generated always as identity primary key,
    id_tipo_chat smallint not null references cgo_cat.tipos_chats(id),
    id_viaje int references cgo_via.viajes(id),
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LOS MENSAJES DENTRO DE LOS CHATS
create table cgo_soc.mensajes_chats(
    id bigint generated always as identity primary key,
    id_chat int not null references cgo_soc.chats(id),
    id_emisor int not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    id_remitente int not null references cgo_usu.usuarios(id) on update cascade on delete cascade,
    contenido text not null,
    leido boolean default false,
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
---------------------------------------------
| CREAR TABLAS DE CALIFICACIONES Y REPORTES |
---------------------------------------------
*/

-- ALMACENA EL SISTEMA DE ESTRELLAS CRUZADO ENTRE CONDUCTOR Y PASAJERO
create table cgo_adm.calificaciones(
    id_viaje int not null references cgo_via.viajes(id),
    id_evaluador int not null references cgo_usu.usuarios(id),
    id_evaluado int not null references cgo_usu.usuarios(id),
    estrellas numeric(3, 2) default 5.00 check(estrellas between 1.00 and 5.00),
    comentarios_adicionales text,
    fecha_hora_registro timestamptz(3) not null default now(),
    primary key(id_viaje, id_evaluador, id_evaluado)
);

-- ALMACENA LOS REPORTES CON EVIDENCIAS HACÍA LOS ADMINISTRADORES
create table cgo_adm.reportes(
    id int generated always as identity primary key,
    id_reportador int not null references cgo_usu.usuarios(id),
    id_reportado int not null references cgo_usu.usuarios(id),
    id_viaje int not null references cgo_via.viajes(id),
    id_motivo_reporte smallint references cgo_cat.motivos_reportes(id),
    motivo_personalizado text,
    evidencias jsonb,
    id_estado_reporte smallint not null references cgo_cat.estatus_reportes(id) default 1,
    notes_administrador text,
    fecha_hora_registro timestamptz(3) not null default now()
);

-- ALMACENA LAS SANCIONES APLICADAS A LOS USUARIOS POR LOS ADMINISTRADORES
create table cgo_adm.sanciones(
    id int generated always as identity primary key,
    id_usuario int not null references cgo_usu.usuarios(id),
    id_administrador int not null references cgo_usu.usuarios(id),
    id_estatus_usuario smallint not null references cgo_cat.estatus_usuarios(id),
    fecha_inicio date not null default current_timestamp,
    fecha_fin date,
    vigente boolean default true,
    notas_administrador text,
    fecha_hora_registro timestamptz(3) not null default now()
);


/*
---------------------------------------
| CREAR TABLAS DE NOTIFICACIONES PUSH |
---------------------------------------
*/

-- ALMACENA EL HISTORIAL DE NOTIFICACIONES PUSH ENVIADAS A LOS USUARIOS
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
create or replace function fn_actualizar_promedio_estrellas() returns trigger as $$
declare
    v_id_conductor_usuario int;
begin
    -- BUSCA EL ID DE USUARIO DEL CONDUCTOR DUEÑO DEL VEHÍCULO DE ESTE VIAJE
    select cond.id_usuario into v_id_conductor_usuario
    from cgo_via.viajes via
    join cgo_usu.vehiculos veh on via.id_vehiculo = veh.id
    join cgo_usu.conductores cond on veh.id_conductor = cond.id
    where via.id = new.id_viaje;

    if new.id_evaluado = v_id_conductor_usuario then
        -- SE ACTUALIZA SU CALIFICACIÓN COMO CONDUCTOR
        update cgo_usu.usuarios set calificacion_conductor = (
            select round(avg(estrellas), 2) from cgo_adm.calificaciones cal
            where cal.id_evaluado = new.id_evaluado and cal.id_viaje in (
                select v.id from cgo_via.viajes v
                join cgo_usu.vehiculos vh on v.id_vehiculo = vh.id
                join cgo_usu.conductores cd on vh.id_conductor = cd.id
                where cd.id_usuario = new.id_evaluado
            )
        ) where id = new.id_evaluado;
    else
        -- SE ACTUALIZA SU CALIFICACIÓN COMO PASAJERO
        update cgo_usu.usuarios set calificacion_pasajero = (
            select round(avg(estrellas), 2) from cgo_adm.calificaciones cal
            where cal.id_evaluado = new.id_evaluado and cal.id_evaluado != (
                select cd.id_usuario from cgo_via.viajes v
                join cgo_usu.vehiculos vh on v.id_vehiculo = vh.id
                join cgo_usu.conductores cd on vh.id_conductor = cd.id
                where v.id = cal.id_viaje
            )
        ) where id = new.id_evaluado;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_actualizar_estrellas
after insert or update on cgo_adm.calificaciones
for each row execute function fn_actualizar_promedio_estrellas();

-- APLICAR TRIGGER DE AUDITORÍA A TABLAS RELEVANTES
create trigger tr_auditoria_usuarios
after insert or update or delete on cgo_usu.usuarios
for each row execute function fn_auditoria();

create trigger tr_auditoria_conductores
after insert or update or delete on cgo_usu.conductores
for each row execute function fn_auditoria();

create trigger tr_auditoria_viajes
after insert or update or delete on cgo_via.viajes
for each row execute function fn_auditoria();

create trigger tr_auditoria_solicitudes
after insert or update or delete on cgo_via.solicitudes_viajes
for each row execute function fn_auditoria();

create trigger tr_auditoria_pagos
after insert or update or delete on cgo_via.pagos_transferencias
for each row execute function fn_auditoria();

create trigger tr_auditoria_reportes
after insert or update or delete on cgo_adm.reportes
for each row execute function fn_auditoria();


/*
--------------------------------------------------------------------
| CREAR ÍNDICES DE OPTIMIZACIÓN DE CONSULTAS EN TABLAS RECURRENTES |
--------------------------------------------------------------------
*/

create index idx_usuario_matricula on cgo_usu.usuarios(matricula);
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


/*
-------------------------------------------------
| INSERTAR DATOS EN LAS TABLAS DE TIPO CATÁLOGO |
-------------------------------------------------
*/

insert into cgo_cat.roles(nombre, descripcion) values
('Pasajero', 'Alumno o docente que reserva un asiento en un trayecto'),
('Conductor', 'Alumno o docente validado que comparte su vehículo'),
('Administrador', 'Personal institucional con control de reportes y penalizaciones');

insert into cgo_cat.metodos_pago(nombre) values
('Efectivo'),
('Transferencia SPEI');

insert into cgo_cat.estatus_viajes(nombre, descripcion) values
('Programado', 'El viaje está abierto y recibe solicitudes'),
('En curso', 'El conductor inició el trayecto en el mapa'),
('Finalizado', 'El viaje concluyó exitosamente en el destino'),
('Cancelado', 'El viaje fue anulado por motivos de fuerza mayor');

insert into cgo_cat.estatus_solicitudes(nombre, descripcion) values
('Pendiente', 'Esperando la aprobación o rechazo del conductor'),
('Negociando', 'El conductor propuso un punto intermedio alternativo'),
('Aceptada', 'El pasajero cuenta con su lugar reservado en el vehículo'),
('Rechazada', 'El conductor denegó la solicitud de reserva'),
('Cancelada', 'El pasajero decidió bajarse del viaje antes de iniciar');

insert into cgo_cat.motivos_reportes(nombre, gravedad) values
('Conducción temeraria', 8),
('Acoso o lenguaje inapropiado', 10),
('No se presentó al punto de encuentro', 5),
('Vehículo diferente al registrado', 6),
('Cobro excesivo o por fuera de la app', 7),
('Limpieza deficiente del auto', 3);

insert into cgo_cat.estatus_reportes(nombre, descripcion) values
('Pendiente', 'El reporte fue enviado y espera revisión'),
('En revisión', 'Un administrador analiza las evidencias del caso'),
('Resuelto', 'Se ha tomado una determinación y cerrado el caso'),
('Descartado', 'El reporte no cuenta con fundamentos o pruebas válidas');

insert into cgo_cat.estatus_sociales(nombre) values
('Pendiente'),
('Aceptado'),
('Bloqueado');

insert into cgo_cat.tipos_chats(nombre) values
('Directo'),
('Viaje');

insert into cgo_cat.estatus_usuarios(nombre, dias_sancion) values
('Advertido', 0),
('Infracción leve', 1),
('Infracción media', 3),
('Infracción grave', 3);

insert into cgo_cat.estatus_usuarios(nombre) values
('Activo'),
('Baja definitiva');

insert into cgo_cat.tipos_notificaciones(nombre) values
('La solicitud de viaje fue recibida'),
('El viaje ha sido aceptado'),
('El conductor está en camino'),
('El conductor llegó al punto de encuentro'),
('El viaje ha sido cancelado'),
('Tienes un nuevo mensaje');

insert into cgo_cat.estatus_pagos(nombre, descripcion) values
('Pendiente', 'La transferencia SPEI se encuentra en proceso de validación'),
('Completada', 'Los fondos fueron liquidados exitosamente en la cuenta del conductor'),
('Fallida', 'La transacción fue rechazada por la pasarela bancaria'),
('Reembolsado', 'El dinero fue devuelto al pasajero por la cancelación del viaje');
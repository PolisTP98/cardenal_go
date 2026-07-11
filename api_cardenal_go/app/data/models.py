# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from sqlalchemy import(
    Column, 
    Integer, 
    BigInteger, 
    SmallInteger, 
    String, 
    Numeric, 
    Boolean, 
    Date, 
    Time, 
    DateTime, 
    Text, 
    Identity, 
    ForeignKey, 
    CheckConstraint, 
    text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from database import Base


# ---------------------
# | ESQUEMA "cgo_aud" |
# ---------------------

# ALMACENAR EL HISTORIAL DE CAMBIOS DE TODA LA BASE DE DATOS
class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = (
        CheckConstraint(
            "accion in ('insert', 'update', 'delete')", 
            name = "ck_auditoria_accion"
        ), 
        {"schema": "cgo_aud"}
    )

    id = Column(BigInteger, Identity(always = True), primary_key = True)
    nombre_tabla = Column(String(100), nullable = False)
    id_registro = Column(BigInteger, nullable = False)
    accion = Column(String(10), nullable = False)
    datos_antiguos = Column(JSONB)
    datos_nuevos = Column(JSONB)
    usuario_bd = Column(String(100), nullable = False, server_default = text("current_user"))
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))


# ---------------------
# | ESQUEMA "cgo_cat" |
# ---------------------

# ALMACENAR LOS ROLES DEL SISTEMA
class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    descripcion = Column(String(255))
    # RELACIONES
    usuarios = relationship(
        "RolUsuario", 
        back_populates = "rol"
    )

# ALMACENAR LOS MÉTODOS DE PAGO DE LOS VIAJES
class MetodoPago(Base):
    __tablename__ = "metodos_pago"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    # RELACIONES
    solicitudes_viajes = relationship(
        "SolicitudViaje", 
        back_populates = "metodo_pago"
    )

# ALMACENAR LOS ESTATUS DE LOS VIAJES
class EstatusViaje(Base):
    __tablename__ = "estatus_viajes"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    descripcion = Column(String(255))
    # RELACIONES
    viajes = relationship(
        "Viaje", 
        back_populates = "estatus"
    )

# ALMACENAR LOS ESTATUS DE LAS SOLICITUDES DE VIAJES (PASAJERO - CONDUCTOR)
class EstatusSolicitud(Base):
    __tablename__ = "estatus_solicitudes"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    descripcion = Column(String(255))
    # RELACIONES
    solicitudes_viajes = relationship(
        "SolicitudViaje", 
        back_populates = "estatus"
    )

# ALMACENAR LOS MOTIVOS DE LOS REPORTES DE LOS USUARIOS
class MotivoReporte(Base):
    __tablename__ = "motivos_reportes"
    __table_args__ = (
        CheckConstraint(
            "gravedad between 1 and 10", 
            name = "ck_motivo_reporte_gravedad"
        ), 
        {"schema": "cgo_cat"}
    )

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(50), nullable = False, unique = True)
    gravedad = Column(SmallInteger, nullable = False)
    # RELACIONES
    reportes = relationship(
        "Reporte", 
        back_populates = "motivo_reporte"
    )

# ALMACENAR LOS ESTATUS DE LOS REPORTES DE LOS USUARIOS
class EstatusReporte(Base):
    __tablename__ = "estatus_reportes"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    descripcion = Column(String(255))
    # RELACIONES
    reportes = relationship(
        "Reporte", 
        back_populates = "estatus_reporte"
    )

# ALMACENAR LOS ESTATUS DE LOS USUARIOS ENTRE SÍ (EN EL SENTIDO SOCIAL)
class EstatusSocial(Base):
    __tablename__ = "estatus_sociales"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    # RELACIONES
    amigos = relationship(
        "Amigo", 
        back_populates = "estatus_social"
    )

# ALMACENAR LOS TIPOS DE CHATS DEL SISTEMA
class TipoChat(Base):
    __tablename__ = "tipos_chats"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    # RELACIONES
    chats = relationship(
        "Chat", 
        back_populates = "tipo_chat"
    )

# ALMACENAR LOS ESTATUS DE LOS USUARIOS (INCLUYE SANCIONES POR MALA CONDUCTA)
class EstatusUsuario(Base):
    __tablename__ = "estatus_usuarios"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(50), nullable = False, unique = True)
    dias_sancion = Column(SmallInteger)
    # RELACIONES
    roles_usuarios = relationship(
        "RolUsuario", 
        back_populates = "estatus"
    )
    sanciones = relationship(
        "Sancion", 
        back_populates = "estatus_usuario"
    )

# ALMACENAR LOS TIPOS DE NOTIFICACIONES DEL SISTEMA
class TipoNotificacion(Base):
    __tablename__ = "tipos_notificaciones"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(50), nullable = False, unique = True)
    # RELACIONES
    notificaciones = relationship(
        "Notificacion", 
        back_populates = "tipo_notificacion"
    )

# ALMACENAR LOS ESTATUS DE LOS PAGOS Y TRANSFERENCIAS FINANCIERAS
class EstatusPago(Base):
    __tablename__ = "estatus_pagos"
    __table_args__ = {"schema": "cgo_cat"}

    id = Column(SmallInteger, Identity(always = True), primary_key = True)
    nombre = Column(String(20), nullable = False, unique = True)
    descripcion = Column(String(255))
    # RELACIONES
    pagos_transferencias = relationship(
        "PagoTransferencia", 
        back_populates = "estatus_pago"
    )


# ---------------------
# | ESQUEMA "cgo_usu" |
# ---------------------

# ALMACENAR LA INFORMACIÓN DE LOS USUARIOS (CONDUCTORES, PASAJEROS Y ADMINISTRADORES)
class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "length(matricula) = 9", 
            name = "ck_usuario_matricula"
        ),
        CheckConstraint(
            "correo_institucional like '%_@upq.edu.mx'", 
            name = "ck_usuario_correo"
        ),
        CheckConstraint(
            "calificacion_pasajero between 1.00 and 5.00", 
            name = "ck_usuario_calificacion_pasajero"
        ),
        CheckConstraint(
            "calificacion_conductor between 1.00 and 5.00", 
            name = "ck_usuario_calificacion_conductor"
        ),
        {"schema": "cgo_usu"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    nombre_completo = Column(String(255), nullable = False)
    matricula = Column(String(9), unique = True, nullable = False)
    correo_institucional = Column(String(100), unique = True, nullable = False)
    contrasena_hash = Column(String(255), nullable = False)
    url_foto_perfil = Column(String(255), nullable = False, default = "cardenal_upq.png", server_default = "cardenal_upq.png")
    calificacion_pasajero = Column(Numeric(3, 2), default = 5.00, server_default = "5.00")
    calificacion_conductor = Column(Numeric(3, 2), default = 5.00, server_default = "5.00")
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    roles = relationship(
        "RolUsuario", 
        back_populates = "usuario", 
        cascade = "all, delete-orphan"
    )
    conductor = relationship(
        "Conductor", 
        back_populates = "usuario", 
        uselist = False
    )
    tarjetas = relationship(
        "TarjetaPasajero", 
        back_populates = "usuario", 
        cascade = "all, delete-orphan"
    )
    solicitudes_viajes = relationship(
        "SolicitudViaje", 
        back_populates = "pasajero"
    )
    pagos_transferencias = relationship(
        "PagoTransferencia", 
        back_populates = "pasajero"
    )
    amigos_solicitados = relationship(
        "Amigo", 
        foreign_keys = "Amigo.id_usuario1", 
        back_populates = "usuario1"
    )
    amigos_recibidos = relationship(
        "Amigo", 
        foreign_keys = "Amigo.id_usuario2", 
        back_populates = "usuario2"
    )
    mensajes_enviados = relationship(
        "MensajeChat", 
        foreign_keys = "MensajeChat.id_emisor", 
        back_populates = "emisor"
    )
    mensajes_recibidos = relationship(
        "MensajeChat", 
        foreign_keys = "MensajeChat.id_receptor", 
        back_populates = "receptor"
    )
    calificaciones_dadas = relationship(
        "Calificacion", 
        foreign_keys = "Calificacion.id_evaluador", 
        back_populates = "evaluador"
    )
    calificaciones_recibidas = relationship(
        "Calificacion", 
        foreign_keys = "Calificacion.id_evaluado", 
        back_populates = "evaluado"
    )
    reportes_emitidos = relationship(
        "Reporte", 
        foreign_keys = "Reporte.id_reportador", 
        back_populates = "reportador"
    )
    reportes_recibidos = relationship(
        "Reporte", 
        foreign_keys = "Reporte.id_reportado", 
        back_populates = "reportado"
    )
    sanciones_recibidas = relationship(
        "Sancion", 
        foreign_keys = "Sancion.id_usuario", 
        back_populates = "usuario"
    )
    sanciones_aplicadas = relationship(
        "Sancion", 
        foreign_keys = "Sancion.id_administrador", 
        back_populates = "administrador"
    )
    notificaciones = relationship(
        "Notificacion", 
        back_populates = "usuario", 
        cascade = "all, delete-orphan"
    )

# ALMACENAR LOS ROLES Y ESTATUS DE LOS USUARIOS
class RolUsuario(Base):
    __tablename__ = "roles_usuarios"
    __table_args__ = {"schema": "cgo_usu"}

    id_usuario = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_rol_usuario_usuario", 
            onupdate = "CASCADE"
        ), 
        primary_key = True
    )
    id_rol = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.roles.id", 
            name = "fk_rol_usuario_rol"
        ), 
        primary_key = True, 
        default = 1, 
        server_default = "1"
    )
    id_estatus = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_usuarios.id", 
            name = "fk_rol_usuario_estatus"
        ), 
        nullable = False, 
        default = 1, 
        server_default = "1"
    )
    # RELACIONES
    usuario = relationship(
        "Usuario", 
        back_populates = "roles"
    )
    rol = relationship(
        "Rol", 
        back_populates = "usuarios"
    )
    estatus = relationship(
        "EstatusUsuario", 
        back_populates = "roles_usuarios"
    )

# ALMACENAR LA INFORMACIÓN DEL USUARIO (SI DECIDE SER CONDUCTOR)
class Conductor(Base):
    __tablename__ = "conductores"
    __table_args__ = (
        CheckConstraint(
            "clabe_interbancaria ~ '^[0-9]{18}$'", 
            name = "ck_conductor_clabe"
        ), 
        {"schema": "cgo_usu"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_usuario = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_conductor_usuario", 
            onupdate = "CASCADE"
        ), 
        unique = True, 
        nullable = False
    )
    telefono = Column(String(20), nullable = False)
    licencia_conducir = Column(String(50), unique = True, nullable = False)
    url_foto_ine = Column(String(255), nullable = False)
    ine_valida = Column(Boolean, default = False, server_default = "false")
    clabe_interbancaria = Column(String(18))
    nombre_banco = Column(String(50))
    nombre_titular_cuenta = Column(String(255))
    id_cuenta_pasarela = Column(String(255))
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    usuario = relationship(
        "Usuario", 
        back_populates = "conductor"
    )
    vehiculos = relationship(
        "Vehiculo", 
        back_populates = "conductor", 
        cascade = "all, delete-orphan"
    )
    pagos_transferencias = relationship(
        "PagoTransferencia", 
        back_populates = "conductor"
    )

# ALMACENAR LA INFORMACIÓN DE LOS VEHÍCULOS DE LOS CONDUCTORES
class Vehiculo(Base):
    __tablename__ = "vehiculos"
    __table_args__ = (
        CheckConstraint(
            "anio > 1990 and anio <= extract(year from now())::int + 1", 
            name = "ck_vehiculo_anio"
        ), 
        {"schema": "cgo_usu"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_conductor = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.conductores.id", 
            name = "fk_vehiculo_conductor", 
            onupdate = "CASCADE"
        ), 
        nullable = False
    )
    placa = Column(String(15), unique = True, nullable = False)
    color = Column(String(30), nullable = False)
    modelo = Column(String(50), nullable = False)
    anio = Column(SmallInteger)
    fotos = Column(JSONB, nullable = False)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    conductor = relationship(
        "Conductor", 
        back_populates = "vehiculos"
    )
    viajes = relationship(
        "Viaje", 
        back_populates = "vehiculo"
    )

# ALMACENAR LA INFORMACIÓN NO SENSIBLE DE LAS TARJETAS DE LOS PASAJEROS
class TarjetaPasajero(Base):
    __tablename__ = "tarjetas_pasajeros"
    __table_args__ = (
        CheckConstraint(
            "ultimos_cuatro_digitos ~ '^[0-9]{4}$'", 
            name = "ck_tarjeta_digitos"
        ), 
        {"schema": "cgo_usu"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_usuario = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_tarjeta_usuario", 
            onupdate = "CASCADE"
        ), 
        nullable = False
    )
    id_cliente_pasarela = Column(String(255), nullable = False)
    token_pasarela = Column(String(255), nullable = False)
    ultimos_cuatro_digitos = Column(String(4), nullable = False)
    marca = Column(String(20), nullable = False)
    es_favorita = Column(Boolean, default = False, server_default = "false")
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    usuario = relationship(
        "Usuario", 
        back_populates = "tarjetas"
    )


# ---------------------
# | ESQUEMA "cgo_via" |
# ---------------------

# ALMACENAR LA PUBLICACIÓN DE VIAJES DE LOS CONDUCTORES
class Viaje(Base):
    __tablename__ = "viajes"
    __table_args__ = (
        CheckConstraint(
            "asientos_totales > 0", 
            name = "ck_viaje_asientos_totales"
        ),
        CheckConstraint(
            "asientos_disponibles >= 0 and asientos_disponibles <= asientos_totales", 
            name = "ck_viaje_asientos_disponibles"
        ),
        {"schema": "cgo_via"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_vehiculo = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.vehiculos.id", 
            name = "fk_viaje_vehiculo"
        ), 
        nullable = False
    )
    id_estatus = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_viajes.id", 
            name = "fk_viaje_estatus"
        ), 
        nullable = False
    )
    ubicacion_inicio = Column(Geometry("Point", 4326), nullable = False)
    ubicacion_destino = Column(Geometry("Point", 4326), nullable = False)
    ruta_sugerida = Column(JSONB)
    fecha = Column(Date, nullable = False)
    hora_inicio = Column(Time, nullable = False)
    asientos_totales = Column(SmallInteger, nullable = False)
    asientos_disponibles = Column(SmallInteger, nullable = False)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    vehiculo = relationship(
        "Vehiculo", 
        back_populates = "viajes"
    )
    estatus = relationship(
        "EstatusViaje", 
        back_populates = "viajes"
    )
    solicitudes = relationship(
        "SolicitudViaje", 
        back_populates = "viaje", 
        cascade = "all, delete-orphan"
    )
    historial_ubicaciones = relationship(
        "HistorialUbicacionViaje", 
        back_populates = "viaje", 
        cascade = "all, delete-orphan"
    )
    chats = relationship(
        "Chat", 
        back_populates = "viaje"
    )
    calificaciones = relationship(
        "Calificacion", 
        back_populates = "viaje", 
        cascade = "all, delete-orphan"
    )
    reportes = relationship(
        "Reporte", 
        back_populates = "viaje"
    )

# ALMACENAR LAS SOLICITUDES O RESERVAS DE VIAJES DE LOS PASAJEROS
class SolicitudViaje(Base):
    __tablename__ = "solicitudes_viajes"
    __table_args__ = (
        CheckConstraint(
            "desvio_metros >= 0.00", 
            name = "ck_solicitud_desvio"
        ),
        CheckConstraint(
            "precio >= 0", 
            name = "ck_solicitud_precio"
        ),
        {"schema": "cgo_via"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_viaje = Column(
        Integer, 
        ForeignKey(
            "cgo_via.viajes.id", 
            name = "fk_solicitud_viaje"
        ), 
        nullable = False
    )
    id_pasajero = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_solicitud_pasajero"
        ), 
        nullable = False
    )
    id_metodo_pago = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.metodos_pago.id", 
            name = "fk_solicitud_metodo_pago"
        ), 
        nullable = False
    )
    id_estatus = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_solicitudes.id", 
            name = "fk_solicitud_estatus"
        ), 
        nullable = False
    )
    ubicacion_recogida = Column(Geometry("Point", 4326), nullable = False)
    ubicacion_bajada = Column(Geometry("Point", 4326), nullable = False)
    desvio_metros = Column(Numeric(8, 2), nullable = False)
    precio = Column(Numeric(10, 2), nullable = False)
    notas_adicionales = Column(String(255))
    es_grupal = Column(Boolean, default = False, server_default = "false")
    url_grupo = Column(String(255), unique = True)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    viaje = relationship(
        "Viaje", 
        back_populates = "solicitudes"
    )
    pasajero = relationship(
        "Usuario", 
        back_populates = "solicitudes_viajes"
    )
    metodo_pago = relationship(
        "MetodoPago", 
        back_populates = "solicitudes_viajes"
    )
    estatus = relationship(
        "EstatusSolicitud", 
        back_populates = "solicitudes_viajes"
    )
    pagos_transferencias = relationship(
        "PagoTransferencia", 
        back_populates = "solicitud"
    )

# ALMACENAR LOS REGISTROS DE LOS PAGOS Y TRANSFERENCIAS SPEI DE LOS PASAJEROS A LOS CONDUCTORES
class PagoTransferencia(Base):
    __tablename__ = "pagos_transferencias"
    __table_args__ = (
        CheckConstraint(
            "monto_total > 0", 
            name = "ck_pago_monto_total"
        ),
        CheckConstraint(
            "comision_plataforma >= 0", 
            name = "ck_pago_comision"
        ),
        CheckConstraint(
            "monto_neto_conductor > 0", 
            name = "ck_pago_neto"
        ),
        CheckConstraint(
            "monto_neto_conductor = monto_total - comision_plataforma", 
            name = "ck_pago_balance"
        ),
        {"schema": "cgo_via"}
    )

    id = Column(BigInteger, Identity(always = True), primary_key = True)
    id_solicitud = Column(
        Integer, 
        ForeignKey(
            "cgo_via.solicitudes_viajes.id", 
            name = "fk_pago_solicitud"
        ), 
        nullable = False
    )
    id_pasajero = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_pago_pasajero"
        ), 
        nullable = False
    )
    id_conductor = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.conductores.id", 
            name = "fk_pago_conductor"
        ), 
        nullable = False
    )
    id_estatus_pago = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_pagos.id", 
            name = "fk_pago_estatus"
        ), 
        nullable = False
    )
    id_transaccion_pasarela = Column(String(255), unique = True, nullable = False)
    monto_total = Column(Numeric(10, 2), nullable = False)
    comision_plataforma = Column(Numeric(10, 2), nullable = False, default = 0.00, server_default = "0.00")
    monto_neto_conductor = Column(Numeric(10, 2), nullable = False)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    solicitud = relationship(
        "SolicitudViaje", 
        back_populates = "pagos_transferencias"
    )
    pasajero = relationship(
        "Usuario", 
        back_populates = "pagos_transferencias"
    )
    conductor = relationship(
        "Conductor", 
        back_populates = "pagos_transferencias"
    )
    estatus_pago = relationship(
        "EstatusPago", 
        back_populates = "pagos_transferencias"
    )

# ALMACENAR EL HISTORIAL DE UBICACIONES EN VIVO DE LOS VIAJES EN CURSO
class HistorialUbicacionViaje(Base):
    __tablename__ = "historial_ubicaciones_viaje"
    __table_args__ = (
        CheckConstraint(
            "velocidad_kmh >= 0", 
            name = "ck_historial_velocidad"
        ), 
        {"schema": "cgo_via"}
    )

    id = Column(BigInteger, Identity(always = True), primary_key = True)
    id_viaje = Column(
        Integer, 
        ForeignKey(
            "cgo_via.viajes.id", 
            name = "fk_historial_viaje"
        ), 
        nullable = False
    )
    ubicacion = Column(Geometry("Point", 4326), nullable = False)
    velocidad_kmh = Column(SmallInteger)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    viaje = relationship(
        "Viaje", 
        back_populates = "historial_ubicaciones"
    )


# ---------------------
# | ESQUEMA "cgo_soc" |
# ---------------------

# ALMACENAR LA LISTA DE AMIGOS PARA PERMITIR CHATS ENTRE PASAJEROS
class Amigo(Base):
    __tablename__ = "amigos"
    __table_args__ = (
        CheckConstraint(
            "id_usuario1 != id_usuario2", 
            name = "ck_amigo_usuarios_distintos"
        ), 
        {"schema": "cgo_soc"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_usuario1 = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_amigo_usuario1", 
            onupdate = "CASCADE"
        ), 
        nullable = False
    )
    id_usuario2 = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_amigo_usuario2", 
            onupdate = "CASCADE"
        ), 
        nullable = False
    )
    id_estatus_social = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_sociales.id", 
            name = "fk_amigo_estatus"
        ), 
        nullable = False, 
        default = 1, 
        server_default = "1"
    )
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    usuario1 = relationship(
        "Usuario", 
        foreign_keys = [id_usuario1], 
        back_populates = "amigos_solicitados"
    )
    usuario2 = relationship(
        "Usuario", 
        foreign_keys = [id_usuario2], 
        back_populates = "amigos_recibidos"
    )
    estatus_social = relationship(
        "EstatusSocial", 
        back_populates = "amigos"
    )

# ALMACENAR LA GESTIÓN DE LAS SALAS DE CHAT (VINCULADAS A UN VIAJE O DIRECTAS)
class Chat(Base):
    __tablename__ = "chats"
    __table_args__ = {"schema": "cgo_soc"}

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_tipo_chat = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.tipos_chats.id", 
            name = "fk_chat_tipo"
        ), 
        nullable = False
    )
    id_viaje = Column(
        Integer, 
        ForeignKey(
            "cgo_via.viajes.id", 
            name = "fk_chat_viaje"
        )
    )
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    tipo_chat = relationship(
        "TipoChat", 
        back_populates = "chats"
    )
    viaje = relationship(
        "Viaje", 
        back_populates = "chats"
    )
    mensajes = relationship(
        "MensajeChat", 
        back_populates = "chat", 
        cascade = "all, delete-orphan"
    )

# ALMACENAR LOS MENSAJES DENTRO DE LOS CHATS
class MensajeChat(Base):
    __tablename__ = "mensajes_chats"
    __table_args__ = {"schema": "cgo_soc"}

    id = Column(BigInteger, Identity(always = True), primary_key = True)
    id_chat = Column(
        Integer, 
        ForeignKey(
            "cgo_soc.chats.id", 
            name = "fk_mensaje_chat"
        ), 
        nullable = False
    )
    id_emisor = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_mensaje_emisor", 
            onupdate = "CASCADE"
        ), 
        nullable = False
    )
    id_receptor = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_mensaje_receptor", 
            onupdate = "CASCADE"
        ), 
        nullable = False
    )
    contenido = Column(Text, nullable = False)
    leido = Column(Boolean, default = False, server_default = "false")
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    chat = relationship(
        "Chat", 
        back_populates = "mensajes"
    )
    emisor = relationship(
        "Usuario", 
        foreign_keys = [id_emisor], 
        back_populates = "mensajes_enviados"
    )
    receptor = relationship(
        "Usuario", 
        foreign_keys = [id_receptor], 
        back_populates = "mensajes_recibidos"
    )


# ---------------------
# | ESQUEMA "cgo_adm" |
# ---------------------

# ALMACENAR EL SISTEMA DE ESTRELLAS CRUZADO ENTRE CONDUCTOR Y PASAJERO
class Calificacion(Base):
    __tablename__ = "calificaciones"
    __table_args__ = (
        CheckConstraint(
            "estrellas between 1.00 and 5.00", 
            name = "ck_calificacion_estrellas"
        ),
        CheckConstraint(
            "id_evaluador != id_evaluado", 
            name = "ck_calificacion_distintos"
        ),
        {"schema": "cgo_adm"}
    )

    id_viaje = Column(
        Integer, 
        ForeignKey(
            "cgo_via.viajes.id", 
            name = "fk_calificacion_viaje"
        ), 
        primary_key = True
    )
    id_evaluador = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_calificacion_evaluador"
        ), 
        primary_key = True
    )
    id_evaluado = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_calificacion_evaluado"
        ), 
        primary_key = True
    )
    estrellas = Column(Numeric(3, 2), default = 5.00, server_default = "5.00")
    comentarios_adicionales = Column(Text)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    viaje = relationship(
        "Viaje", 
        back_populates = "calificaciones"
    )
    evaluador = relationship(
        "Usuario", 
        foreign_keys = [id_evaluador], 
        back_populates = "calificaciones_dadas"
    )
    evaluado = relationship(
        "Usuario", 
        foreign_keys = [id_evaluado], 
        back_populates = "calificaciones_recibidas"
    )

# ALMACENAR LOS REPORTES CON EVIDENCIAS HACÍA LOS ADMINISTRADORES
class Reporte(Base):
    __tablename__ = "reportes"
    __table_args__ = (
        CheckConstraint(
            "id_reportador != id_reportado", 
            name = "ck_reporte_distintos"
        ), 
        {"schema": "cgo_adm"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_reportador = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_reporte_reportador"
        ), 
        nullable = False
    )
    id_reportado = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_reporte_reportado"
        ), 
        nullable = False
    )
    id_viaje = Column(
        Integer, 
        ForeignKey(
            "cgo_via.viajes.id", 
            name = "fk_reporte_viaje"
        ), 
        nullable = False
    )
    id_motivo_reporte = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.motivos_reportes.id", 
            name = "fk_reporte_motivo"
        )
    )
    motivo_personalizado = Column(Text)
    evidencias = Column(JSONB)
    id_estado_reporte = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_reportes.id", 
            name = "fk_reporte_estado"
        ), 
        nullable = False, 
        default = 1, 
        server_default = "1"
    )
    notas_administrador = Column(Text)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    reportador = relationship(
        "Usuario", 
        foreign_keys = [id_reportador], 
        back_populates = "reportes_emitidos"
    )
    reportado = relationship(
        "Usuario", 
        foreign_keys = [id_reportado], 
        back_populates = "reportes_recibidos"
    )
    viaje = relationship(
        "Viaje", 
        back_populates = "reportes"
    )
    motivo_reporte = relationship(
        "MotivoReporte", 
        back_populates = "reportes"
    )
    estatus_reporte = relationship(
        "EstatusReporte", 
        back_populates = "reportes"
    )

# ALMACENAR LAS SANCIONES APLICADAS A LOS USUARIOS POR LOS ADMINISTRADORES
class Sancion(Base):
    __tablename__ = "sanciones"
    __table_args__ = (
        CheckConstraint(
            "fecha_fin is null or fecha_fin >= fecha_inicio", 
            name = "ck_sancion_fechas"
        ), 
        {"schema": "cgo_adm"}
    )

    id = Column(Integer, Identity(always = True), primary_key = True)
    id_usuario = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_sancion_usuario"
        ), 
        nullable = False
    )
    id_administrador = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_sancion_administrador"
        ), 
        nullable = False
    )
    id_estatus_usuario = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.estatus_usuarios.id", 
            name = "fk_sancion_estatus"
        ), 
        nullable = False
    )
    fecha_inicio = Column(Date, nullable = False, server_default = text("current_date"))
    fecha_fin = Column(Date)
    vigente = Column(Boolean, default = True, server_default = "true")
    notas_administrador = Column(Text)
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    usuario = relationship(
        "Usuario", 
        foreign_keys = [id_usuario], 
        back_populates = "sanciones_recibidas"
    )
    administrador = relationship(
        "Usuario", 
        foreign_keys = [id_administrador], 
        back_populates = "sanciones_aplicadas"
    )
    estatus_usuario = relationship(
        "EstatusUsuario", 
        back_populates = "sanciones"
    )


# ---------------------
# | ESQUEMA "cgo_not" |
# ---------------------

# ALMACENAR EL HISTORIAL DE NOTIFICACIONES PUSH ENVIADAS A LOS USUARIOS
class Notificacion(Base):
    __tablename__ = "notificaciones"
    __table_args__ = {"schema": "cgo_not"}

    id = Column(BigInteger, Identity(always = True), primary_key = True)
    id_usuario = Column(
        Integer, 
        ForeignKey(
            "cgo_usu.usuarios.id", 
            name = "fk_notificacion_usuario"
        ), 
        nullable = False
    )
    id_tipo_notificacion = Column(
        SmallInteger, 
        ForeignKey(
            "cgo_cat.tipos_notificaciones.id", 
            name = "fk_notificacion_tipo"
        ), 
        nullable = False
    )
    titulo = Column(String(100), nullable = False)
    cuerpo = Column(String(500), nullable = False)
    leida = Column(Boolean, default = False, server_default = "false")
    fecha_hora_registro = Column(DateTime(timezone = True), nullable = False, server_default = text("now()"))
    # RELACIONES
    usuario = relationship(
        "Usuario", 
        back_populates = "notificaciones"
    )
    tipo_notificacion = relationship(
        "TipoNotificacion", 
        back_populates = "notificaciones"
    )
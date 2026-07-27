import os
from sqlalchemy.orm import Session
from data.database import SessionLocal
from data.models import(
    Usuario, 
    Rol, 
    RolUsuario, 
    MetodoPago, 
    EstatusViaje, 
    EstatusSolicitud, 
    MotivoReporte, 
    EstatusReporte, 
    EstatusSocial, 
    TipoChat, 
    EstatusUsuario, 
    TipoNotificacion, 
    EstatusPago
)
from security.auth import hashPassword, env_settings


SUPERADMIN_PASSWORD = getattr(env_settings, "superadmin_password_temporal_super_secreta", None) or os.getenv("SUPERADMIN_PASSWORD", "superadmin_password_temporal_super_secreta")

def poblarBaseDeDatos(db: Session):
    roles_data = [
        {"nombre": "Pasajero", "descripcion": "Alumno o docente que reserva un asiento en un trayecto"}, 
        {"nombre": "Conductor", "descripcion": "Alumno o docente validado que comparte su vehículo"}, 
        {"nombre": "Administrador", "descripcion": "Personal institucional con control de reportes y penalizaciones"}, 
        {"nombre": "Superadministrador", "descripcion": "Personal con acceso y control de todo el sistema"}
    ]
    for rol in roles_data:
        existe = db.query(Rol).filter(Rol.nombre == rol["nombre"]).first()
        if not existe:
            db.add(Rol(**rol))

    metodos_pago_data = [
        {"nombre": "Efectivo"}, 
        {"nombre": "Transferencia SPEI"}
    ]
    for mp in metodos_pago_data:
        existe = db.query(MetodoPago).filter(MetodoPago.nombre == mp["nombre"]).first()
        if not existe:
            db.add(MetodoPago(**mp))

    estatus_viajes_data = [
        {"nombre": "Programado", "descripcion": "El viaje está abierto y recibe solicitudes"}, 
        {"nombre": "En curso", "descripcion": "El conductor inició el trayecto en el mapa"}, 
        {"nombre": "Finalizado", "descripcion": "El viaje concluyó exitosamente en el destino"}, 
        {"nombre": "Cancelado", "descripcion": "El viaje fue annulado por motivos de fuerza mayor"}
    ]
    for ev in estatus_viajes_data:
        existe = db.query(EstatusViaje).filter(EstatusViaje.nombre == ev["nombre"]).first()
        if not existe:
            db.add(EstatusViaje(**ev))

    estatus_solicitudes_data = [
        {"nombre": "Pendiente", "descripcion": "Esperando la aprobación o rechazo del conductor"}, 
        {"nombre": "Negociando", "descripcion": "El conductor propuso un punto intermedio alternativo"}, 
        {"nombre": "Aceptada", "descripcion": "El pasajero cuenta con su lugar reservado en el vehículo"}, 
        {"nombre": "Rechazada", "descripcion": "El conductor denegó la solicitud de reserva"}, 
        {"nombre": "Cancelada", "descripcion": "El pasajero decidió bajarse del viaje antes de iniciar"}
    ]
    for es in estatus_solicitudes_data:
        existe = db.query(EstatusSolicitud).filter(EstatusSolicitud.nombre == es["nombre"]).first()
        if not existe:
            db.add(EstatusSolicitud(**es))

    motivos_reportes_data = [
        {"nombre": "Conducción temeraria", "gravedad": 8}, 
        {"nombre": "Acoso o lenguaje inapropiado", "gravedad": 10}, 
        {"nombre": "No se presentó al punto de encuentro", "gravedad": 5}, 
        {"nombre": "Vehículo diferente al registrado", "gravedad": 6}, 
        {"nombre": "Cobro excesivo o por fuera de la app", "gravedad": 7}, 
        {"nombre": "Limpieza deficiente del auto", "gravedad": 3}
    ]
    for mr in motivos_reportes_data:
        existe = db.query(MotivoReporte).filter(MotivoReporte.nombre == mr["nombre"]).first()
        if not existe:
            db.add(MotivoReporte(**mr))

    estatus_reportes_data = [
        {"nombre": "Pendiente", "descripcion": "El reporte fue enviado y espera revisión"}, 
        {"nombre": "En revisión", "descripcion": "Un administrador analiza las evidencias del caso"}, 
        {"nombre": "Resuelto", "descripcion": "Se ha tomado una determinación y cerrado el caso"}, 
        {"nombre": "Descartado", "descripcion": "El reporte no cuenta con fundamentos o pruebas válidas"}
    ]
    for er in estatus_reportes_data:
        existe = db.query(EstatusReporte).filter(EstatusReporte.nombre == er["nombre"]).first()
        if not existe:
            db.add(EstatusReporte(**er))

    estatus_sociales_data = [
        {"nombre": "Pendiente"}, 
        {"nombre": "Aceptado"}, 
        {"nombre": "Bloqueado"}
    ]
    for esoc in estatus_sociales_data:
        existe = db.query(EstatusSocial).filter(EstatusSocial.nombre == esoc["nombre"]).first()
        if not existe:
            db.add(EstatusSocial(**esoc))

    tipos_chats_data = [
        {"nombre": "Directo"}, 
        {"nombre": "Viaje"}
    ]
    for tc in tipos_chats_data:
        existe = db.query(TipoChat).filter(TipoChat.nombre == tc["nombre"]).first()
        if not existe:
            db.add(TipoChat(**tc))

    estatus_usuarios_data = [
        {"nombre": "Activo", "dias_sancion": None}, 
        {"nombre": "Advertido", "dias_sancion": 0}, 
        {"nombre": "Infracción leve", "dias_sancion": 1}, 
        {"nombre": "Infracción media", "dias_sancion": 3}, 
        {"nombre": "Infracción grave", "dias_sancion": 3}, 
        {"nombre": "Inactivo", "dias_sancion": None}
    ]
    for eu in estatus_usuarios_data:
        existe = db.query(EstatusUsuario).filter(EstatusUsuario.nombre == eu["nombre"]).first()
        if not existe:
            db.add(EstatusUsuario(**eu))

    tipos_notificaciones_data = [
        {"nombre": "La solicitud de viaje fue recibida"}, 
        {"nombre": "El viaje ha sido aceptado"}, 
        {"nombre": "El conductor está en camino"}, 
        {"nombre": "El conductor llegó al punto de encuentro"}, 
        {"nombre": "El viaje ha sido cancelado"}, 
        {"nombre": "Tienes un nuevo mensaje"}
    ]
    for tn in tipos_notificaciones_data:
        existe = db.query(TipoNotificacion).filter(TipoNotificacion.nombre == tn["nombre"]).first()
        if not existe:
            db.add(TipoNotificacion(**tn))

    estatus_pagos_data = [
        {"nombre": "Pendiente", "descripcion": "La transferencia SPEI se encuentra en proceso de validación"}, 
        {"nombre": "Completada", "descripcion": "Los fondos fueron liquidados exitosamente en la cuenta del conductor"}, 
        {"nombre": "Fallida", "descripcion": "La transacción fue rechazada por la pasarela bancaria"}, 
        {"nombre": "Reembolsado", "descripcion": "El dinero fue devuelto al pasajero por la cancelación del viaje"}
    ]
    for ep in estatus_pagos_data:
        existe = db.query(EstatusPago).filter(EstatusPago.nombre == ep["nombre"]).first()
        if not existe:
            db.add(EstatusPago(**ep))
    db.commit()

    correo_superadmin = "superadmin@upq.edu.mx"
    existe_superadmin = db.query(Usuario).filter(Usuario.correo_institucional == correo_superadmin).first()
    if not existe_superadmin:
        raw_password = SUPERADMIN_PASSWORD.get_secret_value() if hasattr(SUPERADMIN_PASSWORD, "get_secret_value") else str(SUPERADMIN_PASSWORD)
        nuevo_superadmin = Usuario(
            nombre_completo = "Superadministrador de Cardenal GO", 
            matricula = "000000000", 
            correo_institucional = correo_superadmin, 
            contrasena_hash = hashPassword(raw_password)
        )
        db.add(nuevo_superadmin)
        db.flush()
        rol_admin_db = db.query(Rol).filter(Rol.nombre == "Superadministrador").first()
        if rol_admin_db:
            asignacion_rol = RolUsuario(id_usuario = nuevo_superadmin.id, id_rol = rol_admin_db.id)
            db.add(asignacion_rol)
        db.commit()

if __name__ == "__main__":
    session = SessionLocal()
    try:
        poblarBaseDeDatos(session)
    finally:
        session.close()
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from data.database import getDB
from security.auth import requireRole, get_current_user
from data.models import SolicitudConductor, Conductor, Notificacion
from models.schemas import (
    SolicitudConductorCreate, 
    SolicitudConductorResponse, 
    ProcesarSolicitudSchema
)

router = APIRouter(prefix = "/api", tags = ["Solicitudes de conductores"])

@router.post(
    "/usu/solicitudes_conductores", 
    response_model = SolicitudConductorResponse, 
    status_code = status.HTTP_201_CREATED
)
def crear_solicitud_conductor(
    datos: SolicitudConductorCreate, 
    db: Session = Depends(getDB)
):
    conductor_existente = db.query(Conductor).filter(Conductor.id_usuario == datos.id_usuario).first()
    if conductor_existente:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = "El usuario ya está registrado como conductor activo."
        )
    solicitud_pendiente = db.query(SolicitudConductor).filter(
        SolicitudConductor.id_usuario == datos.id_usuario,
        SolicitudConductor.estatus == "Pendiente"
    ).first()
    if solicitud_pendiente:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST, 
            detail = "Ya tienes una solicitud pendiente de revisión"
        )
    nueva_solicitud = SolicitudConductor(
        id_usuario = datos.id_usuario, 
        telefono = datos.telefono, 
        licencia_conducir = datos.licencia_conducir, 
        url_foto_ine = datos.url_foto_ine, 
        clabe_interbancaria = datos.clabe_interbancaria, 
        nombre_banco = datos.nombre_banco, 
        nombre_titular_cuenta = datos.nombre_titular_cuenta, 
        estatus = "Pendiente"
    )
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)
    return nueva_solicitud

@router.get(
    "/adm/solicitudes_conductores/pendientes",
    response_model=List[dict]
)
def obtener_solicitudes_pendientes(
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))
):
    solicitudes = db.query(SolicitudConductor).filter(SolicitudConductor.estatus == 'Pendiente').all()
    resultado = []
    for sol in solicitudes:
        resultado.append({
            "id_notificacion": sol.id,
            "titulo": "Nueva solicitud de conductor",
            "cuerpo": f"El usuario con ID {sol.id_usuario} desea registrarse como conductor",
            "datos_solicitud": {
                "id_usuario": sol.id_usuario,
                "telefono": sol.telefono,
                "licencia_conducir": sol.licencia_conducir,
                "url_foto_ine": sol.url_foto_ine,
                "clabe_interbancaria": sol.clabe_interbancaria,
                "nombre_banco": sol.nombre_banco,
                "nombre_titular_cuenta": sol.nombre_titular_cuenta
            }
        })
    return resultado

@router.post(
    "/adm/solicitudes_conductores/{solicitud_id}/procesar",
    status_code = status.HTTP_200_OK
)
def procesar_solicitud_conductor(
    solicitud_id: int, 
    datos: ProcesarSolicitudSchema, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))
):
    solicitud = db.query(SolicitudConductor).filter(SolicitudConductor.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND, 
            detail = "La solicitud especificada no existe."
        )
    if solicitud.estatus != "Pendiente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail = f"Esta solicitud ya ha sido procesada previamente (Estatus: {solicitud.estatus})"
        )
    if datos.accion == "aceptar":
        nuevo_conductor = Conductor(
            id_usuario = solicitud.id_usuario, 
            telefono = solicitud.telefono, 
            licencia_conducir = solicitud.licencia_conducir, 
            url_foto_ine = solicitud.url_foto_ine, 
            ine_valida = True, 
            clabe_interbancaria = solicitud.clabe_interbancaria, 
            nombre_banco = solicitud.nombre_banco, 
            nombre_titular_cuenta = solicitud.nombre_titular_cuenta
        )
        db.add(nuevo_conductor)
        solicitud.estatus = "Aceptada"
        
        notificacion = Notificacion(
            id_usuario = solicitud.id_usuario, 
            id_tipo_notificacion = 1, 
            titulo = "Solicitud aprobada", 
            cuerpo = "¡Tu solicitud para ser conductor ha sido aprobada!"
        )
        db.add(notificacion)
    elif datos.accion == "rechazar":
        solicitud.estatus = "Rechazada"
        notificacion = Notificacion(
            id_usuario = solicitud.id_usuario, 
            id_tipo_notificacion = 1, 
            titulo = "Solicitud rechazada", 
            cuerpo = f"Tu solicitud para ser conductor ha sido rechazada. Motivo: {datos.motivo}"
        )
        db.add(notificacion)
    db.commit()
    return {
        "success": True, 
        "message": f"La solicitud ha sido {datos.accion}da con éxito"
    }
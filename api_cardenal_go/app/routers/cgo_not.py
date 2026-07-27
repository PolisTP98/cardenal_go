# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Notificacion
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/not", tags = ["Notificaciones"])


# --------------------------------------
# | OPERACIONES CRUD DE NOTIFICACIONES |
# --------------------------------------

@router.post("/", response_model = schemas.NotificacionResponse, status_code = status.HTTP_201_CREATED, summary = "Enviar notificación")
def enviarNotificacion(
    notificacion_in: schemas.NotificacionCreate, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))
):
    nueva_notificacion = Notificacion(**notificacion_in.model_dump())
    db.add(nueva_notificacion)
    db.commit()
    db.refresh(nueva_notificacion)
    return nueva_notificacion

@router.get("/", response_model = List[schemas.NotificacionResponse], summary = "Obtener todas las notificaciones")
def obtenerTodasLasNotificaciones(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))
):
    return db.query(Notificacion).offset(skip).limit(limit).all()

@router.get("/buscar", response_model = List[schemas.NotificacionResponse], summary = "Buscar notificacion(es) con filtros dinámicos")
def buscarNotificaciones(
    usuario_id: Optional[int] = Query(None, description = "Filtrar por ID del usuario"), 
    titulo: Optional[str] = Query(None, description = "Filtrar por título (coincidencia parcial)"), 
    cuerpo: Optional[str] = Query(None, description = "Filtrar por cuerpo del mensaje (coincidencia parcial)"), 
    leida: Optional[bool] = Query(None, description = "Filtrar por leídas (true/false)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Notificacion)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter(Notificacion.id_usuario == current_user_id)
    elif usuario_id:
        query = query.filter(Notificacion.id_usuario == usuario_id)
    if titulo:
        query = query.filter(Notificacion.titulo.ilike(f"%{titulo}%"))
    if cuerpo:
        query = query.filter(Notificacion.cuerpo.ilike(f"%{cuerpo}%"))
    if leida is not None:
        query = query.filter(Notificacion.leida == leida)
    return query.order_by(Notificacion.fecha_hora_registro.desc()).offset(skip).limit(limit).all()

@router.get("/usuario/{usuario_id}", response_model = List[schemas.NotificacionResponse], summary = "Obtener todas las notificaciones de un usuario por su ID")
def obtenerNotificacionesUsuario(
    usuario_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario_id), is_admin)
    return db.query(Notificacion)\
            .filter(Notificacion.id_usuario == usuario_id)\
            .order_by(Notificacion.fecha_hora_registro.desc())\
            .all()

@router.get("/{notificacion_id}", response_model = schemas.NotificacionResponse, summary = "Obtener notificación por ID")
def obtenerNotificacionPorId(
    notificacion_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notificacion:
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = "Notificación no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(notificacion.id_usuario), is_admin)
    return notificacion

@router.patch("/{notificacion_id}", response_model = schemas.NotificacionResponse, summary = "Actualizar estatus de notificación por ID")
def actualizarNotificacion(
    notificacion_id: int, 
    notificacion_in: schemas.NotificacionUpdate, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notificacion:
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = "Notificación no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(notificacion.id_usuario), is_admin)
    for key, value in notificacion_in.model_dump(exclude_unset=True).items():
        setattr(notificacion, key, value)
    db.commit()
    db.refresh(notificacion)
    return notificacion

@router.delete("/{notificacion_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar una notificación por ID")
def eliminarNotificacion(
    notificacion_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notificacion:
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = "Notificación no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(notificacion.id_usuario), is_admin)
    db.delete(notificacion)
    db.commit()
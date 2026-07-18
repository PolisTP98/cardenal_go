# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from data.database import getDB
from data.models import Notificacion
from models import schemas
from security.auth import verifyToken, requireRole
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/not", tags = ["Notificaciones"])


# --------------------------------------
# | OPERACIONES CRUD DE NOTIFICACIONES |
# --------------------------------------

@router.post("/", response_model = schemas.NotificacionResponse, status_code = status.HTTP_201_CREATED, summary = "Enviar notificación")
def enviarNotificacion(notificacion_in: schemas.NotificacionCreate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    nueva_notificacion = Notificacion(**notificacion_in.model_dump())
    db.add(nueva_notificacion)
    db.commit()
    db.refresh(nueva_notificacion)
    return nueva_notificacion

@router.get("/{usuario_id}", response_model = List[schemas.NotificacionResponse], summary = "Obtener todas las notificaciones de un usuario por su ID")
def obtenerNotificacionesUsuario(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    if str(payload.get("sub")) != str(usuario_id): raise HTTPException(status_code = 403, detail = "No autorizado")
    notificaciones = db.query(Notificacion).filter(Notificacion.id_usuario == usuario_id).all()
    return notificaciones

@router.patch("/{notificacion_id}/leer", summary = "Marcar una notificación como leída por su ID")
def marcarNotificacionLeida(notificacion_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notificacion:
        raise HTTPException(status_code = 404, detail = "Notificación no encontrada")
    notificacion.leida = True
    db.commit()
    return {"status": "ok", "message": "Notificación marcada como leída"}

@router.get("/reportes/{formato}", summary = "Generar reporte de notificaciones")
def exportarReporteNotificaciones(
    formato: str, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Superadministrador"]))
):
    lista_notificaciones = db.query(Notificacion).all()
    titulo = "historial_de_notificaciones-cardenal_go"
    if formato.lower() == "pdf":
        return generarReportePDF(lista_notificaciones, titulo)
    elif formato.lower() == "word":
        return generarReporteWord(lista_notificaciones, titulo)
    elif formato.lower() == "excel":
        return generarReporteExcel(lista_notificaciones, titulo)
    else:
        raise HTTPException(status_code = 400, detail = "Formato no soportado. Usa PDF, Word o Excel")
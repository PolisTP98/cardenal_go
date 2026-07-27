# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Calificacion, Reporte, Sancion
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/adm", tags = ["Administración"])


# --------------------------------------
# | OPERACIONES CRUD DE CALIFICACIONES |
# --------------------------------------

@router.post("/calificaciones", response_model = schemas.CalificacionResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar calificación de viaje")
def crearCalificacion(calificacion_in: schemas.CalificacionCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(calificacion_in.id_evaluador), is_admin)
    nueva_calificacion = Calificacion(**calificacion_in.model_dump())
    db.add(nueva_calificacion)
    db.commit()
    db.refresh(nueva_calificacion)
    return nueva_calificacion

@router.get("/calificaciones", response_model = List[schemas.CalificacionResponse], summary = "Obtener todas las calificaciones")
def obtenerCalificaciones(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    return db.query(Calificacion).offset(skip).limit(limit).all()

@router.get("/calificaciones/buscar", response_model = List[schemas.CalificacionResponse], summary = "Buscar calificación(es) con filtros dinámicos")
def buscarCalificaciones(
    id_viaje: Optional[int] = Query(None, description = "Filtrar por ID del viaje"),
    id_evaluado: Optional[int] = Query(None, description = "Filtrar por ID del usuario evaluado"),
    id_evaluador: Optional[int] = Query(None, description = "Filtrar por ID del usuario evaluador"),
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Calificacion)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter((Calificacion.id_evaluador == current_user_id) | (Calificacion.id_evaluado == current_user_id))
    if id_viaje:
        query = query.filter(Calificacion.id_viaje == id_viaje)
    if id_evaluado:
        query = query.filter(Calificacion.id_evaluado == id_evaluado)
    if id_evaluador:
        query = query.filter(Calificacion.id_evaluador == id_evaluador)
    return query.offset(skip).limit(limit).all()

@router.get("/calificaciones/{viaje_id}/{evaluador_id}", response_model = schemas.CalificacionResponse, summary = "Obtener calificación por ID de viaje y/o evaluador")
def obtenerCalificacion(viaje_id: int, evaluador_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    calificacion = db.query(Calificacion).filter(Calificacion.id_viaje == viaje_id, Calificacion.id_evaluador == evaluador_id).first()
    if not calificacion:
        raise HTTPException(status_code = 404, detail = "Calificación no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    if str(payload.get("sub")) not in [str(calificacion.id_evaluador), str(calificacion.id_evaluado)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "Acceso denegado: No tienes permisos sobre este recurso")
    return calificacion

@router.patch("/calificaciones/{viaje_id}/{evaluador_id}", response_model = schemas.CalificacionResponse, summary = "Actualizar calificación por ID de viaje y/o evaluador")
def actualizarCalificacion(viaje_id: int, evaluador_id: int, calificacion_in: schemas.CalificacionUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    calificacion = db.query(Calificacion).filter(Calificacion.id_viaje == viaje_id, Calificacion.id_evaluador == evaluador_id).first()
    if not calificacion:
        raise HTTPException(status_code = 404, detail = "Calificación no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(calificacion.id_evaluador), is_admin)
    for key, value in calificacion_in.model_dump(exclude_unset = True).items():
        setattr(calificacion, key, value)
    db.commit()
    db.refresh(calificacion)
    return calificacion

@router.delete("/calificaciones/{viaje_id}/{evaluador_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar calificación por ID de viaje y/o evaluador")
def eliminarCalificacion(viaje_id: int, evaluador_id: int, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    calificacion = db.query(Calificacion).filter(Calificacion.id_viaje == viaje_id, Calificacion.id_evaluador == evaluador_id).first()
    if not calificacion:
        raise HTTPException(status_code = 404, detail = "Calificación no encontrada")
    db.delete(calificacion)
    db.commit()


# --------------------------------
# | OPERACIONES CRUD DE REPORTES |
# --------------------------------

@router.post("/reportes", response_model = schemas.ReporteResponse, status_code = status.HTTP_201_CREATED, summary = "Crear reporte")
def crearReporte(reporte_in: schemas.ReporteCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(reporte_in.id_reportador), is_admin)
    nuevo_reporte = Reporte(**reporte_in.model_dump())
    db.add(nuevo_reporte)
    db.commit()
    db.refresh(nuevo_reporte)
    return nuevo_reporte

@router.get("/reportes", response_model = List[schemas.ReporteResponse], summary = "Obtener todos los reportes")
def obtenerReportes(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    return db.query(Reporte).offset(skip).limit(limit).all()

@router.get("/reportes/buscar", response_model = List[schemas.ReporteResponse], summary = "Buscar reporte(s) con filtros dinámicos")
def buscarReportes(
    id_reportado: Optional[int] = Query(None, description = "Filtrar por ID del usuario reportado"), 
    id_estado_reporte: Optional[int] = Query(None, description = "Filtrar por ID del estado del reporte"), 
    motivo_personalizado: Optional[str] = Query(None, description = "Filtrar por motivo (coincidencia parcial)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Reporte)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter(Reporte.id_reportador == current_user_id)
    if id_reportado:
        query = query.filter(Reporte.id_reportado == id_reportado)
    if id_estado_reporte is not None:
        query = query.filter(Reporte.id_estado_reporte == id_estado_reporte)
    if motivo_personalizado:
        query = query.filter(Reporte.motivo_personalizado.ilike(f"%{motivo_personalizado}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/reportes/{reporte_id}", response_model = schemas.ReporteResponse, summary = "Obtener reporte por ID")
def obtenerReportePorId(reporte_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code = 404, detail = "Reporte no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(reporte.id_reportador), is_admin)
    return reporte

@router.patch("/reportes/{reporte_id}", response_model = schemas.ReporteResponse, summary = "Actualizar reporte por ID")
def actualizarReporte(reporte_id: int, reporte_in: schemas.ReporteUpdate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code = 404, detail = "Reporte no encontrado")
    for key, value in reporte_in.model_dump(exclude_unset = True).items():
        setattr(reporte, key, value)
    db.commit()
    db.refresh(reporte)
    return reporte

@router.delete("/reportes/{reporte_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar reporte por ID")
def eliminarReporte(reporte_id: int, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code = 404, detail = "Reporte no encontrado")
    db.delete(reporte)
    db.commit()


# ---------------------------------
# | OPERACIONES CRUD DE SANCIONES |
# ---------------------------------

@router.post("/sanciones", response_model = schemas.SancionResponse, status_code = status.HTTP_201_CREATED, summary = "Aplicar sanción a usuario")
def aplicarSancion(sancion_in: schemas.SancionCreate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    verifyResourceOwnership(payload.get("sub"), str(sancion_in.id_administrador), is_admin = True)
    nueva_sancion = Sancion(**sancion_in.model_dump())
    db.add(nueva_sancion)
    db.commit()
    db.refresh(nueva_sancion)
    return nueva_sancion

@router.get("/sanciones", response_model = List[schemas.SancionResponse], summary = "Obtener todas las sanciones")
def obtenerSanciones(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    return db.query(Sancion).offset(skip).limit(limit).all()

@router.get("/sanciones/buscar", response_model = List[schemas.SancionResponse], summary = "Buscar sanciones con filtros dinámicos")
def buscarSanciones(
    id_usuario: Optional[int] = Query(None, description = "Filtrar por ID exacto del usuario sancionado"), 
    vigente: Optional[bool] = Query(None, description = "Filtrar por vigencia"), 
    id_estatus_usuario: Optional[int] = Query(None, description = "Filtrar por estatus aplicado"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Sancion)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter(Sancion.id_usuario == current_user_id)
    elif id_usuario:
        query = query.filter(Sancion.id_usuario == id_usuario)
    if vigente is not None:
        query = query.filter(Sancion.vigente == vigente)
    if id_estatus_usuario is not None:
        query = query.filter(Sancion.id_estatus_usuario == id_estatus_usuario)
    return query.offset(skip).limit(limit).all()

@router.get("/sanciones/{sancion_id}", response_model = schemas.SancionResponse, summary = "Obtener sanción por ID")
def obtenerSancionPorId(sancion_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    sancion = db.query(Sancion).filter(Sancion.id == sancion_id).first()
    if not sancion:
        raise HTTPException(status_code = 404, detail = "Sanción no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(sancion.id_usuario), is_admin)
    return sancion

@router.patch("/sanciones/{sancion_id}", response_model = schemas.SancionResponse, summary = "Actualizar sanción por ID")
def actualizarSancion(sancion_id: int, sancion_in: schemas.SancionUpdate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    sancion = db.query(Sancion).filter(Sancion.id == sancion_id).first()
    if not sancion:
        raise HTTPException(status_code = 404, detail = "Sanción no encontrada")
    for key, value in sancion_in.model_dump(exclude_unset=True).items():
        setattr(sancion, key, value)
    db.commit()
    db.refresh(sancion)
    return sancion

@router.delete("/sanciones/{sancion_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar sanción por ID")
def eliminarSancion(sancion_id: int, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    sancion = db.query(Sancion).filter(Sancion.id == sancion_id).first()
    if not sancion:
        raise HTTPException(status_code = 404, detail = "Sanción no encontrada")
    db.delete(sancion)
    db.commit()


# --------------------------
# | GENERACIÓN DE REPORTES |
# --------------------------

@router.get("/reportes/exportar/{formato}", summary = "Generar reporte de incidencias")
def exportarReporteIncidencias(
    formato: str, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))
):
    lista_reportes = db.query(Reporte).all()
    titulo = "reporte_de_incidencias_y_quejas-cardenal_go"
    if formato.lower() == "pdf":
        return generarReportePDF(lista_reportes, titulo)
    elif formato.lower() == "word":
        return generarReporteWord(lista_reportes, titulo)
    elif formato.lower() == "excel":
        return generarReporteExcel(lista_reportes, titulo)
    else:
        raise HTTPException(status_code = 400, detail = "Formato no soportado. Usa PDF, Word o Excel")
# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Reporte, Sancion
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/adm", tags = ["Administración"])


# --------------------------------
# | OPERACIONES CRUD DE REPORTES |
# --------------------------------

@router.post("/reportes", response_model = schemas.ReporteResponse, status_code = status.HTTP_201_CREATED, summary = "Crear reporte")
def crearReporte(reporte_in: schemas.ReporteCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_reporte = Reporte(**reporte_in.model_dump())
    db.add(nuevo_reporte)
    db.commit()
    db.refresh(nuevo_reporte)
    return nuevo_reporte

@router.get("/reportes", response_model = List[schemas.ReporteResponse], summary = "Obtener todos los reportes")
def obtenerReportes(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    return db.query(Reporte).offset(skip).limit(limit).all()

@router.get("/reportes/buscar", response_model = List[schemas.ReporteResponse], summary = "Buscar reportes con filtros dinámicos")
def buscarReportes(
    usuario_reportado_id: Optional[int] = Query(None, description="Filtrar por ID exacto del usuario reportado"), 
    estado: Optional[str] = Query(None, description = "Filtrar por estado exacto (ej. Pendiente, Resuelto)"), 
    motivo: Optional[str] = Query(None, description = "Filtrar por motivo (coincidencia parcial)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Reporte)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter(Reporte.usuario_reporta_id == current_user_id)
    if usuario_reportado_id:
        query = query.filter(Reporte.usuario_reportado_id == usuario_reportado_id)
    if estado:
        query = query.filter(Reporte.estado == estado)
    if motivo:
        query = query.filter(Reporte.motivo.ilike(f"%{motivo}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/reportes/{reporte_id}", response_model = schemas.ReporteResponse, summary = "Obtener reporte por ID")
def obtenerReportePorId(reporte_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code = 404, detail = "Reporte no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(reporte.usuario_reporta_id), is_admin)
    return reporte

@router.put("/reportes/{reporte_id}", response_model = schemas.ReporteResponse, summary = "Actualizar reporte por ID")
def actualizarReporte(reporte_id: int, reporte_in: schemas.ReporteUpdate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code = 404, detail = "Reporte no encontrado")
    for key, value in reporte_in.model_dump(exclude_unset=True).items():
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
    usuario_sancionado_id: Optional[int] = Query(None, description = "Filtrar por ID exacto del usuario sancionado"), 
    estado: Optional[str] = Query(None, description = "Filtrar por estado exacto (ej. Activa, Cumplida)"), 
    tipo: Optional[str] = Query(None, description = "Filtrar por tipo de sanción (coincidencia parcial)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Sancion)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter(Sancion.usuario_sancionado_id == current_user_id)
    elif usuario_sancionado_id:
        query = query.filter(Sancion.usuario_sancionado_id == usuario_sancionado_id)
    if estado:
        query = query.filter(Sancion.estado == estado)
    if tipo:
        query = query.filter(Sancion.tipo.ilike(f"%{tipo}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/sanciones/{sancion_id}", response_model = schemas.SancionResponse, summary = "Obtener sanción por ID")
def obtenerSancionPorId(sancion_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    sancion = db.query(Sancion).filter(Sancion.id == sancion_id).first()
    if not sancion:
        raise HTTPException(status_code = 404, detail = "Sanción no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(sancion.usuario_sancionado_id), is_admin)
    return sancion

@router.put("/sanciones/{sancion_id}", response_model = schemas.SancionResponse, summary = "Actualizar sanción por ID")
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
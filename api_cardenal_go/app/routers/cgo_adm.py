# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from data.database import getDB
from data.models import Reporte, Sancion
from models import schemas
from security.auth import verifyToken, requireRole
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
def obtenerReportes(db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    return db.query(Reporte).all()

@router.post("/sanciones", response_model = schemas.SancionResponse, status_code = status.HTTP_201_CREATED, summary = "Aplicar sanción")
def aplicarSancion(sancion_in: schemas.SancionCreate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))):
    nueva_sancion = Sancion(**sancion_in.model_dump())
    db.add(nueva_sancion)
    db.commit()
    db.refresh(nueva_sancion)
    return nueva_sancion


# --------------------------
# | GENERACIÓN DE REPORTES |
# --------------------------

@router.get("/reportes/{formato}", summary = "Generar reporte de incidencias")
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
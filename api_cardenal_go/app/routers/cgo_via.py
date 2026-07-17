# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from data.database import getDB
from data.models import Viaje
from models import schemas
from security.auth import verifyToken, requireRole
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/via", tags = ["Viajes"])


# ------------------------------
# | OPERACIONES CRUD DE VIAJES |
# ------------------------------

@router.post("/", response_model = schemas.ViajeResponse, status_code = status.HTTP_201_CREATED, summary = "Crear viaje")
def crearViaje(viaje_in: schemas.ViajeCreate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Conductor"]))):
    nuevo_viaje = Viaje(**viaje_in.model_dump())
    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)
    return nuevo_viaje

@router.get("/", response_model=List[schemas.ViajeResponse], summary = "Obtener todos los viajes")
def obtenerViajes(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viajes = db.query(Viaje).offset(skip).limit(limit).all()
    return viajes

@router.get("/{viaje_id}", response_model = schemas.ViajeResponse, summary = "Obtener viaje por ID")
def obtenerViajePorId(viaje_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    return viaje

@router.put("/{viaje_id}", response_model = schemas.ViajeResponse, summary = "Actualizar viaje por ID")
def actualizarViaje(viaje_id: int, viaje_in: schemas.ViajeUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    for key, value in viaje_in.model_dump(exclude_unset = True).items():
        setattr(viaje, key, value)
    db.commit()
    db.refresh(viaje)
    return viaje


# --------------------------
# | GENERACIÓN DE REPORTES |
# --------------------------

@router.get("/reportes/{formato}", summary = "Generar reporte de viajes")
def exportarReporteViajes(
    formato: str, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))
):
    lista_viajes = db.query(Viaje).all()
    titulo = "reporte_de_viajes-cardenal_go"
    if formato.lower() == "pdf":
        return generarReportePDF(lista_viajes, titulo)
    elif formato.lower() == "word":
        return generarReporteWord(lista_viajes, titulo)
    elif formato.lower() == "excel":
        return generarReporteExcel(lista_viajes, titulo)
    else:
        raise HTTPException(status_code = 400, detail = "Formato no soportado. Usa PDF, Word o Excel")
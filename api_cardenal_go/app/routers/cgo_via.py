# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Viaje, Vehiculo, SolicitudViaje, PagoTransferencia, HistorialUbicacionViaje
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership
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
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id == viaje_in.id_vehiculo).first()
    if not vehiculo or not vehiculo.conductor:
        raise HTTPException(status_code = 404, detail = "Vehículo o conductor asociado no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(vehiculo.conductor.id_usuario), is_admin)
    datos_viaje = viaje_in.model_dump()
    datos_viaje["asientos_disponibles"] = viaje_in.asientos_totales
    datos_viaje["ubicacion_inicio"] = f"POINT({viaje_in.ubicacion_inicio.longitude} {viaje_in.ubicacion_inicio.latitude})"
    datos_viaje["ubicacion_destino"] = f"POINT({viaje_in.ubicacion_destino.longitude} {viaje_in.ubicacion_destino.latitude})"
    nuevo_viaje = Viaje(**datos_viaje)
    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)
    return nuevo_viaje

@router.get("/", response_model = List[schemas.ViajeResponse], summary = "Obtener todos los viajes")
def obtenerViajes(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(Viaje).offset(skip).limit(limit).all()

@router.get("/buscar", response_model = List[schemas.ViajeResponse], summary = "Buscar viaje(s) con filtros dinámicos")
def buscarViajes(
    vehiculo_id: Optional[int] = Query(None, description = "Filtrar por ID del vehiculo"), 
    estatus_id: Optional[int] = Query(None, description = "Filtrar por ID del estatus"), 
    fecha: Optional[date] = Query(None, description = "Filtrar por fecha"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Viaje)
    if vehiculo_id:
        query = query.filter(Viaje.id_vehiculo == vehiculo_id)
    if estatus_id:
        query = query.filter(Viaje.id_estatus == estatus_id)
    if fecha:
        query = query.filter(Viaje.fecha == fecha)
    return query.offset(skip).limit(limit).all()

@router.get("/{viaje_id}", response_model = schemas.ViajeResponse, summary = "Obtener viaje por ID")
def obtenerViajePorId(viaje_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    return viaje

@router.patch("/{viaje_id}", response_model = schemas.ViajeResponse, summary = "Actualizar viaje por ID")
def actualizarViaje(viaje_id: int, viaje_in: schemas.ViajeUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not viaje or not viaje.vehiculo or not viaje.vehiculo.conductor:
        raise HTTPException(status_code = 404, detail = "Viaje o datos asociados no encontrados")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(viaje.vehiculo.conductor.id_usuario), is_admin)
    for key, value in viaje_in.model_dump(exclude_unset = True).items():
        setattr(viaje, key, value)
    db.commit()
    db.refresh(viaje)
    return viaje

@router.delete("/{viaje_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar viaje por ID")
def eliminarViaje(viaje_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viaje = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not viaje or not viaje.vehiculo or not viaje.vehiculo.conductor:
        raise HTTPException(status_code = 404, detail = "Viaje o datos asociados no encontrados")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(viaje.vehiculo.conductor.id_usuario), is_admin)
    db.delete(viaje)
    db.commit()


# ---------------------------------------------
# | OPERACIONES CRUD DE SOLICITUDES DE VIAJES |
# ---------------------------------------------

@router.post("/solicitudes/", response_model = schemas.SolicitudViajeResponse, status_code = status.HTTP_201_CREATED, summary = "Crear solicitud de viaje")
def crearSolicitud(solicitud_in: schemas.SolicitudViajeCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(solicitud_in.id_pasajero), is_admin)
    datos_solicitud = solicitud_in.model_dump()
    datos_solicitud["ubicacion_recogida"] = f"POINT({solicitud_in.ubicacion_recogida.longitude} {solicitud_in.ubicacion_recogida.latitude})"
    datos_solicitud["ubicacion_bajada"] = f"POINT({solicitud_in.ubicacion_bajada.longitude} {solicitud_in.ubicacion_bajada.latitude})"
    nueva_solicitud = SolicitudViaje(**datos_solicitud)
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)
    return nueva_solicitud

@router.get("/solicitudes/", response_model = List[schemas.SolicitudViajeResponse], summary = "Obtener todas las solicitudes de viajes")
def obtenerSolicitudes(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(SolicitudViaje).offset(skip).limit(limit).all()

@router.get("/solicitudes/buscar", response_model = List[schemas.SolicitudViajeResponse], summary = "Buscar solicitud(es) de viaje(s) con filtros dinámicos")
def buscarSolicitudes(
    viaje_id: Optional[int] = Query(None, description = "Filtrar por ID del viaje"), 
    pasajero_id: Optional[int] = Query(None, description = "Filtrar por ID del pasajero"), 
    estatus_id: Optional[int] = Query(None, description = "Filtrar por ID del estatus"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(SolicitudViaje)
    if viaje_id:
        query = query.filter(SolicitudViaje.id_viaje == viaje_id)
    if pasajero_id:
        query = query.filter(SolicitudViaje.id_pasajero == pasajero_id)
    if estatus_id:
        query = query.filter(SolicitudViaje.id_estatus == estatus_id)
    return query.offset(skip).limit(limit).all()

@router.get("/solicitudes/{solicitud_id}", response_model = schemas.SolicitudViajeResponse, summary = "Obtener solicitud de viaje por ID")
def obtenerSolicitudPorId(solicitud_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    solicitud = db.query(SolicitudViaje).filter(SolicitudViaje.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code = 404, detail = "Solicitud de viaje no encontrada")
    return solicitud

@router.put("/solicitudes/{solicitud_id}", response_model = schemas.SolicitudViajeResponse, summary = "Actualizar solicitud por ID")
def actualizarSolicitud(solicitud_id: int, solicitud_in: schemas.SolicitudViajeUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    solicitud = db.query(SolicitudViaje).filter(SolicitudViaje.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code = 404, detail = "Solicitud de viaje no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(solicitud.id_pasajero), is_admin)
    for key, value in solicitud_in.model_dump(exclude_unset = True).items():
        setattr(solicitud, key, value)
    db.commit()
    db.refresh(solicitud)
    return solicitud

@router.delete("/solicitudes/{solicitud_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar solicitud de viaje por ID")
def eliminarSolicitud(solicitud_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    solicitud = db.query(SolicitudViaje).filter(SolicitudViaje.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code = 404, detail = "Solicitud no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(solicitud.id_pasajero), is_admin)
    db.delete(solicitud)
    db.commit()


# ----------------------------------------------
# | OPERACIONES CRUD DE PAGOS Y TRANSFERENCIAS |
# ----------------------------------------------

@router.post("/pagos/", response_model = schemas.PagoTransferenciaResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar pago/transferencia")
def crearPago(pago_in: schemas.PagoTransferenciaCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(pago_in.id_pasajero), is_admin)
    datos_pago = pago_in.model_dump()
    datos_pago["monto_neto_conductor"] = pago_in.calculo_neto
    nuevo_pago = PagoTransferencia(**datos_pago)
    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)
    return nuevo_pago

@router.get("/pagos/", response_model = List[schemas.PagoTransferenciaResponse], summary = "Obtener todos los pagos/transferencias")
def obtenerPagos(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(PagoTransferencia).offset(skip).limit(limit).all()

@router.get("/pagos/buscar", response_model = List[schemas.PagoTransferenciaResponse], summary = "Buscar pago(s)/transferencia(s) con filtros dinámicos")
def buscarPagos(
    solicitud_id: Optional[int] = Query(None, description = "Filtrar por ID de la solicitud de viaje"), 
    pasajero_id: Optional[int] = Query(None, description = "Filtrar por ID del pasajero"), 
    estatus_pago_id: Optional[int] = Query(None, description = "Filtrar por ID del estatus"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(PagoTransferencia)
    if solicitud_id:
        query = query.filter(PagoTransferencia.id_solicitud == solicitud_id)
    if pasajero_id:
        query = query.filter(PagoTransferencia.id_pasajero == pasajero_id)
    if estatus_pago_id:
        query = query.filter(PagoTransferencia.id_estatus_pago == estatus_pago_id)
    return query.offset(skip).limit(limit).all()

@router.get("/pagos/{pago_id}", response_model = schemas.PagoTransferenciaResponse, summary = "Obtener pago por ID")
def obtenerPagoPorId(pago_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    pago = db.query(PagoTransferencia).filter(PagoTransferencia.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code = 404, detail = "Pago no encontrado")
    return pago

@router.put("/pagos/{pago_id}", response_model = schemas.PagoTransferenciaResponse, summary = "Actualizar pago por ID")
def actualizarPago(pago_id: int, pago_in: schemas.PagoTransferenciaUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    pago = db.query(PagoTransferencia).filter(PagoTransferencia.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code = 404, detail = "Pago no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(pago.id_pasajero), is_admin)
    for key, value in pago_in.model_dump(exclude_unset=True).items():
        setattr(pago, key, value)
    db.commit()
    db.refresh(pago)
    return pago

@router.delete("/pagos/{pago_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar pago por ID")
def eliminarPago(pago_id: int, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))):
    pago = db.query(PagoTransferencia).filter(PagoTransferencia.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code = 404, detail = "Pago no encontrado")
    db.delete(pago)
    db.commit()


# ------------------------------------------------
# | OPERACIONES CRUD DE HISTORIAL DE UBICACIONES |
# ------------------------------------------------

@router.post("/historial-ubicacion/", response_model = schemas.HistorialUbicacionViajeResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar ubicación de viaje")
def crearHistorialUbicacion(historial_in: schemas.HistorialUbicacionViajeCreate, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Conductor"]))):
    viaje = db.query(Viaje).filter(Viaje.id == historial_in.id_viaje).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(viaje.vehiculo.conductor.id_usuario), is_admin)
    datos_historial = historial_in.model_dump()
    datos_historial["ubicacion"] = f"POINT({historial_in.ubicacion.longitude} {historial_in.ubicacion.latitude})"
    nuevo_historial = HistorialUbicacionViaje(**datos_historial)
    db.add(nuevo_historial)
    db.commit()
    db.refresh(nuevo_historial)
    return nuevo_historial

@router.get("/historial-ubicacion/", response_model = List[schemas.HistorialUbicacionViajeResponse], summary = "Obtener todos los historiales de ubicaciones")
def obtenerHistorialUbicaciones(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(HistorialUbicacionViaje).offset(skip).limit(limit).all()

@router.get("/historial-ubicacion/buscar", response_model = List[schemas.HistorialUbicacionViajeResponse], summary = "Buscar historial(es) de ubicaciones con filtros dinámicos")
def buscarHistorialUbicaciones(
    viaje_id: Optional[int] = Query(None, description = "Filtrar por ID del viaje"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(HistorialUbicacionViaje)
    if viaje_id:
        query = query.filter(HistorialUbicacionViaje.id_viaje == viaje_id)
    return query.offset(skip).limit(limit).all()

@router.get("/historial-ubicacion/{historial_id}", response_model = schemas.HistorialUbicacionViajeResponse, summary = "Obtener historial de ubicación por ID")
def obtenerHistorialUbicacionPorId(historial_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    historial = db.query(HistorialUbicacionViaje).filter(HistorialUbicacionViaje.id == historial_id).first()
    if not historial:
        raise HTTPException(status_code = 404, detail = "Historial de ubicación no encontrado")
    return historial

@router.put("/historial-ubicacion/{historial_id}", response_model = schemas.HistorialUbicacionViajeResponse, summary = "Actualizar historial de ubicación por ID")
def actualizarHistorialUbicacion(historial_id: int, historial_in: schemas.HistorialUbicacionViajeUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    historial = db.query(HistorialUbicacionViaje).filter(HistorialUbicacionViaje.id == historial_id).first()
    if not historial:
        raise HTTPException(status_code = 404, detail = "Historial de ubicación no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(historial.viaje.vehiculo.conductor.id_usuario), is_admin)
    for key, value in historial_in.model_dump(exclude_unset=True).items():
        setattr(historial, key, value)
    db.commit()
    db.refresh(historial)
    return historial

@router.delete("/historial-ubicacion/{historial_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar historial de ubicación por ID")
def eliminarHistorialUbicacion(historial_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    historial = db.query(HistorialUbicacionViaje).filter(HistorialUbicacionViaje.id == historial_id).first()
    if not historial:
        raise HTTPException(status_code = 404, detail = "Historial de ubicación no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(historial.viaje.vehiculo.conductor.id_usuario), is_admin)
    db.delete(historial)
    db.commit()


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
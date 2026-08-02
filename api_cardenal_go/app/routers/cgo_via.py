# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from data.database import getDB
from data.models import Viaje, SolicitudViaje, Vehiculo, Conductor, Usuario, Chat
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from data.database import getDB
from data.models import Viaje, Vehiculo, SolicitudViaje, PagoTransferencia, HistorialUbicacionViaje, Conductor, Usuario
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF
import httpx
from sqlalchemy import func


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
    
    viaje_activo = db.query(Viaje).join(Vehiculo).filter(
        Vehiculo.id_conductor == vehiculo.id_conductor,
        Viaje.id_estatus.in_([1, 2])
    ).first()
    if viaje_activo:
        raise HTTPException(status_code = 400, detail = "Ya tienes un viaje programado. Debes finalizarlo o cancelarlo antes de crear uno nuevo.")

    datos_viaje = viaje_in.model_dump()
    inicio = datos_viaje["ubicacion_inicio"]
    destino = datos_viaje["ubicacion_destino"]
    if isinstance(inicio, dict) and "coordinates" in inicio:
        datos_viaje["ubicacion_inicio"] = f"SRID=4326;POINT({inicio['coordinates'][0]} {inicio['coordinates'][1]})"
    else:
        datos_viaje["ubicacion_inicio"] = f"SRID=4326;POINT({viaje_in.ubicacion_inicio.longitude} {viaje_in.ubicacion_inicio.latitude})"
    if isinstance(destino, dict) and "coordinates" in destino:
        datos_viaje["ubicacion_destino"] = f"SRID=4326;POINT({destino['coordinates'][0]} {destino['coordinates'][1]})"
    else:
        datos_viaje["ubicacion_destino"] = f"SRID=4326;POINT({viaje_in.ubicacion_destino.longitude} {viaje_in.ubicacion_destino.latitude})"
    datos_viaje["asientos_disponibles"] = viaje_in.asientos_totales
    nuevo_viaje = Viaje(**datos_viaje)
    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)
    return nuevo_viaje

@router.get("/", response_model = List[schemas.ViajeResponse], summary = "Obtener todos los viajes")
def obtenerViajes(
    skip: int = 0, 
    limit: int = 100, 
    id_estatus: Optional[int] = Query(None, description = "Filtrar por estatus (1=Programado, 2=En curso)"),
    fecha: Optional[str] = Query(None, description = "Filtrar por fecha YYYY-MM-DD"),
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Viaje).options(
        joinedload(Viaje.vehiculo).joinedload(Vehiculo.conductor).joinedload(Conductor.usuario),
        joinedload(Viaje.estatus)
    )
    if id_estatus:
        query = query.filter(Viaje.id_estatus == id_estatus)
    if fecha:
        query = query.filter(Viaje.fecha == fecha)
    return query.offset(skip).limit(limit).all()

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
    user_id = payload.get("sub")
    user_role = payload.get("role")

    if user_role == "Pasajero" and user_id:
        query = query.join(Viaje.vehiculo).join(Vehiculo.conductor).filter(Conductor.id_usuario != int(user_id))

    if vehiculo_id:
        query = query.filter(Viaje.id_vehiculo == vehiculo_id)
    if estatus_id:
        query = query.filter(Viaje.id_estatus == estatus_id)
    if fecha:
        query = query.filter(Viaje.fecha == fecha)
    return query.offset(skip).limit(limit).all()

@router.get("/conductor/{usuario_id}", response_model = List[schemas.ViajeResponse], summary = "Obtener viajes del conductor por ID de usuario")
def obtenerViajesConductor(
    usuario_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    conductor = db.query(Conductor).filter(Conductor.id_usuario == usuario_id).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "Perfil de conductor no encontrado")
    vehiculo_ids = [v.id for v in conductor.vehiculos]
    if not vehiculo_ids:
        return []
    viajes = db.query(Viaje).options(
        joinedload(Viaje.vehiculo),
        joinedload(Viaje.estatus),
        joinedload(Viaje.solicitudes)
    ).filter(Viaje.id_vehiculo.in_(vehiculo_ids)).order_by(Viaje.fecha.desc()).all()
    return viajes

@router.get("/{viaje_id}", response_model = schemas.ViajeResponse, summary = "Obtener viaje por ID")
def obtenerViajePorId(viaje_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    viaje = db.query(Viaje).options(
        joinedload(Viaje.vehiculo).joinedload(Vehiculo.conductor).joinedload(Conductor.usuario),
        joinedload(Viaje.estatus)
    ).filter(Viaje.id == viaje_id).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    return viaje

@router.put("/{viaje_id}", response_model = schemas.ViajeResponse, summary = "Actualizar viaje por ID")
def actualizarViaje(
    viaje_id: int,
    viaje_in: schemas.ViajeUpdate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
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
    viaje = db.query(Viaje).filter(Viaje.id == solicitud_in.id_viaje).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    if viaje.asientos_disponibles < 1:
        raise HTTPException(status_code = 400, detail = "El viaje no tiene lugares disponibles")
    if viaje.id_estatus != 1:
        raise HTTPException(status_code = 400, detail = "El viaje no está disponible para solicitudes")
    duplicada = db.query(SolicitudViaje).filter(
        SolicitudViaje.id_viaje == solicitud_in.id_viaje,
        SolicitudViaje.id_pasajero == solicitud_in.id_pasajero,
        SolicitudViaje.id_estatus.in_([1, 2, 3])
    ).first()
    if duplicada:
        raise HTTPException(status_code = 409, detail = "Ya tienes una solicitud activa para este viaje")
    datos_solicitud = solicitud_in.model_dump()
    recogida = datos_solicitud["ubicacion_recogida"]
    bajada = datos_solicitud["ubicacion_bajada"]
    if isinstance(recogida, dict) and "coordinates" in recogida:
        datos_solicitud["ubicacion_recogida"] = f"SRID=4326;POINT({recogida['coordinates'][0]} {recogida['coordinates'][1]})"
    else:
        datos_solicitud["ubicacion_recogida"] = f"SRID=4326;POINT({solicitud_in.ubicacion_recogida.longitude} {solicitud_in.ubicacion_recogida.latitude})"
    if isinstance(bajada, dict) and "coordinates" in bajada:
        datos_solicitud["ubicacion_bajada"] = f"SRID=4326;POINT({bajada['coordinates'][0]} {bajada['coordinates'][1]})"
    else:
        datos_solicitud["ubicacion_bajada"] = f"SRID=4326;POINT({solicitud_in.ubicacion_bajada.longitude} {solicitud_in.ubicacion_bajada.latitude})"
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

@router.get("/solicitudes/pasajero/{pasajero_id}", response_model = List[schemas.SolicitudViajeResponse], summary = "Solicitudes de un pasajero")
def obtenerSolicitudesPasajero(
    pasajero_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    solicitudes = db.query(SolicitudViaje).options(
        joinedload(SolicitudViaje.pasajero),
        joinedload(SolicitudViaje.estatus),
        joinedload(SolicitudViaje.viaje).joinedload(Viaje.vehiculo).joinedload(Vehiculo.conductor).joinedload(Conductor.usuario)
    ).filter(SolicitudViaje.id_pasajero == pasajero_id).order_by(SolicitudViaje.fecha_hora_registro.desc()).all()
    return solicitudes

@router.get("/{viaje_id}/solicitudes", response_model = List[schemas.SolicitudViajeResponse], summary = "Solicitudes de un viaje (para conductor)")
def obtenerSolicitudesViaje(
    viaje_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(requireRole(["Conductor"]))
):
    solicitudes = db.query(SolicitudViaje).options(
        joinedload(SolicitudViaje.pasajero),
        joinedload(SolicitudViaje.estatus)
    ).filter(SolicitudViaje.id_viaje == viaje_id).order_by(SolicitudViaje.fecha_hora_registro.asc()).all()
    return solicitudes

@router.get("/solicitudes/{solicitud_id}", response_model = schemas.SolicitudViajeResponse, summary = "Obtener solicitud de viaje por ID")
def obtenerSolicitudPorId(solicitud_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    solicitud = db.query(SolicitudViaje).options(
        joinedload(SolicitudViaje.pasajero),
        joinedload(SolicitudViaje.estatus),
        joinedload(SolicitudViaje.viaje)
    ).filter(SolicitudViaje.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code = 404, detail = "Solicitud de viaje no encontrada")
    return solicitud

@router.put("/solicitudes/{solicitud_id}", response_model = schemas.SolicitudViajeResponse, summary = "Actualizar solicitud por ID")
def actualizarSolicitud(solicitud_id: int, solicitud_in: schemas.SolicitudViajeUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    solicitud = db.query(SolicitudViaje).filter(SolicitudViaje.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code = 404, detail = "Solicitud de viaje no encontrada")
    nuevo_estatus = solicitud_in.id_estatus
    if nuevo_estatus is not None:
        if nuevo_estatus == 3:  # Aceptada
            viaje = db.query(Viaje).filter(Viaje.id == solicitud.id_viaje).first()
            if viaje and viaje.asientos_disponibles < 1:
                raise HTTPException(status_code = 400, detail = "No hay lugares disponibles")
            if viaje:
                viaje.asientos_disponibles -= 1
        elif nuevo_estatus == 5 and solicitud.id_estatus == 3:  # Cancelada o rechazada tras haber sido aceptada
            viaje = db.query(Viaje).filter(Viaje.id == solicitud.id_viaje).first()
            if viaje:
                viaje.asientos_disponibles = min(
                    viaje.asientos_disponibles + 1,
                    viaje.asientos_totales
                )

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
    for key, value in pago_in.model_dump(exclude_unset = True).items():
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
    ubicacion = datos_historial["ubicacion"]
    if isinstance(ubicacion, dict) and "coordinates" in ubicacion:
        datos_historial["ubicacion"] = f"SRID=4326;POINT({ubicacion['coordinates'][0]} {ubicacion['coordinates'][1]})"
    else:
        datos_historial["ubicacion"] = f"SRID=4326;POINT({historial_in.ubicacion.longitude} {historial_in.ubicacion.latitude})"
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
    for key, value in historial_in.model_dump(exclude_unset = True).items():
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


# ------------------------------------
# | OPERACIONES CRUD DE SOLICITUDES  |
# ------------------------------------

@router.post("/solicitudes", response_model = schemas.SolicitudViajeResponse, status_code = status.HTTP_201_CREATED, summary = "Crear solicitud de viaje")
def crearSolicitud(
    sol: schemas.SolicitudViajeCreate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    # Validar que el viaje existe y tiene asientos disponibles
    viaje = db.query(Viaje).filter(Viaje.id == sol.id_viaje).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    if viaje.asientos_disponibles < 1:
        raise HTTPException(status_code = 400, detail = "El viaje no tiene lugares disponibles")
    if viaje.id_estatus != 1:
        raise HTTPException(status_code = 400, detail = "El viaje no está disponible para solicitudes")
    # Evitar solicitud duplicada activa (Pendiente=1, Negociando=2, Aceptada=3)
    duplicada = db.query(SolicitudViaje).filter(
        SolicitudViaje.id_viaje == sol.id_viaje,
        SolicitudViaje.id_pasajero == sol.id_pasajero,
        SolicitudViaje.id_estatus.in_([1, 2, 3])
    ).first()
    if duplicada:
        raise HTTPException(status_code = 409, detail = "Ya tienes una solicitud activa para este viaje")
    datos = sol.model_dump()
    # Convertir GeoPoint a WKT
    recogida = datos["ubicacion_recogida"]
    bajada = datos["ubicacion_bajada"]
    datos["ubicacion_recogida"] = f"SRID=4326;POINT({recogida['coordinates'][0]} {recogida['coordinates'][1]})"
    datos["ubicacion_bajada"] = f"SRID=4326;POINT({bajada['coordinates'][0]} {bajada['coordinates'][1]})"
    nueva = SolicitudViaje(**datos)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/solicitudes/pasajero/{pasajero_id}", response_model = List[schemas.SolicitudViajeResponse], summary = "Solicitudes de un pasajero")
def obtenerSolicitudesPasajero(
    pasajero_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    solicitudes = db.query(SolicitudViaje).options(
        joinedload(SolicitudViaje.pasajero),
        joinedload(SolicitudViaje.estatus),
        joinedload(SolicitudViaje.viaje).joinedload(Viaje.vehiculo).joinedload(Vehiculo.conductor).joinedload(Conductor.usuario)
    ).filter(SolicitudViaje.id_pasajero == pasajero_id).order_by(SolicitudViaje.fecha_hora_registro.desc()).all()
    return solicitudes

@router.get("/{viaje_id}/solicitudes", response_model = List[schemas.SolicitudViajeResponse], summary = "Solicitudes de un viaje (para conductor)")
def obtenerSolicitudesViaje(
    viaje_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    solicitudes = db.query(SolicitudViaje).options(
        joinedload(SolicitudViaje.pasajero),
        joinedload(SolicitudViaje.estatus)
    ).filter(SolicitudViaje.id_viaje == viaje_id).order_by(SolicitudViaje.fecha_hora_registro.asc()).all()
    return solicitudes

@router.get("/solicitudes/{sol_id}", response_model = schemas.SolicitudViajeResponse, summary = "Detalle de solicitud por ID")
def obtenerSolicitudPorId(
    sol_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    sol = db.query(SolicitudViaje).options(
        joinedload(SolicitudViaje.pasajero),
        joinedload(SolicitudViaje.estatus),
        joinedload(SolicitudViaje.viaje)
    ).filter(SolicitudViaje.id == sol_id).first()
    if not sol:
        raise HTTPException(status_code = 404, detail = "Solicitud no encontrada")
    return sol

@router.put("/solicitudes/{sol_id}", response_model = schemas.SolicitudViajeResponse, summary = "Actualizar estatus de solicitud (aceptar / rechazar / cancelar)")
def actualizarSolicitud(
    sol_id: int,
    sol_in: schemas.SolicitudViajeUpdate,
    db: Session = Depends(getDB),
    payload: dict = Depends(requireRole(["Conductor", "Superadministrador", "Administrador"]))
):
    sol = db.query(SolicitudViaje).filter(SolicitudViaje.id == sol_id).first()
    if not sol:
        raise HTTPException(status_code = 404, detail = "Solicitud no encontrada")
    # Permitir que conductor o admin actualice el estatus de la solicitud
    # Se valida que el conductor es dueño del viaje asociado
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    # Obtener el viaje asociado a la solicitud
    viaje = db.query(Viaje).filter(Viaje.id == sol.id_viaje).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    # Verificar que el usuario es propietario del viaje (conductor) o admin
    verifyResourceOwnership(payload.get("sub"), str(viaje.vehiculo.conductor.id_usuario), is_admin)
    
    nuevo_estatus = sol_in.id_estatus

    if nuevo_estatus == 3:  # Aceptada
        if viaje.asientos_disponibles < 1:
            raise HTTPException(status_code = 400, detail = "No hay lugares disponibles")
        viaje.asientos_disponibles -= 1
        # AUTO-CREAR CHAT DEL VIAJE SI NO EXISTE AUN
        chat_existente = db.query(Chat).filter(
            Chat.id_viaje == sol.id_viaje,
            Chat.id_tipo_chat == 1
        ).first()
        if not chat_existente:
            nuevo_chat = Chat(id_tipo_chat = 1, id_viaje = sol.id_viaje)
            db.add(nuevo_chat)
    elif nuevo_estatus == 5 and sol.id_estatus == 3:  # Cancelada desde Aceptada → restaurar asiento
        if viaje:
            viaje.asientos_disponibles = min(
                viaje.asientos_disponibles + 1,
                viaje.asientos_totales
            )

    for key, value in sol_in.model_dump(exclude_unset = True).items():
        setattr(sol, key, value)
    db.commit()
    db.refresh(sol)
    return sol


# --------------------------
# | RECOMENDACIÓN DE IA    |
# --------------------------

@router.get("/solicitudes/{sol_id}/recomendacion-ia", summary = "Obtener recomendación de la IA para una solicitud")
def obtenerRecomendacionIA(
    sol_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    sol = db.query(SolicitudViaje).filter(SolicitudViaje.id == sol_id).first()
    if not sol:
        raise HTTPException(status_code = 404, detail = "Solicitud no encontrada")
    
    viaje = db.query(Viaje).filter(Viaje.id == sol.id_viaje).first()
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    
    # Validar que el que consulta es el conductor, el pasajero dueño de la solicitud, o un admin
    caller_id = str(payload.get("sub"))
    conductor_user_id = str(viaje.vehiculo.conductor.id_usuario)
    pasajero_user_id = str(sol.id_pasajero)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    if not is_admin and caller_id != conductor_user_id and caller_id != pasajero_user_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para consultar esta recomendación")

    # 1. Calcular distancia de desvío (en km) usando PostGIS (ST_DistanceSphere retorna metros)
    dist_metros = db.query(
        func.ST_DistanceSphere(Viaje.ubicacion_destino, SolicitudViaje.ubicacion_bajada)
    ).filter(
        Viaje.id == viaje.id,
        SolicitudViaje.id == sol.id
    ).scalar() or 0.0

    detour_distance_km = float(dist_metros) / 1000.0
    
    # 2. Calcular tiempo estimado de desvío (Asumiendo 30 km/h velocidad media)
    detour_time_min = (detour_distance_km / 30.0) * 60.0

    # 3. Datos financieros
    expected_extra_profit = float(sol.precio) if sol.precio else 0.0
    # Consumo estimado: $24 MXN por litro, rendimiento de 12 km/l
    fuel_cost_estimate = (detour_distance_km / 12.0) * 24.0

    # 4. Otros factores
    hour_of_day = viaje.hora_inicio.hour if viaje.hora_inicio else 12

    # Valores mockeados por falta de APIs externas en este MVP
    pickup_zone_risk = 0.2  # Riesgo bajo por defecto
    is_raining = 0          # Sin lluvia por defecto
    
    conductor = db.query(Conductor).filter(Conductor.id == viaje.vehiculo.id_conductor).first()
    driver_historical_acceptance = 0.8 # Valor simulado de aceptación histórica del conductor

    payload_ia = {
        "detour_distance_km": round(detour_distance_km, 2),
        "detour_time_min": round(detour_time_min, 2),
        "pickup_zone_risk": pickup_zone_risk,
        "expected_extra_profit": round(expected_extra_profit, 2),
        "fuel_cost_estimate": round(fuel_cost_estimate, 2),
        "hour_of_day": hour_of_day,
        "is_raining": is_raining,
        "driver_historical_acceptance": driver_historical_acceptance
    }

    try:
        # Llamar al microservicio interno de IA (nombre del servicio en docker-compose)
        # Timeout de 3 segundos para que no bloquee mucho la UI
        response = httpx.post("http://ridesharing_ai:8001/predict", json=payload_ia, timeout=3.0)
        response.raise_for_status()
        resultado = response.json()
        
        return {
            "score": resultado.get("convenience_score", 0.0),
            "recommendation": resultado.get("recommendation", "UNKNOWN"),
            "is_convenient": resultado.get("is_convenient", False),
            "features_used": payload_ia
        }
    except Exception as e:
        # En caso de error, retornar una falla gracefully
        print(f"[Error IA] No se pudo conectar al microservicio ridesharing_ai: {e}")
        return {
            "score": 0.0,
            "recommendation": "ERROR",
            "is_convenient": False,
            "error": "IA service unavailable",
            "features_used": payload_ia
        }


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
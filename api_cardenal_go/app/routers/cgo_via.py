# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from data.database import getDB
from data.models import Viaje, SolicitudViaje, Vehiculo, Conductor, Usuario, Chat
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
    datos = viaje_in.model_dump()
    # Convertir GeoPoint a formato WKT para PostGIS
    inicio = datos["ubicacion_inicio"]
    destino = datos["ubicacion_destino"]
    datos["ubicacion_inicio"] = f"SRID=4326;POINT({inicio['coordinates'][0]} {inicio['coordinates'][1]})"
    datos["ubicacion_destino"] = f"SRID=4326;POINT({destino['coordinates'][0]} {destino['coordinates'][1]})"
    # Asientos disponibles = asientos totales al crear
    datos["asientos_disponibles"] = datos["asientos_totales"]
    nuevo_viaje = Viaje(**datos)
    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)
    return nuevo_viaje

@router.get("/", response_model=List[schemas.ViajeResponse], summary = "Obtener todos los viajes")
def obtenerViajes(
    skip: int = 0,
    limit: int = 100,
    id_estatus: Optional[int] = Query(None, description="Filtrar por estatus (1=Programado, 2=En curso)"),
    fecha: Optional[str] = Query(None, description="Filtrar por fecha YYYY-MM-DD"),
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
    viajes = query.offset(skip).limit(limit).all()
    return viajes

@router.get("/conductor/{usuario_id}", response_model=List[schemas.ViajeResponse], summary = "Obtener viajes del conductor por ID de usuario")
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
def obtenerViajePorId(
    viaje_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
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
    if not viaje:
        raise HTTPException(status_code = 404, detail = "Viaje no encontrado")
    for key, value in viaje_in.model_dump(exclude_unset = True).items():
        setattr(viaje, key, value)
    db.commit()
    db.refresh(viaje)
    return viaje


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
    payload: dict = Depends(requireRole(["Conductor"]))
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
    payload: dict = Depends(verifyToken)
):
    sol = db.query(SolicitudViaje).filter(SolicitudViaje.id == sol_id).first()
    if not sol:
        raise HTTPException(status_code = 404, detail = "Solicitud no encontrada")
    nuevo_estatus = sol_in.id_estatus

    if nuevo_estatus == 3:  # Aceptada
        viaje = db.query(Viaje).filter(Viaje.id == sol.id_viaje).first()
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
        viaje = db.query(Viaje).filter(Viaje.id == sol.id_viaje).first()
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
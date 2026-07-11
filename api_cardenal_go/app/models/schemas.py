# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import(
    BaseModel, 
    ConfigDict, 
    EmailStr, 
    Field, 
    field_validator
)


# -----------------------------
# | SCHEMAS BASE Y UTILIDADES |
# -----------------------------

# REPRESENTACIÓN ESTÁNDAR GeoJSON PARA PUNTOS GEOGRÁFICOS PostGIS
class GeoPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(
        ..., 
        min_length=2, 
        max_length=2, 
        examples=[[-100.389888, 20.588793]],
        description="[Longitud, Latitud] en EPSG:4326"
    )

    @field_validator("coordinates")
    @classmethod
    def validar_rangos_lat_lon(cls, v: List[float]) -> List[float]:
        lon, lat = v[0], v[1]
        if not (-180.0 <= lon <= 180.0):
            raise ValueError("La longitud debe estar entre -180 y 180")
        if not (-90.0 <= lat <= 90.0):
            raise ValueError("La latitud debe estar entre -90 y 90")
        return v

# HELPER PARA CONVERTIT ELEMENTOS WKBElement DE GeoAlchemy2 A GeoPoint
def parse_postgis_point(value: Any) -> Any:
    if value is None or isinstance(value, dict):
        return value
    
    # SI VIENE COMO OBJETO PERSISTIDO DE GeoAlchemy2
    if hasattr(value, "desc") or hasattr(value, "data"):
        try:
            import shapely.wkb
            point = shapely.wkb.loads(bytes(value.data))
            return {"type": "Point", "coordinates": [point.x, point.y]}
        except Exception:
            pass
        
    # SI VIENE COMO String WKT (Ej: "POINT(-100.38 20.58)")
    if isinstance(value, str) and value.startswith("POINT"):
        try:
            content = value.replace("POINT(", "").replace(")", "").strip()
            coords = [float(x) for x in content.split()]
            return {"type": "Point", "coordinates": coords}
        except Exception:
            pass
    return value


# ---------------------
# | ESQUEMA "cgo_aud" |
# ---------------------

class AuditoriaResponse(BaseModel):
    id: int
    nombre_tabla: str
    id_registro: int
    accion: str
    datos_antiguos: Optional[Dict[str, Any]] = None
    datos_nuevos: Optional[Dict[str, Any]] = None
    usuario_bd: str
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# |                  ESQUEMA 2: CATÁLOGOS (cgo_cat)                   |
# =====================================================================

# --- ROLES ---
class RolCreate(BaseModel):
    nombre: str = Field(..., max_length=20, examples=["conductor"])
    descripcion: Optional[str] = Field(None, max_length=255)


class RolUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class RolResponse(RolCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- MÉTODOS DE PAGO ---
class MetodoPagoCreate(BaseModel):
    nombre: str = Field(..., max_length=20, examples=["SPEI", "Efectivo"])


class MetodoPagoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    model_config = ConfigDict(extra="forbid")


class MetodoPagoResponse(MetodoPagoCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ESTATUS VIAJE ---
class EstatusViajeCreate(BaseModel):
    nombre: str = Field(..., max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)


class EstatusViajeUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class EstatusViajeResponse(EstatusViajeCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ESTATUS SOLICITUD ---
class EstatusSolicitudCreate(BaseModel):
    nombre: str = Field(..., max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)


class EstatusSolicitudUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class EstatusSolicitudResponse(EstatusSolicitudCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- MOTIVO REPORTE ---
class MotivoReporteCreate(BaseModel):
    nombre: str = Field(..., max_length=50)
    gravedad: int = Field(..., ge=1, le=10, description="Escala del 1 al 10")


class MotivoReporteUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    gravedad: Optional[int] = Field(None, ge=1, le=10)
    model_config = ConfigDict(extra="forbid")


class MotivoReporteResponse(MotivoReporteCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ESTATUS REPORTE ---
class EstatusReporteCreate(BaseModel):
    nombre: str = Field(..., max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)


class EstatusReporteUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class EstatusReporteResponse(EstatusReporteCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ESTATUS SOCIAL ---
class EstatusSocialCreate(BaseModel):
    nombre: str = Field(..., max_length=20)


class EstatusSocialUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    model_config = ConfigDict(extra="forbid")


class EstatusSocialResponse(EstatusSocialCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- TIPO CHAT ---
class TipoChatCreate(BaseModel):
    nombre: str = Field(..., max_length=20)


class TipoChatUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    model_config = ConfigDict(extra="forbid")


class TipoChatResponse(TipoChatCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ESTATUS USUARIO ---
class EstatusUsuarioCreate(BaseModel):
    nombre: str = Field(..., max_length=50)
    dias_sancion: Optional[int] = Field(None, ge=0)


class EstatusUsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    dias_sancion: Optional[int] = Field(None, ge=0)
    model_config = ConfigDict(extra="forbid")


class EstatusUsuarioResponse(EstatusUsuarioCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- TIPO NOTIFICACIÓN ---
class TipoNotificacionCreate(BaseModel):
    nombre: str = Field(..., max_length=50)


class TipoNotificacionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    model_config = ConfigDict(extra="forbid")


class TipoNotificacionResponse(TipoNotificacionCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ESTATUS PAGO ---
class EstatusPagoCreate(BaseModel):
    nombre: str = Field(..., max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)


class EstatusPagoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=20)
    descripcion: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class EstatusPagoResponse(EstatusPagoCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# |                   ESQUEMA 3: USUARIOS (cgo_usu)                   |
# =====================================================================

# --- USUARIO ---
class UsuarioCreate(BaseModel):
    nombre_completo: str = Field(..., max_length=255, examples=["Juan Pérez"])
    matricula: str = Field(..., min_length=9, max_length=9, pattern=r"^[0-9]{9}$")
    correo_institucional: EmailStr = Field(..., pattern=r".+@upq\.edu\.mx$")
    contrasena_raw: str = Field(..., min_length=8, description="Contraseña en texto plano para procesar hash")
    url_foto_perfil: Optional[str] = Field("cardenal_upq.png", max_length=255)


class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = Field(None, max_length=255)
    url_foto_perfil: Optional[str] = Field(None, max_length=255)
    contrasena_raw: Optional[str] = Field(None, min_length=8)
    model_config = ConfigDict(extra="forbid")


class UsuarioResponse(BaseModel):
    id: int
    nombre_completo: str
    matricula: str
    correo_institucional: EmailStr
    url_foto_perfil: str
    calificacion_pasajero: Decimal
    calificacion_conductor: Decimal
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# --- ROL USUARIO (Tabla intermedia) ---
class RolUsuarioCreate(BaseModel):
    id_usuario: int
    id_rol: int = 1
    id_estatus: int = 1


class RolUsuarioUpdate(BaseModel):
    id_rol: Optional[int] = None
    id_estatus: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class RolUsuarioResponse(BaseModel):
    id_usuario: int
    id_rol: int
    id_estatus: int
    rol: Optional[RolResponse] = None
    estatus: Optional[EstatusUsuarioResponse] = None
    model_config = ConfigDict(from_attributes=True)


# --- CONDUCTOR ---
class ConductorCreate(BaseModel):
    id_usuario: int
    telefono: str = Field(..., max_length=20, pattern=r"^\+?[0-9\s\-]{10,20}$")
    licencia_conducir: str = Field(..., max_length=50)
    url_foto_ine: str = Field(..., max_length=255)
    clabe_interbancaria: Optional[str] = Field(None, pattern=r"^[0-9]{18}$")
    nombre_banco: Optional[str] = Field(None, max_length=50)
    nombre_titular_cuenta: Optional[str] = Field(None, max_length=255)


class ConductorUpdate(BaseModel):
    telefono: Optional[str] = Field(None, max_length=20)
    licencia_conducir: Optional[str] = Field(None, max_length=50)
    url_foto_ine: Optional[str] = Field(None, max_length=255)
    clabe_interbancaria: Optional[str] = Field(None, pattern=r"^[0-9]{18}$")
    nombre_banco: Optional[str] = Field(None, max_length=50)
    nombre_titular_cuenta: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class ConductorResponse(BaseModel):
    id: int
    id_usuario: int
    telefono: str
    licencia_conducir: str
    url_foto_ine: str
    ine_valida: bool
    clabe_interbancaria: Optional[str]
    nombre_banco: Optional[str]
    nombre_titular_cuenta: Optional[str]
    id_cuenta_pasarela: Optional[str]
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# --- VEHÍCULO ---
class VehiculoCreate(BaseModel):
    id_conductor: int
    placa: str = Field(..., max_length=15)
    color: str = Field(..., max_length=30)
    modelo: str = Field(..., max_length=50)
    anio: int = Field(..., gt=1990, le=datetime.now().year + 1)
    fotos: List[str] = Field(..., min_length=1)


class VehiculoUpdate(BaseModel):
    color: Optional[str] = Field(None, max_length=30)
    fotos: Optional[List[str]] = None
    model_config = ConfigDict(extra="forbid")


class VehiculoResponse(BaseModel):
    id: int
    id_conductor: int
    placa: str
    color: str
    modelo: str
    anio: int
    fotos: List[str]
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# --- TARJETA PASAJERO ---
class TarjetaPasajeroCreate(BaseModel):
    id_usuario: int
    id_cliente_pasarela: str = Field(..., max_length=255)
    token_pasarela: str = Field(..., max_length=255)
    ultimos_cuatro_digitos: str = Field(..., pattern=r"^[0-9]{4}$")
    marca: str = Field(..., max_length=20, examples=["Visa", "Mastercard"])
    es_favorita: bool = False


class TarjetaPasajeroUpdate(BaseModel):
    es_favorita: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class TarjetaPasajeroResponse(BaseModel):
    id: int
    id_usuario: int
    ultimos_cuatro_digitos: str
    marca: str
    es_favorita: bool
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# |                    ESQUEMA 4: VIAJES (cgo_via)                    |
# =====================================================================

# --- VIAJE ---
class ViajeCreate(BaseModel):
    id_vehiculo: int
    id_estatus: int
    ubicacion_inicio: GeoPoint
    ubicacion_destino: GeoPoint
    ruta_sugerida: Optional[Dict[str, Any]] = None
    fecha: date
    hora_inicio: time
    asientos_totales: int = Field(..., gt=0)

    @field_validator("fecha")
    @classmethod
    def validar_viaje_futuro(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("No se pueden programar viajes en el pasado")
        return v


class ViajeUpdate(BaseModel):
    id_estatus: Optional[int] = None
    ruta_sugerida: Optional[Dict[str, Any]] = None
    hora_inicio: Optional[time] = None
    asientos_disponibles: Optional[int] = Field(None, ge=0)
    model_config = ConfigDict(extra="forbid")


class ViajeResponse(BaseModel):
    id: int
    id_vehiculo: int
    id_estatus: int
    ubicacion_inicio: GeoPoint
    ubicacion_destino: GeoPoint
    ruta_sugerida: Optional[Dict[str, Any]]
    fecha: date
    hora_inicio: time
    asientos_totales: int
    asientos_disponibles: int
    fecha_hora_registro: datetime
    
    vehiculo: Optional[VehiculoResponse] = None
    estatus: Optional[EstatusViajeResponse] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("ubicacion_inicio", "ubicacion_destino", mode="before")
    @classmethod
    def interceptar_geometria(cls, v: Any) -> Any:
        return parse_postgis_point(v)


# --- SOLICITUD DE VIAJE ---
class SolicitudViajeCreate(BaseModel):
    id_viaje: int
    id_pasajero: int
    id_metodo_pago: int
    id_estatus: int
    ubicacion_recogida: GeoPoint
    ubicacion_bajada: GeoPoint
    desvio_metros: Decimal = Field(..., ge=Decimal("0.00"), decimal_places=2)
    precio: Decimal = Field(..., ge=Decimal("0.00"), decimal_places=2)
    notas_adicionales: Optional[str] = Field(None, max_length=255)
    es_grupal: bool = False
    url_grupo: Optional[str] = Field(None, max_length=255)


class SolicitudViajeUpdate(BaseModel):
    id_estatus: Optional[int] = None
    notas_adicionales: Optional[str] = Field(None, max_length=255)
    model_config = ConfigDict(extra="forbid")


class SolicitudViajeResponse(BaseModel):
    id: int
    id_viaje: int
    id_pasajero: int
    id_metodo_pago: int
    id_estatus: int
    ubicacion_recogida: GeoPoint
    ubicacion_bajada: GeoPoint
    desvio_metros: Decimal
    precio: Decimal
    notas_adicionales: Optional[str]
    es_grupal: bool
    url_grupo: Optional[str]
    fecha_hora_registro: datetime

    pasajero: Optional[UsuarioResponse] = None
    estatus: Optional[EstatusSolicitudResponse] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("ubicacion_recogida", "ubicacion_bajada", mode="before")
    @classmethod
    def interceptar_geometria(cls, v: Any) -> Any:
        return parse_postgis_point(v)


# --- PAGO O TRANSFERENCIA ---
class PagoTransferenciaCreate(BaseModel):
    id_solicitud: int
    id_pasajero: int
    id_conductor: int
    id_estatus_pago: int
    id_transaccion_pasarela: str = Field(..., max_length=255)
    monto_total: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)
    comision_plataforma: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"), decimal_places=2)

    @property
    def calculo_neto(self) -> Decimal:
        return self.monto_total - self.comision_plataforma


class PagoTransferenciaUpdate(BaseModel):
    id_estatus_pago: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class PagoTransferenciaResponse(BaseModel):
    id: int
    id_solicitud: int
    id_pasajero: int
    id_conductor: int
    id_estatus_pago: int
    id_transaccion_pasarela: str
    monto_total: Decimal
    comision_plataforma: Decimal
    monto_neto_conductor: Decimal
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# --- HISTORIAL UBICACIÓN EN VIVO ---
class HistorialUbicacionViajeCreate(BaseModel):
    id_viaje: int
    ubicacion: GeoPoint
    velocidad_kmh: Optional[int] = Field(None, ge=0)


class HistorialUbicacionViajeUpdate(BaseModel):
    # Tracking de GPS es append-only
    velocidad_kmh: Optional[int] = Field(None, ge=0)
    model_config = ConfigDict(extra="forbid")


class HistorialUbicacionViajeResponse(BaseModel):
    id: int
    id_viaje: int
    ubicacion: GeoPoint
    velocidad_kmh: Optional[int]
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)

    @field_validator("ubicacion", mode="before")
    @classmethod
    def interceptar_geometria(cls, v: Any) -> Any:
        return parse_postgis_point(v)


# =====================================================================
# |                    ESQUEMA 5: SOCIAL (cgo_soc)                    |
# =====================================================================

# --- AMIGO ---
class AmigoCreate(BaseModel):
    id_usuario1: int
    id_usuario2: int

    @field_validator("id_usuario2")
    @classmethod
    def auto_amistad_prohibida(cls, v: int, info: Any) -> int:
        if "id_usuario1" in info.data and v == info.data["id_usuario1"]:
            raise ValueError("Un usuario no puede enviarse solicitud de amistad a sí mismo")
        return v


class AmigoUpdate(BaseModel):
    id_estatus_social: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class AmigoResponse(BaseModel):
    id: int
    id_usuario1: int
    id_usuario2: int
    id_estatus_social: int
    fecha_hora_registro: datetime
    usuario1: Optional[UsuarioResponse] = None
    usuario2: Optional[UsuarioResponse] = None
    model_config = ConfigDict(from_attributes=True)


# --- CHAT ---
class ChatCreate(BaseModel):
    id_tipo_chat: int
    id_viaje: Optional[int] = None


class ChatUpdate(BaseModel):
    id_tipo_chat: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class ChatResponse(BaseModel):
    id: int
    id_tipo_chat: int
    id_viaje: Optional[int]
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# --- MENSAJE CHAT ---
class MensajeChatCreate(BaseModel):
    id_chat: int
    id_emisor: int
    id_receptor: int
    contenido: str = Field(..., min_length=1)


class MensajeChatUpdate(BaseModel):
    leido: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class MensajeChatResponse(BaseModel):
    id: int
    id_chat: int
    id_emisor: int
    id_receptor: int
    contenido: str
    leido: bool
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# |                ESQUEMA 6: ADMINISTRACIÓN (cgo_adm)                |
# =====================================================================

# --- CALIFICACIÓN ---
class CalificacionCreate(BaseModel):
    id_viaje: int
    id_evaluador: int
    id_evaluado: int
    estrellas: Decimal = Field(..., ge=Decimal("1.00"), le=Decimal("5.00"), decimal_places=2)
    comentarios_adicionales: Optional[str] = None

    @field_validator("id_evaluado")
    @classmethod
    def evitar_autocalificacion(cls, v: int, info: Any) -> int:
        if "id_evaluador" in info.data and v == info.data["id_evaluador"]:
            raise ValueError("No puedes calificarte a ti mismo")
        return v


class CalificacionUpdate(BaseModel):
    estrellas: Optional[Decimal] = Field(None, ge=Decimal("1.00"), le=Decimal("5.00"), decimal_places=2)
    comentarios_adicionales: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class CalificacionResponse(BaseModel):
    id_viaje: int
    id_evaluador: int
    id_evaluado: int
    estrellas: Decimal
    comentarios_adicionales: Optional[str]
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# --- REPORTE ---
class ReporteCreate(BaseModel):
    id_reportador: int
    id_reportado: int
    id_viaje: int
    id_motivo_reporte: Optional[int] = None
    motivo_personalizado: Optional[str] = None
    evidencias: Optional[Dict[str, Any]] = None


class ReporteUpdate(BaseModel):
    id_estado_reporte: Optional[int] = None
    notas_administrador: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class ReporteResponse(BaseModel):
    id: int
    id_reportador: int
    id_reportado: int
    id_viaje: int
    id_motivo_reporte: Optional[int]
    motivo_personalizado: Optional[str]
    evidencias: Optional[Dict[str, Any]]
    id_estado_reporte: int
    notas_administrador: Optional[str]
    fecha_hora_registro: datetime
    
    reportador: Optional[UsuarioResponse] = None
    reportado: Optional[UsuarioResponse] = None
    motivo_reporte: Optional[MotivoReporteResponse] = None
    estatus_reporte: Optional[EstatusReporteResponse] = None

    model_config = ConfigDict(from_attributes=True)


# --- SANCIÓN ---
class SancionCreate(BaseModel):
    id_usuario: int
    id_administrador: int
    id_estatus_usuario: int
    fecha_inicio: Optional[date] = Field(default_factory=date.today)
    fecha_fin: Optional[date] = None
    notas_administrador: Optional[str] = None


class SancionUpdate(BaseModel):
    fecha_fin: Optional[date] = None
    vigente: Optional[bool] = None
    notas_administrador: Optional[str] = None
    model_config = ConfigDict(extra="forbid")


class SancionResponse(BaseModel):
    id: int
    id_usuario: int
    id_administrador: int
    id_estatus_usuario: int
    fecha_inicio: date
    fecha_fin: Optional[date]
    vigente: bool
    notas_administrador: Optional[str]
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# |               ESQUEMA 7: NOTIFICACIONES (cgo_not)                 |
# =====================================================================

class NotificacionCreate(BaseModel):
    id_usuario: int
    id_tipo_notificacion: int
    titulo: str = Field(..., max_length=100)
    cuerpo: str = Field(..., max_length=500)


class NotificacionUpdate(BaseModel):
    leida: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class NotificacionResponse(BaseModel):
    id: int
    id_usuario: int
    id_tipo_notificacion: int
    titulo: str
    cuerpo: str
    leida: bool
    fecha_hora_registro: datetime
    model_config = ConfigDict(from_attributes=True)
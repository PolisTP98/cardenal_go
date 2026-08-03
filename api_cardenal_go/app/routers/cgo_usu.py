# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, Form, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from data.database import getDB
from data.models import Usuario, Rol, RolUsuario, Conductor, Vehiculo, TarjetaPasajero, SolicitudConductor
from models import schemas
from security.auth import (
    verifyPassword, 
    createAccessToken, 
    verifyToken, 
    requireRole, 
    hashPassword, 
    verifyResourceOwnership
)
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF
from utils.imagenes import guardarImagen, eliminarImagen, RUTA_CONDUCTORES, RUTA_VEHICULOS, RUTA_PASAJEROS


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/usu", tags = ["Usuarios"])

VEHICLE_COLORS = [
    'Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Azul Marino',
    'Verde', 'Amarillo', 'Naranja', 'Cafe', 'Beige', 'Dorado'
]


# ----------------------------
# | AUTENTICACIÓN Y SESIONES |
# ----------------------------

@router.post("/token", summary = "Iniciar sesión")
def iniciarSesion(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(getDB)):
    usuario = db.query(Usuario).filter(Usuario.matricula == form_data.username).first()
    if not usuario or not verifyPassword(form_data.password, usuario.contrasena_hash):
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED, 
            detail = "Matrícula o contraseña incorrectos", 
            headers = {"WWW-Authenticate": "Bearer"},
        )
    rol_principal = usuario.roles[0].rol.nombre if usuario.roles else "Pasajero"
    token = createAccessToken(data = {"sub": str(usuario.id), "role": rol_principal})
    return {
        "access_token": token,
        "access_token": token, 
        "token_type": "bearer",
        "role": rol_principal,
        "usuario_id": usuario.id,
        "nombre_completo": usuario.nombre_completo
    }
@router.post("/cambiar-rol", summary = "Intercambiar rol activo y generar nuevo token")
def cambiarRol(datos: dict, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_rol = datos.get("nuevo_rol")
    ROLES_VALIDOS = ["Pasajero", "Conductor", "Administrador", "Superadministrador"]
    if nuevo_rol not in ROLES_VALIDOS:
        raise HTTPException(status_code = 400, detail = f"Rol no válido. Opciones: {ROLES_VALIDOS}")
    user_id = payload.get("sub")
    usuario = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    
    # Si es Conductor, verificar que el usuario tenga perfil de conductor registrado
    if nuevo_rol == "Conductor":
        conductor = db.query(Conductor).filter(Conductor.id_usuario == usuario.id).first()
        if not conductor:
            raise HTTPException(status_code = 403, detail = "No tienes un perfil de conductor registrado. Registra tu perfil de conductor primero.")

    # Emitir nuevo token con el rol actualizado
    token = createAccessToken(data = {"sub": str(usuario.id), "role": nuevo_rol})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": nuevo_rol,
        "usuario_id": usuario.id,
        "nombre_completo": usuario.nombre_completo
    }


# --------------------------------
# | OPERACIONES CRUD DE USUARIOS |
# --------------------------------

@router.post("/", response_model = schemas.UsuarioResponse, status_code = status.HTTP_201_CREATED, summary = "Crear usuario")
def crearUsuario(usuario_in: schemas.UsuarioCreate, db: Session = Depends(getDB)):
    existe = db.query(Usuario).filter(
        (Usuario.matricula == usuario_in.matricula) |
        (Usuario.correo_institucional == usuario_in.correo_institucional)
    ).first()
    if existe:
        raise HTTPException(status_code = 400, detail = "La matrícula o correo ya están registrados")
    nuevo_usuario = Usuario(
        nombre_completo = usuario_in.nombre_completo, 
        matricula = usuario_in.matricula, 
        correo_institucional = usuario_in.correo_institucional, 
        contrasena_hash = hashPassword(usuario_in.contrasena_raw),
        url_foto_perfil = usuario_in.url_foto_perfil or "cardenal_upq.png"
    )
    db.add(nuevo_usuario)
    db.flush()
    # Asignar rol Pasajero por defecto (id_rol=1, id_estatus=5 = Activo)
    nuevo_rol = RolUsuario(id_usuario = nuevo_usuario.id, id_rol = 1, id_estatus = 5)
    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.get("/", response_model = List[schemas.UsuarioResponse], summary = "Obtener todos los usuarios")
def obtenerUsuarios(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return usuarios


@router.get("/buscar", response_model = List[schemas.UsuarioResponse], summary = "Buscar usuario(s) con filtros dinámicos")
@router.get("/buscar", response_model = List[schemas.UsuarioResponse])
def buscarUsuarios(
    busqueda: Optional[str] = Query(None), 
    rol: Optional[str] = Query(None), 
    fecha_inicio: Optional[date] = Query(None), 
    fecha_fin: Optional[date] = Query(None), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    current_role = payload.get("role")
    query = db.query(Usuario).outerjoin(RolUsuario).outerjoin(Rol)
    if busqueda:
        query = query.filter(
            (Usuario.nombre_completo.ilike(f"%{busqueda}%")) | 
            (Usuario.matricula.ilike(f"%{busqueda}%"))
        )
    if rol:
        query = query.filter(Rol.nombre == rol)
    if current_role == "Administrador":
        query = query.filter((Rol.nombre != "Superadministrador") | (RolUsuario.id_rol.is_(None)))
    if fecha_inicio:
        query = query.filter(func.date(Usuario.fecha_hora_registro) >= fecha_inicio)
    if fecha_fin:
        query = query.filter(func.date(Usuario.fecha_hora_registro) <= fecha_fin)
    return query.distinct().order_by(Usuario.fecha_hora_registro.desc()).offset(skip).limit(limit).all()


# --------------------------------------------------------------
# | ENDPOINTS DE ELIMINACIÓN Y REACTIVACIÓN LÓGICA DE USUARIOS |
# --------------------------------------------------------------

@router.patch("/usuarios/{usuario_id}/eliminacion-logica", summary = "Eliminar usuario de manera lógica")
def eliminarUsuarioLogica(
    usuario_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))
):
    registro = db.query(RolUsuario).filter(RolUsuario.id_usuario == usuario_id).first()
    if not registro:
        raise HTTPException(status_code = 404, detail = "Configuración de rol y estatus no encontrada para este usuario")
    registro.id_estatus = 6
    db.commit()
    return {"status": "ok", "message": f"Usuario {usuario_id} eliminado de manera lógica con éxito"}

@router.patch("/usuarios/{usuario_id}/reactivacion-logica", summary = "Reactivar usuario eliminado de manera lógica")
def reactivarUsuario(
    usuario_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))
):
    registro = db.query(RolUsuario).filter(RolUsuario.id_usuario == usuario_id).first()
    if not registro:
        raise HTTPException(status_code = 404, detail = "Configuración de rol y estatus no encontrada para este usuario")
    registro.id_estatus = 1
    db.commit()
    return {"status": "ok", "message": f"Usuario {usuario_id} reactivado con éxito"}

@router.get("/me", response_model = schemas.UsuarioResponse, summary = "Obtener perfil del usuario autenticado")
def obtenerPerfilUsuarioActual(db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Token inválido")
    usuario = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not usuario:
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = "Usuario no encontrado")
    return usuario

@router.get("/{usuario_id}", response_model = schemas.UsuarioResponse, summary = "Obtener usuario por ID")
def obtenerUsuarioPorId(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    return usuario

@router.put("/{usuario_id}", response_model = schemas.UsuarioResponse, summary = "Actualizar usuario por ID")
def actualizarUsuario(
    usuario_id: int,
    usuario_in: schemas.UsuarioUpdate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario.id), is_admin)
    datos = usuario_in.model_dump(exclude_unset = True)
    if "url_foto_perfil" in datos:
        if datos["url_foto_perfil"] is None or str(datos["url_foto_perfil"]).strip() == "":
            datos.pop("url_foto_perfil")
    if "contrasena_raw" in datos:
        raw_pass = datos.pop("contrasena_raw")
        if raw_pass and raw_pass.strip():
            usuario.contrasena_hash = hashPassword(raw_pass)
    for key, value in datos.items():
        setattr(usuario, key, value)
    db.commit()
    db.refresh(usuario)
    return usuario

@router.patch("/me/foto-perfil", response_model = schemas.UsuarioResponse, summary = "Actualizar foto de perfil del usuario autenticado")
async def actualizarFotoPerfil(
    foto: UploadFile = File(...),
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    user_id = payload.get("sub")
    usuario = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")

    # Determinar carpeta segun el rol del usuario
    print(f"[FOTO-PERFIL] Actualizando foto de perfil del usuario {user_id} ({payload.get('role')})")
    carpeta = RUTA_CONDUCTORES if payload.get("role") == "Conductor" else RUTA_PASAJEROS

    # Guardar nueva imagen
    nombre_base = f"perfil_usuario_{user_id}"
    ruta_relativa = await guardarImagen(foto, carpeta, nombre_base)
    print(f"[FOTO-PERFIL] Imagen guardada en: {ruta_relativa}")

    # Eliminar foto anterior si no es la imagen por defecto
    foto_anterior = usuario.url_foto_perfil
    if foto_anterior and foto_anterior != "cardenal_upq.png" and not foto_anterior.startswith("http"):
        eliminarImagen(foto_anterior)
        print(f"[FOTO-PERFIL] Foto anterior eliminada: {foto_anterior}")

    usuario.url_foto_perfil = ruta_relativa
    db.commit()
    db.refresh(usuario)
    print(f"[FOTO-PERFIL] Foto de perfil actualizada correctamente para usuario {user_id}")
    return usuario

@router.delete("/{usuario_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar usuario por ID")
def eliminarUsuario(
    usuario_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    db.delete(usuario)
    db.commit()


# ------------------------------------
# | CONDUCTORES Y VEHÍCULOS          |
# ------------------------------------

@router.post("/solicitudes_conductores", response_model = schemas.SolicitudConductorResponse, status_code = status.HTTP_201_CREATED, summary = "Solicitar ser conductor")
async def solicitarConductor(
    id_usuario:              int            = Form(...),
    telefono:                str            = Form(...),
    licencia_conducir:       str            = Form(...),
    clabe_interbancaria:     Optional[str]  = Form(None),
    nombre_banco:            Optional[str]  = Form(None),
    nombre_titular_cuenta:   Optional[str]  = Form(None),
    placa:                   str            = Form(None),
    color:                   str            = Form(None),
    modelo:                  str            = Form(None),
    anio:                    int            = Form(None),
    foto_perfil:             UploadFile     = File(...),
    fotos_vehiculo:          List[UploadFile] = File(None),
    db:                      Session        = Depends(getDB),
    payload:                 dict           = Depends(verifyToken)
):
    usuario = db.query(Usuario).filter(Usuario.id == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")

    # Guardar foto de perfil temporalmente
    ruta_foto_perfil = await guardarImagen(
        archivo          = foto_perfil,
        carpeta_destino  = RUTA_CONDUCTORES,
        nombre_base      = f"req_conductor_{id_usuario}"
    )

    # Guardar fotos vehiculo
    rutas_fotos_vehiculo = []
    if fotos_vehiculo:
        for idx, foto in enumerate(fotos_vehiculo):
            ruta = await guardarImagen(
                archivo         = foto,
                carpeta_destino = RUTA_VEHICULOS,
                nombre_base     = f"req_vehiculo_{id_usuario}_{idx}"
            )
            rutas_fotos_vehiculo.append(ruta)

    solicitud = SolicitudConductor(
        id_usuario = id_usuario,
        telefono = telefono,
        licencia_conducir = licencia_conducir,
        url_foto_ine = "ine_placeholder.png",
        clabe_interbancaria = clabe_interbancaria,
        nombre_banco = nombre_banco,
        nombre_titular_cuenta = nombre_titular_cuenta,
        url_foto_perfil = ruta_foto_perfil,
        placa = placa,
        color = color,
        modelo = modelo,
        anio = anio,
        fotos_vehiculo = rutas_fotos_vehiculo,
        estatus = "Pendiente"
    )

    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.post("/conductores", response_model = schemas.ConductorResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar datos de conductor")
async def registrarConductor(
    id_usuario:              int            = Form(...),
    telefono:                str            = Form(...),
    licencia_conducir:       str            = Form(...),
    clabe_interbancaria:     Optional[str]  = Form(None),
    nombre_banco:            Optional[str]  = Form(None),
    nombre_titular_cuenta:   Optional[str]  = Form(None),
    foto_perfil:             UploadFile     = File(..., description = "Fotografía obligatoria del rostro del conductor"),
    db:                      Session        = Depends(getDB),
    payload:                 dict           = Depends(verifyToken)
):
    # 1. Guardar foto de rostro en disco
    ruta_foto_perfil = await guardarImagen(
        archivo          = foto_perfil,
        carpeta_destino  = RUTA_CONDUCTORES,
        nombre_base      = f"conductor_{id_usuario}"
    )

    # 2. Actualizar foto de perfil del Usuario
    usuario = db.query(Usuario).filter(Usuario.id == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    usuario.url_foto_perfil = ruta_foto_perfil

    # 3. Construir datos del conductor (sin url_foto_perfil, ya va en Usuario)
    datos_conductor = {
        "id_usuario":           id_usuario,
        "telefono":             telefono,
        "licencia_conducir":    licencia_conducir,
        "url_foto_ine":         "ine_placeholder.png",
        "clabe_interbancaria":  clabe_interbancaria,
        "nombre_banco":         nombre_banco,
        "nombre_titular_cuenta": nombre_titular_cuenta,
    }
    # Limpiar campos None para no sobrescribir valores existentes
    datos_conductor = {k: v for k, v in datos_conductor.items() if v is not None}

    # 4. Crear o actualizar registro de conductor
    existe = db.query(Conductor).filter(Conductor.id_usuario == id_usuario).first()
    if existe:
        for key, value in datos_conductor.items():
            setattr(existe, key, value)
        rol_usuario = db.query(RolUsuario).filter(RolUsuario.id_usuario == id_usuario).first()
        if rol_usuario:
            rol_usuario.id_rol = 2
        db.commit()
        db.refresh(existe)
        return existe

    nuevo_conductor = Conductor(**datos_conductor)
    db.add(nuevo_conductor)
    db.flush()
    # Actualizar rol a Conductor (id_rol=2)
    rol_usuario = db.query(RolUsuario).filter(RolUsuario.id_usuario == id_usuario).first()


# -----------------------------------
# | OPERACIONES CRUD DE CONDUCTORES |
# -----------------------------------

@router.post("/conductores/", response_model = schemas.ConductorResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar conductor")
def crearConductor(conductor_in: schemas.ConductorCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(conductor_in.id_usuario), is_admin)
    existe = db.query(Conductor).filter(Conductor.id_usuario == conductor_in.id_usuario).first()
    if existe:
        raise HTTPException(status_code = 409, detail = "El usuario ya tiene perfil de conductor")
    nuevo_conductor = Conductor(**conductor_in.model_dump())
    db.add(nuevo_conductor)
    db.flush()
    rol_usuario = db.query(RolUsuario).filter(RolUsuario.id_usuario == conductor_in.id_usuario).first()
    if rol_usuario:
        rol_usuario.id_rol = 2
    db.commit()
    db.refresh(nuevo_conductor)
    return nuevo_conductor

@router.get("/conductores/", response_model = List[schemas.ConductorResponse], summary = "Obtener todos los conductores")
def obtenerConductores(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(Conductor).offset(skip).limit(limit).all()

@router.get("/conductores/buscar", response_model = List[schemas.ConductorResponse], summary = "Buscar conductor(es) con filtros dinámicos")
def buscarConductores(
    usuario_id: Optional[int] = Query(None, description = "Filtrar por ID del usuario"), 
    numero_licencia: Optional[str] = Query(None, description = "Filtrar por licencia de conducir"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Conductor)
    if usuario_id:
        query = query.filter(Conductor.id_usuario == usuario_id)
    if numero_licencia:
        query = query.filter(Conductor.licencia_conducir.ilike(f"%{numero_licencia}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/conductores/usuario/{usuario_id}", response_model = schemas.ConductorResponse, summary = "Obtener conductor por ID de usuario")
def obtenerConductorPorUsuario(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    conductor = db.query(Conductor).options(
        joinedload(Conductor.vehiculos)
    ).filter(Conductor.id_usuario == usuario_id).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "Conductor no encontrado")
    return conductor

@router.get("/conductores/{conductor_id}", response_model = schemas.ConductorResponse, summary = "Obtener conductor por ID de conductor")
def obtenerConductorPorId(conductor_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    # Busca EXCLUSIVAMENTE por ID de conductor (cgo_usu.conductores.id)
    # Para buscar por id_usuario usa: GET /conductores/usuario/{usuario_id}
    conductor = db.query(Conductor).filter(Conductor.id == conductor_id).first()
    return conductor

@router.patch("/conductores/{conductor_id}", response_model = schemas.ConductorResponse, summary = "Actualizar conductor por ID")
def actualizarConductor(conductor_id: int, conductor_in: schemas.ConductorUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    conductor = db.query(Conductor).filter(Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "Conductor no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(conductor.id_usuario), is_admin)
    for key, value in conductor_in.model_dump(exclude_unset = True).items():
        setattr(conductor, key, value)
    db.commit()
    db.refresh(conductor)
    return conductor

@router.delete("/conductores/{conductor_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar conductor por ID")
def eliminarConductor(conductor_id: int, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))):
    conductor = db.query(Conductor).filter(Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "Conductor no encontrado")
    db.delete(conductor)
    db.commit()


# | OPERACIONES CRUD DE VEHÍCULOS |

@router.post("/vehiculos/", response_model = schemas.VehiculoResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar vehículo", include_in_schema = False)
async def crearVehiculo(
    id_conductor: int           = Form(...),
    placa:        str           = Form(...),
    color:        str           = Form(...),
    modelo:       str           = Form(...),
    anio:         int           = Form(...),
    fotos:        List[UploadFile] = File(..., description = "Mínimo 1 fotografía del vehículo"),
    db:           Session       = Depends(getDB),
    payload:      dict          = Depends(verifyToken)
):
    if not fotos or len(fotos) == 0:
        raise HTTPException(status_code = 422, detail = "Debes proporcionar al menos una fotografía del vehículo.")

    conductor = db.query(Conductor).filter(Conductor.id == id_conductor).first()
    if not conductor:
        conductor = db.query(Conductor).filter(Conductor.id_usuario == id_conductor).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "El conductor especificado no existe")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(conductor.id_usuario), is_admin)

    # Guardar cada foto en disco y recolectar rutas relativas
    rutas_fotos = []
    for idx, foto in enumerate(fotos):
        ruta = await guardarImagen(
            archivo         = foto,
            carpeta_destino = RUTA_VEHICULOS,
            nombre_base     = f"vehiculo_{conductor.id}_{idx}"
        )
        rutas_fotos.append(ruta)

    # Validar el color contra la lista permitida
    if color not in VEHICLE_COLORS:
        raise HTTPException(status_code=400, detail=f"Color inválido. Los colores permitidos son: {', '.join(VEHICLE_COLORS)}")

    nuevo_vehiculo = Vehiculo(
        id_conductor = conductor.id,
        placa        = placa.upper(),
        color        = color,
        modelo       = modelo,
        anio         = anio,
        fotos        = rutas_fotos
    )
    db.add(nuevo_vehiculo)
    
    try:
        db.commit()
        db.refresh(nuevo_vehiculo)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error de integridad al guardar el vehículo (revisa la placa y los datos enviados).")
        
    return nuevo_vehiculo

@router.get("/vehiculos/", response_model = List[schemas.VehiculoResponse], summary = "Obtener todos los vehículos", include_in_schema = False)
def obtenerVehiculos(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(Vehiculo).offset(skip).limit(limit).all()

@router.get("/vehiculos/buscar", response_model = List[schemas.VehiculoResponse], summary = "Buscar vehículo(s) con filtros dinámicos")
def buscarVehiculos(
    conductor_id: Optional[int] = Query(None, description = "Filtrar por ID del conductor"), 
    placas: Optional[str] = Query(None, description = "Filtrar por placas del vehículo (coincidencia parcial)"), 
    modelo: Optional[str] = Query(None, description = "Filtrar por modelo del vehículo (coincidencia parcial)"), 
    anio: Optional[int] = Query(None, description = "Filtrar por año del vehículo"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Vehiculo)
    if conductor_id:
        query = query.filter(Vehiculo.id_conductor == conductor_id)
    if placas:
        query = query.filter(Vehiculo.placa.ilike(f"%{placas}%"))
    if modelo:
        query = query.filter(Vehiculo.modelo.ilike(f"%{modelo}%"))
    if anio:
        query = query.filter(Vehiculo.anio == anio)
    return query.offset(skip).limit(limit).all()

@router.get("/vehiculos/conductor/{conductor_id}", response_model = List[schemas.VehiculoResponse], summary = "Obtener vehículos de un conductor por ID")
def obtenerVehiculosPorConductor(conductor_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(Vehiculo).filter(Vehiculo.id_conductor == conductor_id).all()

@router.get("/vehiculos/{conductor_id}", response_model = List[schemas.VehiculoResponse], summary = "Obtener vehículos de un conductor por ID")
def obtenerVehiculosConductor(
    conductor_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    return db.query(Vehiculo).filter(Vehiculo.id_conductor == conductor_id).all()

@router.patch("/vehiculos/{vehiculo_id}", response_model = schemas.VehiculoResponse, summary = "Actualizar vehículo por ID")
def actualizarVehiculo(vehiculo_id: int, vehiculo_in: schemas.VehiculoUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code = 404, detail = "Vehículo no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(vehiculo.conductor.id_usuario), is_admin)
    for key, value in vehiculo_in.model_dump(exclude_unset = True).items():
        setattr(vehiculo, key, value)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo

def eliminarVehiculo(vehiculo_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code = 404, detail = "Vehículo no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(vehiculo.conductor.id_usuario), is_admin)
    db.commit()


# --------------------------------------------------
# | ENDPOINTS PARA ROLES Y ESTATUS DE LOS USUARIOS |
# --------------------------------------------------
@router.get("/usuarios/{usuario_id}/estatus", response_model = schemas.RolUsuarioResponse, summary = "Obtener rol y estatus de un usuario por ID")
def obtenerEstatusUsuario(
    usuario_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario_id), is_admin)
    registro = db.query(RolUsuario).filter(RolUsuario.id_usuario == usuario_id).first()
    if not registro:
        raise HTTPException(status_code = 404, detail = "Configuración de rol y estatus no encontrada para este usuario")
    return registro

@router.get("/{usuario_id}/roles", summary = "Obtener roles de un usuario")
def obtenerRolesUsuario(
    usuario_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    roles = db.query(RolUsuario).options(
        joinedload(RolUsuario.rol)
    ).filter(RolUsuario.id_usuario == usuario_id).all()
    return [{"id_rol": r.id_rol, "nombre_rol": r.rol.nombre if r.rol else None} for r in roles]

@router.put("/usuarios/{usuario_id}/estatus", response_model = schemas.RolUsuarioResponse, summary = "Crear o editar rol y estatus de un usuario por ID")
def guardarOEditarEstatusUsuario(
    usuario_id: int, 
    datos_in: schemas.RolUsuarioUpdate, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(requireRole(["Administrador", "Superadministrador"]))
):
    registro = db.query(RolUsuario).filter(RolUsuario.id_usuario == usuario_id).first()
    if not registro:
        id_rol = datos_in.id_rol if datos_in.id_rol is not None else 1
        id_estatus = datos_in.id_estatus if datos_in.id_estatus is not None else 1
        registro = RolUsuario(id_usuario = usuario_id, id_rol = id_rol, id_estatus = id_estatus)
        db.add(registro)
    else:
        update_data = datos_in.model_dump(exclude_unset = True)
        for key, value in update_data.items():
            setattr(registro, key, value)
    db.commit()
    db.refresh(registro)
    return registro


# ------------------------------------------
# | OPERACIONES CRUD DE TARJETAS PASAJEROS |
# ------------------------------------------

@router.post("/tarjetas/", response_model = schemas.TarjetaPasajeroResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar tarjeta de pasajero")
def crearTarjeta(tarjeta_in: schemas.TarjetaPasajeroCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(tarjeta_in.id_usuario), is_admin)
    nueva_tarjeta = TarjetaPasajero(**tarjeta_in.model_dump())
    db.add(nueva_tarjeta)
    db.commit()
    db.refresh(nueva_tarjeta)
    return nueva_tarjeta

@router.get("/tarjetas/buscar", response_model = List[schemas.TarjetaPasajeroResponse], summary = "Buscar tarjeta(s) con filtros dinámicos")
def buscarTarjetas(
    usuario_id: Optional[int] = Query(None, description = "Filtrar por ID de usuario"), 
    marca: Optional[str] = Query(None, description = "Filtrar por marca"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    query = db.query(TarjetaPasajero)
    if not is_admin:
        query = query.filter(TarjetaPasajero.id_usuario == current_user_id)
    elif usuario_id:
        query = query.filter(TarjetaPasajero.id_usuario == usuario_id)
    if marca:
        query = query.filter(TarjetaPasajero.marca.ilike(f"%{marca}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/tarjetas/{usuario_id}", response_model = List[schemas.TarjetaPasajeroResponse], summary = "Obtener tarjetas de un usuario por ID")
def obtenerTarjetas(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario_id), is_admin)
    return db.query(TarjetaPasajero).filter(TarjetaPasajero.id_usuario == usuario_id).all()

@router.delete("/tarjetas/{tarjeta_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar tarjeta por ID")
def eliminarTarjeta(tarjeta_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    tarjeta = db.query(TarjetaPasajero).filter(TarjetaPasajero.id == tarjeta_id).first()
    if not tarjeta:
        raise HTTPException(status_code = 404, detail = "Tarjeta no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(tarjeta.id_usuario), is_admin)
    db.delete(tarjeta)
    db.commit()


# --------------------------
# | GENERACIÓN DE REPORTES |
# --------------------------

@router.get("/reportes/{formato}", summary = "Generar reporte de usuarios")
def exportarReporteUsuarios(
    formato: str,
    db: Session = Depends(getDB),
    payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))
):
    lista_usuarios = db.query(Usuario).all()
    titulo = "reporte_de_usuarios-cardenal_go"
    if formato.lower() == "pdf":
        return generarReportePDF(lista_usuarios, titulo)
    elif formato.lower() == "word":
        return generarReporteWord(lista_usuarios, titulo)
    elif formato.lower() == "excel":
        return generarReporteExcel(lista_usuarios, titulo)
    else:
        raise HTTPException(status_code = 400, detail = "Formato no soportado. Usa PDF, Word o Excel")
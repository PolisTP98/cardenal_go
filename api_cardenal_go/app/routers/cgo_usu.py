# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Usuario, Rol, RolUsuario, Conductor, Vehiculo, TarjetaPasajero
from models import schemas
from security.auth import(
    verifyPassword, 
    createAccessToken, 
    verifyToken, 
    requireRole, 
    hashPassword, 
    verifyResourceOwnership
)
from utils.reportes import generarReporteWord, generarReporteExcel, generarReportePDF


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/usu", tags = ["Usuarios"])


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
    return {"access_token": token, "token_type": "bearer"}


# --------------------------------
# | OPERACIONES CRUD DE USUARIOS |
# --------------------------------

@router.post("/", response_model = schemas.UsuarioResponse, status_code = status.HTTP_201_CREATED, summary = "Crear usuario")
def crearUsuario(usuario_in: schemas.UsuarioCreate, db: Session = Depends(getDB)):
    existe = db.query(Usuario).filter(Usuario.matricula == usuario_in.matricula).first()
    if existe:
        raise HTTPException(status_code = 400, detail = "La matrícula ya está registrada")
    
    nuevo_usuario = Usuario(
        nombre_completo = usuario_in.nombre_completo, 
        matricula = usuario_in.matricula, 
        correo_institucional = usuario_in.correo_institucional, 
        contrasena_hash = hashPassword(usuario_in.contrasena_raw)
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.get("/", response_model = List[schemas.UsuarioResponse], summary = "Obtener todos los usuarios")
def obtenerUsuarios(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return usuarios

@router.get("/buscar", response_model = List[schemas.UsuarioResponse], summary = "Buscar usuarios con filtros dinámicos")
def buscarUsuarios(
    nombre: Optional[str] = Query(None, description = "Filtrar por nombre completo (coincidencia parcial)"), 
    matricula: Optional[str] = Query(None, description = "Filtrar por matrícula (coincidencia parcial)"), 
    correo: Optional[str] = Query(None, description = "Filtrar por correo institucional (coincidencia parcial)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Usuario)
    if nombre:
        query = query.filter(Usuario.nombre_completo.ilike(f"%{nombre}%"))
    if matricula:
        query = query.filter(Usuario.matricula.ilike(f"%{matricula}%"))
    if correo:
        query = query.filter(Usuario.correo_institucional.ilike(f"%{correo}%"))
    return query.offset(skip).limit(limit).all()


# --------------------------------------------------------------
# | ENDPOINTS DE ELIMINACIÓN Y REACTIVACIÓN LÓGICA DE USUARIOS |
# --------------------------------------------------------------

@router.patch("/usuarios/{usuario_id}/eliminacion-logica", summary = "Eliminar un usuario de manera lógica")
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

@router.patch("/usuarios/{usuario_id}/reactivacion-logica", summary = "Reactivar un usuario eliminado de manera lógica")
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


@router.get("/{usuario_id}", response_model = schemas.UsuarioResponse, summary = "Obtener usuario por ID")
def obtenerUsuarioPorId(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    return usuario

@router.patch("/{usuario_id}", response_model = schemas.UsuarioResponse, summary = "Actualizar usuario")
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
    update_data = usuario_in.model_dump(exclude_unset = True)
    if "foto_perfil" in update_data:
        if update_data["foto_perfil"] is None or str(update_data["foto_perfil"]).strip() == "":
            update_data.pop("foto_perfil")
    for key, value in update_data.items():
        setattr(usuario, key, value)
    db.commit()
    db.refresh(usuario)
    return usuario

@router.delete("/{usuario_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar usuario por ID")
def eliminarUsuario(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
    db.delete(usuario)
    db.commit()


# -----------------------------------
# | OPERACIONES CRUD DE CONDUCTORES |
# -----------------------------------

@router.post("/conductores/", response_model = schemas.ConductorResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar conductor")
def crearConductor(conductor_in: schemas.ConductorCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_conductor = Conductor(**conductor_in.model_dump())
    db.add(nuevo_conductor)
    db.commit()
    db.refresh(nuevo_conductor)
    return nuevo_conductor

@router.get("/conductores/", response_model = List[schemas.ConductorResponse], summary = "Obtener todos los conductores")
def obtenerConductores(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(Conductor).offset(skip).limit(limit).all()

@router.get("/conductores/buscar", response_model = List[schemas.ConductorResponse], summary = "Buscar conductores con filtros dinámicos")
def buscarConductores(
    usuario_id: Optional[int] = Query(None, description = "Filtrar por ID del usuario"), 
    numero_licencia: Optional[str] = Query(None, description = "Filtrar por número de licencia"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Conductor)
    if usuario_id:
        query = query.filter(Conductor.usuario_id == usuario_id)
    if numero_licencia:
        query = query.filter(Conductor.numero_licencia.ilike(f"%{numero_licencia}%"))
    return query.offset(skip).limit(limit).all()

@router.patch("/conductores/{conductor_id}", response_model = schemas.ConductorResponse, summary = "Actualizar conductor por ID")
def actualizarConductor(conductor_id: int, conductor_in: schemas.ConductorUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    conductor = db.query(Conductor).filter(Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "Conductor no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(conductor.usuario_id), is_admin)
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


# ---------------------------------
# | OPERACIONES CRUD DE VEHÍCULOS |
# ---------------------------------

@router.post("/vehiculos/", response_model=schemas.VehiculoResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar vehículo")
def crearVehiculo(vehiculo_in: schemas.VehiculoCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_vehiculo = Vehiculo(**vehiculo_in.model_dump())
    db.add(nuevo_vehiculo)
    db.commit()
    db.refresh(nuevo_vehiculo)
    return nuevo_vehiculo

@router.get("/vehiculos/", response_model = List[schemas.VehiculoResponse], summary = "Obtener todos los vehículos")
def obtenerVehiculos(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    return db.query(Vehiculo).offset(skip).limit(limit).all()

@router.get("/vehiculos/buscar", response_model = List[schemas.VehiculoResponse], summary = "Buscar vehículos con filtros dinámicos")
def buscarVehiculos(
    conductor_id: Optional[int] = Query(None, description = "Filtrar por ID del conductor asignado"), 
    placas: Optional[str] = Query(None, description = "Filtrar por placas del vehículo"), 
    marca: Optional[str] = Query(None, description = "Filtrar por marca (coincidencia parcial)"), 
    modelo: Optional[str] = Query(None, description = "Filtrar por modelo/año"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Vehiculo)
    if conductor_id:
        query = query.filter(Vehiculo.conductor_id == conductor_id)
    if placas:
        query = query.filter(Vehiculo.placas.ilike(f"%{placas}%"))
    if marca:
        query = query.filter(Vehiculo.marca.ilike(f"%{marca}%"))
    if modelo:
        query = query.filter(Vehiculo.modelo.ilike(f"%{modelo}%"))
    return query.offset(skip).limit(limit).all()

@router.patch("/vehiculos/{vehiculo_id}", response_model = schemas.VehiculoResponse, summary = "Actualizar vehículo por ID")
def actualizarVehiculo(vehiculo_id: int, vehiculo_in: schemas.VehiculoUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code = 404, detail = "Vehículo no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(vehiculo.conductor.usuario_id), is_admin)
    for key, value in vehiculo_in.model_dump(exclude_unset=True).items():
        setattr(vehiculo, key, value)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo

@router.delete("/vehiculos/{vehiculo_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar vehículo por ID")
def eliminarVehiculo(vehiculo_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    vehiculo = db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code = 404, detail = "Vehículo no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(vehiculo.conductor.usuario_id), is_admin)
    db.delete(vehiculo)
    db.commit()


# --------------------------------------------------
# | ENDPOINTS PARA ROLES Y ESTATUS DE LOS USUARIOS |
# --------------------------------------------------

@router.get("/usuarios/{usuario_id}/estatus", response_model = schemas.RolUsuarioResponse, summary = "Leer el rol y estatus de un usuario por su ID")
def obtenerEstatusUsuario(
    usuario_id: int, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario_id), is_admin)
    registro = db.query(RolUsuario).filter(RolUsuario.id_usuario == usuario_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Configuración de rol y estatus no encontrada para este usuario")
    return registro

@router.put("/usuarios/{usuario_id}/estatus", response_model = schemas.RolUsuarioResponse, summary = "Crear o editar rol y estatus de un usuario")
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
        update_data = datos_in.model_dump(exclude_unset=True)
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
    nueva_tarjeta = TarjetaPasajero(**tarjeta_in.model_dump())
    db.add(nueva_tarjeta)
    db.commit()
    db.refresh(nueva_tarjeta)
    return nueva_tarjeta

@router.get("/tarjetas/buscar", response_model = List[schemas.TarjetaPasajeroResponse], summary = "Buscar tarjetas con filtros dinámicos")
def buscarTarjetas(
    usuario_id: Optional[int] = Query(None, description = "Filtrar por ID de usuario"), 
    banco: Optional[str] = Query(None, description = "Filtrar por institución bancaria"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    query = db.query(TarjetaPasajero)
    if not is_admin:
        query = query.filter(TarjetaPasajero.usuario_id == current_user_id)
    elif usuario_id:
        query = query.filter(TarjetaPasajero.usuario_id == usuario_id)
    if banco:
        query = query.filter(TarjetaPasajero.banco.ilike(f"%{banco}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/tarjetas/{usuario_id}", response_model = List[schemas.TarjetaPasajeroResponse], summary = "Obtener tarjetas de un usuario")
def obtenerTarjetas(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario_id), is_admin)
    return db.query(TarjetaPasajero).filter(TarjetaPasajero.usuario_id == usuario_id).all()

@router.delete("/tarjetas/{tarjeta_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar tarjeta por ID")
def eliminarTarjeta(tarjeta_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    tarjeta = db.query(TarjetaPasajero).filter(TarjetaPasajero.id == tarjeta_id).first()
    if not tarjeta:
        raise HTTPException(status_code = 404, detail = "Tarjeta no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(tarjeta.usuario_id), is_admin)
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
# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from data.database import getDB
from data.models import Usuario, Rol, RolUsuario, Conductor, Vehiculo
from models import schemas
from security.auth import verifyPassword, createAccessToken, verifyToken, requireRole
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
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": rol_principal,
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
    from security.auth import hashPassword
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
def obtenerUsuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return usuarios

@router.get("/buscar", response_model = List[schemas.UsuarioBasicoResponse], summary = "Buscar usuarios por nombre o matricula")
def buscarUsuarios(
    q: str = Query(..., min_length = 2, description = "Nombre o matricula a buscar"),
    excluir_id: Optional[int] = Query(None, description = "ID de usuario a excluir del resultado (el propio usuario)"),
    limit: int = Query(10, le = 30),
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    from typing import Optional as Opt
    query = db.query(Usuario).filter(
        (Usuario.nombre_completo.ilike(f"%{q}%")) | (Usuario.matricula.ilike(f"%{q}%"))
    )
    if excluir_id:
        query = query.filter(Usuario.id != excluir_id)
    return query.limit(limit).all()

@router.get("/me", response_model = schemas.UsuarioResponse, summary = "Obtener usuario autenticado")
def obtenerUsuarioActual(db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    usuario_id = int(payload.get("sub"))
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
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
    datos = usuario_in.model_dump(exclude_unset = True)
    if "contrasena_raw" in datos:
        from security.auth import hashPassword
        usuario.contrasena_hash = hashPassword(datos.pop("contrasena_raw"))
    for key, value in datos.items():
        setattr(usuario, key, value)
    db.commit()
    db.refresh(usuario)
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

@router.post("/conductores", response_model = schemas.ConductorResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar datos de conductor")
def registrarConductor(
    conductor_in: schemas.ConductorCreate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    existe = db.query(Conductor).filter(Conductor.id_usuario == conductor_in.id_usuario).first()
    if existe:
        raise HTTPException(status_code = 409, detail = "El usuario ya tiene perfil de conductor")
    nuevo_conductor = Conductor(**conductor_in.model_dump())
    db.add(nuevo_conductor)
    db.flush()
    # Actualizar rol a Conductor (id_rol=2)
    rol_usuario = db.query(RolUsuario).filter(RolUsuario.id_usuario == conductor_in.id_usuario).first()
    if rol_usuario:
        rol_usuario.id_rol = 2
    db.commit()
    db.refresh(nuevo_conductor)
    return nuevo_conductor

@router.get("/conductores/{usuario_id}", response_model = schemas.ConductorResponse, summary = "Obtener perfil de conductor por ID de usuario")
def obtenerConductorPorUsuario(
    usuario_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    conductor = db.query(Conductor).options(
        joinedload(Conductor.vehiculos)
    ).filter(Conductor.id_usuario == usuario_id).first()
    if not conductor:
        raise HTTPException(status_code = 404, detail = "Perfil de conductor no encontrado")
    return conductor

@router.post("/vehiculos", response_model = schemas.VehiculoResponse, status_code = status.HTTP_201_CREATED, summary = "Registrar vehículo")
def registrarVehiculo(
    vehiculo_in: schemas.VehiculoCreate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    nuevo_vehiculo = Vehiculo(**vehiculo_in.model_dump())
    db.add(nuevo_vehiculo)
    db.commit()
    db.refresh(nuevo_vehiculo)
    return nuevo_vehiculo

@router.get("/vehiculos/{conductor_id}", response_model = List[schemas.VehiculoResponse], summary = "Obtener vehículos de un conductor")
def obtenerVehiculosConductor(
    conductor_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    return db.query(Vehiculo).filter(Vehiculo.id_conductor == conductor_id).all()

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
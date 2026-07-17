# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from data.database import getDB
from data.models import Usuario, Rol, RolUsuario
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
    return {"access_token": token, "token_type": "bearer"}


# --------------------------------
# | OPERACIONES CRUD DE USUARIOS |
# --------------------------------

@router.post("/", response_model = schemas.UsuarioResponse, status_code = status.HTTP_201_CREATED, summary = "Crear usuario")
def crearUsuario(usuario_in: schemas.UsuarioCreate, db: Session = Depends(getDB)):
    existe = db.query(Usuario).filter(Usuario.matricula == usuario_in.matricula).first()
    if existe:
        raise HTTPException(status_code = 400, detail = "La matrícula ya está registrada")
    from security.auth import hashPassword
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
def obtenerUsuarios(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return usuarios

@router.get("/{usuario_id}", response_model = schemas.UsuarioResponse, summary = "Obtener usuario por ID")
def obtenerUsuarioPorId(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code = 404, detail = "Usuario no encontrado")
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
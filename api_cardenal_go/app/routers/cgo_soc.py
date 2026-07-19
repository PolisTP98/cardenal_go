# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Amigo, Chat
from models import schemas
from security.auth import verifyToken


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/soc", tags = ["Social"])


# ------------------------------
# | OPERACIONES CRUD DE AMIGOS |
# ------------------------------

@router.post("/amigos", status_code = status.HTTP_201_CREATED, summary = "Agregar amigo")
def agregarAmigo(solicitud: schemas.AmigoCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    existe = db.query(Amigo).filter(
        ((Amigo.id_usuario1 == solicitud.id_usuario1) & (Amigo.id_usuario2 == solicitud.id_usuario2)) |
        ((Amigo.id_usuario1 == solicitud.id_usuario2) & (Amigo.id_usuario2 == solicitud.id_usuario1))
    ).first()
    if existe:
        raise HTTPException(status_code = 400, detail = "Los usuarios ya son amigos")
    nueva_relacion = Amigo(**solicitud.model_dump())
    db.add(nueva_relacion)
    db.commit()
    db.refresh(nueva_relacion)
    return nueva_relacion

@router.get("/amigos", summary = "Obtener todas las relaciones de amistad")
def obtenerTodosLosAmigos(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    if payload.get("role") not in ["Superadministrador", "Administrador"]:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para ver todas las amistades")
    return db.query(Amigo).offset(skip).limit(limit).all()

@router.get("/amigos/buscar", summary = "Buscar amigos con filtros dinámicos")
def buscarAmigos(
    id_usuario: Optional[int] = Query(None, description = "Filtrar amistades donde participe este ID de usuario"), 
    estado: Optional[str] = Query(None, description = "Filtrar por estado de la solicitud (ej. Pendiente, Aceptada)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Amigo)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    target_id = id_usuario if is_admin and id_usuario else current_user_id
    if target_id:
        query = query.filter((Amigo.id_usuario1 == target_id) | (Amigo.id_usuario2 == target_id))
    if estado:
        query = query.filter(Amigo.estado == estado)
    return query.offset(skip).limit(limit).all()

@router.get("/amigos/usuario/{usuario_id}", summary = "Obtener todos los amigos de un usuario por su ID")
def obtenerAmigosPorUsuario(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    if str(payload.get("sub")) != str(usuario_id) and not is_admin:
        raise HTTPException(status_code = 403, detail = "Acceso denegado: No puedes ver los amigos de otro usuario")
    amigos = db.query(Amigo).filter((Amigo.id_usuario1 == usuario_id) | (Amigo.id_usuario2 == usuario_id)).all()
    return amigos

@router.delete("/amigos/{relacion_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar relación de amistad")
def eliminarAmigo(relacion_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    relacion = db.query(Amigo).filter(Amigo.id == relacion_id).first()
    if not relacion:
        raise HTTPException(status_code = 404, detail = "Relación no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(relacion.id_usuario1), str(relacion.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "Acceso denegado: No tienes permisos para eliminar esta amistad")
    db.delete(relacion)
    db.commit()


# -----------------------------
# | OPERACIONES CRUD DE CHATS |
# -----------------------------

@router.post("/chats", status_code = status.HTTP_201_CREATED, summary = "Crear chat")
def crearChat(chat_in: schemas.ChatCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_chat = Chat(**chat_in.model_dump())
    db.add(nuevo_chat)
    db.commit()
    db.refresh(nuevo_chat)
    return nuevo_chat

@router.get("/chats", summary = "Obtener todos los chats")
def obtenerTodosLosChats(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    if payload.get("role") not in ["Superadministrador", "Administrador"]:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para listar todos los chats")
    return db.query(Chat).offset(skip).limit(limit).all()

@router.get("/chats/buscar", summary = "Buscar chats con filtros dinámicos")
def buscarChats(
    id_usuario: Optional[int] = Query(None, description = "Filtrar chats donde participe este ID de usuario"), 
    viaje_id: Optional[int] = Query(None, description = "Filtrar por ID de viaje asociado (si aplica)"), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(getDB), 
    payload: dict = Depends(verifyToken)
):
    query = db.query(Chat)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    target_id = id_usuario if is_admin and id_usuario else current_user_id
    if target_id:
        query = query.filter((Chat.id_usuario1 == target_id) | (Chat.id_usuario2 == target_id))
    if viaje_id:
        query = query.filter(Chat.viaje_id == viaje_id)
    return query.offset(skip).limit(limit).all()

@router.get("/chats/{chat_id}", summary = "Obtener chat por ID")
def obtenerChatPorId(chat_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(chat.id_usuario1), str(chat.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "Acceso denegado: No eres participante de este chat")
    return chat

@router.delete("/chats/{chat_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar chat")
def eliminarChat(chat_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(chat.id_usuario1), str(chat.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "Acceso denegado: No tienes permisos para eliminar este chat")
    db.delete(chat)
    db.commit()
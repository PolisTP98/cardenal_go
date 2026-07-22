# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from data.database import getDB
from data.models import Amigo, Chat, MensajeChat
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/soc", tags = ["Social"])


# ------------------------------
# | OPERACIONES CRUD DE AMIGOS |
# ------------------------------

@router.post("/amigos", response_model = schemas.AmigoResponse, status_code = status.HTTP_201_CREATED, summary = "Agregar amigo")
def agregarAmigo(solicitud: schemas.AmigoCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(solicitud.id_usuario1), is_admin)
    existe = db.query(Amigo).filter(
        ((Amigo.id_usuario1 == solicitud.id_usuario1) & (Amigo.id_usuario2 == solicitud.id_usuario2)) |
        ((Amigo.id_usuario1 == solicitud.id_usuario2) & (Amigo.id_usuario2 == solicitud.id_usuario1))
    ).first()
    if existe:
        raise HTTPException(status_code = status.HTTP_400_BAD_REQUEST, detail = "Los usuarios ya tienen una amistad registrada")
    nueva_relacion = Amigo(**solicitud.model_dump())
    db.add(nueva_relacion)
    db.commit()
    db.refresh(nueva_relacion)
    return nueva_relacion

@router.get("/amigos", response_model = List[schemas.AmigoResponse], summary = "Obtener todas las relaciones de amistad")
def obtenerTodosLosAmigos(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))):
    return db.query(Amigo).offset(skip).limit(limit).all()

@router.get("/amigos/buscar", response_model = List[schemas.AmigoResponse], summary = "Buscar amigo(s) con filtros dinámicos")
def buscarAmigos(
    id_usuario: Optional[int] = Query(None, description = "Filtrar por ID del usuario"), 
    estado: Optional[str] = Query(None, description = "Filtrar por ID de estatus"), 
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

@router.get("/amigos/usuario/{usuario_id}", response_model = List[schemas.AmigoResponse], summary = "Obtener todos los amigos de un usuario por ID")
def obtenerAmigosPorUsuario(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(usuario_id), is_admin)
    return db.query(Amigo).filter((Amigo.id_usuario1 == usuario_id) | (Amigo.id_usuario2 == usuario_id)).all()

@router.patch("/amigos/{relacion_id}", response_model = schemas.AmigoResponse, summary = "Actualizar estatus de amistad por ID")
def actualizarAmigo(relacion_id: int, amigo_in: schemas.AmigoUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    relacion = db.query(Amigo).filter(Amigo.id == relacion_id).first()
    if not relacion:
        raise HTTPException(status_code = 404, detail = "Amistad no encontrada")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(relacion.id_usuario1), str(relacion.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para actualizar esta amistad")
    for key, value in amigo_in.model_dump(exclude_unset=True).items():
        setattr(relacion, key, value)
    db.commit()
    db.refresh(relacion)
    return relacion

@router.delete("/amigos/{relacion_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar amigo por ID")
def eliminarAmigo(relacion_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    relacion = db.query(Amigo).filter(Amigo.id == relacion_id).first()
    if not relacion:
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = "Amigo no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(relacion.id_usuario1), str(relacion.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = status.HTTP_403_FORBIDDEN, detail = "No tienes permisos para eliminar esta amistad")
    db.delete(relacion)
    db.commit()


# -----------------------------
# | OPERACIONES CRUD DE CHATS |
# -----------------------------

@router.post("/chats", response_model = schemas.ChatResponse, status_code = status.HTTP_201_CREATED, summary = "Crear chat")
def crearChat(chat_in: schemas.ChatCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_chat = Chat(**chat_in.model_dump())
    db.add(nuevo_chat)
    db.commit()
    db.refresh(nuevo_chat)
    return nuevo_chat

@router.get("/chats", response_model = List[schemas.ChatResponse], summary = "Obtener todos los chats")
def obtenerTodosLosChats(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(requireRole(["Superadministrador", "Administrador"]))):
    return db.query(Chat).offset(skip).limit(limit).all()

@router.get("/chats/buscar", response_model = List[schemas.ChatResponse], summary = "Buscar chat(s) con filtros dinámicos")
def buscarChats(
    id_usuario: Optional[int] = Query(None, description = "Filtrar por ID del usuario"), 
    id_viaje: Optional[int] = Query(None, description = "Filtrar por ID del viaje"), 
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
    if id_viaje:
        query = query.filter(Chat.id_viaje == id_viaje)
    return query.offset(skip).limit(limit).all()

@router.get("/chats/{chat_id}", response_model = schemas.ChatResponse, summary = "Obtener chat por ID")
def obtenerChatPorId(chat_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = "Chat no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(chat.id_usuario1), str(chat.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = status.HTTP_403_FORBIDDEN, detail = "No eres participante de este chat")
    return chat

@router.patch("/chats/{chat_id}", response_model = schemas.ChatResponse, summary = "Actualizar chat por ID")
def actualizarChat(chat_id: int, chat_in: schemas.ChatUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(chat.id_usuario1), str(chat.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para actualizar este chat")
    for key, value in chat_in.model_dump(exclude_unset=True).items():
        setattr(chat, key, value)
    db.commit()
    db.refresh(chat)
    return chat

@router.delete("/chats/{chat_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar chat por ID")
def eliminarChat(chat_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(chat.id_usuario1), str(chat.id_usuario2)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para eliminar este chat")
    db.delete(chat)
    db.commit()


# --------------------------------
# | OPERACIONES CRUD DE MENSAJES |
# --------------------------------

@router.post("/mensajes", response_model = schemas.MensajeChatResponse, status_code = status.HTTP_201_CREATED, summary = "Enviar mensaje de chat")
def crearMensaje(mensaje_in: schemas.MensajeChatCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(mensaje_in.id_emisor), is_admin)
    nuevo_mensaje = MensajeChat(**mensaje_in.model_dump())
    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)
    return nuevo_mensaje

@router.get("/mensajes", response_model = List[schemas.MensajeChatResponse], summary = "Obtener todos los mensajes")
def obtenerTodosLosMensajes(skip: int = 0, limit: int = 100, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    if payload.get("role") not in ["Superadministrador", "Administrador"]:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para ver todos los mensajes")
    return db.query(MensajeChat).offset(skip).limit(limit).all()

@router.get("/mensajes/buscar", response_model = List[schemas.MensajeChatResponse], summary = "Buscar mensaje(s) con filtros dinámicos")
def buscarMensajes(
    id_chat: Optional[int] = Query(None, description = "Filtrar por ID del chat"),
    id_emisor: Optional[int] = Query(None, description = "Filtrar por ID del emisor"),
    id_receptor: Optional[int] = Query(None, description = "Filtrar por ID del receptor"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    query = db.query(MensajeChat)
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = int(payload.get("sub"))
    if not is_admin:
        query = query.filter((MensajeChat.id_emisor == current_user_id) | (MensajeChat.id_receptor == current_user_id))
    if id_chat:
        query = query.filter(MensajeChat.id_chat == id_chat)
    if id_emisor:
        query = query.filter(MensajeChat.id_emisor == id_emisor)
    if id_receptor:
        query = query.filter(MensajeChat.id_receptor == id_receptor)
    return query.order_by(MensajeChat.fecha_hora_registro.asc()).offset(skip).limit(limit).all()

@router.get("/mensajes/{mensaje_id}", response_model = schemas.MensajeChatResponse, summary = "Obtener mensaje por ID")
def obtenerMensajePorId(mensaje_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    mensaje = db.query(MensajeChat).filter(MensajeChat.id == mensaje_id).first()
    if not mensaje:
        raise HTTPException(status_code = 404, detail = "Mensaje no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    current_user_id = str(payload.get("sub"))
    if current_user_id not in [str(mensaje.id_emisor), str(mensaje.id_receptor)] and not is_admin:
        raise HTTPException(status_code = 403, detail = "No tienes permisos para ver este mensaje")
    return mensaje

@router.patch("/mensajes/{mensaje_id}", response_model = schemas.MensajeChatResponse, summary = "Actualizar estado del mensaje (ej. marcar como leído)")
def actualizarMensaje(mensaje_id: int, mensaje_in: schemas.MensajeChatUpdate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    mensaje = db.query(MensajeChat).filter(MensajeChat.id == mensaje_id).first()
    if not mensaje:
        raise HTTPException(status_code = 404, detail = "Mensaje no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(mensaje.id_receptor), is_admin)
    for key, value in mensaje_in.model_dump(exclude_unset=True).items():
        setattr(mensaje, key, value)
    db.commit()
    db.refresh(mensaje)
    return mensaje

@router.delete("/mensajes/{mensaje_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar mensaje por ID")
def eliminarMensaje(mensaje_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    mensaje = db.query(MensajeChat).filter(MensajeChat.id == mensaje_id).first()
    if not mensaje:
        raise HTTPException(status_code = 404, detail = "Mensaje no encontrado")
    is_admin = payload.get("role") in ["Superadministrador", "Administrador"]
    verifyResourceOwnership(payload.get("sub"), str(mensaje.id_emisor), is_admin)
    db.delete(mensaje)
    db.commit()
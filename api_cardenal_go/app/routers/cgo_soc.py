# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from data.database import getDB
from data.models import Amigo, Chat, MensajeChat, Usuario
from models import schemas
from security.auth import verifyToken, requireRole, verifyResourceOwnership


# ---------------------------------------
# | INICIALIZAR LA INSTANCIA DEL ROUTER |
# ---------------------------------------

router = APIRouter(prefix = "/api/soc", tags = ["Social"])


# =================================
# | GESTIÓN DE AMIGOS / RELACIONES |
# =================================

@router.post("/amigos", response_model = schemas.AmigoResponse, status_code = status.HTTP_201_CREATED, summary = "Enviar solicitud de amistad")
def enviarSolicitudAmistad(
    solicitud: schemas.AmigoCreate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    # Verificar que ambos usuarios existen
    u1 = db.query(Usuario).filter(Usuario.id == solicitud.id_usuario1).first()
    u2 = db.query(Usuario).filter(Usuario.id == solicitud.id_usuario2).first()
    if not u1 or not u2:
        raise HTTPException(status_code = 404, detail = "Uno o ambos usuarios no encontrados")

    # Verificar que no existe ya una relación entre ellos (en cualquier dirección)
    existente = db.query(Amigo).filter(
        ((Amigo.id_usuario1 == solicitud.id_usuario1) & (Amigo.id_usuario2 == solicitud.id_usuario2)) |
        ((Amigo.id_usuario1 == solicitud.id_usuario2) & (Amigo.id_usuario2 == solicitud.id_usuario1))
    ).first()

    if existente:
        if existente.id_estatus_social == 3:
            raise HTTPException(status_code = 409, detail = "Uno de los usuarios ha bloqueado al otro")
        raise HTTPException(status_code = 409, detail = "Ya existe una relación entre estos usuarios")

    nueva_relacion = Amigo(
        id_usuario1 = solicitud.id_usuario1,
        id_usuario2 = solicitud.id_usuario2,
        id_estatus_social = 1  # 1 = Pendiente
    )
    db.add(nueva_relacion)
    db.commit()
    db.refresh(nueva_relacion)

    relacion_completa = db.query(Amigo).options(
        joinedload(Amigo.usuario1),
        joinedload(Amigo.usuario2),
        joinedload(Amigo.estatus_social)
    ).filter(Amigo.id == nueva_relacion.id).first()
    return relacion_completa


@router.get("/amigos/{usuario_id}", response_model = List[schemas.AmigoResponse], summary = "Listar todas las relaciones sociales de un usuario")
def obtenerRelaciones(
    usuario_id: int,
    id_estatus_social: Optional[int] = Query(None, description = "Filtrar: 1=Pendiente, 2=Amigos, 3=Bloqueado"),
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    query = db.query(Amigo).options(
        joinedload(Amigo.usuario1),
        joinedload(Amigo.usuario2),
        joinedload(Amigo.estatus_social)
    ).filter(
        (Amigo.id_usuario1 == usuario_id) | (Amigo.id_usuario2 == usuario_id)
    )
    if id_estatus_social is not None:
        query = query.filter(Amigo.id_estatus_social == id_estatus_social)
    return query.order_by(Amigo.fecha_hora_registro.desc()).all()


@router.get("/amigos/{usuario_id}/pendientes", response_model = List[schemas.AmigoResponse], summary = "Solicitudes de amistad RECIBIDAS pendientes de un usuario")
def obtenerSolicitudesPendientes(
    usuario_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    pendientes = db.query(Amigo).options(
        joinedload(Amigo.usuario1),
        joinedload(Amigo.usuario2),
        joinedload(Amigo.estatus_social)
    ).filter(
        Amigo.id_usuario2 == usuario_id,
        Amigo.id_estatus_social == 1
    ).order_by(Amigo.fecha_hora_registro.desc()).all()
    return pendientes


@router.put("/amigos/{relacion_id}", response_model = schemas.AmigoResponse, summary = "Aceptar (2), Bloquear (3) o Cancelar una relacion")
def actualizarRelacion(
    relacion_id: int,
    update_in: schemas.AmigoUpdate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    relacion = db.query(Amigo).filter(Amigo.id == relacion_id).first()
    if not relacion:
        raise HTTPException(status_code = 404, detail = "Relacion no encontrada")

    for key, value in update_in.model_dump(exclude_unset = True).items():
        setattr(relacion, key, value)
    db.commit()
    db.refresh(relacion)

    relacion_completa = db.query(Amigo).options(
        joinedload(Amigo.usuario1),
        joinedload(Amigo.usuario2),
        joinedload(Amigo.estatus_social)
    ).filter(Amigo.id == relacion_id).first()
    return relacion_completa


@router.delete("/amigos/{relacion_id}", status_code = status.HTTP_204_NO_CONTENT, summary = "Eliminar amistad o cancelar solicitud")
def eliminarRelacion(
    relacion_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    relacion = db.query(Amigo).filter(Amigo.id == relacion_id).first()
    if not relacion:
        raise HTTPException(status_code = 404, detail = "Relacion no encontrada")
    db.delete(relacion)
    db.commit()


# ======================
# | GESTION DE CHATS   |
# ======================

@router.get("/chats/viaje/{viaje_id}", response_model = schemas.ChatResponse, summary = "Obtener (o crear) el chat de un viaje")
def obtenerOCrearChatViaje(
    viaje_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    chat = db.query(Chat).filter(
        Chat.id_viaje == viaje_id,
        Chat.id_tipo_chat == 1
    ).first()

    if not chat:
        chat = Chat(id_tipo_chat = 1, id_viaje = viaje_id)
        db.add(chat)
        db.commit()
        db.refresh(chat)

    return chat


@router.get("/chats/directo/{otro_usuario_id}", response_model = schemas.ChatResponse, summary = "Obtener (o crear) un chat directo con otro usuario")
def obtenerOCrearChatDirecto(
    otro_usuario_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    usuario_actual_id = int(payload.get("sub"))
    
    # 1. Buscar si ya existe algún mensaje en un chat directo (tipo 2) entre ambos usuarios
    mensaje_existente = db.query(MensajeChat).join(Chat).filter(
        Chat.id_tipo_chat == 2,
        ((MensajeChat.id_emisor == usuario_actual_id) & (MensajeChat.id_receptor == otro_usuario_id)) |
        ((MensajeChat.id_emisor == otro_usuario_id) & (MensajeChat.id_receptor == usuario_actual_id))
    ).first()
    
    if mensaje_existente:
        chat = db.query(Chat).filter(Chat.id == mensaje_existente.id_chat).first()
        if chat:
            return chat
        
    # 2. Si no hay mensajes intercambiados aún, reutilizar un chat de tipo directo (2) vacío si existe
    subquery_chats_con_mensajes = db.query(MensajeChat.id_chat).distinct()
    chat_vacio = db.query(Chat).filter(
        Chat.id_tipo_chat == 2,
        ~Chat.id.in_(subquery_chats_con_mensajes)
    ).order_by(Chat.id.desc()).first()

    if chat_vacio:
        return chat_vacio

    # 3. Si no existe ningún chat directo vacío, crear uno nuevo
    nuevo_chat = Chat(id_tipo_chat = 2)
    db.add(nuevo_chat)
    db.commit()
    db.refresh(nuevo_chat)
    return nuevo_chat


@router.get("/chats/usuario/{usuario_id}", summary = "Bandeja de entrada: todos los chats del usuario")
def obtenerBandejaChats(
    usuario_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    chats_ids_query = db.query(MensajeChat.id_chat).filter(
        (MensajeChat.id_emisor == usuario_id) | (MensajeChat.id_receptor == usuario_id)
    ).distinct().all()
    chat_ids_list = [c[0] for c in chats_ids_query]

    if not chat_ids_list:
        return []

    chats = db.query(Chat).options(
        joinedload(Chat.mensajes).joinedload(MensajeChat.emisor),
        joinedload(Chat.mensajes).joinedload(MensajeChat.receptor)
    ).filter(Chat.id.in_(chat_ids_list)).all()

    resultado = []
    for chat in chats:
        mensajes_ordenados = sorted(chat.mensajes, key = lambda m: m.fecha_hora_registro, reverse = True)
        ultimo_mensaje = mensajes_ordenados[0] if mensajes_ordenados else None
        no_leidos = sum(1 for m in chat.mensajes if not m.leido and m.id_receptor == usuario_id)

        otro_usuario_id = None
        if ultimo_mensaje:
            otro_usuario_id = (
                ultimo_mensaje.id_receptor
                if ultimo_mensaje.id_emisor == usuario_id
                else ultimo_mensaje.id_emisor
            )
        otro_usuario = db.query(Usuario).filter(Usuario.id == otro_usuario_id).first() if otro_usuario_id else None

        resultado.append({
            "id": chat.id,
            "id_tipo_chat": chat.id_tipo_chat,
            "id_viaje": chat.id_viaje,
            "fecha_hora_registro": chat.fecha_hora_registro,
            "mensajes_no_leidos": no_leidos,
            "ultimo_mensaje": {
                "id": ultimo_mensaje.id,
                "id_chat": ultimo_mensaje.id_chat,
                "id_emisor": ultimo_mensaje.id_emisor,
                "id_receptor": ultimo_mensaje.id_receptor,
                "contenido": ultimo_mensaje.contenido,
                "leido": ultimo_mensaje.leido,
                "fecha_hora_registro": ultimo_mensaje.fecha_hora_registro,
            } if ultimo_mensaje else None,
            "otro_usuario": {
                "id": otro_usuario.id,
                "nombre_completo": otro_usuario.nombre_completo,
                "url_foto_perfil": otro_usuario.url_foto_perfil,
            } if otro_usuario else None,
        })

    return sorted(resultado, key = lambda x: (
        x["ultimo_mensaje"]["fecha_hora_registro"] if x["ultimo_mensaje"] else x["fecha_hora_registro"]
    ), reverse = True)


@router.get("/chats/{chat_id}/mensajes", response_model = List[schemas.MensajeChatResponse], summary = "Obtener mensajes de un chat (con paginacion)")
def obtenerMensajesChat(
    chat_id: int,
    skip: int = Query(0, ge = 0),
    limit: int = Query(50, le = 200),
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat no encontrado")

    mensajes = db.query(MensajeChat).options(
        joinedload(MensajeChat.emisor)
    ).filter(
        MensajeChat.id_chat == chat_id
    ).order_by(MensajeChat.fecha_hora_registro.asc()).offset(skip).limit(limit).all()
    return mensajes


# =========================
# | GESTION DE MENSAJES   |
# =========================

@router.post("/mensajes", response_model = schemas.MensajeChatResponse, status_code = status.HTTP_201_CREATED, summary = "Enviar mensaje en un chat")
def enviarMensaje(
    msg_in: schemas.MensajeChatCreate,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    chat = db.query(Chat).filter(Chat.id == msg_in.id_chat).first()
    if not chat:
        raise HTTPException(status_code = 404, detail = "Chat no encontrado")

    nuevo_mensaje = MensajeChat(**msg_in.model_dump())
    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)

    msg_completo = db.query(MensajeChat).options(
        joinedload(MensajeChat.emisor)
    ).filter(MensajeChat.id == nuevo_mensaje.id).first()
    return msg_completo


@router.put("/mensajes/{mensaje_id}/leido", response_model = schemas.MensajeChatResponse, summary = "Marcar mensaje como leido")
def marcarMensajeLeido(
    mensaje_id: int,
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    mensaje = db.query(MensajeChat).filter(MensajeChat.id == mensaje_id).first()
    if not mensaje:
        raise HTTPException(status_code = 404, detail = "Mensaje no encontrado")
    mensaje.leido = True
    db.commit()
    db.refresh(mensaje)
    return mensaje


@router.put("/mensajes/chat/{chat_id}/leidos", status_code = status.HTTP_200_OK, summary = "Marcar todos los mensajes de un chat como leidos para un usuario")
def marcarTodosMensajesLeidos(
    chat_id: int,
    usuario_id: int = Query(..., description = "ID del usuario receptor"),
    db: Session = Depends(getDB),
    payload: dict = Depends(verifyToken)
):
    db.query(MensajeChat).filter(
        MensajeChat.id_chat == chat_id,
        MensajeChat.id_receptor == usuario_id,
        MensajeChat.leido == False
    ).update({"leido": True})
    db.commit()
    return {"detail": "Mensajes marcados como leidos"}
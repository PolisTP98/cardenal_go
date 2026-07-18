# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
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
    nueva_relacion = Amigo(**solicitud.model_dump())
    db.add(nueva_relacion)
    db.commit()
    db.refresh(nueva_relacion)
    return nueva_relacion

@router.get("/amigos/{usuario_id}", summary = "Obtener todos los amigos de un usuario por su ID")
def obtenerAmigos(usuario_id: int, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    amigos = db.query(Amigo).filter((Amigo.id_usuario1 == usuario_id) | (Amigo.id_usuario2 == usuario_id)).all()
    return amigos

@router.post("/chats", status_code = status.HTTP_201_CREATED, summary = "Crear chat")
def crearChat(chat_in: schemas.ChatCreate, db: Session = Depends(getDB), payload: dict = Depends(verifyToken)):
    nuevo_chat = Chat(**chat_in.model_dump())
    db.add(nuevo_chat)
    db.commit()
    db.refresh(nuevo_chat)
    return nuevo_chat
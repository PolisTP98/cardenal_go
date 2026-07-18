# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# OBTENER LA URL DE CONEXIÓN A LA BASE DE DATOS DEL ARCHIVO ".env"
DATABASE_URL = os.getenv("DATABASE_URL")

# CREAR EL MOTOR DE CONEXIÓN
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping = True
)

# AGREGAR EL GESTOR DE SESIONES
SessionLocal = sessionmaker(
    autocommit = False, 
    autoflush = False, 
    bind = engine
)

# DEFINIR LA BASE DECLARATIVA PARA LOS MODELOS ORM
Base = declarative_base()

# FUNCIÓN PARA MANEJAR LAS SESIONES DE LAS REQUESTS
def getDB():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
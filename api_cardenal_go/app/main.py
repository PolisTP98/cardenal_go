# -------------------------------
# | IMPORTAR MÓDULOS NECESARIOS |
# -------------------------------

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from data.database import SessionLocal, engine
from data.models import Base
from registros_base import poblarBaseDeDatos
from routers import cgo_usu, cgo_via, cgo_soc, cgo_adm, cgo_not


# ----------------------------------------
# | POBLAR BASE DE DATOS AUTOMÁTICAMENTE |
# ----------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[BACKEND] Esperando conexion con la Base de Datos...")
    for intento in range(5):
        try:
            with engine.connect() as connection:
                break
        except Exception:
            time.sleep(3)
    try:
        Base.metadata.create_all(bind = engine)
        db = SessionLocal()
        try:
            print("[BACKEND] Insertando registros base en las tablas de tipo catálogo...")
            poblarBaseDeDatos(db)
            print("[BACKEND] Registros base insertados exitosamente")
        except Exception as e:
            print(f"[BACKEND] Error al poblar las tablas de tipo catálogo: {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"[BACKEND] Error crítico durante la inicialización de la Base de Datos: {e}")
    yield


# -----------------------------------
# | INICIALIZACIÓN DE LA APLICACIÓN |
# -----------------------------------

app = FastAPI(title = "API Cardenal GO", lifespan = lifespan)

# REGISTRAR DINÁMICAMENTE LOS ROUTERS
app.include_router(cgo_usu.router)
app.include_router(cgo_via.router)
app.include_router(cgo_soc.router)
app.include_router(cgo_adm.router)
app.include_router(cgo_not.router)
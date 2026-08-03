# ----------------------------------------
# | MÓDULO DE ALMACENAMIENTO LOCAL DE IMÁGENES |
# ----------------------------------------
#
# Gestiona la creación de la estructura de carpetas, la validación de formatos
# y tamaños, y el guardado/eliminación de archivos de imagen en disco.
#
# Estructura creada:
#   Imagenes/
#   ├── usuarios/
#   │   ├── pasajeros/
#   │   └── conductores/
#   └── vehiculos/

import os
import uuid
from fastapi import UploadFile, HTTPException, status


# -----------------------------------------
# | RUTAS BASE DE LA ESTRUCTURA DE CARPETAS |
# -----------------------------------------

# Resolución dinámica: la carpeta Imagenes/ siempre queda en la raíz del backend (/app en Docker)
_APP_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE_IMAGENES = os.path.join(_APP_DIR, "Imagenes")

RUTA_PASAJEROS   = os.path.join(BASE_IMAGENES, "usuarios", "pasajeros")
RUTA_CONDUCTORES = os.path.join(BASE_IMAGENES, "usuarios", "conductores")
RUTA_VEHICULOS   = os.path.join(BASE_IMAGENES, "vehiculos")
RUTA_CHAT        = os.path.join(BASE_IMAGENES, "chat")

# Rutas relativas para guardar en la Base de Datos
_REL_CONDUCTORES = os.path.join("Imagenes", "usuarios", "conductores")
_REL_VEHICULOS   = os.path.join("Imagenes", "vehiculos")
_REL_PASAJEROS   = os.path.join("Imagenes", "usuarios", "pasajeros")
_REL_CHAT        = os.path.join("Imagenes", "chat")


# -----------------------------------------
# | CONFIGURACIÓN DE VALIDACIÓN           |
# -----------------------------------------

EXTENSIONES_PERMITIDAS = {"jpg", "jpeg", "png"}
TAMANO_MAXIMO_BYTES    = 5 * 1024 * 1024   # 5 MB


# ------------------------------------------
# | CREAR ESTRUCTURA DE CARPETAS AL INICIO |
# ------------------------------------------

def crearEstructuraCarpetas() -> None:
    """
    Crea automáticamente la estructura completa de carpetas Imagenes/
    si no existe. Se invoca desde el lifespan de la aplicación FastAPI.
    """
    carpetas = [RUTA_PASAJEROS, RUTA_CONDUCTORES, RUTA_VEHICULOS, RUTA_CHAT]
    for carpeta in carpetas:
        os.makedirs(carpeta, exist_ok = True)
    print("[IMAGENES] Estructura de carpetas verificada/creada exitosamente:")
    print(f"  → {RUTA_PASAJEROS}")
    print(f"  → {RUTA_CONDUCTORES}")
    print(f"  → {RUTA_VEHICULOS}")
    print(f"  → {RUTA_CHAT}")


# ------------------------------------------
# | VALIDAR FORMATO Y TAMAÑO DE UN ARCHIVO |
# ------------------------------------------

def _validarArchivo(archivo: UploadFile) -> str:
    """
    Valida la extensión y el tamaño del archivo cargado.
    Devuelve la extensión en minúsculas si es válida.
    Lanza HTTPException 422 si no cumple los requisitos.
    """
    nombre = archivo.filename or ""
    extension = nombre.rsplit(".", 1)[-1].lower() if "." in nombre else ""

    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail = f"Formato de imagen no permitido: '{extension}'. Use JPG, JPEG o PNG."
        )
    return extension


async def _leerConValidacionTamano(archivo: UploadFile) -> bytes:
    """
    Lee el contenido del archivo en memoria y valida que no supere el límite.
    Lanza HTTPException 413 si el archivo es demasiado grande.
    """
    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO_BYTES:
        raise HTTPException(
            status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail = f"El archivo '{archivo.filename}' supera el tamaño máximo permitido de 5 MB."
        )
    return contenido


# ------------------------------------------
# | GUARDAR UN ARCHIVO DE IMAGEN EN DISCO  |
# ------------------------------------------

async def guardarImagen(archivo: UploadFile, carpeta_destino: str, nombre_base: str) -> str:
    """
    Guarda un UploadFile en `carpeta_destino` con un nombre único.

    Args:
        archivo:          UploadFile proveniente de FastAPI.
        carpeta_destino:  Ruta absoluta del directorio de destino.
        nombre_base:      Prefijo del nombre del archivo (ej. "conductor_7").

    Returns:
        Ruta relativa del archivo guardado (para almacenar en la BD).
        Ejemplo: "Imagenes/usuarios/conductores/conductor_7_a1b2c3.jpg"

    Raises:
        HTTPException 422: si el formato no es válido.
        HTTPException 413: si el archivo supera 5 MB.
        HTTPException 500: si ocurre un error al escribir en disco.
    """
    extension  = _validarArchivo(archivo)
    contenido  = await _leerConValidacionTamano(archivo)

    # Generar nombre único con UUID corto para evitar colisiones
    nombre_unico = f"{nombre_base}_{uuid.uuid4().hex[:8]}.{extension}"
    ruta_absoluta = os.path.join(carpeta_destino, nombre_unico)

    try:
        with open(ruta_absoluta, "wb") as f:
            f.write(contenido)
    except OSError as e:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = f"Error al guardar la imagen '{nombre_unico}': {e}"
        )

    # Determinar ruta relativa para la BD usando el prefijo correcto
    if carpeta_destino == RUTA_CONDUCTORES:
        rel_dir = _REL_CONDUCTORES
    elif carpeta_destino == RUTA_VEHICULOS:
        rel_dir = _REL_VEHICULOS
    elif carpeta_destino == RUTA_CHAT:
        rel_dir = _REL_CHAT
    else:
        rel_dir = _REL_PASAJEROS

    return os.path.join(rel_dir, nombre_unico).replace("\\", "/")


# ------------------------------------------
# | ELIMINAR UN ARCHIVO DE IMAGEN DEL DISCO |
# ------------------------------------------

def eliminarImagen(ruta_relativa: str) -> None:
    """
    Elimina un archivo de imagen dado su path relativo (tal como está en la BD).
    No lanza excepción si el archivo no existe (idempotente).
    """
    if not ruta_relativa:
        return
    ruta_absoluta = os.path.join(_APP_DIR, ruta_relativa.replace("/", os.sep))
    if os.path.isfile(ruta_absoluta):
        try:
            os.remove(ruta_absoluta)
        except OSError:
            pass  # Silencioso: el archivo no pudo eliminarse, no es crítico

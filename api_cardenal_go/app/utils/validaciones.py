import re
from fastapi import HTTPException

def validar_placa_queretaro(placa: str) -> str:
    """
    Normaliza y valida que la placa corresponda al Estado de Querétaro.
    Retorna la placa normalizada (mayúsculas, sin espacios, sin guiones).
    """
    if not placa:
        return placa
        
    # 1. Normalizar: mayúsculas, sin espacios, sin guiones
    placa_norm = placa.upper().replace(" ", "").replace("-", "")
    
    # 2. Expresión regular para Querétaro
    # Autos particulares: U[KLMNP][A-Z] seguido de (3 números + 1 letra), (4 números) o (3 números)
    # Vehículos de carga: S[STUVWXY] seguido de 4 números y 1 letra
    patron = r"^(U[KLMNP][A-Z](\d{3}[A-Z]|\d{4}|\d{3})|S[STUVWXY]\d{4}[A-Z])$"
    
    if not re.match(patron, placa_norm):
        raise HTTPException(
            status_code=400,
            detail="La placa ingresada no corresponde a un formato válido del Estado de Querétaro."
        )
        
    return placa_norm

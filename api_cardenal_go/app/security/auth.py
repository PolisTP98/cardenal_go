import jwt
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Any, Dict
from fastapi import Depends, HTTPException, status, Security, Request
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from pydantic_settings import BaseSettings
from slowapi import Limiter
from slowapi.util import get_remote_address
from passlib.context import CryptContext

class Settings(BaseSettings):
    api_key: str = ""
    jwt_secret_key: str = ""
    master_user: str = ""
    master_password: str = ""
    superadmin_password: str = ""
    class Config:
        env_file = ".env"
        extra = "ignore"

env_settings = Settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
api_key_scheme = APIKeyHeader(name = "X-API-Key", auto_error = False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl = "api/usu/token")
rate_limiter = Limiter(key_func = get_remote_address)

def hashPassword(password: str) -> str:
    return pwd_context.hash(password)

def verifyPassword(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def verifyAPIKey(api_key: Optional[str] = Security(api_key_scheme)) -> str:
    if not api_key or api_key != env_settings.api_key:
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN,
            detail = "Acceso denegado: API Key inválida o faltante"
        )
    return api_key

def createAccessToken(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes = 1440))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, env_settings.jwt_secret_key, algorithm = "HS256")
    return encoded_jwt

def verifyToken(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, env_settings.jwt_secret_key, algorithms = ["HS256"])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code = status.HTTP_401_UNAUTHORIZED, 
                detail = "Payload de token inválido"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED, 
            detail = "El token ha expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED, 
            detail = "No se pudieron validar las credenciales"
        )

def renewToken(token: str = Depends(oauth2_scheme)) -> str:
    payload = verifyToken(token)
    data_to_encode = {"sub": payload.get("sub"), "role": payload.get("role")}
    return createAccessToken(data_to_encode)

def requireRole(allowed_roles: List[str]):
    def roleChecker(payload: Dict[str, Any] = Depends(verifyToken)) -> Dict[str, Any]:
        user_role = payload.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code = status.HTTP_403_FORBIDDEN,
                detail = "Operación no permitida para el rol actual"
            )
        return payload
    return roleChecker

def verifyResourceOwnership(current_user_id: str, resource_owner_id: str, is_admin: bool = False) -> bool:
    if str(current_user_id) != str(resource_owner_id) and not is_admin:
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN,
            detail = "Acceso denegado: No tienes permisos sobre este recurso"
        )
    return True
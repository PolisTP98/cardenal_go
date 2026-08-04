from flask import Flask, render_template, request, redirect, url_for, session, flash, Response, jsonify
import requests
import os
import json
from functools import wraps
from dotenv import load_dotenv

load_dotenv(dotenv_path = "../.env")

app = Flask(__name__)
app.secret_key = os.environ.get("FRONTEND_SECRET_KEY", "cardenalgo_default_secret")
API_URL = os.environ.get("API_URL", "http://backend:8000")

@app.context_processor
def inject_api_url():
    return dict(API_URL=API_URL)

def requiere_auth(roles_permitidos):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if "token" not in session:
                return redirect(url_for("login"))
            if session.get("role") not in roles_permitidos:
                session.clear()
                return redirect(url_for("login"))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_headers():
    return {"Authorization": f"Bearer {session.get('token')}"}

@app.route("/", methods = ["GET", "POST"])
def login():
    if request.method == "POST":
        matricula = request.form.get("matricula")
        password = request.form.get("password")
        try:
            res = requests.post(
                f"{API_URL}/api/usu/token", 
                data = {"username": matricula, "password": password}
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("role") in ["Superadministrador", "Administrador"]:
                    session["token"] = data.get("access_token")
                    session["role"] = data.get("role")
                    session["nombre"] = data.get("nombre_completo")
                    session["usuario_id"] = data.get("usuario_id") or data.get("id_usuario")
                    return redirect(url_for("dashboard_usuarios"))
                else:
                    flash("Acceso denegado, rol no autorizado", "danger")
            else:
                flash("Credenciales inválidas", "danger")
        except Exception:
            flash("Error de conexión con la API", "danger")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

def normalizar_rol(u):
    if isinstance(u, dict):
        rol = u.get("rol") or u.get("role")
        if isinstance(rol, dict):
            return rol.get("nombre", "Sin rol")
        return str(rol) if rol else "Sin rol"
    return "Sin rol"

def obtener_fecha_registro(u):
    f = u.get("fecha_hora_registro") or u.get("fecha_registro") or u.get("created_at") or u.get("fecha") or ""
    return str(f)[:10]

@app.route("/dashboard/usuarios")
@requiere_auth(["Superadministrador", "Administrador"])
def dashboard_usuarios():
    try:
        res = requests.get(f"{API_URL}/api/adm/dashboard/usuarios", headers = get_headers())
        data = res.json() if res.status_code == 200 else {}
    except:
        data = {}
        
    estadisticas = data.get("estadisticas", {})
    total = estadisticas.get("total", 0)
    c_pas = estadisticas.get("pasajeros", 0)
    c_con = estadisticas.get("conductores", 0)
    c_adm = estadisticas.get("administradores", 0)
    c_sadm = estadisticas.get("superadministradores", 0)
    
    conteo = {"Pasajero": c_pas, "Conductor": c_con, "Administrador": c_adm, "Superadministrador": c_sadm}
    regs = []
    
    recientes = data.get("recientes", [])
    if isinstance(recientes, list):
        for u in recientes:
            fecha = obtener_fecha_registro(u)
            rol_norm = normalizar_rol(u)
            if fecha:
                regs.append({
                    "fecha": fecha, 
                    "fecha_registro": fecha, 
                    "fecha_hora_registro": fecha,
                    "categoria": rol_norm, 
                    "rol": rol_norm
                })
            
    return render_template(
        "dashboard_usuarios.html", 
        total_usuarios = total, 
        count_pasajero = c_pas, 
        count_conductor = c_con, 
        count_admin = c_adm, 
        count_superadmin = c_sadm, 
        conteo_roles_json = json.dumps(conteo), 
        registros_json = json.dumps(regs), 
        rol = session.get("role"), 
        active_page = "dashboard_usuarios"
    )

@app.route("/dashboard/incidencias")
@requiere_auth(["Superadministrador", "Administrador"])
def dashboard_incidencias():
    try:
        res = requests.get(f"{API_URL}/api/adm/dashboard/incidencias", headers = get_headers())
        data = res.json() if res.status_code == 200 else {}
    except:
        data = {}
        
    total = data.get("total", 0)
    c_pen = data.get("pendientes", 0)
    c_pro = data.get("en_proceso", 0)
    c_res = data.get("resueltas", 0)
    
    return render_template(
        "dashboard_incidencias.html", 
        total_incidencias = total, 
        count_pasajero = c_pen, 
        count_conductor = c_res, 
        count_admin = c_pro, 
        count_superadmin = 0, 
        conteo_roles_json = json.dumps({"Pendiente": c_pen, "En Proceso": c_pro, "Resuelta": c_res}), 
        registros_json = json.dumps([]), 
        rol = session.get("role"), 
        active_page = "dashboard_incidencias"
    )

@app.route("/dashboard/viajes")
@requiere_auth(["Superadministrador", "Administrador"])
def dashboard_viajes():
    try:
        res = requests.get(f"{API_URL}/api/adm/dashboard/viajes", headers = get_headers())
        data = res.json() if res.status_code == 200 else {}
    except:
        data = {}
        
    total = data.get("total", 0)
    c_act = data.get("activos", 0)
    c_fin = data.get("finalizados", 0)
    c_can = data.get("cancelados", 0)
    
    return render_template(
        "dashboard_viajes.html", 
        total_viajes = total, 
        count_activos = c_act, 
        count_finalizados = c_fin, 
        count_cancelados = c_can, 
        conteo_roles_json = json.dumps({"Activos": c_act, "Finalizados": c_fin, "Cancelados": c_can}), 
        registros_json = json.dumps([]), 
        rol = session.get("role"), 
        active_page = "dashboard_viajes"
    )

@app.route("/usuarios")
@requiere_auth(["Superadministrador", "Administrador"])
def usuarios():
    try:
        res = requests.get(f"{API_URL}/api/usu/", headers = get_headers())
        usuarios_data = res.json() if res.status_code == 200 else []
    except:
        usuarios_data = []
    return render_template("usuarios.html", usuarios = usuarios_data, rol = session.get("role"), active_page = "usuarios")

@app.route("/usuarios/crear", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def crear_usuario():
    payload_backend = {
        "matricula": request.form.get("matricula"), 
        "nombre_completo": request.form.get("nombre_completo"), 
        "correo_institucional": request.form.get("correo"), 
        "contrasena_raw": request.form.get("password")
    }
    id_rol = request.form.get("id_rol")
    resp = requests.post(f"{API_URL}/api/usu/", json = payload_backend, headers = get_headers())
    if resp.status_code in [200, 201]:
        user_data = resp.json()
        new_user_id = user_data.get("id")
        if id_rol and new_user_id:
            requests.put(
                f"{API_URL}/api/usu/usuarios/{new_user_id}/estatus", 
                json = {"id_rol": int(id_rol)}, 
                headers = get_headers()
            )
        flash("Usuario creado exitosamente", "success")
    else:
        detalle = resp.json().get("detail", "Error al crear usuario") if resp.headers.get("content-type") == "application/json" else "Error al crear usuario"
        flash(f"Error: {detalle}", "danger")
    return redirect(url_for("usuarios"))

@app.route("/usuarios/editar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def editar_usuario(id):
    payload_backend = {
        "matricula": request.form.get("matricula"), 
        "nombre_completo": request.form.get("nombre_completo"), 
        "correo_institucional": request.form.get("correo")
    }
    nueva_pass = request.form.get("password")
    if nueva_pass and nueva_pass.strip():
        payload_backend["contrasena_raw"] = nueva_pass.strip()
    id_rol = request.form.get("id_rol")
    resp = requests.put(f"{API_URL}/api/usu/{id}", json = payload_backend, headers = get_headers())
    if resp.status_code == 200:
        if id_rol:
            requests.put(
                f"{API_URL}/api/usu/usuarios/{id}/estatus", 
                json = {"id_rol": int(id_rol)}, 
                headers = get_headers()
            )
        flash("Usuario actualizado exitosamente", "success")
    else:
        flash("Error al actualizar usuario", "danger")
    return redirect(url_for("usuarios"))

@app.route("/usuarios/eliminar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def eliminar_usuario(id):
    respuesta = requests.patch(f"{API_URL}/api/usu/usuarios/{id}/eliminacion-logica", headers = get_headers())
    if respuesta.status_code in [200, 204]:
        flash("Usuario eliminado exitosamente", "info")
    else:
        try:
            error_det = respuesta.json().get("detail", "Error desconocido en el servidor")
        except Exception:
            error_det = "No se pudo conectar correctamente con el servicio"
        flash(f"No fue posible eliminar el usuario: {error_det}", "danger")
    return redirect(url_for("usuarios"))

@app.route("/reportes")
@requiere_auth(["Superadministrador", "Administrador"])
def reportes():
    try:
        res = requests.get(f"{API_URL}/api/adm/reportes", headers = get_headers())
        reportes_data = res.json() if res.status_code == 200 else []
        res_mot = requests.get(f"{API_URL}/api/adm/motivos_reporte", headers = get_headers())
        motivos_data = res_mot.json() if res_mot.status_code == 200 else []
        res_est = requests.get(f"{API_URL}/api/adm/estatus_usuarios", headers = get_headers())
        estatus_data = res_est.json() if res_est.status_code == 200 else []
        res_usu = requests.get(f"{API_URL}/api/usu/", headers = get_headers())
        usuarios_data = [u for u in res_usu.json() if u.get("rol") not in ["Superadministrador", "Administrador"]] if res_usu.status_code == 200 else []
    except:
        reportes_data = []
        motivos_data = []
        estatus_data = []
        usuarios_data = []
    return render_template(
        "reportes.html", 
        reportes = reportes_data, 
        rol = session.get("role"),
        motivos = motivos_data,
        estatus_usuarios = estatus_data,
        usuarios_restringidos = usuarios_data,
        current_user_id = session.get("usuario_id"),
        active_page="reportes"
    )

@app.route("/reportes/crear", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def crear_reporte():
    data = {
        "id_reportador": request.form.get("id_reportador"),
        "id_reportado": request.form.get("id_reportado"),
        "id_motivo_reporte": request.form.get("id_motivo_reporte"),
        "motivo_personalizado": request.form.get("motivo_personalizado"),
        "id_viaje": request.form.get("id_viaje")
    }
    requests.post(f"{API_URL}/api/adm/reportes", json = data, headers = get_headers())
    return redirect(url_for("reportes"))

@app.route("/reportes/editar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador"])
def editar_reporte(id):
    data = {
        "id_reportador": request.form.get("id_reportador"),
        "id_reportado": request.form.get("id_reportado"),
        "id_motivo_reporte": request.form.get("id_motivo_reporte"),
        "motivo_personalizado": request.form.get("motivo_personalizado"),
        "id_viaje": request.form.get("id_viaje")
    }
    requests.patch(f"{API_URL}/api/adm/reportes/{id}", json = data, headers = get_headers())
    return redirect(url_for("reportes"))

@app.route("/reportes/eliminar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def eliminar_reporte(id):
    if session.get("role") == "Superadministrador":
        requests.delete(f"{API_URL}/api/adm/reportes/{id}", headers = get_headers())
    return redirect(url_for("reportes"))

@app.route("/sanciones/crear", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def crear_sancion():
    id_reporte = request.form.get("id_reporte")
    payload_sancion = {
        "id_usuario": int(request.form.get("id_usuario")),
        "id_administrador": int(request.form.get("id_administrador")),
        "id_estatus_usuario": int(request.form.get("id_estatus_usuario")),
        "fecha_fin": request.form.get("fecha_fin") if request.form.get("fecha_fin") else None,
        "notas_administrador": request.form.get("notas_administrador") or None,
        "nueva_calificacion_pasajero": float(request.form.get("nueva_calificacion_pasajero")) if request.form.get("nueva_calificacion_pasajero") else None,
        "nueva_calificacion_conductor": float(request.form.get("nueva_calificacion_conductor")) if request.form.get("nueva_calificacion_conductor") else None
    }
    res_sancion = requests.post(
        f"{API_URL}/api/adm/sanciones", 
        json = payload_sancion, 
        headers = get_headers()
    )
    if res_sancion.status_code in [200, 201]:
        if id_reporte:
            ID_ESTADO_ATENDIDO = 3
            payload_reporte = {
                "id_estado_reporte": ID_ESTADO_ATENDIDO
            }
            res_reporte = requests.patch(
                f"{API_URL}/api/adm/reportes/{id_reporte}", 
                json = payload_reporte, 
                headers = get_headers()
            )
            if res_reporte.status_code == 200:
                flash("Sanción aplicada y reporte cerrado con éxito.", "success")
            else:
                flash("Sanción aplicada correctamente, pero ocurrió un problema al cambiar el estado del reporte.", "warning")
        else:
            flash("Sanción aplicada exitosamente.", "success")
    else:
        try:
            error_det = res_sancion.json().get("detail", "Error al procesar la sanción.")
        except Exception:
            error_det = "Error de comunicación con el backend."
        flash(f"No se pudo registrar la sanción: {error_det}", "danger")
    return redirect(url_for("reportes"))

@app.route("/viajes")
@requiere_auth(["Superadministrador", "Administrador"])
def viajes():
    registros = []
    try:
        # Obtener viajes (retorna ViajeResponse)
        res_via = requests.get(f"{API_URL}/api/via/", headers = get_headers())
        viajes_raw = res_via.json() if res_via.status_code == 200 else []
        
        # Obtener solicitudes (retorna SolicitudViajeResponse)
        res_sol = requests.get(f"{API_URL}/api/via/solicitudes/", headers = get_headers())
        solicitudes_raw = res_sol.json() if res_sol.status_code == 200 else []
        
        # Concatenar las respuestas directamente, cada una cuenta con su tipo_registro desde la API
        if isinstance(viajes_raw, list):
            registros.extend(viajes_raw)
        if isinstance(solicitudes_raw, list):
            registros.extend(solicitudes_raw)
            
        # Ordenar por fecha_hora_registro descendente
        registros.sort(key=lambda x: x.get("fecha_hora_registro") or "", reverse=True)
        
    except Exception as e:
        registros = []
        
    return render_template("viajes.html", registros = registros, active_page="viajes")

@app.route("/exportar/<modulo>/<formato>")
@requiere_auth(["Superadministrador", "Administrador"])
def exportar(modulo, formato):
    endpoints = {
        "usuarios": f"{API_URL}/api/usu/reportes/{formato}", 
        "reportes": f"{API_URL}/api/adm/reportes/exportar/{formato}", 
        "viajes": f"{API_URL}/api/via/reportes/{formato}"
    }
    url = endpoints.get(modulo)
    if url:
        res = requests.get(url, headers = get_headers())
        if res.status_code == 200:
            return Response(
                res.content, 
                headers = {"Content-Disposition": f"attachment; filename = reporte_{modulo}.{formato}"}, 
                content_type = res.headers.get("Content-Type")
            )
    flash("Error al generar el reporte", "danger")
    return redirect(url_for("dashboard_usuarios"))

@app.route("/api_local/reportes_dinamicos/<modulo>/<formato>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def proxy_reportes_dinamicos(modulo, formato):
    data = request.get_json()
    urls_backend = {
        "usu": f"{API_URL}/api/usu/reportes/{formato}",
        "adm": f"{API_URL}/api/adm/reportes/{formato}",
        "via": f"{API_URL}/api/via/reportes/{formato}"
    }
    url_destino = urls_backend.get(modulo)
    
    if url_destino:
        res = requests.post(url_destino, json = data, headers = get_headers())
        if res.status_code == 200:
            return Response(
                res.content, 
                content_type = res.headers.get("Content-Type")
            )
    return jsonify({"error": "No fue posible generar el reporte"}), 400

@app.route("/api_local/notificaciones", methods = ["GET"])
@requiere_auth(["Superadministrador", "Administrador"])
def obtener_notificaciones():
    try:
        res = requests.get(f"{API_URL}/api/adm/solicitudes_conductores", headers = get_headers())
        if res.status_code == 200:
            solicitudes = res.json()
            notificaciones = []
            for sol in solicitudes:
                notificaciones.append({
                    "id_notificacion": sol["id"],
                    "titulo": f"Nueva solicitud de conductor (Usuario {sol['id_usuario']})",
                    "cuerpo": f"Placa: {sol['placa']} - Modelo: {sol['modelo']}",
                    "datos_solicitud": sol
                })
            return jsonify(notificaciones)
        return jsonify([])
    except Exception:
        return jsonify([])

@app.route("/api_local/procesar_solicitud_conductor", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def procesar_solicitud_conductor():
    data = request.get_json()
    id_notificacion = data.get("id_notificacion")
    accion = data.get("accion")
    motivo = data.get("motivo", "")
    try:
        endpoint = f"{API_URL}/api/adm/solicitudes_conductores/{id_notificacion}/procesar"
        res = requests.post(
            endpoint,
            json = {"accion": accion, "motivo_rechazo": motivo},
            headers = get_headers()
        )
        if res.status_code == 200:
            return jsonify({"success": True, "message": f"Solicitud {accion}da con éxito"})
        else:
            return jsonify({"success": False, "message": "No se pudo procesar la solicitud"})
    except Exception:
        return jsonify({"success": False, "message": "Error de conexión con el backend"})

if __name__ == "__main__":
    app.run(host = "0.0.0.0", port = 5000)
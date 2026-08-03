from flask import Flask, render_template, request, redirect, url_for, session, flash, Response, jsonify
import requests
import os
import json
from functools import wraps
from dotenv import load_dotenv
from decimal import Decimal, ROUND_DOWN

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
                    session["token"] = data["access_token"]
                    session["role"] = data["role"]
                    session["nombre"] = data["nombre_completo"]
                    session["usuario_id"] = data.get("id")
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
    val = u.get("rol") or u.get("role") or u.get("rol_nombre") or u.get("tipo")
    if isinstance(val, dict):
        val = val.get("nombre") or val.get("rol") or ""
    val = str(val or "").strip().lower().replace("_", "").replace(" ", "")
    if "super" in val:
        return "Superadministrador"
    elif "admin" in val:
        return "Administrador"
    elif "conduc" in val:
        return "Conductor"
    elif "pasaj" in val:
        return "Pasajero"
    return "Pasajero"

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
        
    total = data.get("total", 0)
    c_pas = data.get("pasajeros", 0)
    c_con = data.get("conductores", 0)
    c_adm = data.get("administradores", 0)
    c_sadm = 0 # Incluido en admins por simplicidad en este conteo
    
    conteo = {"Pasajero": c_pas, "Conductor": c_con, "Administrador": c_adm, "Superadministrador": c_sadm}
    # Para el gráfico, enviaremos un json vacío ya que no estamos jalando todos los registros
    return render_template(
        "dashboard_usuarios.html", 
        total_usuarios = total, 
        count_pasajero = c_pas, 
        count_conductor = c_con, 
        count_admin = c_adm, 
        count_superadmin = c_sadm, 
        conteo_roles_json = json.dumps(conteo), 
        registros_json = json.dumps([]), 
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
    return render_template("usuarios.html", usuarios = usuarios_data, rol = session.get("role"), active_page="usuarios")

@app.route("/usuarios/crear", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def crear_usuario():
    data = {
        "matricula": request.form.get("matricula"),
        "nombre_completo": request.form.get("nombre_completo"),
        "correo": request.form.get("correo"),
        "password": request.form.get("password"),
        "rol": request.form.get("rol")
    }
    requests.post(f"{API_URL}/api/usu/", json = data, headers = get_headers())
    return redirect(url_for("usuarios"))

@app.route("/usuarios/editar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def editar_usuario(id):
    data = {
        "matricula": request.form.get("matricula"),
        "nombre_completo": request.form.get("nombre_completo"),
        "correo": request.form.get("correo"),
        "rol": request.form.get("rol")
    }
    password = request.form.get("password")
    if password:
        data["password"] = password
    calificacion_raw = request.form.get("calificacion")
    if calificacion_raw is not None and calificacion_raw != "":
        try:
            d = Decimal(calificacion_raw).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            d = max(Decimal('0.00'), min(Decimal('5.00'), d))
            data["calificacion"] = float(d)
        except Exception:
            pass
    requests.put(f"{API_URL}/api/usu/{id}", json = data, headers = get_headers())
    return redirect(url_for("usuarios"))

@app.route("/usuarios/eliminar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def eliminar_usuario(id):
    if session.get("role") != "Administrador":
        requests.delete(f"{API_URL}/api/usu/{id}", headers = get_headers())
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
    requests.put(f"{API_URL}/api/adm/reportes/{id}", json = data, headers = get_headers())
    return redirect(url_for("reportes"))

@app.route("/reportes/eliminar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def eliminar_reporte(id):
    if session.get("role") != "Administrador":
        requests.delete(f"{API_URL}/api/adm/reportes/{id}", headers = get_headers())
    return redirect(url_for("reportes"))

@app.route("/sanciones/crear", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def crear_sancion():
    data = {
        "id_usuario": request.form.get("id_usuario"),
        "id_administrador": request.form.get("id_administrador"),
        "id_estatus_usuario": request.form.get("id_estatus_usuario"),
        "nueva_calificacion_pasajero": request.form.get("nueva_calificacion_pasajero"),
        "nueva_calificacion_conductor": request.form.get("nueva_calificacion_conductor"),
        "fecha_fin": request.form.get("fecha_fin") or None,
        "notas_administrador": request.form.get("notas_administrador")
    }
    requests.post(f"{API_URL}/api/adm/sanciones", json = data, headers = get_headers())
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
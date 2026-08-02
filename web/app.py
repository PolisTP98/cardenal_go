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
        res = requests.get(f"{API_URL}/api/usu/", headers = get_headers())
        usuarios_data = res.json() if res.status_code == 200 else []
    except:
        usuarios_data = []
    total = len(usuarios_data)
    c_pas = sum(1 for u in usuarios_data if normalizar_rol(u) == "Pasajero")
    c_con = sum(1 for u in usuarios_data if normalizar_rol(u) == "Conductor")
    c_adm = sum(1 for u in usuarios_data if normalizar_rol(u) == "Administrador")
    c_sadm = sum(1 for u in usuarios_data if normalizar_rol(u) == "Superadministrador")
    conteo = {"Pasajero": c_pas, "Conductor": c_con, "Administrador": c_adm, "Superadministrador": c_sadm}
    regs = []
    for u in usuarios_data:
        fecha = obtener_fecha_registro(u)
        rol_norm = normalizar_rol(u)
        if fecha:
            regs.append({
                "fecha": fecha, 
                "fecha_registro": fecha, 
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
        res = requests.get(f"{API_URL}/api/adm/reportes", headers = get_headers())
        reportes_data = res.json() if res.status_code == 200 else []
    except:
        reportes_data = []
        
    total = len(reportes_data)
    c_pas = sum(1 for r in reportes_data if r.get("reportado", {}).get("rol") == "Pasajero")
    c_con = sum(1 for r in reportes_data if r.get("reportado", {}).get("rol") == "Conductor")
    c_adm = sum(1 for r in reportes_data if r.get("reportado", {}).get("rol") == "Administrador")
    c_sadm = sum(1 for r in reportes_data if r.get("reportado", {}).get("rol") == "Superadministrador")
    conteo = {"Pasajero": c_pas, "Conductor": c_con, "Administrador": c_adm, "Superadministrador": c_sadm}
    regs = [{"fecha_registro": r.get("fecha_hora_registro", "")[:10], "rol": r.get("reportado", {}).get("rol")} for r in reportes_data if r.get("fecha_hora_registro")]
    return render_template(
        "dashboard_incidencias.html", 
        total_incidencias = total, 
        count_pasajero = c_pas, 
        count_conductor = c_con, 
        count_admin = c_adm, 
        count_superadmin = c_sadm, 
        conteo_roles_json = json.dumps(conteo), 
        registros_json = json.dumps(regs), 
        rol = session.get("role"), 
        active_page = "dashboard_incidencias"
    )

@app.route("/dashboard/viajes")
@requiere_auth(["Superadministrador", "Administrador"])
def dashboard_viajes():
    try:
        res = requests.get(f"{API_URL}/api/via/", headers = get_headers())
        viajes_data = res.json() if res.status_code == 200 else []
    except:
        viajes_data = []
    total = len(viajes_data)
    c_prog = sum(1 for v in viajes_data if v.get("estatus", "").lower() == "programado")
    c_enc = sum(1 for v in viajes_data if v.get("estatus", "").lower() == "en curso")
    c_fin = sum(1 for v in viajes_data if v.get("estatus", "").lower() == "finalizado")
    c_can = sum(1 for v in viajes_data if v.get("estatus", "").lower() == "cancelado")
    conteo = {"Programado": c_prog, "En curso": c_enc, "Finalizado": c_fin, "Cancelado": c_can}
    regs = [{"fecha_registro": v.get("fecha_registro", "")[:10], "estatus": v.get("estatus")} for v in viajes_data if v.get("fecha_registro")]
    return render_template(
        "dashboard_viajes.html", 
        total_viajes = total, 
        count_programado = c_prog, 
        count_en_curso = c_enc, 
        count_finalizado = c_fin, 
        count_cancelado = c_can, 
        conteo_estatus_json = json.dumps(conteo), 
        registros_json = json.dumps(regs), 
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
    try:
        res = requests.get(f"{API_URL}/api/via/", headers = get_headers())
        viajes_data = res.json() if res.status_code == 200 else []
    except:
        viajes_data = []
    return render_template("viajes.html", registros = viajes_data, active_page="viajes")

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
        res = requests.get(f"{API_URL}/api/adm/solicitudes_conductores/pendientes", headers = get_headers())
        if res.status_code == 200:
            return jsonify(res.json())
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
            json = {"accion": accion, "motivo": motivo},
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
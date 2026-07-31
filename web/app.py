from flask import Flask, render_template, request, redirect, url_for, session, flash, Response
import requests
import os
from functools import wraps
from dotenv import load_dotenv

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
                    return redirect(url_for("dashboard"))
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

@app.route("/dashboard")
@requiere_auth(["Superadministrador", "Administrador"])
def dashboard():
    return render_template("dashboard.html")

@app.route("/usuarios")
@requiere_auth(["Superadministrador", "Administrador"])
def usuarios():
    try:
        res = requests.get(f"{API_URL}/api/usu/", headers = get_headers())
        usuarios_data = res.json() if res.status_code == 200 else []
    except:
        usuarios_data = []
    return render_template("usuarios.html", usuarios = usuarios_data, rol = session.get("role"))

@app.route("/usuarios/eliminar/<int:id>", methods = ["POST"])
@requiere_auth(["Superadministrador", "Administrador"])
def eliminar_usuario(id):
    if session.get("role") == "Administrador":
        pass
    else:
        requests.delete(f"{API_URL}/api/usu/{id}", headers = get_headers())
    return redirect(url_for("usuarios"))

@app.route("/reportes")
@requiere_auth(["Superadministrador", "Administrador"])
def reportes():
    try:
        res = requests.get(f"{API_URL}/api/adm/reportes", headers = get_headers())
        reportes_data = res.json() if res.status_code == 200 else []
    except:
        reportes_data = []
    return render_template("reportes.html", reportes = reportes_data, rol = session.get("role"))

@app.route("/viajes")
@requiere_auth(["Superadministrador", "Administrador"])
def viajes():
    try:
        res = requests.get(f"{API_URL}/api/via/", headers = get_headers())
        viajes_data = res.json() if res.status_code == 200 else []
    except:
        viajes_data = []
    return render_template("viajes.html", viajes = viajes_data)

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
    return redirect(url_for("dashboard"))

if __name__ == "__main__":
    app.run(host = "0.0.0.0", port = 5000)
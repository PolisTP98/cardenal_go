from io import BytesIO
from fastapi.responses import StreamingResponse
from docx import Document
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from openpyxl import Workbook
from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import to_shape

def obtenerValorLimpio(obj, campo: str) -> str:
    valor = getattr(obj, campo, None)
    if valor is None:
        return "N/A"
    if isinstance(valor, WKBElement):
        try:
            shape_point = to_shape(valor)
            return f"POINT({shape_point.x} {shape_point.y})"
        except Exception:
            return "Geometría Inválida"
    return str(valor)

def generarReporteWord(lista_datos: list, titulo: str) -> StreamingResponse:
    doc = Document()
    doc.add_heading(titulo, 0)
    if lista_datos:
        columnas = [c.name for c in lista_datos[0].__table__.columns]
        tabla = doc.add_table(rows = 1, cols = len(columnas))
        hdr_cells = tabla.rows[0].cells
        for i, col in enumerate(columnas):
            hdr_cells[i].text = col.replace("_", " ").capitalize()
        for item in lista_datos:
            row_cells = tabla.add_row().cells
            for i, col in enumerate(columnas):
                row_cells[i].text = obtenerValorLimpio(item, col)
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        headers = {"Content-Disposition": f"attachment; filename={titulo}.docx"}
    )

def generarReportePDF(lista_datos: list, titulo: str) -> StreamingResponse:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize = letter)
    pdf.drawString(50, 750, titulo)
    y_position = 720
    if lista_datos:
        columnas = [c.name for c in lista_datos[0].__table__.columns]
        for item in lista_datos:
            if y_position < 50:
                pdf.showPage()
                y_position = 750
            valores = [f"{col}: {obtenerValorLimpio(item, col)}" for col in columnas]
            texto_linea = " | ".join(valores)
            pdf.drawString(50, y_position, texto_linea[:95])
            y_position -= 20
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type = "application/pdf", 
        headers = {"Content-Disposition": f"attachment; filename={titulo}.pdf"}
    )

def generarReporteExcel(lista_datos: list, titulo: str) -> StreamingResponse:
    wb = Workbook()
    ws = wb.active
    ws.title = titulo[:30]
    if lista_datos:
        columnas = [c.name for c in lista_datos[0].__table__.columns]
        ws.append([col.replace("_", " ").capitalize() for col in columnas])
        for item in lista_datos:
            row = [obtenerValorLimpio(item, col) for col in columnas]
            ws.append(row)
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers = {"Content-Disposition": f"attachment; filename={titulo}.xlsx"}
    )
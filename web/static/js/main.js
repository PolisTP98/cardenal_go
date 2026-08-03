document.addEventListener("DOMContentLoaded", function() {
    if (typeof Chart === "undefined") {
        console.error("Chart.js no está cargado.");
        return;
    }

    const container = document.getElementById("dashboard-container");
    if(!container) return;

    const dashType = container.getAttribute("data-type") || "usuarios";

    let conteo = {};
    let registros = [];
    try {
        conteo = JSON.parse(container.getAttribute("data-conteo") || "{}");
        registros = JSON.parse(container.getAttribute("data-registros") || "[]");
    } catch (e) {
        console.error("Error al parsear JSON del dashboard:", e);
    }

    let labelGraficoLineas = "Registros";
    let colorBorde = "#0d6efd";
    let colorFondo = "rgba(13, 110, 253, 0.15)";

    if (dashType === "incidencias") {
        labelGraficoLineas = "Incidencias registradas";
        colorBorde = "#dc3545";
        colorFondo = "rgba(220, 53, 69, 0.15)";
    } else if (dashType === "viajes") {
        labelGraficoLineas = "Viajes registrados";
        colorBorde = "#198754";
        colorFondo = "rgba(25, 135, 84, 0.15)";
    } else {
        labelGraficoLineas = "Usuarios registrados";
    }

    const pieCanvas = document.getElementById("pieChart");
    if (pieCanvas) {
        const pieCtx = pieCanvas.getContext("2d");
        const labels = Object.keys(conteo);
        const dataValues = Object.values(conteo);

        new Chart(pieCtx, {
            type: "pie",
            data: {
                labels: labels, 
                datasets: [{
                    data: dataValues, 
                    backgroundColor: ["#198754", "#0dcaf0", "#ffc107", "#212529", "#0d6efd", "#dc3545"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const lineCanvas = document.getElementById("lineChart");
    if (!lineCanvas) return;

    const lineCtx = lineCanvas.getContext("2d");
    let lineChart = null;

    function actualizarGraficoLineas(filtroSeleccionado) {
        const filtrados = (!filtroSeleccionado || filtroSeleccionado.startsWith("Todos")) 
            ? registros 
            : registros.filter(r => (r.rol || r.categoria || r.estatus) === filtroSeleccionado);
        
        const fechasMap = {};
        filtrados.forEach(r => {
            const rawFecha = r.fecha_hora_registro || r.fecha_registro || r.fecha;
            if(rawFecha) {
                const f = (typeof rawFecha === "string" && rawFecha.includes("T")) 
                    ? rawFecha.split("T")[0] 
                    : String(rawFecha).substring(0, 10);
                
                fechasMap[f] = (fechasMap[f] || 0) + 1;
            }
        });

        const fechasOrdenadas = Object.keys(fechasMap).sort();
        const cantidades = fechasOrdenadas.map(f => fechasMap[f]);

        if(lineChart) {
            lineChart.destroy();
        }

        lineChart = new Chart(lineCtx, {
            type: "line",
            data: {
                labels: fechasOrdenadas,
                datasets: [{
                    label: labelGraficoLineas, 
                    data: cantidades, 
                    borderColor: colorBorde, 
                    backgroundColor: colorFondo, 
                    fill: true, 
                    tension: 0.3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colorBorde
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true, 
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    const filterSelect = document.getElementById("categoriaFilter");
    if(filterSelect) {
        filterSelect.addEventListener("change", function() {
            actualizarGraficoLineas(this.value);
        });
    }

    actualizarGraficoLineas("Todos");
});
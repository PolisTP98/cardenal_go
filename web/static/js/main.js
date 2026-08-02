document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("dashboard-container");
    if(!container) return;

    const conteo = JSON.parse(container.getAttribute("data-conteo") || "{}");
    const registros = JSON.parse(container.getAttribute("data-registros") || "[]");

    const pieCanvas = document.getElementById("pieChart");
    if (pieCanvas) {
        const pieCtx = pieCanvas.getContext("2d");
        new Chart(pieCtx, {
            type: "pie",
            data: {
                labels: Object.keys(conteo), 
                datasets: [{
                    data: Object.values(conteo), 
                    backgroundColor: ["#198754", "#0dcaf0", "#ffc107", "#dc3545", "#212529"]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    const lineCanvas = document.getElementById("lineChart");
    if (!lineCanvas) return;

    const lineCtx = lineCanvas.getContext("2d");
    let lineChart;

    function actualizarGraficoLineas(filtroSeleccionado) {
        const filtrados = filtroSeleccionado === "Todos" 
            ? registros 
            : registros.filter(r => (r.categoria || r.rol || r.estatus) === filtroSeleccionado);
        
        const fechasMap = {};
        filtrados.forEach(r => {
            const f = r.fecha || r.fecha_registro;
            if(f) {
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
                    label: "Registros por fecha", 
                    data: cantidades, 
                    borderColor: "#0d6efd", 
                    backgroundColor: "rgba(13, 110, 253, 0.1)", 
                    fill: true, 
                    tension: 0.3
                }]
            },
            options: {
                responsive: true, 
                scales: {
                    y: {
                        beginAtZero: true, 
                        ticks: {
                            stepSize: 1
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
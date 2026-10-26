import db from "../firebase.js";
export async function calcularEstadisticas() {
    const snapshot = await db
        .collection("gatos")
        .orderBy("fecha", "desc")
        .get();
    const gatos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    const total = gatos.length;
    const edades = gatos
        .map((gato) => Number(gato.edad))
        .filter((edad) => Number.isFinite(edad));
    const pesos = gatos
        .map((gato) => Number(gato.peso))
        .filter((peso) => Number.isFinite(peso));
    const promedio = (valores) =>
        valores.length
            ? Number(
                (
                    valores.reduce((suma, valor) => suma + valor, 0) /
                    valores.length
                ).toFixed(2)
            )
            : 0;
    const porRaza = {};
    const porMes = {};
    gatos.forEach((gato) => {
        const raza = gato.raza || "Sin raza";
        porRaza[raza] = (porRaza[raza] || 0) + 1;
        if (gato.fecha) {
            const fecha = new Date(gato.fecha);
            if (!Number.isNaN(fecha.getTime())) {
                const mes = `${fecha.getFullYear()}-${String(
                    fecha.getMonth() + 1
                ).padStart(2, "0")}`;
                porMes[mes] = (porMes[mes] || 0) + 1;
            }
        }
    });
    return {
        total,
        promedioEdad: promedio(edades),
        promedioPeso: promedio(pesos),
        edadMinima: edades.length ? Math.min(...edades) : null,
        edadMaxima: edades.length ? Math.max(...edades) : null,
        pesoMinimo: pesos.length ? Math.min(...pesos) : null,
        pesoMaximo: pesos.length ? Math.max(...pesos) : null,
        porRaza,
        porMes,
        gatos,
    };
}
export async function obtenerEstadisticas(req, res) {
    try {
        const estadisticas = await calcularEstadisticas();
        const detalleRazas = Object.entries(estadisticas.porRaza).map(
            ([raza, cantidad]) => ({
                raza,
                cantidad,
                porcentaje:
                    estadisticas.total > 0
                        ? Number(
                            ((cantidad / estadisticas.total) * 100).toFixed(2)
                        )
                        : 0,
            })
        );
        const {
            gatos,
            porRaza,
            porMes,
            ...resumen
        } = estadisticas;
        return res.status(200).json({
            mensaje: "Estadísticas generadas correctamente",
            ...resumen,
            detalleRazas,
        });
    } catch (error) {
        console.error("Error al calcular estadísticas:", error.message);
        return res.status(500).json({
            mensaje: "Error al generar las estadísticas",
            error: error.message,
        });
    }
}
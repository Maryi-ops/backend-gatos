import db from "../firebase.js";

export const calcularEstadisticas = async () => {
  const snapshot = await db.collection("gatos").orderBy("fecha", "desc").get();
  const gatos = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const edades = gatos.map((gato) => Number(gato.edad)).filter(Number.isFinite);
  const pesos = gatos.map((gato) => Number(gato.peso)).filter(Number.isFinite);
  const porRaza = {};
  const porMes = {};

  gatos.forEach((gato) => {
    const raza = String(gato.raza || "Sin raza");
    porRaza[raza] = (porRaza[raza] || 0) + 1;

    if (!gato.fecha) return;
    const fecha =
      typeof gato.fecha.toDate === "function"
        ? gato.fecha.toDate()
        : new Date(gato.fecha);

    if (!Number.isNaN(fecha.getTime())) {
      const mes = `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, "0")}`;
      porMes[mes] = (porMes[mes] || 0) + 1;
    }
  });

  const promedio = (valores) =>
    valores.length
      ? Number(
          (
            valores.reduce((total, valor) => total + valor, 0) /
            valores.length
          ).toFixed(2)
        )
      : 0;

  return {
    total: gatos.length,
    promedioEdad: promedio(edades),
    promedioPeso: promedio(pesos),
    edadMin: edades.length ? Math.min(...edades) : null,
    edadMax: edades.length ? Math.max(...edades) : null,
    pesoMin: pesos.length ? Math.min(...pesos) : null,
    pesoMax: pesos.length ? Math.max(...pesos) : null,
    porRaza,
    porMes,
    gatos,
  };
};

export const obtenerEstadisticas = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();
    const { gatos, ...resumen } = stats;

    res.status(200).json({
      mensaje: "Estadísticas generadas correctamente",
      ...resumen,
      detalleRazas: Object.entries(stats.porRaza).map(([raza, cantidad]) => ({
        raza,
        cantidad,
        porcentaje:
          stats.total > 0
            ? Number(((cantidad / stats.total) * 100).toFixed(1))
            : 0,
      })),
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      mensaje: "Error al generar las estadísticas.",
      error: error.message,
    });
  }
};

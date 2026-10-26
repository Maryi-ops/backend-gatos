import PDFDocument from "pdfkit";
import db from "../firebase.js";

const calcularEstadisticas = async () => {
  const snapshot = await db.collection("gatos").get();
  const gatos = snapshot.docs.map((doc) => doc.data());
  const edades = gatos.map((gato) => Number(gato.edad)).filter(Number.isFinite);
  const pesos = gatos.map((gato) => Number(gato.peso)).filter(Number.isFinite);
  const porRaza = {};
  const porMes = {};

  gatos.forEach((gato) => {
    const raza = String(gato.raza || "Sin raza");
    porRaza[raza] = (porRaza[raza] || 0) + 1;

    const fecha =
      typeof gato.fecha?.toDate === "function"
        ? gato.fecha.toDate()
        : new Date(gato.fecha);

    if (!Number.isNaN(fecha.getTime())) {
      const mes = fecha.toISOString().slice(0, 7);
      porMes[mes] = (porMes[mes] || 0) + 1;
    }
  });

  const promedio = (valores) =>
    valores.length
      ? valores.reduce((total, valor) => total + valor, 0) / valores.length
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
  };
};

export const exportarEstadisticasPDF = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      info: {
        Title: "Estadísticas de Gatos",
        Author: "Sistema de Gatos",
      },
    });

    const nombreArchivo = `estadisticas-gatos-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    doc.on("error", (error) => {
      console.error("Error al generar PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({
          mensaje: "Error al generar el archivo PDF.",
          error: error.message,
        });
      } else {
        res.destroy(error);
      }
    });

    doc.pipe(res);

    const colorPrincipal = "#4472C4";
    const colorSecundario = "#5B9BD5";
    const colorTexto = "#333333";

    doc
      .fontSize(22)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Estadísticas de Gatos", { align: "center" });

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica")
      .text(`Generado el: ${new Date().toLocaleString("es-ES")}`, {
        align: "center",
      });

    doc.moveDown(1.5);

    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Resumen General");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    const resumen = [
      ["Total de gatos", stats.total],
      ["Promedio de edad", `${stats.promedioEdad.toFixed(1)} años`],
      ["Promedio de peso", `${stats.promedioPeso.toFixed(1)} kg`],
      ["Edad mínima", stats.edadMin !== null ? `${stats.edadMin} años` : "—"],
      ["Edad máxima", stats.edadMax !== null ? `${stats.edadMax} años` : "—"],
      ["Peso mínimo", stats.pesoMin !== null ? `${stats.pesoMin} kg` : "—"],
      ["Peso máximo", stats.pesoMax !== null ? `${stats.pesoMax} kg` : "—"],
    ];

    resumen.forEach(([label, valor]) => {
      doc
        .fontSize(11)
        .fillColor(colorTexto)
        .font("Helvetica-Bold")
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .text(String(valor));
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Distribución por Raza");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    if (Object.keys(stats.porRaza).length === 0) {
      doc.fontSize(11).fillColor("#666").text("No hay datos de razas.");
    } else {
      const startY = doc.y;
      doc
        .fontSize(10)
        .fillColor("#FFFFFF")
        .rect(50, startY, 495, 22)
        .fill(colorSecundario);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text("Raza", 60, startY + 6)
        .text("Cantidad", 300, startY + 6)
        .text("Porcentaje", 420, startY + 6);

      doc.y = startY + 28;

      const razasOrdenadas = Object.entries(stats.porRaza).sort(
        (a, b) => b[1] - a[1]
      );

      razasOrdenadas.forEach(([raza, cantidad], index) => {
        const porcentaje =
          stats.total > 0 ? ((cantidad / stats.total) * 100).toFixed(1) : "0.0";

        if (index % 2 === 0) {
          doc.rect(50, doc.y - 4, 495, 20).fill("#F2F2F2");
        }

        doc
          .fillColor(colorTexto)
          .font("Helvetica")
          .fontSize(10)
          .text(raza, 60, doc.y)
          .text(String(cantidad), 300, doc.y)
          .text(`${porcentaje}%`, 420, doc.y);

        doc.moveDown(0.7);
      });
    }

    doc.moveDown(1.2);

    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Gatos registrados por mes");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    if (Object.keys(stats.porMes).length === 0) {
      doc.fontSize(11).fillColor("#666").text("No hay datos por mes.");
    } else {
      const mesesOrdenados = Object.entries(stats.porMes).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      mesesOrdenados.forEach(([mes, cantidad]) => {
        doc
          .fontSize(11)
          .fillColor(colorTexto)
          .font("Helvetica-Bold")
          .text(`${mes}: `, { continued: true })
          .font("Helvetica")
          .text(`${cantidad} gato(s)`);
        doc.moveDown(0.3);
      });
    }

    const rangoPaginas = doc.bufferedPageRange();
    for (let i = 0; i < rangoPaginas.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor("#999999")
        .text(
          `Página ${i + 1} de ${rangoPaginas.count} | Sistema de Gatos`,
          50,
          doc.page.height - 40,
          { align: "center", width: 495 }
        );
    }

    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        mensaje: "Error al generar el archivo PDF.",
        error: error.message,
      });
    }
  }
};

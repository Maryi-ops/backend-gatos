import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { calcularEstadisticas } from "./estadisticas.controller.js";

export const exportarEstadisticasExcel = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Gatos";
    workbook.created = new Date();

    const estiloTitulo = {
      font: { bold: true, size: 16, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      },
      alignment: { horizontal: "center", vertical: "middle" },
    };
    const estiloEncabezado = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF5B9BD5" },
      },
      alignment: { horizontal: "center" },
    };
    const agregarEncabezado = (hoja, titulos, color) => {
      hoja.addRow([]);
      hoja.addRow(titulos).eachCell((cell) => {
        cell.style = {
          ...estiloEncabezado,
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: color } },
        };
      });
    };
    const agregarTitulo = (hoja, rango, titulo, color = "FF4472C4") => {
      hoja.mergeCells(rango);
      const celda = rango.split(":")[0];
      hoja.getCell(celda).value = titulo;
      hoja.getCell(celda).style = {
        ...estiloTitulo,
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: color } },
      };
      hoja.getRow(1).height = 28;
    };

    const hojaResumen = workbook.addWorksheet("Resumen");
    agregarTitulo(hojaResumen, "A1:B1", "ESTADÍSTICAS DE GATOS");
    hojaResumen.addRow([]);
    hojaResumen.addRow(["Métrica", "Valor"]).eachCell((cell) => {
      cell.style = estiloEncabezado;
    });
    [
      ["Total de gatos", stats.total],
      ["Promedio de edad (años)", stats.promedioEdad],
      ["Promedio de peso (kg)", stats.promedioPeso],
      ["Edad mínima", stats.edadMin ?? "—"],
      ["Edad máxima", stats.edadMax ?? "—"],
      ["Peso mínimo (kg)", stats.pesoMin ?? "—"],
      ["Peso máximo (kg)", stats.pesoMax ?? "—"],
      ["Fecha de generación", new Date().toLocaleString("es-ES")],
    ].forEach(([label, valor]) => {
      const row = hojaResumen.addRow([label, valor]);
      row.getCell(1).font = { bold: true };
    });
    hojaResumen.getColumn(1).width = 28;
    hojaResumen.getColumn(2).width = 24;

    const hojaRazas = workbook.addWorksheet("Por Raza");
    agregarTitulo(hojaRazas, "A1:C1", "Distribución por Raza", "FF70AD47");
    agregarEncabezado(hojaRazas, ["Raza", "Cantidad", "Porcentaje (%)"], "FF70AD47");
    Object.entries(stats.porRaza)
      .sort((a, b) => b[1] - a[1])
      .forEach(([raza, cantidad]) => {
        const porcentaje =
          stats.total > 0
            ? Number(((cantidad / stats.total) * 100).toFixed(1))
            : 0;
        hojaRazas.addRow([raza, cantidad, porcentaje]);
      });
    hojaRazas.getColumn(1).width = 25;
    hojaRazas.getColumn(2).width = 12;
    hojaRazas.getColumn(3).width = 16;

    const hojaMeses = workbook.addWorksheet("Por Mes");
    agregarTitulo(
      hojaMeses,
      "A1:B1",
      "Gatos registrados por mes",
      "FFED7D31"
    );
    agregarEncabezado(hojaMeses, ["Mes (YYYY-MM)", "Cantidad"], "FFED7D31");
    Object.entries(stats.porMes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([mes, cantidad]) => hojaMeses.addRow([mes, cantidad]));
    hojaMeses.getColumn(1).width = 18;
    hojaMeses.getColumn(2).width = 12;

    const hojaGatos = workbook.addWorksheet("Listado de Gatos");
    agregarTitulo(hojaGatos, "A1:F1", "Listado completo de gatos", "FF7030A0");
    agregarEncabezado(
      hojaGatos,
      ["ID", "Nombre", "Edad", "Peso (kg)", "Raza", "Fecha de registro"],
      "FF7030A0"
    );
    stats.gatos.forEach((gato) => {
      const fecha = gato.fecha
        ? typeof gato.fecha.toDate === "function"
          ? gato.fecha.toDate()
          : new Date(gato.fecha)
        : null;
      hojaGatos.addRow([
        gato.id,
        gato.nombre,
        gato.edad,
        gato.peso,
        gato.raza,
        fecha && !Number.isNaN(fecha.getTime())
          ? fecha.toLocaleString("es-ES")
          : "—",
      ]);
    });
    [28, 18, 10, 12, 18, 22].forEach((ancho, indice) => {
      hojaGatos.getColumn(indice + 1).width = ancho;
    });

    const nombreArchivo = `estadisticas-gatos-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al generar Excel:", error);
    if (!res.headersSent) {
      res.status(500).json({
        mensaje: "Error al generar el archivo Excel.",
        error: error.message,
      });
    } else {
      res.destroy(error);
    }
  }
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

import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { calcularEstadisticas } from "./estadisticas.controller.js";

const obtenerFecha = (fecha) => {
  if (!fecha) return null;
  const valor = typeof fecha.toDate === "function" ? fecha.toDate() : new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor;
};

const escaparCSV = (valor) => {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export const exportarGatosLista = async (req, res) => {
  try {
    const { gatos } = await calcularEstadisticas();
    if (gatos.length === 0) {
      return res
        .status(200)
        .type("text/plain")
        .send("No hay gatos registrados.");
    }

    const lineas = gatos.map((gato, indice) => {
      const fecha = obtenerFecha(gato.fecha)?.toLocaleString("es-ES") || "—";
      return [
        `${indice + 1}. ${gato.nombre || "Sin nombre"}`,
        `   ID: ${gato.id}`,
        `   Edad: ${gato.edad ?? "—"} años`,
        `   Peso: ${gato.peso ?? "—"} kg`,
        `   Raza: ${gato.raza || "—"}`,
        `   Fecha: ${fecha}`,
        `   Imagen: ${gato.imagenUrl || "—"}`,
        "",
      ].join("\n");
    });
    const contenido = [
      `LISTADO DE GATOS (${gatos.length})`,
      `Generado: ${new Date().toLocaleString("es-ES")}`,
      "─".repeat(40),
      "",
      ...lineas,
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="gatos-lista.txt"'
    );
    return res.send(contenido);
  } catch (error) {
    console.error("Error al exportar lista:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        mensaje: "Error al generar el listado de gatos.",
        error: error.message,
      });
    }
    res.destroy(error);
  }
};

export const exportarGatosJSON = async (req, res) => {
  try {
    const { gatos } = await calcularEstadisticas();
    const jsonFormateado = JSON.stringify(
      gatos.map((gato) => ({
        ...gato,
        fecha: obtenerFecha(gato.fecha)?.toISOString() ?? null,
      })),
      null,
      2
    );

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="gatos.json"');
    return res.send(jsonFormateado);
  } catch (error) {
    console.error("Error al exportar JSON:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        mensaje: "Error al generar el JSON de gatos.",
        error: error.message,
      });
    }
    res.destroy(error);
  }
};

export const exportarGatosSQL = async (req, res) => {
  try {
    const { gatos } = await calcularEstadisticas();
    const escaparSQL = (valor) => {
      if (valor === null || valor === undefined) return "NULL";
      if (typeof valor === "number" && Number.isFinite(valor)) return valor;
      if (typeof valor === "boolean") return valor ? 1 : 0;
      return `'${String(valor).replace(/'/g, "''")}'`;
    };

    let sql = `-- Script de inserción de gatos\n`;
    sql += `-- Generado: ${new Date().toLocaleString("es-ES")}\n`;
    sql += `-- Total registros: ${gatos.length}\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS gatos (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  nombre VARCHAR(100) NOT NULL,\n`;
    sql += `  edad INT,\n`;
    sql += `  peso DECIMAL(5,2),\n`;
    sql += `  raza VARCHAR(80),\n`;
    sql += `  imagen_url TEXT,\n`;
    sql += `  fecha DATETIME\n`;
    sql += `);\n\n`;

    if (gatos.length === 0) {
      sql += `-- No hay registros para insertar\n`;
    } else {
      gatos.forEach((gato) => {
        const fecha = obtenerFecha(gato.fecha)
          ?.toISOString()
          .slice(0, 19)
          .replace("T", " ");
        sql += `INSERT INTO gatos (id, nombre, edad, peso, raza, imagen_url, fecha) VALUES (\n`;
        sql += `  ${escaparSQL(gato.id)},\n`;
        sql += `  ${escaparSQL(gato.nombre)},\n`;
        sql += `  ${escaparSQL(gato.edad)},\n`;
        sql += `  ${escaparSQL(gato.peso)},\n`;
        sql += `  ${escaparSQL(gato.raza)},\n`;
        sql += `  ${escaparSQL(gato.imagenUrl)},\n`;
        sql += `  ${escaparSQL(fecha ?? null)}\n`;
        sql += `);\n\n`;
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="gatos-insert.sql"');
    return res.send(sql);
  } catch (error) {
    console.error("Error al exportar SQL:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        mensaje: "Error al generar el script SQL.",
        error: error.message,
      });
    }
    res.destroy(error);
  }
};

export const exportarEstadisticasCSV = async (req, res) => {
  try {
    const { gatos } = await calcularEstadisticas();
    const lineas = [
      [
        "ID",
        "Nombre",
        "Edad",
        "Peso (kg)",
        "Raza",
        "URL Imagen",
        "Fecha de registro",
      ],
      ...gatos.map((gato) => [
        gato.id,
        gato.nombre,
        gato.edad,
        gato.peso,
        gato.raza,
        gato.imagenUrl,
        obtenerFecha(gato.fecha)?.toLocaleString("es-ES") || "",
      ]),
    ];
    const contenido = lineas
      .map((linea) => linea.map(escaparCSV).join(","))
      .join("\r\n");
    const nombreArchivo = `estadisticas-gatos-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );
    res.send(`\uFEFF${contenido}`);
  } catch (error) {
    console.error("Error al generar CSV:", error);
    if (!res.headersSent) {
      res.status(500).json({
        mensaje: "Error al generar el archivo CSV.",
        error: error.message,
      });
    } else {
      res.destroy(error);
    }
  }
};

export const exportarEstadisticasExcel = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Gatos";
    workbook.created = new Date();

    const agregarTitulo = (hoja, rango, titulo, color = "FF4472C4") => {
      hoja.mergeCells(rango);
      const celda = rango.split(":")[0];
      hoja.getCell(celda).value = titulo;
      hoja.getCell(celda).style = {
        font: { bold: true, size: 16, color: { argb: "FFFFFFFF" } },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        },
        alignment: { horizontal: "center", vertical: "middle" },
      };
      hoja.getRow(1).height = 28;
    };
    const agregarEncabezado = (hoja, valores, color = "FF5B9BD5") => {
      hoja.addRow([]);
      hoja.addRow(valores).eachCell((celda) => {
        celda.style = {
          font: { bold: true, color: { argb: "FFFFFFFF" } },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
          },
          alignment: { horizontal: "center" },
        };
      });
    };

    const hojaResumen = workbook.addWorksheet("Resumen");
    agregarTitulo(hojaResumen, "A1:B1", "ESTADÍSTICAS DE GATOS");
    hojaResumen.addRow([]);
    hojaResumen.addRow(["Métrica", "Valor"]);
    [
      ["Total de gatos", stats.total],
      ["Promedio de edad (años)", stats.promedioEdad],
      ["Promedio de peso (kg)", stats.promedioPeso],
      ["Edad mínima", stats.edadMinima ?? "—"],
      ["Edad máxima", stats.edadMaxima ?? "—"],
      ["Peso mínimo (kg)", stats.pesoMinimo ?? "—"],
      ["Peso máximo (kg)", stats.pesoMaximo ?? "—"],
      ["Fecha de generación", new Date().toLocaleString("es-ES")],
    ].forEach(([metrica, valor]) => {
      const fila = hojaResumen.addRow([metrica, valor]);
      fila.getCell(1).font = { bold: true };
    });
    hojaResumen.getColumn(1).width = 30;
    hojaResumen.getColumn(2).width = 24;
    hojaResumen.getRow(3).eachCell((celda) => {
      celda.style = {
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF5B9BD5" },
        },
      };
    });

    const hojaRazas = workbook.addWorksheet("Por Raza");
    agregarTitulo(hojaRazas, "A1:C1", "Distribución por Raza", "FF70AD47");
    agregarEncabezado(
      hojaRazas,
      ["Raza", "Cantidad", "Porcentaje (%)"],
      "FF70AD47"
    );
    Object.entries(stats.porRaza)
      .sort((a, b) => b[1] - a[1])
      .forEach(([raza, cantidad]) => {
        const porcentaje =
          stats.total > 0
            ? Number(((cantidad / stats.total) * 100).toFixed(2))
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
    agregarTitulo(
      hojaGatos,
      "A1:G1",
      "Listado completo de gatos",
      "FF7030A0"
    );
    agregarEncabezado(
      hojaGatos,
      [
        "ID",
        "Nombre",
        "Edad",
        "Peso (kg)",
        "Raza",
        "URL Imagen",
        "Fecha de registro",
      ],
      "FF7030A0"
    );
    stats.gatos.forEach((gato) => {
      hojaGatos.addRow([
        gato.id,
        gato.nombre,
        gato.edad,
        gato.peso,
        gato.raza,
        gato.imagenUrl,
        obtenerFecha(gato.fecha)?.toLocaleString("es-ES") || "—",
      ]);
    });
    [28, 18, 10, 12, 18, 40, 22].forEach(
      (ancho, indice) => (hojaGatos.getColumn(indice + 1).width = ancho)
    );

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

    const agregarSeccion = (titulo) => {
      doc
        .fontSize(14)
        .fillColor(colorPrincipal)
        .font("Helvetica-Bold")
        .text(titulo);
      doc
        .moveTo(50, doc.y + 5)
        .lineTo(545, doc.y + 5)
        .strokeColor(colorPrincipal)
        .lineWidth(1.5)
        .stroke();
      doc.moveDown(0.8);
    };

    agregarSeccion("Resumen General");
    [
      ["Total de gatos", stats.total],
      ["Promedio de edad", `${stats.promedioEdad} años`],
      ["Promedio de peso", `${stats.promedioPeso} kg`],
      [
        "Edad mínima",
        stats.edadMinima !== null ? `${stats.edadMinima} años` : "—",
      ],
      [
        "Edad máxima",
        stats.edadMaxima !== null ? `${stats.edadMaxima} años` : "—",
      ],
      [
        "Peso mínimo",
        stats.pesoMinimo !== null ? `${stats.pesoMinimo} kg` : "—",
      ],
      [
        "Peso máximo",
        stats.pesoMaximo !== null ? `${stats.pesoMaximo} kg` : "—",
      ],
    ].forEach(([etiqueta, valor]) => {
      doc
        .fontSize(11)
        .fillColor("#333333")
        .font("Helvetica-Bold")
        .text(`${etiqueta}: `, { continued: true })
        .font("Helvetica")
        .text(String(valor));
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
    agregarSeccion("Distribución por Raza");
    const razas = Object.entries(stats.porRaza).sort((a, b) => b[1] - a[1]);
    if (razas.length === 0) {
      doc.fontSize(11).fillColor("#666666").text("No hay datos de razas.");
    } else {
      razas.forEach(([raza, cantidad]) => {
        const porcentaje =
          stats.total > 0
            ? ((cantidad / stats.total) * 100).toFixed(1)
            : "0.0";
        doc
          .fontSize(10)
          .fillColor("#333333")
          .font("Helvetica")
          .text(`${raza}: ${cantidad} (${porcentaje}%)`);
      });
    }

    doc.moveDown(1);
    agregarSeccion("Gatos registrados por mes");
    const meses = Object.entries(stats.porMes).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    if (meses.length === 0) {
      doc.fontSize(11).fillColor("#666666").text("No hay datos por mes.");
    } else {
      meses.forEach(([mes, cantidad]) => {
        doc
          .fontSize(11)
          .fillColor("#333333")
          .font("Helvetica")
          .text(`${mes}: ${cantidad} gato(s)`);
      });
    }

    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor("#999999")
        .text(`Página ${i + 1} de ${paginas.count} | Sistema de Gatos`, 50, doc.page.height - 40, {
          align: "center",
          width: 495,
        });
    }
    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        mensaje: "Error al generar el archivo PDF.",
        error: error.message,
      });
    } else {
      res.destroy(error);
    }
  }
};

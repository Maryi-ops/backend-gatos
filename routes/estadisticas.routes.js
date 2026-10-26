import express from "express";
import {
  exportarEstadisticasExcel,
  exportarEstadisticasPDF,
  exportarEstadisticasCSV,
} from "../controllers/exportacion.controller.js";
import { obtenerEstadisticas } from "../controllers/estadisticas.controller.js";
import { capturarInfoSolicitud } from "../middlewares/auditoria.js";

const router = express.Router();

router.use(capturarInfoSolicitud);

router.get("/estadisticas", obtenerEstadisticas);
router.get("/estadisticas/excel", exportarEstadisticasExcel);
router.get("/estadisticas/pdf", exportarEstadisticasPDF);
router.get("/estadisticas/csv", exportarEstadisticasCSV);
export default router;

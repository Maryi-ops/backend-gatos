import express from "express";
import { exportarEstadisticasPDF } from "../controllers/exportacion.controller.js";

const router = express.Router();

router.get("/estadisticas/pdf", exportarEstadisticasPDF);

export default router;

import express from "express";
import multer from "multer";
import { capturarInfoSolicitud } from "../middlewares/auditoria.js";
import {
  registrarGato,
  obtenerGatos,
  actualizarGato,
  eliminarGato,
  buscarGatos,
  enviarGatosPorEmail,
} from "../controllers/gato.controller.js";

const router = express.Router();

router.use(capturarInfoSolicitud);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/gato",
  upload.single("imagen"),
  registrarGato
);

router.put(
  "/gato/:id",
  upload.single("imagen"),
  actualizarGato
);

router.delete("/gato/:id", eliminarGato);

router.get("/gatos/enviar-email", enviarGatosPorEmail);

router.get("/gatos", obtenerGatos);

router.get("/gatos/buscar", buscarGatos);

export default router;

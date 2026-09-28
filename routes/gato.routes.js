import express from "express";
import multer from "multer";
import {
  registrarGato,
  obtenerGatos,
  actualizarGato,
<<<<<<< HEAD
=======
  eliminarGato,
>>>>>>> b90c587f45390c0682b58c02114ecfddb60d4867
} from "../controllers/gato.controller.js";

const router = express.Router();

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

router.get("/gatos", obtenerGatos);

router.put(
  "/gato/:id",
  upload.single("imagen"),
  actualizarGato
);

export default router;

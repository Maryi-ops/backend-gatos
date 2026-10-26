import express from "express";
import cors from "cors";  //Para que el frontend pueda llamar
import rateLimit from "express-rate-limit";
import db from "./firebase.js";
import gatoRoutes from "./routes/gato.routes.js";
import climaRoutes from "./routes/clima.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";

const app = express();

// Middlewares
app.use(cors());  //Permite peticiones desde cualquier origen
app.use(express.json());

const limiterGatos = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensaje: "Demasiadas peticiones desde esta IP. Intenta de nuevo más tarde.",
  },
  handler: async (req, res, next, options) => {
    try {
      await db.collection("auditoria_gatos").add({
        accion: "rate_limit_bloqueado",
        fecha: new Date().toISOString(),
        ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
        userAgent: req.headers["user-agent"],
        ruta: req.originalUrl,
        metodo: req.method,
      });
    } catch (error) {
      console.error("Error al guardar bloqueo por límite de peticiones:", error);
    }

    res.status(options.statusCode).json(options.message);
  },
});

app.use("/gato", limiterGatos);
app.use("/gatos", limiterGatos);

// Rutas
app.use(gatoRoutes);
app.use(climaRoutes);
app.use(estadisticasRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no registrada." });
});

export default app;

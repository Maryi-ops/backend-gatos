export const capturarInfoSolicitud = (req, res, next) => {
  req.auditoria = {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    metodo: req.method,
    ruta: req.originalUrl,
  };

  next();
};

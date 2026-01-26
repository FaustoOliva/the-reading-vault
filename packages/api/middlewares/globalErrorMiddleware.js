import { AppError } from "../errors/index.js";

export function globalErrorMiddleware(err, req, res, _next) {
  // Log estructurado del error
  console.error("Error:", {
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });

  // Si es AppError (error operacional esperado)
  if (err instanceof AppError) {
    const response = {
      error: err.message,
      status: err.statusCode,
    };
    if (err.details) {
      response.details = err.details;
    }
    if (err.resource) {
      response.resource = err.resource;
    }
    if (process.env.NODE_ENV === "development") {
      response.stack = err.stack;
    }
    return res.status(err.statusCode).json(response);
  }

  // Error de validación de Zod
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Datos de validación incorrectos",
      details: err.issues,
    });
  }

  // Errores de Mongoose
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Error de validación",
      details: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "ID inválido",
      details: err.message,
    });
  }

  if (err.code === 11000) {
    // Duplicate key error
    return res.status(409).json({
      error: "Recurso duplicado",
      details: "Ya existe un registro con esos datos",
    });
  }

  // Error no manejado (500)
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
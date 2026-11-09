/**
 * Clase base para errores personalizados de la aplicación.
 */
export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud incorrecta o parámetros inválidos', details?: any) {
    super(message, 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto: el recurso o SKU ya existe') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Error de validación en los datos provistos', details?: any) {
    super(message, 422, details);
  }
}

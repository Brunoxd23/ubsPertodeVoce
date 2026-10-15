export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Erro de validação dos dados de entrada', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitExceededError extends AppError {
  constructor(message = 'Limite de requisições excedido. Tente novamente mais tarde.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

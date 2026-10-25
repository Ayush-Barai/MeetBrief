export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.status = options.status ?? 400;
    this.code = options.code ?? "BAD_REQUEST";
    this.details = options.details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, { status: 404, code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You do not have access to this meeting.") {
    super(message, { status: 401, code: "UNAUTHORIZED" });
    this.name = "UnauthorizedError";
  }
}

export class IntegrationError extends AppError {
  constructor(
    message: string,
    options: { code?: string; status?: number; details?: unknown } = {},
  ) {
    super(message, {
      status: options.status ?? 502,
      code: options.code ?? "INTEGRATION_ERROR",
      details: options.details,
    });
    this.name = "IntegrationError";
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    const message = error.message || "Unexpected error";
    // Avoid leaking connection strings or stack details to clients.
    return message.length > 300 ? `${message.slice(0, 297)}…` : message;
  }
  return "Unexpected error";
}

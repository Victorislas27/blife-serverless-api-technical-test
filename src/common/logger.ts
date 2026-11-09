/**
 * Metadatos de contexto opcionales para asociar a los registros de log.
 */
export interface LogContext {
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Registrador estructurado compatible con AWS CloudWatch Logs Insights y desarrollo local.
 * En producción (NODE_ENV=production / staging), formatea como JSON en una sola línea.
 * En desarrollo/test, formatea de forma legible para la terminal.
 */
class Logger {
  private formatLog(
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    message: string,
    context?: LogContext,
    error?: unknown
  ): string {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    const timestamp = new Date().toISOString();

    if (isProduction) {
      const payload: Record<string, unknown> = {
        timestamp,
        level,
        message,
        ...context,
      };

      if (error instanceof Error) {
        payload.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error) {
        payload.error = error;
      }

      return JSON.stringify(payload);
    }

    const reqPrefix = context?.requestId ? `[${context.requestId}] ` : '';
    const routePrefix = context?.method && context?.path ? `${context.method} ${context.path} ` : '';
    const errorDetails = error instanceof Error ? `\n  ${error.stack || error.message}` : '';

    return `[${timestamp}] [${level}] ${reqPrefix}${routePrefix}${message}${errorDetails}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog('INFO', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog('WARN', message, context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    console.error(this.formatLog('ERROR', message, context, error));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.DEBUG === 'true' || process.env.DEBUG_SQL === 'true') {
      console.log(this.formatLog('DEBUG', message, context));
    }
  }
}

export const logger = new Logger();


/**
 * Logger utility for consistent logging across the application
 * Replaces console.log statements with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logQueue: LogEntry[] = [];
  private isProduction = process.env.NODE_ENV === 'production';
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  private currentLogLevel: number = this.isDevelopment ? 0 : 1;

  private constructor() {
    // Set up periodic flush to external service in production
    if (this.isProduction && typeof window !== 'undefined') {
      setInterval(() => this.flushLogs(), 30000); // Flush every 30 seconds
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = this.logLevels[level];
  }

  /**
   * Debug level logging - detailed information for debugging
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Info level logging - general information
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Warning level logging - potentially harmful situations
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Error level logging - error events
   */
  error(message: string, context?: Record<string, any> | Error): void {
    let logContext = context as Record<string, any>;
    let stack: string | undefined;

    if (context instanceof Error) {
      stack = context.stack;
      logContext = {
        errorMessage: context.message,
        errorName: context.name,
      };
    }

    this.log('error', message, logContext, stack);
  }

  /**
   * Main logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    stack?: string
  ): void {
    // Check if should log based on level
    if (this.logLevels[level] < this.currentLogLevel) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message: this.sanitizeMessage(message),
      timestamp: new Date().toISOString(),
      context: context ? this.sanitizeContext(context) : undefined,
      stack,
    };

    // In development, log to console
    if (this.isDevelopment) {
      this.logToConsole(logEntry);
    }

    // In production, queue for external service
    if (this.isProduction) {
      this.queueLog(logEntry);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    const style = this.getConsoleStyle(entry.level);

    console.log(
      `%c${prefix}%c ${entry.message}`,
      style,
      'color: inherit',
      entry.context || ''
    );

    if (entry.stack) {
      console.log(entry.stack);
    }
  }

  /**
   * Get console styling based on log level
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #6c757d',
      info: 'color: #0dcaf0',
      warn: 'color: #ffc107; font-weight: bold',
      error: 'color: #dc3545; font-weight: bold',
    };
    return styles[level];
  }

  /**
   * Queue log for external service
   */
  private queueLog(entry: LogEntry): void {
    this.logQueue.push(entry);

    // Flush immediately for errors
    if (entry.level === 'error') {
      this.flushLogs();
    }

    // Prevent queue from growing too large
    if (this.logQueue.length > 100) {
      this.flushLogs();
    }
  }

  /**
   * Send logs to external service
   */
  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      // TODO: Replace with actual logging service endpoint
      if (this.isProduction && typeof window !== 'undefined') {
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ logs: logsToSend }),
        // });
      }
    } catch (error) {
      // Re-queue logs if sending failed
      this.logQueue = [...logsToSend, ...this.logQueue];
      console.error('Failed to send logs:', error);
    }
  }

  /**
   * Sanitize message to remove sensitive data
   */
  private sanitizeMessage(message: string): string {
    // Remove potential sensitive patterns
    return message
      .replace(/password["\s]*[:=]["\s]*["']?[^"',\s]+/gi, 'password=***')
      .replace(/token["\s]*[:=]["\s]*["']?[^"',\s]+/gi, 'token=***')
      .replace(/api[_-]?key["\s]*[:=]["\s]*["']?[^"',\s]+/gi, 'api_key=***')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***');
  }

  /**
   * Sanitize context object
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '***';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeMessage(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create a child logger with preset context
   */
  createLogger(defaultContext: Record<string, any>): LoggerWithContext {
    return new LoggerWithContext(this, defaultContext);
  }
}

/**
 * Logger with preset context
 */
class LoggerWithContext {
  constructor(
    private logger: Logger,
    private defaultContext: Record<string, any>
  ) {}

  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, { ...this.defaultContext, ...context });
  }

  error(message: string, context?: Record<string, any> | Error): void {
    if (context instanceof Error) {
      this.logger.error(message, context);
    } else {
      this.logger.error(message, { ...this.defaultContext, ...context });
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export for creating component-specific loggers
export function createLogger(component: string): LoggerWithContext {
  return logger.createLogger({ component });
}

export default logger;

/**
 * Logger utility for conditional logging based on environment
 * In production, only error logs are shown by default
 */

import { isDevMode } from '@/shared/utils/viteEnv'

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info', 
  WARN: 'warn',
  ERROR: 'error',
  NONE: 'none'
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

class Logger {
  private level: LogLevel;
  private readonly isDevelopment: boolean;

  constructor() {
    this.isDevelopment = isDevMode();
    this.level = this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(minLevel: LogLevel): boolean {
    const levels = Object.values(LOG_LEVELS);
    const currentIndex = levels.indexOf(this.level);
    const minIndex = levels.indexOf(minLevel);
    return currentIndex <= minIndex;
  }

  debug(...args: any[]) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error('[ERROR]', ...args);
    }
  }

  // Performance logging
  time(label: string) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.timeEnd(label);
    }
  }
}

// Global logger instance
export const logger = new Logger();

// Helper functions for common logging patterns
export const logApiCall = (method: string, url: string, duration: number, size?: number) => {
  logger.debug(`📡 ${method} ${url} (${duration}ms, ${size ? `${(size/1024).toFixed(2)}KB` : 'unknown size'})`);
};

export const logCacheHit = (method: string, url: string, duration: number) => {
  logger.debug(`🚀 [CACHE] ${method} ${url} (${duration}ms)`);
};

export const logError = (context: string, error: any) => {
  logger.error(`❌ ${context}:`, error?.message || error);
};

export const logWarning = (context: string, message: string) => {
  logger.warn(`⚠️ ${context}: ${message}`);
};

export const logInfo = (context: string, message: string) => {
  logger.info(`ℹ️ ${context}: ${message}`);
};

export default logger;

import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  message: string;
  data?: any;
}

class Logger {
  private logDir: string;
  private logFile: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);

    this.ensureLogDir();
    this.setupLogRotation();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0]!;
  }

  private setupLogRotation(): void {
    // Clean up old log files
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort()
        .reverse();

      if (logFiles.length > this.maxLogFiles) {
        const filesToDelete = logFiles.slice(this.maxLogFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(path.join(this.logDir, file));
        });
      }
    } catch (error) {
      console.warn('Failed to clean up old log files:', error);
    }
  }

  private rotateLogFile(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = this.logFile.replace('.log', `-${timestamp}.log`);
          fs.renameSync(this.logFile, rotatedFile);
        }
      }
    } catch (error) {
      console.warn('Failed to rotate log file:', error);
    }
  }

  private writeLog(entry: LogEntry): void {
    this.rotateLogFile();

    const logLine = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private createLogEntry(level: LogEntry['level'], message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
  }

  info(message: string, data?: any): void {
    const entry = this.createLogEntry('INFO', message, data);
    console.log(`[INFO] ${message}`, data || '');
    this.writeLog(entry);
  }

  error(message: string, data?: any): void {
    const entry = this.createLogEntry('ERROR', message, data);
    console.error(`[ERROR] ${message}`, data || '');
    this.writeLog(entry);
  }

  warn(message: string, data?: any): void {
    const entry = this.createLogEntry('WARN', message, data);
    console.warn(`[WARN] ${message}`, data || '');
    this.writeLog(entry);
  }

  debug(message: string, data?: any): void {
    if (process.env['NODE_ENV'] === 'development') {
      const entry = this.createLogEntry('DEBUG', message, data);
      console.debug(`[DEBUG] ${message}`, data || '');
      this.writeLog(entry);
    }
  }

  // Login specific logging methods
  logLoginAttempt(username: string, password?: string, site?: string, sessionId?: string): void {
    this.info('Login attempt initiated', {
      username,
      password,
      site,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  logLoginSuccess(username: string, site: string, sessionId: string, apiResponses: any[], executionTime: number): void {
    this.info('Login successful', {
      username,
      site,
      sessionId,
      apiResponseCount: apiResponses.length,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }

  logLoginFailure(username: string, site: string, error: string, executionTime: number): void {
    this.error('Login failed', {
      username,
      site,
      error,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }

  logBrowserSession(sessionId: string, proxy?: string): void {
    this.info('Browser session created', {
      sessionId,
      proxy,
      timestamp: new Date().toISOString()
    });
  }

  logApiCapture(url: string, method: string, status: number, responseSize?: number): void {
    this.info('API response captured', {
      url,
      method,
      status,
      responseSize,
      timestamp: new Date().toISOString()
    });
  }

  getLogFilePath(): string {
    return this.logFile;
  }

  // Read recent logs for debugging
  getRecentLogs(lines: number = 50): LogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n').filter(line => line);
      const recentLines = logLines.slice(-lines);

      return recentLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);
    } catch (error) {
      this.error('Failed to read recent logs', error);
      return [];
    }
  }
}

// Singleton instance
export const logger = new Logger();
export default logger;
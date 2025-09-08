/*
 * Filename: e:\NODE\wanotif\src\libs\winston.lib.ts
 * Path: e:\NODE\wanotif
 * Created Date: Monday, September 8th 2025, 10:58:42 am
 * Author: Rede
 * 
 * Copyright (c) 2022 10RI Dev
 */

import winston from 'winston'
import Transport from 'winston-transport'
import DailyRotateFile from 'winston-daily-rotate-file'
import { config } from 'dotenv'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { getRequestId } from '../helpers/requestContext.helper'

config()

// Extend Winston's TransformableInfo type
interface LogInfo extends winston.Logform.TransformableInfo {
  requestId?: string;
  request?: {
    method?: string;
    path?: string;
    body?: any;
    url?: {
      path?: string;
    };
    client?: {
      ip?: string;
      port?: number;
    };
  };
  response?: {
    statusCode?: number;
    message?: string;
    body?: any;
  };
  [key: string]: any;
}

export interface LogResponse {
  statusCode?: number;
  code?: number;
  message?: string;
  body?: any;
  data?: any;
  meta?: any;
}

interface LogRequest {
  method?: string;
  path?: string;
  body?: any;
  originalUrl?: string;
  header?: (name: string) => string | undefined;
  socket?: {
    remoteAddress?: string;
    remotePort?: number;
  };
  get?: (name: string) => string | undefined;
}

class LogstashTransport extends Transport {
  private logstashUrl: string;
  private prodId: string;
  private retryCount: number = 5; // Increase retry attempts
  private retryDelay: number = 2000; // Increase initial delay

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts) // super adalah untuk menginisialisasi Transport base class yang diperlukan oleh winston
    this.logstashUrl = process.env.LOGSTASH_URL || '';
    this.prodId = process.env.LOGSTASH_PROD_ID || 'unknown';
    this.retryCount = parseInt(process.env.LOGSTASH_RETRY_COUNT || '5', 10);
    this.retryDelay = parseInt(process.env.LOGSTASH_RETRY_DELAY || '2000', 10);
    
    if (!this.logstashUrl) {
      console.warn('LOGSTASH_URL is not configured, Logstash transport will be disabled');
    }
  }

  private async sendToLogstash(info: LogInfo, attempt: number = 1): Promise<void> {
    if (!this.logstashUrl) {
      return;
    }

    const { level, message, requestId, request, response, timestamp, ...otherMeta } = info;
    
    // Use requestId from info or from context
    const finalRequestId = requestId || getRequestId();
    
    const logData = {
      '@timestamp': new Date().toISOString(),
      level: level,
      message: message,
      requestId: finalRequestId,
      prod_id: this.prodId,
      environment: process.env.NODE_ENV || 'development',
      service: 'inforanmor2',
      hostname: require('os').hostname(),
      ...otherMeta,
      // Sanitize nested objects
      request: request ? this.sanitizeObject(request) : undefined,
      response: response ? this.sanitizeObject(response) : undefined,
    }

    try {
      const axiosResponse = await axios.post(this.logstashUrl, logData, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'inforanmor2-logger'
        },
        timeout: parseInt(process.env.LOGSTASH_TIMEOUT || '10000', 10),
      })
      
      if (axiosResponse.status !== 200) {
        throw new Error(`Logstash responded with status: ${axiosResponse.status}`);
      }
    } catch (error) {
      if (attempt < this.retryCount) {
        console.warn(`Failed to send logs to Logstash (attempt ${attempt}/${this.retryCount}), retrying...`);
        setTimeout(() => {
          this.sendToLogstash(info, attempt + 1);
        }, this.retryDelay * attempt);
      } else {
        console.error('Failed to send logs to Logstash after all retries:', error instanceof Error ? error.message : error);
      }
    }
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj.toISOString();
    
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }));
  }

  log(info: LogInfo, callback: () => void) {
    setImmediate(() => {
      this.sendToLogstash(info);
    });
    callback();
  }
}

// Format timestamp
const timestampFormat = winston.format((info: LogInfo) => {
  info.timestamp = new Date().toISOString();
  return info;
});

// Reorder fields and clean up format
const reorderFormat = winston.format((info: LogInfo) => {
  const { timestamp, level, message, requestId, ...rest } = info;
  const { response, request, ...otherRest } = rest;
  
  // Use requestId from info or from context
  const finalRequestId = requestId || getRequestId();
  
  const cleanResponse = response ? {
    statusCode: response.statusCode,
    body: response.body,
    message: response.message
  } : undefined;

  return {
    requestId: finalRequestId,
    timestamp,
    level,
    message,
    ...otherRest,
    request: request ? {
      method: request.method,
      path: request.url?.path,
      body: request.body,
      client: request.client
    } : undefined,
    response: cleanResponse
  };
});

// Get file transport configuration
const getFileTransport = (isError: boolean = false) => {
  return new DailyRotateFile({
    datePattern: 'YYYY-MM-DD',
    dirname: process.env.LOG_DIRECTORY || 'logs',
    level: isError ? 'error' : 'silly',
    filename: isError ? 'error-%DATE%.log' : '%DATE%.log',
    maxSize: '1m',
    handleExceptions: isError && process.env.LOG_EXCEPTIONS === 'true',
    handleRejections: isError && process.env.LOG_REJECTIONS === 'true',
  })
}

// Flag to track if Logstash message has been logged
let logstashMessageLogged = false;

const getTransports = (isError: boolean = false): Transport[] => {
  const transports: Transport[] = [getFileTransport(isError)]

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    transports.push(new winston.transports.Console({
      level: isError ? 'error' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${requestId ? `[${requestId}] ` : ''}${message}${metaStr}`;
        })
      )
    }))
  }

  // Add Logstash transport if enabled
  if (process.env.LOGSTASH_ENABLED === 'TRUE' || process.env.LOGSTASH_ENABLED === 'true') {
    if (!process.env.LOGSTASH_URL) {
      console.warn('LOGSTASH_ENABLED is true but LOGSTASH_URL is not configured');
    } else {
      transports.push(new LogstashTransport({ 
        level: isError ? 'error' : 'info',
      }))
      // Only log the message once
      if (!logstashMessageLogged) {
        console.log('Logstash transport enabled, logs will be sent to:', process.env.LOGSTASH_URL);
        logstashMessageLogged = true;
      }
    }
  }

  return transports
}

const errorLogger = winston.createLogger({
  format: winston.format.combine(
    timestampFormat(),
    reorderFormat(),
    winston.format.json()
  ),
  transports: getTransports(true),
})

const infoLogger = winston.createLogger({
  format: winston.format.combine(
    timestampFormat(),
    reorderFormat(),
    winston.format.json()
  ),
  transports: getTransports(false),
})

export const logger = {
  error: (message: string, meta?: any) => {
    const requestId = getRequestId();
    errorLogger.error({ message, requestId, ...meta });
  },
  warn: (message: string, meta?: any) => {
    const requestId = getRequestId();
    infoLogger.warn({ message, requestId, ...meta });
  },
  info: (message: string, meta?: any) => {
    const requestId = getRequestId();
    infoLogger.info({ message, requestId, ...meta });
  },
  verbose: (message: string, meta?: any) => {
    const requestId = getRequestId();
    infoLogger.verbose({ message, requestId, ...meta });
  },
  debug: (message: string, meta?: any) => {
    const requestId = getRequestId();
    infoLogger.debug({ message, requestId, ...meta });
  },
  silly: (message: string, meta?: any) => {
    const requestId = getRequestId();
    infoLogger.silly({ message, requestId, ...meta });
  },
  // New utility methods for specific use cases
  logRequest: (req: LogRequest, additionalMeta?: any) => {
    const requestId = getRequestId();
    const requestData = {
      method: req.method,
      originalUrl: req.originalUrl,
      ip: req.header?.('x-forwarded-for') || req.socket?.remoteAddress,
      userAgent: req.header?.('user-agent'),
      ...additionalMeta
    };
    infoLogger.info({ 
      message: `${req.method} ${req.originalUrl}`, 
      requestId,
      request: requestData 
    });
  },
  logResponse: (req: LogRequest, res: LogResponse, additionalMeta?: any) => {
    const requestId = getRequestId();
    const responseData = logFormat(req, res);
    infoLogger.info({ 
      message: `${req.method} ${req.originalUrl} - ${res.statusCode}`, 
      requestId,
      ...responseData,
      ...additionalMeta 
    });
  },
  logError: (error: Error, req?: LogRequest, additionalMeta?: any) => {
    const requestId = getRequestId();
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      request: req ? {
        method: req.method,
        originalUrl: req.originalUrl,
        ip: req.header?.('x-forwarded-for') || req.socket?.remoteAddress,
      } : undefined,
      ...additionalMeta
    };
    errorLogger.error({ 
      message: `Error: ${error.message}`, 
      requestId,
      error: errorData 
    });
  }
}

export const logFormat = (clientRequest: LogRequest, clientResponse: LogResponse) => {
  return {
    request: {
      method: clientRequest.method,
      body: clientRequest.body,
      url: {
        path: clientRequest.originalUrl,
      },
      client: {
        ip: clientRequest.header?.('x-forwarded-for') || clientRequest.socket?.remoteAddress,
        port: clientRequest.socket?.remotePort,
      },
    },
    response: clientResponse,
  }
}

export const logFormatValidation = logFormat
export const logFormatAxios = (
  config: AxiosRequestConfig,
  response: AxiosResponse | any
) => {
  return {
    request: {
      method: config.method,
      body: config.data,
      url: {
        path: config.url,
      },
    },
    response: {
      statusCode: response.status,
      message: response.statusText,
      body: response.data,
    },
    error: response.isAxiosError
      ? {
          message: response.message,
          stack: response.stack,
        }
      : undefined,
  }
}
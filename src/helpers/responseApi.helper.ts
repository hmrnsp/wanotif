/*
 * Filename: e:\NODE\mbFront\src\helpers\responseApi.helper copy.ts
 * Path: e:\NODE\mbFront
 * Created Date: Wednesday, July 2nd 2025, 2:58:29 pm
 * Author: Rede
 * 
 * Copyright (c) 2022 10RI Dev
 */

import { Request, Response } from 'express';
import { logger, logFormat } from '../libs/winston.lib';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

interface ApiErrorDetail {
  field?: string;
  message: string;
}

interface ApiMetadata {
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  [key: string]: any;
}

interface ApiErrorResponse {
  message: string;
  details?: ApiErrorDetail[];
  requestId: string;
}

interface ServerErrorResponse {
  message: string;
  requestId: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: ApiMetadata;
  requestId: string;
}

interface ExtendedError extends Error {
  [key: string]: any;
  sqlMessage?: string;
  sql?: string;
  code?: string | number;
  type?: string;
  details?: any;
}

export class ApiResponse {
  private static getRequestId(res: Response): string {
    return res.req.requestId || "unknown";
  }

  private static formatErrorForLog(error: ExtendedError) {
    const { message, stack, name, ...rest } = error;
    return {
      type: rest.type || name,
      message,
      stack,
      details: {
        ...rest,
        sqlMessage: rest.sqlMessage,
        sql: rest.sql,
        code: rest.code,
      },
    };
  }

  static success<T>(
    res: Response,
    data: T,
    httpCode: number = 200,
    meta?: ApiMetadata
  ): void {
    const requestId = this.getRequestId(res);

    // if data have object with code, message and data, use it as response
    if (
      data &&
      typeof data === "object" &&
      "code" in data &&
      "message" in data &&
      "data" in data
    ) {
      const { code, message, data: responseData } = data as any;

      if (
        typeof code === "number" &&
        typeof message === "string" &&
        responseData !== undefined
      ) {
        return this.clientError(res, code, message, [
          { message: responseData },
        ]);
      }

      const response: ApiSuccessResponse<T> = {
        data: responseData,
        requestId,
        ...(meta && { meta }),
      };

      res.set({
        "X-Request-ID": requestId,
        "Cache-Control": "no-cache",
      });

      logger.info("API Response", {
        requestId,
        ...logFormat(res.req, {
          statusCode: httpCode,
          body: response,
        }),
      });

      res.status(httpCode).json(response); // Tambahkan return di sini
      return;
    }

    const response: ApiSuccessResponse<T> = {
      data,
      requestId,
      ...(meta && { meta }),
    };

    res.set({
      "X-Request-ID": requestId,
      "Cache-Control": "no-cache",
    });

    logger.info("API Response", {
      requestId,
      ...logFormat(res.req, {
        statusCode: httpCode,
        body: data,
      }),
    });

    res.status(httpCode).json(response);
  }

  static successh2h<T>(
    res: Response,
    data: T,
    httpCode: number = 200,
    meta?: ApiMetadata
  ): void {
    const requestId = this.getRequestId(res);

    // if data have object with code, message and data, use it as response
    if (
      data &&
      typeof data === "object" &&
      "code" in data &&
      "message" in data &&
      "data" in data
    ) {
      const { code, message, data: responseData } = data as any;

      if (
        typeof code === "number" &&
        typeof message === "string" &&
        responseData !== undefined
      ) {
        return this.clientError(res, code, message, [
          { message: responseData },
        ]);
      }

      const response: ApiSuccessResponse<T> = {
        data: responseData,
        requestId,
        ...(meta && { meta }),
      };

      res.set({
        "X-Request-ID": requestId,
        "Cache-Control": "no-cache",
      });

      logger.info("API Response", {
        requestId,
        ...logFormat(res.req, {
          statusCode: httpCode,
          body: response,
        }),
      });

      res.status(httpCode).json(response); // Tambahkan return di sini
      return;
    }

    const response: ApiSuccessResponse<T> = {
      ...(data as any),
      requestId,
      ...(meta && { meta }),
    };

    res.set({
      "X-Request-ID": requestId,
      "Cache-Control": "no-cache",
    });

    logger.info("API Response", {
      requestId,
      ...logFormat(res.req, {
        statusCode: httpCode,
        body: data,
      }),
    });

    res.status(httpCode).json(response);
  }

  /**
   * Handle non-500 errors (client errors like 400, 401, 403, 404, 422)
   */
  private static clientError(
    res: Response,
    httpCode: number,
    message: string,
    details?: ApiErrorDetail[]
  ): void {
    const requestId = this.getRequestId(res);
    const errorResponse: ApiErrorResponse = {
      message,
      requestId,
      ...(details && { details }),
    };

    res.set({
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
    });

    logger.error("API Client Error Response", {
      requestId,
      ...logFormat(res.req, {
        statusCode: httpCode,
        body: errorResponse,
      }),
    });

    res.status(httpCode).json(errorResponse);
  }

  /**
   * Handle server errors (500)
   * Always returns standard "Internal Server Error" message to client
   * but logs detailed error information
   */
  static error(res: Response, error: ExtendedError): void {
    const requestId = this.getRequestId(res);
    const errorResponse: ServerErrorResponse = {
      message: "Internal Server Error",
      requestId,
    };

    res.set({
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
    });

    const logData = logFormat(res.req, {
      statusCode: 500,
      body: errorResponse,
    });

    logger.error("API Server Error Response", {
      requestId,
      ...logData,
      error: this.formatErrorForLog(error),
    });

    res.status(500).json(errorResponse);
  }

  static created<T>(res: Response, data: T, meta?: ApiMetadata): void {
    this.success(res, data, 201, meta);
  }

  static noContent(res: Response): void {
    const requestId = this.getRequestId(res);

    res.set({
      "X-Request-ID": requestId,
      "Cache-Control": "no-cache",
    });

    logger.info("API Response", {
      requestId,
      ...logFormat(res.req, {
        statusCode: 204,
        body: null,
      }),
    });

    res.status(204).send();
  }

  static validationError(res: Response, details: ApiErrorDetail[]): void {
    this.clientError(res, 400, "Validation Error", details);
  }

  static notFound(res: Response, message: string = "Resource not found"): void {
    this.clientError(res, 404, message);
  }

  static unauthorized(
    res: Response,
    message: string = "Unauthorized access"
  ): void {
    this.clientError(res, 401, message);
  }

  static forbidden(res: Response, message: string = "Access forbidden"): void {
    this.clientError(res, 403, message);
  }

  static customError(
    res: Response,
    code: number,
    message: string | string[] = "Error"
  ): void {
    let msg: string;
    let details: ApiErrorDetail[] | undefined;

    if (Array.isArray(message)) {
      msg = "Multiple errors occurred";
      details = message.map((m) => ({ message: m }));
    } else {
      msg = message;
    }

    this.clientError(res, code, msg, details);
  }

  /**
   * Generic response handler for any HTTP status code with customizable response structure
   */
/**
 * Generic response handler for any HTTP status code with customizable response structure
 */
static customResponse(
  res: Response,
  httpCode: number,
  options: {
    message?: string;
    data?: any;
    meta?: ApiMetadata;
    details?: ApiErrorDetail[];
    success?: boolean;
    customFields?: Record<string, any>;
    unwrapData?: boolean; // Opsi baru untuk menghilangkan wrapper data
  } = {}
): void {
  const requestId = this.getRequestId(res);
  const { 
    message = this.getDefaultMessage(httpCode),
    data,
    meta,
    details,
    success = httpCode >= 200 && httpCode < 300,
    customFields = {},
    unwrapData = false
  } = options;

  let response: any;

  if (success) {
    // Success response (2XX)
    if (unwrapData && data && typeof data === 'object') {
      // Merge data langsung ke response tanpa wrapper "data"
      // customFields akan di-merge terlebih dahulu, kemudian data, lalu field wajib
      response = {
        ...customFields,        // customFields di awal agar bisa di-override
        ...data,               // data akan override customFields jika ada key yang sama
        requestId,             // field wajib yang tidak bisa di-override
        ...(meta && { meta })  // meta optional
      };
      
      // Tambahkan message jika berbeda dari default
      if (message !== this.getDefaultMessage(httpCode)) {
        response.message = message;
      }


    } else {
      // Standard response dengan wrapper "data"
      response = {
        ...customFields,       // customFields di awal
        data: data || null,    // data wrapper
        requestId,             // field wajib
        ...(meta && { meta })  // meta optional
      };
      
      if (message !== this.getDefaultMessage(httpCode)) {
        response.message = message;
      }
    }

    
  } else {
    // Error response (4XX, 5XX)
    response = {
      ...customFields,                     // customFields di awal
      message,                             // message error
      requestId,                           // field wajib
      ...(details && { details })          // details error optional
    };
    
    // For 5XX errors, don't expose internal details unless explicitly set
    if (httpCode >= 500 && httpCode < 600 && !options.message) {
      response.message = 'Internal Server Error';
    }
  }

  res.set({
    'X-Request-ID': requestId,
    'Cache-Control': success ? 'no-cache' : 'no-store',
  });

  const logLevel = httpCode >= 500 ? 'error' : httpCode >= 400 ? 'warn' : 'info';
  const logMessage = success ? 'API Response' : 
                    httpCode >= 500 ? 'API Server Error Response' : 
                    'API Client Error Response';

  logger[logLevel](logMessage, {
    requestId,
    ...logFormat(res.req, {
      statusCode: httpCode,
      body: response
    }),
    ...(httpCode >= 500 && data instanceof Error && { error: this.formatErrorForLog(data as ExtendedError) })
  });

  res.status(httpCode).json(response);
}

  /**
   * Get default message for HTTP status codes
   */
  private static getDefaultMessage(httpCode: number): string {
    const statusMessages: Record<number, string> = {
      // 2XX Success
      200: "OK",
      201: "Created",
      202: "Accepted",
      204: "No Content",

      // 3XX Redirection
      301: "Moved Permanently",
      302: "Found",
      304: "Not Modified",

      // 4XX Client Error
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      409: "Conflict",
      422: "Unprocessable Entity",
      429: "Too Many Requests",

      // 5XX Server Error
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };

    return statusMessages[httpCode] || "Unknown Status";
  }
}
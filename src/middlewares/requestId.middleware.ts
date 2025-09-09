/*
 * File: requestId.middleware.ts
 * Project: starterexpress
 * File Created: Tuesday, 21st January 2025 2:38:56 pm
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Thursday, 20th February 2025 10:28:28 am
 * Copyright 2017 - 2022 10RI Dev
 */
// requestId.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncContext } from '../helpers/requestContext.helper';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if request already has an ID from upstream service
  const headerRequestId = req.header('X-Request-ID');
 
  // Use existing request ID or generate new one
  const requestId = headerRequestId || uuidv4();
 
  // Attach to request object
  req.requestId = requestId;
 
  // Add as response header
  res.set('X-Request-ID', requestId);
 
  // Wrap dalam asyncContext
  asyncContext.run({ requestId }, () => {
    next();
  });
};
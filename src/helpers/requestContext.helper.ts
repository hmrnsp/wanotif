/*
 * File: requestContext.helper.ts
 * Project: starterexpress
 * File Created: Thursday, 20th February 2025 10:27:18 am
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Thursday, 20th February 2025 10:27:26 am
 * Copyright 2017 - 2022 10RI Dev
 */

import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId: string;
}

export const asyncContext = new AsyncLocalStorage<RequestContext>();

export const getRequestId = (): string => {
  const context = asyncContext.getStore();
  return context?.requestId || 'unknown';
};
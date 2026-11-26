import type { IncomingMessage, ServerResponse } from 'http';

export interface ApiRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  params?: Record<string, string>;
  ip?: string;
  path?: string;
  originalUrl?: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
}

export interface ApiResponse extends ServerResponse {
  status?: (code: number) => ApiResponse;
  json?: (body: unknown) => void;
  send?: (body: string | Buffer) => void;
  sendFile?: (filePath: string) => void;
  redirect?: (status: number, url: string) => void;
}

export function sendJson(res: ApiResponse, statusCode: number, data: unknown): void {
  const statusFn = res.status;
  const jsonFn = res.json;
  if (typeof statusFn === 'function' && typeof jsonFn === 'function') {
    statusFn.call(res, statusCode);
    jsonFn.call(res, data);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function sendText(
  res: ApiResponse,
  statusCode: number,
  contentType: string,
  body: string | Buffer
): void {
  const statusFn = res.status;
  const sendFn = res.send;
  if (typeof statusFn === 'function' && typeof sendFn === 'function') {
    statusFn.call(res, statusCode);
    res.setHeader('Content-Type', contentType);
    sendFn.call(res, body);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

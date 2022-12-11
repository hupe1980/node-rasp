import type { RequestOptions } from 'http';

export type ArgProcessorFunc = (obj: any) => string | undefined;

export const requestOptionsProcessor:ArgProcessorFunc = (obj) => {
  const url = obj;

  if (typeof url === 'string') return url;
  if (url instanceof URL) {
    return url.toString();
  }
  const opts = url as RequestOptions;
  const port = opts.port ? `:${opts.port}` : '';

  return `${opts.protocol}//${opts.hostname || opts.host}${port}${opts.path}`;
};

export const netConnectOptionsProcessor:ArgProcessorFunc = (obj) => {
  const address = obj;

  if (typeof address === 'string') return;
  if (typeof address === 'number') return;

  // TcpNetConnectOpts
  if (Object.prototype.hasOwnProperty.call(address, 'host') || Object.prototype.hasOwnProperty.call(address, 'port')) {
    return `${address.host}:${address.port}`;
  }

  // IpcNetConnectOpts
  if (Object.prototype.hasOwnProperty.call(address, 'path')) {
    return `${address.path}`;
  }

  return;
};
import fs from 'fs';
import type { RequestOptions } from 'http';

import { matchRule } from './utils';

export interface Api {
  readonly module: string;
  readonly method: string;
}

export interface EngineProps {
  //readonly allowEnv?: string[];
  readonly allowRead?: string[];
  readonly allowWrite?: string[];
  readonly allowRun?: string[];
  readonly allowNet?: string[];
  readonly allowApi?: Api[];
}

export class Engine {
  constructor(private readonly props: EngineProps) {}

  public isFsMethodAllowed(method: string, args: any) {
    if (method === 'readFile' || method === 'readFileSync' || method === 'readdir' || method === 'readdirSync') {
      return this.isReadAllowed(args[0]);
    }

    if (method === 'writeFile' || method === 'writeFileSync') {
      return this.isWriteAllowed(args[0]);
    }

    return false;
  }

  public isDnsMethodAllowed(_method: string, args: any): boolean {
    if (!this.props.allowNet) return false;
    const hostname = args[0];
    return this.props.allowNet.some(item => matchRule(hostname, item));
  }

  public isChildProcessMethodAllowed(_method: string, args: any): boolean {
    if (!this.props.allowRun) return false;
    const command = args[0];
    return this.props.allowRun.some(item => matchRule(command, item));
  }

  public isNetMethodAllowed(_method: string, _args: any): boolean {
    return false; //TODO
  }

  public isHttpMethodAllowed(_method: string, args: any): boolean {
    if (!this.props.allowNet) return false;

    const url = args[0];

    const strUrl = (() => {
      if (typeof url === 'string') return url;
      if (url instanceof URL) {
        return url.toString();
      }
      const opts = url as RequestOptions;
      const port = opts.port ? `:${opts.port}` : '';

      return `${opts.protocol}//${opts.hostname || opts.host}${port}${opts.path}`;
    })();

    console.log(strUrl);

    return this.props.allowNet.some(item => matchRule(strUrl, item));
  }

  public isApiAllowed(module: string, method: string): boolean {
    if (!this.props.allowApi) return false;

    return this.props.allowApi.some(item => {
      return item.module=== module && item.method === method;
    });
  }

  // public isEnvAllowed(env: string): boolean {
  //   if (!this.props.allowEnv) return false;

  //   return this.props.allowEnv.some(item => matchRule(env, item));
  // }

  private isReadAllowed(path: fs.PathLike): boolean {
    if (!this.props.allowRead) return false;
    const strPath = (() => {
      if (typeof path === 'string') return path;
      return path.toString();
    })();

    return this.props.allowRead.some(item => matchRule(strPath, item));
  }

  private isWriteAllowed(path: fs.PathLike): boolean {
    if (!this.props.allowWrite) return false;
    const strPath = (() => {
      if (typeof path === 'string') return path;
      return path.toString();
    })();

    return this.props.allowWrite.some(item => matchRule(strPath, item));
  }
}

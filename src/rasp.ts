import child_process from 'child_process';
import dns from 'dns';
import fs from 'fs';
import http from 'http';
import net from 'net';

import { Engine, EngineProps } from './engine';
import { stringify } from './utils';

export interface Trace {
  readonly module: string;
  readonly method: string;
  readonly blocked: boolean;
  readonly args: string[];
  readonly stackTrace?: string[];
}

export interface Message {
  readonly pid: number;
  readonly runtime: 'node.js';
  readonly runtimeVersion: string;
  readonly time: number;
  readonly messageType: 'trace';
  readonly data: Trace;
}

export interface Configuration extends EngineProps{
  readonly mode?: Mode;
  readonly reporter: (msg: Message) => void;
}

export class RASP {
  public static configure(config: Configuration) {
    const rasp = new RASP(config);

    rasp.proxifyChildProcess();
    rasp.proxifyFs();
    rasp.proxifyDns();
    rasp.proxifyNet();
    rasp.proxifyHttp();

    const handler:ProxyHandler<NodeJS.ProcessEnv> = {
      get(_target, prop, _receiver) {
        return `world${String(prop)}`;
      },
    };

    process.env = new Proxy(process.env, handler);

    console.log(process.env.TEST);
  }

  public readonly config: Configuration;
  public readonly engine: Engine;

  private constructor(config: Configuration) {
    this.config = {
      mode: Mode.BLOCK, // default
      ...config,
    };

    this.engine = new Engine({
      ...this.config,
    });
  }

  private proxifyChildProcess() {
    child_process.spawn = new Proxy(child_process.spawn, this.createHandler<typeof child_process.spawn>('child_process', 'spawn'));
    child_process.spawnSync = new Proxy(child_process.spawnSync, this.createHandler<typeof child_process.spawnSync>('child_process', 'spawnSync'));
    child_process.exec = new Proxy(child_process.exec, this.createHandler<typeof child_process.exec>('child_process', 'exec'));
    child_process.execSync = new Proxy(child_process.execSync, this.createHandler<typeof child_process.execSync>('child_process', 'execSync'));
    child_process.execFile = new Proxy(child_process.execFile, this.createHandler<typeof child_process.execFile>('child_process', 'execFile'));
    child_process.execFileSync = new Proxy(child_process.execFileSync, this.createHandler<typeof child_process.execFileSync>('child_process', 'execFileSync'));
  }

  private proxifyFs() {
    fs.readFile = new Proxy(fs.readFile, this.createHandler<typeof fs.readFile>('fs', 'readFile'));
    fs.readFileSync = new Proxy(fs.readFileSync, this.createHandler<typeof fs.readFileSync>('fs', 'readFileSync'));
    fs.writeFile = new Proxy(fs.writeFile, this.createHandler<typeof fs.writeFile>('fs', 'writeFile'));
    fs.writeFileSync = new Proxy(fs.writeFileSync, this.createHandler<typeof fs.writeFileSync>('fs', 'writeFileSync'));
    fs.readdir = new Proxy(fs.readdir, this.createHandler<typeof fs.readdir>('fs', 'readdir'));
    fs.readdirSync = new Proxy(fs.readdirSync, this.createHandler<typeof fs.readdirSync>('fs', 'readdirSync'));
    fs.unlink = new Proxy(fs.unlink, this.createHandler<typeof fs.unlink>('fs', 'unlink'));
    fs.unlinkSync = new Proxy(fs.unlinkSync, this.createHandler<typeof fs.unlinkSync>('fs', 'unlinkSync'));
    fs.rmdir = new Proxy(fs.rmdir, this.createHandler<typeof fs.rmdir>('fs', 'rmdir'));
    fs.rmdirSync = new Proxy(fs.rmdirSync, this.createHandler<typeof fs.rmdirSync>('fs', 'rmdirSync'));
    fs.rename = new Proxy(fs.rename, this.createHandler<typeof fs.rename>('fs', 'rename'));
    fs.renameSync = new Proxy(fs.renameSync, this.createHandler<typeof fs.renameSync>('fs', 'renameSync'));
  }

  private proxifyDns() {
    dns.lookup = new Proxy(dns.lookup, this.createHandler<typeof dns.lookup>('dns', 'lookup'));
    dns.resolve = new Proxy(dns.resolve, this.createHandler<typeof dns.resolve>('dns', 'resolve'));
    dns.resolve4 = new Proxy(dns.resolve4, this.createHandler<typeof dns.resolve4>('dns', 'resolve4'));
    dns.resolve6 = new Proxy(dns.resolve6, this.createHandler<typeof dns.resolve6>('dns', 'resolve6'));
  }

  private proxifyNet() {
    net.connect = new Proxy(net.connect, this.createHandler<typeof net.connect>('net', 'connect'));
    net.createConnection = new Proxy(net.createConnection, this.createHandler<typeof net.createConnection>('net', 'createConnection'));
  }

  private proxifyHttp() {
    http.request = new Proxy(http.request, this.createHandler<typeof http.request>('http', 'request'));
  }

  private createHandler<T extends Function>(module: string, method: string): ProxyHandler<T> {
    const that = this;

    return {
      apply(target, thisArg, args) {
        if (that.config.mode === Mode.ALLOW || that.engine.isApiAllowed(module, method) || that.isAllowed(module, method, args)) {
          return target.apply(thisArg, args);
        }

        const trace: Trace = {
          module,
          method,
          blocked: that.config.mode === Mode.BLOCK,
          args: args.map(stringify),
          stackTrace: new Error().stack?.split('\n').slice(1).map(s => s.trim()),
        };

        that.config.reporter({
          pid: process.pid,
          runtime: 'node.js',
          runtimeVersion: process.version,
          time: Date.now(),
          messageType: 'trace',
          data: trace,
        });

        if (that.config.mode === Mode.ALERT) {
          return target.apply(thisArg, args);
        }

        throw new Error('API blocked by RASP');
      },
    };
  }

  private isAllowed(module: string, method: string, args: any): boolean {
    switch (module) {
      case 'fs':
        return this.engine.isFsMethodAllowed(method, args);
      case 'dns':
        return this.engine.isDnsMethodAllowed(method, args);
      case 'child_process':
        return this.engine.isChildProcessMethodAllowed(method, args);
      case 'net':
        return this.engine.isNetMethodAllowed(method, args);
      case 'http':
        return this.engine.isHttpMethodAllowed(method, args);
      default:
        return false;
    }
  }
}

export enum Mode {
  BLOCK = 'block',
  ALERT = 'alert',
  ALLOW = 'allow',
}

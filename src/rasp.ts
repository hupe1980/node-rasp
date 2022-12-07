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

    rasp.patchChildProcess();
    rasp.patchFs();
    rasp.patchDns();
    rasp.patchNet();
    rasp.patchHttp();
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

  private patchChildProcess() {
    const mutableChildProcess = child_process as Mutable<typeof child_process>;

    mutableChildProcess.spawn = this.hook(child_process.spawn, 'child_process', 'spawn');
    mutableChildProcess.spawnSync = this.hook(child_process.spawnSync, 'child_process', 'spawnSync');
    mutableChildProcess.exec = (this.hook(child_process.exec, 'child_process', 'exec') as any);
    mutableChildProcess.execSync = this.hook(child_process.execSync, 'child_process', 'execSync');
    mutableChildProcess.execFile = (this.hook(child_process.execFile, 'child_process', 'execFile') as any);
    mutableChildProcess.execFileSync = this.hook(child_process.execFileSync, 'child_process', 'execFileSync');
  }

  private patchFs() {
    const mutableFs = fs as Mutable<typeof fs>;

    mutableFs.readFile = (this.hook(fs.readFile, 'fs', 'readFile') as any);
    mutableFs.readFileSync = this.hook(fs.readFileSync, 'fs', 'readFileSync');
    mutableFs.writeFile = (this.hook(fs.writeFile, 'fs', 'writeFile') as any);
    mutableFs.writeFileSync = this.hook(fs.writeFileSync, 'fs', 'writeFileSync');
    mutableFs.readdir= (this.hook(fs.readdir, 'fs', 'readdir') as any);
    mutableFs.readdirSync = this.hook(fs.readdirSync, 'fs', 'readdirSync');
    mutableFs.unlink= (this.hook(fs.unlink, 'fs', 'unlink') as any);
    mutableFs.unlinkSync = this.hook(fs.unlinkSync, 'fs', 'unlinkSync');
    mutableFs.rmdir= (this.hook(fs.rmdir, 'fs', 'rmdir') as any);
    mutableFs.rmdirSync = this.hook(fs.rmdirSync, 'fs', 'rmdirSync');
    mutableFs.rename= (this.hook(fs.rename, 'fs', 'rename') as any);
    mutableFs.renameSync = this.hook(fs.renameSync, 'fs', 'renameSync');
  }

  private patchDns() {
    const mutableDns = dns as Mutable<typeof dns>;

    mutableDns.lookup = (this.hook(dns.lookup, 'dns', 'lookup') as any);
    mutableDns.resolve = (this.hook(dns.resolve, 'dns', 'resolve') as any);
    mutableDns.resolve4 = (this.hook(dns.resolve4, 'dns', 'resolve4') as any);
    mutableDns.resolve6 = (this.hook(dns.resolve6, 'dns', 'resolve6') as any);
  }

  private patchNet() {
    const mutableNet = net as Mutable<typeof net>;

    mutableNet.connect = this.hook(net.connect, 'net', 'connect');
    mutableNet.createConnection = this.hook(net.createConnection, 'net', 'createConnection');
  }

  private patchHttp() {
    const mutableHttp = http as Mutable<typeof http>;

    mutableHttp.request = this.hook(http.request, 'http', 'request');
  }

  private hook(func: Function, module: string, method: string) {
    return (...args: any) => {
      if (this.config.mode === Mode.ALLOW || this.engine.isApiAllowed(module, method) || this.isAllowed(module, method, args)) {
        return func.call(this, ...args);
      }

      const trace: Trace = {
        module,
        method,
        blocked: this.config.mode === Mode.BLOCK,
        args: args.map(stringify),
        stackTrace: new Error().stack?.split('\n').slice(1).map(s => s.trim()),
      };

      this.config.reporter({
        pid: process.pid,
        runtime: 'node.js',
        runtimeVersion: process.version,
        time: Date.now(),
        messageType: 'trace',
        data: trace,
      });

      if (this.config.mode === Mode.ALERT) {
        return func.call(this, ...args);
      }

      throw new Error('API blocked by RASP');
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

type Mutable<T> = {
  -readonly [k in keyof T]: T[k];
};

import child_process from 'child_process';
import dns from 'dns';
import fs from 'fs';
import net from 'net';

import { stringify, matchRule } from './utils';

export interface Trace {
  readonly module: string;
  readonly method: string;
  readonly blocked: boolean;
  readonly args: string[];
  readonly stackTrace?: string[];
}

export interface Ignore {
  readonly module: string;
  readonly method: string;
}

export interface Configuration {
  readonly mode?: Mode;
  readonly allowRead?: string[];
  readonly allowWrite?: string[];
  //readonly allowRun?: string[]; TODO
  //readonly allowNet?: string[]; TODO
  readonly ignores?: Ignore[];
  readonly reporter: (trace: Trace) => void;
}

export class RASP {
  public static configure(config: Configuration) {
    const rasp = new RASP(config);

    rasp.patchChildProcess();
    rasp.patchFs();
    rasp.patchDns();
    rasp.patchNet();
  }

  public readonly config: Configuration;

  private constructor(config: Configuration) {
    this.config = {
      mode: Mode.BLOCK, // default
      ...config,
    };
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

    mutableFs.open = (this.hook(fs.open, 'fs', 'open') as any);
    mutableFs.openSync = this.hook(fs.openSync, 'fs', 'openSync');
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
  }

  private hook(func: Function, module: string, method: string) {
    return (...args: any) => {
      if (this.config.mode === Mode.ALLOW || this.isIgnored(module, method) || this.isAllowed(module, method, args)) {
        return func.call(this, ...args);
      }

      if (this.config.reporter) {
        const trace: Trace = {
          module,
          method,
          blocked: this.config.mode === Mode.BLOCK,
          args: args.map(stringify),
          stackTrace: new Error().stack?.split('\n').slice(1).map(s => s.trim()),
        };

        this.config.reporter(trace);
      }

      if (this.config.mode === Mode.ALERT) {
        return func.call(this, ...args);
      }

      throw new Error('API blocked by RASP');
    };
  }

  private isIgnored(module: string, method: string): boolean {
    const ignore = {
      module,
      method,
    };

    if (!this.config.ignores) return false;

    return this.config.ignores.some(item => {
      return item.module=== ignore.module && item.method === ignore.method;
    });
  }

  private isAllowed(module: string, method: string, ...args: any): boolean {
    if (module === 'fs') {
      if (method === 'readFile' || method === 'readFileSync' || method === 'readdir' || method === 'readdirSync') {
        if (!this.config.allowRead) return false;
        return this.config.allowRead.some(item => matchRule(args[0], item));
      } else if (method === 'writeFile' || method === 'writeFileSync') {
        if (!this.config.allowWrite) return false;
        return this.config.allowWrite.some(item => matchRule(args[0], item));
      }
    }

    return false;
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

import child_process from 'child_process';
import dns from 'dns';
import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';

import { ArgProcessorFunc, requestOptionsProcessor, netConnectOptionsProcessor } from './arg_processors';
import { Engine, Rules, Mode } from './engine';

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

export type PreArgProcessorFunc = (module: string, method: string, strArgs: string[], mode: Mode, rasp: RASP) => Mode;
export type ReporterFunc = (msg: Message, rasp: RASP) => void;

export interface Configuration extends Rules{
  readonly mode?: Mode;
  readonly preProcessor?: PreArgProcessorFunc;
  readonly reporter?: ReporterFunc;
}

export class RASP {
  public static configure(config: Configuration) {
    const rasp = new RASP({
      ...config,
    });

    rasp.proxifyChildProcess();
    rasp.proxifyFs();
    rasp.proxifyDns();
    rasp.proxifyNet();
    rasp.proxifyHttp();
    rasp.proxifyHttps();
  }

  private readonly preProcessor: PreArgProcessorFunc;
  private readonly reporter: ReporterFunc;
  private readonly engine: Engine;

  private constructor(config: Configuration) {
    this.preProcessor = config.preProcessor ?
      config.preProcessor
      :
      (_module: string, _method: string, _argArray: any[], mode: Mode, _rasp: RASP) => mode;

    this.reporter = config.reporter ? config.reporter : (msg: Message, _rasp: RASP) => console.log(msg);

    const mode = config.mode ? config.mode : Mode.BLOCK; //default Mode.Block

    this.engine = new Engine(mode, {
      ...config,
    });
  }

  public setMode(mode: Mode): void {
    this.engine.setMode(mode);
  }

  public updateRules(rules: Rules): void {
    this.engine.update(rules);
  }

  public isAllowed(module: string, method: string, args: any): boolean {
    return this.engine.isAllowed(module, method, args);
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
    fs.mkdir = new Proxy(fs.mkdir, this.createHandler<typeof fs.mkdir>('fs', 'mkdir'));
    fs.mkdirSync = new Proxy(fs.mkdirSync, this.createHandler<typeof fs.mkdirSync>('fs', 'mkdirSync'));
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
    net.connect = new Proxy(net.connect, this.createHandler<typeof net.connect>('net', 'connect', { 0: netConnectOptionsProcessor }));
    net.createConnection = new Proxy(net.createConnection, this.createHandler<typeof net.createConnection>('net', 'createConnection', { 0: netConnectOptionsProcessor }));
  }

  private proxifyHttp() {
    http.request = new Proxy(http.request, this.createHandler<typeof http.request>('http', 'request', { 0: requestOptionsProcessor }));
  }

  private proxifyHttps() {
    https.request = new Proxy(https.request, this.createHandler<typeof https.request>('https', 'request', { 0: requestOptionsProcessor }));
  }

  private createHandler<T extends Function>(module: string, method: string, processors?: Record<number, ArgProcessorFunc>): ProxyHandler<T> {
    const stringify = (obj: any, index: number): string => {
      if (processors && index in processors) {
        const result = processors[index](obj);

        if (result) {
          return result;
        }
      }

      switch (typeof obj) {
        case 'object':
          if (obj === null) {
            return 'null';
          }
          return `object ${obj.constructor.name}`;
        case 'function':
          return `function ${obj.name}`;
        case 'undefined':
          return 'undefined';
        default:
          return obj.toString();
      }
    };

    const apply = (target: T, thisArg: any, argArray: any[]): any => {
      const strArgs = argArray.map(stringify);
      const mode = this.preProcessor(module, method, strArgs, this.engine.getMode(module, method, strArgs), this);

      if (mode === Mode.ALLOW) {
        return Reflect.apply(target, thisArg, argArray);
      }

      const stackTrace = new Error().stack?.split('\n').slice(1).map(s => s.trim());

      const trace: Trace = {
        module,
        method,
        blocked: mode === Mode.BLOCK,
        args: strArgs,
        // ignore first entry:
        // -> 'at Object.apply (/.../node_modules/node-rasp/lib/rasp.js:118:43)'
        stackTrace: stackTrace ? stackTrace.slice(1) : ['no stack trace'],
      };

      this.reporter({
        pid: process.pid,
        runtime: 'node.js',
        runtimeVersion: process.version,
        time: Date.now(),
        messageType: 'trace',
        data: trace,
      }, this);

      if (mode === Mode.ALERT) {
        return Reflect.apply(target, thisArg, argArray);
      }

      // mode === Mode.Block
      throw new Error(`${module}.${method} blocked by RASP`);
    };

    return {
      apply: apply.bind(this),
    };
  }
}

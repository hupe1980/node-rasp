export interface Api {
  readonly module: string;
  readonly method: string;
}

export interface Rules {
  readonly allowRead?: string[];
  readonly allowWrite?: string[];
  readonly allowDelete?: string[];
  readonly allowRun?: string[];
  readonly allowNet?: string[];
  readonly allowApi?: Api[];
}

export class Engine {
  private mode: Mode;
  private rules: Rules;

  constructor(mode: Mode, rules: Rules) {
    this.mode = mode;
    this.rules = rules;
  }

  public getMode(module: string, method: string, strArgs: string[]): Mode {
    if (this.mode === Mode.ALLOW ||
      this.isApiAllowed(module, method) ||
      this.isAllowed(module, method, strArgs)) {
      return Mode.ALLOW;
    }
    return this.mode;
  }

  public isAllowed(module: string, method: string, strArgs: string[]): boolean {
    switch (module) {
      case 'fs':
        return this.isFsMethodAllowed(method, strArgs);
      case 'dns':
        return this.isDnsMethodAllowed(method, strArgs);
      case 'child_process':
        return this.isChildProcessMethodAllowed(method, strArgs);
      case 'net':
        return this.isNetMethodAllowed(method, strArgs);
      case 'http':
        return this.isHttpMethodAllowed(method, strArgs);
      case 'https':
        return this.isHttpsMethodAllowed(method, strArgs);
      default:
        return false;
    }
  }

  public setMode(mode: Mode) {
    this.mode = mode;
  }

  public update(rules: Rules) {
    this.rules = {
      ...this.rules,
      ...rules,
    };
  }

  private isFsMethodAllowed(method: string, args: string[]) {
    const path = args[0];

    if (method === 'readFile' || method === 'readFileSync' || method === 'readdir' || method === 'readdirSync') {
      return this.isReadAllowed(path);
    }

    if (method === 'writeFile' || method === 'writeFileSync' || method === 'mkdir' || method === 'mkdirSync') {
      return this.isWriteAllowed(path);
    }

    if (method === 'unlink' || method === 'unlinkSync' || method === 'rmdir' || method === 'rmdirSync') {
      return this.isDeleteAllowed(path);
    }

    return false;
  }

  private isReadAllowed(path: string): boolean {
    if (!this.rules.allowRead) return false;
    return this.rules.allowRead.some(item => matchRule(path, item));
  }

  private isWriteAllowed(path: string): boolean {
    if (!this.rules.allowWrite) return false;
    return this.rules.allowWrite.some(item => matchRule(path, item));
  }

  private isDeleteAllowed(path: string): boolean {
    if (!this.rules.allowDelete) return false;
    return this.rules.allowDelete.some(item => matchRule(path, item));
  }

  private isDnsMethodAllowed(_method: string, args: string[]): boolean {
    if (!this.rules.allowNet) return false;
    const hostname = args[0];
    return this.rules.allowNet.some(item => matchRule(hostname, item));
  }

  private isChildProcessMethodAllowed(_method: string, args: any): boolean {
    if (!this.rules.allowRun) return false;
    const command = args[0];
    return this.rules.allowRun.some(item => matchRule(command, item));
  }

  private isNetMethodAllowed(_method: string, args: any): boolean {
    if (!this.rules.allowNet) return false;

    const address = (() => {
      if (typeof args[0] === 'string') return args[0];
      const host = args[1] ? args[1] : 'localhost';
      return `${host}:${args[0]}}`;
    })();

    return this.rules.allowNet.some(item => matchRule(address, item));
  }

  private isHttpMethodAllowed(_method: string, args: any): boolean {
    if (!this.rules.allowNet) return false;
    const url = args[0];
    return this.rules.allowNet.some(item => matchRule(url, item));
  }

  private isHttpsMethodAllowed(_method: string, args: any): boolean {
    if (!this.rules.allowNet) return false;
    const url = args[0];
    return this.rules.allowNet.some(item => matchRule(url, item));
  }

  private isApiAllowed(module: string, method: string): boolean {
    if (!this.rules.allowApi) return false;
    return this.rules.allowApi.some(item => {
      return item.module=== module && item.method === method;
    });
  }
}

export const matchRule = (str: string, rule: string) => new RegExp('^' + rule.split('*').map(escapeRegex).join('.*') + '$').test(str);

export const escapeRegex = (str: string) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');

export enum Mode {
  BLOCK = 'block',
  ALERT = 'alert',
  ALLOW = 'allow',
}

import dns from 'dns';
import fs from 'fs';
import { Mode, RASP, Trace } from '../src';

let lookup:typeof dns.lookup;
let openSync:typeof fs.openSync;
let readdirSync:typeof fs.readdirSync;

beforeEach(() => {
  lookup = dns.lookup;
  openSync = fs.openSync;
  readdirSync = fs.readdirSync;

  jest.resetModules();
});

afterEach(() => {
  dns.lookup = lookup;
  fs.openSync = openSync;
  fs.readdirSync = readdirSync;
});

test('rasp - alert - fs.openSync', () => {
  let module, method, blocked;

  RASP.configure({
    mode: Mode.ALERT,
    reporter(trace: Trace) {
      blocked = trace.blocked;
      module = trace.module;
      method = trace.method;
    },
  });

  fs.openSync('/tmp/test', 'w');

  expect(blocked).toBe(false);
  expect(module).toBe('fs');
  expect(method).toBe('openSync');
});

test('rasp - block - fs.readdirSync', () => {
  let module, method, blocked;

  RASP.configure({
    mode: Mode.BLOCK,
    allowRead: ['*istanbul-reports/lib/html/*', '*node_modules/*'],
    ignores: [
      { module: 'fs', method: 'readFileSync' },
      { module: 'fs', method: 'openSync' },
      { module: 'fs', method: 'writeFileSync' },
    ],
    reporter(trace: Trace) {
      blocked = trace.blocked;
      module = trace.module;
      method = trace.method;
    },
  });

  expect(() => fs.readdirSync('/tmp/test')).toThrowError('API blocked by RASP');

  expect(blocked).toBe(true);
  expect(module).toBe('fs');
  expect(method).toBe('readdirSync');

});

test('rasp - alert - dns.lookup', () => {
  let module, method, blocked;

  RASP.configure({
    mode: Mode.ALERT,
    reporter(trace: Trace) {
      blocked = trace.blocked;
      module = trace.module;
      method = trace.method;
    },
  });

  dns.lookup('example.com', () => {});

  expect(blocked).toBe(false);
  expect(module).toBe('dns');
  expect(method).toBe('lookup');
});

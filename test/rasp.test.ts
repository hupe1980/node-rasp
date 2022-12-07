import dns from 'dns';
import fs from 'fs';
import http from 'http';

import axios from 'axios';
import { Mode, RASP, Message } from '../src';

let lookup:typeof dns.lookup;
let readdirSync:typeof fs.readdirSync;
let request:typeof http.request;

beforeEach(() => {
  lookup = dns.lookup;
  readdirSync = fs.readdirSync;
  request = http.request;

  jest.resetModules();
});

afterEach(() => {
  dns.lookup = lookup;
  fs.readdirSync = readdirSync;
  http.request = request;
});

test('rasp - alert - fs.readdirSync', () => {
  let module, method, blocked;

  RASP.configure({
    mode: Mode.ALERT,
    reporter(msg: Message) {
      blocked = msg.data.blocked;
      module = msg.data.module;
      method = msg.data.method;
    },
  });

  fs.readdirSync(process.cwd());

  expect(blocked).toBe(false);
  expect(module).toBe('fs');
  expect(method).toBe('readdirSync');
});

test('rasp - block - fs.readdirSync', () => {
  let module, method, blocked;

  RASP.configure({
    mode: Mode.BLOCK,
    allowRead: ['*istanbul-reports/lib/html/*', '*node_modules/*'],
    allowApi: [
      { module: 'fs', method: 'readFileSync' },
      { module: 'fs', method: 'openSync' },
      { module: 'fs', method: 'writeFileSync' },
    ],
    reporter(msg: Message) {
      blocked = msg.data.blocked;
      module = msg.data.module;
      method = msg.data.method;
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
    reporter(msg: Message) {
      blocked = msg.data.blocked;
      module = msg.data.module;
      method = msg.data.method;
    },
  });

  dns.lookup('example.com', () => {});

  expect(blocked).toBe(false);
  expect(module).toBe('dns');
  expect(method).toBe('lookup');
});

test('rasp - block - axios', async () => {
  let module, method, blocked;

  RASP.configure({
    mode: Mode.BLOCK,
    allowRead: ['*istanbul-reports/lib/html/*', '*node_modules/*'],
    allowApi: [
      { module: 'fs', method: 'readFileSync' },
      { module: 'fs', method: 'writeFileSync' },
    ],
    reporter(msg: Message) {
      blocked = msg.data.blocked;
      module = msg.data.module;
      method = msg.data.method;
    },
  });

  await expect(axios.get('http://127.0.0.1')).rejects.toThrowError('API blocked by RASP');

  expect(blocked).toBe(true);
  expect(module).toBe('http');
  expect(method).toBe('request');
});

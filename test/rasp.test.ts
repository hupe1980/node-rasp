import dns from 'dns';
import fs from 'fs';
import http from 'http';

import axios from 'axios';
import { Mode, RASP, Message } from '../src';

let lookup:typeof dns.lookup;
let readFileSync:typeof fs.readFileSync;
let readdirSync:typeof fs.readdirSync;
let mkdirSync:typeof fs.mkdirSync;
let writeFileSync:typeof fs.writeFileSync;
let request:typeof http.request;

beforeEach(() => {
  lookup = dns.lookup;
  readFileSync = fs.readFileSync;
  readdirSync = fs.readdirSync;
  mkdirSync = fs.mkdirSync;
  writeFileSync = fs.writeFileSync;
  request = http.request;

  jest.resetModules();
});

afterEach(() => {
  dns.lookup = lookup;
  fs.readFileSync = readFileSync;
  fs.readdirSync = readdirSync;
  fs.mkdirSync = mkdirSync;
  fs.writeFileSync = writeFileSync;
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
    reporter(msg: Message) {
      blocked = msg.data.blocked;
      module = msg.data.module;
      method = msg.data.method;
    },
  });

  expect(() => fs.readdirSync('/tmp/test')).toThrowError('fs.readdirSync blocked by RASP');

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
    reporter(msg: Message) {
      blocked = msg.data.blocked;
      module = msg.data.module;
      method = msg.data.method;
    },
  });

  await expect(axios.get('http://127.0.0.1')).rejects.toThrowError('http.request blocked by RASP');

  expect(blocked).toBe(true);
  expect(module).toBe('http');
  expect(method).toBe('request');
});

test('rasp - alert -> block - dns.lookup', async () => {
  RASP.configure({
    mode: Mode.ALERT,
    reporter(msg: Message, rasp: RASP) {
      if (msg.data.module === 'dns' && msg.data.method === 'lookup') {
        rasp.setMode(Mode.BLOCK);
      }
    },
  });

  dns.lookup('example.com', () => {}); // ok => updateEngine

  expect(() => dns.lookup('example.com', () => {})).toThrowError('dns.lookup blocked by RASP');
});

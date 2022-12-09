# node-rasp
> Simple nodejs rasp solution

:warning: This is experimental and subject to breaking changes.

## How to use
```typescript
import fs from 'fs';
import { Mode, RASP, Message } from 'node-rasp';

RASP.configure({
  mode: Mode.Block,
  reporter: (msg: Message, rasp: RASP) => {
    console.log(msg);
  },
});

fs.readdirSync('/tmp'); // => throws fs.readdirSync blocked by RASP
```

## Example Message
```
{
  pid: 20448,
  runtime: 'node.js',
  runtimeVersion: 'v16.13.0',
  time: 1670454402069,
  messageType: 'trace',
  data: {
    module: 'fs',
    method: 'readdirSync',
    blocked: false,
    args: [ '/tmp' ],
    stackTrace: [
      'at Object.<anonymous> (/.../index.js:10:8)',
      'at Module._compile (node:internal/modules/cjs/loader:1101:14)',
      'at Object.Module._extensions..js (node:internal/modules/cjs/loader:1153:10)',
      'at Module.load (node:internal/modules/cjs/loader:981:32)',
      'at Function.Module._load (node:internal/modules/cjs/loader:822:12)',
      'at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)',
      'at node:internal/main/run_main_module:17:47'
    ]
  }
}
```

## Configuration
|Name|Type|Description
|-|-|-
|mode|allow, alert, block|
|reporter|(msg: Message, rasp: RASP) => void|
|allowRead|string[]|Allow file system read access
|allowWrite|string[]|Allow file system write access
|allowDelete|string[]|Allow file system delete access
|allowRun|string[]|Allow running subprocesses
|allowNet|string[]|Allow network access
|allowApi|{ module: string, method: string }|Allow api calls

## License
[MIT](LICENCE)

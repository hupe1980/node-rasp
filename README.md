# node-rasp
> Simple nodejs rasp solution

:warning: This is experimental and subject to breaking changes.

## How to use
```typescript
import fs from 'fs';
import { Mode, RASP, Message } from 'node-rasp';

RASP.configure({
  mode: Mode.Block,
  reporter: (msg: Message) => {
    console.log(msg);
  },
});

fs.readdirSync('/tmp'); // => throws API blocked by RASP
```

## Configuration
|Name|Type|Description
|-|-|-
|mode|allow, alert, block|
|reporter|(msg: Message) => void|
|allowEnv|string[]|Allow environment acces 
|allowRead|string[]|Allow file system read access
|allowWrite|string[]|Allow file system write access
|allowRun|string[]|Allow running subprocesses
|allowNet|string[]|Allow network access
|allowApi|{ module: string, method: string }|Allow api calls

## License
[MIT](LICENCE)

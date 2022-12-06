# node-rasp

:warning: This is experimental and subject to breaking changes.

## How to use
```typescript
import * as fs from 'fs';
import { Mode, RASP, Trace } from './rasp';

RASP.configure({
  mode: Mode.Block,
  reporter: (trace: Trace) => {
    console.log(trace);
  },
});

fs.openSync('/tmp/test', 'w'); // => throws API blocked by RASP
```

## License
[MIT](LICENCE)

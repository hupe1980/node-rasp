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

fs.openSync('/tmp/test', 'w'); // => throws API blocked by RASP
```

## License
[MIT](LICENCE)

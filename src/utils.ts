export const stringify = (obj: any, _index: number): string => {
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

export const matchRule = (str: string, rule: string) => new RegExp('^' + rule.split('*').map(escapeRegex).join('.*') + '$').test(str);

export const escapeRegex = (str: string) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
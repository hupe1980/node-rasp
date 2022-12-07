const { typescript } = require('projen');
const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'node-rasp',
  license: 'MIT',
  copyrightOwner: 'Frank Hübner',
  devDeps: ['axios'],
});
project.gitignore.exclude('.DS_Store');
project.synth();
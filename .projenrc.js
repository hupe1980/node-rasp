const { javascript, typescript } = require('projen');
const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'node-rasp',
  license: 'MIT',
  copyrightOwner: 'Frank Hübner',
  releaseToNpm: true,
  depsUpgrade: true,
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      secret: 'AUTOMATION_GITHUB_TOKEN',
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
    },
  },
  autoApproveUpgrades: true,
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['hupe1980'],
  },
  devDeps: ['axios'],
});
project.gitignore.exclude('.DS_Store');
project.synth();
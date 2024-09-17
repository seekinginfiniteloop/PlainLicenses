const { allowedCommitTypes, allowedCommitScopes } = require('.github/scripts/generate-changelog.js');

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', allowedCommitTypes],
    'scope-enum': [2, 'always', allowedCommitScopes],
  },
};

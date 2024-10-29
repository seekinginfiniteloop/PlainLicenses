import { allowedCommitTypes, allowedCommitScopes } from '.github/scripts/generate-changelog.js';

export const extendConfig = ['@commitlint/config-conventional'];
export const rules = {
  'type-enum': [2, 'always', allowedCommitTypes],
  'scope-enum': [2, 'always', allowedCommitScopes],
};

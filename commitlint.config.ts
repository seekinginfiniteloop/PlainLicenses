import type {UserConfig} from '@commitlint/types';
import {RuleConfigSeverity} from '@commitlint/types';

const Configuration: UserConfig = {

  extends: ['@commitlint/config-conventional'],
  parserPreset: 'conventional-changelog-angular',
  formatter: '@commitlint/format',
  rules: {
    'type-enum': [RuleConfigSeverity.Error, 'always', ['foo']],
  },
  // ...
};

export default Configuration;


export const devTypes = [
  // Core site changes
  "new",
  "fix",        // Bug fix
  "refactor",   // Code change that neither fixes a bug nor adds a feature
  "bot",        // Bot changes
]

export const devScopes = [
  "content",       // Main site content and structure
  "ui",         // Visual components
  "infra",
  "deps",
  "script",
  "blog",
]

const licenseTypes = [
  "subs", // substantive
  "admin", // administrative
  "new", // new
  "bot"]

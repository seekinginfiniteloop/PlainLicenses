import * as fs from "fs"
import * as path from "path"
import { RuleConfigSeverity } from '@commitlint/types';
import globby from "globby";
// ts-ignore
import selectiveScope from 'commitlint-plugin-selective-scope';

import type { UserConfig } from '@commitlint/types';
import { spdxLicense, LicenseTypeT, DevTypeT, DevScopeT } from "./typings/commit";

const spdxFilename = "licenses.json"
const spdxJsonPath = path.join("external", "license-list-data", "json", spdxFilename)

/**
 * Reads the SPDX license list from the local JSON file.
 *
 * @returns An array of SPDX license IDs.
 */
function readSpdxLicenseList(): string[] {
  const data = fs.readFileSync(spdxJsonPath, "utf-8")
  const licenses: spdxLicense[] = JSON.parse(data).licenses as spdxLicense[]
  return licenses
    .filter(license => !license.isDeprecatedLicenseId)
    .map(license => license.licenseId.toLowerCase())
}

async function getExistingLicenses(): Promise<(string | undefined)[]>{
  const possiblePaths = await globby("docs/licenses/*/*", { onlyDirectories: true, unique: true })
  return possiblePaths.map(path => path.split("/").pop())
}

const getExistingLicenseScopes = async () => {
  try {
    const licenses = await getExistingLicenses();
    return licenses.map(license => license?.toLowerCase().trim());
  } catch (error) {
    throw error;
  }
};

const existingLicenseScopes = Promise.resolve(getExistingLicenseScopes()).then(scopes => scopes);

const possibleLicenseScopes = async () => {
  const scopes = [readSpdxLicenseList(), /plain-[-.a-z0-9]+/];
  const existingScopes = await existingLicenseScopes;
  return scopes.filter(scope => {
    if (typeof scope === 'string' && scope !== "" && !existingScopes.includes(scope)) {
      return true;
    } else if (scope instanceof RegExp) {
      return true;
    }
    return false;
  });
};

const licenseTypes = ["new", "subs", "admin", "bot", "stable"];
const devTypes = ["fix", "new", "refactor", "chore", "bot"];
const devScopes = ["content", "ui", "infra", "deps", "scripts", "blog"];

const licenseTypedScopes = licenseTypes.map(type =>
  type !== "new" ? { type: existingLicenseScopes.then(scopes => scopes) } : { type: possibleLicenseScopes }
);
const devTypedScopes = devTypes.map(type => ({ type: devScopes }));

const allTypedScopes = [...licenseTypedScopes, ...devTypedScopes] as const;

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: 'conventional-changelog-angular',
  plugins: ['commitlint-plugin-selective-scope'],
  formatter: '@commitlint/format',
  rules: {
    'type-case': [RuleConfigSeverity.Error, 'always', 'lower-case'],
    'type-empty': [RuleConfigSeverity.Error, 'never'],
    'scope-empty': [RuleConfigSeverity.Error, 'never'],
    'subject-empty': [RuleConfigSeverity.Error, 'never'],
    'type-enum': [RuleConfigSeverity.Error, 'always', [...licenseTypes, ...devTypes]],
    'selective-scope': [RuleConfigSeverity.Error, 'always', allTypedScopes],
  },
  helpUrl: "https://plainlicense.org/helping/commit.md",
  prompt: {
    settings: {},
    messages: {
      skip: 'Skip',
      emptyWarning: "You've gotta give us something to work with!",
    },
    questions: {
      type: {
        description: "(required) Select the type of change that you're committing:",
        enum: {
          new: {
            description: 'A new feature, enhancement, or license',
            title: 'New Feature (License or Content)',
            emoji: '✨',
          },
          subs: {
            description: 'LICENSE ONLY: A substantive edit to an existing license',
            title: 'Substantive Edit (Licenses)',
            emoji: '📝',
          },
          admin: {
            description: 'LICENSE ONLY: An administrative/minor edit to a license',
            title: 'Administrative Edit (Licenses)',
            emoji: '🔧',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fix (Site)',
            emoji: '🐛',
          },
          refactor: {
            description: 'A code or organization change that neither fixes a bug nor adds a feature. This includes major edits to non-license content (minor edits are chores). Also use refactor to revert a previous commit.',
            title: 'Refactor (Site or Content)',
            emoji: '♻️',
          },
          chore: {
            description: "A small task that isn't a bug fix, feature, or refactor. This could be a build process, code cleanup, or other task. This includes minor edits to non-license content (major edits are refactors).",
            title: 'Chore (Site or Content)',
            emoji: '🧹',
          },
          bot: {
            description: "A bot commit -- you're probably not a bot, are you?",
            title: 'Bot',
            emoji: '🤖',
          },
          stable: {
            description: "A stable release of the site or a license. Both are extremely rare. 🦄🦄",
            title: "Stable/Major Release",
            emoji: '🚀',
          }
        }
      },
      scope: {
        description: `(required) What is the scope of your change?
        For licenses, use the SPDX ID or its equivalent 'plain-<name>' if it is a Plain License original licenses. Existing license ids are: ${getExistingLicenseScopes().then((ids) => ids.join(", "))}.

        For everything else, use one of the following scopes: ${devScopes.join(", ")}.`,
      },
      subject: {
        description: '(required) Write a short lower-case description of the change:',
      },
      body: {
        description: "(optional) Provide a longer description of the change. If the change isn't self-explanatory or is a major change, provide more detail here.",
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are affected, provide details here:',
      },
      issues: {
        description: 'Add issue references (e.g. "fixes #123", "re #123").',
      }
    }
  }
};

export default Configuration;

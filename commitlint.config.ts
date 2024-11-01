import * as fs from "fs"
import * as path from "path"
import { RuleConfigSeverity } from '@commitlint/types';
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

const licenseScopes = [readSpdxLicenseList(), /plain-[-.a-z0-9]+/].flat()
const licenseTypes = ["new" as LicenseTypeT, "subs", "admin", "bot", "stable"]
const devTypes = ["fix", "new" as DevTypeT, "refactor", "chore", "bot"]
const devScopes = ["content", "ui", "infra", "deps", "scripts", "blog"]

const licenseTypedScopes = licenseTypes.map(type => { type: licenseScopes })
const devTypedScopes = devTypes.map(type => { type: devScopes })

const allTypedScopes = [...licenseTypedScopes, ...devTypedScopes] as const

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: 'conventional-changelog-angular',
  plugins: ['commitlint-plugin-selective-scope'],
  formatter: '@commitlint/format',
  rules: {
    'type-case': [RuleConfigSeverity.Error, 'always', 'lower-case'],
    'type-empty': [RuleConfigSeverity.Error, 'never'],
    'scope-empty': [RuleConfigSeverity.Error, 'never'],
    'selective-scope': [RuleConfigSeverity.Error, 'always', allTypedScopes],
  },
  // ...
};

export default Configuration;

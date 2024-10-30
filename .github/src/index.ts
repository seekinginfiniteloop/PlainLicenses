import * as fs from "fs"
import * as path from "path"

const spdxFilename = "licenses.json"
const spdxJsonPath = path.join("external", "license-list-data", "json", spdxFilename)

export interface spdxLicense {
  reference: URL
  isDeprecatedLicenseId: boolean
  detailsUrl: URL
  referenceNumber: number
  name: string // full name
  licenseId: SPDXID // SPDX ID
  seeAlso: URL[]
  isOsiApproved: boolean
}

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

/**
 * Normalizes a scope to lowercase.
 *
 * @param scope The scope to normalize.
 * @returns The normalized scope.
 */
function normalizeScope(scope: string): string {
  return scope.toLowerCase()
}

export type SPDXID = typeof licenseScopes[number]

const devScopes = ["site", "build", "hooks", "config", "ci", "deps"]
const licenseScopes = [readSpdxLicenseList(), "plain-*"].flat()
const allScopes = [...devScopes, ...licenseScopes]

// dynamically generate the type, which is any literal from the licensesScopes array
export type CommitScope = typeof allScopes[number]
export type DevCommitScope = typeof devScopes[number]
export type LicenseCommitScope = typeof licenseScopes[number]

export const licenseTypes = ["subs", "admin", "bot"]
export const devTypes = ["blog", "bot", "build", "chore", "ci", "config", "content", "feat", "fix", "refactor", "script"]
export const allCommitTypes = [...licenseTypes, ...devTypes]

export type CommitType = typeof allCommitTypes[number]
export type DevCommitType = typeof devTypes[number]
export type LicenseCommitType = typeof licenseTypes[number]

/**
 * Represents a Developer (or site content) Git commit.
 */
export interface DevCommit {
  hash: string
  type: DevCommitType
  scope: DevCommitScope
  description: string
  body: string
}

/**
 * Represents a License Git commit.
 */
export interface LicenseCommit {
  hash: string
  type: LicenseCommitType
  scope: LicenseCommitScope
  description: string
  body: string
}

// Define the allowed commit types and scopes
const allowedCommitTypes: CommitType[] = allCommitTypes
const allowedCommitScopes: CommitScope[] = allScopes.map(normalizeScope)


const typeScopeMap: Record<CommitType, CommitScope[]> = {
  subs: licenseScopes,
  admin: licenseScopes,
  bot: allScopes, // allow any scope for bot commits
  blog: devScopes,
  build: devScopes,
  chore: devScopes,
  ci: devScopes,
  config: devScopes,
  content: devScopes,
  feat: devScopes,
  fix: devScopes,
  refactor: devScopes,
  script: devScopes
}

export type ValidCommit = DevCommit | LicenseCommit

export interface CommitMessage {
  hash
  type: CommitType
  scope: CommitScope
  description: string
  body: string
}

// Create a function to validate the commit message based on the type and scope
export function validateCommitMessage(type: CommitType, scope: CommitScope): boolean {
  const allowedScopes = typeScopeMap[type] || []
  return allowedScopes && allowedScopes.includes(scope)
}

function validScope(scope: string): boolean {
  return allScopes.includes(scope)
}

function validType(type: string): boolean {
  return allCommitTypes.includes(type)
}

// Export the configuration for Commitlint
export const commitlintConfig = {
  rules: {
    'type-enum': [2, 'always', allowedCommitTypes],
    'scope-enum': [2, 'always', allowedCommitScopes],
    'type-scope-enum': [2, 'always', (parsed: { type: CommitType, scope: CommitScope }) => {
      const { type, scope } = parsed
      const isValidType = validType(type)
      if (!isValidType) {
        return [isValidType, `Type "${type}" is not allowed, expected one of ${allowedCommitTypes.join(", ")}`]
      }
      const isValidScope = validScope(scope)
      if (!isValidScope) {
        return [isValidScope, `Scope "${scope}" is not allowed, expected one of ${allowedCommitScopes.join(", ")}`]
      }
      const isValid = validateCommitMessage(type, scope)
      const scopeType = devScopes.includes(scope) ? "dev" : "license"
      return [isValid, `Scope "${scope}" is not allowed for type "${type},
        expected a ${scopeType} scope for type "${type}. Allowed scopes are ${typeScopeMap[type].join(", ")}`]
    }
    ]
  }
}

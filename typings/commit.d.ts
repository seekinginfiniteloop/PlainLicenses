
export interface spdxLicense {
  reference: URL
  isDeprecatedLicenseId: boolean
  detailsUrl: URL
  referenceNumber: number
  name: string // full name
  licenseId: string // SPDX ID
  seeAlso: URL[]
  isOsiApproved: boolean
}

export interface CommitMessage {
    type: string
    scope: string
    description: string
    body: string
    footer: string
    }

export type LicenseTypeT = "new" | "subs" | "admin" | "bot" | "stable"
export type DevTypeT = "fix" | "new" | "refactor" | "chore" | "bot"
export type DevScopeT = "content" | "ui" | "infra" | "deps" | "scripts" | "blog"

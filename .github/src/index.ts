import * as fs from "fs";
import * as path from "path";

const spdxFilename = "licenses.json";
const spdxJsonPath = path.join("external", "license-list-data", "json", spdxFilename);

export interface spdxLicense {
  reference: URL;
  isDeprecatedLicenseId: boolean;
  detailsUrl: URL;
  referenceNumber: number;
  name: string; // full name
  licenseId: SPDXID; // SPDX ID
  seeAlso: URL[];
  isOsiApproved: boolean;
}

/**
 * Reads the SPDX license list from the local JSON file.
 *
 * @returns An array of SPDX license IDs.
 */
function readSpdxLicenseList(): string[] {
  const data = fs.readFileSync(spdxJsonPath, "utf-8");
  const licenses: spdxLicense[] = JSON.parse(data).licenses as spdxLicense[];
  return licenses
    .filter((license) => !license.isDeprecatedLicenseId)
    .map((license) => license.licenseId);
}
export type SPDXID = typeof licenseScopes[number];

const otherScopes = ["site", "build", "hooks", "config", "ci", "deps"];
const licenseScopes = readSpdxLicenseList();
const allScopes = [...otherScopes, ...licenseScopes];

// dynamically generate the type, which is any literal from the licensesScopes array
export type CommitScope = typeof allScopes[number];

export type CommitType =
  | "subs" // Substantive changes to **licenses**
  | "admin" // Administrative changes to **licenses**
  | "fix"
  | "content"
  | "feat"
  | "script"
  | "blog"
  | "ci"
  | "refactor"
  | "config"
  | "build"
  | "chore"
  | "bot"; // not for humans

/**
 * Represents a Git commit.
 */
export interface Commit {
  hash: string;
  type: CommitType;
  scope: CommitScope | undefined;
  description: string;
  body: string;
}

// Export the allowed types and scopes for commitlint
export const allowedCommitTypes: CommitType[] = [
  "subs",
  "admin",
  "fix",
  "content",
  "feat",
  "script",
  "blog",
  "ci",
  "refactor",
  "config",
  "build",
  "chore",
  "bot",
];

export const allowedCommitScopes: CommitScope[] = allScopes;

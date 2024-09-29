import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"

import { Commit, CommitType } from "./"

const licensesDir = path.join("docs", "licenses")
const projectChangelogPath = "docs/CHANGELOG.md"

/**
 * Retrieves the most recent Git tag.
 *
 * @returns The last tag as a string, or an empty string if no tags exist.
 */
function getLastTag(): string {
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim()
  } catch (error) {
    return "" // If no tags exist yet
  }
}

/**
 * Fetches commits since the specified tag.
 *
 * @param tag - The tag to compare against.
 * @returns An array of commit strings formatted as "hash|subject|body".
 */
function getCommitsSince(tag: string): string[] {
  const command = tag
    ? `git log ${tag}..HEAD --format="%h|%s|%b"`
    : 'git log --format="%h|%s|%b"'
  return execSync(command).toString().trim().split("\n\n").filter(Boolean)
}

/**
 * Parses a commit string into a Commit object.
 *
 * @param commitString - The commit string to parse.
 * @returns The parsed Commit object or null if parsing fails.
 */
function parseCommit(commitString: string): Commit | undefined {
  const [hash, subject, body] = commitString.split("|")
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/)
  if (match) {
    const [, type, scope, description] = match
    return {
      hash,
      type: type as CommitType, // Explicitly cast to CommitType
      scope: scope || undefined,
      description,
      body
    }
  }
  return undefined
}

/**
 * Maps commit types to changelog categories.
 */
const changeCategoryMap = new Map<string, "minor" | "patch" | "other">([
  ["subs", "minor"],
  ["feat", "minor"],
  ["script", "minor"],
  ["admin", "patch"],
  ["fix", "patch"],
  ["content", "patch"]
])

/**
 * Categorizes a commit type into changelog categories.
 *
 * @param type - The type of the commit.
 * @returns The category of the change.
 */
function categorizeChange(type: string): "minor" | "patch" | "other" {
  return changeCategoryMap.get(type) || "other"
}

/**
 * Appends a changelog entry to the appropriate section.
 *
 * @param changelogSections - The sections of the changelog.
 * @param category - The category to append to.
 * @param entry - The changelog entry to append.
 */
function appendToChangelogSections(
  changelogSections: { [key: string]: string },
  category: string,
  entry: string
) {
  changelogSections[category] += entry
}

/**
 * Writes the changelog content to a specified file.
 *
 * @param filePath - The path to the file where content will be written.
 * @param content - The content to write to the file.
 */
function writeChangelogFile(filePath: string, content: string) {
  fs.writeFileSync(filePath, content)
}

/**
 * Generates an overall changelog for the project *and* changelogs for each license.
 * @returns Promise<void>
 */
async function generateChangelog(): Promise<void> {
  const lastTag = getLastTag()
  let projectChangelog = "# Changelog\n\n"
  const licenseChangelogs: { [key: string]: string } = {}

  const commits = getCommitsSince(lastTag)

  const changelogSections: { [key: string]: string } = {
    minor: "## Minor Changes\n\n",
    patch: "## Patch Changes\n\n",
    other: "## Other Changes\n\n"
  }

  commits.forEach(commit => {
    const parsedCommit = parseCommit(commit)
    if (parsedCommit) {
      const { hash, type, scope, description, body } = parsedCommit
      const changeCategory = categorizeChange(type)
      const changeEntry = `- ${type}${
        scope ? `(${scope})` : ""
      }: ${description} (${hash})\n`

      appendToChangelogSections(changelogSections, changeCategory, changeEntry)

      if (scope && scope.includes("-")) {
        if (!licenseChangelogs[scope]) {
          licenseChangelogs[scope] = "# Changelog\n\n"
        }
        licenseChangelogs[scope] += changeEntry
      }

      if (body.includes("BREAKING CHANGE:")) {
        const breakingChange = body.split("BREAKING CHANGE:")[1].trim()
        changelogSections.minor =
          `## Breaking Changes\n\n- ${breakingChange}\n\n${
            changelogSections.minor}`
      }
    }
  })

  Object.values(changelogSections).forEach(section => {
    if (section.split("\n").length > 2) {
      projectChangelog += `${section  }\n`
    }
  })

  writeChangelogFile(projectChangelogPath, projectChangelog)

  Object.entries(licenseChangelogs).forEach(([license, changelog]) => {
    const [category, name] = license.split("-")
    const licenseDir = path.join(licensesDir, category, name)
    const licenseChangelogPath = path.join(licenseDir, "CHANGELOG.md")
    writeChangelogFile(licenseChangelogPath, changelog)
  })

  // eslint-disable-next-line no-console
  console.log("Changelogs generated successfully.")
}

await generateChangelog()

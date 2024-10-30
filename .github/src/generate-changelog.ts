import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import globby from "globby";

import { CommitScope, CommitType, validateCommitMessage, CommitMessage } from "./";

interface License {
  name: string;
  type: string;
  path: string;
}

const licensePaths = await globby("docs/licenses/*/*/index.md");
const licenses = licensePaths.map((licensePath) => {
  const [type, name] = licensePath.split("/").slice(-3, -2);
  return { name, type, path: licensePath };
});

const projectChangelogPath = "docs/CHANGELOG.md";

/**
 * Get the latest tag in the git repository.
 * @function
 * @returns The latest tag in the git repository.
 */
function getLastTag(): string {
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim();
  } catch (error) {
    return "";
  }
}

/**
 * Get the commits since a given tag.
 * @function
 * @param tag - The tag to get the commits since.
 * @returns An array of commit messages.
 */
function getCommitsSince(tag: string): string[] {
  const command = tag
    ? `git log ${tag}..HEAD --format="%h|%s|%b"`
    : 'git log --format="%h|%s|%b"';
  return execSync(command).toString().trim().split("\n\n").filter(Boolean);
}

/**
 * Parse a commit message into its parts.
 * @function
 * @param commitString - The commit message to parse.
 * @returns The parsed commit message.
 */
function parseCommit(commitString: string): CommitMessage | undefined {
  const [hash, subject, body] = commitString.split("|");
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
  if (match) {
    const [, type, scope, description] = match;
    if (!validateCommitMessage(type, scope)) {
      return undefined;
    }
    return {
      hash,
      type: type as CommitType,
      scope: scope as CommitScope,
      description,
      body
    };
  }
  return undefined;
}

const changeCategoryMap = new Map<string, "minor" | "patch" | "other">([
  ["subs", "minor"],
  ["feat", "minor"],
  ["script", "minor"],
  ["admin", "patch"],
  ["fix", "patch"],
  ["content", "patch"]
]);

/**
 * Categorize a change into minor, patch, or other based on the CommitType.
 * @function
 * @param type - The type of change.
 * @returns The category of the change.
 */
function categorizeChange(type: string): "minor" | "patch" | "other" {
  return changeCategoryMap.get(type) || "other";
}

/**
 * Write a changelog file to the given path.
 * @function
 * @param filePath - The path to write the changelog file to.
 * @param content - The content of the changelog file.
 */
function writeChangelogFile(filePath: string, content: string) {
  fs.writeFileSync(filePath, content);
}

/**
 * Generate a changelog for the project and each license.
 * @function
 */
async function generateChangelog(): Promise<void> {
  const lastTag = getLastTag();
  let projectChangelog = "# Changelog\n\n";
  const licenseChangelogs: { [key: string]: string } = {};

  const commits = getCommitsSince(lastTag);

  const changelogSections = commits.reduce((sections, commit) => {
    const parsedCommit = parseCommit(commit);
    if (parsedCommit) {
      const { hash, type, scope, description, body } = parsedCommit;
      const changeCategory = categorizeChange(type);
      const changeEntry = `- ${type}${scope ? `(${scope})` : ""}: ${description} (${hash})\n`;

      sections[changeCategory] += changeEntry;

      if (scope && scope.includes("-")) {
        if (!licenseChangelogs[scope]) {
          licenseChangelogs[scope] = "# Changelog\n\n";
        }
        licenseChangelogs[scope] += changeEntry;
      }

      if (body.includes("BREAKING CHANGE:")) {
        const breakingChange = body.split("BREAKING CHANGE:")[1].trim();
        sections.minor = `## Major Update\n\n- ${breakingChange}\n\n${sections.minor}`;
      }
    }
    return sections;
  }, {
    minor: "## Minor Changes\n\n",
    patch: "## Patches\n\n",
    other: "### Other Changes\n\n"
  });

  Object.values(changelogSections).forEach(section => {
    if (section.split("\n").length > 2) {
      projectChangelog += `${section}\n`;
    }
  });

  writeChangelogFile(projectChangelogPath, projectChangelog);

  Object.entries(licenseChangelogs).forEach(([license, changelog]) => {
    const [category, name] = license.split("-");
    const licenseDir = path.join(licensesDir, category, name);
    const licenseChangelogPath = path.join(licenseDir, "CHANGELOG.md");
    writeChangelogFile(licenseChangelogPath, changelog);
  });

  console.log("Changelogs generated successfully.");
}

await generateChangelog();

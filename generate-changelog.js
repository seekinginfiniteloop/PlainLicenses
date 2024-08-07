const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const licensesDir = path.join(__dirname, "docs", "licenses");
const projectChangelogPath = path.join(__dirname, "CHANGELOG.md");

function getLastTag() {
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim();
  } catch (error) {
    return ""; // If no tags exist yet
  }
}

function getCommitsSince(tag) {
  const command = tag
    ? `git log ${tag}..HEAD --format="%h|%B"`
    : `git log --format="%h|%B"`;
  return execSync(command).toString().trim().split("\n\n").filter(Boolean);
}

function parseCommit(commitString) {
  const [hash, ...messageLines] = commitString.split("|");
  return messageLines
    .map((line) => {
      const match = line.match(/^(\w+)\(([^)]+)\):\s*(.+)$/);
      if (match) {
        const [, type, scope, description] = match;
        return { hash, type, scope, description };
      }
      return null;
    })
    .filter(Boolean);
}

function categorizeChange(type) {
  if (["legal", "equivalence"].includes(type)) {
    return "major";
  }
  if (["rephrase", "restructure", "add", "remove"].includes(type)) {
    return "minor";
  }
  if (["typo", "grammar", "format", "clarify"].includes(type)) {
    return "patch";
  }
  return "non-license";
}

function generateChangelog() {
  const lastTag = getLastTag();
  let projectChangelog = "# Project Changelog\n\n";
  const licenseChangelogs = {};
  let nonLicenseChangelog = "## Non-License Changes\n\n";

  const commits = getCommitsSince(lastTag);

  commits.forEach((commit) => {
    const parsedCommits = parseCommit(commit);
    parsedCommits.forEach(({ hash, type, scope, description }) => {
      const changeCategory = categorizeChange(type);
      const changeEntry = `- ${type}(${scope}): ${description} (${hash})\n`;

      if (changeCategory === "non-license") {
        nonLicenseChangelog += changeEntry;
      } else {
        // Add to project changelog
        if (!projectChangelog.includes(`## ${scope}\n`)) {
          projectChangelog += `## ${scope}\n\n`;
        }
        projectChangelog += changeEntry;

        // Add to license changelog
        if (!licenseChangelogs[scope]) {
          licenseChangelogs[scope] = `# ${scope} Changelog\n\n`;
        }
        if (!licenseChangelogs[scope].includes(`## ${changeCategory}\n`)) {
          licenseChangelogs[scope] += `## ${changeCategory}\n\n`;
        }
        licenseChangelogs[scope] += changeEntry;
      }
    });
  });

  // Add non-license changes to project changelog
  projectChangelog += nonLicenseChangelog;

  // Write project changelog
  fs.writeFileSync(projectChangelogPath, projectChangelog);

  // Write individual license changelogs
  Object.entries(licenseChangelogs).forEach(([license, changelog]) => {
    const licenseDir = path.join(licensesDir, license.split("-")[0], license);
    const licenseChangelogPath = path.join(licenseDir, "CHANGELOG.md");
    fs.writeFileSync(licenseChangelogPath, changelog);
  });

  console.log("Changelogs generated successfully.");
}

generateChangelog();

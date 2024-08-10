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
    ? `git log ${tag}..HEAD --format="%h|%s|%b"`
    : `git log --format="%h|%s|%b"`;
  return execSync(command).toString().trim().split("\n\n").filter(Boolean);
}

function parseCommit(commitString) {
  const [hash, subject, body] = commitString.split("|");
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
  if (match) {
    const [, type, scope, description] = match;
    return { hash, type, scope, description, body };
  }
  return null;
}

function categorizeChange(type) {
  if (["subs", "feat", "script"].includes(type)) {
    return "minor";
  }
  if (["admin", "fix", "content"].includes(type)) {
    return "patch";
  }
  return "other";
}

function generateChangelog() {
  const lastTag = getLastTag();
  let projectChangelog = "# Changelog\n\n";
  const licenseChangelogs = {};

  const commits = getCommitsSince(lastTag);

  const changelogSections = {
    minor: "## Minor Changes\n\n",
    patch: "## Patch Changes\n\n",
    other: "## Other Changes\n\n",
  };

  commits.forEach((commit) => {
    const parsedCommit = parseCommit(commit);
    if (parsedCommit) {
      const { hash, type, scope, description, body } = parsedCommit;
      const changeCategory = categorizeChange(type);
      const changeEntry = `- ${type}${
        scope ? `(${scope})` : ""
      }: ${description} (${hash})\n`;

      changelogSections[changeCategory] += changeEntry;

      if (scope && scope.includes("-")) {
        // Assuming scope includes license name
        if (!licenseChangelogs[scope]) {
          licenseChangelogs[scope] = "# Changelog\n\n";
        }
        licenseChangelogs[scope] += changeEntry;
      }

      if (body.includes("BREAKING CHANGE:")) {
        const breakingChange = body.split("BREAKING CHANGE:")[1].trim();
        changelogSections.minor =
          `## Breaking Changes\n\n- ${breakingChange}\n\n` +
          changelogSections.minor;
      }
    }
  });

  Object.values(changelogSections).forEach((section) => {
    if (section.split("\n").length > 2) {
      // Only add non-empty sections
      projectChangelog += section + "\n";
    }
  });

  // Write project changelog
  fs.writeFileSync(projectChangelogPath, projectChangelog);

  // Write individual license changelogs
  Object.entries(licenseChangelogs).forEach(([license, changelog]) => {
    const [category, name] = license.split("-");
    const licenseDir = path.join(licensesDir, category, name);
    const licenseChangelogPath = path.join(licenseDir, "CHANGELOG.md");
    fs.writeFileSync(licenseChangelogPath, changelog);
  });

  console.log("Changelogs generated successfully.");
}

generateChangelog();

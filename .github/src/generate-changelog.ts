import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Generates changelogs for the project and its licenses based on Git commit history.
 *
 * This script retrieves the last Git tag, collects commits since that tag, and organizes them into a structured changelog format. It also generates individual changelogs for licenses if applicable.
 */

const licensesDir = path.join('..', 'docs', 'licenses');
const projectChangelogPath = path.join(__dirname, 'CHANGELOG.md');

/**
 * Retrieves the most recent Git tag.
 *
 * @returns {string} The last tag as a string, or an empty string if no tags exist.
 */
function getLastTag(): string {
    try {
        return execSync('git describe --tags --abbrev=0').toString().trim();
    } catch (error) {
        return ''; // If no tags exist yet
    }
}

/**
 * Fetches commits since the specified tag.
 *
 * @param {string} tag - The tag to compare against.
 * @returns {string[]} An array of commit strings formatted as "hash|subject|body".
 */
function getCommitsSince(tag: string): string[] {
    const command = tag
        ? `git log ${tag}..HEAD --format="%h|%s|%b"`
        : 'git log --format="%h|%s|%b"';
    return execSync(command).toString().trim().split('\n\n').filter(Boolean);
}

/**
 * Represents a Git commit.
 */
interface Commit {
    hash: string;
    type: string;
    scope: string | null;
    description: string;
    body: string;
}

/**
 * Parses a commit string into a Commit object.
 *
 * @param {string} commitString - The commit string to parse.
 * @returns {Commit | null} The parsed Commit object or null if parsing fails.
 */
function parseCommit(commitString: string): Commit | null {
    const [hash, subject, body] = commitString.split('|');
    const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
    if (match) {
        const [, type, scope, description] = match;
        return { hash, type, scope: scope || null, description, body };
    }
    return null;
}

/**
 * Maps commit types to changelog categories.
 */
const changeCategoryMap = new Map<string, 'minor' | 'patch' | 'other'>([
    ['subs', 'minor'],
    ['feat', 'minor'],
    ['script', 'minor'],
    ['admin', 'patch'],
    ['fix', 'patch'],
    ['content', 'patch'],
]);

/**
 * Categorizes a commit type into changelog categories.
 *
 * @param {string} type - The type of the commit.
 * @returns {'minor' | 'patch' | 'other'} The category of the change.
 */
function categorizeChange(type: string): 'minor' | 'patch' | 'other' {
    return changeCategoryMap.get(type) || 'other';
}

/**
 * Appends a changelog entry to the appropriate section.
 *
 * @param {Object} changelogSections - The sections of the changelog.
 * @param {string} category - The category to append to.
 * @param {string} entry - The changelog entry to append.
 */
function appendToChangelogSections(changelogSections: { [key: string]: string }, category: string, entry: string) {
    changelogSections[category] += entry;
}

/**
 * Writes the changelog content to a specified file.
 *
 * @param {string} filePath - The path to the file where content will be written.
 * @param {string} content - The content to write to the file.
 */
function writeChangelogFile(filePath: string, content: string) {
    fs.writeFileSync(filePath, content);
}

/**
 * Generates the project changelog and individual license changelogs.
 */
function generateChangelog(): void {
    const lastTag = getLastTag();
    let projectChangelog = '# Changelog\n\n';
    const licenseChangelogs: { [key: string]: string } = {};

    const commits = getCommitsSince(lastTag);

    const changelogSections: { [key: string]: string } = {
        minor: '## Minor Changes\n\n',
        patch: '## Patch Changes\n\n',
        other: '## Other Changes\n\n',
    };

    commits.forEach((commit) => {
        const parsedCommit = parseCommit(commit);
        if (parsedCommit) {
            const { hash, type, scope, description, body } = parsedCommit;
            const changeCategory = categorizeChange(type);
            const changeEntry = `- ${type}${scope ? `(${scope})` : ''}: ${description} (${hash})\n`;

            appendToChangelogSections(changelogSections, changeCategory, changeEntry);

            if (scope && scope.includes('-')) {
                if (!licenseChangelogs[scope]) {
                    licenseChangelogs[scope] = '# Changelog\n\n';
                }
                licenseChangelogs[scope] += changeEntry;
            }

            if (body.includes('BREAKING CHANGE:')) {
                const breakingChange = body.split('BREAKING CHANGE:')[1].trim();
                changelogSections.minor =
                    `## Breaking Changes\n\n- ${breakingChange}\n\n` +
                    changelogSections.minor;
            }
        }
    });

    Object.values(changelogSections).forEach((section) => {
        if (section.split('\n').length > 2) {
            projectChangelog += section + '\n';
        }
    });

    writeChangelogFile(projectChangelogPath, projectChangelog);

    Object.entries(licenseChangelogs).forEach(([license, changelog]) => {
        const [category, name] = license.split('-');
        const licenseDir = path.join(licensesDir, category, name);
        const licenseChangelogPath = path.join(licenseDir, 'CHANGELOG.md');
        writeChangelogFile(licenseChangelogPath, changelog);
    });

    console.log('Changelogs generated successfully.');
}

generateChangelog();

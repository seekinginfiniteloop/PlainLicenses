# Contributing to Plain License

## Commit Message Format

We use a structured commit message format to automatically generate changelogs and determine version increments. Please format your commit messages as follows:

`<type>(<scope>): <description>`

Where `<type>` is one of the following:

### Types for Version Increments

| Type | Minor | Patch | For **Licenses** | For **Everything Else** | Description |
| ---+ | ---+ | ---+ | ---+ | ---+ | ---+ |
| `subs` | ✓ | | ✓ | | Substantive changes to licenses |
| `admin` | | ✓ | ✓ | | Administrative changes to licenses |
| `feat` | ✓ | | | ✓ | New features |
| `script` | ✓ | | | ✓ | *Additions* to project scripts |
| `fix` | | ✓ | | ✓ | Bug fixes |
| `content` | | ✓ | | ✓ | Site content changes |


### Types that Don't Affect Version Increments

| Type | For **Everything Else** | Description |
| ---+ | ---+ | ---+ |
| `blog` | ✓ | Blog post updates |
| `ci` | ✓ | Changes to CI configuration files and to scripts |
| `refactor` | ✓ | Code refactoring without feature changes |
| `config` | ✓ | Configuration changes |
| `build` | ✓ | Changes that affect the build system |
| `chore` | ✓ | Routine tasks and maintenance |

### Using Types

The `<scope>` for licenses should be the SPDX identifier (e.g., MIT, Apache-2.0) of the license you modified. For other changes, use the area of the project affected (use any of: `site`, `build`, `hooks`, `config`, `ci`).


Examples:

- `subs(MIT): Clarify liability clause`
- `feat(docs): Add interactive license chooser`
- `fix(Apache-2.0): Correct typo in patent grant`
- `blog(weekly): Add new post about license compatibility`
- `ci(github-actions): Update Node.js version`
- `script(build): Optimize asset compilation`

For commits affecting multiple licenses, use multiple commit messages.

## Pull Request Process

1. Ensure your code adheres to the project's coding standards.
2. Update the README.md or documentation with details of changes, if applicable.
3. Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/).
4. Your Pull Request will be merged once it has been approved by two other developers.

Thank you for your contributions!

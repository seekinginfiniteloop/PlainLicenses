# Contributing to PlainLicense

We welcome contributions from the community to help make PlainLicense better and more comprehensive.
Here's how you can get involved:

# Contributing to Plain License

## Commit Message Format

Please format your commit messages as follows:

`<type>(<scope>): <description>`

Where `<type>` is one of the following:

### License Changes:

#### Major Changes (1.0.0):

- `legal`: Changes affecting legal enforceability
- `equivalence`: Changes impacting equivalence to the original license

#### Minor Changes (0.0.0):

- `rephrase`: Substantial rephrasing of license text
- `restructure`: Reorganizing sections of the license
- `add`: Adding new components or clauses
- `remove`: Removing components or clauses

#### Patch Changes (0.0.1):

- `typo`: Fixing typos
- `grammar`: Minor grammatical changes
- `format`: Changes in formatting or presentation
- `clarify`: Small changes to improve clarity without changing meaning

### Non-License Changes:

- `content`: Changes to site content (non-license)
- `ci`: Changes to CI/CD pipeline
- `script`: Changes to hook scripts or other project scripts
- `docs`: Changes to project documentation
- `config`: Changes to configuration files
- `style`: Changes that do not affect the meaning (white-space, formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `chore`: Other changes that don't modify src or test files

The `<scope>` should be:

- For license changes: the name of the license being modified, we use the SPDX name (e.g., MIT, GPL-3.0)
- For non-license changes: a brief identifier of the affected component (e.g., homepage, ci-workflow, pre-commit)

Examples:

- `legal(MIT): Update liability clause due to recent court decision`
- `content(homepage): Update project description`
- `ci(release): Add semantic-release to the workflow`
- `script(pre-commit): Add changelog generation to pre-commit hook`

For commits affecting multiple components, use multiple commit messages:

- `rephrase(MIT): Clarify termination clause`
- `content(faq): Add question about license compatibility`

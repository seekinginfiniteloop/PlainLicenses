---
template: main.html
title: "Contributing to Plain License: A Beginner's Guide"
description: "Committing to Plain License: A Beginner's Guide"
---
# Contributing to Plain License: A Beginner's Guide

We're excited that you want to contribute to Plain License! This guide will help you get started, whether you're new to open source or an experienced developer.

You can find a complete guide to all of the ways you can contribute to Plain license at our [Helping][helping] page.

## Ways to Contribute

1.  **Suggest changes or report issues**: If you have ideas for improvements or find problems, you can [open an "Issue"][newissue] on our GitHub page. This doesn't require any experience with markdown, git, or coding!

2.  **Contribute directly**: If you're comfortable with Git and GitHub, you can [make changes and submit them][git-instructions] as a ["Pull Request"][pulling] (PR).

3.  **Discuss**: Join [our discussions][discussions] on GitHub to share your thoughts and ideas.

## How to Contribute (Step-by-Step)

### Suggesting Changes or Reporting Issues: For Non-Developers

1. Open a [new issue][newissue] on our [GitHub repository][plrepo] page.
2. Describe your suggestion or the problem you've found.
3. Click "Submit new issue".

### Making Direct Changes: For Developers and People Who Know (or Want to Learn) Git

1. [Fork the repository][forking] on GitHub.
2. [Clone your fork][cloning] to your local machine.
3. [Create a new branch][newbranch] for your changes.
4. Make your changes in your new branch.
5. [Commit your changes][committing] with a clear message (see "[Commit Message Format][commitformat]" below).
6. [Push your changes][pushing] to your fork on GitHub (to the forked repository on your Github account).
7. Go to [our repository][plrepo] and create a [Pull Request][pulling] from your branch.

## Commit Message Format

When you make changes, **we use a specific format for commit messages**. This helps us track changes and update version numbers automatically. Here's the format:

```git
<type>(<scope>): <description>
```

`type` is the kind of change you made. `scope` is the part of the project you changed. `description` is a short summary of your changes.
You must prove all three, and they should all be lower case.

### License Types and Scopes

<type>(<scope>): <short summary>
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: [SPDX-ID](https://spdx.org/licenses/)
  │
  │
  │
  │
  └─⫸ Commit Type: new | subs | admin | bot

#### License Types

When you make changes **to a license**, use the following types:

| Type (for licenses) | Description | Version Increment |
| ---+ | ---+ | ---+ |
| `subs` | substantive changes | minor |
| `admin` | administrative changes | minor |
| `new` | new licenses | minor |

#### License Scopes

For licenses, **use the license's lower-case SPDX identifier as the scope**. For example, if you're changing the MIT license, use `mit` as the scope. A full list of SPDX identifiers is available [here][spdx].

For Plain License original licenses, use the code in the license's URL as the scope. If it's a new license, use `plain-` followed by a name that describes the license and follows the SPDX convention.

### Site and Development Types and Scopes

<type>(<scope>): <short summary>
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: content | ui | infra | deps | blog | scripts
  │
  │
  │
  │
  └─⫸ Commit Type: fix | refactor | new | chore | bot

#### Site and Development Types

For all other changes, use the following types:

| Type | Description | Version Increment |
| ---+ | ---+ | ---+ |
| `new` | new features | minor |
| `fix` | bug fixes | patch |
| `refactor` | refactoring/reorganizing | minor |
| `chore` | routine tasks and maintenance | patch |

#### Site and Development Scopes

| Scope | Description |
| ---+ | ---+ |
| `content` | changes to the content of the site, not including licenses or blog posts|
| `ui` | changes to the user interface or site styling |
| `infra` | changes to the site's infrastructure or build process, including CI/CD and configs |
| `deps` | changes to dependencies or package management |
| `scripts` | changes to scripts or automation |
| `blog` | changes to blog posts or blog content |

### Using Types

The `<scope>` for licenses should be the [SPDX identifier][spdx] (e.g., MIT, Apache-2.0) of the license you modified. For other changes, use the area of the project affected (use any of: `site`, `build`, `hooks`, `config`, `ci`).

Examples:

- `new(content): add interactive license chooser`
- `subs(apache-2.0): correct typo in patent grant section`
- `new(blog): Add new post about license compatibility`
- `refactor(infra): reorganized ci/cd pipeline`
- `fix(ui): fixed broken link in footer`
- `chore(deps): update dependencies to latest versions`

### Keep Your Changes Small

**Try to keep your changes small and focused**. This makes it easier for us to review and accept your PR. If you have a large change in mind, consider breaking it into smaller parts.

Commits should have one scope and one type. If you need to make changes to multiple scopes, make multiple commits.

## Need Help?

If you're unsure about anything, don't hesitate to ask for help in the [Issues section][issues] or in [discussions][discussions]. We're here to support new contributors!

Thank you for helping make Plain License better for everyone!

[helping]: index.md "Helping Plain License"
[issues]: {{ config.repo_url | trim }}/issues "Plain License issues"
[newissue]: {{ config.repo_url | trim }}/issues/new/choose "Create a new issue"
[discussions]: {{ config.repo_url | trim }}/discussions "Plain License discussions"
[forking]: <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo> "Forking a repository"
[cloning]: <https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository> "Cloning a repository"
[newbranch]: <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository> "Creating a new branch"
[pushing]: <https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository> "Pushing changes to a remote repository"
[committing]: <https://github.com/git-guides/git-commit> "Committing changes to a repository"
[commitformat]: #commit-message-format "Plain License commit message format"
[plrepo]: {{ config.repo_url | trim }} "Plain License repository"
[git-instructions]: #making-direct-changes-for-developers-and-people-who-know-or-want-to-learn-git "Jump to Git instructions"
[pulling]: <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request> "Creating a pull request"
[spdx]: <https://spdx.org/licenses/> "SPDX licenses"

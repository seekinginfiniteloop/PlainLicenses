---
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

When you make changes, **we use a special format for commit messages**. This helps us track changes and update version numbers automatically. Here's the format:

```git
<type>(<scope>): <description>
```

`type` is the kind of change you made. `scope` is the part of the project you changed. `description` is a short summary of your changes.

### Types and Their Meanings

### Types that Increment the Version

| Type | Minor | Patch | For **Licenses** | For **Everything Else** | Description |
| ---+ | ---+ | ---+ | ---+ | ---+ | ---+ |
| `subs` | ✓ | | ✓ | | Substantive changes *to a license* |
| `admin` | | ✓ | ✓ | | Administrative changes *to a license* |
| `feat` | ✓ | | | ✓ | New features |
| `script` | ✓ | | | ✓ | *Additions* to project scripts |
| `fix` | | ✓ | | ✓ | Bug fixes |
| `content` | | ✓ | | ✓ | Site content changes |

### Types that Don't Increment the Version

| Type | For **Everything Else** | Description |
| ---+ | ---+ | ---+ |
| `blog` | ✓ | Blog post updates |
| `ci` | ✓ | Changes to CI configuration files and to scripts |
| `refactor` | ✓ | Code refactoring without feature changes |
| `config` | ✓ | Configuration changes |
| `build` | ✓ | Changes that affect the build system |
| `chore` | ✓ | Routine tasks and maintenance |
| `bot` | ✓ | Changes made by bots |

### Using Types

The `<scope>` for licenses should be the [SPDX identifier][spdx] (e.g., MIT, Apache-2.0) of the license you modified. For other changes, use the area of the project affected (use any of: `site`, `build`, `hooks`, `config`, `ci`).

Examples:

- `subs(MIT): Clarify liability clause`
- `feat(site): Add interactive license chooser`
- `fix(Apache-2.0): Correct typo in patent grant`
- `blog(site): Add new post about license compatibility`
- `ci(ci): Update Node.js version`
- `script(hooks): fixed regex for license headers`

### Commits to More than One Scope

<div class="annotate" markdown>
| scopes | commit message |
| +--- | +--- |
| if your commit changes *more than one*... | use... |
| *license* page | one commit for each license page (1) |
| *non-license* page | one commit with multiple scopes |

</div>

1. You can include multiple scopes in a commit message if they all affect one license page.

We need to keep licenses changes separate to make sure we track their changes correctly.

Thank you for your contributions!

## Need Help?

If you're unsure about anything, don't hesitate to ask for help in the [Issues section][issues] or in [discussions][discussions]. We're here to support new contributors!

Thank you for helping make Plain License better for everyone!

[helping]: index.md "Helping Plain License"
[issues]: {{ config.repo_url }}/issues "Plain License issues"
[newissue]: {{ config.repo_url }}/issues/new/choose "Create a new issue"
[discussions]: {{ config.repo_url }}/discussions "Plain License discussions"
[forking]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo "Forking a repository"
[cloning]: https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository "Cloning a repository"
[newbranch]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository "Creating a new branch"
[pushing]: https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository "Pushing changes to a remote repository"
[committing]: https://github.com/git-guides/git-commit "Committing changes to a repository"
[commitformat]: #commit-message-format "Plain License commit message format"
[plrepo]: {{ config.repo_url }} "Plain License repository"
[git-instructions]: #making-direct-changes-for-developers-and-people-who-know-or-want-to-learn-git "Jump to Git instructions"
[pulling]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request "Creating a pull request"
[spdx]: https://spdx.org/licenses/ "SPDX licenses"

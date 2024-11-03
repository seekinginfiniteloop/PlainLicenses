---
template: main.html
title: License Crafting Guide
description: Learn how to contribute to Plain License by crafting new licenses or improving existing ones.
---
# Contributing Licenses to Plain License

We welcome contributions to Plain License, whether you're proposing a new license or suggesting changes to an existing one. This guide will walk you through the process for both scenarios.

## Before You Start

You should read our writing guidelines to help you craft a license that is clear, concise, and easy to understand. You can find these guidelines on our [Writing Guidelines page][writing].

## Contributing a New License

To contribute a new license, you'll use our `LICENSE_TEMPLATE.md` file. This template uses "front matter" to generate the actual license page consistently across all licenses.

### Option 1: Using Git and GitHub

1.  Fork the Plain License repository on GitHub.
2.  Clone your fork to your local machine.
3.  Copy the `LICENSE_TEMPLATE.md` file and rename it to match your new license (e.g., `NEW-LICENSE.md`).
4.  Fill out the front matter in your new file. This includes:

     - License metadata (name, SPDX identifier, etc.)
     - The full text of the license
     - Any additional notes or explanations

5.  Commit your changes with a message following [our commit format][commits], `SPDX-ID` should be the [SPDX identifier][spdx] of the license you're adding:

      ```git
      subs(spdx-id): Add SPDX-ID to Plain License
      ```

6.  Push your changes to your fork on GitHub.
7.  Create a Pull Request from your fork to the main Plain License repository.

### Option 2: Using GitHub Issues

If you're not comfortable with Git, you can contribute using GitHub Issues:

1. Go to the Plain License repository on GitHub.
2. Download the `LICENSE_TEMPLATE.md` file.
3. Rename it to match your new license (e.g., `NEW-LICENSE.md`).
4. Fill out the front matter as described in #4 above. You can use a text editor or markdown editor.
5. Go to the "Issues" tab on the Plain License repository.
6. Click "New Issue".
7. Attach your filled-out template file to the issue.
8. Provide a clear title and description for your new license contribution.

## Changing an Existing License

To suggest changes to an existing license:

1. Navigate to the license page you want to modify on the Plain License website.
2. Click the "Edit" link in the top right corner of the page.
3. This will take you to the GitHub page for that license's template file.

From here, you have the same two options for contributing a new license: you can either [use git][option1] and GitHub, or you can download the file and [submit it as an issue][option2].

If your change is minor, your commit message should be something like:

```git
admin(spdx-id): Fixed a typo in the 'sharing' section
```

## Understanding the License Template

The `LICENSE_TEMPLATE.md` file is the heart of our license system. It helps us maintain consistency across all licenses. There are detailed instructions for each field in the template, but here are a few key points:

- The content between the `---` markers is called "front matter".
- This front matter is used to generate different versions and views of the license.
- Anything below the `---` markers will appear at the top of the license page.

## Need Help?

If you're unsure about any part of the process, don't hesitate to open an issue or post in discussions asking for help. We're here to help make your contribution as smooth as possible! Don't be afraid to try, either -- git is forgiving. If you make a mistake, we can always fix it.

Thank you for helping to improve Plain License for everyone!

[commits]: commit.md#commit-message-format "Commit Message Guidelines"
[spdx]: https://spdx.org/licenses/ "SPDX License List"
[option1]: #option-1-using-git-and-github "Using Git and GitHub"
[option2]: #option-2-using-github-issues "Using GitHub Issues"
[writing]: write.md "Writing Guidelines"

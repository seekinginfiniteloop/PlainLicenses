---
template: main.html
title: Developer Contributions
description: "How developers can contribute to Plain License"
---
# Developer Contributions

We want developers of all skill levels to contribute to Plain License. Whether you're a beginner or an expert, there are many ways you can help us make licenses easier to understand.

- **Submit an Issue**: Suggest a feature improvement, fix a styling or rendering bug, or streamline our [CI][ci] process. You can submit an issue on our [GitHub Issues page][issues]. Be sure to include a clear description of the problem and any suggestions for how to fix it.
- **Submit a Pull Request**: If you're comfortable with Git and GitHub, you can submit a pull request to fix an issue or add a new feature. We welcome contributions of all sizes, from small typo fixes to large feature additions. Any significant changes should start with [an issue][issues] to discuss the proposed changes.
- **Refactor Our Code**: If you're a developer who enjoys refactoring code, we have plenty of opportunities for you to help. Refactoring can help improve the readability, maintainability, and performance of our codebase.

## Getting Started

**We use a special commit message format** to help us keep track of changes. Before you start contributing, please read our [commit message guidelines][commit-guidelines].

## A Tour of Our Codebase

-   **Framework**: We use [Material for][mkmaterial] [MKDocs][mkdocs] to generate our site. For most pages, we write content in Markdown in the [`docs`][docs] folder. The ['mkdocs.yml'][mkdocs-yml] file in the root directory contains the configuration for the site (more on the configuration [below][config]). MKDocs is powered by [Jinja2][jinja] templates, which we use to generate the site's pages. We use some custom templates in the `overrides` folder to customize the site's appearance. If you see something like this in a markdown page: {% raw %}`{{ variable.path }}`{% endraw %}, it's a Jinja2 template variable that gets replaced with the value of `variable.path` when the page is rendered.
-   **Licenses**: Licenses are in .md files by category and license name in the [`licenses`][licenses] folder. Each license file contains the license text and metadata in YAML front matter. We use an MKDocs hook, in [`overrides/hooks/license_factory.py`][licensehook], to generate the license pages from the template and metadata. Most licenses don't have actual markdown content, but if they do, it will render at the top of the page before the standard license layout.
-   **Other Hooks**: We use other hooks for smaller tasks, like updating the changelogs or inserting variables for the jinja environment. All hooks are in the `overrides/hooks` directory and must be Python files.
-   **CI/CD**: We use GitHub Actions for our CI/CD process. The configuration files are in the `.github/workflows` directory. Supporting CI/CD scripts are in the [`.github/scripts`][ciscripts] directory. The most important script is `generate_changelog.js`, which updates the changelog with each release. We aim to automate as much of the process as possible to ensure consistency and reliability.
-   **Overrides**: We use the `overrides` folder to store any files that override the default behavior of MKDocs.  MKDocs looks for files that match the names of its defaults in this folder and automatically uses the overrides in the build process. The `overrides` folder includes:

    - `overrides`: custom page templates. Primary templates are in the main `overrides` folder, while 'partials' are in the `overrides/partials` folder. Jinja2 allows for 'template inheritance,' so you can create a base template and extend it in other templates. Our landing page and license pages use this feature.
    - `hooks`: custom hooks for MKDocs. These are Python files that run at specific points in the build process. We use hooks to assemble license pages, update the changelog, and more.
    - `.icons`: custom icons for the site. We use SVG icons for consistency and scalability.
    - `partials`: partial templates for the site. These are smaller templates that can be included in other templates. We use partials for consistent headers, footers, and other elements across the site, or to change the appearance of specific elements on specific pages.
    - `plugins`: custom plugins for MKDocs. We use plugins when we need to keep state across the build process or when we need to modify the site's behavior in a way that isn't possible with hooks or templates. We use plugins sparingly, as they can make the site harder to maintain. The most important plugin is `shame_counter.py`, which tracks statistics across licenses we have recrafted for their use of complex words and readability. Right now, this is still in development, but we hope to have it fully operational soon.

-   **Front-end Scripts**: We use a few front-end scripts to improve the site's appearance and functionality. **The versions you should edit are in the root `src` folder**. These are typescript files that compile to javascript. They compile to the `docs/assets/javascripts` folder. They are pretty simple and well-documented, but the most complicated is `hero_shuffle.ts`, which handles the image rotation, and per-image-settings, on the landing page. It could probably use a refactor, but it works for now.
-   **Styles**: We significantly customize the default Material for MKDocs theme. Like scripts, the **versions of css files to edit are in the `src/assets/stylesheets`** folder. It's probably obvious, but `colors.css` sets all of the base color variables for the site, `extra.css` handles most of the added styling across the site, `home.css` and `heroimages.css` is for the landing page, and `license.css` is for the license pages.
-   **Helper Scripts**: Any development helper scripts are in the `scripts` folder. These are usually python scripts that help with the development process; if you want to make all of our jobs easier, drop a script in here. The `image_conversion.py` script saves images for the landing page at multiple sizes -- the input image should be at least 3840 pixels wide.

### The MKDocs Configuration

The `mkdocs.yml` file in the root directory is the configuration file for the site. It tells MKDocs how to build the site, what pages to include, and how to format the pages. The configuration file is in [YAML][yamlspec]. We heavily use the `extra` field to pass variables to the Jinja2 templates. This keeps the templates flexible, and allows us to change the site's appearance without changing the templates themselves. It also lets us update only one file when we need to change something site-wide.

[ci]: https://en.wikipedia.org/wiki/Continual_improvement_process "Continual Improvement Process"
[issues]: {{ config.repo_url | trim }}/issues "Submit an Issue"
[commit-guidelines]: commit.md "Commit Message Guidelines"
[licenses-contributions]: crafting.md "Recrafting Licenses"
[mkmaterial]: <https://squidfunk.github.io/mkdocs-material/> "Material for MkDocs"
[mkdocs]: <https://www.mkdocs.org/> "MkDocs"
[jinja]: <https://jinja.palletsprojects.com> "Jinja2 documentation"
[docs]: {{ config.repo_url | trim }}/docs "Our Docs Folder"
[mkdocs-yml]: {{ config.repo_url | trim }}/mkdocs.yml "our mkdocs.yml configuration file"
[config]: #the-mkdocs-configuration "MKDocs Configuration"
[yamlspec]: <https://yaml.org/> "YAML Specification"
[licenses]: {{ config.repo_url | trim }}/docs/licenses "Licenses Folder"
[licensehook]: {{ config.repo_url | trim }}/overrides/hooks/license_factory.py "License Assembly Hook"
[ciscripts]: {{ config.repo_url | trim }}/.github/scripts "CI/CD Scripts"

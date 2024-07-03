import os
from functools import partial

# Define the content for the files

mkdocs_yml_content = """site_name: PlainLicense
theme:
  name: material

nav:
  - English:
      - Home: en/index.md
      - Licenses:
          - PlainMIT: en/licenses/plainmit.md
          - PlainGPLv2: en/licenses/plaingplv2.md
          - PlainGPLv3: en/licenses/plaingplv3.md
          - PlainLGPLv2: en/licenses/plainlgplv2.md
          - PlainLGPLv3: en/licenses/plainlgplv3.md
          - PlainApachev2: en/licenses/plainapachev2.md
          - PlainBSDv2: en/licenses/plainbsdv2.md
          - PlainAGPLv3: en/licenses/plainagplv3.md
          - PlainMPLv2: en/licenses/plainmplv2.md
"""

ci_yml_content = """name: CI/CD

on:
  push:
    paths:
      - 'docs/en/licenses/*'
      - 'docs/en/versions/*'
  pull_request:
    paths:
      - 'docs/en/licenses/*'
      - 'docs/en/versions/*'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install mkdocs mkdocs-material

      - name: Build the site
        run: mkdocs build

      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site

  lint:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.x'

      - name: Install linting tools
        run: |
          pip install markdownlint-cli
          npm install -g markdown-link-check

      - name: Run markdownlint
        run: markdownlint docs/**/*.md

      - name: Check links
        run: markdown-link-check docs/**/*.md
"""

release_yml_content = """name: Release

on:
  push:
    paths:
      - 'docs/en/licenses/*'
      - 'docs/en/versions/*'

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'

      - name: Install dependencies
        run: npm install

      - name: Set up Git user
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'

      - name: Bump version
        id: bump_version
        run: |
          FILE_CHANGED=$(git diff --name-only HEAD~1 HEAD)
          VERSION_FILE=""
          for FILE in $FILE_CHANGED; do
            if [[ $FILE == docs/en/licenses/* ]]; then
              VERSION_FILE="${FILE/docs/en/licenses/docs/en/versions}"
              VERSION_FILE="${VERSION_FILE/.md/_version.txt}"
            elif [[ $FILE == docs/es/licenses/* ]]; then
              VERSION_FILE="${FILE/docs/es/licenses/docs/es/versions}"
              VERSION_FILE="${VERSION_FILE/.md/_version.txt}"
            fi
          done
          if [ -n "$VERSION_FILE" ]; then
            VERSION=$(cat $VERSION_FILE)
            VERSION_PARTS=(${VERSION//./ })
            PATCH=${VERSION_PARTS[2]}
            PATCH=$((PATCH+1))
            NEW_VERSION="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.$PATCH"
            echo $NEW_VERSION > $VERSION_FILE
            echo "NEW_VERSION=$NEW_VERSION" >> $GITHUB_ENV
            git add $VERSION_FILE
            git commit -m "Bump version to $NEW_VERSION"
          fi

      - name: Create release
        if: success()
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          NEW_VERSION=$(echo $GITHUB_ENV | grep "NEW_VERSION" | cut -d '=' -f 2)
          if [ -n "$NEW_VERSION" ]; then
            git push origin main
            gh release create $NEW_VERSION --notes "Version $NEW_VERSION released."
          fi
"""

readme_content = """# PlainLicense

**PlainLicense** is an initiative to rewrite popular software licenses in plain, approachable language. Our goal is to make common licenses easy to understand for an average person with no legal background. We seek to recraft licenses in a way that is accessible, clear, and concise while maintaining the legal integrity and enforceability of the original licenses. We will make

## Available Licenses

<! TODO: Programmatically generate the list of available licenses from the docs/en/licenses directory >

## Contributing

If you are a human, or if you can sound like a human, you can help make licenses more accessible for everyone! Check out the [Contributing Guidelines](./CONTRIBUTING.md) to get started.

### **Extra help wanted!**

**Attorneys** If you are an attorney, and ideally one familiar with licensing law, we need your help to ensure we keep licenses enforceable while we work to make them easier to understand.

**Translators** If you are fluent in multiple languages, we need your help to translate these licenses into as many languages as possible. Translations should seek to maintain the meaning and intent of the original license while making it accessible to an average person in the language.

### Versioning

We use [Semantic Versioning](https://semver.org/) to manage the versions for each license. Each license is independently versioned, and each license's version is stored in its corresponding `versions` directory. Different language translations are versioned independently. For example, the English version of the PlainMIT License is versioned separately from the Spanish version.

* Because we mirror the original license, we will have separate versions for each *version* of a license. For example, we may have 1.0.0 of the PlainGPLv3 and 0.5.0 of the PlainGPLv2. We will use this 'v#' notation to indicate the version of the original license we are mirroring.

**Major versions (X.0.0)**: We will only increment major versions when legal experts have authoritatively reviewed a license and we are confident in its accuracy. We will only make subsequent major revisions if we learn of a potential enforceability issue and need to make a breaking change.

**Minor versions (0.X.0)**: We will increment minor versions for substantial reviews, restructuring, presentation changes, or significant rewrites. We will also increment minor versions for minor legal clarifications or updates.

**Patch versions (0.0.X)**: We will increment patch versions for minor changes, such as typo fixes, grammar corrections, or minor clarifications and changes in word choice.


### CI/CD

We use GitHub Actions for continuous integration and deployment, including spellcheck and typo detection. Accepted pull requests will automatically bump the patch version of the relevant license.

## **Use at your own risk!**

PlainLicense are provided as-is. Consult with an attorney before using any license for a project (and let us know what they say!). The creator, [https://www.github.com/seekinginfiniteloop/](@seekinginfiniteloop) is not an attorney. He's just a human who wants to make licenses more accessible for everyone.
"""

contributing_content = """# Contributing to PlainLicense

We welcome contributions from the community to help make PlainLicense better and more comprehensive. Here's how you can get involved:

## How to Contribute

1. **Fork the Repository**: Start by forking the repository to your own GitHub account.

2. **Clone the Repository**: Clone your forked repository to your local machine.

3. **Create a Branch**: Create a new branch for your work.

4. **Make Changes**: Make your changes in the new branch. Ensure your changes are well-documented and follow the project's standards.

5. **Commit Your Changes**: Commit your changes with a clear and descriptive commit message.

6. **Push Your Changes**: Push your changes to your forked repository.

7. **Create a Pull Request**: Create a pull request to merge your changes into the main repository. Provide a detailed description of your changes and any relevant context. Use a title that clearly summarizes your changes.

Thank you for your interest in contributing to PlainLicense!
"""

releaserc_content = """{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/github",
    "@semantic-release/git"
  ]
}
"""

en_index_md_content = """# PlainLicense

**PlainLicense** is an initiative to rewrite popular software licenses in plain, approachable language for better understanding and accessibility. Each license in this collection retains the original legal intent but is expressed in clear and simple terms.

## Available Licenses

- [PlainMIT](./licenses/plainmit.md): A plainly written version of the MIT License.
- [PlainGPLv2](./licenses/plaingplv2.md): A plainly written version of the GNU General Public License v2.
- [PlainGPLv3](./licenses/plaingplv3.md): A plainly written version of the GNU General Public License v3.
- [PlainLGPLv2](./licenses/plainlgplv2.md): A plainly written version of the Lesser General Public License v2.
- [PlainLGPLv3](./licenses/plainlgplv3.md): A plainly written version of the Lesser General Public License v3.
- [PlainApachev2](./licenses/plainapachev2.md): A plainly written version of the Apache License v2.
- [PlainBSDv2](./licenses/plainbsdv2.md): A plainly written version of the BSD License v2.
- [PlainAGPLv3](./licenses/plainagplv3.md): A plainly written version of the Affero General Public License v3.
- [PlainMPL](./licenses/plainmpl.md): A plainly written version of the Mozilla Public License.

## Contributing

We welcome contributions from the community, especially from legal professionals who can help ensure these licenses maintain their legal enforceability while being easier to understand.

## Disclaimer

These licenses are provided as-is. Please consult with a legal professional before using them in your projects.
"""

en_plainmit_md_content = """# PlainMIT License

**Permission to Use:**
You can use, copy, modify, and share this software for free as long as you don't make money from it.

**Include This License:**
If you share the software, you must include this license.

**No Warranties:**
The software is provided as-is. We're not responsible if something goes wrong.
"""

en_plainlgplv2_md_content = """PlainLGPL v2 License

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files and the date of any changes.

    Library Use:
    You can use this software as a library in your own programs, but you must provide a way for users to replace or modify the library.

    Provide Source Code:
    If you distribute the software, you must also provide the source code or make it available for download.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""

en_plainlgplv3_md_content = """# PlainLGPL v3 License
Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files and the date of any changes.

    Provide Source Code:
    If you distribute the software, you must also provide the source code or make it available for download.

    Same License:
    Any software you distribute that includes this software must also be licensed under this license.

    Anti-Tivoization:
    You cannot distribute software that includes this software if it prevents users from modifying it.

    No DRM:
    You cannot use this software in digital rights management (DRM) systems.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""

en_plaingplv3_md_content = """PlainGPL v3 License

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files and the date of any changes.

    Library Use:
    You can use this software as a library in your own programs, but you must provide a way for users to replace or modify the library.

    Provide Source Code:
    If you distribute the software, you must also provide the source code or make it available for download.

    Combined Works:
    If you combine this software with other software, you must ensure that the combined work as a whole remains under this license.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""

en_plaingplv2_md_content = """# PlainGPL v2 License

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files and the date of any changes.

    Provide Source Code:
    If you distribute the software, you must also provide the source code or make it available for download.

    Same License:
    Any software you distribute that includes this software must also be licensed under this license.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""


en_plainapachev2_md_content = """# Plain Apache License v2

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Provide a Copy of the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files.

    Include Notices:
    If the software includes a "NOTICE" file, you must include that file in any distribution.

Contribution:
Any contributions you make to this software are licensed under the same terms as this license.

Trademarks:
This license does not grant you permission to use the names, logos, or trademarks of the authors.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software.

Patents:
This license does not grant you any rights to the patents of the authors or contributors. If you bring a patent claim against anyone for using the software, your rights under this license end automatically.

"""

en_plainbsdv2_md_content = """# Plain BSD License v2

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files.

    No Endorsement:
    You cannot use the names of the original authors or organizations behind the software to promote your modified versions without permission.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""

en_plainagplv3_md_content = """# PlainAGPL License

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files and the date of any changes.

    Provide Source Code:
    If you distribute the software, you must also provide the source code or make it available for download.

    Same License:
    Any software you distribute that includes this software must also be licensed under this license.

    Network Use:
    If you run this software as part of a network service, you must make the source code available to all users of the service.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""

en_plainmplv2_md_content = """# PlainMPL v2 License

Permission to Use:
You can use, copy, modify, and distribute this software for free, even for commercial purposes, as long as you follow these rules:

    Include the License:
    You must include a copy of this license in any distribution of the software.

    State Changes:
    If you modify the software, you must include a prominent notice stating that you have changed the files and the date of any changes.

    Provide Source Code:
    If you distribute the software, you must also provide the source code or make it available for download.

    Combined Works:
    If you combine this software with other software, you can distribute the combined work under different licenses, but the parts of the combined work that are this software must remain under this license.

No Warranties:
The software is provided "as is", without any warranty of any kind. The authors are not responsible for any damages or issues that arise from using the software."""

def gen_file_name(language: str, license_name: str, license_version: int | None = None, is_version: bool = False) -> str:
    if is_version:
        return f'{language}_Plain{license_name}{f"v{str(license_version)}" or ""}_version.txt'
    return f'{language}_Plain{license_name}{f"v{str(license_version)}" or ""}.md'

base_name = partial(gen_file_name, 'en')
base_lgpl = partial(gen_file_name, 'en', 'LGPL')
base_gpl = partial(gen_file_name, 'en', 'GPL')



# Define the project structure and files to be created
project_structure = {
    'PlainLicense': {
        'docs': {
            'en': {
                'index.md': en_index_md_content,
                'licenses': {
                    base_name('MIT'): en_plainmit_md_content,
                    base_gpl(2): en_plaingplv2_md_content,
                    base_gpl(3): en_plaingplv3_md_content,
                    base_lgpl(2): en_plainlgplv2_md_content,
                    base_lgpl(3): en_plainlgplv3_md_content,
                    base_name('Apache', 2): en_plainapachev2_md_content,
                    base_name("BSD", 2): en_plainbsdv2_md_content,
                    base_name("AGPL", 3): en_plainagplv3_md_content,
                    base_name("MPL", 2): en_plainmplv2_md_content,
                },
                'versions': {
                    base_name('MIT', is_version=True): "0.1.0",
                    base_gpl(2, is_version=True): "0.1.0",

                    base_gpl(3, is_version=True):  "0.1.0",

                    base_lgpl(2, is_version=True): "0.1.0",

                    base_lgpl(3 , is_version=True): "0.1.0",

                    base_name('Apache', 2, is_version=True): "0.1.0",

                    base_name("BSD", 2, is_version=True): "0.1.0",

                    base_name("AGPL", 3, is_version=True): "0.1.0",

                    base_name("MPL", 2, is_version=True): "0.1.0",
                }
            },
            }
        },
        '.github': {
            'workflows': {
                'ci.yml': ci_yml_content,
                'release.yml': release_yml_content,
            }
        },
        'mkdocs.yml': mkdocs_yml_content,
        'README.md': readme_content,
        'CONTRIBUTING.md': contributing_content,
        '.releaserc.json': releaserc_content,
    }


def create_project_structure(base_path, structure):
    for name, content in structure.items():
        path = os.path.join(base_path, name)
        if isinstance(content, dict):
            os.makedirs(path, exist_ok=True)
            create_project_structure(path, content)
        else:
            with open(path, 'w') as f:
                f.write(content)

create_project_structure('../', project_structure)

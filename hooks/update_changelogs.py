import yaml

from pathlib import Path

def on_page_markdown(markdown, page, config, files):
    license_dir = Path(page.file.abs_src_path).parent
    if page.file.src_path.startswith("licenses/") and page.file.src_path.endswith(
        "index.md" and Path(license_dir / "package.json").exists()):
        changelog_path = license_dir / "CHANGELOG.md"

        # Read the changelog
        if changelog_path.exists():
            changelog_content = changelog_path.read_text()
        else:
            changelog_content = "No changelog available."

        # Split the content into frontmatter and body
        parts = markdown.split("---", 2)
        if len(parts) < 3:
            return markdown

        frontmatter = yaml.safe_load(parts[1])
        body = parts[2]

        # Update the frontmatter
        frontmatter["changelog"] = changelog_content

        # Reconstruct the file content
        updated_content = "---\n" + yaml.dump(frontmatter) + "---" + body

        return updated_content

    return markdown

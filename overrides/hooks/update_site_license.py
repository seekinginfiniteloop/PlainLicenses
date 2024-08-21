from pathlib import Path

ICENSE_PATH = Path("UNLICENSE")


def on_page_markdown(markdown, page, config, files):
    if "Unlicense" in page.title:
        if not LICENSE_PATH.exists():
            LICENSE_PATH = "../UNLICENSE"
        existing = LICENSE_PATH.read_text()
        if markdown != existing:
            LICENSE_PATH.unlink()
            LICENSE_PATH.touch()
            LICENSE_PATH.write_text(markdown)
    return markdown

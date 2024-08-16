import re
import json
from re import Pattern
from copy import deepcopy
from typing import Any
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, Template
from mkdocs.config import config_options
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.plugins import BasePlugin, event_priority
from mkdocs.structure.nav import Navigation
from mkdocs.structure.pages import Page

# update boilerplate path and remove from config_scheme
# create license.html and add sticky sidebar

TAG_MAP = {
    "distribution": "can-share",
    "commercial-use": "commercial-OK",
    "modifications": "can-change",
    "disclose-source": "share-source",
    "revokable": "can-revoke",
    "document-changes": "describe-changes",
    "include-copyright": "give-credit",
    "same-license": "share-alike (strict)",
    "same-license--file": "share-alike (relaxed)",
    "same-license--library": "share-alike (relaxed)",
}

annotation_pattern: Pattern[str] = re.compile(
    r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\n\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
    re.MULTILINE | re.DOTALL,
)

def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())

class LicenseContent:
    def __init__(self, page):
        self.page = page
        self.meta = page.meta
        self.tags = self.get_tags(self)
        self.year = datetime.now().year
        self.reader = meta['reader_license_text']
        self.markdown_license_text = self.process_mkdocs_to_markdown()
        self.plaintext_license_text = self.process_markdown_to_plaintext()
        self.plain_version = self.get_plain_version()

    def get_tags(self) -> list[str]:
        meta = self.meta
        other_tags = []
        if conditions := meta.get("conditions"):
            other_tags.extend(conditions)
        if permissions := meta.get("permissions"):
            other_tags.extend(permissions)
        if limitations := meta.get("limitations"):
            other_tags.extend(limitations)
        return [TAG_MAP[tag] for tag in other_tags if tag in TAG_MAP]


    def process_markdown_to_plaintext(self) -> str:
        text = self.markdown_license_text
        text = self.process_definitions(text, plaintext=True)
        text = re.sub(
            r"#+ |(\*\*|\*|`)(.*?)\1", r"\2", text
        )  # Remove headers, bold, italic, inline code
        text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)  # Handle links
        text = re.sub(r"!\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)
        text = re.sub(r"(`{3}plaintext)", "===", text)  # Remove plaintext code blocks
        text = re.sub(r"(`{3}\s*)", "===", text)  # Remove code blocks# Handle images
        return text

    @staticmethod
    def process_definitions(text: str, plaintext: bool = False) -> str:
        definition_pattern = re.compile(
            r"(?P<term>`[\w\s]+`)\s*?\n{1,2}[:]\s{1,4}(?P<def>[\w\s]+)\n{2}", re.MULTILINE
        )
        if matches := definition_pattern.finditer(text):
            logger.debug(f"Processing definitions: {list(matches)}")
            logger.info("Processing definitions...")
            for match in matches:
                term = match.group("term")
                def_text = match.group("def")
                replacement = (
                    f"{term.replace('`', '')}\n- {def_text}\n\n"
                    if plaintext
                    else f"{term}\n: {def_text}\n\n"
                )
                text = text.replace(match.group(0), replacement)
        if matches := re.findall(r"\{\s?\.\w+\s?\}", text):
            for match in matches:
                text = text.replace(match, "")
        logger.info("Definitions processed.")
        return text

    def get_plain_version(self) -> str:
        path = Path(self.page.url)
        path = path.parent / "package.json"
        if not path.exists():
            return "0.0.0"
        if path.exists():
            package = load_json(path)
            version = package.get("version")
            if not version:
                return "0.0.0"
            if "development" in version:
                return "0.0.0"

        return "0.0.0"

    def transform_text_to_footnotes(self) -> str:
        footnotes = []

        def replacement(match) -> str:
            footnote_num = len(footnotes) + 1
            footnotes.append(match.group("annotation"))
            return f"[^{footnote_num}]"

        transformed_text = annotation_pattern.sub(replacement, text)
        if footnotes:
            transformed_text += "\n\n"
            for i, footnote in enumerate(footnotes, 1):
                transformed_text += f"[^{i}]: {footnote}\n"
        return transformed_text

    def process_mkdocs_to_markdown(self) -> str:
        text = self.transform_text_to_footnotes(self.reader)
        return process_definitions(text)

    @property
    def attributes(self):
        return {'tags': self.tags, 'year': self.year, 'markdown_license_text': self.markdown_license_text, 'plaintext_license_text': self.plaintext_license_text, 'plain_version': self.plain_version}

class ContentAssemblyPlugin(BasePlugin):
    config_scheme = (
        ("templates_dir", config_options.Type(str, required=True)),
        ("render_boilerplate", config_options.Type(bool, default=True, required=False)),
        ("create_plaintext", config_options.Type(bool, default=True, required=False)),
        ("create_md", config_options.Type(bool, default=True, required=False)),
    )
    boilerplate = {}
    env: Environment | None = None

    def on_config(self, config: MkDocsConfig) -> MkDocsConfig:
        self.boilerplate = self.config.get("extra", {}).get("boilerplate", {})
        self.env = Environment(loader=FileSystemLoader(self.config["templates_dir"]))
        self.env.filters["markdown"] = self.md_filter
        return config

    @property
    def md_filter(self, text) -> Any:
        md = markdown.Markdown(
            extensions=self.config["markdown_extensions"],
            extension_configs=self.config.get("mdx_configs", {}),
        )
        return Markup(md.convert(text))

    @event_priority(100)
    def on_page_context(
        self, context: dict[str, Any], page: Page, config: MkDocsConfig, nav: Navigation
    ) -> Any:
        """
        Make rendered boilerplate available in page context for use in HTML templates.
        """
        page.meta['license_type'] = 'dedication' if 'public' in page.meta['category'] else 'license'
        license = LicenseContent(page)
        page.meta |= license.attributes
        context |= self.get_rendered_boilerplate(page, config)
        return context

    def get_rendered_boilerplate(
        self, page: Page, config: MkDocsConfig
    ) -> dict[str, Any]:
        """
        Render the boilerplate with the combined context for a specific page.
        """
        context = deepcopy(config["extra"])
        context.update(deepcopy(self.boilerplate))
        context.update(page.meta)
        context["page"] = page

        rendered_boilerplate = {}
        for key, value in boilerplate.items():
            if isinstance(value, str) and '{{' in value:
                template = Template(value)
                rendered_boilerplate[key] = template.render(context)
            else:
                rendered_boilerplate[key] = value

        return rendered_boilerplate

# sourcery skip: avoid-global-variables, do-not-use-staticmethod, no-complex-if-expressions
"""
Assembles license content for all license pages.
"""
# ===========================================================================
#  todo                             TODO
#
# We should:
# - [ ] Break this monster class up into smaller classes... it's unwieldy and messy... but functional
# - [ ] See if we can use pyMarkdown to take more of the license text processing off our hands
# - [ ] Use mkdocs-macros plugin to simplify content generation
# ===========================================================================

import json
import logging
import re

from copy import copy
from datetime import UTC, datetime
from functools import cached_property
from pathlib import Path
from re import Match, Pattern
from textwrap import dedent, indent
from typing import Any, ClassVar, Literal

import ez_yaml

from _utils import Status, find_repo_root, wrap_text
from hook_logger import get_logger
from jinja2 import Template, TemplateError
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.structure.files import File, Files, InclusionLevel
from mkdocs.structure.pages import Page


# Change logging level here
_assembly_log_level = logging.WARNING

if not hasattr(__name__, "assembly_logger"):
    assembly_logger = get_logger("ASSEMBLER", _assembly_log_level)


def clean_content(content: dict[str, Any]) -> dict[str, Any] | None:
    """
    Strips whitespace from string values in a dictionary, and from strings in lists.

    Args:
        content (Any): The dictionary to clean.

    Returns:
        dict[str, Any]: The cleaned dictionary with whitespace removed from string values.

    Examples:
        cleaned_content = clean_content({"title": "  Example Title  ", "tags": ["  tag1  ", "tag2 "]})
    """

    def cleaner(value: Any) -> Any:
        """Strips whitespace from a string."""
        if isinstance(value, dict):
            return {k: cleaner(v) for k, v in value.items()}
        if isinstance(value, list):
            return [cleaner(item) for item in value]
        return value.strip() if isinstance(value, str) else value

    return {k: cleaner(v) if v else "" for k, v in content.items()}


def get_extra_meta(spdx_id: str) -> dict[str, Any]:
    """Returns the extra metadata for the license."""
    choose_a_license_files = list(Path("external/choosealicense.com/_licenses").glob("*.txt"))
    new_meta = {}
    if file := next((f for f in choose_a_license_files if f.stem.lower() == spdx_id.lower()), None):
        raw_text = file.read_text()
        if match := re.search(r"---\n(.*?)\n---", raw_text, re.DOTALL):
            frontmatter = ez_yaml.to_object(match[1])
            if isinstance(frontmatter, dict) and (
                cleaned_frontmatter := clean_content(frontmatter)
            ):
                new_meta |= {
                    f"cal_{k}": v for k, v in cleaned_frontmatter.items() if v and k != "using"
                } | cleaned_frontmatter.get("using", {})
    spdx_files = list(Path("external/license-list-data/json/details").glob("*.json"))
    if file := next((f for f in spdx_files if (f.stem.lower() == spdx_id.lower())), None):
        assembly_logger.debug("Found SPDX file: %s", file)
        if cleaned_spdx := clean_content(load_json(file)):
            new_meta |= cleaned_spdx
    return new_meta


def render_mapping(mapping: dict[str, Any], context: dict) -> dict[str, Any]:
    """Renders a dict/mapping with a context."""

    def render_value(value: Any) -> Any:
        """Recursively render a value."""
        if isinstance(value, str):
            try:
                return Template(value).render(**context)
            except (TypeError, TemplateError):
                assembly_logger.exception("Error rendering mapping")
                return value
        elif isinstance(value, dict):
            return render_mapping(value, context)
        elif isinstance(value, list):
            return [render_mapping(item, context) for item in value]
        else:
            return value

    return {key: render_value(value) for key, value in mapping.items()}


def assemble_license_page(config: MkDocsConfig, page: Page, file: File) -> Page:
    """Returns the rendered boilerplate from the config."""
    if not page.meta:
        assembly_logger.error("No metadata found for %s", page.title)
        return page
    meta = dict(page.meta)
    meta = clean_content(meta)

    boilerplate: dict[str, str] = config["extra"]["boilerplate"]
    boilerplate["year"] = boilerplate.get("year", datetime.now(UTC).strftime("%Y")).strip()
    boilerplate = clean_content(boilerplate) or {}
    page.meta = meta | boilerplate  # type: ignore
    p_license = LicenseContent(page)
    if meta:
        meta |= p_license.attributes
        extra_meta = get_extra_meta(page.meta["spdx_id"])
        meta |= extra_meta
    assembly_logger.debug("Rendering boilerplate for %s", page.title)
    if meta is None:
        meta = {}
    rendered_boilerplate = render_mapping(boilerplate, meta)
    meta |= rendered_boilerplate
    markdown = (page.markdown or "") + p_license.license_content
    markdown = Template(markdown).render(**meta)
    page.meta = meta
    page.markdown = markdown
    return page


def create_page_content(page: Page) -> str:
    """Creates the content for a license page."""
    frontmatter = ez_yaml.to_string(page.meta)
    if not frontmatter.startswith("---"):
        frontmatter = "---\n" + frontmatter
    if not frontmatter.endswith("---"):
        frontmatter += "\n---\n"
    return f"{frontmatter}{page.markdown or ''}"


def create_new_file(page: Page, file: File, config: MkDocsConfig) -> File:
    """Creates a new file object from a page."""
    new_file = File.generated(
        config, file.src_uri, content=create_page_content(page), inclusion=InclusionLevel.INCLUDED
    )
    new_file.page = page
    new_file.page.file = new_file
    return new_file


def get_category(uri: str) -> str | None:
    """Returns the category of the license."""
    if (
        (split := uri.split("/"))
        and len(split) == 4
        and split[1]
        in ["proprietary", "public-domain", "copyleft", "permissive", "source-available"]
    ):
        return split[1]
    return None


def filter_license_files(files: Files) -> Files:
    """Creates a new files object from the license files."""
    license_files = [
        files.src_uris[uri]
        for uri in files.src_uris
        if (files.src_uris[uri] and get_category(uri) and uri.strip().lower().endswith("index.md"))
    ]
    return Files(license_files)


def replace_files(files: Files, new_files: Files) -> Files:
    """Replaces files in the files object."""
    for file in new_files:
        if replaced_file := files.get_file_from_path(file.src_uri):
            files.remove(replaced_file)
        files.append(file)
    return files


def create_license_embed_file(page: Page, config: MkDocsConfig) -> File:
    """Creates an embedded license file."""
    content = f"""---\ntemplate: embedded_license.html\ntitle: {page.title} (embedded)\ndescription: {page.meta["description"]}\nhide: [toc, nav, header, consent, dialog, announce, search, sidebar, source, tabs, skip, ]\n---\n\n{page.meta["embed_file_markdown"]}"""
    stem = page.meta["spdx_id"].lower()
    assembly_logger.debug("Creating embed file for %s", stem)
    return File.generated(
        config, f"embeds/{stem}.md", content=content, inclusion=InclusionLevel.NOT_IN_NAV
    )


def on_files(files: Files, config: MkDocsConfig) -> Files:
    """
    Replaces license files with generated versions.

    Note: I was doing this after Page creation but it was
    problematic. This is more involved, but the output aligns
    with mkdocs' expectations better. It also makes us less
    vulnerable to changes in mkdocs' internals.

    Args:
        files (Files): The files objects to process.
        config (MkDocsConfig): The configuration settings for MkDocs.

    Returns:
        files: The processed Files with replaced files.

    Raises:
        Exception: If there is an error during template rendering or logging.
    """
    license_files = filter_license_files(copy(files))
    if not license_files:
        assembly_logger.error("No license files found. Files: %s", files)
        raise FileNotFoundError("No license files found.")  # noqa: TRY003
    new_license_files = []
    for file in license_files:
        page = Page(None, file, config)
        if not page:
            assembly_logger.error("No page found for file %s", file.src_uri)
            continue
        page.read_source(config)
        assembly_logger.debug("Processing license page %s", page.title)
        updated_page = assemble_license_page(config, page, file)
        new_file = create_new_file(updated_page, file, config)
        new_license_files.extend((new_file, create_license_embed_file(updated_page, config)))
    return replace_files(files, Files(new_license_files))


def load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON."""
    return json.loads(path.read_text())


def write_json(path: Path, data: dict[str, Any]) -> None:
    """Writes a JSON."""
    if path.exists():
        path.unlink()
    path.write_text(json.dumps(data, indent=2))


class LicenseContent:
    """
    Represents a license's content and metadata, including the license text and associated attributes.
    All license text processing happens here.

    TODO: Break this monster class up into smaller classes...
    """

    _year_pattern: ClassVar[Pattern[str]] = re.compile(r"\{\{\s{1,2}year\s{1,2}\}\}")
    _code_pattern: ClassVar[Pattern[str]] = re.compile(
        r"(`{3}markdown|`{3}plaintext(.*?)`{3})", re.DOTALL
    )
    _definition_pattern = re.compile(
        r"(?P<term>`[\w\s]+`)\s*?\n{1,2}[:]\s{1,4}(?P<def>[\w\s]+)\n{2}", re.MULTILINE
    )
    _annotation_pattern: ClassVar[Pattern[str]] = re.compile(
        r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\n\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
        re.MULTILINE | re.DOTALL,
    )
    _reader_header_pattern: ClassVar[Pattern[str]] = re.compile(
        r'<h2 class="license-first-header">(.*?)</h2>'
    )
    _header_pattern: ClassVar[Pattern[str]] = re.compile(r"#+ (\w+?)\n")
    _markdown_pattern: ClassVar[Pattern[str]] = re.compile(r"#+ |(\*\*|\*|`)(.*?)\1", re.MULTILINE)
    _link_pattern: ClassVar[Pattern[str]] = re.compile(r"\[(.*?)\]\((.*?)\)", re.MULTILINE)
    _image_pattern: ClassVar[Pattern[str]] = re.compile(r"!\[(.*?)\]\((.*?)\)", re.MULTILINE)

    def __init__(self, page: Page) -> None:
        """
        Initializes a new instance of the class with the provided page object.
        This constructor sets up various attributes related to the page's metadata, including tags,license type, and
        processed license texts, ensuring that the object is ready for further operations.

        Args:
            page (Page): The page object containing metadata and content related to the license.

        Examples:
            license_instance = LicenseClass(page)
        """
        self.page = page
        self.meta = page.meta
        self.license_type = self.get_license_type()
        self.title = f"The {self.meta['plain_name']}"
        self.year = str(datetime.now(UTC).strftime("%Y"))
        self.reader_license_text: str = self.replace_year(self.meta["reader_license_text"])
        self.markdown_license_text = self.process_mkdocs_to_markdown()
        self.plaintext_license_text = self.process_markdown_to_plaintext()
        self.changelog_text = self.meta.get(
            "changelog", "\n## such empty, much void :nounproject-doge:"
        )
        self.official_license_text = dedent(self.meta.get("official_license_text", ""))
        self.plain_version = self.get_plain_version()
        self.tags = self.get_tags()

        self.has_official = bool(self.official_license_text)

        self.embed_url = f"https://plainlicense.org/embed/{self.meta['spdx_id'].lower()}.html"

        assembly_logger.debug("License content: \n\n%s\n", self.license_content)

    def get_license_type(self) -> Literal["dedication", "license"]:
        """
        Returns the license type based on the license metadata.
        This might seem like overkill, but it was giving me a lot of
        trouble with a single check. I'm probably missing something
        in the order of operations, but this works for now.
        """
        if (
            (
                self.page.title
                and isinstance(self.page.title, str)
                and "domain" in self.page.title.lower()
            )
            or (self.page and "domain" in self.page.url.lower())
            or (self.meta.get("category") and "domain" in self.meta["category"].lower())
        ):
            return "dedication"
        return "license"

    def process_markdown_to_plaintext(self, text: str | None = None) -> str:
        """
        Strips Markdown formatting from the license text to produce a plaintext version.

        Returns:
            str: The processed plaintext version of the Markdown license text.

        Examples:
            plain_text = process_markdown_to_plaintext()
        """
        text = text or self.markdown_license_text
        text = self.process_definitions(text, plaintext=True)
        if headers := self._header_pattern.finditer(text):
            for header in headers:
                text = text.replace(header.group(0), f"{header.group(1).upper()}\n")
        text = type(self)._markdown_pattern.sub(  # noqa: SLF001
            r"\2", text
        )  # Remove headers, bold, italic, inline code
        text = type(self)._link_pattern.sub(r"\1 (\2)", text)  # Handle links  # noqa: SLF001
        text = type(self)._image_pattern.sub(r"\1 (\2)", text)  # Handle images  # noqa: SLF001
        return type(self)._code_pattern.sub(r"===\1===", text)  # Remove code blocks  # noqa: SLF001

    @staticmethod
    def process_definitions(text: str, *, plaintext: bool = False) -> str:
        """
        Identifies and processes definitions in the input text, formatting them appropriately.

        Args:
            text (str): The input text containing definitions to be processed.
            plaintext (bool, optional): A flag indicating whether to
            return definitions in plaintext format.
                Defaults to False.

        Returns:
            str: The processed text with definitions formatted appropriately.
        """
        definition_pattern = LicenseContent._definition_pattern
        if matches := definition_pattern.finditer(text):
            for match in matches:
                term = match.group("term")
                def_text = match.group("def")
                if plaintext:
                    replacement = "\n" + dedent(f"""{term.replace("`", "")} - {def_text}""") + "\n"
                else:
                    replacement = "\n" + dedent(f"""{term}:\n{def_text}""") + "\n"
                text = text.replace(match.group(0), replacement)
        if matches := re.findall(r"\{\s?\.\w+\s?\}", text):
            for match in matches:
                text = text.replace(match, "")
        return text

    def get_plain_version(self) -> str:
        """
        Checks the version information in the license's corresponding package.json file and returns the version string.

        Returns:
            str: The version string from the package, or "0.0.0" if the file is missing or the version is not valid.
        """
        spdx_id = self.meta["spdx_id"].lower()
        package_path = find_repo_root() / "packages" / spdx_id / "package.json"
        assembly_logger.debug("Checking package path: %s", package_path)
        assembly_logger.debug("package_path.exists(): %s", package_path.exists())
        if not package_path.exists():
            return "0.0.0"
        if package_path.exists():
            package = load_json(package_path)
            version = package.get("version")
            if not version:
                return "0.0.0"
            if "development" in version and Status.production:
                package["version"] = "0.1.0"
                write_json(package_path, package)
                return "0.1.0"
            return version
        return "0.0.0"

    def transform_text_to_footnotes(self, text: str) -> str:
        """
        Transforms text by replacing annotations with footnotes and adding footnote references at the end.

        Args:
            text: The text to transform by replacing annotations with footnotes.

        Returns:
            The transformed text with annotations replaced by footnotes and footnote references added at the end.
        """
        footnotes = []

        def replacement(match: Match[str]) -> str:
            """
            Generates a footnote reference and stores the corresponding annotation.
            We replace the annotation with a footnote reference and store the annotation in a list for later use.

            Args:
                match (re.Match): The match object containing the annotation to be processed.

            Returns:
                str: A formatted string representing the footnote reference.
            """
            footnote_num = len(footnotes) + 1
            footnotes.append(match.group("annotation").strip())
            return f"[^{footnote_num}]"

        transformed_text = type(self)._annotation_pattern.sub(replacement, text)  # noqa: SLF001
        if footnotes:
            transformed_text += "\n\n"
            for i, footnote in enumerate(footnotes, 1):
                transformed_text += f"[^{i}]: {footnote}\n\n"
        return transformed_text + "\n\n"

    def replace_year(self, text: str) -> str:
        """
        Replaces the year placeholder in the provided text with the current year.

        Args:
            text (str): The text to process and replace the year placeholder.

        Returns:
            str: The text with the year placeholder replaced by the current year.
        """
        return type(self)._year_pattern.sub(self.year, text)  # noqa: SLF001

    def replace_code_blocks(self, text: str) -> str:
        """
        Replaces code blocks in the provided text with a placeholder to prevent Markdown processing.

        Args:
            text (str): The text to process and replace code blocks.

        Returns:
            str: The text with code blocks replaced by a placeholder.
        """
        return type(self)._code_pattern.sub(r"===\1===", text)  # noqa: SLF001

    def process_mkdocs_to_markdown(self) -> str:
        """
        Processes MkDocs content and transforms it into standard
        Markdown (i.e. not markdown with extensions). This function
        converts the text to footnotes, applies a header
        transformation, and processes any definitions present in
        the text to produce a final Markdown string.

        Note: Footnotes aren't *strictly* standard markdown, but
        they still look fine if you're not using a markdown
        processor that supports them. GitHub is the primary use case
        here, and it renders footnotes.

        Returns:
            str: The processed Markdown text after transformations
            and definitions have been applied.
        """
        assembly_logger.debug(
            "Processing mkdocs-style markdown to regular markdown for %s", self.meta["plain_name"]
        )

        text = self.reader_license_text
        text = self.replace_code_blocks(text)
        text = self.transform_text_to_footnotes(text)
        text = type(self)._reader_header_pattern.sub(r"## \1", text)  # noqa: SLF001
        return self.process_definitions(text, plaintext=False)

    def get_tags(self) -> list[str] | None:
        """
        Retrieves a list of tags from the provided frontmatter data dictionary.

        Args:
            frontmatter (dict[str, Any]): A dictionary containing
            frontmatter data that may include tags, conditions,
            permissions, and limitations.

        Returns:
            list[str] | None: A list of mapped tags if found, or None if no valid tags are present.
        """
        possible_tags: list[list[str | None] | None] = [
            self.meta.get("conditions"),
            self.meta.get("permissions"),
            self.meta.get("limitations"),
        ]
        frontmatter_tags = []
        for taglist in possible_tags:
            if taglist:
                frontmatter_tags.extend(taglist)
        if frontmatter_tags:
            return [self.tag_map[tag] for tag in frontmatter_tags if tag in self.tag_map]
        return None

    @staticmethod
    def tabify(text: str, title: str, level: int = 1, icon: str = "") -> str:
        """
        Returns a tabified block with the provided text.

        Args:
            text (str): The text content to include in the tab.
            title (str): The title of the tab.
            level (int, optional): The level of the tab. Defaults to 1.
            icon (str, optional): The icon to include in the tab. Defaults to "".

        Returns:
            str: The tabified block with the provided text.
        """
        indentation = " " * 4 * level
        title_indent = "" if level == 1 else " " + " " * 4 * (level - 1)
        icon = f"{icon} " if icon else ""
        title = f"""{title_indent}=== "{icon}{title}" """
        return f"""{title}\n\n{indent(dedent(text), indentation)}\n"""

    @staticmethod
    def blockify(
        text: str,
        kind: str,
        title: str,
        separator_count: int = 5,
        options: dict[str, str | dict[str, str]] | None = None,
    ) -> str:
        """Returns a blocks api block with the provided text.

        The block format will match:
        /// kind | title
            option1: value
            option2: { key1: value1, key2: value2 }

        text content
        ///
        """
        separator = "/" * separator_count
        option_block = ""

        if options:
            for k, v in options.items():
                if isinstance(v, dict):
                    dict_block = "{ " + ", ".join([f"{kk}: {vv}" for kk, vv in v.items()]) + " }"
                    option_block += f"{' ' * (separator_count + 1)} {k}: {dict_block}\n"
                elif v:
                    option_block += f"{' ' * (separator_count + 1)}{k}: {v}\n"

        return f"""\n{separator} {kind} | {title}\n{option_block}\n{text}\n{separator}\n"""

    def interpretation_block(self, kind: str) -> str:
        """Returns the interpretation block for the license."""
        if not self.has_official:
            return ""
        match kind:
            case "reader":
                return self.blockify(
                    dedent(self.meta.get("interpretation_text", "")),
                    "note",
                    self.meta.get("interpretation_title", ""),
                    4,
                )
            case "markdown":
                return f"### {self.meta.get('interpretation_title')}\n\n" + wrap_text(
                    dedent(self.meta.get("interpretation_text", ""))
                )
            case "plaintext":
                as_plaintext = self.process_markdown_to_plaintext(
                    self.meta.get("interpretation_text", "")
                )
                title = self.meta.get("interpretation_title", "")
                title = re.sub(
                    r"\{\{\s{1,2}plain_name\s\|\strim\s{1,2}\}\}",
                    self.meta.get("plain_name", "").upper(),
                    title,
                )
                return f"{title.upper()}\n\n{dedent(as_plaintext)}"
        return ""

    def get_header_block(self, kind: Literal["reader", "markdown", "plaintext"]) -> str:
        """Returns the version block for the license."""
        original_version: str = self.meta.get("original_version", "")
        plain_version: str = self.plain_version

        match kind:
            case "reader":
                title = f"\n<h1 class='license-title'>{self.meta['plain_name']}</h1>"
                original_version_html = (
                    f"<span class='original_version'>original version: {original_version}</span><br />"
                    if original_version
                    else ""
                )
                plain_version_html = (
                    f"<span class='plain_version'>plain version: {plain_version}</span>"
                )
                version_info = f"""<div class='version-info'>{original_version_html}{plain_version_html}</div>"""
                return f"""<div class="license-header">{title}{version_info}</div>"""
            case "markdown":
                title = f"\n# {self.meta.get('plain_name')}"
                original_text = (
                    f"original version: {original_version}  |  " if original_version else ""
                )
                return f"> {original_text}plain version: {plain_version}\n{title}"
            case _:
                title = f"\n{self.meta.get('plain_name', '').upper()}"
                original_text = (
                    f"original version: {original_version}  |  " if original_version else ""
                )
                return f"{original_text}plain version: {plain_version}\n{title}"

    @cached_property
    def attributes(self) -> dict[str, Any | int | str]:
        """
        Retrieves a dictionary of attributes related to the license.
        This property consolidates various license-related
        information into a single dictionary,
        making it easier to access and manage the relevant data.

        Returns:
            dict[str, Any | int | str]: A dictionary containing attributes such as year,
            markdown and plaintext license texts, plain version, and license type.
        """
        return {
            "title": self.title,
            "year": self.year,
            "reader_license_text": self.reader_license_text,
            "markdown_license_text": self.markdown_license_text,
            "plaintext_license_text": self.plaintext_license_text,
            "plain_version": self.plain_version,
            "license_type": self.license_type,
            "tags": self.tags,
            "changelog": self.changelog,
            "official_license_text": self.official_license_text,
            "has_official": self.has_official,
            "final_markdown": self.license_content,
            "embed_file_markdown": self.embed_file_markdown,
        }

    @cached_property
    def tag_map(self) -> dict[str, str]:
        """Returns the tag map for the license for setting tags."""
        return {
            "distribution": "can-share",  # allowances
            "commercial-use": "can-sell",
            "modifications": "can-change",
            "revokable": "can-revoke",
            "relicense": "relicense",
            "disclose-source": "share-source",  # requirements
            "document-changes": "describe-changes",
            "include-copyright": "give-credit",
            "same-license": "share-alike (strict)",
            "same-license--file": "share-alike (relaxed)",
            "same-license--library": "share-alike (relaxed)",
        }

    @cached_property
    def icon_map(self) -> dict[str, str]:
        """Returns the icon map for the license tab icons."""
        return {
            "reader": ":material-book-open-variant:",
            "markdown": ":octicons-markdown-24:",
            "plaintext": ":nounproject-txt:",
            "embed": ":material-language-html5:",
            "changelog": ":material-history:",
            "official": ":material-license:",
        }

    @cached_property
    def not_advice_text(self) -> str:
        """Returns the not advice text for the license."""
        return dedent(f"""\
            We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

            We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]({self.meta.get("github_issues_link")} "Submit an issue on GitHub") or [edit this page]({self.meta.get("github_edit_link")} "edit on GitHub").
            """)

    @cached_property
    def not_official_text(self) -> str:
        """Returns the not official text for the license."""
        if self.has_official:
            return dedent(f"""\
            Plain License is not affiliated with the original {self.meta["original_name"].strip()} authors or {self.meta["original_organization"].strip()}. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

            If you want to use the {self.meta["plain_name"].strip()}, start by reading the official {self.meta["original_name"].strip()} license text. You can find the official {self.meta["original_name"].strip()} [here]({self.meta["original_url"].strip()} "check out the official {self.meta["original_name"].strip()}"). If you have questions about the {self.meta["original_name"].strip()}, you should talk to a lawyer.
            """)
        return ""

    @property
    def disclaimer_block(self) -> str:
        """Returns the disclaimer block for the license."""
        not_advice_title = "legal advice"
        if not self.has_official:
            return self.blockify(
                self.not_advice_text, "tab" if self.has_official else "warning", not_advice_title, 3
            )
        not_advice = self.tabify(self.not_advice_text, not_advice_title, 1)
        not_official_title = f"the official {self.meta.get('original_name')}"
        not_official = self.tabify(self.not_official_text, not_official_title, 1)
        return (
            f"<div class='admonition warning'><p class='admonition-title'>The {self.meta.get('plain_name', '')} isn't...</p>\n\n"
            f"{not_advice}{not_official}</div>"
        )

    @property
    def reader(self) -> str:
        """Returns the reader block for the license."""
        header_block = self.get_header_block("reader")
        if self.has_official:
            text = dedent(f"""
                {header_block}
                {self.reader_license_text}
                {self.interpretation_block("reader")}
                {self.disclaimer_block}
                """)
        else:
            text = dedent(f"""
                {header_block}
                {self.reader_license_text}
                {self.disclaimer_block}
                """)
        return self.tabify(text, "reader", 1, self.icon_map["reader"])

    @property
    def markdown(self) -> str:
        """Returns the markdown block for the license."""
        header_block = self.get_header_block("markdown")
        body = wrap_text(dedent(f"\n{self.markdown_license_text}\n"))
        text = f"""\n\n```markdown title="{self.meta.get("plain_name", "")} in Github-style markdown"\n\n{header_block}\n\n{body}{wrap_text(self.interpretation_block("markdown"))}\n```\n\n{self.disclaimer_block}\n"""
        return self.tabify(text, "markdown", 1, self.icon_map["markdown"])

    @property
    def plaintext(self) -> str:
        """Returns the plaintext block for the license."""
        header_block = self.get_header_block("plaintext")
        body = wrap_text(dedent(f"\n{self.plaintext_license_text}\n"))
        text = f"""\n\n```plaintext title="{self.meta.get("plain_name", "")} in plain text"\n\n{header_block}\n\n{body}{wrap_text(self.interpretation_block("plaintext"))}\n```\n\n{self.disclaimer_block}\n"""
        return self.tabify(text, "plaintext", 1, self.icon_map["plaintext"])

    @property
    def changelog(self) -> str:
        """Returns the changelog block for the license."""
        return self.tabify(self.changelog_text, "changelog", 1, self.icon_map["changelog"])

    @property
    def official(self) -> str:
        """Returns the official block for the license."""
        if not self.has_official:
            return ""
        text = (
            f"{self.official_license_text}"
            if self.meta.get("link_in_original")
            else f"{self.official_license_text}\n\n{self.meta.get('official_link')}"
        )
        return self.tabify(text, "official", 1, self.icon_map["official"])

    @cached_property
    def embed_link(self) -> str:
        """Returns the embed link for the license."""
        return dedent(f"""
            # Embedding Your License

            ```html title="add this to your site's html"

            <iframe src="{self.embed_url}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            border: 1px solid #E4C580; border-radius: 8px; overflow: hidden auto;"
            title="{self.title}" loading="lazy" sandbox="allow-scripts"
            onload="if(this.contentDocument.body.scrollHeight > 400)
            this.style.height = this.contentDocument.body.scrollHeight + 'px';"
            referrerpolicy="no-referrer-when-downgrade">
                <p>Your browser does not support iframes. View {self.title} at:
                    <a href="{self.page.url}">
                        plainlicense.org
                    </a>
                </p>
            </iframe>

            ```
        """).strip()

    @cached_property
    def embed_instructions(self) -> str:
        """Returns the embed instructions for the license."""
        return dedent(f"""

            The above code will embed the license in your site. It uses an iframe to display the license as it appears on Plain License. This also sandboxes the license to prevent it from affecting your site.

            1. **Copy the code above** using the copy button
            2. **Paste it** into your HTML where you want the license to appear
            3. **Adjust the size** (optional):

               - The default width is 100% (fills the container)
               - The default height is either the content height or 1024px, whichever is smaller.
               - The next section provides more details on customizing the size.

            ## Customizing Your Embedded License

            ### Changing the Size

            Common size adjustments in the `style` attribute:

            ```html

            <!-- Full width, taller -->
            style="width: 100%; height: 800px;"

            <!-- Fixed width, default height -->
            style="width: 800px; height: 500px;"

            <!-- Full width, minimum height -->
            style="width: 100%; min-height: 500px;"

            ```

            ## Color Scheme Preference

            The embedded license will match your visitors' system preferences for light or dark mode by default.

            ### Forcing a Specific Theme

            To force a specific theme, add `?theme=` to the URL, along with `light` or `dark`:

            - For light theme: `src="{self.embed_url}?theme=light"`
            - For dark theme: `src="{self.embed_url}?theme=dark"`

            ### Syncing the License Theme with Your Site (more advanced)

            You can optionally sync the license's light/dark theme to your site's theme. You will need to send the embedded license page a message to tell it what theme your site is currently using. You can include this code in your script bundle or HTML:

            ```javascript title="sync the light/dark theme with your site"

            const syncTheme = () => {{
            const iframe = document.getElementById("license-embed");
            const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
            iframe.contentWindow.postMessage({{ theme }}, "https://plainlicense.org");
            }};

            ```

            If your site has a toggle switch for changing themes, you can link it to the embedded license. Set up the toggle to send a `themeChange` event and add a listener to dispatch the same message. We can't provide specific code for that because it depends on your setup.

            Once your toggle switch is set up to send a `themeChange` event, you need to add a listener to dispatch the same message as before:

            ```javascript title="toggle license theme with site theme"

            const syncTheme = () => {{
            const iframe = document.getElementById("license-embed");
            const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
            iframe.contentWindow.postMessage({{ theme }}, "https://plainlicense.org");
            }};
            document.addEventListener('themeChange', syncTheme);

            ```

            ## Need Help?

            Bring your questions to our [GitHub Discussions](https://github.com/seekinginfiniteloop/PlainLicense/discussions "visit Plain License's discussions page") for help and support.
            """)

    @property
    def embed(self) -> str:
        """Returns the embed block for the license."""
        return self.tabify(
            f"{self.embed_link}{self.embed_instructions}", "html", 1, self.icon_map["embed"]
        )

    @property
    def embed_file_markdown(self) -> str:
        """Returns the embed file markdown for the license."""
        text = dedent(f"""
            {self.get_header_block("reader")}
            {self.reader_license_text}
            """)
        return self.blockify(
            text,
            "admonition",
            f"Plain License: <span class='detail-title-highlight'>The {self.meta.get('plain_name')}</span>",
            3,
            options={"type": "license"},
        )

    @property
    def license_content(self) -> str:
        """Returns the content for a license page."""
        tabs = f"{self.reader}\n{self.embed}\n{self.markdown}\n{self.plaintext}\n{self.changelog}"
        if self.has_official:
            tabs += f"\n{self.official}"
        outro = ("\n\n" + self.meta.get("outro", "") + "\n") if self.meta.get("outro") else "\n"
        return (
            self.blockify(
                f"{tabs}",
                "admonition",
                f"<span class='detail-title-highlight'>The {self.meta.get('plain_name')}</span>",
                6,
                options={"type": "license"},
            )
        ) + outro

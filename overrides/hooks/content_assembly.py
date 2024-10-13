# sourcery skip: avoid-global-variables, do-not-use-staticmethod
"""
Assembles license content for all license pages.

TODO: We can probably make more use of pyMarkdown to handle the processing of the license text; need to investigate further.
"""
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from re import Match, Pattern
from typing import Any

from _logconfig import get_logger
from jinja2 import Environment, FileSystemLoader, Template
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import File
from mkdocs.structure.pages import Page

annotation_pattern: Pattern[str] = re.compile(
    r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\n\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
    re.MULTILINE | re.DOTALL,
)
header_pattern: Pattern[str] = re.compile(
    r'<h2 class="license-first-header">(.*?)</h2>'
)

placeholders = re.compile(r"\{\{\s(.*?)\s\}\}")


if not hasattr(__name__, "ASSEMBLER_LOGGER"):
    ASSEMBLER_LOGGER = get_logger(
        __name__,
        logging.WARNING,
    )

def clean_content(content: dict[str, Any]) -> dict[str, Any] | None:
    """
    Strips whitespace from string values in a dictionary, and from strings in lists.

    Args:
        content (dict[str, Any]): A dictionary containing content that may include strings and lists of strings.

    Returns:
        dict[str, Any]: The cleaned dictionary with whitespace removed from string values.

    Examples:
        cleaned_content = clean_content({"title": "  Example Title  ", "tags": ["  tag1  ", "tag2 "]})
    """
    for key, value in content.items():
        return (
            {key.strip(): value.strip()}
            if isinstance(value, str)
            else {key: [str(item).strip() for item in value]}
            if isinstance(value, list) and all(isinstance(item, str) for item in value)
            else {key: value}
        )


@event_priority(100)
def on_page_markdown(
    markdown_content: str, page: Page, config: MkDocsConfig, files: list[File]
) -> str:
    """
    Pipeline function for processing license content and assembling the final Markdown content for the license page.

    Args:
        markdown_content (str): The original Markdown content of the page.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration settings for MkDocs.
        files (list[File]): A list of files associated with the documentation.

    Returns:
        str: The combined Markdown content including the original content and the rendered license information.

    Raises:
        Exception: If there is an error during template rendering or logging.
    """
    ASSEMBLER_LOGGER.debug(f"Processing page {page.title} in on_page_markdown")
    if not page.meta.get("category"):
        ASSEMBLER_LOGGER.debug(f"No category found in page meta for page {page.title}")
        return markdown_content

    meta = page.meta
    boilerplate = config["extra"]["boilerplate"].copy()
    meta.update(LicenseContent(page).attributes)
    boilerplate["year"] = datetime.now(timezone.utc).year

    rendered_boilerplate = {
        key: Template(value).render(meta) if isinstance(value, str) else value
        for key, value in boilerplate.items()
    }
    meta.update(rendered_boilerplate)
    page.meta = clean_content(meta)
    context = page.meta

    env = Environment(loader=FileSystemLoader("overrides"))
    main_template = env.get_template("license_main.md")
    rendered_content = main_template.render(context)
    return f"{markdown_content}\n{rendered_content}"


def on_post_page(output: str, page: Page, config: MkDocsConfig) -> Any:
    """Replaces year placeholders in the license pages with the current year.
    This was simpler than running a render on the page again, and it's a small change."""
    if re.match(
        r"licenses/(permissive|copyleft|public-domain/source-available|proprietary)/(.+?)/index.html",
        page.url,
    ):
        if match := re.search(r"\{\{\s?year\s?\}\}", output):
            logging.info("Replacing year placeholder")
            output = output.replace(match[0], str(datetime.now().year))
    return output


def load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON"""
    return json.loads(path.read_text())


class LicenseContent:
    """
    Represents a license's content and metadata, including the license text and associated attributes. All license text processing happens here.
    """

    def __init__(self, page: Page) -> None:
        """
        Initializes a new instance of the class with the provided page object.
        This constructor sets up various attributes related to the page's metadata, including tags,
        license type, and processed license texts, ensuring that the object is ready for further operations.

        Args:
            page (Page): The page object containing metadata and content related to the license.

        Examples:
            license_instance = LicenseClass(page)
        """
        self.page = page
        self.meta = page.meta
        self.year = str(datetime.now().year)
        self.license_type = (
            "dedication" if "public" in self.meta["category"] else "license"
        )
        self.reader: str = self.meta["reader_license_text"]
        self.markdown_license_text = self.process_mkdocs_to_markdown()
        self.plaintext_license_text = self.process_markdown_to_plaintext()
        self.plain_version = self.get_plain_version()
        ASSEMBLER_LOGGER.debug("Created License Content object for %s", self.meta["plain_name"])

    def process_markdown_to_plaintext(self) -> str:
        """
        Strips Markdown formatting from the license text to produce a plaintext version.

        Returns:
            str: The processed plaintext version of the Markdown license text.

        Examples:
            plain_text = process_markdown_to_plaintext()
        """
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
        """
        Identifies and processes definitions in the input text, formatting them appropriately.

        Args:
            text (str): The input text containing definitions to be processed.
            plaintext (bool, optional): A flag indicating whether to return definitions in plaintext format.
                Defaults to False.

        Returns:
            str: The processed text with definitions formatted appropriately.

        Examples:
            processed_text = process_definitions(input_text, plaintext=True)
        """

        definition_pattern = re.compile(
            r"(?P<term>`[\w\s]+`)\s*?\n{1,2}[:]\s{1,4}(?P<def>[\w\s]+)\n{2}",
            re.MULTILINE,
        )
        if matches := definition_pattern.finditer(text):
            ASSEMBLER_LOGGER.debug(
                f"Processing definitions: {[match.group(0) for match in matches]}"
            )
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
        return text

    def get_plain_version(self) -> str:
        """
        Retrieves the plain version of the package from a JSON file.
        This function checks for the existence of a `package.json` file in the same directory as the page URL,
        and extracts the version information, returning a default value if the file does not exist or if the version is not valid.

        Returns:
            str: The version string from the package, or "0.0.0" if the file is missing or the version is not valid.
        """
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

        transformed_text = annotation_pattern.sub(replacement, text)
        if footnotes:
            transformed_text += "\n\n"
            for i, footnote in enumerate(footnotes, 1):
                transformed_text += f"[^{i}]: {footnote}\n"
        return transformed_text

    def process_mkdocs_to_markdown(self) -> str:
        """
        Processes MkDocs content and transforms it into Markdown format.
        This function converts the text to footnotes, applies a header transformation,
        and processes any definitions present in the text to produce a final Markdown string.

        Returns:
            str: The processed Markdown text after transformations and definitions have been applied.
        """
        text = self.transform_text_to_footnotes(self.reader)
        ASSEMBLER_LOGGER.debug(f"Transformed text: {text}")
        text = header_pattern.sub(r"## \1", text)
        return self.process_definitions(text)

    @property
    def attributes(self) -> dict[str, Any | int | str]:
        """
        Retrieves a dictionary of attributes related to the license.
        This property consolidates various license-related information into a single dictionary,
        making it easier to access and manage the relevant data.

        Returns:
            dict[str, Any | int | str]: A dictionary containing attributes such as year,
            markdown and plaintext license texts, plain version, and license type.
        """

        return {
            # "tags": self.tags,
            "year": self.year,
            "markdown_license_text": self.markdown_license_text,
            "plaintext_license_text": self.plaintext_license_text,
            "plain_version": self.plain_version,
            "license_type": self.license_type,
        }

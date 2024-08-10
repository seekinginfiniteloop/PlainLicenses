import json
import logging
import re
import textwrap
from datetime import datetime
from pathlib import Path
from pprint import pformat
from typing import Any

import jsonschema
import yaml
from _logconfig import get_logger
from jinja2 import Environment, FileSystemLoader
from mkdocs.config import Config
from yaml.parser import ParserError

logger = get_logger(__name__, logging.DEBUG, logging.INFO, logging.DEBUG)

CONTENT_DIR = Path("content")
SCHEMAS_DIR = Path("schemas")
JINJA_DIR = Path("templates")

LICENSE_TEMPLATE = Path(CONTENT_DIR / "license.yml")
BOILERPLATE_TEMPLATE = Path(CONTENT_DIR / "boilerplate.yml")
LICENSE_SCHEMA = Path(SCHEMAS_DIR / "license_schema.json")
BOILERPLATE_SCHEMA = Path(SCHEMAS_DIR / "boilerplate_schema.json")

annotation_pattern = re.compile(
    r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\n\s]{1,4}[1-3]\.\s{1,2}(?P<annotation>[*\w\s]+?)\n",
    re.MULTILINE | re.DOTALL,
)


def on_pre_build(config: Config) -> None:
    """
    Triggers the main build process using the provided configuration.

    Args:
        config: The configuration object for the build process.

    Returns:
        None
    """
    main(config)


def load_yaml(s: str) -> Any:
    """
    Loads YAML data from a string using yaml.safe_load.

    Args:
        s: The YAML string to load.

    Returns:
        The loaded YAML data.
    """
    if len(s) > 7600:
        logger.debug(s[7500:7600])
    try:
        return yaml.safe_load(s)
    except ParserError as e:
        logger.error(f"Error parsing YAML: {pformat(e.problem_mark.get_snippet())}\n{e.problem_mark.name}\n{e.context_mark}\n{e.note}\n{pformat(e)}")

def load_json(file_path: Path) -> Any:
    """
    Loads JSON data from a file specified by the given file path.

    Args:
        file_path: The path to the JSON file to load.

    Returns:
        The loaded JSON data.
    """

    return json.load(file_path.read_text())


def validate_yaml(yaml_data: Any, schema: Any) -> None:
    """
    Validates YAML data against a given schema using jsonschema.

    Args:
        yaml_data: The YAML data to validate.
        schema: The schema to validate the YAML data against.

    Returns:
        None
    """

    try:
        jsonschema.validate(instance=yaml_data, schema=schema)
        print(f"{yaml_data} is valid.")
    except jsonschema.exceptions.ValidationError as e:
        print(f"Validation error: {e.message}")


def render_template(license) -> str:
    """
    Renders a template using Jinja2 with the provided content template and license.

    Args:
        content_template: The content template to render.
        license: The license to use in the rendering.

    Returns:
        The rendered template as a string.
    """

    env = Environment(loader=FileSystemLoader(JINJA_DIR))
    template = env.get_template("license_template.jinja2")
    return template.render(license)


def render_boilerplate(boilerplate, context) -> Any:
    """
    Renders a boilerplate template using a given context.

    Args:
        boilerplate: The boilerplate template to render.
        context: The context data to render the template with.

    Returns:
        The rendered result after applying the context to the template.
    """
    logger.info("Rendering boilerplate...")
    env = Environment()
    template = env.from_string(yaml.dump(boilerplate))
    return load_yaml(template.render(context))


def wrap_text(text: str, plaintext: bool = False, width: int = 100) -> str:
    """
    Wraps text to a specified width, preserving list item formatting.

    Args:
        text (str): The input text to be wrapped.
        width (int, optional): The maximum width for wrapping the text. Defaults to 80.

    Returns:
        str: The wrapped text.

    Examples:
        wrapped_text = wrap_text("This is a long sentence that needs to be wrapped to fit within 100 characters.")
    """
    lines: list[str] = text.split("\n")
    wrapped_lines = []

    for line in lines:
        if line.strip().startswith(("-")) or re.match(r"^\d+\.", line.strip()):
            bullet = line[: line.index(line.strip()[0])]
            content = line[len(bullet) :].strip()
            wrapped = textwrap.fill(
                content, width=width - len(bullet) - 1, subsequent_indent="  "
            )
            wrapped_lines.append(f"{bullet}{wrapped}")
        elif line.startswith("> ") and not plaintext:
            wrapped_lines.append(
                f"{textwrap.fill(line[2:], width=width - 2, initial_indent="> ", subsequent_indent='> ')}"
            )
        elif line.startswith("> ") and plaintext:
            wrapped_lines.append(f"{textwrap.fill(line[2:], width=width - 2)}")
        else:
            wrapped_lines.append(textwrap.fill(line, width=width))
    return "\n".join(wrapped_lines)


def transform_text_to_footnotes(text: str) -> str:
    """
    Transforms text by replacing annotations with footnotes and adding footnote references at the end.

    Args:
        text: The text to transform by replacing annotations with footnotes.

    Returns:
        The transformed text with annotations replaced by footnotes and footnote references added at the end.
    """

    footnotes = []

    def replacement(match) -> str:
        footnote_num = len(footnotes) + 1
        footnotes.append(match.group("annotation").strip())
        return f"[^{footnote_num}]"

    transformed_text = annotation_pattern.sub(replacement, text)
    if footnotes:
        transformed_text += "\n\n"
        for i, footnote in enumerate(footnotes, 1):
            transformed_text += f"[^{i}]: {footnote}\n"
    return transformed_text


def handle_link_references(text: str, reference_links: dict[str, str]) -> str:
    """
    Handles link references in the text by replacing reference tags with corresponding link URLs.

    Args:
        text: The text containing link references to handle.
        reference_links: The dictionary of reference links to use for replacement.

    Returns:
        The text with link references replaced by their corresponding URLs.
    """

    if not reference_links:
        return text
    links = re.finditer(r"\[(?P<text>.*?)\]\[(?P<ref>.*?)\]", text)
    for link in links:
        if ref := next(
            (
                ref
                for ref in reference_links
                if ref["reference_tag"] == link.group("ref")
            ),
            None,
        ):
            text = text.replace(
                link.group(), f"{link.group('text')} ({ref['link_url']})"
            )
    return text


def process_markdown_to_plaintext(text: str, reference_links: dict[str, str]) -> str:
    """
    Processes Markdown text to plaintext by removing Markdown syntax.

    Args:
        text: The Markdown text to process.

    Returns:
        The processed plaintext text.
    """
    text = process_definitions(text, plaintext=True)
    text = handle_link_references(text, reference_links)
    text = re.sub(
        r"#+ |(\*\*|\*|`)(.*?)\1", r"\2", text
    )  # Remove headers, bold, italic, inline code
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)  # Handle links
    text = re.sub(r"!\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)
    text = re.sub(r"(`{3}plaintext)", "---", text)  # Remove plaintext code blocks
    text = re.sub(r"(`{3}\s*)", "---", text)  # Remove code blocks# Handle images
    return text


def process_definitions(text: str, plaintext=False) -> str:
    """
    Processes definitions in the text by formatting them as terms and their corresponding definitions.

    Args:
        text: The text containing definitions to process.
        plaintext: A flag indicating whether to format the definitions in plaintext style.

    Returns:
        The text with definitions processed and formatted accordingly.
    """
    definition_pattern = re.compile(
        r"(?P<term>`[\w\s]+`)\s*?\n{1,2}[:]\s{1,4}(?P<def>[\w\s]+)\n{2}", re.MULTILINE
    )
    if matches := definition_pattern.finditer(text):
        logger.debug(matches)
        for match in matches:
            term = match.group("term")
            def_text = match.group("def")

            replacement = (
                f"{term.replace("`", "")}\n- {def_text}\n\n"
                if plaintext
                else f"{term}\n: {def_text}\n\n"
            )
            text = text.replace(match.group(0), replacement)
    if matches := re.findall(r"\{\s?\.\w+\s?\}", text):
        for match in matches:
            text = text.replace(match, "")
    return text


def process_mkdocs_to_markdown(text: str) -> str:
    """
    Processes MkDocs-style Markdown text to standard Markdown text.

    Args:
        text: The MkDocs-style Markdown text to process.

    Returns:
        The processed standard Markdown text.
    """

    text = transform_text_to_footnotes(text)
    return process_definitions(text)


def decode_unicode_escapes(obj: Any) -> Any:
    """
    Decodes Unicode escapes in a given object if it is a string or a dictionary containing strings.

    Args:
        obj: The object to decode Unicode escapes in.

    Returns:
        The object with Unicode escapes decoded.
    """

    if isinstance(obj, str):
        return obj.encode("utf-8").decode("unicode-escape")
    if isinstance(obj, dict):
        for k, v in obj.items():
            obj[k] = decode_unicode_escapes(v)
    elif isinstance(obj, list):
        for subitem in obj:
            return decode_unicode_escapes(subitem)
    return obj


def assemble_content_template() -> dict[str, str | list[str] | dict[str, str]]:
    """
    Assembles content template by combining license and boilerplate templates, loading YAML content, and decoding Unicode escapes.

    Returns:
        A dictionary representing the assembled content template.
    """

    combined = LICENSE_TEMPLATE.read_text('utf-8') + "\n" + BOILERPLATE_TEMPLATE.read_text('utf-8')
    return load_yaml(combined)


def build_licenses(
    content_template: dict[str, str | list[str] | dict[str, str | None] | None],
    licenses: list[Any],
) -> None:
    """
    Builds licenses by updating content template, rendering license text, and writing the final markdown to files.

    Args:
        content_template: The content template to update with the current year.
        licenses: The list of licenses to process and update.

    Returns:
        None
    """

    content_template["year"] = datetime.now().year
    for license in licenses:
        spdx = license["spdx_id"]
        category = license["category"]
        path = Path(f"docs/licenses/{category}/{spdx}/index.md")
        license["license_type"] = (
            "dedication" if category == "public-domain" else "license"
        )
        logger.debug(f"Processing license: {pformat(license)}")
        license["markdown_license_text"] = process_mkdocs_to_markdown(
            license["reader_license_text"]
        )
        license["plaintext_license_text"] = process_markdown_to_plaintext(
            license["reader_license_text"], license["reference_links"]
        )
        license["markdown_license_text"] = wrap_text(license["markdown_license_text"])
        license["plaintext_license_text"] = wrap_text(license["plaintext_license_text"])
        license.update(render_boilerplate(content_template, license))
        final_markdown = render_template(license)
        if path.exists() and path.read_text() == final_markdown:
            continue
        path.unlink(missing_ok=True)
        path.write_text(final_markdown)


def main(config: Config) -> None:
    logger.info("Building licenses...")
    globals()["lang"]: str = config.user_configs[0]["theme"]["language"]
    globals()["LICENSE_DIR"]: Path = Path(CONTENT_DIR / lang)
    content_template = assemble_content_template()
    files = list(LICENSE_DIR.walk())[0][2]
    licenses = [
        decode_unicode_escapes(load_yaml(Path(LICENSE_DIR / file).read_text()))
        for file in files
    ]
    logger.info(f"Loaded licenses... building {len(licenses)} licenses.")
    build_licenses(content_template, licenses)


if __name__ == "__main__":
    main()

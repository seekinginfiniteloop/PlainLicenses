import re
import logging
import textwrap
from typing import Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Changing this will change the warning message inserted at the bottom of all licenses

warning_msg = """/// details | **Warning**: This is not legal advice
    type: warning
We are not lawyers. This is not legal advice. You use this license at your own risk. If you need legal advice, talk to a lawyer.

We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else (including lawyers) understand this license. If you see a mistake or have a suggestion, please [submit an issue].
///\n\n"""

pattern = re.compile(r"/{3}\s*tab\s*\|\s*reader\s*(.*?)\s*/{3}", re.MULTILINE | re.DOTALL)
legal_pattern = re.compile(r"/{3}\s*tab\s*\|\s*original\s[']legalese[']\s*(.*?)\s*/{3}", re.MULTILINE | re.DOTALL)
include = re.compile(r"licenses/.+/.*")

def wrap_text(text: str, width: int = 100) -> str:
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

    lines: list[str] = text.split('\n')
    wrapped_lines = []

    for line in lines:
        if line.strip().startswith(('-')) or re.match(r'^\d+\.', line.strip()):
            bullet = line[:line.index(line.strip()[0])]
            content = line[len(bullet):].strip()
            wrapped = textwrap.fill(content, width=width-len(bullet)-1, subsequent_indent='  ')
            wrapped_lines.append(f"{bullet}{wrapped}")
        else:
            wrapped_lines.append(textwrap.fill(line, width=width))

    return '\n'.join(wrapped_lines)

def markdown_to_plain(text: str) -> str:
    """
    Converts Markdown text to plain text by removing formatting elements.

    Args:
        text (str): The Markdown text to be converted.

    Returns:
        str: The plain text version of the input Markdown text.
    """

    text = re.sub(r'#+ |(\*\*|\*|`)(.*?)\1', r'\2', text)  # Remove headers, bold, italic, inline code
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'\1 (\2)', text)  # Handle links
    text = re.sub(r'!\[(.*?)\]\((.*?)\)', r'\1 (\2)', text)  # Handle images
    return text

def insert_tabs(markdown: str, match: re.Match[str]) -> str:
    """
    Inserts raw markdown and plain text versions of the license content into the Markdown text before it is rendered to HTML.

    Args:
        markdown (str): The original Markdown text.
        match (re.Match[str]): The regular expression match object.

    Returns:
        str: The Markdown text with inserted tabbed content.
    """

    _, end = match.span()
    content = match.group(1).strip()

    wrapped_markdown = wrap_text(content)
    wrapped_plain_text = wrap_text(markdown_to_plain(content))

    new_tabs = f"""/// tab | markdown

```markdown
{wrapped_markdown}

```
///
/// tab | plain text

```text
{wrapped_plain_text}
```

///"""

    return markdown[:end] + "\n\n" + new_tabs + markdown[end:]

def insert_warning(markdown: str, match: re.Match[str]) -> str:
    """
    Inserts a warning message into Markdown text after the tabbed content.

    Args:
        markdown (str): The original Markdown text.
        match (re.Match[str]): The regular expression match object.

    Returns:
        str: The Markdown text with the warning message inserted.
    """

    _, end = match.span()
    return markdown[:end] + "\n\n" + warning_msg + markdown[end:]

def on_page_markdown(markdown: str, **kwargs: dict[str, Any]) -> str:
    """
    Captures markdown license content and adds tabs for plain text and markdown versions. Also adds a warning message to the bottom of the license page.

    Args:
        markdown (str): The original Markdown text.
        **kwargs (dict[str, Any]): Additional keyword arguments.

    Returns:
        str: The processed Markdown text with inserted tabbed content and warning messages.
    """

    if not include.match(kwargs['page'].url):
        logger.debug("URL does not match include pattern. Skipping.")
        return markdown

    if match := pattern.search(markdown):
        markdown = insert_tabs(markdown, match)
    else:
        logger.debug("No matches found in the markdown.")

    if match := legal_pattern.search(markdown):
        markdown = insert_warning(markdown, match)

    logger.debug("Finished processing markdown.")
    return markdown

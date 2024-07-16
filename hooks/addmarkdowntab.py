import re
import logging
import textwrap
from typing import Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modified pattern to be more flexible
pattern = re.compile(r"/{3}\s*tab\s*\|\s*reader\s*(.*?)\s*/{3}", re.MULTILINE | re.DOTALL)
include = re.compile(r"licenses/.+/.*")

def wrap_text(text: str, width: int = 80) -> str:
    lines = text.split('\n')
    wrapped_lines = []

    for line in lines:
        # Check if the line is a list item
        if line.strip().startswith(('-', '*', '+')) or re.match(r'^\d+\.', line.strip()):
            # It's a list item, preserve the bullet/number and indent the wrapped content
            bullet = line[:line.index(line.strip()[0])]  # Preserve any leading space
            content = line[len(bullet):].strip()
            wrapped = textwrap.fill(content, width=width-len(bullet)-1, subsequent_indent='  ')
            wrapped_lines.append(f"{bullet}{wrapped}")
        else:
            # Not a list item, wrap normally
            wrapped_lines.append(textwrap.fill(line, width=width))

    return '\n'.join(wrapped_lines)

def markdown_to_plain(text: str) -> str:
    # Remove Markdown formatting
    text = re.sub(r'#+ ', '', text)  # Remove headers
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Remove bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)  # Remove italic
    text = re.sub(r'`(.*?)`', r'\1', text)  # Remove inline code

    # Handle links: preserve both link text and URL
    text = re.sub(r'\[(.*?)\]\((.*?)\)', lambda m: f"{m.group(1)} ({m.group(2)})", text)

    # Handle images: keep alt text and URL
    text = re.sub(r'!\[(.*?)\]\((.*?)\)', lambda m: f"{m.group(1)} ({m.group(2)})", text)

    return text

def on_page_markdown(markdown: str, **kwargs: dict[str, Any]) -> str:
    logger.debug(f"Processing page: {kwargs['page'].url}")

    if not include.match(kwargs['page'].url):
        logger.debug("URL does not match include pattern. Skipping.")
        return markdown

    matches = list(pattern.finditer(markdown))

    if not matches:
        logger.debug("No matches found in the markdown.")
        return markdown

    logger.debug(f"Found {len(matches)} matches.")

    # Process matches in reverse order to avoid messing up string indices
    for match in reversed(matches):
        _, end = match.span()
        content = match.group(1).strip()

        # Wrap the content for markdown tab
        wrapped_markdown = wrap_text(content)

        # Create plain text version
        plain_text = markdown_to_plain(content)
        wrapped_plain_text = wrap_text(plain_text)

        # Create the new tabs content
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

        # Insert the new tabs after the existing one
        markdown = markdown[:end] + "\n\n" + new_tabs + markdown[end:]

    logger.debug("Finished processing markdown.")
    return markdown

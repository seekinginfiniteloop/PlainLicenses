import collections
import re
import logging
import textwrap
from typing import Any
from weakref import ref

from mkdocs.plugins import event_priority

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

file_handler = logging.FileHandler(f"{__name__}.log")
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


reader_pattern = re.compile(
    r"/{4}\s*tab\s*\|\s*?reader[\s\n]*?(?P<content>.*?)(?=\n/{4})(?:\n+?/{4}\s*?tab\s*?\|)",
    re.MULTILINE | re.DOTALL
)
embedded_pattern = re.compile(r"(P<blockstart>/{3}(?!/))\s*?\w+\s*?\|.*?(p<internalblock>/{3}\s*?\w+?\s*?\|\s*?\w*?.*?/{3})(<endblock>/{3}(?!\s*?\w+?|/))", re.MULTILINE | re.DOTALL)

include = re.compile(r"licenses/.+/.*")

def set_metadata_dict(kwargs: dict[str, Any]) -> dict[str, Any]:
    global metadata_dict
    metadata_dict = dict(kwargs['page'].meta.items())
    metadata_dict['page_url'] = kwargs['page'].url
    return metadata_dict


def get_unofficial_license_msg(license_name: str, original_license_url: str):
    return f"""/// details | **This is not the official {license_name}**
    type: note

 Plain License is not affiliated with the original {license_name} authors or their organization. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

If you want to use the Plain {license_name}, you should refer to the original license text to make sure you understand how it might be different. You can find the official {license_name} [here]({original_license_url}).

///\n\n
"""

def get_not_legal_advice_message(url: str) -> str:
    return f"""\n/// details | **Warning**: This is not legal advice
    type: warning

We are not lawyers. This is not legal advice. You use this license at your own risk. If you need legal advice, talk to a lawyer.

We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else (including lawyers) understand this license. If you see a mistake or have a suggestion, please [submit an issue](https://github.com/seekinginfiniteloop/PlainLicense/issues/new/choose) or [edit it yourself](https://github.com/seekinginfiniteloop/PlainLicense/edit/dev/docs/{url}).

///\n\n"""

def get_interpretation_msg(url: str, license_type: str, license_name: str, blocks: bool = True) -> str:
    if blocks:
        return f"""/// details | **If you are legally interpreting this {license_type}...**\n    type: note\n\nIf any part of this {license_type} is not enforceable, the rest of the {license_type} will still apply. This {license_type} is a plain language adaptation of the {license_name}. If any part of this {license_type} is unclear, you should use the official [{license_name}]({url}) to clarify our intent.\n\n///\n"""
    return f"""\n---\n#### If you are legally interpreting this {license_type}\n\n> If any part of this {license_type} is not enforceable, the rest of the {license_type} will still apply. If any part of this license is unclear, you should use the official\n> [{license_name}]({url}) to clarify our intent.\n---\n"""

def extract_annotations(text: str, start: int, end: int):
    logger.debug(f"Extracting annotations from text: {start}, {end}")
    annotations_pattern = re.compile(r"(P<num>\d)\.\s{0,2}(P<note>.*?)\n")
    return annotations_pattern.finditer(text[start:end])

def update_text_with_citations(text: str, search_space: str, citations: list[re.Match[str]], search_start: int) -> tuple[str, list[re.Match[str]]]:
    cites_pattern = re.compile(r"\(\d\)")
    matches = cites_pattern.finditer(search_space[::-1])
    logger.debug(f"Matches: {matches}")
    local_cites = collections.deque()
    for j, match in enumerate(matches):
        if j == len(citations):
            break
        if citation :=  next((cite for cite in citations if cite.group('num') in match.group()[1]), None):
            logger.debug(f"Found citation: match: {match.group()}, citation: {citation.group()}")
            search_space = search_space.replace(match.group(), f"[^{citation.group('num')}]", 1)
            _, cite_end = citation.span()
            text = text[:search_start] + search_space + text[cite_end:]
            local_cites.appendleft(citation.group('note'))
    return text, local_cites

def handle_annotations(text: str) -> str:
    annotation_marker = re.compile(r"\{\s{0,2}\.annotate\s{0,2}\}")
    notations = annotation_marker.finditer(text)
    if not notations:
        return text

    all_cites = []
    starts = [match.start() for match in notations]
    for i, start in enumerate(starts):
        search_start = 0 if i == 0 else starts[i-1]
        search_space = text[search_start:start]
        next_notation = text.find("1.", start + len("{.annotate}") + 1)
        end_notation = text.find("\n\n", next_notation)
        logger.debug(f"annotation text: {text[start:end_notation]}")
        if related_annotations := list(extract_annotations(text, start, end_notation)):
            text, local_cites = update_text_with_citations(text, search_space, related_annotations, search_start)
            all_cites.extend(local_cites)

    footnotes = [f"[^{i}]: {annotation}" for i, annotation in enumerate(all_cites, 1)]
    text = f"{text}\n{'\n'.join(footnotes)}\n\n"
    while notation := annotation_marker.search(text):
        text = text[:notation.start()].strip() + text[notation.end():].strip()
    return text

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
    lines: list[str] = text.split('\n')
    wrapped_lines = []

    for line in lines:
        if line.strip().startswith(('-')) or re.match(r'^\d+\.', line.strip()):
            bullet = line[:line.index(line.strip()[0])]
            content = line[len(bullet):].strip()
            wrapped = textwrap.fill(content, width=width-len(bullet)-1, subsequent_indent='  ')
            wrapped_lines.append(f"{bullet}{wrapped}")
        elif line.startswith('> ') and not plaintext:
            wrapped_lines.append(f"{textwrap.fill(line[2:], width=width-2, initial_indent="> ", subsequent_indent='> ')}")
        elif line.startswith('> ') and plaintext:
            wrapped_lines.append(f"{textwrap.fill(line[2:], width=width-2)}")
        else:
            wrapped_lines.append(textwrap.fill(line, width=width))

    return '\n'.join(wrapped_lines)

def get_definitions(text: str) -> tuple[list[tuple[str, str]], int, int] | None:
    """
    Retrieves definitions from a text block.

    Args:
        text (str): The text to be processed.

    Returns:
        list[tuple[str, str]]: A list of tuples containing term-definition pairs.
    """
    definition = re.compile(r"(?P<term>`[\w\s]+`)\s*?\n{2}[:]\s{4}(?P<definition>[\w\s]+)\n{2}", re.MULTILINE)
    definitions = list(definition.finditer(text))
    start = definitions[0].start() if definitions else None
    end = definitions[-1].end() if definitions else None
    logger.debug(f"Found definitions: {definitions}")
    logger.debug(f"Definitions text: {text[start:end]}")
    return [
        (match.group('term'), match.group('definition'))
        for match in definitions
        if match
    ], start, end

def handle_link_references(text: str) -> str:
    link_text = re.compile(r"\[(?P<text>.*?)\]\[(?P<ref>.*?)\]")
    link_refs = re.compile(r"\[(?P<ref>.*?)\]:\s(?P<url>.*?)\n")
    links = link_text.finditer(text)
    refs = link_refs.finditer(text)
    for link in links:
        if ref := next(
            (
                ref.group('url')
                for ref in refs
                if ref.group('ref') == link.group('ref')
            ),
            None,
        ):
            text = text.replace(link.group(), f"{link.group('text')} <{ref}>")
    return text


def markdown_to_plain(text: str) -> str:
    """
    Converts Markdown text to plain text by removing formatting elements.

    Args:
        text (str): The Markdown text to be converted.

    Returns:
        str: The plain text version of the input Markdown text.
    """
    text = handle_link_references(text)
    text = re.sub(r'#+ |(\*\*|\*|`)(.*?)\1', r'\2', text)  # Remove headers, bold, italic, inline code
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'\1 (\2)', text)  # Handle links
    text = re.sub(r'!\[(.*?)\]\((.*?)\)', r'\1 (\2)', text)
    text = re.sub(r"(`{3}plaintext)", "---", text)  # Remove plaintext code blocks
    text = re.sub(r"(`{3}\s*)", "---", text)  # Remove code blocks# Handle images
    return text

def assemble_markdown(reader_md: str, reg_md: str, plaintext: str, legal_md: str) -> str:
    """
    Assembles different parts into a complete markdown document.

    Args:
        reader_md (str): Markdown content for readers.
        reg_md (str): Markdown content for regulations.
        plaintext (str): Plain text content.
        legal_md (str): Markdown content for legal information.

    Returns:
        str: The assembled markdown document.
    """

    return f"""//// {reader_md} \n ////\n\n
//// tab | markdown
```markdown
{reg_md}
```
////

//// tab | plain text
```plaintext
{plaintext}
```
////

{legal_md}\n\n
"""

@event_priority(100)
def on_page_markdown(markdown: str, **kwargs: dict[str, Any]) -> str:
    """
    Captures markdown license content and adds tabs for plain text and markdown versions. Also adds a warning message to the bottom of the license page.

    Args:
        markdown (str): The original Markdown text.
        **kwargs (dict[str, Any]): Additional keyword arguments.

    Returns:
        str: The processed Markdown text with inserted tabbed content and warning messages.
    """
    metadata_dict = set_metadata_dict(kwargs)
    if not include.match(kwargs['page'].url) or 'index' in kwargs['page'].url:
        logger.debug("URL does not match include pattern. Skipping.")
        return markdown
    template_url, license_name, license_url = kwargs['page'].url, kwargs['page'].meta['license_name'], kwargs['page'].meta['original_license_url']
    license_type = "dedication" if kwargs['page'].meta['category'] == "public-domain" else "license"
    logger.debug(f"template url: {template_url}, license name: {license_name}, license url: {license_url}")
    interpretation_msg_blk = get_interpretation_msg(license_url, license_type, license_name)
    interpretation_msg_md = get_interpretation_msg(license_url, license_type, license_name, blocks=False)
    unofficial_license_msg = get_unofficial_license_msg(license_name, license_url)
    not_legal_advice_msg = get_not_legal_advice_message(template_url)

    if reader_pattern.search(markdown):
        pre_reader_idx = markdown.index("////")
        pre_reader = markdown[:pre_reader_idx]
        end_reader_idx = markdown.index("////", pre_reader_idx + 4)
        logger.debug(f"Preparing to process markdown for {kwargs['page'].url}.")
        reader_content = markdown[pre_reader_idx:end_reader_idx].replace("////", "").strip()
        reg_md = reader_content.replace("tab | reader", "").strip() + "\n\n" + interpretation_msg_md
        #logger.debug(f"\nreplaced tab\n..beginning to process annotations")
        reg_md = handle_annotations(reg_md)
        plaintext = reg_md
        if definitions := get_definitions(reg_md):
            definitions, start, end = definitions
            new_definitions = []
            plain_definitions = []
            for term, definition in definitions:
                term, definition = term.strip(), definition.strip()
                definition_dict[template_url].append((term, definition))
                new_definitions.append(f"{term}\n: {definition}")
                plain_definitions.append(f"{term}: {definition}")
            reg_md_defs = reg_md[:start] + "\n\n".join(new_definitions) + "\n\n" + reg_md[end:]
            plaintext = reg_md[:start] + "\n\n".join(plain_definitions) + "\n\n" + reg_md[end:]
            reg_md = reg_md_defs
        #logger.debug(f"\nregular markdown:\n{reg_md}")
        logger.debug(f"\nfinished processing annotations\n..beginning to wrap text")
        legal_md = markdown[(end_reader_idx + 4):] + "\n" + unofficial_license_msg + not_legal_advice_msg
        #logger.debug(f"Legal markdown: {legal_md}")
        enhanced_md = reader_content + "\n\n" + interpretation_msg_blk
        #logger.debug(f"Enhanced markdown: {enhanced_md}")
        reg_md = wrap_text(reg_md)
        plaintext = markdown_to_plain(plaintext)
        plaintext = wrap_text(plaintext, plaintext=True)

        markdown = assemble_markdown( enhanced_md, reg_md, plaintext, legal_md)
        markdown = pre_reader + markdown
        #logger.debug(f"Fully assembled markdown: {markdown}")

    else:
        logger.debug(f"No matches found in the markdown for {kwargs['page'].url}.")

    logger.debug("Finished processing markdown.")
    return markdown

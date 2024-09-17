import logging
from typing import Any

import markdown
from _logconfig import get_logger
from funcy import rpartial
from jinja2 import Environment
from markupsafe import Markup
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from PIL import Image

Image.MAX_IMAGE_PIXELS = 300000000
# avoid "DecompressionBombError: Image size (XXXXXX pixels) exceeds limit of 89478485 pixels, could be decompression bomb DOS attack."
# We're a static site, so we don't need to worry about decompression bombs.

if not hasattr(__name__, "ENV_LOGGER"):
    ENV_LOGGER = get_logger(__name__, logging.INFO)

def md_filter(text: str, config: MkDocsConfig, **kwargs) -> Any:
    """
    Adds markdown filter to Jinja2 environment using markdown extensions and configurations from the mkdocs.yml file.
    """
    md = markdown.Markdown(
        extensions=config["markdown_extensions"],
        extension_configs=config.get("mdx_configs", {}),
        # if you need to pass configs for the extensions, you can under the key "mdx_configs"
    )
    return Markup(md.convert(text))


@event_priority(100)  # run first
def on_env(env: Environment, config: MkDocsConfig, files: Files) -> Environment:
    """
    Adds markdown filter to Jinja2 environment using markdown extensions and configurations from the mkdocs.yml file
    Also adds Jinja2 extensions: do, loopcontrols
    """
    # we have to pass the extensions each time for pyMarkdown, and env.filters doesn't allow for that... rpartial to the rescue!
    env.filters["markdown"] = rpartial(md_filter, config)
    env.add_extension("jinja2.ext.do")
    env.add_extension("jinja2.ext.loopcontrols")
    ENV_LOGGER.info(
        "Added Jinja extensions: do, loopcontrols and filters: markdown to jinja environment."
    )
    return env

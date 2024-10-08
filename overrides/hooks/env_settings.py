"""Sets jinja2 environment settings for the mkdocs project."""
from calendar import c
import json
import logging
from pathlib import Path
from typing import Any, Callable

import markdown
from _logconfig import get_logger
from funcy import rpartial
from jinja2 import Environment
from markupsafe import Markup
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.livereload import LiveReloadServer
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from PIL import Image

development = None

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

def get_updates()-> dict[str, str]:
    """
    Get the latest updates from the updates.md file.
    """
    path = Path("overrides/buildmeta.json")
    server = "http://127.0.0.1:8000" if development else "https://plainlicense.org"
    json_data = json.loads(path.read_text())
    img_element: str = json_data["noScriptImage"]
    json_data["noScriptImage"] = img_element.replace("docs/", f"{server}/")
    return json_data

def on_serve(server: LiveReloadServer, config: MkDocsConfig, builder: Callable) -> LiveReloadServer:
    """
    Sets the build type for the site based on the command used to build the site.
    """
    global development
    development = True
    return server


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
    updates = get_updates()
    env.globals["no_script_image"] = updates["noScriptImage"]
    env.globals["css_bundle"] = updates["CSSBUNDLE"]
    env.globals["js_bundle"] = updates["SCRIPTBUNDLE"]
    ENV_LOGGER.info(
        "Added Jinja extensions: do, loopcontrols and filters: markdown to jinja environment."
    )
    return env

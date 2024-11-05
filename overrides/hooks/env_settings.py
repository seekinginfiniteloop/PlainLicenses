"""Sets jinja2 environment settings for the mkdocs project."""

import json
import logging
from pathlib import Path

import markdown
from _utils import Status
from funcy import rpartial
from hook_logger import get_logger
from jinja2 import Environment
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from PIL import Image

Image.MAX_IMAGE_PIXELS = 300000000
# avoid "DecompressionBombError: Image size (XXXXXX pixels) exceeds limit of 89478485 pixels, could be decompression bomb DOS attack."
# We're a static site, so we don't need to worry about decompression bombs.

if not hasattr(__name__, "env_logger"):
    env_logger = get_logger(__name__, logging.WARNING)


def md_filter(text: str, config: MkDocsConfig) -> str:
    """
    Adds markdown filter to Jinja2 environment using markdown extensions and configurations from the mkdocs.yml file.
    """
    md = markdown.Markdown(
        extensions=config["markdown_extensions"] or [],
        extension_configs=config["mdx_configs"] or {},
    )
    return md.convert(text)


def get_build_meta_values() -> dict[str, str]:
    """
    Uses the buildmeta.json file, which is generated by the javascript/css bundler, to get the values for the css and js bundles.
    """
    status = Status.status()
    production = status.production if status else False
    path = Path("overrides/buildmeta.json")
    server = "https://plainlicense.org" if production else "http://127.0.0.1:8000"
    json_data = json.loads(path.read_text())
    img_element: str = json_data["noScriptImage"]
    json_data["noScriptImage"] = img_element.replace("docs/", f"{server}/")
    return json_data


@event_priority(100)  # run first
def on_env(env: Environment, config: MkDocsConfig, files: Files) -> Environment:
    """
    Adds markdown filter to Jinja2 environment using markdown extensions and configurations from the mkdocs.yml file
    Also adds Jinja2 extensions: do, loopcontrols
    """
    config_exts = config["markdown_extensions"]
    extension_tuples = [
        (item, None) if isinstance(item, str) else item.items() for item in config_exts
    ]
    markdown_configs = {item[0]: item[1] for item in extension_tuples}
    extensions = list(markdown_configs.keys())

    # we have to pass the extensions each time for pyMarkdown, and env.filters doesn't allow for that... rpartial to the rescue!
    env.filters["markdown"] = rpartial(md_filter, config)
    env.add_extension("jinja2.ext.do")
    env.add_extension("jinja2.ext.loopcontrols")
    env.add_extension("jinja2.ext.debug")
    build_updates = get_build_meta_values()
    env.globals["no_script_image"] = str(build_updates["noScriptImage"]) # type: ignore
    env.globals["css_bundle"] = build_updates["CSSBUNDLE"] # type: ignore
    env.globals["js_bundle"] = build_updates["SCRIPTBUNDLE"] # type: ignore
    logger = env_logger.getChild("on_env")
    env_logger.info(
        "Added Jinja extensions: do, loopcontrols and filters: markdown to jinja environment."
    )
    logger.debug("Markdown extensions: %s", extensions)
    logger.debug("Environment globals: %s", env.globals)
    return env

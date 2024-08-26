import markdown
from markupsafe import Markup
from typing import Any

from funcy import rpartial

config = None

def md_filter(text, config, **kwargs) -> Any:
    md = markdown.Markdown(
        extensions=config["markdown_extensions"],
        extension_configs=config.get("mdx_configs", {})
    )
    return Markup(md.convert(text))

def on_env(env, config, files):
    env.filters["markdown"] = rpartial(md_filter, config)
    return env

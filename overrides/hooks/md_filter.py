from typing import Any

import markdown
from funcy import rpartial
from markupsafe import Markup

config = None


def md_filter(text, config, **kwargs) -> Any:
    md = markdown.Markdown(
        extensions=config["markdown_extensions"],
        extension_configs=get("mdx_configs", {}),
    )
    return Markup(md.convert(text))


def on_env(env, config, files):
    env.filters["markdown"] = rpartial(md_filter, config)
    return env

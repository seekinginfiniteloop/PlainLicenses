import markdown
from markupsafe import Markup
from typing import Any

config = None

def md_filter(text, config, **kwargs) -> Any:
    md = markdown.Markdown(
        extensions=config["markdown_extensions"],
        extension_configs=self.config.get("mdx_configs", {})
    )
    return Markup(md.convert(text))

def on_env(env, config, files):
    globals()["config"] = config
    config = config
    env.filters["markdown"] = md_filter
    return env

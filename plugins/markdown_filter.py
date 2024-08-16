"""
Copyright (c) 2018 Byrne Reese

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

import markdown
from mkdocs.plugins import BasePlugin
from markupsafe import Markup
from jinja2 import Environment
from mkdocs.config import MkDocsConfig
from mkdocs.structure.files import File


class MarkdownFilterPlugin(BasePlugin):
    def on_config(self, config):
        self.config = config
        return config

    def md_filter(self, text: str) -> Markup:
        md = markdown.Markdown(
            extensions=self.config["markdown_extensions"],
            extension_configs=self.config.get("mdx_configs", {}),
        )
        return Markup(md.convert(text))

    def on_env(self, env: Environment, config: MkDocsConfig, files: list[File]) -> Any:
        env.filters["markdown"] = self.md_filter
        return env

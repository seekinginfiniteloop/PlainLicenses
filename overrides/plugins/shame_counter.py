from jinja2 import Environment
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import BasePlugin
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page


class ShameCounter(BasePlugin):
    """A plugin that tracks the occurrence of specified 'shame' words in license texts.

    This class maintains counts of 'shame' words found in license documents and provides
    functionality to access these counts through the environment.

    Attributes:
        shame_counts (dict): A dictionary storing counts of shame words for each license.
        total_counts (dict): A dictionary storing total counts of shame words across all licenses.
    """

    def on_config(self, config: MkDocsConfig) -> MkDocsConfig:
        """Initializes the shame_counts and total_counts dictionaries.

        Args:
            config (MkDocsConfig): The configuration object.

        Returns:
            MkDocsConfig: The updated configuration object.
        """
        self.shame_counts = {}
        self.total_counts = {}
        self.shame_words = [
            word.strip() for word in config["extra"]["shame_words"].keys()
        ]
        return config

    def on_page_markdown(
        self, markdown: str, page: Page, config: MkDocsConfig, files: Files
    ) -> str:
        """Processes the markdown content of a page to count shame words in license texts.

        This method checks if the page belongs to license documents and counts occurrences
        of specified shame words, storing the results in shame_counts and total_counts.

        Args:
            markdown (str): The markdown content of the page.
            page (Page): The page object containing metadata.
            config (MkDocsConfig): The configuration object containing shame words.
            files (Files): The files object.

        Returns:
            str: The original markdown content.
        """
        if page.file.src_path.startswith("docs/licenses/"):
            license_name = page.meta.get("original_name")
            license_text = page.meta.get("official_license_text")

            word_count = {}
            for word, alternative in self.shame_words.items():
                count = license_text.lower().count(word.lower())
                if count > 0:
                    word_count[word] = {"count": count, "alternative": alternative}
                    self.total_counts[word] = self.total_counts.get(word, 0) + count

            self.shame_counts[license_name] = word_count

        return markdown

    def on_env(self, env: Environment, config: MkDocsConfig, files: Files):
        """Adds shame counts to the environment for access in templates.

        This method makes the shame_counts and total_counts available in the environment's
        global context, allowing templates to access the data.

        Args:
            env (Environment): The environment object to be modified.
            config (MkDocsConfig): The configuration object.
            files (Files): The files object.

        Returns:
            Environment: The modified environment object.
        """
        env.globals["shame_counts"] = self.shame_counts
        env.globals["total_shame_counts"] = self.total_counts
        return env

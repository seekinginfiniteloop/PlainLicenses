"""
Counts 'shame words' in license texts and makes the counts available in templates.

We haven't implemented the template changes to display the shame counts, but we can do that later.
"""

import logging
import re
from collections import Counter
from functools import cached_property
from typing import ClassVar, Self

from _utils import is_license_page, strip_markdown
from hook_logger import get_logger
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page

# Change logging level here
_shame_log_level = logging.WARNING

if not hasattr(__name__, "shame_logger"):
    shame_logger = get_logger(
        "SHAMER",
        _shame_log_level,
    )

STOPWORDS = [
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "you're",
    "you've",
    "you'll",
    "you'd",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "she's",
    "her",
    "hers",
    "herself",
    "it",
    "it's",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves",
    "what",
    "which",
    "who",
    "whom",
    "this",
    "that",
    "that'll",
    "these",
    "those",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "having",
    "do",
    "does",
    "did",
    "doing",
    "a",
    "an",
    "the",
    "and",
    "but",
    "if",
    "or",
    "because",
    "as",
    "until",
    "while",
    "of",
    "at",
    "by",
    "for",
    "with",
    "about",
    "against",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "to",
    "from",
    "up",
    "down",
    "in",
    "out",
    "on",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "s",
    "t",
    "can",
    "will",
    "just",
    "don",
    "don't",
    "should",
    "should've",
    "now",
    "d",
    "ll",
    "m",
    "o",
    "re",
    "ve",
    "y",
    "ain",
    "aren",
    "aren't",
    "couldn",
    "couldn't",
    "didn",
    "didn't",
    "doesn",
    "doesn't",
    "hadn",
    "hadn't",
    "hasn",
    "hasn't",
    "haven",
    "haven't",
    "isn",
    "isn't",
    "ma",
    "mightn",
    "mightn't",
    "mustn",
    "mustn't",
    "needn",
    "needn't",
    "shan",
    "shan't",
    "shouldn",
    "shouldn't",
    "wasn",
    "wasn't",
    "weren",
    "weren't",
    "won",
    "won't",
    "wouldn",
    "wouldn't",
]


class ShameCounter:
    """Singleton class to count 'shame words' in license texts."""

    _instance: ClassVar[Self | None] = None
    _instantiated: ClassVar[bool] = False

    def __new__(cls, config: MkDocsConfig) -> "ShameCounter":
        """Creates a new ShameCounter instance if one does not already exist."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, config: MkDocsConfig) -> None:
        """Initializes the shame_counts and total_counts dictionaries."""
        if self._instantiated:
            return
        self.shame_map: dict[str, str] = {
            k.strip().lower(): v.strip().lower()
            for k, v in config["extra"]["shame_words"].items()
            if k and v
        }
        if not self.shame_map:
            shame_logger.warning("No shame words found in configuration.")
        else:
            shame_logger.debug(f"Shame words loaded: {self.shame_map}")
        self.shame_counts: dict[str, Counter] = {}
        self.total_counts = Counter()
        self.ratios: dict[str, float] = {}
        self.totals: dict[str, int] = {}
        type(self)._instantiated = True

    @classmethod
    def instance(cls) -> Self | None:
        """Returns the singleton instance."""
        return cls._instance

    def sort_all(self) -> None:
        """Sorts all computer attributes."""
        self.total_counts = Counter(
            dict(
                sorted(
                    self.total_counts.items(),
                    key=lambda item: item[1],
                    reverse=True,
                )
            )
        )
        self.shame_counts = {
            license_name: Counter(
                dict(
                    sorted(
                        counts.items(),
                        key=lambda item: item[1],
                        reverse=True,
                    )
                )
            )
            for license_name, counts in self.shame_counts.items()
        }
        self.ratios = dict(
            sorted(
                self.ratios.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        )
        self.totals = dict(
            sorted(
                self.totals.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        )

    def shame_count(self, license_name: str) -> dict[str, dict[str, int | str]]:
        """Returns the shame counts for a specific license."""
        return self.shame_counts.get(license_name, {})

    def total_shame_count(self, word: str) -> int:
        """Returns the total shame count for a specific word."""
        return self.total_counts[word]

    @cached_property
    def stopwords(self) -> set[str]:
        """Returns the stopwords set."""
        return {word for word in STOPWORDS if word not in self.shame_map.keys()}


def on_page_markdown(
    markdown: str, page: Page, config: MkDocsConfig, files: Files
) -> str:
    """Processes the markdown content of a page to count shame words in license texts.

    Args:
        markdown (str): The markdown content of the page.
        page (Page): The page object containing metadata.
        config (MkDocsConfig): The configuration object containing shame words.
        files (Files): The files object.

    Returns:
        str: The original markdown content.
    """
    if is_license_page(page):
        logger = shame_logger.getChild("on_page_markdown")
        shamer = ShameCounter.instance()
        if shamer is None:
            shamer = ShameCounter(config)

        license_name = page.meta.get("original_name")
        license_text = page.meta.get("official_license_text")
        if not license_name or not license_text:
            return markdown

        logger.debug(f"Found license text for {license_name}, counting shame words.")
        license_text = strip_markdown(license_text).lower().replace("\n", " ")

        words = re.findall(r"\b\w+\b", license_text)
        filtered_words = [word for word in words if word not in shamer.stopwords]

        if word_count := Counter(
            word for word in filtered_words if word in shamer.shame_map
        ):
            logger.debug(
                f"Found {len(filtered_words)} words in license text for {license_name}. Words: {filtered_words}"
            )
            shamer.shame_counts[license_name] = word_count
            shamer.total_counts.update(word_count)
            shamer.ratios[license_name] = (
                round(((sum(word_count.values()) / len(filtered_words)) * 100), 2)
                if len(filtered_words)
                else 0
            )
            shamer.totals[license_name] = sum(word_count.values())

        page.meta.update(
            {
                "shame_counts": shamer.shame_count(license_name),
                "shame_total": shamer.totals[license_name],
                "shame_ratio": shamer.ratios[license_name],
            }
        )
        shamer.sort_all()
        logger.debug(
            f"Shame counts for {license_name}: {shamer.shame_counts[license_name]}"
        )
    return markdown


def on_config(config: MkDocsConfig) -> MkDocsConfig:
    """Logs the shame words found in the configuration."""
    logger = shame_logger.getChild("on_config")
    if not (shamer := ShameCounter.instance()):
        shamer = ShameCounter(config)
    if not shamer:
        logger.debug(
            "ShameCounter still not found. Shame words: %s",
            config["extra"]["shame_words"],
        )
        logger.error("ShameCounter instance not found.")
    elif not shamer.shame_map:
        logger.warning("No shame words found in configuration.")
    return config


def on_post_build(config: MkDocsConfig) -> None:
    """Logs the total shame counts after the build."""
    logger = shame_logger.getChild("on_post_build")
    if shamer := ShameCounter.instance():
        logger.info("Total shame counts: %s", shamer.total_counts)
        logger.info("Total shame ratios: %s", shamer.ratios)
        logger.info("Total shame totals: %s", shamer.totals)
    else:
        logger.error("ShameCounter instance not found.")

# sourcery skip: avoid-global-variables
"""
Centralized logging configuration for all hooks.

You can force the global log level to a lower level (more verbose) by setting the LOG_LEVEL_OVERRIDE environment variable as an integer. If you are only interested in a special logger, set that logger's level to the desired level... the lower level will be used.
"""

import logging
import os
import sys
from pathlib import Path
from pprint import pformat
from datetime import datetime, timezone
from typing import Literal

import click

from jinja2 import Environment
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.pages import Page
from mkdocs.structure.files import Files
from mkdocs.structure.nav import Navigation

# Configuration
LOG_LEVEL_OVERRIDE = int(os.environ.get("LOG_LEVEL_OVERRIDE", logging.WARNING))
DEVELOPMENT = os.getenv("GITHUB_ACTIONS") != "true"
FILEHANDLER_ENABLED = (
    os.environ.get("FILEHANDLER_ENABLED", str(DEVELOPMENT)).lower() == "true"
)
STREAMHANDLER_ENABLED = (
    os.environ.get("STREAMHANDLER_ENABLED", "true").lower() == "true"
)

if FILEHANDLER_ENABLED:
    LOG_SAVE_PATH = Path(
        f".workbench/logs/pl_build_log_{datetime.now(timezone.utc).isoformat(timespec='seconds')}.log"
    )
    LOG_SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)

# Global variables
LOGGERS: dict[str, logging.Logger] = {}

class ColorFormatter(logging.Formatter):
    """Formats log messages"""
    COLORS = {
        "DEBUG": "cyan",
        "INFO": "green",
        "WARNING": "yellow",
        "ERROR": "red",
        "CRITICAL": "bright_red",
    }

    def format(self, record: logging.LogRecord) -> str:
        """The formatter...

        Args:
            record: The LogRecord object to format

        Returns:
            The formatted record as a string

        """
        if record.message.splitlines() > 1:
            log_message = super().format(pformat(record))
        else:
            log_message = super().format(record)
        if record.name == "CANARY":
            module_color = {"fg": "bright_yellow", "bg": "bright_blue", "bold": True}
        else:
            module_color = {"fg": "bright_blue"}
        return (
            click.style(
                f"{record.levelname:<8} ", fg=self.COLORS.get(record.levelname, "white")
            )
            + click.style(f"{record.name:<12} ", **module_color)
            + click.style(log_message, fg=(self.COLORS.get(record.levelname, "white")), bg="bright_blue" if record.name == "CANARY" else None) + f" logger: {record.filename}"
        )


def get_logger(name: str, level: int = logging.WARNING) -> logging.Logger:
    """
    Get a logger instance with the specified name and logging level.

    This function retrieves a logger by name, creating it if it does not already exist. It configures the logger with appropriate handlers based on the specified logging level and predefined settings.

    Args:
        name (str): The name of the logger to retrieve or create.
        level (int, optional): The logging level to set for the logger. Defaults to logging.WARNING.

    Returns:
        logging.Logger: The configured logger instance.

    Raises:
        ValueError: If the logging level is invalid.
    """

    if name in LOGGERS:
        return LOGGERS[name]

    logger = logging.getLogger(name)
    level = min(LOG_LEVEL_OVERRIDE, level)
    logger.setLevel(level)

    if FILEHANDLER_ENABLED and not logger.hasHandlers():
        file_handler = logging.FileHandler(LOG_SAVE_PATH)
        file_handler.setFormatter(
            logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
        )
        file_handler.setLevel(level)
        logger.addHandler(file_handler)

    if STREAMHANDLER_ENABLED and not logger.hasHandlers():
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(ColorFormatter("%(asctime)s - %(message)s"))
        logger.addHandler(stream_handler)

    LOGGERS[name] = logger
    return logger


# MkDocs plugin hooks
@event_priority(100)
def on_startup(command: Literal['build', 'serve', 'gh-deploy'], dirty: bool) -> None:
    """log startup"""
    logging.captureWarnings(True)
    logger = get_logger("MkDocs", logging.DEBUG)
    logger.info("Starting %s command", command)

def on_config(config: MkDocsConfig) -> MkDocsConfig:
    """log on_config"""
    logger = get_logger("MkDocs")
    logger.debug("Processing configuration, %s", config)
    return config

def on_pre_build(config: MkDocsConfig) -> None:
    """log on_pre_build"""
    logger = get_logger("MkDocs")
    logger.debug("Starting pre-build phase")

def on_files(files: Files, config: MkDocsConfig) -> Files:
    """Log files"""
    logger = get_logger("MkDocs")
    logger.debug("Processing %s files", str(len(files)))
    logger.debug("Files: %s", files)
    return files


def on_env(env: Environment, config: MkDocsConfig, files: Files) -> Environment:
    """log on_env"""
    logger = get_logger("MkDocs")
    logger.debug("Processing Jinja2 environment")
    return env

def on_nav(nav: Navigation, config: MkDocsConfig, files: Files) -> Navigation:
    """log nav"""
    logger = get_logger("MkDocs")
    logger.debug("Processing navigation")
    return nav

def on_pre_page(page: Page, config: MkDocsConfig, files: Files) -> Page:
    """log on_pre_page"""
    logger = get_logger("MkDocs")
    logger.debug("Processing page %s", page.file.src_path)
    logger.debug("Page meta: %s", page.meta)
    return page


def on_post_build(config: MkDocsConfig) -> None:
    """log on_post_build"""
    logger = get_logger("MkDocs")
    logger.info("Build completed")

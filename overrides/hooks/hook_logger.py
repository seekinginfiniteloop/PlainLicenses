# sourcery skip: avoid-global-variables
"""
Centralized logging configuration for all hooks.

You can force the global log level to a lower level (more verbose) by setting the LOG_LEVEL_OVERRIDE environment variable as an integer. If you are only interested in a special logger, set that logger's level to the desired level... the lower level will be used.
"""

import logging
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Literal
import click

from mkdocs.config.base import Config as MkDocsConfig
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
        log_message = super().format(record)
        return (
            click.style(
                f"{record.levelname:<8} ", fg=self.COLORS.get(record.levelname, "white")
            )
            + click.style(f"{record.name:<15} ", fg="bright_blue")
            + log_message
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

    if not logger.handlers:
        if STREAMHANDLER_ENABLED:
            stream_handler = logging.StreamHandler(sys.stdout)
            stream_handler.setFormatter(ColorFormatter("%(asctime)s - %(message)s"))
            logger.addHandler(stream_handler)

        if FILEHANDLER_ENABLED:
            file_handler = logging.FileHandler(LOG_SAVE_PATH)
            file_handler.setFormatter(
                logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                )
            )
            logger.addHandler(file_handler)

    LOGGERS[name] = logger
    return logger


# MkDocs plugin hooks
def on_startup(command: Literal['build', 'serve', 'gh-deploy'], config: MkDocsConfig) -> None:
    """log startup"""
    logger = get_logger("MkDocs")
    logger.info(f"Starting {command} command")

def on_config(config: MkDocsConfig) -> MkDocsConfig:
    """log on_config"""
    logger = get_logger("MkDocs")
    logger.debug("Processing configuration")
    return config

def on_pre_build(config: MkDocsConfig) -> None:
    """log on_pre_build"""
    logger = get_logger("MkDocs")
    logger.debug("Starting pre-build phase")


def on_files(files: Files, config: MkDocsConfig) -> Files:
    """Log files"""
    logger = get_logger("MkDocs")
    logger.debug(f"Processing {len(files)} files")
    return files


def on_nav(nav: Navigation, config: MkDocsConfig) -> Navigation:
    """log nav"""
    logger = get_logger("MkDocs")
    logger.debug("Processing navigation")
    return nav


def on_post_build(config: MkDocsConfig) -> None:
    """log on_post_build"""
    logger = get_logger("MkDocs")
    logger.info("Build completed")


# Initialize logging
logging.captureWarnings(True)
root_logger = get_logger("root", logging.INFO)
root_logger.info("Logging initialized")

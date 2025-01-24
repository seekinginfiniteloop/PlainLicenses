# sourcery skip: avoid-global-variables
"""
Centralized logging configuration for all hooks.

You can force the global log level to a lower level (more verbose) by setting the LOG_LEVEL_OVERRIDE environment variable as an integer.
If you are only interested in a special logger, set that logger's
level to the desired level... the lower level will be used.
"""

import logging
import os
import sys

from datetime import datetime
from pathlib import Path
from pprint import pformat
from typing import ClassVar

import click

from _utils import MkDocsCommand, Status
from mkdocs.plugins import event_priority


# Configuration
override = os.getenv("LOG_LEVEL_OVERRIDE")
LOG_LEVEL_OVERRIDE = int(override) if override else logging.WARNING
PRODUCTION = Status.production
FILEHANDLER_ENABLED = os.getenv("FILEHANDLER_ENABLED", "false").lower() == "true" or not PRODUCTION
STREAMHANDLER_ENABLED = os.getenv("STREAMHANDLER_ENABLED", "true").lower() == "true"
if FILEHANDLER_ENABLED:
    base_path = Path(os.getenv("LOG_PATH", ".workbench/logs"))

    filename = f"pl_build_log_{datetime.now(datetime.utc).isoformat(timespec='seconds')}.log"

    LOG_SAVE_PATH = Path(f"{base_path}/{filename}")
    LOG_SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)

# Global variables
ROOT_LOGGER = None


class ColorFormatter(logging.Formatter):
    """Formats log messages."""

    COLORS: ClassVar[dict[str, str]] = {
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
        try:
            record.message = record.getMessage()
            if record.message and len(record.message.splitlines()) > 1 and record.getMessage():
                record.message = "\n" + pformat(record.getMessage(), indent=2, width=80)
            if record.name == "CANARY":
                module_color = {"fg": "bright_yellow", "bg": "bright_blue", "bold": True}
            else:
                module_color = {"fg": "bright_blue"}
            return (
                click.style(
                    f"{record.levelname:<8} ", fg=self.COLORS.get(record.levelname, "white")
                )
                + click.style(f"{record.name:<12} ", **module_color)  # type: ignore
                + click.style(
                    record.message or super().format(record),
                    fg=(self.COLORS.get(record.levelname, "white")),
                    bg="bright_blue" if record.name == "CANARY" else None,
                )
                + f" logger: {record.filename}"
            )
        except TypeError:
            return super().format(record)


def configure_handler(
    handler: logging.Handler, fmt: logging.Formatter, level: int
) -> logging.Handler:
    """Configures a handler with the specified format and level."""
    handler.setFormatter(fmt)
    if isinstance(handler, logging.FileHandler):
        level = min(level, logging.INFO)
    handler.setLevel(level)
    return handler


def configure_root_logger() -> logging.Logger:
    """Configures the root logger with predefined settings."""

    def set_override() -> int:
        """Set the override level."""
        return LOG_LEVEL_OVERRIDE

    root_logger = logging.getLogger()
    log_level = logging.NOTSET
    if FILEHANDLER_ENABLED:
        file_format = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        if LOG_LEVEL_OVERRIDE < logging.INFO:
            log_level = set_override()
        root_logger.addHandler(
            configure_handler(logging.FileHandler(LOG_SAVE_PATH), file_format, log_level)
        )
    if STREAMHANDLER_ENABLED:
        formatter = ColorFormatter("%(asctime)s - %(message)s")
        if LOG_LEVEL_OVERRIDE < logging.INFO:
            log_level = set_override()
        root_logger.addHandler(
            configure_handler(logging.StreamHandler(sys.stdout), formatter, log_level)
        )
    return root_logger


def get_logger(name: str, level: int = logging.WARNING) -> logging.Logger:
    """
    Get a logger instance with the specified name and logging level.
    """
    global ROOT_LOGGER
    ROOT_LOGGER = ROOT_LOGGER or configure_root_logger()
    if child := next(
        (child for child in ROOT_LOGGER.getChildren() if child and child.name == name), None
    ):
        if bland_handler := next(
            (
                handler
                for handler in child.handlers
                if child.handlers
                and isinstance(handler, logging.StreamHandler)
                and (not handler.formatter or not isinstance(handler.formatter, ColorFormatter))
            ),
            None,
        ):
            child.removeHandler(bland_handler)
            child.addHandler(
                configure_handler(
                    logging.StreamHandler(sys.stdout),
                    ColorFormatter("%(asctime)s - %(message)s"),
                    level,
                )
            )
        return child
    logger = ROOT_LOGGER.getChild(name)
    logger.setLevel(min(level, LOG_LEVEL_OVERRIDE))
    logger.propagate = True
    return logger


# MkDocs plugin hooks
@event_priority(100)
def on_startup(command: MkDocsCommand, dirty: bool) -> None:  # noqa: FBT001
    """Log startup."""
    Status(command)
    logging.captureWarnings(True)
    logger = get_logger("MkDocs", logging.DEBUG)
    logger.info("Starting %s command", command)

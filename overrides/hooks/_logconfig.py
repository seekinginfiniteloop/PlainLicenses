# sourcery skip: avoid-global-variables
"""
Centralized logging configuration for all hooks.
"""

import logging
import os
import shutil
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import click
from jinja2 import Environment
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from mkdocs.structure.nav import Navigation

# You can override the hooks' global log level by setting the LOG_LEVEL_OVERRIDE environment variable as an integer: [Python logging levels](https://docs.python.org/3/library/logging.html#logging-levels).
development = globals().get("development", os.getenv("GITHUB_ACTIONS") != "true")
LOG_LEVEL_OVERRIDE = int(os.environ.get("LOG_LEVEL_OVERRIDE", 10))

log_file: Path | None = None
# add `timestamp` to the LOG_SAVE_PATH environment variable to have the current timestamp added to the log file name
FILEHANDLER_ENABLED = (
    os.environ.get("FILEHANDLER_ENABLED", "True" if development else "False") == "True"
)
STREAMHANDLER_ENABLED = (
    os.environ.get("STREAMHANDLER_ENABLED", "True") == "True" or development
)

if FILEHANDLER_ENABLED:
    LOG_SAVE_PATH: str = f".workbench/logs/pl_build_log_{datetime.now(timezone.utc).isoformat(timespec="seconds")}.log"

if STREAMHANDLER_ENABLED or FILEHANDLER_ENABLED:
    logging.captureWarnings(True)

LOGGING_LOGGER: logging.Logger | None = None

LOGGERS = {}


def create_log_file() -> None:
    """Create the log file if it does not exist."""
    log_file = Path(LOG_SAVE_PATH)
    if not log_file.exists():
        log_file.parent.mkdir(parents=True, exist_ok=True)
        log_file.touch()


if not log_file:
    log_file = create_log_file()


def initialize_logging() -> None:
    """Initialize the logging logger, which logs logging."""
    level = min(LOG_LEVEL_OVERRIDE, logging.WARNING)
    LOGGING_LOGGER: logging.Logger = get_logger(__name__, level)
    LOGGING_LOGGER.info("Initialized logging logger.")
    LOGGERS[__name__] = LOGGING_LOGGER


@event_priority(100)
def on_startup(
    command: Literal["build", "serve", "gh-deploy"], config: MkDocsConfig
) -> None:
    """Initialize the logging logger. This is the first hook to run."""
    initialize_logging()
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug(f"Starting {command} command.")


@event_priority(100)
def on_config(config: MkDocsConfig) -> MkDocsConfig:
    """Log the configuration."""
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug("starting on_config")


@event_priority(100)
def on_pre_build(config: MkDocsConfig) -> None:
    """Log the pre-build event."""
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug("starting on_prebuild")


@event_priority(100)
def on_files(files: Files, config: MkDocsConfig) -> Files:
    """Log the files event."""
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug("starting on_files")
    return files


@event_priority(100)
def on_nav(nav: Navigation, config: MkDocsConfig) -> Navigation:
    """Log the navigation event."""
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug("starting on_nav")
    return nav


@event_priority(100)
def on_env(env: Environment, config: MkDocsConfig, files: Files) -> Environment:
    """Log the environment event."""
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug("starting on_env")
    return env


@event_priority(100)
def on_post_build(config: MkDocsConfig) -> None:
    """Log the post-build event."""
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug("starting on_post_build")


class ColorFormatter(logging.Formatter):
    """
    A logging formatter that adds color to the log level name.
    """

    colors = {
        "CRITICAL": "red",
        "ERROR": "orange",
        "WARNING": "yellow",
        "DEBUG": "blue",
    }

    text_wrapper = textwrap.TextWrapper(
        width=shutil.get_terminal_size(fallback=(0, 0)).columns,
        replace_whitespace=False,
        break_long_words=False,
        break_on_hyphens=False,
        initial_indent=" " * 11,
        subsequent_indent=" " * 11,
    )

    def format(self, record: logging.LogRecord) -> Any | str:
        """Format the log record."""
        message = super().format(record)
        prefix = f"{record.levelname:<8}-  "
        if record.levelname in self.colors:
            prefix = click.style(prefix, fg=self.colors[record.levelname])
        if self.text_wrapper.width:
            # Only wrap text if a terminal width was detected
            msg = "\n".join(
                self.text_wrapper.fill(line) for line in message.splitlines()
            )
            # Prepend prefix after wrapping so that color codes don't affect length
            return prefix + msg[11:]
        return prefix + message


def _add_logger(name: str, logger: logging.Logger) -> None:
    """Adds a logger to the LOGGERS dictionary and logs the addition."""
    LOGGERS[name] = logger
    if LOGGING_LOGGER:
        LOGGING_LOGGER.debug(f"Added logger: {name}")
    else:
        print("initiating logging logger")


def set_handler(
    handler: logging.Handler, level: int, formatter: logging.Formatter
) -> logging.Handler:
    """Sets the handler's level and formatter."""
    handler.setLevel(level)
    handler.setFormatter(formatter)
    return handler


def get_logger(
    name: str = __name__,
    level: int = logging.WARNING,
) -> logging.Logger:
    """
    Returns a logger with the specified name and log level.
    """
    name = name.split("/")[-1] if "/" in name else name
    name = name.split(".", 1)[0]
    logger = logging.getLogger(name)
    level = min(LOG_LEVEL_OVERRIDE, level)
    logger.setLevel(level)

    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    stream_formatter = ColorFormatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    handlers: list[logging.Handler | None] = []
    if FILEHANDLER_ENABLED:
        save_location = LOG_SAVE_PATH
        file_handler = logging.FileHandler(save_location)
        file_handler = set_handler(file_handler, level, file_formatter)
        handlers.append(file_handler)

    if STREAMHANDLER_ENABLED:
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler = set_handler(stream_handler, level, stream_formatter)
        handlers.append(stream_handler)

    handlers.append(logging.lastResort)

    for handler in handlers:
        if handler:
            logger.addHandler(handler)

    _add_logger(name, logger)

    return logger


if not hasattr(__name__, "LOGGING_LOGGER"):
    LOGGING_LOGGER = get_logger(__name__, logging.INFO)

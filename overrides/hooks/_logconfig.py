import logging
import os
import shutil
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import click

from mkdocs.plugins import event_priority
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.structure.files import Files
from mkdocs.structure.nav import Navigation

from jinja2 import Environment

LOG_LEVEL_OVERRIDE = int(os.environ.get("LOG_LEVEL_OVERRIDE", 50))
LOG_SAVE_PATH: str = (
    os.environ.get("LOG_SAVE_PATH", datetime.now(timezone.utc).isoformat())
    or ".workbench/logs/pl_build_log_timestamp.log"
).replace("timestamp", datetime.now(timezone.utc).isoformat())

LOG_FILE: Path | None = None
# add `timestamp` to the LOG_SAVE_PATH environment variable to have the current timestamp added to the log file name
FILEHANDLER_ENABLED = os.environ.get("FILEHANDLER_ENABLED", "True") == "True"
STREAMHANDLER_ENABLED = os.environ.get("STREAMHANDLER_ENABLED", "True") == "True"

logging.captureWarnings(True)

LOGGING_LOGGER: logging.Logger | None = None

LOGGERS = {}

def create_log_file() -> None:
    LOG_FILE = Path(LOG_SAVE_PATH)
    if not LOG_FILE.exists():
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        LOG_FILE.touch()

if not LOG_FILE:
    LOG_FILE = create_log_file()

def initialize_logging() -> None:
    LOGGING_LOGGER: logging.Logger = get_logger(__name__, logging.INFO)
    LOGGING_LOGGER.info("Initialized logging logger.")
    LOGGERS[__name__] = LOGGING_LOGGER

@event_priority(100)
def on_startup(command: Literal["build", "serve", "gh-deploy"], config: MkDocsConfig) -> None:
    initialize_logging()
    LOGGING_LOGGER.info(f"Starting {command} command.")

@event_priority(100)
def on_config(config: MkDocsConfig) -> MkDocsConfig:
    LOGGING_LOGGER.info("starting on_config")

@event_priority(100)
def on_pre_build(config: MkDocsConfig) -> None:
    LOGGING_LOGGER.info("starting on_prebuild")

@event_priority(100)
def on_files(files: Files, config: MkDocsConfig) -> Files:
    LOGGING_LOGGER.info("starting on_files")

@event_priority(100)
def on_nav(nav: Navigation, config: MkDocsConfig) -> Navigation:
    LOGGING_LOGGER.info("starting on_nav")

@event_priority(100)
def on_env(env: Environment, config: MkDocsConfig, files: Files) -> Environment:
    LOGGING_LOGGER.info("starting on_env")

@event_priority(100)
def on_post_build(config: MkDocsConfig) -> None:
    LOGGING_LOGGER.info("starting on_post_build")

class ColorFormatter(logging.Formatter):
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

    def format(self, record: logging.LogRecord):
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
    LOGGERS[name] = logger
    if LOGGING_LOGGER:
        LOGGING_LOGGER.info(f"Added logger: {name}")
    else:
        print("initiating logging logger")


def set_handler(
    handler: logging.Handler, level: int, formatter: logging.Formatter
) -> logging.Handler:
    handler.setLevel(level)
    handler.setFormatter(formatter)
    return handler


def get_logger(
    name: str = __name__,
    level: int = logging.INFO,
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

    handlers = []
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
        logger.addHandler(handler)

    _add_logger(name, logger)

    return logger


if not hasattr(__name__, "LOGGING_LOGGER"):
    LOGGING_LOGGER = get_logger(__name__, logging.INFO)

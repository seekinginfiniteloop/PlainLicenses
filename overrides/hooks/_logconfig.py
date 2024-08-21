import logging
from mkdocs.plugins import get_plugin_logger


def get_logger(
    name,
    logging_level=logging.INFO,
    stream_logging_level=logging.INFO,
    file_logging_level=logging.INFO,
    log_file: str = ".workbench/mkdocs_build.log",
) -> logging.Logger:
    logger = get_plugin_logger(name)
    logger.setLevel(logging_level)

    return logger

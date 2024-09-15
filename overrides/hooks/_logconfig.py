import logging
from pathlib import Path
import sys


def get_logger(
    name="unknown",
    level: int = logging.INFO,
) -> logging.Logger:
    if '/' in name:
        name = name.split('/')[-1]
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if logger.hasHandlers():
        logger.handlers.clear()

    save_location = f".workbench/logs/{name}.log"
    if not Path(save_location).parent.exists():
        Path(save_location).parent.mkdir(parents=True)
        Path(save_location).touch()

    handlers: list[logging.Handler()] = [
        logging.FileHandler(save_location),
        logging.StreamHandler(stream=sys.stdout),
    ]

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    for handler in handlers:
        handler.setLevel(level)
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger

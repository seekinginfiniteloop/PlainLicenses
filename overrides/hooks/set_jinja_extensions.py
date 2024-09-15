import logging

from jinja2 import Environment
from mkdocs.config import Config
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files

from _logconfig import get_logger

logger = get_logger(
    __name__,
    logging.INFO,
)

@event_priority(100)
def on_env(env: Environment, config: Config, files: Files) -> Environment:
    env.add_extension("jinja2.ext.do")
    env.add_extension("jinja2.ext.loopcontrols")
    logger.info("Added Jinja extensions: do, loopcontrols")
    return env

import re
import logging
from _logconfig import get_logger

pattern = re.compile(r'<script defer= src="')
replacement = r'<script defer src="'

logger = get_logger(__name__, logging_level=logging.DEBUG, stream_logging_level=logging.INFO, file_logging_level=logging.DEBUG)

def on_post_page(output: str, page, config, **kwargs) -> str:
    if matches := pattern.finditer(output):
        logger.info("Found script tag with extra equals sign. Removing it. Page: %s", page.file.src_path)
        for match in matches:
            output = match.sub(replacement, output)
            logger.debug("Match found at %s", page.file.src, "Replacing with %s", output[match.start():match.end()])
        return output
    return output

import re

from datetime import datetime

pattern = re.compile(r"{{year}}")

def on_post_page(output: str, page, config, **kwargs) -> str:
    return pattern.sub(str(datetime.now().year), output)

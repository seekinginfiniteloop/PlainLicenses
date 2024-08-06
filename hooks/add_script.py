import re

pattern = re.compile(r'<script defer= src="')
replacement = r'<script defer src="'

def on_post_page(output: str, page, config, **kwargs) -> str:
    if matches := pattern.finditer(output):
        for match in matches:
            match.sub(replacement, output)
        return output
    return output

"""
Generates a JSON file with the hero images paths and their parent. Copies the JSON to the clipboard. Used to fill the hero config.
"""

from pathlib import Path
import json

import pyperclip

def generate_hero_json(hero_folder_path: Path) -> str:
    """Generates a JSON file with the hero images paths and their parent"""
    hero_folder = Path(hero_folder_path)
    hero_names = [hero.name for hero in hero_folder.iterdir() if hero.is_dir()]

    heroes = {hero: {"paths": None, "parent": None, "widths": {}} for hero in hero_names}

    for hero in hero_names:
        hero_path = hero_folder / hero
        hero_info = heroes[hero]
        hero_info["parent"] = str(hero_path)
        hero_info["paths"] = [str(hero_path / image) for image in hero_path.iterdir() if image.is_file()]

        widths = {k: None for k in [1280, 1920, 2560, 3840]}
        for k in widths:
            widths[k] = next((str(image) for image in hero_info["paths"] if str(k) in image), None)
            hero_info["widths"] = widths

    return json.dumps(heroes, indent=2)

def main() -> None:
    """Generates a JSON file with the hero images paths and their parent"""
    hero_json = generate_hero_json(Path("src/images/hero"))
    pyperclip.copy(hero_json)


if __name__ == "__main__":
    main()

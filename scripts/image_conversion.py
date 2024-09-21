"""
Converts images to different formats and sizes.
"""
import itertools
import os
from typing import Literal
from PIL import Image
from PIL.ImageFile import ImageFile
from PIL.Image import Resampling
import pillow_avif # registers the plugin; we need it even if we don't use it

CONFIG: dict[str, str | list[int] | list[Literal["WEBP", "AVIF", "PNG"]]] = {
    "input_folder": ".workbench/images/hero",
    "output_folder": "src/images/hero",
    "widths": [3840, 2560, 1920, 1280],
    "formats": ["WEBP"]
}

def resize_and_save(image: ImageFile, width: int, output_path: str, format: Literal["WEBP", "AVIF", "PNG"]) -> None:
    """
    Resize an image to the specified width and save it in the desired format.
    """
    aspect_ratio = image.height / image.width
    new_height = int(width * aspect_ratio)

    resized_image = image.resize((width, new_height), Resampling.LANCZOS)

    if format == "PNG":
        resized_image.save(output_path, "PNG", optimize=True)
    elif format == "WEBP":
        resized_image.save(output_path, "WEBP", quality=85)
    elif format == "AVIF":
        resized_image.save(output_path, "AVIF", quality=85)


def main() -> None:
    """ Main function to convert images to WebP """
    input_folder: str = str(CONFIG["input_folder"])
    output_folder: str = str(CONFIG["output_folder"])
    widths: list[int] = [int(item) for item in CONFIG["widths"]]
    formats: list[Literal["WEBP", "AVIF", "PNG"]] = [str(item) for item in CONFIG["formats"] if item in ["WEBP", "AVIF", "PNG"]] # type: ignore

    # Create the output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)
    base_images = [img for img in os.listdir(input_folder) if img.lower().endswith(".png") or img.lower().endswith(".webp")]
    for filename in base_images:
        with Image.open(os.path.join(input_folder, filename)) as img:
            base_name = os.path.splitext(filename)[0]
            new_folder = os.path.join(output_folder, base_name)
            if os.path.exists(new_folder):
                new_folder = os.path.join(output_folder, f"{base_name}_1")
            os.makedirs(new_folder, exist_ok=True)
            for width, format in itertools.product(widths, formats):
                resize_and_save(img, width, os.path.join(new_folder, f"{base_name}_{width}.{format.lower()}"), format)

if __name__ == "__main__":
    main()

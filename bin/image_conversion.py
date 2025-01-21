"""
Converts images to different formats and sizes.
"""

import itertools
import os
from pathlib import Path
from typing import Literal, TypedDict

import pillow_avif  # type: ignore # noqa: F401
from PIL import Image
from PIL.Image import Resampling
from PIL.ImageFile import ImageFile

MODE: Literal["convert", "resize"] = "convert"


class ImageConversionConfig(TypedDict):
    """
    Configuration options for image conversion.

    Attributes:
        output_path (str): The path where the converted image will be saved.
        format (Literal["WEBP", "AVIF", "PNG"]): The desired output format for the converted image.
        quality (int): The quality of the converted image, ranging from 0 to 100.
        speed (int): The speed of the conversion process, ranging from 0 to 8.
        bits (int): The number of bits per pixel for the converted image, can be 8, 10, or 12. Generally, you can get better quality with less size by using higher bit depth (even with an 8 bit source), but it may not be supported by all browsers.
        subsample (int): The subsampling method used for the converted image, can be 444, 422, or 420.
        codec_speed (int): The speed of the codec used for the conversion process, ranging from 0 to 10.
        threads (int): The number of threads used for the conversion process, ranging from 1 to 64.
    """

    output_path: str
    format: Literal["WEBP", "AVIF", "PNG"]
    quality: int  # 0-100
    speed: int  # 0-8
    bits: int  # 8, 10, 12
    subsample: int  # 444, 422, 420
    codec_speed: int  # 0-10
    threads: int  # 1-64


DEFAULT_AVIF_CONFIG: ImageConversionConfig = {
    "output_path": "*.avif",
    "format": "AVIF",
    "quality": 64,
    "speed": 1,
    "bits": 10,
    "subsample": 420,
    "codec_speed": 1,
    "threads": os.cpu_count() or 8,
}

RESIZE_CONFIG: dict[str, str | list[int] | list[Literal["WEBP", "AVIF", "PNG"]]] = {
    "input_folder": "src/images/hero",
    "output_folder": "src/images/hero",
    "widths": [3840, 2560, 1920, 1280, 854, 640, 426],
    "formats": ["AVIF", "WEBP", "PNG"],
}


def resize_and_save(
    image: ImageFile,
    width: int,
    output_path: str,
    format: Literal["WEBP", "AVIF", "PNG"],
) -> None:
    """
    Resize an image to the specified width and save it in the desired format.
    """
    aspect_ratio = image.height / image.width
    new_height = int(width * aspect_ratio)

    resized_image = image.resize((width, new_height), Resampling.LANCZOS)

    if format == "PNG":
        resized_image.save(output_path, "PNG", optimize=True)
    elif format == "WEBP":
        resized_image.save(output_path, "WEBP", quality=74, bits=10, threads=8)
    elif format == "AVIF":
        resized_image.save(output_path, "AVIF", quality=67, speed=1, bits=10, threads=8)


def convert(image: ImageFile, **config_dict: ImageConversionConfig) -> None:
    """
    Convert an image to a different format using the specified configuration.
    """
    image.save(
        config_dict["output_path"],
        config_dict["format"],
        quality=config_dict["quality"],
        speed=config_dict["speed"],
        bits=config_dict["bits"],
        subsample=config_dict["subsample"],
        codec_speed=config_dict["codec_speed"],
        threads=config_dict["threads"],
    )


def main() -> None:
    """Main function to convert images to WebP"""
    input_folder: str = str(RESIZE_CONFIG["input_folder"])
    output_folder: str = str(RESIZE_CONFIG["output_folder"])
    widths: list[int] = [int(item) for item in RESIZE_CONFIG["widths"]]
    formats: list[Literal["WEBP", "AVIF", "PNG"]] = [
        str(item)
        for item in RESIZE_CONFIG["formats"]
        if item in ["WEBP", "AVIF", "PNG"]
    ]  # type: ignore

    base_images = [
        Path(img)
        for img in os.listdir(input_folder)
        if img.lower().endswith(".png") or img.lower().endswith(".webp")
    ]

    for root, _, files in os.walk(input_folder):
        for file in files:
            file_path = Path(root) / file
            if file_path.suffix.lower() in [".png", ".webp"]:
                base_images.append(file_path)
    for filename in base_images:
        if MODE == "convert":
            with Image.open(filename) as img:
                # we save the new file in a directory that's the same relative path as the original file with the new extension
                new_folder = Path(output_folder) / filename.parent.relative_to(input_folder)
                new_folder.mkdir(parents=True, exist_ok=True)
                output_path = new_folder / f"{filename.stem}.avif"
                settings = DEFAULT_AVIF_CONFIG | {"output_path": output_path}
                print(f"Converting {filename} to AVIF...")
                convert(img, **settings)
                print(f"Conversion complete. Image saved at {output_path}")
        else:
            img = Image.open(os.path.join(input_folder, filename))
            base_name = os.path.splitext(filename)[0]
            new_folder = os.path.join(output_folder, base_name)
            if os.path.exists(new_folder):
                new_folder = os.path.join(output_folder, f"{base_name}_1")
            os.makedirs(new_folder, exist_ok=True)
            for width, format in itertools.product(widths, formats):
                resize_and_save(
                    img,
                    width,
                    os.path.join(new_folder, f"{base_name}_{width}.{format.lower()}"),
                    format,
                )


if __name__ == "__main__":
    main()

import os
from typing import Literal
from PIL import Image
from PIL.ImageFile import ImageFile
from PIL.Image import Resampling
import pillow_avif # registers the plugin

input_folder = ".workbench/images"
output_folder = "docs/images/hero"

# Create the output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Specify the desired widths
widths = [3840, 2560, 1920, 1280]


def resize_and_save(image: ImageFile, width: int, output_path: str, format: Literal["WEBP", "AVIF", "PNG"]):
    aspect_ratio = image.height / image.width
    new_height = int(width * aspect_ratio)

    resized_image = image.resize((width, new_height), Resampling.LANCZOS)

    if format == "PNG":
        resized_image.save(output_path, "PNG", optimize=True)
    elif format == "WEBP":
        resized_image.save(output_path, "WEBP", quality=85)
    elif format == "AVIF":
        resized_image.save(output_path, "AVIF", quality=85)


for filename in os.listdir(input_folder):
    if filename.lower().endswith(".png") or filename.lower().endswith(".webp"):
        with Image.open(os.path.join(input_folder, filename)) as img:
            base_name = os.path.splitext(filename)[0]
            new_folder = os.path.join(output_folder, base_name)
            if os.path.exists(new_folder):
                new_folder = os.path.join(output_folder, f"{base_name}_1")
            os.makedirs(new_folder, exist_ok=True)
            for width in widths:
                # Save as WebP
                webp_output = os.path.join(new_folder, f"{base_name}_{width}.webp")
                resize_and_save(img, width, webp_output, "WEBP")

                # Save as AVIF
                avif_output = os.path.join(new_folder, f"{base_name}_{width}.avif")
                resize_and_save(img, width, avif_output, "AVIF")

print("Image processing completed!")

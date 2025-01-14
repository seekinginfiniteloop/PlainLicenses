"""
Extract a high quality AVIF frame from a video.


"""
from pathlib import Path
from subprocess import run
from typing import Optional


def extract_frame_avif(
    video_path: Path | str,
    timestamp: str = "00:00:10",
    output_path: Optional[Path | str] = None,
    crf: int = 20,  # AVIF quality (0-63, lower is better)
    speed: int = 4,  # Encoding speed (0-8, higher is faster)
) -> Path:
    """Extract a high quality AVIF frame from a video.

    Args:
        video_path: Path to the video file
        timestamp: Timestamp in HH:MM:SS format
        output_path: Where to save the frame. If None, saves next to video
        crf: AVIF quality (0-63, lower is better quality)
        speed: AVIF encoding speed (0-8, higher is faster)

    Returns:
        Path to the extracted AVIF frame
    """
    video_path = Path(video_path)
    if output_path is None:
        output_path = video_path.with_suffix(".avif")

    cmd = [
        "ffmpeg",
        "-ss",
        timestamp,  # Seek to timestamp
        "-i",
        str(video_path),  # Input file
        "-vframes",
        "1",  # Extract one frame
        "-c:v",
        "libaom-av1",  # AVIF codec
        "-crf",
        str(crf),  # Quality
        "-cpu-used",
        str(speed),  # Encoding speed
        "-row-mt",
        "1",  # Row-based multithreading
        "-tiles",
        "2x2",  # Tile configuration
        str(output_path),
    ]

    run(cmd, capture_output=True, check=True)
    return Path(output_path)

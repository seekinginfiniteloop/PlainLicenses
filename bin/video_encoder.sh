#!/bin/bash
# Video encoder script that encodes segments of a video based on its content
# (static, motion, or detail) and resolution. It uses AV1 and VP9 codecs,
# saving the output files in WebM format for resolutions up to 4K.
# Detects and crops black bars from the video.
# Segments are recombined into a single video file for each resolution.

set -euo pipefail

NEW_FPS=20
INPUT=""
OUTPUT=""
LOGDIR=""

# Encoding profiles
declare -A AV1_PROFILES=(
    ["static"]="tune=1:enable-qm=1:scm=2:enable-overlays=1:lookahead=120:scd=1:enable-tf=0:keyint=360:qm-min=5:qm-max=15:fast-decode=2"
    ["motion"]="tune=1:enable-qm=1:scm=2:enable-overlays=1:lookahead=120:scd=1:enable-tf=1:keyint=120:qm-min=8:qm-max=15:fast-decode=2"
    ["detail"]="tune=1:enable-qm=1:scm=2:enable-overlays=1:lookahead=120:scd=1:enable-tf=0:keyint=240:qm-min=6:qm-max=15:fast-decode=2"
)

declare -A VP9_PROFILES=(
    ["static"]="-aq-mode 0 -arnr-maxframes 7 -arnr-strength 5 -lag-in-frames 25 -g 360"
    ["motion"]="-aq-mode 0 -arnr-maxframes 5 -arnr-strength 3 -lag-in-frames 16 -g 120"
    ["detail"]="-aq-mode 1 -arnr-maxframes 6 -arnr-strength 5 -lag-in-frames 20 -g 240"
)

# Store segments
declare -a SEGMENTS=()

show_help() {
    echo "Usage: $0 -i INPUT -o OUTPUT -s 'START|END|TYPE' [-s ...] [-h] [-v CRF] [-a CRF]"
    echo
    echo "Required:"
    echo "  -i INPUT       Input file"
    echo "  -o OUTPUT      Output base filename (without extension)"
    echo "  -s SEGMENT     One or more segment definitions"
    echo "  -v CRF         VP9 CRF value (default: 33)"
    echo "  -a CRF         AV1 CRF value (default: 35)"
    echo
    echo "Segment format: START|END|TYPE"
    echo "  START/END: timestamp (HH:MM:SS.mmm) or frame number (Nf)"
    echo "  TYPE: static, motion, or detail"
    echo "  END can be 'end' to specify the end of the video"
    echo
    echo "Examples: "
    echo "  Single segment:"
    echo "    $0 -i source.mp4 -o hero -s '0f|300f|static'"
    echo
    echo "  Multiple segments:"
    echo "    $0 -i source.mp4 -o hero \\"
    echo "      -s '0f|300f|static' \\"
    echo "      -s '301f|600f|motion' \\"
    echo "      -s '00:01:00.000|00:02:00.000|detail'"
    echo
    echo "This will generate files like:"
    echo "  hero_banner_av1_3840.webm"
    echo "  hero_banner_av1_1920.webm"
    echo "  hero_banner_vp9_3840.webm"
    echo "  hero_banner_vp9_1920.webm"
    echo "  etc..."
}

# argument parsing
while getopts "i:o:s:v:a:h" opt; do
    case $opt in
        i) INPUT="$OPTARG";;
        o) OUTPUT="$OPTARG";;
        s) SEGMENTS+=("$OPTARG");;
        v) crf_vp9="$OPTARG";;
        a) crf_av1="$OPTARG";;
        h) show_help; exit 0;;
        \?) echo "Invalid option -$OPTARG" >&2; exit 1;;
    esac
done

# Set default CRF values
crf_av1=${crf_av1:-35}
crf_vp9=${crf_vp9:-33}

# Validate required parameters
if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Error: Input and output files are required"
    show_help
    exit 1
fi

# Dependency checks
deps=(ffmpeg ffprobe bc)
for dep in "${deps[@]}"; do
    if ! command -v "$dep" >/dev/null 2>&1; then
        echo "Error: Required dependency '$dep' not found" >&2
        exit 1
    fi
done


# Add temp dir
TEMPDIR=$(mktemp -d)
export TEMPDIR

# Add after TEMPDIR definition:
LOGDIR="${OUTPUT}_logs"
mkdir -p "$LOGDIR"
MASTERLOG="${LOGDIR}/encoding.log"


validate_segment_type() {
    local type="$1"
    local valid_types=("static" "motion" "detail")

    for valid_type in "${valid_types[@]}"; do
        if [[ "$type" == "$valid_type" ]]; then
            return 0
        fi
    done

    log "Error: Invalid segment type '$type'. Must be one of: ${valid_types[*]}"
    return 1
}

# Add cleanup trap
cleanup() {
    local exit_code=$?
    rm -f av1_concat.txt vp9_concat.txt
    rm -f /tmp/hero_*.webm
    if [ $exit_code -ne 0 ] && [ -n "$LOGDIR" ]; then
        echo "Encoding failed. Check logs in: $LOGDIR" >&2
    elif [ $exit_code -ne 0 ]; then
        echo "Encoding failed." >&2
    fi
    exit $exit_code
}
trap cleanup EXIT

# Replace the log() function with:
log() {
    local msg
    msg="[$(date +'%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg" >> "$MASTERLOG"
    # Only show errors on stderr
    if [[ "$*" == *"Error"* ]]; then
        echo "$msg" >&2
    fi
}

# Resolution definitions with format: "width height"
declare -a RESOLUTIONS=(
    "3840 2160"
    "2560 1440"
    "1920 1080"
    "1280 720"
    "854 480"
    "640 360"
)

# Function to detect crop values for a segment
detect_crop() {
    local input="$1"
    local start_time="$2"
    local end_time="$3"

    # Sample up to 10 seconds from this segment
    local duration
    duration=$(echo "$end_time - $start_time" | bc)
    local sample_duration
    sample_duration=$(echo "if($duration > 10) 10 else $duration" | bc)

    # Run cropdetect on the sample
    local crop_data
    crop_data=$(ffmpeg -ss "$start_time" -t "$sample_duration" -i "$input" \
        -vf "cropdetect=limit=24:round=2:skip=5,metadata=mode=print" \
        -f null - 2>&1)

    # Extract most common crop value
    local crop_value
    crop_value=$(echo "$crop_data" | grep -o "crop=[0-9:]*" | sort | uniq -c | sort -nr | head -n1 | awk '{print $2}' | cut -d= -f2)

    if [ -z "$crop_value" ]; then
        # Return empty crop (no cropping needed)
        echo "0:0:0:0"
    else
        # Convert crop=w:h:x:y to top:right:bottom:left format
        local w h x y
        IFS=: read -r w h x y <<< "$crop_value"
        local orig_w orig_h
        orig_w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=noprint_wrappers=1:nokey=1 "$input")
        orig_h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 "$input")

        # Calculate crop margins
        local top right bottom left
        top=$y
        left=$x
        bottom=$((orig_h - h - y))
        right=$((orig_w - w - x))

        echo "$top:$right:$bottom:$left"
    fi
}

# retrieve video fps
get_fps() {
    local input="$1"
    local fps_raw
    fps_raw=$(ffprobe -v 0 -of csv=p=0 -select_streams v:0 -show_entries stream=r_frame_rate "$input")
    # Convert fraction to decimal
    local num den
    num=$(echo "$fps_raw" | cut -d'/' -f1)
    den=$(echo "$fps_raw" | cut -d'/' -f2)
    if [ "$den" -eq 0 ]; then
        VIDEO_FPS=30  # Default to 30 if denominator is zero
    else
        VIDEO_FPS=$(echo "scale=3; $num/$den" | bc)
    fi
    echo "$VIDEO_FPS"
}

declare -g VIDEO_FPS
VIDEO_FPS=$(get_fps "$INPUT")

# Function to get video duration
get_video_duration() {
    local input="$1"
    local duration
    duration=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input")
    echo "$duration"
}

# Function to get total frames
get_total_frames() {
    local input="$1"
    local frames
    frames=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$input")
    echo "$frames"
}

# Validate required parameters
if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Error: Input and output files are required"
    show_help
    exit 1
fi

# Function to get video dimensions
get_video_dimensions() {
    local input="$1"
    local dimensions
    dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$input")
    echo "$dimensions"
}

# Function to build filter chain
build_filter_chain() {
    local target_width="$1"
    local target_height="$2"
    local orig_width="$3"
    local orig_height="$4"
    local crop_top="$5"
    local crop_right="$6"
    local crop_bottom="$7"
    local crop_left="$8"
    local filter_chain=""

    # Calculate scaled crop values based on target resolution
    local scale_factor
    scale_factor=$(echo "scale=10; $target_width / $orig_width" | bc)
    local scaled_top
    scaled_top=$(echo "$crop_top * $scale_factor" | bc | cut -d. -f1)
    local scaled_bottom
    scaled_bottom=$(echo "$crop_bottom * $scale_factor" | bc | cut -d. -f1)
    local scaled_left
    scaled_left=$(echo "$crop_left * $scale_factor" | bc | cut -d. -f1)
    local scaled_right
    scaled_right=$(echo "$crop_right * $scale_factor" | bc | cut -d. -f1)

    # Build crop if needed
    if [ "$crop_top" != "0" ] || [ "$crop_right" != "0" ] || [ "$crop_bottom" != "0" ] || [ "$crop_left" != "0" ]; then
        local crop_width
        crop_width=$(( (target_width - scaled_left - scaled_right) / 2 * 2 ))
        local crop_height
        crop_height=$(((target_height - scaled_top - scaled_bottom) / 2 * 2))
        filter_chain="crop=${crop_width}:${crop_height}:${scaled_left}:${scaled_top}"
    fi

    # Add scaling
    if [ -z "$filter_chain" ]; then
        filter_chain="fps=${NEW_FPS},scale=${target_width}:${target_height}"
    else
        filter_chain="${filter_chain},fps=${NEW_FPS},scale=${target_width}:${target_height}"
    fi

    echo "$filter_chain"
}

# Function to convert frames to seconds
frames_to_seconds() {
    local frames="$1"
    local fps="$2"
    echo "scale=3; $frames / $fps" | bc
}

# Function to convert to time if needed
convert_to_time() {
    local value="$1"
    if [[ "$value" == *f ]]; then
        local frame_num="${value%f}"
        if [ "$frame_num" -eq 0 ]; then
            value=0
        elif [ -n "$VIDEO_FPS" ]; then
            VIDEO_FPS=$(get_fps "$INPUT")
        fi
        value=$(frames_to_seconds "$frame_num" "$VIDEO_FPS")
        echo "$value"
    else
        echo "$value"
    fi
}
# Function to encode a segment
encode_segment() {
    local input="$1"
    local output_base="$2"
    local segment="$3"
    local width="$4"
    local height="$5"
    local orig_width="$6"
    local orig_height="$7"
    local pass="${8:-1}"

    # Parse segment
    IFS='|' read -r start end type <<< "$segment"

    # Validate segment type
    if ! validate_segment_type "$type"; then
        type="static"
    fi

    # Convert start and end to time
    local start_time
    if [ "${start}" == "0f" ] || [[ "${start,,}" == "start" ]]; then
        start_time=0
    else
    start_time=$(convert_to_time "$start")
    fi

    local end_time
    if [[ "${end,,}" == "end" ]] || [ "$end" == "-1" ]; then
        end_time=$(get_video_duration "$input")
    else
        end_time=$(convert_to_time "$end")
    fi


    # Create unique segment identifier
    local segment_id
    segment_id=$(echo "$start_time-$end_time" | tr ':.' '-')

    # setup logfile
    local segment_log="${LOGDIR}/${width}_${type}_${segment_id}.log"

    # Detect crop and build filter chain as before
    local crop_values
    crop_values=$(detect_crop "$input" "$start_time" "$end_time")
    IFS=: read -r crop_top crop_right crop_bottom crop_left <<< "$crop_values"
    local filter_chain
    filter_chain=$(build_filter_chain "$width" "$height" "$orig_width" "$orig_height" \
        "$crop_top" "$crop_right" "$crop_bottom" "$crop_left")

    # Set outputs based on pass
    local av1_output="${output_base}_av1_${width}_${segment_id}.webm"
    local vp9_output
    if [ "$pass" -eq 1 ]; then
        vp9_output="/dev/null"
    else
        vp9_output="${output_base}_vp9_${width}_${segment_id}.webm"
    fi

    # Always encode AV1 (single pass)
    echo "Encoding AV1 segment ${segment_id} (${type}) at ${width}x${height}"
    ffmpeg -i "$input" \
        -an \
        -ss "$start_time" \
        -to "$end_time" \
        -c:v libsvtav1 \
        -preset 1 \
        -profile:v 0 \
        -vf "$filter_chain" \
        -b:v 0 \
        -crf "$crf_av1" \
        -svtav1-params "${AV1_PROFILES[$type]}" \
        "$av1_output" >> "$segment_log" 2>&1

    # VP9 with 2-pass encoding
    echo "Encoding VP9 segment ${segment_id} (${type}) at ${width}x${height} - Pass $pass"
    # shellcheck disable=SC2086
    ffmpeg -i "$input" \
        -an \
        -pass "$pass" \
        -ss "$start_time" \
        -to "$end_time" \
        -c:v libvpx-vp9 \
        -row-mt 1 \
        -cpu-used 1 \
        -deadline good \
        ${VP9_PROFILES[$type]} \
        -threads 4 \
        -profile:v 0 \
        -enable-tpl 1 \
        -tune ssim \
        -tune-content film \
        -tile-columns 6 \
        -frame-parallel 1 \
        -auto-alt-ref 1  \
        -vf "$filter_chain" \
        -b:v 0 \
        -crf "$crf_vp9" \
        "$vp9_output" >> "$segment_log" 2>&1

    # Return the output filenames
    if [ "$pass" -eq 1 ]; then
        echo "$av1_output:/dev/null"
    else
        echo "$av1_output:$vp9_output"
    fi
}

main() {
    # Add output directory check
    local output_dir
    output_dir=$(dirname "$OUTPUT")
    if [ ! -d "$output_dir" ]; then
        mkdir -p "$output_dir"
    fi

    # Add input file validation
    if [ ! -f "$INPUT" ]; then
        log "Error: Input file $INPUT not found"
        exit 1
    fi

    # Get original dimensions
    local orig_dimensions
    orig_dimensions=$(get_video_dimensions "$INPUT")
    local orig_width
    orig_width=$(echo "$orig_dimensions" | cut -d'x' -f1)
    local orig_height
    orig_height=$(echo "$orig_dimensions" | cut -d'x' -f2)

    # Validate we have segments
    if [ ${#SEGMENTS[@]} -eq 0 ]; then
        echo "Error: At least one segment is required"
        show_help
        exit 1
    fi

    local total_segments=${#SEGMENTS[@]}
    local total_resolutions=${#RESOLUTIONS[@]}
    local total_operations=$((total_segments * total_resolutions * 2))
    local current_operation=0

    for resolution in "${RESOLUTIONS[@]}"; do
        read -r width height <<< "$resolution"
        echo "Processing ${width}x${height} ($(((current_operation * 100) / total_operations))%)"

        # Arrays to store segment files for concatenation
        declare -a av1_segments=()
        declare -a vp9_segments=()

        for segment_index in "${!SEGMENTS[@]}"; do
            segment="${SEGMENTS[$segment_index]}"

            # Run encode passes sequentially
            encode_segment "$INPUT" "$OUTPUT" "$segment" \
                "$width" "$height" "$orig_width" "$orig_height" \
                1

            output=$(encode_segment "$INPUT" "$OUTPUT" "$segment" \
                "$width" "$height" "$orig_width" "$orig_height" \
                2)

            # Store output directly
            IFS=':' read -r av1_file vp9_file <<< "$output"
            av1_segments+=("$av1_file")
            vp9_segments+=("$vp9_file")
        done

        # Create concat files
        printf "file '%s'\n" "${av1_segments[@]}" > av1_concat.txt
        printf "file '%s'\n" "${vp9_segments[@]}" > vp9_concat.txt

        # Concatenate segments
        ffmpeg -f concat -safe 0 -i av1_concat.txt -c copy "${OUTPUT}_av1_${width}.webm"
        ffmpeg -f concat -safe 0 -i vp9_concat.txt -c copy "${OUTPUT}_vp9_${width}.webm"

        # Cleanup segment files and concat lists
        rm "${av1_segments[@]}" "${vp9_segments[@]}" av1_concat.txt vp9_concat.txt
    done
}


# Run the script
main

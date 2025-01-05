#!/bin/bash
# Author: Adam Poulemanos - adam<at>plainlicense<dot>org
# Produced for PlainLicense.org - https://plainlicense.org
# Use for any purpose, without any restrictions.
# License: Plain Unlicense - https://plainlicense.org/licenses/public-domain/unlicense.html
# No rights reserved. Use at your own risk.

set -euo pipefail

show_help() {
    echo "Usage: $0 -i INPUT -o OUTPUT -s 'START|END|TYPE' [-s ...] [OPTIONS]"
    echo
    echo "Required:"
    echo "  -i INPUT       Input file"
    echo "  -o OUTPUT      Output base filename (without extension)"
    echo "                   All output files will start with this name"
    echo "  -s SEGMENT     One or more segment definitions (see below)"
    echo
    echo "Optional:"
    echo "  -h CRF         h264 CRF value (default: 24)"
    echo "  -9 CRF         VP9 CRF value (default: 33)"
    echo "  -a CRF         AV1 CRF value (default: 35)"
    echo "  -c CODEC       Selected codec (av1, h264, vp9)"
    echo
    echo "  -h             Display this help and exit"
    echo
    echo "About:"
    echo "  This script encodes segments of a video file using FFmpeg for web use."
    echo "  It allows you to specify multiple segments with different encoding settings"
    echo "  The script will encode the segments using AV1, h.264, and VP9 codecs
    echo    (default is all 3), and at resolutions from 4K down to 240p. All output"
    echo "   files, except h.264, will be saved in WebM format -- h.264 saved in .mp4."
    echo
    echo "  The script will automatically detect the crop values for the video and use"
    echo "  them to crop the video before encoding. It will also downscale the video"
    echo "  to the target resolution. (IT ASSUMES A 4K SOURCE VIDEO)"
    echo
    echo "  To improve perceived quality, while minimizing file size,"
    echo "  you can define a segment as 'static', 'motion' or 'detail'."
    echo "  The script will use different encoding profiles for each type."
    echo "  and concatenate the segments into a single video file."
    echo
    echo "  Optionally, you may change the CRF values for each codec."
    echo "  or encode only a specific codec (-c flag)."
    echo
    echo "  YOU MUST PROVIDE: INPUT, OUTPUT, and at least one segment definition."
    echo
    echo "Segment definitions:"
    echo "Segment format: START|END|TYPE"
    echo "  START/END: timestamp (HH:MM:SS.mmm) or frame number (Nf)"
    echo "  TYPE: static, motion, or detail"
    echo "  START can be '0' or '0f' or 'start' to specify the start of the video"
    echo "  END can be 'end' or '-1' or '-1f' to specify the end of the video"
    echo
    echo "Examples: "
    echo "  Single segment:"
    echo "    $0 -i source.mp4 -o hero -s 'start|end|static'"
    echo
    echo "  Multiple segments:"
    echo "    $0 -i source.mp4 -o hero \\"
    echo "      -s '0f|300f|static' \\"
    echo "      -s '301f|600f|motion' \\"
    echo "      -s '00:01:00.000|00:02:00.000|detail'"
    echo "      -s '00:02:00.000|end|static'"
    echo
    echo "This will generate files like:"
    echo "  hero_av1_3840.webm"
    echo "  hero_av1_1920.webm"
    echo "  hero_vp9_3840.webm"
    echo "  hero_vp9_1920.webm"
    echo "  etc..."
}

declare -g NEW_FPS=20

# Resolution definitions with format: "width height"
declare -a RESOLUTIONS=(
    "3840 2160"
    "2560 1440"
    "1920 1080"
    "1280 720"
    "854 480"
    "640 360"
    "426 240"
)

declare -A CODEC_FILTERS=(
    ["av1_3840"]=""
    ["av1_2560"]=""
    ["av1_1920"]=""
    ["av1_1280"]=""
    ["av1_854"]=""
    ["av1_640"]=""
    ["av1_426"]=""
    ["h264_3840"]=""
    ["h264_2560"]=""
    ["h264_1920"]=""
    ["h264_1280"]=""
    ["h264_854"]=""
    ["h264_640"]=""
    ["h264_426"]=""
    ["vp9_3840"]=""
    ["vp9_2560"]=""
    ["vp9_1920"]=""
    ["vp9_1280"]=""
    ["vp9_854"]=""
    ["vp9_640"]=""
    ["vp9_426"]=""
)

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

declare -A H264_PROFILES=(
    ["static"]="aq-mode=3:aq-strength=0.7:rc-lookahead=250:me=umh:merange=32:bframes=2:keyint=360:min-keyint=360:scenecut=0:ref=16:psy-rd='0.6:0':deblock='-2:-1'"
    ["motion"]="aq-mode=3:aq-strength=0.6:rc-lookahead=250:me=umh:merange=48:bframes=2:keyint=120:min-keyint=120:scenecut=0:ref=16:psy-rd='0.6\:0':deblock='-2\:-1'"
    ["detail"]="aq-mode=3:aq-strength=0.65:rc-lookahead=250:me=umh:merange=32:bframes=2:keyint=240:min-keyint=240:no-dct-decimate:ref=16:scenecut=0:psy-rd='0.7\:0':deblock='-2\:-1'"
)

declare -g INPUT OUTPUT CRF_H264 CRF_VP9 CRF_AV1 SELECTED_CODEC ONE_SEGMENT
declare -g LOGDIR MASTERLOG TEMPDIR VIDEO_FPS

# Store segments
declare -a SEGMENTS=()

# argument parsing
while getopts "i:o:s:8:9:a:c:h" opt; do
    case $opt in
    i) INPUT="$OPTARG" ;;
    o) OUTPUT="$OPTARG" ;;
    s) SEGMENTS+=("$OPTARG") ;;
    8) CRF_H264="$OPTARG" ;;
    9) CRF_VP9="$OPTARG" ;;
    a) CRF_AV1="$OPTARG" ;;
    c) SELECTED_CODEC="$OPTARG" ;;

    h)
        show_help
        exit 0
        ;;
    \?)
        echo "Invalid option -$OPTARG" >&2
        exit 1
        ;;
    esac
done

# Set default CRF values

CRF_AV1="${CRF_AV1:-35}"
CRF_H264="${CRF_H264:-24}"
CRF_VP9="${CRF_VP9:-33}"

# ----------- Validate CLI arguments -----------

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

if [ -n "$SELECTED_CODEC" ]; then
    case "$SELECTED_CODEC" in
    av1 | h264 | vp9)
        ;; # Valid codec
    *)
        echo "Error: Invalid codec '$SELECTED_CODEC'. Must be one of: av1, h264, vp9" >&2
        exit 1
        ;;
    esac
fi

# Validate required parameters
if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Error: Input and output files are required"
    show_help
    exit 1
fi

if [ "${#SEGMENTS[@]}" -eq 0 ]; then
    echo "Error: At least one segment is required"
    show_help
    exit 1
elif [ "${#SEGMENTS[@]}" -eq 1 ]; then
    ONE_SEGMENT=true
else
    ONE_SEGMENT=false
fi

# ----------- Set cleanup trap -----------

# Add cleanup trap
cleanup() {
    local exit_code=$?
    rm -f av1_concat.txt h264_concat.txt vp9_concat.txt
    rm -f "/tmp/${OUTPUT}_*.webm" "/tmp/${OUTPUT}_*.mp4"
    if [ "$exit_code" -ne 0 ] && [ -n "$LOGDIR" ]; then
        echo "Encoding failed. Check logs in: $LOGDIR" >&2
    elif [ "$exit_code" -ne 0 ]; then
        echo "Encoding failed." >&2
    fi
    exit "$exit_code"
}
trap cleanup EXIT


# ----------- Setup tempdir and logging -----------
# Add temp dir
TEMPDIR=$(mktemp -d)
export TEMPDIR

mkdir -p "$TEMPDIR"
mkdir -p "$OUTPUT"

# Add after TEMPDIR definition:
LOGDIR="${OUTPUT}_logs"
mkdir -p "$LOGDIR"
MASTERLOG="${LOGDIR}/encoding.log"

# log function to keep track of encoding progress and keep echo output clean
log() {
    local msg
    msg="[$(date +'%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg" >>"$MASTERLOG"
    # Only show errors on stderr
    if [[ "$*" == *"Error"* ]]; then
        echo "$msg" >&2
    fi
}

# ----------- Segment Handling Functions -----------

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
        VIDEO_FPS=30 # Default to 30 if denominator is zero
    else
        VIDEO_FPS=$(echo "scale=3; $num/$den" | bc)
    fi
    echo "$VIDEO_FPS"
}

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

# Function to get video dimensions
get_video_dimensions() {
    local input="$1"
    local dimensions
    dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$input")
    echo "$dimensions"
}

# Function to get most common crop values from a sample of the video
get_crop_data() {
    local input="$1"
    local start_time="$2"
    local sample_duration="$3"
    local crop_data crop_value
    crop_data=$(ffmpeg -ss "$start_time" -t "$sample_duration" -i "$input" \
        -vf "cropdetect=limit=24:round=2:skip=5,metadata=mode=print" \
        -f null - 2>&1)
    crop_value=$(echo "$crop_data" | grep -o "crop=[0-9:]*" | sort | uniq -c | sort -nr | head -n1 | awk '{print $2}' | cut -d= -f2)
    echo "$crop_value"
}

# Function to detect crop values for the video
# We sample multiple parts of the whole video to detect the most common crop values
detect_crop() {
    local input="$1"
    local duration

    start_time="0.00000"
    end_time=$(get_video_duration "$input")
    duration=$(echo "$end_time - $start_time" | bc)
    sample_duration=$(echo "if($duration < 60) $duration else 30" | bc)

    # Run cropdetect on the sample
    crop_value=$(get_crop_data "$input" "$start_time" "$sample_duration")

    if [ -z "$crop_value" ]; then
        # Return empty crop (no cropping needed)
        echo "0:0:0:0"
    else
        # Convert crop=w:h:x:y to top:right:bottom:left format
        local w h x y
        IFS=: read -r w h x y <<<"$crop_value"
        local orig_w orig_h
        orig_w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=noprint_wrappers=1:nokey=1 "$input")
        orig_h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 "$input")

        # Calculate crop margins
        local top right bottom left
        top="$y"
        left="$x"
        bottom=$((orig_h - h - y))
        right=$((orig_w - w - x))

        echo "$top:$right:$bottom:$left"
    fi
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
    local filter_chain new_fps scale_factor scaled_top scaled_bottom scaled_left scaled_right
    filter_chain=""
    new_fps="$NEW_FPS"
    # Calculate scaled crop values based on target resolution
    scale_factor=$(echo "scale=10; $target_width / $orig_width" | bc)
    scaled_top=$(echo "$crop_top * $scale_factor" | bc | cut -d. -f1)
    scaled_bottom=$(echo "$crop_bottom * $scale_factor" | bc | cut -d. -f1)
    scaled_left=$(echo "$crop_left * $scale_factor" | bc | cut -d. -f1)
    scaled_right=$(echo "$crop_right * $scale_factor" | bc | cut -d. -f1)

    # Build crop if needed
    if [ "$crop_top" != "0" ] || [ "$crop_right" != "0" ] || [ "$crop_bottom" != "0" ] || [ "$crop_left" != "0" ]; then
        local crop_width
        crop_width=$(((target_width - scaled_left - scaled_right) / 2 * 2))
        local crop_height
        crop_height=$(((target_height - scaled_top - scaled_bottom) / 2 * 2))
        filter_chain="crop=${crop_width}:${crop_height}:${scaled_left}:${scaled_top}"
    fi

    # Add scaling
    if [ -z "$filter_chain" ]; then
        filter_chain="fps=${new_fps},scale=${target_width}:${target_height}"
    else
        filter_chain="${filter_chain},fps=${new_fps},scale=${target_width}:${target_height}"
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
# Function to convert time format to seconds
convert_to_time() {
    local value="$1"
    if [[ "$value" == *f ]]; then
        local frame_num
        frame_num="${value%f}"
        if [ "$frame_num" -eq 0 ]; then
            echo "0"
        elif [ -n "$VIDEO_FPS" ]; then
            echo "scale=3; $frame_num / $VIDEO_FPS" | bc
        else
            echo "0"
        fi
    else
        # Convert HH:MM:SS.mmm to seconds
        IFS=: read -r hours minutes seconds <<< "${value//,/.}"
        local total_seconds
        total_seconds=$(echo "scale=3; ($hours * 3600) + ($minutes * 60) + $seconds" | bc)
        echo "$total_seconds"
    fi
}

# ----------- Main Encoding Function -----------

encode_video() {
    local input="$1"
    local codec="$2"
    local start_time="$3"
    local end_time="$4"
    local filter_chain="$5"
    local crf="$6"
    local output_file="$7"
    local segment_log="$8"
    local pass="$9"
    local profile="${10}"
    local extension
    extension=$(echo "$output_file" | awk -F . '{print $NF}')
    log "Encoding $codec segment ${output_file} - Pass $pass"

    # Construct ffmpeg command with codec-specific parameters
    local ffmpeg_cmd=(ffmpeg -y -i "$input" -ss "$start_time" -to "$end_time" -c:v "$codec" -vf "$filter_chain" -crf "$crf" -pix_fmt yuv420p )

    case "$codec" in
        libsvtav1)
            ffmpeg_cmd+=( -b:v 0 -profile:v 0 -preset 1 -svtav1-params "$profile" )
            ;;
        libx264)
            # shellcheck disable=SC2206 # we want to split the array
            ffmpeg_cmd+=( -preset slower -profile:v high -tune:v film -x264-params "$profile" )
            ;;
        libvpx-vp9)
            # shellcheck disable=SC2206
            ffmpeg_cmd+=( -pass "$pass" -b:v 0 -profile:v 0 -deadline good -threads 7 -auto-alt-ref 1 -cpu-used 1 -tune:v ssim "${profile[@]}" -row-mt 1 -tune-content film -tile-columns 6 -frame-parallel 1 -enable-tpl 1 )
            ;;
        *)
            log "Error: Unsupported codec $codec"
            exit 1
            ;;
    esac

    if [ "$pass" -eq 1 ]; then
        extension="null"
    fi

    ffmpeg_cmd+=( -f "$extension" -an "$output_file")
    log "Executing: ${ffmpeg_cmd[*]}"
    # Execute ffmpeg command
    "${ffmpeg_cmd[@]}" >>"$segment_log" 2>&1
}

# ----------- Segment Pipeline -----------

# Function to encode a segment
encode_segment() {
    local input="$1"
    local output_base="$2"
    local segment="$3"
    local width="$4"
    local height="$5"
    local orig_width="$6"
    local orig_height="$7"
    local pass="$8"
    local codec="$9"

    local start_time end_time segment_id segment_log crop_values filter_chain crf profile library output_file filter_key extension
    # Parse segment
    IFS='|' read -r start end type <<<"$segment"

    # Convert start and end to time
    if [ "${start}" == "0f" ] || [[ "${start,,}" == "start" ]]; then
        start_time=0
    else
        start_time=$(convert_to_time "$start")
    fi
    if [[ "${end,,}" == "end" ]] || [ "$end" == "-1" ] || [ "$end" == "-1f" ]; then
        end_time=$(get_video_duration "$input")
    else
        end_time=$(convert_to_time "$end")
    fi

    # Create unique segment identifier
    segment_id=$(echo "$start_time-$end_time" | tr ':.' '-')

    # setup logfile
    segment_log="${LOGDIR}/${width}_${type}_${segment_id}.log"

    # Check if filter chain is already cached
    # We don't want to switch filters between segments of the same resolution
    filter_key="${codec}_${width}"
    if [ "${CODEC_FILTERS[$filter_key]}" == "" ]; then
        # detect crop values
        crop_values=$(detect_crop "$input")
        IFS=: read -r crop_top crop_right crop_bottom crop_left <<<"$crop_values"
        filter_chain=$(build_filter_chain "$width" "$height" "$orig_width" "$orig_height" \
            "$crop_top" "$crop_right" "$crop_bottom" "$crop_left")
        CODEC_FILTERS[$filter_key]="$filter_chain"
    else
        filter_chain="${CODEC_FILTERS[$filter_key]}"
    fi

    case "$codec" in
        av1)
            crf="$CRF_AV1"
            profile="${AV1_PROFILES[$type]}"
            library="libsvtav1"
            extension="webm"
            ;;
        h264)
            crf="$CRF_H264"
            profile="${H264_PROFILES[$type]}"
            library="libx264"
            extension="mp4"
            ;;
        vp9)
            crf="$CRF_VP9"
            profile="${VP9_PROFILES[$type]}"
            library="libvpx-vp9"
            extension="webm"
            ;;
        *)
            log "Error: Unsupported codec $codec"
            exit 1
            ;;
    esac
    if [ "$pass" -eq 1 ]; then
        output_file="/dev/null"
    else
        if [ "$ONE_SEGMENT" == true ]; then
            output_file="${output_base}/${output_base}_${codec}_${width}.${extension}"
        else
            output_file="${output_base}/${output_base}_${codec}_${width}_${segment_id}.${extension}"
        fi
        if [ -f "$output_file" ]; then
            log "$codec segment $output_file already exists. Skipping."
            echo "$output_file"
            return
        fi
        output_dir="$(dirname "$output_file")"
        mkdir -p "$output_dir"
    fi

    # Encode the segment
    encode_video "$input" "$library" "$start_time" "$end_time" "$filter_chain" "$crf" "$output_file" "$segment_log" "$pass" "$profile"

    echo "$output_file"
}

# Function to process segments after encoding
process_segments() {
    local segments=("$@")
    local output_file="${segments[-1]}"
    unset 'segments[${#segments[@]}-1]'

    # Create concat file
    local concat_file to_delete
    concat_file=$(mktemp)
    to_delete=()
    # Verify each segment exists before adding to concat file
    for segment in "${segments[@]}"; do
        if [ ! -f "$segment" ]; then
            log "Error: Segment file not found: $segment"
            rm -f "$concat_file"
            return 1
        fi
        # Use absolute paths in concat file
        echo "file '$(realpath "$segment")'" >> "$concat_file"
        to_delete+=("$segment")
    done

    # Verify concat file has content
    if [ ! -s "$concat_file" ]; then
        log "Error: No valid segments to concatenate"
        rm -f "$concat_file"
        return 1
    fi

    log "Concatenating segments using: $concat_file"
    ffmpeg -y -f concat -probesize 2G -analyzeduration 2G -duration_probesize 1G  -safe 0 -i "$concat_file" -c copy "${OUTPUT}/$output_file"
    local status=$?

    rm -f "$concat_file"
    for file in "${to_delete[@]}"; do
        rm -f "$file"
    done
    return $status
}

# ----------- Main Pipeline Function -----------

# Main function
main() {
    # Add output directory check
    local orig_dimensions orig_width orig_height total_segments total_codecs total_resolutions total_operations current_operation

    # Add input file validation
    if [ ! -f "$INPUT" ]; then
        log "Error: Input file $INPUT not found"
        exit 1
    fi

    # Get original dimensions
    orig_dimensions=$(get_video_dimensions "$INPUT")
    orig_width=$(echo "$orig_dimensions" | cut -d'x' -f1)
    orig_height=$(echo "$orig_dimensions" | cut -d'x' -f2)

    declare -a CODECS

    # Determine codecs to encode
    if [ -n "${SELECTED_CODEC:-}" ]; then
        CODECS=("${SELECTED_CODEC,,}")
    else
        CODECS=("av1" "vp9" "h264")
    fi
    total_segments="${#SEGMENTS[@]}"
    total_codecs="${#CODECS[@]}"
    total_resolutions="${#RESOLUTIONS[@]}"
    total_operations=$((total_segments * total_resolutions * total_codecs))
    current_operation=0

    for resolution in "${RESOLUTIONS[@]}"; do

        read -r width height <<< "$resolution"
        log "Processing ${width}x${height} resolution"

        # Arrays to store segment files for concatenation
        declare -a av1_segments=()
        declare -a h264_segments=()
        declare -a vp9_segments=()

        for segment_index in "${!SEGMENTS[@]}"; do
            local segment
            segment="${SEGMENTS[$segment_index]}"
            log "Processing segment $((segment_index + 1)) of $total_segments"
            for codec in "${CODECS[@]}"; do
                local output percent_complete
                percent_complete=$((current_operation * 100 / total_operations))
                log "Processing codec $codec at resolution ${width}x${height} for ${segment}"
                echo "Processing codec $codec at resolution ${width}x${height} for ${segment}"
                echo "Operation ${current_operation} of ${total_operations}"
                echo "Percent complete ${percent_complete}%"
                if [ "$codec" != "vp9" ]; then
                    output=$(encode_segment "$INPUT" "$OUTPUT" "$segment" \
                        "$width" "$height" "$orig_width" "$orig_height" \
                        2 "$codec")
                    if [ "$codec" == "h264" ]; then
                        h264_segments+=("$output")
                    else
                        av1_segments+=("$output")
                    fi
                else
                    encode_segment "$INPUT" "$OUTPUT" "$segment" \
                        "$width" "$height" "$orig_width" "$orig_height" \
                        1 "$codec"

                    output=$(encode_segment "$INPUT" "$OUTPUT" "$segment" \
                        "$width" "$height" "$orig_width" "$orig_height" \
                        2 "$codec")

                    vp9_segments+=("$output")
                fi
                current_operation=$((current_operation + 1))
            done
        done
    if [ "$ONE_SEGMENT" == true ]; then
        continue # If one segment, that's our video. No need to combine
    else
        if [ "${#av1_segments[@]}" -gt 0 ]; then
            log "Combining AV1 segments"
            process_segments "${av1_segments[@]}" "${OUTPUT}_av1_${width}.webm"
        fi
        if [ "${#h264_segments[@]}" -gt 0 ]; then
            log "Combining H264 segments"
            process_segments "${h264_segments[@]}" "${OUTPUT}_h264_${width}.mp4"
        fi
        if [ "${#vp9_segments[@]}" -gt 0 ]; then
            log "Combining VP9 segments"
            process_segments "${vp9_segments[@]}" "${OUTPUT}_vp9_${width}.webm"
        fi
    fi
    done
}

# Run the script
main

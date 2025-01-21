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
    echo "  -2 CRF         h264 CRF value (default: 24)"
    echo "  -9 CRF         VP9 CRF value (default: 33)"
    echo "  -a CRF         AV1 CRF value (default: 35)"
    echo "  -c CODEC       Selected codec (av1, h264, vp9)"
    echo "  -t             Test mode - outputs 10 frame samples for each segment"
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
    echo "  INPUT:
    echo "  The input file can be any format supported by FFmpeg with containers:
    echo " '.mov', '.mp4', '.m4v', '.webm', or '.mkv'., but it assumes two"
    echo "  sources: 1) an upscaled 4k source, and 2) a 1080p source. The script will
    echo "  will automatically detect the crop values for the video and use"
    echo "  them to crop the video before encoding.  Source files should have the same"
    echo "  name, but with '_4k' and '_1080p' appended."
    echo " You only supply the root filename \(without the extension\) as the input."
    echo
    echo "  To improve perceived quality, while minimizing file size,"
    echo "  you can define a segment as 'static', 'motion' or 'detail'."
    echo "  The script will use different encoding profiles for each type."
    echo "  and concatenate the segments into a single video file."
    echo
    echo "  OPTIONS:"
    echo "  Optionally, you may change the CRF values for each codec."
    echo "  or encode only a specific codec \(-c flag\)."
    echo "  Test mode: \(-t\) will output 10 frame samples for each segment."
    echo
    echo "  YOU MUST PROVIDE: INPUT, OUTPUT. If you don\'t provide at least one segment"
    echo "  it defaults to a single segment from start to end of the video with the"
    echo "  static profile."
    echo
    echo "Segment definitions:"
    echo "Segment format: START\|END\|TYPE"
    echo "  START/END: timestamp \(HH:MM:SS.mmm\) or frame number \(Nf\)"
    echo "  TYPE: static, motion, or detail"
    echo "  START can be '0' or '0f' or 'start' to specify the start of the video"
    echo "  END can be 'end' or '-1' or '-1f' to specify the end of the video"
    echo
    echo "Examples: "
    echo "  Single segment:"
    echo "    "$0" -i /path/to/source/root_filename" -o hero -s 'start|end|static'"
    echo
    echo "  Multiple segments:"
    echo "    $0 -i myRootSourceName -o hero \\"
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

declare -g NEW_FPS=24

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

declare -A CODEC_LIBRARIES=(
    ["av1"]="libsvtav1"
    ["h264"]="libx264"
    ["vp9"]="libvpx-vp9"
)

declare -A AV1_LEVELS=(
    ["3840"]="5.0"
    ["2560"]="5.0"
    ["1920"]="4.0"
    ["1280"]="3.1"
    ["854"]="3.0"
    ["640"]="2.1"
    ["426"]="2.0"
)

# populated by the script
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
# Modify the encoding profiles sections:

# Base profiles for each codec -- values shared across all segments
declare -A BASE_PROFILES=(
    ["h264"]="stitchable:rc-lookahead=60:scenecut=0:tune=film"
    ["vp9"]="-row-mt 1"
    ["av1"]="tune=1:enable-qm=1:scm=2:enable-overlays=1:lookahead=120:scd=1:enable-tf=0:fast-decode=1:rc=1:film-grain-denoise=0:lp=6"
)

declare -A H264_PROFILES=(
    ["static"]=":aq-mode=1:aq-strength=1.5:merange=24:keyint=360:min-keyint=360:psy-rd='0.4:0':psy-rdoq=2.0:deblock='0:0':grain=1"
    ["motion"]=":aq-mode=2:aq-strength=1.6:me=hex:merange=32:bframes=2:keyint=120:min-keyint=120:psy-rd='0.6:0':deblock='-2:-1'"
    ["detail"]=":aq-mode=2:aq-strength=1.65:me=hex:merange=24:bframes=2:keyint=240:min-keyint=240:no-dct-decimate:psy-rd='0.7:0':deblock='-2:-1'"
)

# Update the AV1_PROFILES array
declare -A AV1_PROFILES=(
    ["static"]=":enable-tf=0:keyint=360:qm-min=5:film-grain=12"
    ["motion"]=":enable-tf=1:keyint=120:qm-min=8:film-grain=10"
    ["detail"]=":enable-tf=0:keyint=240:qm-min=6:film-grain=8"
)

# Update the VP9_PROFILES array
declare -A VP9_PROFILES=(
    ["static"]="-aq-mode 0 -arnr-maxframes 15 -arnr-strength 6 -lag-in-frames 25 -g 360 -undershoot-pct 95 -sharpness 1"
    ["motion"]="-aq-mode 0 -arnr-maxframes 5 -arnr-strength 3 -lag-in-frames 16 -g 120"
    ["detail"]="-aq-mode 1 -arnr-maxframes 6 -arnr-strength 5 -lag-in-frames 20 -g 240"
)

declare -g INPUT OUTPUT INPUT_4k input_1080p CRF_H264 CRF_VP9 CRF_AV1 SELECTED_CODEC ONE_SEGMENT TEST_MODE TEST_SECONDS
declare -g LOGDIR MASTERLOG TEMPDIR VIDEO_FPS

# Store segments
declare -a SEGMENTS=()

# argument parsing
while getopts "i:o:s:2:9:a:c:th" opt; do  # Added 't' for test mode
    case $opt in
    i) INPUT="$OPTARG" ;;
    o) OUTPUT="$OPTARG" ;;
    s) SEGMENTS+=("$OPTARG") ;;
    2) CRF_H264="$OPTARG" ;;
    9) CRF_VP9="$OPTARG" ;;
    a) CRF_AV1="$OPTARG" ;;
    c) SELECTED_CODEC="$OPTARG" ;;
    t) TEST_MODE=true ;;  # New flag for test mode
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

# 2. Add to help text

# Set default CRF values

CRF_AV1="${CRF_AV1:-37}"
CRF_H264="${CRF_H264:-25}"
CRF_VP9="${CRF_VP9:-35}"
SELECTED_CODEC="${SELECTED_CODEC:-}"
TEST_MODE="${TEST_MODE:-false}"
TEST_SECONDS="${TEST_SECONDS:-3}"

# ----------- Setup tempdir and logging -----------

# Validate required parameters
if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Error: Input and output root filenames are required"
    show_help
    exit 1
fi

if [ -z "${SEGMENTS[*]}" ]; then
    echo "No segments defined. Defaulting to full video with static profile."
    SEGMENTS=("0|end|static")
fi

# Add temp dir
TEMPDIR=$(mktemp -d)
export TEMPDIR

mkdir -p "$TEMPDIR"
mkdir -p "$OUTPUT"

# Add after TEMPDIR definition:
LOGDIR="${OUTPUT}_logs"
if [ -f "$LOGDIR" ]; then
    rm -rf "$LOGDIR"
fi
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


# ----------- Validate CLI arguments -----------

get_filename() {
    local root_name=$1
    local filename extension
    filename=$(find . -maxdepth 1 -type f -name "${root_name}.*" 2>/dev/null | head -n1)
    if [ -z "$filename" ]; then
        log "Error: Source file not found for ${root_name}"
        exit 1
    fi
    # test if the file is a video container
    if ! ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "$filename" | grep -q video; then
        log "Error: Source file is not a video container: ${filename}"
        exit 1
    fi
    echo "${filename}"
}

process_input_filename() {
    local input="$1"
    local input_4k input_1080p

    # Use globbing to find the 4k file
    input_4k=$(get_filename "${input}_4k")
    input_1080p=$(get_filename "${input}_1080")

    echo "${input_4k}" "${input_1080p}"
}

read -r INPUT_4k INPUT_1080p < <(process_input_filename "$INPUT")

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

# ----------- Segment Handling Functions -----------

# Function to get resolution-specific CRF value
get_resolution_crf() {
    local width="$1"
    local base_crf="$2"
    local result

    # Validate inputs are numeric
    if ! [[ "$width" =~ ^[0-9]+$ ]] || ! [[ "$base_crf" =~ ^[0-9]+$ ]]; then
        log "Error: Width ($width) and base CRF ($base_crf) must be integers"
        echo "23" # Return default CRF
        return 1
    fi

    case "$width" in
        3840)
            result="$(echo "$base_crf + 4" | bc)"
            ;;
        2560)
            result="$(echo "$base_crf + 3" | bc)"
            ;;
        1920)
            result="$(echo "$base_crf + 1" | bc)"
            ;;
        *)
            result="$base_crf"
            ;;
    esac
    echo "$result"
}

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
    if [ -z "$den" ] || ! [[ "$den" =~ ^[0-9]+$ ]]; then
        log "Error: Unable to determine video FPS, setting to 30"
        VIDEO_FPS=30

    else
        VIDEO_FPS=$(echo "scale=3; $num/$den" | bc)
    fi
    echo "$VIDEO_FPS"
}

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

    filter_chain="format=pix_fmts=yuv420p10le,fps=${new_fps},scale=${target_width}:${target_height}"

    # Build crop if needed
    if [ "$crop_top" != "0" ] || [ "$crop_right" != "0" ] || [ "$crop_bottom" != "0" ] || [ "$crop_left" != "0" ]; then
        local crop_width
        crop_width=$(((target_width - scaled_left - scaled_right) / 2 * 2))
        local crop_height
        crop_height=$(((target_height - scaled_top - scaled_bottom) / 2 * 2))
        filter_chain="${filter_chain},crop=${crop_width}:${crop_height}:${scaled_left}:${scaled_top}"
    fi

    echo "$filter_chain"
}
# Function to convert frames to seconds
frames_to_seconds() {
    local frames="$1"
    local fps="$2"
    echo "scale=3; $frames / $fps" | bc
}

# Function to convert time format to seconds
convert_to_time() {
    local value="$1"
    local hours minutes seconds duration total_seconds
    duration=$(get_video_duration "$INPUT_1080p")
    case "$value" in
        start)
            echo "0"
            ;;
        end)
            echo "$duration"
            ;;
        0)
            echo "0"
            ;;
        0f)
            echo "0"
            ;;
        -1)
            echo "$duration"
            ;;
        -1f)
            echo "$duration"
            ;;
        *f)
            # Convert frame number to seconds
            frames=${value%f}
            total_seconds=$(frames_to_seconds "$frames" "$VIDEO_FPS")
            echo "$total_seconds"
            ;;
        *)
            # Convert HH:MM:SS.mmm to seconds
            IFS=: read -r hours minutes seconds <<<"${value//,/.}"
            total_seconds=$(echo "scale=3; ($hours * 3600) + ($minutes * 60) + $seconds" | bc)
            echo "$total_seconds"
            ;;
    esac
}

get_final_filename() {
    local output_base="$1"
    local codec="$2"
    local width="$3"
    local extension
    case "$codec" in
        av1)
            extension="webm"
            ;;
        h264)
            extension="mp4"
            ;;
        vp9)
            extension="webm"
            ;;
        *)
            log "Error: Unsupported codec $codec"
            exit 1
            ;;
    esac
    echo "${output_base}/${output_base}_${codec}_${width}.${extension}"
}

# ----------- Main Encoding Function -----------

encode_video() {
    local input="$1"
    local codec="$2"
    local start_time="$3"
    local end_time="$4"
    local filter_chain="$5"
    local base_crf="$6"
    local output_file="$7"
    local segment_log="$8"
    local pass="$9"
    local profile="${10}"
    local width="${11}"  # Add width parameter
    local extension actual_crf ffmpeg_cmd profile_args tile_columns tile_rows av1_rc_params av1_params min_qp max_qp vp9_tile_columns procs perf_preset

    extension=$(echo "$output_file" | awk -F . '{print $NF}')
    log "Encoding $codec segment ${output_file} - Pass $pass"

    # Get resolution-specific CRF
    actual_crf=$(get_resolution_crf "$width" "$base_crf")
    if [ "$actual_crf" -lt 0 ]; then
        actual_crf=0
    elif [ "$actual_crf" -gt 63 ]; then
        actual_crf=63
    fi
    procs=$(nproc)
    procs=$((procs - 1))

    perf_preset=1
    if [ "$pass" -eq 1 ]; then
    # speed up the first pass a bit
        perf_preset=4
    fi


    # Construct ffmpeg command with codec-specific parameters
    ffmpeg_cmd=(ffmpeg -y -i "$input" -ss "$start_time" -to "$end_time" -c:v "$codec" -vf "$filter_chain")

    # Add resolution-specific tile settings for AV1
    if [ "$width" -ge 1920 ]; then
        tile_columns=4
        tile_rows=2
    elif [ "$width" -le 1280 ] && [ "$width" -ge 854 ]; then
        tile_columns=4
        tile_rows=1
    else # 640x360 and below
        tile_columns=4
        tile_rows=1
    fi

    case "$codec" in
        libsvtav1)

            min_qp=$((actual_crf - 15))
            max_qp=$((actual_crf + 15))
            if [ "$min_qp" -lt 0 ]; then
                min_qp=0
            fi
            if [ "$max_qp" -gt 63 ]; then
                max_qp=63
            fi
            av1_rc_params="qp=${actual_crf}:min-qp=${min_qp}:max-qp=${max_qp}:tile-columns=${tile_columns}:tile-rows=${tile_rows}"
            av1_params="${profile}:${av1_rc_params}"
            ffmpeg_cmd+=( -pass "$pass" -profile:v 0 -preset "${perf_preset}" -level:v "${AV1_LEVELS[$width]}" -tier:v main -svtav1-params "${av1_params}" )
            log "AV1 params: ${av1_params}"
            ;;
        libx264)
            ffmpeg_cmd+=( -crf "$actual_crf" -preset veryslow -profile:v high10 -tune film -movflags +faststart \
                         -x264-params "$profile" )
            ;;
        libvpx-vp9)
            vp9_tile_columns=$((tile_columns - 2))  # VP9 needs fewer tiles than AV1
            ffmpeg_cmd+=( -pass "$pass" -crf "$actual_crf" -b:v 0 -profile:v 2 -deadline best \
                         -threads "${procs}" -auto-alt-ref 1 -cpu-used "${perf_preset}" -tune ssim -row-mt 1 \
                         -tune-content film -tile-columns "$vp9_tile_columns" -frame-parallel 1 \
                         -enable-tpl 1 )
            IFS=' ' read -r -a profile_args <<< "$profile"
            ffmpeg_cmd+=("${profile_args[@]}")
            ;;
        *)
            log "Error: Unsupported codec $codec"
            exit 1
            ;;
    esac

    if [ "$pass" -eq 1 ]; then
        output_file="/dev/null"
        extension="null"
    fi
    log "Built base ffmpeg command: ${ffmpeg_cmd[*]}"
    ffmpeg_cmd+=( -f "$extension" -an "$output_file")
    log "Executing: ${ffmpeg_cmd[*]}"
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

    local start_time end_time segment_id segment_log crop_values filter_chain crf profile library output_file filter_key extension default_profile
    # Parse segment
    IFS='|' read -r start end type <<<"$segment"

    # Convert start and end to time
    if [ "$TEST_MODE" == true ]; then
        # test mode has already converted to time
        start_time="$start"
        end_time="$end"
    else
        start_time=$(convert_to_time "$start")
        end_time=$(convert_to_time "$end")
    fi

    # Create unique segment identifier
    segment_id=$(echo "$start_time-$end_time" | tr ':.' '-')

    # setup logfile
    segment_log="${LOGDIR}/${width}_${type}_${segment_id}.log"

    # Check if filter chain is already cached
    # We don't want to switch filters between segments of the same resolution
    log "Encoding $codec segment $segment_id"
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

    library=${CODEC_LIBRARIES[$codec]}
    default_profile=${BASE_PROFILES[$codec]}
    case "$codec" in
        av1)
            crf="$CRF_AV1"
            profile="${default_profile}${AV1_PROFILES[$type]}"
            extension="webm"
            ;;
        h264)
            crf="$CRF_H264"
            profile="${default_profile}${H264_PROFILES[$type]}"
            extension="mp4"
            ;;
        vp9)
            local profile_args default_args
            IFS=: read -r -a profile_args <<<"${VP9_PROFILES[$type]}"
            IFS=: read -r -a default_args <<<"${default_profile}"
            crf="$CRF_VP9"
            profile="${default_args[*]} ${profile_args[*]}"
            extension="webm"
            ;;
        *)
            log "Error: Unsupported codec $codec"
            exit 1
            ;;
    esac
    local final_out segment_out
    mkdir -p "$output_base"
    final_out=$(get_final_filename "$output_base" "$codec" "$width")
    segment_out="${output_base}/${output_base}_${codec}_${width}_${segment_id}.${extension}"
    if [ -f "$segment_out" ] || [ -f "$final_out" ]; then
        log "$codec segment $segment_out already exists. Skipping."
        if [ "$ONE_SEGMENT" == true ]; then
            echo "$final_out"
        elif [ -f "$segment_out" ]; then
            echo "$segment_out"
        fi
        return
    fi
    if [ "$ONE_SEGMENT" == true ]; then
            output_file="${final_out}"
        else
            output_file="${segment_out}"
        fi
    if [ "$pass" -eq 1 ]; then
        output_file="/dev/null"
    fi

    # Encode the segment
    encode_video "$input" "$library" "$start_time" "$end_time" "$filter_chain" "$crf" "$output_file" "$segment_log" "$pass" "$profile" "$width"

    echo "$output_file"
}

# Function to process segments after encoding
process_segments() {
    if [ "${TEST_MODE:-false}" = true ]; then
        return 0
    fi
    local segments=("$@")
    local output_file="${segments[-1]}"
    if [ -f "${output_file}" ]; then
        log "Output file already exists: ${output_file}"
        return 0
    fi
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
    ffmpeg -y -f concat -probesize 2G -analyzeduration 2G -duration_probesize 1G  -safe 0 -i "$concat_file" -c copy "$output_file"
    local status=$?

    rm -f "$concat_file"
    for file in "${to_delete[@]}"; do
        rm -f "$file"
    done
    return $status
}

get_random_time() {
    local start_time="$1"
    local end_time="$2"
    local fps="$3"
    local segment_length=${4:-3}  # Renamed from TEST_SECONDS to avoid builtin conflict

    # Validate segment_length
    if [ -z "$segment_length" ] || [ "$(echo "$segment_length <= 0" | bc -l)" -eq 1 ]; then
        log "Invalid segment length: $segment_length, using default of 3"
        segment_length=3
    fi

    local start end duration

    # Convert times to seconds with validation
    start=$(convert_to_time "$start_time")
    end=$(convert_to_time "$end_time")

    # Calculate duration using bc
    duration=$(echo "scale=3; $end - $start" | bc)
    log "Duration: $duration seconds, Start: $start, End: $end, Segment length: $segment_length"

    # Check if duration is less than minimum seconds needed
    if [ "$(echo "$duration < $segment_length" | bc -l)" -eq 1 ]; then
        log "Duration too short, returning original times"
        echo -e "$start\t$end"
        return
    fi

    # Calculate maximum random offset (convert to integer milliseconds)
    local max_offset
    max_offset=$(echo "($duration - $segment_length) * 1000 / 1" | bc)
    log "Max offset (ms): $max_offset"

    # Validate max_offset is positive
    if [ -z "$max_offset" ] || [ "$max_offset" -le 0 ]; then
        log "Invalid max_offset: $max_offset"
        echo -e "$start\t$end"
        return
    fi

    # Get random offset in milliseconds
    local random_offset
    random_offset=$(shuf -i 0-"$max_offset" -n 1)
    log "Random offset (ms): $random_offset"

    # Calculate new start and end times
    local new_start new_end
    new_start=$(echo "scale=3; $start + ($random_offset / 1000)" | bc)
    new_end=$(echo "scale=3; $new_start + $segment_length" | bc)
    log "New times - Start: $new_start, End: $new_end, Duration: $segment_length"


    # Verify end time doesn't exceed video duration
    if [ "$(echo "$new_end > $end" | bc -l)" -eq 1 ]; then
        new_end="$end"
        new_start=$(echo "scale=3; $end - $segment_length" | bc)
        [ "$(echo "$new_start < 0" | bc -l)" -eq 1 ] && new_start="0"
        log "Adjusted times - Start: $new_start, End: $new_end"
    fi

    # Validate segment duration
    if [ "$(echo "$new_end <= $new_start" | bc -l)" -eq 1 ]; then
        log "Invalid segment duration, using original times"
        echo -e "$start\t$end"
        return
    fi

    echo -e "$new_start\t$new_end"
}

get_test_segments() {
    local segments=()
    local segment
    VIDEO_FPS=$(get_fps "$INPUT_1080p")

    for segment in "${SEGMENTS[@]}"; do
        log "Generating test segments for $segment"
        local start end type
        IFS='|' read -r start end type <<<"$segment"

        local new_start new_end
        # Use tab as delimiter for reading random time output
        IFS=$'\t' read -r new_start new_end < <(get_random_time "$start" "$end" "$VIDEO_FPS")

        # Validate read was successful
        if [[ $? -eq 0 && -n "$new_start" && -n "$new_end" ]]; then
            segments+=("$new_start|$new_end|$type")
            log "New segment: $new_start|$new_end|$type"
        else
            log "Error: Failed to get random time for segment $segment"
            segments+=("$start|$end|$type")
        fi
    done

    echo "${segments[@]}"
}

# ----------- Main Pipeline Function -----------

# Main function
main() {
    # Add output directory check
    local total_segments total_codecs total_resolutions total_operations current_operation

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
    if [ "$TEST_MODE" = true ]; then
        # replace segments with test segments
        IFS=' ' read -r -a SEGMENTS <<<"$(get_test_segments)"
    fi
    total_operations=$((total_segments * total_resolutions * total_codecs))
    current_operation=0

    for resolution in "${RESOLUTIONS[@]}"; do
        local input
        read -r width height <<< "$resolution"
        log "Processing ${width}x${height} resolution"

        if [ "$width" -gt 1920 ]; then
            input="$INPUT_4k"
        else
            input="$INPUT_1080p"
        fi
        VIDEO_FPS=$(get_fps "$input")
        local orig_dimensions orig_width orig_height
        # Get original dimensions
        orig_dimensions=$(get_video_dimensions "$input")
        orig_width=$(echo "$orig_dimensions" | cut -d'x' -f1)
        orig_height=$(echo "$orig_dimensions" | cut -d'x' -f2)

        # Arrays to store segment files for concatenation
        declare -a av1_segments=()
        declare -a h264_segments=()
        declare -a vp9_segments=()

        for segment_index in "${!SEGMENTS[@]}"; do
            local segment
            segment="${SEGMENTS[$segment_index]}"
            log "Processing segment $((segment_index + 1)) of $total_segments"
            for codec in "${CODECS[@]}"; do
                local output percent_complete filename
                percent_complete=$((current_operation * 100 / total_operations))
                log "Processing codec $codec at resolution ${width}x${height} for ${segment}"
                log "Operation ${current_operation} of ${total_operations}"
                log "Percent complete ${percent_complete}%"
                filename=$(get_final_filename "$OUTPUT" "$codec" "$width")
                if [ -f "$filename" ]; then
                    log "Output file already exists: $filename"
                    current_operation=$((current_operation + 1))
                    continue
                fi
                if [ "$codec" == "h264" ]; then
                        log "Encoding H264 segment"
                        output=$(encode_segment "$input" "$OUTPUT" "$segment" \
                            "$width" "$height" "$orig_width" "$orig_height" \
                            2 "$codec" "$width")
                            h264_segments+=("$output")
                        log "Encoded H264 segment: ${output}"
                    else
                        encode_segment "$input" "$OUTPUT" "$segment" \
                            "$width" "$height" "$orig_width" "$orig_height" \
                            1 "$codec" "$width"

                        output=$(encode_segment "$input" "$OUTPUT" "$segment" \
                            "$width" "$height" "$orig_width" "$orig_height" \
                            2 "$codec" "$width")
                        if [ "$codec" == "av1" ]; then
                            log "Encoded AV1 segment: ${output}"
                            av1_segments+=("$output")
                        else
                            log "Encoded VP9 segment: ${output}"
                            vp9_segments+=("$output")
                        fi
                    fi
                current_operation=$((current_operation + 1))
            done
        done
    if [ "$ONE_SEGMENT" == true ] || [ "$TEST_MODE" == true ]; then
        continue # If one segment, that's our video. No need to combine
        # We also leave them as-is for test mode
    else
        local filename
        if [ "${#av1_segments[@]}" -gt 0 ]; then
            log "Combining AV1 segments"
            filename=$(get_final_filename "$OUTPUT" "av1" "$width")
            process_segments "${av1_segments[@]}" "${filename}"
        fi
        if [ "${#h264_segments[@]}" -gt 0 ]; then
            log "Combining H264 segments"
            filename=$(get_final_filename "$OUTPUT" "h264" "$width")
            process_segments "${h264_segments[@]}" "${filename}"
        fi
        if [ "${#vp9_segments[@]}" -gt 0 ]; then
            log "Combining VP9 segments"
            filename=$(get_final_filename "$OUTPUT" "vp9" "$width")
            process_segments "${vp9_segments[@]}" "${filename}"
        fi
    fi
    done
}

# Run the script
main

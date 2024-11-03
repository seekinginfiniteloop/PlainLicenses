#!/bin/bash

# Function to find the repository root
function find_repo_root {
    if [[ -d .git ]]; then
        echo "."
        return
    fi
    local SCRIPT_DIR
    SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
    local dir="$SCRIPT_DIR"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" ]]; then
            echo "$dir"
            return
        fi
        dir=$(dirname "$dir")
    done
    error_exit "Could not find the repository root directory."
}

find_repo_root || exit 1

if [[ ! -f pre-push.sample ]]; then
    pre-commit install || exit 1
fi


cd .git/hooks || exit 1
if [ ! -f pre-commit ]; then
    cat << 'EOF' > pre-commit
# Get the directory of this script
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Function to exit with an error message
function error_exit {
    echo "$1" 1>&2
    exit 1
}

# Function to find the repository root
function find_repo_root {
    if [[ -d .git ]]; then
        echo "."
        return
    fi
    local dir="$SCRIPT_DIR"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" ]]; then
            echo "$dir"
            return
        fi
        dir=$(dirname "$dir")
    done
    error_exit "Could not find the repository root directory."
}

function check_env {
    if [[ -z "$VIRTUAL_ENV" ]]; then
        source .venv/bin/activate || error_exit "Failed to activate the virtual environment."
    fi
    if ! command -v uv > /dev/null || ! command -v bun > /dev/null; then
        chmod +x bin/setup-repo.sh
        echo "it looks like you're missing some tools.  Let me install them for you."
        bin/setup-repo.sh --tool-install || error_exit "Failed to setup the repository."
    fi
    return 0
}

# Find the repository root and change to it
REPO_ROOT=$(find_repo_root)
cd "$REPO_ROOT" || error_exit "Failed to change to the repository root directory."

# Your existing script logic
ARGS+=(--hook-dir "$SCRIPT_DIR" -- "$@")

# Run environment checks
check_env || error_exit "environment failed checks... exiting"
if command -v pre-commit > /dev/null; then
    exec pre-commit "${ARGS[@]}"
else
    echo "\`pre-commit\` not found.  Did you forget to activate your virtualenv?" 1>&2
    error_exit "pre-commit not found"
fi
EOF
    chmod +x pre-commit
fi

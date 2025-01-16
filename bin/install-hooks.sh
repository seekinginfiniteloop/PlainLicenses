#!/bin/bash
# This script installs the hooks in the repository
# It finds the repo root and copies the hooks from the bin/hooks directory to the .git/hooks directory

declare -g HOOKS_TEMPLATE_DIR="bin/hooks"
declare -g HOOKS_DIR=".git/hooks"
declare -a -g HOOKS=(
    "pre-commit"
    "prepare-commit-msg"
    "commit-msg"
)

error_exit() {
    echo "$1" 1>&2
    exit 1
}

get_script_dir() {
    local script_dir
    script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
    echo "$script_dir"
}

# Function to find the repository root
function find_repo_root {
    local current_dir="$1"
    local git_parse_dir
    git_parse_dir=$(git rev-parse --show-toplevel 2>/dev/null)
    if [[ -n "$git_parse_dir" ]]; then
        echo "$git_parse_dir"
        return
    fi
    while [[ "$current_dir" != "/" ]]; do
        if [[ -d "$current_dir/.git" ]]; then
            echo "$current_dir"
            return
        elif [[ -d ".git" ]]; then
            current_dir=$(pwd)
            echo "$current_dir"
            return
        fi
        current_dir=$(dirname "$current_dir")
    done
    error_exit "Could not find the repository root directory."
}

main() {
    local repo_root script_dir
    script_dir=$(get_script_dir)
    repo_root=$(find_repo_root "$script_dir")
    cd "$repo_root" || error_exit "Failed to change directory to repo root: ${repo_root}"
    if ! command -v pre-commit >/dev/null 2>&1; then
        echo "pre-commit not found. Attempting to install repo tools."
        bin/setup-repo.sh --tool-setup || error_exit "Failed to setup tools"
    fi
    local hooks_prefix hook
    hooks_prefix="${HOOKS_TEMPLATE_DIR}/_"
    for hook in "${HOOKS[@]}"; do
        if [[ -f "${hooks_prefix}${hook}" && ! -L "${HOOKS_DIR}/${hook}" ]]; then
            # link them
            ln -s -f "${hooks_prefix}${hook}" "${HOOKS_DIR}/${hook}" || error_exit "Failed to link $hook hook"
        else
            if [[ -L "${HOOKS_DIR}/${hook}" ]]; then
                echo "Hook already exists: $hook"
            else
                error_exit "Hook template not found: $hook"
            fi
        fi
    done
    echo "Hooks installed."
    exit 0
}

main

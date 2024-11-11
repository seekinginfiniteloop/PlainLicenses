#!/bin/bash

# Function to find the repository root
function find_repo_root {
    if [[ -d .git ]]; then
        echo "."
        return
    fi
    SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
    export SCRIPT_DIR
    local dir="$SCRIPT_DIR"
        while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" ]]; then
            export REPO_ROOT_ABS_PATH="$dir"
            return
        fi
        dir=$(dirname "$dir")
    done
    error_exit "Could not find the repository root directory."
}

find_repo_root || exit 1

if ! command -v pre-commit >/dev/null 2>&1; then
    cd "$REPO_ROOT_ABS_PATH" || exit 1
    bin/setup-repo.sh --tool-setup || exit 1
fi

if [[ ! -f .git/hooks/pre-commit ]]; then
    cd "$REPO_ROOT_ABS_PATH" || exit 1
    chmod +x bin/hooks/_* || exit 1
    ln -s "bin/hooks/_pre-commit" ".git/hooks/pre-commit" || exit 1
    ln -s "bin/hooks/_commit-msg" ".git/hooks/commit-msg" || exit 1
    ln -s "bin/hooks/_prepare-commit-msg" ".git/hooks/prepare-commit-msg" || exit 1
fi

#!/bin/bash
# Defaults to simply initializing and updating submodules
# Use --hard-reset to reset submodules to their original state; this will stash any changes in the repository and reset the submodules. If the sparse checkout isn't syncing correctly, use this option to reset the submodules.
# Use --tool-setup to setup developer tools for pre-commit, linting, etc. The easiest way to do this is NOT to use this script, but instead to use the vscode devcontainer. But if you're not using the devcontainer, this script will install the necessary tools.

set -e

# Default setup_mode is 0 (disabled)
# Initialize flags
declare -g hard_reset tool_setup
hard_reset=0
tool_setup=0

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --hard-reset)
      hard_reset=1
      shift
      ;;
    --tool-setup)
      tool_setup=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Add submodules and their properties
submodule_names=("license-list-data" "mkdocs-material" "choosealicense")

submodule_url["license-list-data"]="https://github.com/spdx/license-list-data.git"
submodule_branch["license-list-data"]="main"
submodule_sparse_paths["license-list-data"]="/json/licenses.json /json/details"

submodule_url["mkdocs-material"]="https://github.com/squidfunk/mkdocs-material.git"
submodule_branch["mkdocs-material"]="master"
submodule_sparse_paths["mkdocs-material"]="/material/templates /material/overrides /src/templates /src/overrides tsconfig.json typings"

# shellcheck disable=SC2034
submodule_url["choosealicense"]="https://github.com/github/choosealicense.com.git"
submodule_branch["choosealicense"]="gh-pages"
# shellcheck disable=SC2034
submodule_sparse_paths["choosealicense"]="/_data /_licenses"

REPO_ROOT_ABS_PATH="$(git rev-parse --show-toplevel)"
SUBMODULE_PATH_PREFIX='external'

# Display error messages
error_exit() {
    echo "$1" >&2
    exit 1
}

success_exit() {
    echo "$1"
    exit 0
}

update_submodules() {
    cd "$REPO_ROOT_ABS_PATH"
    git submodule update --init --recursive
}

stash_changes() {
    cd "$REPO_ROOT_ABS_PATH"
    git stash push -m "Stashing changes before updating submodules"
}

init_hard_reset() {
  stash_changes || error_exit "Failed to stash changes"
  for submodule in "${submodule_names[@]}"; do
    cd "$REPO_ROOT_ABS_PATH/$SUBMODULE_PATH_PREFIX/$submodule"
    git checkout "${submodule_branch[$submodule]}" || error_exit "Failed to checkout branch ${submodule_branch[$submodule]}"
    git reset --hard "origin/${submodule_branch[$submodule]}" || error_exit "Failed to reset to origin/${submodule_branch[$submodule]}"
    git clean -fdx || error_exit "Failed to clean the submodule"
  done
}

install_bun_tools() {
    cd "$REPO_ROOT_ABS_PATH"
    bunloc=$(which bun 2>/dev/null || command -v bun 2>/dev/null || echo "$HOME/.bun/bin/bun")
    local bunstall="$bunloc install -g --no-interactive --silent"
    $bunloc install --no-interactive --silent
    $bunstall '@linthtml/linthtml' 'stylelint' 'prettier' 'semantic-release-cli' 'markdownlint-cli2' 'commitizen' 'commitlint' 'eslint' || error_exit "Failed to install bun tools"
}

install_uv_tools() {
    cd "$REPO_ROOT_ABS_PATH"
    uvloc=$("${uvloc}" || which uv 2>/dev/null || command -v uv 2>/dev/null || echo "$HOME/.local/bin/uv")
    export UV_PYTHON_DOWNLOADS="automatic"
    local uvstall="$uvloc tool install"
    $uvloc python install 3.13 &&
    $uvloc venv --allow-existing .venv &&
    source .venv/bin/activate &&
    $uvstall ipython -q &&
    $uvstall ruff -q &&
    $uvstall pre-commit -q &&
    uv sync --all-extras
}

setup_tools() {
  cd "$REPO_ROOT_ABS_PATH"
  # Check if bun is installed
  if ! command -v bun >/dev/null 2>&1; then
    echo "Installing bun..."
    curl -fsSL https://bun.sh/install | bash || npm install -g bun || error_exit "Failed to install bun"
  fi
  if ! command -v uv >/dev/null 2>&1; then
        echo "Installing uv..."
        if ! command -v pip >/dev/null 2>&1; then
            curl -LsSf https://astral.sh/uv/install.sh | sh || error_exit "Failed to install uv"
            export uvloc="${HOME}/.local/bin/uv"
        else
            pip install uv || error_exit "Failed to install uv"
        fi
    fi
    if ! command -v cargo >/dev/null 2>&1; then
        echo "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y || error_exit "Failed to install Rust"
        source "$HOME/.cargo/env"
        cargo install typos-cli || error_exit "Failed to install typos-cli"
    else
        cargo install typos-cli || error_exit "Failed to install typos-cli"
    fi
    source "$HOME/.zshrc" || source "$HOME/.bashrc" || source "$HOME/.bash_profile" || source "$HOME/.profile"

    uvloc=$(which uv 2>/dev/null || command -v uv 2>/dev/null || echo "$HOME/.local/bin/uv")
    echo "Tools installed."
    install_bun_tools || error_exit "Failed to install bun tools"
    install_uv_tools || error_exit "Failed to install uv tools"
    cd "$REPO_ROOT_ABS_PATH"
}

main() {
    if [[ $hard_reset -eq 1 ]]; then
        init_hard_reset || error_exit "Failed to hard reset submodules"
        success_exit "Submodules reset."
    else
        update_submodules || error_exit "Failed to update submodules"
        if [[ $tool_setup -eq 1 ]]; then
            setup_tools || error_exit "Failed to setup tools"
            success_exit "Tools installed."
        else
            echo "Submodules updated."
            if [[ -L .git/hooks/pre-commit && -L .git/hooks/prepare-commit-msg && -L .git/hooks/commit-msg ]]; then
                success_exit "Hooks already exist."
            else
                echo "Installing hooks..."
                chmod +x bin/install-hooks.sh
                bin/install-hooks.sh || error_exit "Failed to install hooks"
                success_exit "Hooks installed."
            fi
        fi
    fi
}

main

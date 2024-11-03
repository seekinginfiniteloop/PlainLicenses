#!/bin/bash
# Defaults to simply initializing and updating submodules
# Use --hard-reset to reset submodules to their original state; this will stash any changes in the repository and reset the submodules. If the sparse checkout isn't syncing correctly, use this option to reset the submodules.
# Use --tool-setup to setup developer tools for pre-commit, linting, etc. The easiest way to do this is NOT to use this script, but instead to use the vscode devcontainer. But if you're not using the devcontainer, this script will install the necessary tools.

set -e

# Default setup_mode is 0 (disabled)
hard_reset=0
tool_setup=0
# Parse command-line arguments
if [[ "$1" == "--hard-reset" ]]; then
    hard_reset=1
fi
if [[ "$1" == "--tool-setup" ]]; then
    tool_setup=1
fi

# Declare associative array for submodules and their properties
declare -A submodules

# Add submodules and their properties
submodules["license-list-data,url"]="https://github.com/spdx/license-list-data.git"
submodules["license-list-data,branch"]="main"
submodules["license-list-data,sparse_paths"]="/json/licenses.json /json/details"

submodules["mkdocs-material,url"]="https://github.com/squidfunk/mkdocs-material.git"
submodules["mkdocs-material,branch"]="master"
submodules["mkdocs-material,sparse_paths"]="/material/templates /material/overrides /src/templates /src/overrides tsconfig.json"

submodules["choosealicense.com,url"]="https://github.com/github/choosealicense.com.git"
submodules["choosealicense.com,branch"]="gh-pages"
submodules["choosealicense.com,sparse_paths"]="/_data /_licenses"

REPO_ROOT_ABS_PATH="$(git rev-parse --show-toplevel)"
SUBMODULE_PATH_PREFIX='external'

# Display error messages
error_exit() {
    echo "$1" >&2
    exit 1
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
    for submodule in "${!submodules[@]}"; do
        cd "$REPO_ROOT_ABS_PATH/$SUBMODULE_PATH_PREFIX/$submodule"
        git checkout "${submodules[$submodule,branch]}" || error_exit "Failed to checkout branch ${submodules[$submodule,branch]}"
        git reset --hard "origin/${submodules[$submodule,branch]}" || error_exit "Failed to reset to origin/${submodules[$submodule,branch]}"
        git clean -fdx || error_exit "Failed to clean the submodule"
    done
}

get_tool_locs() {
    bunloc=whereis bun || which bun
    uvloc=whereis uv || which uv
    piploc=whereis pip || which pip
    cargoloc=whereis cargo || which cargo
}

install_bun_tools() {
    cd "$REPO_ROOT_ABS_PATH"
    get_tool_locs
    local bunstall="$bunloc install -g --no-interactive --silent"
    $bunstall &&
    $bunstall '@linthtml/linthtml'
    $bunstall 'stylelint'
    $bunstall 'prettier'
    $bunstall 'semantic-release-cli'
    $bunstall 'markdownlint-cli2'
    $bunstall 'commitizen'
    $bunstall 'commitlint'
}

install_uv_tools() {
    cd "$REPO_ROOT_ABS_PATH"
    get_tool_locs
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
    get_tool_locs
    # Check path for tools, starting with bun
    if [[ ! $bunloc ]]; then
        echo "Installing bun..."
        curl -fsSL https://bun.sh/install | bash || error_exit "Failed to install bun"
    fi
    if [[ ! $uvloc ]]; then
        echo "Installing uv..."
        if [[ $piploc ]]; then
            pip install uv || error_exit "Failed to install uv"
        else
            curl -LsSf https://astral.sh/uv/install.sh | sh || error_exit "Failed to install uv"
        fi
    fi
    if [[ $cargoloc ]]; then
        echo "Installing typos-cli..."
        $cargoloc install typos-cli || error_exit "Failed to install typos-cli"
    fi
    echo "Tools installed."
    get_tool_locs
    echo "Bun location: $bunloc"
    echo "UV location: $uvloc"
    install_bun_tools || error_exit "Failed to install bun tools"
    install_uv_tools || error_exit "Failed to install uv tools"
    chmod +x bin/install-hooks.sh
    bin/install-hooks.sh || error_exit "Failed to install hooks"
}

update_submodules || error_exit "Failed to update submodules"
if [[ $tool_setup -eq 1 ]]; then
    setup_tools || error_exit "Failed to setup tools"
    elif [[ $hard_reset -eq 1 ]]; then
    init_hard_reset || error_exit "Failed to hard reset submodules"
fi

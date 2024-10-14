#!/bin/bash

set -e

# Default setup_mode is 0 (disabled)
setup_mode=0

# Parse command-line arguments
if [[ "$1" == "--setup" ]]; then
    setup_mode=1
fi

# Declare associative array for submodules and their properties
declare -A submodules

# Add submodules and their properties -- add/remove/change as needed
submodules["license-list-data,url"]="https://github.com/spdx/license-list-data.git"
submodules["license-list-data,branch"]="main"
submodules["license-list-data,sparse_paths"]="/json/licenses.json"

submodules["mkdocs-material,url"]="https://github.com/squidfunk/mkdocs-material.git"
submodules["mkdocs-material,branch"]="master"
submodules["mkdocs-material,sparse_paths"]="/material/templates/assets/javascripts /material/templates/assets/stylesheets"

GIT_DIR="$(git rev-parse --git-dir)"
GIT_DIR_ABS_PATH="$(git rev-parse --absolute-git-dir)"
REPO_ROOT_ABS_PATH="$(git rev-parse --show-toplevel)"
SUBMODULE_PATH_PREFIX='external'

# Display error messages
error_exit() {
    echo "$1" >&2
    exit 1
}

# Reroute to a directory
reroute_to_dir() {
    local expected_dir="$1"
    local cwd="$(pwd)"
    if [[ "${cwd}" != "${expected_dir}" ]]; then
        cd "${expected_dir}" || error_exit "Failed to change directory to ${expected_dir}. Exiting..."
    fi
    return 0
}

# Enable sparse checkout
enable_sparse_checkout() {
    local sparse_paths="$1"
    local submodule_rel_path="$2"
    local submodule_abs_path="$3"
    local submodule_git_dir="${GIT_DIR_ABS_PATH}/modules/${submodule_rel_path}"

    reroute_to_dir "${submodule_abs_path}" || error_exit "Failed to change directory to submodule."
    echo "Enabling sparse checkout..."
    git config core.sparseCheckout true
    SPARSE_CHECKOUT_FILE="${submodule_git_dir}/info/sparse-checkout"
    echo "Attempting to write sparse checkout for ${SPARSE_CHECKOUT_FILE}..."

    if [[ ! -f "${SPARSE_CHECKOUT_FILE}" ]]; then
        echo "Creating sparse-checkout file..."
        mkdir -p "$(dirname "${SPARSE_CHECKOUT_FILE}")"
        touch "${SPARSE_CHECKOUT_FILE}" || error_exit "Failed to create sparse-checkout file."
    fi
    update_sparse_checkout "${sparse_paths}" "${SPARSE_CHECKOUT_FILE}" "${submodule_abs_path}" || error_exit "Failed to update sparse-checkout."

    echo "Sparse checkout enabled."
    return 0
}

# Create/add submodule if it doesn't exist
create_or_add_submodule() {
    local submodule="$1"
    local remote_url="$2"
    local branch="$3"
    local submodule_rel_path="$4"
    local submodule_abs_path="$5"

    if [[ ! -d "${submodule_rel_path}" ]]; then
        echo "Submodule ${submodule} not found. Adding submodule..."
        reroute_to_dir "${REPO_ROOT_ABS_PATH}" || error_exit "Failed to change directory to repo root."
        git submodule add -b "${branch}" "${remote_url}" "${submodule_rel_path}" || error_exit "Failed to add submodule."
        reroute_to_dir "${submodule_abs_path}" || error_exit "Failed to change directory to submodule."
        git submodule update --init --recursive || error_exit "Failed to update submodule."
    fi
}

# Function to check if sparse-checkout file matches the sparse paths
check_sparse_checkout_file() {
    local sparse_paths="$1"
    local sparse_checkout_file="$2"

    if [[ ! -f "${sparse_checkout_file}" ]]; then
        return 1  # Sparse-checkout file doesn't exist
    fi

    mapfile -t current_paths < "${sparse_checkout_file}"
    IFS=' ' read -r -a expected_paths <<< "${sparse_paths}"

    if [[ "${#current_paths[@]}" -ne "${#expected_paths[@]}" ]]; then
        return 1  # Paths do not match
    fi

    for i in "${!current_paths[@]}"; do
        if [[ "${current_paths[${i}]}" != "${expected_paths[${i}]}" ]]; then
            return 1  # Paths do not match
        fi
    done

    return 0  # Paths match
}

# Function to update sparse-checkout
update_sparse_checkout() {
    local sparse_paths="$1"
    local sparse_checkout_file="$2"
    local submodule_abs_path="$3"

    reroute_to_dir "${submodule_abs_path}" || error_exit "Failed to change directory to submodule."
    echo "Updating sparse checkout..."
    printf "%s\n" "${sparse_paths}" > "${sparse_checkout_file}"
    git read-tree -mu HEAD || error_exit "Failed to update working tree with sparse checkout."
}

# Function to synchronize files with sparse-checkout
sync_files_with_sparse_checkout() {
    local sparse_paths="$1"
    local branch="$2"
    local submodule="$3"
    local submodule_abs_path="$4"
    local submodule_rel_path="$5"

    GIT_DIR="$(git rev-parse --git-dir)"
    SPARSE_CHECKOUT_FILE="${GIT_DIR}/info/sparse-checkout"

    reroute_to_dir "${submodule_abs_path}" || error_exit "Failed to change directory to submodule."

    # Check if sparse-checkout file matches the sparse paths
    check_sparse_checkout_file "${sparse_paths}" "${SPARSE_CHECKOUT_FILE}"
    status=$?
    if [[ ${status} -ne 0 ]]; then
        update_sparse_checkout "${sparse_paths}" "${SPARSE_CHECKOUT_FILE}" "${submodule_abs_path}"
    fi
}

# Main function to update submodule
update_submodule() {
    local submodule="$1"
    local remote_url="${submodules[${submodule},url]}"
    local branch="${submodules[${submodule},branch]}"
    local sparse_paths="${submodules[${submodule},sparse_paths]}"
    local submodule_rel_path="$2"
    local submodule_abs_path="$3"

    echo "Updating submodule ${submodule}..."

    if [[ ! -d "${submodule_rel_path}" ]]; then
        if [[ $setup_mode -eq 1 ]]; then
            create_or_add_submodule "${submodule}" "${remote_url}" "${branch}" "${submodule_rel_path}" "${submodule_abs_path}"
        else
            echo "Submodule ${submodule} does not exist. Skipping..."
            return
        fi
    fi

    reroute_to_dir "${submodule_abs_path}" || error_exit "Failed to enter submodule directory."

    # Restore write permissions
    chmod -R u+w . || error_exit "Failed to set write permissions."

    if [[ -n "${sparse_paths}" ]]; then
        if [[ $setup_mode -eq 1 ]]; then
            enable_sparse_checkout "${sparse_paths}" "${submodule_rel_path}" "${submodule_abs_path}"
        fi
        sync_files_with_sparse_checkout "${sparse_paths}" "${branch}" "${submodule}" "${submodule_abs_path}" "${submodule_rel_path}"
    fi

    # Fetch latest changes
    echo "Fetching latest changes..."
    if ! git fetch origin "${branch}"; then
        error_exit "Failed to fetch updates from 'origin/${branch}'."
    fi

    # Update working tree
    echo "Updating working tree..."
    if ! reroute_to_dir "${submodule_abs_path}"; then
        error_exit "Failed to change directory to submodule."
    fi
    git checkout "${branch}" || error_exit "Failed to checkout branch ${branch}."
    git reset --hard "origin/${branch}" || error_exit "Failed to reset submodule."
    git clean -fdx || error_exit "Failed to clean submodule."

    # Set submodule to read-only after update
    chmod -R a-w . || error_exit "Failed to set read-only permissions."

    echo "Submodule ${submodule} updated successfully."
    cd "${REPO_ROOT_ABS_PATH}" || error_exit "Failed to return to the main repository."
}

# Collect unique submodule names
declare -A submodule_names
for key in "${!submodules[@]}"; do
    submodule_name="${key%%,*}"
    submodule_names["${submodule_name}"]=1
done

# Iterate over unique submodule names
for submodule in "${!submodule_names[@]}"; do
    echo "Processing submodule: ${submodule}"
    if [[ "${SUBMODULE_PATH_PREFIX}" != '/' ]]; then
        SUBMODULE_REL_PATH="${SUBMODULE_PATH_PREFIX}/${submodule}"
        SUBMODULE_ABS_PATH="${REPO_ROOT_ABS_PATH}/${SUBMODULE_REL_PATH}"
    else
        SUBMODULE_REL_PATH="${submodule}"
        SUBMODULE_ABS_PATH="${REPO_ROOT_ABS_PATH}/${submodule}"
    fi
    update_submodule "${submodule}" "${SUBMODULE_REL_PATH}" "${SUBMODULE_ABS_PATH}"
done

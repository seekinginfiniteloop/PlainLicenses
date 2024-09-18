#!/bin/bash

# TODO: Debugging -- you may need to run this a few times to get it to work. It tends to hand up on the first submodule.

set -e

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

# Function to check if we are in the root directory
is_this_root() {
    local cwd="$(pwd)"
    if [[ -z "${REPO_ROOT_ABS_PATH}" ]]; then
        return 1
    fi
    return 0
    }

reroute_to_dir() {
    local expected_dir="$1"
    if [[ "${cwd}" != "${expected_dir}" ]]; then
        cd "${expected_dir}" || error_exit "Failed to change directory to ${expected_dir}. Exiting..."
    fi
    echo "Directory check passed."
    return 0
}

# Enable sparse checkout
enable_sparse_checkout() {
    local sparse_paths="$1"
    reroute_to_dir "${SUBMODULE_ABS_PATH}" || error_exit "Failed to change directory to submodule."
    echo "Enabling sparse checkout..."
    git config core.sparseCheckout true
    SPARSE_CHECKOUT_FILE="${GIT_DIR_ABS_PATH}/modules/${SUBMODULE_REL_PATH}/info/sparse-checkout"
    echo "Attempting to write sparse checkout for ${SPARSE_CHECKOUT_FILE}..."

    if [[ ! -f "${SPARSE_CHECKOUT_FILE}" ]]; then
        echo "Creating sparse-checkout file..."
        touch "${SPARSE_CHECKOUT_FILE}" || error_exit "Failed to create sparse-checkout file."
    fi
    update_sparse_checkout "${sparse_paths}" "${SPARSE_CHECKOUT_FILE}" || error_exit "Failed to update sparse-checkout."

    echo "Sparse checkout enabled."
    return 0
}

# Create/add submodule if it doesn't exist
create_or_add_submodule() {
    local submodule="$1"
    local remote_url="$2"
    local branch="$3"

    if [[ ! -d "${SUBMODULE_REL_PATH}" ]]; then
        echo "Submodule not found. Adding submodule..."
        reroute_to_dir "${REPO_ROOT_ABS_PATH}" || error_exit "Failed to change directory to repo root."
        git submodule add -b "${branch}" "${remote_url}" "${SUBMODULE_REL_PATH}" || error_exit "Failed to add submodule."
        reroute_to_dir "${SUBMODULE_ABS_PATH}" || error_exit "Failed to change directory to submodule."
        git submodule update --init --recursive || error_exit "Failed to update submodule."
    fi
}

# Function to check if sparse-checkout file matches the sparse paths
check_sparse_checkout_file() {
    local sparse_paths="$1"
    local sparse_checkout_file="$2"

    if [[ ! -f "${sparse_checkout_file}" ]]; then
        enable_sparse_checkout "${sparse_paths}"
        return 0
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
    reroute_to_dir "${SUBMODULE_ABS_PATH}" || error_exit "Failed to change directory to submodule."
    echo "Updating sparse checkout..."
    printf "%s\n" "${sparse_paths}" > "${sparse_checkout_file}"
    git read-tree -mu HEAD
}

# Function to check if the files in the directory match the sparse paths
check_files_match_sparse_checkout() {
    local sparse_paths="$1"
    # Convert sparse paths to expected file paths
    local expected_files=()
    for path in ${sparse_paths}; do
        # Remove leading slashes and wildcards
        path="${path#/}"
        path="${path%/*}"
        expected_files+=("${SUBMODULE_ABS_PATH}/${path}")
    done

    # Get the list of actual files/directories
    mapfile -t actual_files < <(ls -A)

    # Compare the counts
    if [[ "${#expected_files[@]}" -ne "${#actual_files[@]}" ]]; then
        return 1  # Files do not match
    fi

    # Sort and compare the lists
    mapfile -t sorted_expected < <(printf "%s\n" "${expected_files[@]}" | sort)
    mapfile -t sorted_actual < <(printf "%s\n" "${actual_files[@]}" | sort)

    for i in "${!sorted_expected[@]}"; do
        if [[ "${sorted_expected[${i}]}" != "${sorted_actual[${i}]}" ]]; then
            return 1  # Files do not match
        fi
    done

    return 0  # Files match
}

# Function to synchronize files with sparse-checkout
sync_files_with_sparse_checkout() {
    local sparse_paths="$1"
    local branch="$2"
    local submodule="$3"

    GIT_DIR="$(git rev-parse --git-dir)"
    SPARSE_CHECKOUT_FILE="${GIT_DIR}/info/sparse-checkout"

    # Check if sparse-checkout file matches the sparse paths
    check_sparse_checkout_file "${sparse_paths}" "${SPARSE_CHECKOUT_FILE}"
    status=$?
    if [[ ${status} -eq 1 ]]; then
        update_sparse_checkout "${sparse_paths}" "${SPARSE_CHECKOUT_FILE}"
    elif [[ ${status} -gt 1 ]]; then
        error_exit "Error occurred in check_sparse_checkout_file."
    fi

    # Check if files match sparse-checkout
    check_files_match_sparse_checkout "${sparse_paths}"
    status=$?
    if [[ ${status} -eq 1 ]]; then
        echo "Stashing changes..."
        git stash save "Going to hard reset submodule..." || error_exit "Failed to stash changes."
        echo "Files do not match sparse-checkout. Resetting submodule..."
        reroute_to_dir "${SUBMODULE_ABS_PATH}" || error_exit "Failed to change directory to submodule."

        git reset --hard "origin/${branch}" || error_exit "Failed to reset submodule."
        git clean -fdx || error_exit "Failed to clean submodule."
        git read-tree -mu HEAD || error_exit "Failed to update working tree."
    elif [[ ${status} -gt 1 ]]; then
        error_exit "Error occurred in check_files_match_sparse_checkout."
    fi
}

# Main function to update submodule
update_submodule() {
    local submodule="$1"
    local remote_url="${submodules[${submodule},url]}"
    local branch="${submodules[${submodule},branch]}"
    local sparse_paths="${submodules[${submodule},sparse_paths]}"
    local cwd="$(pwd)"

    echo "Updating submodule at ${submodule}..."

    reroute_to_dir "${REPO_ROOT_ABS_PATH}" || error_exit "Failed to change directory to repo root."

    create_or_add_submodule "${submodule}" "${remote_url}" "${branch}"
    cd "${SUBMODULE_ABS_PATH}" || error_exit "Failed to enter submodule directory."

    # Restore write permissions
    chmod -R u+w . || error_exit "Failed to set write permissions."

    if [[ -n "${sparse_paths}" ]]; then
        enable_sparse_checkout "${sparse_paths}"
        sync_files_with_sparse_checkout "${sparse_paths}" "${branch}" "${submodule}"
    fi

    # Fetch latest changes
    echo "Fetching latest changes..."
    if ! git fetch origin "${branch}"; then
        error_exit "Failed to fetch updates from 'origin/${branch}'."
    fi

    # Update working tree
    echo "Updating working tree..."
    reroute_to_dir "${SUBMODULE_ABS_PATH}" || error_exit "Failed to change directory to submodule."
    git read-tree -mu HEAD || error_exit "Failed to update working tree."

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
    update_submodule "${submodule}"
done

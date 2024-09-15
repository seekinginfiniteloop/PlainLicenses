#!/bin/bash

set -e

SUBMODULE_PATH="external/mkdocs-material"
SUBMODULE_GIT_PATH=".git/modules/external/mkdocs-material"
REMOTE_URL="https://github.com/squidfunk/mkdocs-material.git"
REMOTE_NAME="origin"
BRANCH_NAME="master"
SPARSE_PATHS=("/tsconfig.json" "/src" "/tools" "/typings")
CWD=$(pwd)

# Function to display error messages
error_exit() {
    echo "$1" >&2
    exit 1
}

echo "Updating submodule at ${SUBMODULE_GIT_PATH}..."

# Check if submodule directory exists
if [[ ! -d "${SUBMODULE_PATH}" ]]; then
    echo "Submodule not found. Adding submodule..."
    git submodule add "${REMOTE_URL}" "${SUBMODULE_PATH}" || error_exit "Failed to add submodule."
    git submodule update --init --recursive || error_exit "Failed to initialize submodule."
    cd "${SUBMODULE_PATH}" || error_exit "Failed to enter submodule directory."
    git pull "${REMOTE_NAME}" "${BRANCH_NAME}" || error_exit "Failed to pull updates from '${REMOTE_NAME}'/'${BRANCH_NAME}'."
fi

# Enter submodule directory
cd "${CWD}"
cd "${SUBMODULE_PATH}" || error_exit "Failed to enter submodule directory."

# Enable sparse checkout if not already enabled
CHECKOUT_ENABLED="$(git config core.sparseCheckout)"

if [[ "${CHECKOUT_ENABLED}" != "true" ]]; then
    echo "Enabling sparse checkout..."
    git config core.sparseCheckout true
    for path in "${SPARSE_PATHS[@]}"; do
        echo "${path}" >> .git/info/sparse-checkout
    done
else
    echo "Sparse checkout already enabled."
fi

# Fetch latest changes
echo "Fetching latest changes..."
if ! git fetch "${REMOTE_NAME}" "${BRANCH_NAME}"; then
    error_exit "Failed to fetch updates from '${REMOTE_NAME}'/'${BRANCH_NAME}'."
fi

# Get latest remote commit hash for the branch
REMOTE_COMMIT=$(git rev-parse FETCH_HEAD)
# Get current commit hash
LOCAL_COMMIT=$(git rev-parse HEAD)

if [[ "${LOCAL_COMMIT}" != "${REMOTE_COMMIT}" ]]; then
    echo "New updates found. Updating submodule..."
    if git reset --hard "${REMOTE_COMMIT}" && git read-tree -mu HEAD; then
        echo "Submodule updated successfully."
    else
        error_exit "Failed to update submodule."
    fi
else
    echo "Submodule is up to date."
fi

cd "${CWD}" || error_exit "Failed to return to project root."

echo "Submodule update completed."

exit 0

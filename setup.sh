#!/bin/bash

set -e

echo "Initializing submodules..."

git submodule update --init --recursive

# Run the update script to configure sparse checkout
.github/scripts/update-submodule.sh

echo "Setup completed."

exit 0

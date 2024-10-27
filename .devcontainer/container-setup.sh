#!/bin/bash

# Update and install packages
sudo apt-get update && sudo apt upgrade -y
sudo apt -y install libcairo2-dev pkg-config python3-dev ripgrep nano git git-man

# sync and install tools
bun install --no-summary --silent
uv python install cpython-3.13.0-linux-x86_64-gnu -q
uv tool install ipython -q
uv tool install ruff -q

export BUNOPTS="--no-summary --silent"
# Install global npm packages
bun install -g "${BUNOPTS}" '@linthtml/linthtml'
bun install -g "${BUNOPTS}" 'stylelint'
bun install -g "${BUNOPTS}" 'eslint'
bun install -g "${BUNOPTS}" 'prettier'
bun install -g "${BUNOPTS}" 'semantic-release-cli'

# update zshrc
{
    echo "export PATH='~/.local/share/uv/python/cpython-3.13.0-linux-x86_64-gnu/bin:$PATH'"
    echo "export PATH='/home/vscode/.local/bin:$PATH'"
    echo 'export UV_LINK_MODE=copy'
    echo 'export UV_COMPILE_BYTECODE=1'
    echo 'export UV_PYTHON_PREFERENCE=managed'
    echo 'export UV_PYTHON=cpython-3.13.0-linux-x86_64-gnu'
    echo "alias rg=\"rg --stats --trim --color=always --colors 'match:fg:white' --colors 'path:fg:blue' --smart-case --search-zip\""
    echo "alias rgf='rg --files'"
    echo "alias rgp='rg --pretty'"
    echo "alias rgc='rg --count'"
    echo "autoload -Uz compinit"
    echo "zstyle ':completion:*' menu select"
    echo "export FORCE_COLOR=1"
    echo "export CLICOLOR_FORCE=1"
    echo "[ -s \"~/.bun/_bun\" ] && source \"~/.bun/_bun\""
    echo "export BUN_INSTALL=\"$HOME/.bun\""
    echo "export PATH=\"$BUN_INSTALL/bin:$PATH\""
    echo 'alias ll="ls -alF"'
    
} >> ~/.zshrc

# Update git submodules
git submodule update

# Source .zshrc to apply changes
/bin/zsh -c "source ~/.zshrc"
/bin/zsh
uv venv --allow-existing --relocatable .


export PYVENV="/workspaces/PlainLicense/.venv/bin/activate"
echo "export PYVENV=\"${PYVENV}\"" >> ~/.zshrc
echo "source \"${PYVENV}\"" >> ~/.zshrc
echo "source \"${PYVENV}\"" >> ~/.bashrc
source "${PYVENV}"

uv sync --all-extras

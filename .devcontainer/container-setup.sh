#!/bin/bash

# Update and install packages
sudo apt-get update && sudo apt upgrade -y
sudo apt -y install libcairo2-dev pkg-config python3-dev ripgrep nano git git-man

# sync and install tools
bun install --no-summary --silent
uv python install cpython-3.13.0-linux-x86_64-gnu -q
uv tool install ipython -q

export BUNOPTS="--no-summary --silent"
# Install global npm packages
bun install -g "${BUNOPTS}" '@linthtml/linthtml'
bun install -g "${BUNOPTS}" 'stylelint'
bun install -g "${BUNOPTS}" 'eslint'
bun install -g "${BUNOPTS}" 'prettier'
bun install -g "${BUNOPTS}" 'semantic-release-cli'

export PYVENV="/workspaces/PlainLicense/.venv/bin/activate"

# update zshrc
{
    echo "alias rg=\"rg --no-ignore-vcs --stats --trim --color=always --colors 'match:fg:white' --colors 'path:fg:blue' --smart-case --search-zip\""
    echo "alias rgf='rg --files'"
    echo "alias rgp='rg --pretty'"
    echo "alias rgc='rg --count'"
    echo "autoload -Uz compinit"
    echo "zstyle ':completion:*' menu select"
    echo "[ -s \"~/.bun/_bun\" ] && source \"~/.bun/_bun\""
    echo 'alias ll="ls -alF"'
    echo "source \"${PYVENV}\"" >> ~/.zshrc
    echo "source \"${PYVENV}\"" >> ~/.bashrc
} >> ~/.zshrc

source "${PYVENV}"

uv sync --all-extras
uv venv --allow-existing .

# Update git submodules
git submodule update

# Source .zshrc to apply changes
/bin/zsh -c "source ~/.zshrc"
/bin/zsh

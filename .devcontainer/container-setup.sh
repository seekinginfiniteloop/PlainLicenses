#!/bin/bash

# Update and install packages
mkdir -p /workspaces/PlainLicense
cd /workspaces/PlainLicense
apk update && apk upgrade
apk add --no-cache \
    zsh \
    bash \
    curl \
    git \
    git-doc \
    nano \
    python3 \
    python3-dev \
    ripgrep \
    ripgrep-zsh-completion \
    zsh-autosuggestions \
    cairo \
    cairo-dev \
    cairomm \
    cairo-gobject \
    pkgconfig \
    py3-cairo \
    py3-cairo-dev \
    py3-pip \
    unzip \
    gpg \
    gnupg \
    gnupg-gpgconf
/bin/bash
# sync and install tools
curl -fsSL https://fnm.vercel.app/install | bash
fnm install --lts
fnm completions --shell zsh >> ~/.zshrc
curl -fsSL https://bun.sh/install | bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install cpython-3.13.0-linux-x86_64-gnu -q
bun install --no-summary --silent
uv tool install ipython -q
uv tool install ruff -q

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
    eval "$(fnm env --use-on-cd --shell zsh)"
} >> ~/.zshrc

source "${PYVENV}"

uv sync --all-extras
uv venv --allow-existing .venv

# Update git submodules
git submodule update

# Source .zshrc to apply changes
/bin/zsh -c "source ~/.zshrc"
/bin/zsh

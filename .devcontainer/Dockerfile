FROM mcr.microsoft.com/devcontainers/base:noble

# Prevent apt from prompting for input
ENV DEBIAN_FRONTEND=noninteractive

# Install system packages
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    bash cmake cmake-data cmake-extras extra-cmake-modules curl \
    fontconfig fonts-powerline git git-doc gnupg2 gpg libcairo2 \
    libcairo2-dev libffi-dev libfreetype6-dev libgdm-dev libjpeg-dev \
    libpng-dev libreadline-dev librust-cmake-dev libssl-dev libz-dev \
    nano ncurses-base ncurses-bin nodejs openssl pngquant python3 \
    python3-dev readline-common shellcheck sqlite-utils sqlite3 unzip \
    xclip xterm zlib1g zlib1g-dev zsh zsh-autosuggestions \
    zsh-syntax-highlighting \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV BUN_INSTALL="/home/vscode/.bun" \
    UV_PYTHON_DOWNLOADS="automatic" \
    UV_LINK_MODE="copy" \
    UV_COMPILE_BYTECODE="1" \
    FORCE_COLOR="1" \
    CLICOLOR_FORCE="1" \
    UV_PYTHON="cpython-3.13.0-linux-x86_64-gnu" \
    UV_PYTHON_PREFERENCE="managed"

USER vscode

RUN chown -R vscode:vscode /home/vscode

# Copy configuration files
COPY .devcontainer/.fonts /home/vscode/.fonts/
COPY .devcontainer/.zshrc /home/vscode/.zshrc
COPY .devcontainer/.bashrc /home/vscode/.bashrc
COPY .devcontainer/.p10k.zsh /home/vscode/.p10k.zsh
COPY .devcontainer/lolcate_config.toml /home/vscode/.config/lolcate/default/config.toml
COPY .devcontainer/lolcate_ignores /home/vscode/.config/lolcate/default/ignores
COPY .devcontainer/.Xresources /home/vscode/.Xresources

# install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Rust and cargo tools
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . $HOME/.cargo/env \
    && cargo install --all-features ripgrep \
    && cargo install typos-cli \
    && cargo install --git https://github.com/ngirard/lolcate-rs

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

SHELL ["/bin/bash", "-c"]

# Install PowerLevel10k theme
RUN git clone --depth=1 https://gitee.com/romkatv/powerlevel10k.git \
    "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k"

RUN chmod +x /home/vscode/.oh-my-zsh/oh-my-zsh.sh

WORKDIR /workspaces/PlainLicense

RUN export PATH="$HOME/bin:$HOME/sbin:$HOME/.local/sbin:$HOME/.bun/bin:$HOME/.cargo/bin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:opt/local/sbin" \
    $HOME/.bun/bin/bun install --silent --no-interactive \
    && $HOME/.bun/bin/bun install  -g --silent --no-interactive \
    @linthtml/linthtml \
    markdownlint-cli2 \
    prettier \
    stylelint \
    eslint \
    semantic-release-cli \
    commitizen \
    commitlint \
    node

RUN source /home/.cargo/env \
    && uv -q python install 3.13 \
    && uv -q python use 3.13 \
    && uv venv --allow-existing .venv \
    && uv -q tool install ipython \
    && uv -q tool install ruff \
    && uv -q tool install pre-commit \
    source .venv/bin/activate \
    && uv sync --all-extras

WORKDIR /home/vscode

RUN fc-cache -vf .fonts \
    && mkdir -p .local/share/bash-completion/completions \
    mkdir -p .zfunc \
    mkdir -p logs \
    ln -s logs /workspaces/PlainLicense/.workbench/ \
    sudo tee /etc/cron.daily/lolcate \
    sudo chmod +x /etc/cron.daily/lolcate \
    uv generate-shell-completion zsh > .zfunc/_uv \
    uv generate-shell-completion bash > .local/share/bash-completion/completions/uv \
    rustup completions zsh > .zfunc/_rustup \
    rustup completions bash > .local/share/bash-completion/completions/rustup \
    rustup completions zsh cargo > .zfunc/_cargo \
    rustup completions bash cargo > .local/share/bash-completion/completions/cargo \
    rg --generate=complete-zsh > .zfunc/_rg \
    rg --generate=complete-bash > .local/share/bash-completion/completions/rg

RUN sudo chown -R vscode:vscode /home/vscode \
    && sudo chown -R vscode:vscode /workspaces/PlainLicense \
    sudo chsh -s /bin/zsh vscode

WORKDIR /workspaces/PlainLicense
ENV DEBIAN_FRONTEND=interactive

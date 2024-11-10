#!/bin/bash
# shellcheck disable=SC1091

# Update and install packages
cd /workspaces/PlainLicense || return
sudo apt update &&
sudo apt upgrade -y &&
sudo apt install -y --no-install-recommends \
bash \
cmake \
cmake-data \
cmake-extras \
extra-cmake-modules \
curl \
fontconfig \
fonts-powerline \
git \
git-doc \
gnupg2 \
gpg \
libcairo2 \
libcairo2-dev \
libffi-dev \
libfreetype6-dev \
libgdm-dev \
libjpeg-dev \
libpng-dev \
libreadline-dev \
librust-cmake-dev \
libssl-dev \
libz-dev \
nano \
ncurses-base \
ncurses-bin \
nodejs \
openssl \
pngquant \
python3 \
python3-dev \
readline-common \
shellcheck \
sqlite-utils \
sqlite3 \
unzip \
xclip \
xterm \
zlib1g \
zlib1g-dev \
zsh \
zsh-autosuggestions \
zsh-syntax-highlighting &&

function initial_installs() {
    export BUN_INSTALL="/home/vscode/.bun"
    export UV_PYTHON_DOWNLOADS="automatic"
    # sync and install tools
    curl -fsSL https://bun.sh/install | bash &&
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y &&
    source "$HOME/.cargo/env" &&
    git clone --depth=1 https://gitee.com/romkatv/powerlevel10k.git "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k" &&
    export PATH="$HOME/bin:$HOME/sbin:$HOME/.local/sbin:$HOME/.cargo/bin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:opt/local/sbin" &&
    mkdir -p "$HOME/.fonts" &&
    echo 'xterm*faceName: MesloLGS NF' > "$HOME/.Xresources" &&
    cd "$HOME/.fonts" || return &&
    curl -fsSLO --raw https://github.com/romkatv/powerlevel10k-media/blob/master/MesloLGS%20NF%20Bold%20Italic.ttf &&
    curl -fsSLO --raw https://github.com/romkatv/powerlevel10k-media/blob/master/MesloLGS%20NF%20Bold.ttf &&
    curl -fsSLO --raw https://github.com/romkatv/powerlevel10k-media/blob/master/MesloLGS%20NF%20Regular.ttf &&
    curl -fsSLO --raw https://github.com/romkatv/powerlevel10k-media/blob/master/MesloLGS%20NF%20Bold%20Italic.ttf &&
    curl -fsSLO --raw https://github.com/romkatv/powerlevel10k-media/blob/master/MesloLGS%20NF%20License.txt &&
    fc-cache -vf "$HOME/.fonts" &&
    cd /workspaces/PlainLicense || return
}

function set_configs() {
    export bash_completion="$HOME/.local/share/bash-completion/completions"

    ZSHRC="/workspaces/PlainLicense/.devcontainer/.zshrc"
    BASHRC="/workspaces/PlainLicense/.devcontainer/.bashrc"
    P10K="/workspaces/PlainLicense/.devcontainer/.p10k.zsh"
    LOLCATE_CONFIG="/workspaces/PlainLicense/.devcontainer/lolcate_config.toml"
    LOLCATE_IGNORES="/workspaces/PlainLicense/.devcontainer/lolcate_ignores"

    cat "$ZSHRC" >> "$HOME/.zshrc"
    cat "$BASHRC" >> "$HOME/.bashrc"
    cat "$P10K" >> "$HOME/.p10k.zsh"
    mkdir -p "$HOME/.config/lolcate/default"
    cat "$LOLCATE_CONFIG" >> "$HOME/.config/lolcate/default/config.toml"
    cat "$LOLCATE_IGNORES" >> "$HOME/.config/lolcate/default/ignores"
    mkdir -p "$bash_completion"

    mkdir -p "$HOME/.zfunc"

    mkdir -p "$HOME/logs" &&
    mkdir -p /workspaces/PlainLicense/.workbench &&
    ln -s "$HOME/logs" /workspaces/PlainLicense/.workbench/logs &&
    echo "lolcate --update" | sudo tee /etc/cron.daily/lolcate &&
    sudo chmod +x /etc/cron.daily/lolcate &&
    chmod +x "$HOME/.oh-my-zsh/oh-my-zsh.sh"
    touch "$HOME/.source_zshrc"
}


function setup_rust_helpers() {
    cargo install --git https://github.com/astral-sh/uv uv &&
    cargo install --all-features ripgrep &&
    cargo install typos-cli &&
    cargo install --git https://github.com/ngirard/lolcate-rs
}

function uv_install() {
    export UV_PYTHON_DOWNLOADS="automatic"
    local uvloc=/home/vscode/.cargo/bin/uv
    $uvloc python install 3.13 &&
    $uvloc venv --allow-existing .venv &&
    $uvloc tool install ipython -q &&
    $uvloc tool install ruff -q &&
    $uvloc tool install pre-commit -q &&
    source /workspaces/PlainLicense/.venv/bin/activate &&
    $uvloc sync --all-extras
    $uvloc generate-shell-completion zsh > ~/.zfunc/_uv
    $uvloc generate-shell-completion bash > "$bash_completion"/uv
}

function bun_install() {
    export BUNOPTS="--no-interactive --silent"
    local bunloc=/home/vscode/.bun/bin/bun
    $bunloc install "${BUNOPTS}" &&
    $bunloc install -g "${BUNOPTS}" @linthtml/linthtml stylelint eslint prettier semantic-release-cli markdownlint-cli2 commitizen commitlint node
}

function set_completions() {
    $HOME/.cargo/bin/rustup completions zsh > "$HOME/.zfunc/_rustup"
    $HOME/.cargo/bin/rustup completions bash > "$bash_completion/rustup"
    $HOME/.cargo/bin/rustup completions zsh cargo > "$HOME/.zfunc/_cargo"
    $HOME/.cargo/bin/rustup completions bash cargo > "$bash_completion/cargo"
    $HOME/.cargo/bin/rg --generate=complete-zsh > "$HOME/.zfunc/_rg"
    $HOME/.cargo/bin/rg --generate=complete-bash > "$bash_completion/rg"
}

initial_installs &&
setup_rust_helpers &&
set_configs &&
set_completions &&
uv_install &&
bun_install &&
sudo chsh -s /bin/zsh vscode

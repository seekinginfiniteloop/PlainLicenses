#!/bin/bash
# shellcheck disable=SC1091

# Update and install packages
cd /workspaces/PlainLicense || return
sudo apt update &&
sudo apt upgrade -y &&
sudo apt install -y --no-install-recommends \
zsh \
bash \
curl \
git \
git-doc \
nano \
python3 \
python3-dev \
zsh-autosuggestions \
zsh-syntax-highlighting \
libcairo2 \
libcairo2-dev \
libfreetype6-dev \
libffi-dev \
libjpeg-dev \
libpng-dev \
libz-dev \
unzip \
gpg \
gnupg2 \
nodejs \
ncurses-base \
ncurses-bin \
zlib1g \
zlib1g-dev \
libgdm-dev \
libssl-dev \
openssl \
readline-common \
libreadline-dev \
sqlite3 \
shellcheck \
xclip \
sqlite-utils &&

export BUN_INSTALL="/home/vscode/.bun"
export BUNOPTS="--no-interactive --silent"
export UV_PYTHON_DOWNLOADS="automatic"
# sync and install tools
curl -LsSf https://astral.sh/uv/install.sh | sh &&
curl -fsSL https://bun.sh/install | bash &&
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y &&
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
source "$HOME/.cargo/env" &&
export PATH="$HOME/bin:$HOME/sbin:$HOME/.local/sbin:$HOME/.cargo/bin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:opt/local/sbin"
# Define the block of rc scripting as a variable
CONFIG_BLOCK=$(cat << 'EOF'
export BUN_INSTALL="/home/vscode/.bun"
alias rgg='rg --no-ignore --trim --pretty --colors "match:fg:white" --colors "path:fg:blue" --smart-case --search-zip --hidden'
alias rgf='rg --files | rgg'
alias rgc='rgg --count'
alias ll='ls -alFh'
alias llr='ls -alFhR'
alias lld='ls -alFhd'
alias lldr='ls -alFhdR'
export PATH="$BUN_INSTALL/bin:$HOME/.cargo/bin:$HOME/bin:$HOME/sbin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:/opt/local/sbin"
export UV_PYTHON_DOWNLOADS="automatic"
export UV_COLOR="always"
export FORCE_COLOR=1
export CLICOLOR_FORCE=1
export FILEHANDLER_ENABLED="true"
export LOG_PATH="$HOME/logs"
EOF
)
ZCONFIG_BLOCK=$(cat << 'EOF'
fpath+=~/.zfunc
setopt extended_glob
autoload -Uz compinit
zstyle ':completion:*' menu select
plugins=(bun git gitfast git-prompt gpg-agent pre-commit zsh-interactive-cd rust)
EOF
)
# Write the block of rc scripting to .zshrc and .bashrc
echo "$CONFIG_BLOCK" >> "$HOME/.zshrc"
echo "$CONFIG_BLOCK" >> "$HOME/.bashrc"
echo "$ZCONFIG_BLOCK" >> "$HOME/.zshrc"
# shellcheck disable=SC1090
source "$HOME/.bashrc"


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
    local bunloc=/home/vscode/.bun/bin/bun
    $bunloc install "${BUNOPTS}" &&
    $bunloc install -g "${BUNOPTS}" @linthtml/linthtml stylelint eslint prettier semantic-release-cli markdownlint-cli2 commitizen commitlint node
}

function set_completions() {
    bash_completion="$HOME/.local/share/bash-completion/completions"
    mkdir -p "$bash_completion"
    mkdir -p "$HOME/.zfunc"
    $HOME/.cargo/bin/rustup completions zsh > "$HOME/.zfunc/_rustup"
    $HOME/.cargo/bin/rustup completions bash > "$bash_completion/rustup"
    $HOME/.cargo/bin/rustup completions zsh cargo > "$HOME/.zfunc/_cargo"
    $HOME/.cargo/bin/rustup completions bash cargo > "$bash_completion/cargo"
    $HOME/.cargo/bin/rg --generate=complete-zsh > "$HOME/.zfunc/_rg"
    $HOME/.cargo/bin/rg --generate=complete-bash > "$bash_completion/rg"
}

export BUNOPTS="--no-interactive --silent"

# Execute functions
cargo install --all-features ripgrep &&
cargo install typos-cli &&
set_completions &&
uv_install &&
bun_install &&
sudo chsh -s /bin/zsh vscode

# Create a marker file to indicate zshrc needs to be sourced after creation
touch "$HOME/.source_zshrc"
# shellcheck disable=SC2016
echo '
if [ -f "$HOME/.source_zshrc" ]; then
    rm "$HOME/.source_zshrc"
    source "$HOME/.zshrc"
fi
' >> "$HOME/.zshrc"

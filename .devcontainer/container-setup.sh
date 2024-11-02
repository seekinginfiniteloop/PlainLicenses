#!/bin/bash

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
ripgrep \
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
libffi-dev \
rustup \
sqlite3 \
shellcheck \
sqlite-utils &&

export BUN_INSTALL="/home/vscode/.bun"
export BUNOPTS="--no-interactive --silent"
export UV_PYTHON_DOWNLOADS="automatic"
# sync and install tools
curl -LsSf https://astral.sh/uv/install.sh | sh &&
curl -fsSL https://bun.sh/install | bash &&
curl https://sh.rustup.rs -sSf | sh &&

. "$HOME"/.cargo/env &&
export PATH="$HOME/bin:$HOME/sbin:$HOME/.local/sbin:$HOME/.cargo/bin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:opt/local/sbin"
echo "This is the path: $PATH"

# Define the block of code as a variable
CONFIG_BLOCK=$(cat << 'EOF'
export BUN_INSTALL="/home/vscode/.bun"
alias rg="rg --no-ignore-vcs --stats --trim --color=always --colors \"match:fg:white\" --colors \"path:fg:blue\" --smart-case --search-zip"
alias rgf="rg --files"
alias rgp="rg --pretty"
alias rgc="rg --count"
alias ll="ls -alF"
alias node="bun run"
export PATH="$BUN_INSTALL/bin:$HOME/.cargo/bin:$HOME/bin:$HOME/sbin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:/opt/local/sbin"
export UV_PYTHON_DOWNLOADS="automatic"
export UV_COLOR="always"
source "/workspaces/PlainLicense/.venv/bin/activate"
EOF
)
ZCONFIG_BLOCK=$(cat << 'EOF'
fpath+=~/.zfunc
autoload -Uz compinit
zstyle ':completion:*' menu select
EOF
)
# Write the block of stuff to .zshrc and .bashrc
echo "$CONFIG_BLOCK" >> ~/.zshrc
echo "$CONFIG_BLOCK" >> ~/.bashrc
echo "$ZCONFIG_BLOCK" >> ~/.zshrc
source ~/.bashrc
bash_completion=~/.local/share/bash-completion/completions
mkdir -p $bash_completion
mkdir -p ~/.zfunc
"$HOME/.rustup/bin/rustup completions" zsh > ~/.zfunc/_rustup
"$HOME/.rustup/bin/rustup completions" bash > $bash_completion/rustup
"$HOME/.cargo/bin/rustup completions" cargo zsh > ~/.zfunc/_cargo
"$HOME/.cargo/bin/rustup completions" cargo bash > $bash_completion/cargo
/usr/bin/rg --generate zsh >> ~/.zfunc/_rg
/usr/bin/rg --generate bash >> $bash_completion/_rg

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
    $uvloc generate-shell-completion bash > $bash_completion/uv
}

function bun_install() {
    local bunloc=/home/vscode/.bun/bin/bun
    $bunloc install "${BUNOPTS}" &&
    $bunloc install -g "${BUNOPTS}" '@linthtml/linthtml'
    $bunloc install -g "${BUNOPTS}" 'stylelint'
    $bunloc install -g "${BUNOPTS}" 'eslint'
    $bunloc install -g "${BUNOPTS}" 'prettier'
    $bunloc install -g "${BUNOPTS}" 'semantic-release-cli'
    $bunloc install -g "${BUNOPTS}" 'markdownlint-cli2'
    $bunloc install -g "${BUNOPTS}" 'commitizen'
    $bunloc install -g "${BUNOPTS}" 'commitlint'
}

export BUNOPTS="--no-interactive --silent"

# Execute functions
cargo install typos-cli &&
uv_install &&
bun_install &&
sudo chsh -s /bin/zsh vscode
# Source .zshrc to apply changes
/bin/zsh -c "source ~/.zshrc"

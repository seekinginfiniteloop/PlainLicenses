#!/bin/bash

# Update and install packages
cd /workspaces/PlainLicense || return
sudo apt update &&
sudo apt upgrade &&
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
sqlite3 \
sqlite-utils &&

export BUN_INSTALL="/home/vscode/.bun"
export BUNOPTS="--no-interactive --silent"
export UV_PYTHON_DOWNLOADS="automatic"
# sync and install tools
curl -fsSL https://fnm.vercel.app/install | bash &&
curl -LsSf https://astral.sh/uv/install.sh | sh &&
curl -fsSL https://bun.sh/install | bash &&

export PATH="$HOME/bin:$HOME/sbin:$HOME/.local/sbin:$HOME/.local/share/fnm/fnm:$HOME/.cargo/bin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:opt/local/sbin"
echo "This is the path: $PATH"

# Define the block of code as a variable
CONFIG_BLOCK=$(cat << 'EOF'
export BUN_INSTALL="/home/vscode/.bun"
alias rg="rg --no-ignore-vcs --stats --trim --color=always --colors \"match:fg:white\" --colors \"path:fg:blue\" --smart-case --search-zip"
alias rgf="rg --files"
alias rgp="rg --pretty"
alias rgc="rg --count"
alias ll="ls -alF"
export PATH="$BUN_INSTALL/bin:$HOME/bin:$HOME/sbin:$HOME/.local/share/fnm:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:/opt/local/sbin"
export UV_PYTHON_DOWNLOADS="automatic"
export UV_COLOR="always"
source "/workspaces/PlainLicense/.venv/bin/activate"
EOF
)
ZCONFIG_BLOCK=$(cat << 'EOF'
eval "$(/home/vscode/.local/share/fnm/fnm env --use-on-cd --shell zsh)"
eval "$(fnm env)"
fpath+=~/.zfunc
autoload -Uz compinit
zstyle ':completion:*' menu select
EOF
)
BASH_CONFIG_BLOCK=$(cat << 'EOF'
eval "$(/home/vscode/.local/share/fnm/fnm env --use-on-cd --shell bash)"
eval "$(fnm env)"
EOF
)
# Write the block of code to .zshrc and .bashrc
echo "$CONFIG_BLOCK" >> ~/.zshrc
echo "$CONFIG_BLOCK" >> ~/.bashrc
echo "$ZCONFIG_BLOCK" >> ~/.zshrc
echo "$BASH_CONFIG_BLOCK" >> ~/.bashrc
source ~/.bashrc
mkdir -p ~/.bash_completion.d
/usr/bin/rg --generate zsh >> ~/.zfunc/_rg
/usr/bin/rg --generate bash >> ~/.bash_completion.d/_rg
# Install global npm packages

function fnm_install() {
    local fnmloc=/home/vscode/.local/share/fnm/fnm
    $fnmloc install --lts &&
    $fnmloc use lts-latest &&
    mkdir -p ~/.zfunc
    $fnmloc completions --shell zsh >> ~/.zfunc/_fnm
    $fnmloc completions --shell bash >> ~/.bash_completion.d/_fnm
    echo "/home/vscode/.local/share/fnm/fnm use lts-latest" >> ~/.zshrc
    echo "/home/vscode/.local/share/fnm/fnm use lts-latest" >> ~/.bashrc
}

function uv_install() {
    export UV_PYTHON_DOWNLOADS="automatic"
    local uvloc=/home/vscode/.cargo/bin/uv
    $uvloc python install 3.13 &&
    $uvloc venv --allow-existing .venv &&
    $uvloc tool install ipython -q &&
    $uvloc tool install ruff -q &&
    source /workspaces/PlainLicense/.venv/bin/activate &&
    $uvloc sync --all-extras
    $uvloc generate-shell-completion zsh > ~/.zfunc/_uv
    $uvloc generate-shell-completion bash > ~/.bash_completion.d/_uv
}

function bun_install() {
    local bunloc=/home/vscode/.bun/bin/bun
    $bunloc install "${BUNOPTS}" &&
    $bunloc install -g "${BUNOPTS}" '@linthtml/linthtml'
    $bunloc install -g "${BUNOPTS}" 'stylelint'
    $bunloc install -g "${BUNOPTS}" 'eslint'
    $bunloc install -g "${BUNOPTS}" 'prettier'
    $bunloc install -g "${BUNOPTS}" 'semantic-release-cli'

}
export BUNOPTS="--no-interactive --silent"

FNM_PATH="/home/vscode/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "$(fnm env)"
fi

# Execute functions
fnm_install &&
uv_install &&
bun_install &&
sudo chsh -s /bin/zsh vscode
# Source .zshrc to apply changes
/bin/zsh -c "source ~/.zshrc"

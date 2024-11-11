
# Path to your Oh My Zsh installation.
export ZSH=$HOME/.oh-my-zsh
zstyle ':omz:update' mode auto      # update automatically without asking
zstyle ':omz:update' frequency 7
GPG_TTY=$(tty)
export GPG_TTY
gpg-agent --daemon --enable-ssh-support > /dev/null 2>&1 &
gpg-connect-agent updatestartuptty /bye > /dev/null 2>&1 &
HIST_STAMPS="mm/dd/yyyy"
zstyle :omz:plugins:ssh-agent quiet yes
zstyle :omz:plugins:ssh-agent lazy yes
source "$ZSH/oh-my-zsh.sh"

# shellcheck disable=SC2034
DISABLE_AUTO_UPDATE=true
DISABLE_UPDATE_PROMPT=true
ZSH_THEME="powerlevel10k/powerlevel10k"
# shellcheck disable=SC2296
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
# shellcheck disable=SC2296
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

export bash_completion="$HOME/.local/share/bash-completion/completions"
export BUN_INSTALL="/home/vscode/.bun"
export RUSTUP_TERM_COLOR=always
export RUSTUP_TOOLCHAIN=stable-x86_64-unknown-linux-gnu
alias rgg='rg --no-ignore --trim --pretty --colors "match:fg:white" --colors "path:fg:blue" --smart-case --search-zip --hidden'
alias rgf='rg --files | rgg'
alias rgc='rgg --count'
alias ll='ls -alFh'
alias llr='ls -alFhR'
alias lld='ls -alFhd'
alias lldr='ls -alFhdR'
alias locate='lolcate'
alias updatedb="lolcate --update > /dev/null 2>&1 &"
export PATH="$BUN_INSTALL/bin:$HOME/.cargo/bin:$HOME/bin:$HOME/sbin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:/opt/local/sbin"
export UV_PYTHON_DOWNLOADS="automatic"
export UV_CACHE_DIR="/workspaces/PlainLicense/.cache/uv"
export UV_COLOR="always"
export UV_PYTHON="cpython-3.13.0-linux-x86_64-gnu"
export UV_PYTHON_PREFERENCE="managed"
export UV_COMPILE_BYTECODE="true"
export PYVENV="/workspaces/PlainLicense/.venv/bin/activate"
export FORCE_COLOR=1
export CLICOLOR_FORCE=1
export FILEHANDLER_ENABLED="true"
export LOG_PATH="$HOME/logs"
SIGNING_KEY="$(ssh-add -L)"
export SIGNING_KEY
updatedb
source "$HOME/.oh-my-zsh/oh-my-zsh.sh"
fpath+=$HOME/.zfunc
setopt extended_glob
autoload -Uz compinit
zstyle ':completion:*' menu select
# shellcheck disable=SC2034
plugins=(bun git gitfast git-prompt gpg-agent ssh-agent pre-commit zsh-interactive-cd rust)

if [ -f "$HOME/.source_zshrc" ]; then
    rm "$HOME/.source_zshrc"
    source "$HOME/.zshrc"
fi

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source "$HOME/.p10k.zsh"

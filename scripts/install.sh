#!/usr/bin/env bash
set -euo pipefail

REPO="toastdriven/taskdb"
BIN_NAME="taskdb"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

artifact="${BIN_NAME}-${os}-${arch}"

latest_tag="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | head -n1 | sed -E 's/.*"([^"]+)".*/\1/')"
url="https://github.com/${REPO}/releases/download/${latest_tag}/${artifact}"

echo "Installing ${BIN_NAME} ${latest_tag} (${os}/${arch})"

tmp_bin="$(mktemp)"
trap 'rm -f "$tmp_bin"' EXIT

curl -fsSL "$url" -o "$tmp_bin"
chmod +x "$tmp_bin"

if [ ! -w "$INSTALL_DIR" ]; then
  echo "Installing with sudo to ${INSTALL_DIR}"
  sudo install -m 0755 "$tmp_bin" "${INSTALL_DIR}/${BIN_NAME}"
else
  install -m 0755 "$tmp_bin" "${INSTALL_DIR}/${BIN_NAME}"
fi

echo "Installed ${BIN_NAME} to ${INSTALL_DIR}/${BIN_NAME}"

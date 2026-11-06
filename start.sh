#!/usr/bin/env bash

# Muda para o diretório do script
cd "$(dirname "$0")"

echo "🍃 Iniciando o Sereno (Transmutador Acústico Relaxante)..."

if command -v python3 &>/dev/null; then
    python3 server.py
elif command -v node &>/dev/null; then
    npx -y serve . -l 3000
else
    echo "Abra index.html diretamente no seu navegador Chrome, Edge ou Safari."
    open index.html 2>/dev/null || xdg-open index.html 2>/dev/null
fi

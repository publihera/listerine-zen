#!/usr/bin/env python3
"""
Servidor local simples para o Sereno.
Garante o contexto seguro (http://localhost) exigido pelos navegadores para acesso ao microfone.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Silenciar logs verbosos de requisição para manter o terminal limpo
        pass

def find_available_port(start_port=3000, max_attempts=20):
    import socket
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                return port
            except OSError:
                continue
    return start_port

def run():
    os.chdir(DIRECTORY)
    port = find_available_port(PORT)
    url = f"http://localhost:{port}"

    print("=" * 60)
    print("🌿 SERENO • Transmutador de Som Ambiente em Música Suave")
    print("=" * 60)
    print(f"➜ Servidor ativo em: {url}")
    print("➜ Abrindo seu navegador automaticamente...")
    print("➜ Pressione Ctrl + C para encerrar o aplicativo.")
    print("=" * 60)

    # Abrir navegador após breve intervalo
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Abra manualmente no navegador: {url}")

    with socketserver.TCPServer(("localhost", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nEncerrando o Sereno. Fique em paz! 🍃")
            httpd.server_close()
            sys.exit(0)

if __name__ == "__main__":
    run()

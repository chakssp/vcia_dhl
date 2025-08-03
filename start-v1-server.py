#!/usr/bin/env python3
"""
Servidor HTTP simples para rodar o V1 sem redirecionamentos
"""
import http.server
import socketserver
import os

PORT = 8001
DIRECTORY = "."

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Adiciona headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

print(f"🚀 Iniciando servidor V1 em http://localhost:{PORT}")
print("📁 Servindo arquivos do diretório atual")
print("🔗 Acesse: http://localhost:8001/index.html")
print("\nPressione Ctrl+C para parar o servidor\n")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✋ Servidor parado")
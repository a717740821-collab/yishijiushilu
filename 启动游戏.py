"""
异世救世录 - 本地游戏服务器
用法：双击运行，然后打开浏览器访问 http://localhost:8080
关闭此窗口即可停止服务器
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

# 切换到脚本所在目录（游戏根目录）
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 允许跨域 + 音频/视频本地播放
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # 不刷屏

print(f"========================================")
print(f"  异世救世录 - 本地服务器已启动")
print(f"  浏览器访问: http://localhost:{PORT}")
print(f"  关闭此窗口停止服务器")
print(f"========================================")

try:
    with socketserver.TCPServer(("", PORT), GameHandler) as httpd:
        webbrowser.open(f"http://localhost:{PORT}/index.html")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n服务器已停止")
except OSError:
    print(f"端口 {PORT} 被占用，尝试 {PORT + 1}...")
    PORT += 1
    with socketserver.TCPServer(("", PORT), GameHandler) as httpd:
        webbrowser.open(f"http://localhost:{PORT}/index.html")
        httpd.serve_forever()

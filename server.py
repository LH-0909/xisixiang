# 习思想题库 - 本地HTTP服务器
# 启动方式: python server.py
# 浏览器访问: http://localhost:8080

import http.server
import socketserver
import webbrowser
import sys

PORT = 8080

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.js': 'application/javascript',
    '.css': 'text/css',
})

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"✅ 习思想题库已启动")
        print(f"   访问地址: {url}")
        print(f"   按 Ctrl+C 停止服务器")
        # Auto-open browser
        try:
            webbrowser.open(url)
        except:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n⏹ 服务器已停止")
            sys.exit(0)

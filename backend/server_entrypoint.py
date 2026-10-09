import os
import sys
import mimetypes

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from urllib.parse import urlparse, unquote
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# Ensure repository root is on Python sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.api_router import handle_api_request, send_cors_headers

DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
PORT = int(os.environ.get("PORT", 5000))

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
}

class TransitServerRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_OPTIONS(self):
        if self.path.startswith("/api"):
            handle_api_request(self, self.path, "OPTIONS")
        else:
            self.send_response(204)
            send_cors_headers(self)
            self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api"):
            handle_api_request(self, self.path, "GET")
            return
        self.serve_static_asset()

    def do_HEAD(self):
        if self.path.startswith("/api"):
            handle_api_request(self, self.path, "HEAD")
            return
        self.serve_static_asset(head_only=True)

    def do_POST(self):
        if self.path.startswith("/api"):
            handle_api_request(self, self.path, "POST")
            return
        self.send_error(404, "Not Found")

    def do_PUT(self):
        if self.path.startswith("/api"):
            handle_api_request(self, self.path, "PUT")
            return
        self.send_error(404, "Not Found")

    def do_DELETE(self):
        if self.path.startswith("/api"):
            handle_api_request(self, self.path, "DELETE")
            return
        self.send_error(404, "Not Found")

    def serve_static_asset(self, head_only: bool = False):
        try:
            parsed = urlparse(self.path)
            clean_path = unquote(parsed.path)
            if clean_path == "/" or not clean_path:
                clean_path = "/index.html"

            # Remove leading slash for safe join
            relative_path = clean_path.lstrip("/")
            file_path = os.path.abspath(os.path.join(DIST_DIR, relative_path))

            # Security: ensure requested path is inside DIST_DIR
            if not file_path.startswith(DIST_DIR):
                self.send_error(403, "Access Denied")
                return

            if os.path.exists(file_path) and os.path.isfile(file_path):
                ext = os.path.splitext(file_path)[1].lower()
                content_type = MIME_TYPES.get(ext, mimetypes.guess_type(file_path)[0] or "application/octet-stream")
                
                with open(file_path, "rb") as f:
                    content = f.read()

                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-cache" if ext == ".html" else "public, max-age=31536000")
                send_cors_headers(self)
                self.end_headers()
                if not head_only:
                    self.wfile.write(content)
                return

            # Single Page Application (SPA) Fallback to index.html
            index_path = os.path.join(DIST_DIR, "index.html")
            if os.path.exists(index_path):
                with open(index_path, "rb") as f:
                    content = f.read()

                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-cache")
                send_cors_headers(self)
                self.end_headers()
                if not head_only:
                    self.wfile.write(content)
                return

            self.send_error(404, f"File not found: {clean_path}")
        except Exception as e:
            self.send_error(500, f"Static File Serving Error: {str(e)}")

    def log_message(self, format, *args):
        # Suppress verbose standard output logging for quiet operation
        return

def run_server():
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadingHTTPServer(server_address, TransitServerRequestHandler)
    print("\n======================================================")
    print("🚀 DCE Unified Full-Stack Bus Transit Server (Python 3)")
    print(f"🌐 Unified URL:         http://localhost:{PORT}")
    print("💻 Frontend Client:     Active (Serving / and SPA routes)")
    print("📡 Backend API:         Active (Serving /api/*)")
    print(f"🛡️  Admin Console:       http://localhost:{PORT}/#admin")
    print(f"🔄 Fleet Sync:          GET http://localhost:{PORT}/api/sync")
    print("======================================================\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping DCE Transit Server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()

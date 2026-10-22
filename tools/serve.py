"""Local dev server with caching switched off, so every reload picks up edits.
Run from the project folder:  python3 tools/serve.py  (then open http://127.0.0.1:8014)"""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()
    def log_message(self, fmt, *args):
        try:
            super().log_message(fmt, *args)
        except Exception:
            pass

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8014
http.server.ThreadingHTTPServer.allow_reuse_address = True
http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()

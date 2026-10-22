"""A stand-in for GitHub Pages, to test the published copy before it is pushed.

  python3 tools/serve_publish.py 8015     then open http://localhost:8015/lintel/

Three things the dev server (tools/serve.py) lets through and GitHub Pages does not:
  - it serves publish/ and nothing above it, so the page sits on a sub-path (/lintel/)
    and a path that climbs out of its folder is a 404, as it will be online
  - a path in the wrong case is a 404 (macOS would find the file anyway)
  - every request is written to publish/requests.log with its status, to read afterwards

It also answers byte ranges, which Safari needs before it plays a video."""
import http.server, os, sys, urllib.parse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "publish")
LOG = os.path.join(ROOT, "requests.log")


def exact(rel):
    at = ROOT
    for part in [p for p in rel.split("/") if p]:
        if not os.path.isdir(at) or part not in os.listdir(at):
            return False
        at = os.path.join(at, part)
    return True


class Pages(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def note(self, status):
        with open(LOG, "a") as f:
            f.write(f"{status} {self.path}\n")

    def do_GET(self):
        rel = urllib.parse.unquote(self.path.split("?")[0].split("#")[0])
        if ".." in rel or not exact(rel) or rel.startswith("/requests.log"):
            self.note(404)
            self.send_error(404)
            return
        path = os.path.join(ROOT, rel.lstrip("/"))
        rng = self.headers.get("Range")
        if rng and os.path.isfile(path) and rng.startswith("bytes="):
            size = os.path.getsize(path)
            a, _, b = rng[6:].partition("-")
            start = int(a) if a else max(0, size - int(b))
            end = min(int(b), size - 1) if a and b else size - 1
            self.note(206)
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            with open(path, "rb") as f:
                f.seek(start)
                try:
                    self.wfile.write(f.read(end - start + 1))
                except (BrokenPipeError, ConnectionResetError):
                    pass
            return
        self.note(200)
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()


os.chdir(ROOT)
open(LOG, "w").close()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8015
http.server.ThreadingHTTPServer(("127.0.0.1", port), Pages).serve_forever()

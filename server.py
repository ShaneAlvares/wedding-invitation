#!/usr/bin/env python3
"""Serve the invitation and collect RSVPs into data/rsvps.json.

Run from this folder:
    python3 server.py

Then open the printed address. Guests use the home page. Hosts open /admin.html.
Change ADMIN_PASSCODE here and adminPasscode in js/wedding.js together.
"""

import json
import os
import re
import secrets
import socket
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data", "rsvps.json")
ADMIN_PASSCODE = "rosewood"
UUID_PATH = re.compile(r"^/api/rsvps/([0-9a-fA-F-]{36})$")

try:
    from threading import Lock
except ImportError:  # pragma: no cover
    Lock = None

WRITE_LOCK = Lock()


def clean_text(value, limit):
    if value is None:
        return ""
    text = str(value).replace("\x00", "").strip()
    return text[:limit]


def load_items():
    if not os.path.exists(DATA):
        return []
    try:
        with open(DATA, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, list):
            return data
    except (OSError, json.JSONDecodeError):
        return []
    return []


def save_items(items):
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    temporary = DATA + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(items, handle, indent=2)
        handle.write("\n")
    os.replace(temporary, DATA)


def build_fields(body):
    if not isinstance(body, dict):
        raise ValueError("Please send your reply again.")

    attending = bool(body.get("attending"))
    name = clean_text(body.get("name"), 80)
    if len(name) < 2:
        raise ValueError("Please enter your full name.")

    email = clean_text(body.get("email"), 120)
    if email and ("@" not in email or "." not in email.split("@")[-1]):
        raise ValueError("Please check the email address.")

    try:
        party = int(body.get("partySize") or 1)
    except (TypeError, ValueError):
        party = 1
    party = 2 if party >= 2 else 1

    companion = clean_text(body.get("companion"), 80)
    course_id = clean_text(body.get("courseId"), 40)
    course_name = clean_text(body.get("courseName"), 80)
    diets = body.get("dietary") or []
    if not isinstance(diets, list):
        diets = []
    dietary = [clean_text(item, 40) for item in diets]
    dietary = [item for item in dietary if item][:8]
    song = clean_text(body.get("song"), 140)
    note = clean_text(body.get("note"), 600)
    transport = bool(body.get("transport"))

    if not attending:
        party = 0
        companion = ""
        course_id = ""
        course_name = ""
        dietary = []
        song = ""
        transport = False
    elif party == 2 and len(companion) < 2:
        raise ValueError("Please add your guest's name.")

    return {
        "name": name,
        "email": email,
        "attending": attending,
        "partySize": party,
        "companion": companion,
        "courseId": course_id,
        "courseName": course_name,
        "dietary": dietary,
        "transport": transport,
        "song": song,
        "note": note,
    }


def public_view(item):
    hidden = {"token"}
    return {key: value for key, value in item.items() if key not in hidden}


def upsert(body):
    fields = build_fields(body)
    now = datetime.now(timezone.utc).isoformat()
    incoming_id = clean_text(body.get("id"), 40)
    incoming_token = clean_text(body.get("token"), 80)

    with WRITE_LOCK:
        items = load_items()
        if incoming_id and incoming_token:
            for item in items:
                token = item.get("token") or ""
                if (
                    item.get("id") == incoming_id
                    and token
                    and len(token) == len(incoming_token)
                    and secrets.compare_digest(token, incoming_token)
                ):
                    item.update(fields)
                    item["updatedAt"] = now
                    save_items(items)
                    return item

        record = {
            "id": str(uuid.uuid4()),
            "token": secrets.token_urlsafe(18),
            "createdAt": now,
        }
        record.update(fields)
        items.append(record)
        save_items(items)
        return record


def delete_item(item_id):
    with WRITE_LOCK:
        items = load_items()
        remaining = [item for item in items if item.get("id") != item_id]
        if len(remaining) == len(items):
            return False
        save_items(remaining)
        return True


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        if str(args[0]).startswith("GET /api") or str(args[0]).startswith("POST /api") or str(args[0]).startswith("DELETE /api"):
            super().log_message(fmt, *args)

    def _json(self, status, payload):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _authorized(self):
        provided = self.headers.get("X-Admin-Code", "")
        if len(provided) != len(ADMIN_PASSCODE):
            return False
        return secrets.compare_digest(provided, ADMIN_PASSCODE)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 20000:
            raise ValueError("Please send your reply again.")
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("Please send your reply again.")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self._json(200, {"ok": True})
            return
        if path == "/api/rsvps":
            if not self._authorized():
                self._json(401, {"error": "Unauthorized"})
                return
            self._json(200, [public_view(item) for item in load_items()])
            return
        if path.startswith("/data") or path.startswith("/api"):
            self._json(404, {"error": "Not found"})
            return

        relative = path.lstrip("/")
        full = os.path.realpath(os.path.join(ROOT, relative))
        if os.path.commonpath([full, ROOT]) != ROOT:
            self.send_error(403)
            return
        if os.path.isdir(full) and path not in ("/", ""):
            index = os.path.join(full, "index.html")
            if not os.path.exists(index):
                self.send_error(404)
                return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/rsvps":
            self._json(404, {"error": "Not found"})
            return
        try:
            body = self._read_json()
            record = upsert(body)
        except ValueError as error:
            self._json(400, {"error": str(error)})
            return
        self._json(200, record)

    def do_DELETE(self):
        match = UUID_PATH.match(urlparse(self.path).path)
        if not match:
            self._json(404, {"error": "Not found"})
            return
        if not self._authorized():
            self._json(401, {"error": "Unauthorized"})
            return
        delete_item(match.group(1))
        self._json(200, {"ok": True})


def lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return None
    finally:
        sock.close()


def main():
    ports = (8080, 8081, 8765)
    server = None
    port = None
    for candidate in ports:
        try:
            server = ThreadingHTTPServer(("0.0.0.0", candidate), Handler)
            port = candidate
            break
        except OSError:
            continue
    if server is None:
        raise SystemExit("Could not open a port. Close the other invitation server and try again.")

    local = "http://127.0.0.1:%s" % port
    print("Invitation:  %s" % local)
    print("RSVP:        %s/rsvp.html" % local)
    print("Registry:    %s/admin.html" % local)
    print("Passcode:    %s" % ADMIN_PASSCODE)
    address = lan_ip()
    if address and address != "127.0.0.1":
        print("Same Wi-Fi:  http://%s:%s" % (address, port))
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()

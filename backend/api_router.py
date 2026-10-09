import json
import time
import queue
from urllib.parse import urlparse, parse_qs

from .security.session_manager import verify_token
from .authentication.admin_auth_controller import handle_admin_login
from .authentication.staff_auth_controller import handle_staff_login
from .staff.staff_profile_controller import handle_get_staff_profile
from .staff.staff_telemetry_controller import handle_update_bus_status
from .staff.staff_issues_controller import handle_create_issue, handle_get_staff_issues
from .admin.admin_issues_controller import handle_get_admin_issues, handle_update_issue
from .staff.staff_management_controller import (
    handle_get_staff,
    handle_create_staff,
    handle_update_staff,
)
from .bus_tracking.buses_controller import (
    handle_get_buses,
    handle_create_bus,
    handle_update_bus,
    handle_delete_bus,
)
from .routes.routes_controller import (
    handle_get_routes,
    handle_create_route,
    handle_update_route,
)
from .routes.stops_controller import (
    handle_get_stops,
    handle_create_stop,
    handle_update_stop,
    handle_delete_stop,
)
from .notifications.announcements_controller import (
    handle_get_announcements,
    handle_create_announcement,
    handle_update_announcement,
    handle_delete_announcement,
)
from .admin.admin_activity_logger import handle_get_activity_logs
from .sync.sync_controller import handle_sync
from .bus_tracking.live_telemetry_engine import (
    process_live_telemetry,
    get_all_live_buses,
    get_notification_history,
    add_sse_client,
    remove_sse_client,
)

def send_cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

def handle_api_request(handler, path_str: str, method: str) -> bool:
    """Dispatches incoming HTTP API requests to the appropriate modular controller."""
    parsed_url = urlparse(path_str)
    pathname = parsed_url.path
    query_params = parse_qs(parsed_url.query)

    if not pathname.startswith("/api"):
        return False

    # Handle OPTIONS preflight
    if method == "OPTIONS":
        handler.send_response(204)
        send_cors_headers(handler)
        handler.end_headers()
        return True

    # Helper response functions
    def json_response(data, status: int = 200) -> bool:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json; charset=utf-8")
        handler.send_header("Content-Length", str(len(payload)))
        send_cors_headers(handler)
        handler.end_headers()
        handler.wfile.write(payload)
        return True

    def error_response(message: str, status: int = 400) -> bool:
        payload = json.dumps({"error": message, "success": False}, ensure_ascii=False).encode("utf-8")
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json; charset=utf-8")
        handler.send_header("Content-Length", str(len(payload)))
        send_cors_headers(handler)
        handler.end_headers()
        handler.wfile.write(payload)
        return True

    helpers = {"json": json_response, "error": error_response}

    # Parse JSON Body
    body = {}
    if method in ("POST", "PUT"):
        content_length_str = handler.headers.get("Content-Length", "0")
        try:
            content_length = int(content_length_str)
            if content_length > 0:
                raw_data = handler.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw_data) if raw_data else {}
        except Exception:
            body = {}

    auth_header = handler.headers.get("Authorization", "")
    current_user = verify_token(auth_header)

    # 1. ADMIN AUTHENTICATION
    if pathname == "/api/admin/login" and method == "POST":
        res = handle_admin_login(body)
        if isinstance(res, tuple):
            return json_response(res[0], res[1])
        return json_response(res, 200 if res.get("success") else 400)

    # 2. BUS STAFF AUTHENTICATION
    if pathname == "/api/staff/login" and method == "POST":
        res = handle_staff_login(body)
        if isinstance(res, tuple):
            return json_response(res[0], res[1])
        return json_response(res, 200 if res.get("success") else 400)

    if pathname == "/api/staff/profile" and method == "GET":
        return handle_get_staff_profile(current_user, helpers)

    # 3. BUSES CRUD
    if pathname == "/api/buses" and method == "GET":
        return handle_get_buses(helpers)
    if pathname == "/api/buses" and method == "POST":
        return handle_create_bus(body, current_user, helpers)
    if pathname.startswith("/api/buses/") and method == "PUT":
        bus_id = pathname.replace("/api/buses/", "").strip()
        return handle_update_bus(bus_id, body, current_user, helpers)
    if pathname.startswith("/api/buses/") and method == "DELETE":
        bus_id = pathname.replace("/api/buses/", "").strip()
        return handle_delete_bus(bus_id, current_user, helpers)

    # 4. ROUTES & STOPS CRUD
    if pathname == "/api/routes" and method == "GET":
        return handle_get_routes(helpers)
    if pathname == "/api/routes" and method == "POST":
        return handle_create_route(body, current_user, helpers)
    if pathname.startswith("/api/routes/") and method == "PUT":
        route_id = pathname.replace("/api/routes/", "").strip()
        return handle_update_route(route_id, body, current_user, helpers)

    if pathname == "/api/stops" and method == "GET":
        return handle_get_stops(helpers)
    if pathname == "/api/stops" and method == "POST":
        return handle_create_stop(body, current_user, helpers)
    if pathname.startswith("/api/stops/") and method == "PUT":
        stop_id = pathname.replace("/api/stops/", "").strip()
        return handle_update_stop(stop_id, body, current_user, helpers)
    if pathname.startswith("/api/stops/") and method == "DELETE":
        stop_id = pathname.replace("/api/stops/", "").strip()
        return handle_delete_stop(stop_id, current_user, helpers)

    # 5. VOICE ANNOUNCEMENTS CRUD
    if pathname == "/api/announcements" and method == "GET":
        return handle_get_announcements(helpers)
    if pathname == "/api/announcements" and method == "POST":
        return handle_create_announcement(body, current_user, helpers)
    if pathname.startswith("/api/announcements/") and method == "PUT":
        ann_id = pathname.replace("/api/announcements/", "").strip()
        return handle_update_announcement(ann_id, body, current_user, helpers)
    if pathname.startswith("/api/announcements/") and method == "DELETE":
        ann_id = pathname.replace("/api/announcements/", "").strip()
        return handle_delete_announcement(ann_id, current_user, helpers)

    # 6. BUS STAFF TELEMETRY & STATUS UPDATE
    if pathname == "/api/staff/bus-status" and method in ("PUT", "POST"):
        return handle_update_bus_status(body, current_user, helpers)

    if (pathname in ("/api/staff/gps", "/api/driver/telemetry")) and method == "POST":
        try:
            result = process_live_telemetry(body)
            return json_response(result)
        except Exception as err:
            return error_response(str(err), 400)

    # 6.1. LIVE FLEET TELEMETRY & SSE STREAM
    if pathname == "/api/live/buses" and method == "GET":
        return json_response({
            "success": True,
            "buses": get_all_live_buses(),
            "timestamp": int(time.time() * 1000)
        })

    if pathname == "/api/live/history" and method == "GET":
        bus_filter = (query_params.get("busNumber") or query_params.get("busId") or [None])[0]
        return json_response({
            "success": True,
            "history": get_notification_history(bus_filter),
            "timestamp": int(time.time() * 1000)
        })

    if pathname == "/api/live/stream" and method == "GET":
        handler.send_response(200)
        handler.send_header("Content-Type", "text/event-stream; charset=utf-8")
        handler.send_header("Cache-Control", "no-cache, no-transform")
        handler.send_header("Connection", "keep-alive")
        send_cors_headers(handler)
        handler.end_headers()

        # Send initial snapshot
        initial_data = {
            "type": "INIT_SNAPSHOT",
            "buses": get_all_live_buses(),
            "history": get_notification_history(),
            "timestamp": int(time.time() * 1000)
        }
        init_payload = f"data: {json.dumps(initial_data)}\n\n".encode("utf-8")
        handler.wfile.write(init_payload)
        handler.wfile.flush()

        client_queue = queue.Queue(maxsize=100)
        add_sse_client(client_queue)

        try:
            while True:
                try:
                    payload = client_queue.get(timeout=15.0)
                    chunk = f"data: {json.dumps(payload)}\n\n".encode("utf-8")
                    handler.wfile.write(chunk)
                    handler.wfile.flush()
                except queue.Empty:
                    # Keep-alive heartbeat ping
                    handler.wfile.write(b": heartbeat\n\n")
                    handler.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, Exception):
            pass
        finally:
            remove_sse_client(client_queue)

        return True

    # 7. ISSUE REPORTING (STAFF & ADMIN)
    if pathname == "/api/staff/issues" and method == "POST":
        return handle_create_issue(body, current_user, helpers)
    if pathname == "/api/staff/issues" and method == "GET":
        return handle_get_staff_issues(current_user, helpers)
    if pathname == "/api/admin/issues" and method == "GET":
        res = handle_get_admin_issues()
        return json_response(res)
    if pathname.startswith("/api/admin/issues/") and method == "PUT":
        issue_id = pathname.replace("/api/admin/issues/", "").strip()
        res = handle_update_issue(issue_id, body, current_user)
        if isinstance(res, tuple):
            return json_response(res[0], res[1])
        return json_response(res)

    # 8. STAFF MANAGEMENT (ADMIN)
    if pathname == "/api/staff" and method == "GET":
        return handle_get_staff(helpers)
    if pathname == "/api/staff" and method == "POST":
        return handle_create_staff(body, current_user, helpers)
    if pathname.startswith("/api/staff/") and method == "PUT":
        staff_id = pathname.replace("/api/staff/", "").strip()
        return handle_update_staff(staff_id, body, current_user, helpers)

    # 9. ACTIVITY LOGS (ADMIN AUDIT)
    if pathname == "/api/admin/activity-logs" and method == "GET":
        return json_response(handle_get_activity_logs())

    # 10. REAL-TIME / SYNC ENDPOINT
    if pathname == "/api/sync" and method == "GET":
        return handle_sync(helpers)

    return error_response(f"API endpoint not found: {method} {pathname}", 404)

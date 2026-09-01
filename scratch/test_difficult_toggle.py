import subprocess
import time
import json
import urllib.request
import os
import socket
import base64
import struct

BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
PORT = 9222
URL = "http://127.0.0.1:5000"

def ws_handshake(sock, host, port, path):
    key = base64.b64encode(os.urandom(16)).decode('utf-8')
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    sock.sendall(req.encode('utf-8'))
    resp = b""
    while b"\r\n\r\n" not in resp:
        chunk = sock.recv(1024)
        if not chunk:
            break
        resp += chunk

def ws_send(sock, msg_dict):
    data = json.dumps(msg_dict).encode('utf-8')
    length = len(data)
    frame = bytearray([0x81])
    if length <= 125:
        frame.append(0x80 | length)
    elif length <= 65535:
        frame.append(0x80 | 126)
        frame.extend(struct.pack("!H", length))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack("!Q", length))
    frame.extend(b"\x00\x00\x00\x00")
    frame.extend(data)
    sock.sendall(frame)

def ws_recv(sock):
    header = sock.recv(2)
    if not header:
        return None
    b1, b2 = header[0], header[1]
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack("!H", sock.recv(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", sock.recv(8))[0]
    payload = b""
    while len(payload) < length:
        payload += sock.recv(length - len(payload))
    return json.loads(payload.decode('utf-8'))

def run_difficult_test():
    server_proc = subprocess.Popen(["python", "run.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    time.sleep(2)

    profile_dir = os.path.join(os.environ["TEMP"], "brave_test_diff_" + str(int(time.time())))
    proc = subprocess.Popen([
        BRAVE_PATH,
        f"--remote-debugging-port={PORT}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={profile_dir}",
        "about:blank"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        time.sleep(2)
        resp = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")
        tabs = json.loads(resp.read().decode())
        page_tab = next(t for t in tabs if t.get("type") == "page")
        ws_url = page_tab["webSocketDebuggerUrl"]

        host_port, path = ws_url.replace("ws://", "").split("/", 1)
        host, port_str = host_port.split(":")
        s = socket.create_connection((host, int(port_str)))
        ws_handshake(s, host, int(port_str), "/" + path)

        msg_id = 1
        def send(method, params=None):
            nonlocal msg_id
            curr_id = msg_id
            msg_id += 1
            ws_send(s, {"id": curr_id, "method": method, "params": params or {}})
            while True:
                msg = ws_recv(s)
                if msg and msg.get("id") == curr_id:
                    return msg

        send("Page.enable")
        send("Runtime.enable")
        send("Page.navigate", {"url": URL})
        time.sleep(2.5)

        # 1. Click first subject (ADI)
        send("Runtime.evaluate", {
            "expression": "document.querySelectorAll('#cadeiras-grid .exam-list-row')[0].click();"
        })
        time.sleep(2)

        # 2. Click first exam (ADI Exam 1)
        send("Runtime.evaluate", {
            "expression": "document.querySelectorAll('#exams-grid .exam-card')[0].click();"
        })
        time.sleep(2)

        # 3. Check Subbar visibility and initial state
        subbar_init = send("Runtime.evaluate", {
            "expression": """
            (function() {
                const subbar = document.getElementById('exam-sub-bar');
                const btn = document.getElementById('btn-toggle-difficult');
                const typeText = document.getElementById('subbar-question-type-text')?.textContent;
                const statusText = document.getElementById('subbar-question-status-text')?.textContent;
                return JSON.stringify({
                    subbarDisplay: window.getComputedStyle(subbar).display,
                    btnText: btn.textContent.trim(),
                    isDifficult: btn.classList.contains('is-difficult'),
                    typeText,
                    statusText
                });
            })()
            """,
            "returnByValue": True
        })
        print("INITIAL SUB-BAR STATE:", subbar_init.get("result", {}).get("result", {}).get("value"))

        # 4. Click 'Marcar como Difícil'
        send("Runtime.evaluate", {
            "expression": "document.getElementById('btn-toggle-difficult').click();"
        })
        time.sleep(0.5)

        subbar_marked = send("Runtime.evaluate", {
            "expression": """
            (function() {
                const btn = document.getElementById('btn-toggle-difficult');
                const storage = localStorage.getItem('simulador_perguntas_dificeis');
                return JSON.stringify({
                    btnText: btn.textContent.trim(),
                    isDifficult: btn.classList.contains('is-difficult'),
                    storage
                });
            })()
            """,
            "returnByValue": True
        })
        print("AFTER MARKING DIFFICULT:", subbar_marked.get("result", {}).get("result", {}).get("value"))

        # 5. Go to Next question (Question 2)
        send("Runtime.evaluate", {
            "expression": "document.getElementById('btn-next').click();"
        })
        time.sleep(0.5)

        q2_state = send("Runtime.evaluate", {
            "expression": """
            (function() {
                const btn = document.getElementById('btn-toggle-difficult');
                return JSON.stringify({
                    btnText: btn.textContent.trim(),
                    isDifficult: btn.classList.contains('is-difficult')
                });
            })()
            """,
            "returnByValue": True
        })
        print("QUESTION 2 STATE (Should be unmarked):", q2_state.get("result", {}).get("result", {}).get("value"))

        # 6. Go back to Question 1
        send("Runtime.evaluate", {
            "expression": "document.getElementById('btn-prev').click();"
        })
        time.sleep(0.5)

        q1_restored = send("Runtime.evaluate", {
            "expression": """
            (function() {
                const btn = document.getElementById('btn-toggle-difficult');
                return JSON.stringify({
                    btnText: btn.textContent.trim(),
                    isDifficult: btn.classList.contains('is-difficult')
                });
            })()
            """,
            "returnByValue": True
        })
        print("RETURNED TO QUESTION 1 (Should be marked):", q1_restored.get("result", {}).get("result", {}).get("value"))

        s.close()
    finally:
        proc.terminate()
        server_proc.terminate()

if __name__ == '__main__':
    run_difficult_test()

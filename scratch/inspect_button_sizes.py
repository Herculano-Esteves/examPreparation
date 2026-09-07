"""
scratch/inspect_button_sizes.py
"""
import subprocess
import time
import json
import urllib.request
import os
import socket
import base64
import struct

brave_path = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
profile_dir = os.path.join(os.environ["TEMP"], "brave_btn_inspect_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--remote-debugging-port=9225",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    f"--user-data-dir={profile_dir}",
    "about:blank"
]

proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(2)

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
    mask = os.urandom(4)
    frame.extend(mask)
    masked_data = bytearray(data[i] ^ mask[i % 4] for i in range(length))
    frame.extend(masked_data)
    sock.sendall(frame)

def ws_recv(sock):
    head = sock.recv(2)
    if len(head) < 2:
        return None
    b1, b2 = head[0], head[1]
    masked = (b2 & 0x80) != 0
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack("!H", sock.recv(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", sock.recv(8))[0]
    mask = sock.recv(4) if masked else None
    payload = b""
    while len(payload) < length:
        chunk = sock.recv(length - len(payload))
        if not chunk:
            break
        payload += chunk
    if masked and mask:
        payload = bytearray(payload[i] ^ mask[i % 4] for i in range(len(payload)))
    return payload.decode('utf-8', errors='ignore')

try:
    with urllib.request.urlopen("http://localhost:9225/json") as resp:
        tabs = json.loads(resp.read().decode('utf-8'))
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    host_port = ws_url.replace("ws://", "").split("/")[0]
    host, port = host_port.split(":")
    path = "/" + "/".join(ws_url.replace("ws://", "").split("/")[1:])

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, int(port)))
    ws_handshake(s, host, int(port), path)

    req_id = 1
    def send_cdp(method, params=None):
        global req_id
        msg = {"id": req_id, "method": method, "params": params or {}}
        ws_send(s, msg)
        req_id += 1
        while True:
            raw = ws_recv(s)
            if not raw:
                break
            res = json.loads(raw)
            if res.get("id") == msg["id"]:
                return res

    send_cdp("Page.navigate", {"url": "http://127.0.0.1:5000"})
    time.sleep(2)

    # Dismiss initial language modal if present
    send_cdp("Runtime.evaluate", {
        "expression": """
        const btnPt = document.getElementById('btn-select-lang-pt');
        if (btnPt) btnPt.click();
        """
    })
    time.sleep(0.5)

    # 1. Select first cadeira
    send_cdp("Runtime.evaluate", {
        "expression": """
        document.querySelector('.exam-list-row').click();
        """
    })
    time.sleep(0.5)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const btnMenuBack = document.getElementById('btn-back-cadeiras');
            const rect = btnMenuBack.getBoundingClientRect();
            const computed = window.getComputedStyle(btnMenuBack);
            return {
                name: 'btn-back-cadeiras',
                width: rect.width,
                height: rect.height,
                padding: computed.padding,
                fontSize: computed.fontSize,
                display: computed.display,
                parentWidth: btnMenuBack.parentElement.getBoundingClientRect().width,
                parentDisplay: window.getComputedStyle(btnMenuBack.parentElement).display
            };
        })()
        """,
        "returnByValue": True
    })
    print("MENU BACK BUTTON:", res.get("result", {}).get("result", {}).get("value"))

    # 2. Go to Add Exame
    send_cdp("Runtime.evaluate", {
        "expression": """
        document.getElementById('btn-add-exame-top').click();
        """
    })
    time.sleep(0.5)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const btnCancel = document.getElementById('btn-cancel-exame');
            const rect = btnCancel.getBoundingClientRect();
            const computed = window.getComputedStyle(btnCancel);
            const parent = btnCancel.parentElement;
            const parentRect = parent.getBoundingClientRect();
            return {
                name: 'btn-cancel-exame',
                width: rect.width,
                height: rect.height,
                padding: computed.padding,
                fontSize: computed.fontSize,
                display: computed.display,
                parentWidth: parentRect.width,
                parentDisplay: window.getComputedStyle(parent).display
            };
        })()
        """,
        "returnByValue": True
    })
    print("CANCEL/BACK BUTTON IN ADD EXAME:", res.get("result", {}).get("result", {}).get("value"))

finally:
    proc.kill()

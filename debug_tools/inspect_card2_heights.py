"""
debug_tools/inspect_card2_heights.py
"""
import subprocess
import time
import json
import urllib.request
import os
import socket
import base64
import struct

server_proc = None
try:
    with urllib.request.urlopen("http://127.0.0.1:5000") as resp:
        pass
except Exception:
    server_proc = subprocess.Popen(["python", "run.py", "--port", "5000", "--host", "127.0.0.1"],
                                   cwd=r"c:\Users\Pedro\source\repos\examPreparation",
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

brave_path = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
profile_dir = os.path.join(os.environ["TEMP"], "brave_card2_inspect_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--window-size=1440,900",
    "--remote-debugging-port=9222",
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
        payload = bytes(payload[i] ^ mask[i % 4] for i in range(len(payload)))
    return payload.decode('utf-8', errors='ignore')

try:
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as resp:
        tabs = json.loads(resp.read().decode('utf-8'))
    
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    path = ws_url.replace("ws://127.0.0.1:9222", "")
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("127.0.0.1", 9222))
    ws_handshake(s, "127.0.0.1", 9222, path)
    s.settimeout(3.0)
    
    ws_send(s, {"id": 1, "method": "Runtime.enable"})
    ws_send(s, {"id": 2, "method": "Page.enable"})
    ws_send(s, {"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}})
    time.sleep(2)
    
    ws_send(s, {
        "id": 10,
        "method": "Runtime.evaluate",
        "params": {
            "expression": "document.querySelector('.btn-sticky-settings')?.click() || document.getElementById('btn-open-settings')?.click(); 'CLICKED'",
            "returnByValue": True
        }
    })
    time.sleep(1)
    
    ws_send(s, {
        "id": 20,
        "method": "Runtime.evaluate",
        "params": {
            "expression": """
            new Promise(resolve => {
                function getCard2Details() {
                    const cards = document.querySelectorAll('.settings-card');
                    const card2 = cards[1];
                    const header = card2?.querySelector('.settings-card-header');
                    const title = card2?.querySelector('.settings-section-title');
                    const desc = card2?.querySelector('.settings-description');
                    const danger = card2?.querySelector('.settings-danger-card');
                    return {
                        card2Top: card2?.getBoundingClientRect().top,
                        card2Height: card2?.getBoundingClientRect().height,
                        headerHeight: header?.getBoundingClientRect().height,
                        titleHeight: title?.getBoundingClientRect().height,
                        descHeight: desc?.getBoundingClientRect().height,
                        dangerTop: danger?.getBoundingClientRect().top,
                        dangerHeight: danger?.getBoundingClientRect().height
                    };
                }

                document.querySelector('.btn-lang-option[data-lang="pt"]')?.click();
                setTimeout(() => {
                    const pt = getCard2Details();
                    document.querySelector('.btn-lang-option[data-lang="en"]')?.click();
                    setTimeout(() => {
                        const en = getCard2Details();
                        resolve(JSON.stringify({ pt, en }));
                    }, 300);
                }, 300);
            })
            """,
            "awaitPromise": True,
            "returnByValue": True
        }
    })

    start = time.time()
    while time.time() - start < 8:
        try:
            msg = ws_recv(s)
            if msg:
                m = json.loads(msg)
                mid = m.get("id")
                if mid == 20:
                    val = m.get("result", {}).get("result", {}).get("value")
                    print("=== CARD 2 BREAKDOWN ===")
                    print(val)
        except socket.timeout:
            break
finally:
    try:
        proc.terminate()
    except Exception:
        pass
    if server_proc:
        try:
            server_proc.terminate()
        except Exception:
            pass

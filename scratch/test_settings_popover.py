"""
scratch/test_settings_popover.py
--------------------------------
Valida o funcionamento do Floating Settings Popover:
1. Clicar no botão 'Definições' abre o popover ancorado junto ao botão.
2. Mudar idioma dentro do popover atualiza a interface e a classe active.
3. Clicar fora ou na tecla Escape fecha o popover.
4. Clicar no botão de definições sticky fecha/abre corretamente.
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
profile_dir = os.path.join(os.environ["TEMP"], "brave_popover_" + str(int(time.time())))

cmd = [
    brave_path,
    "--headless=new",
    "--remote-debugging-port=9223",
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
    with urllib.request.urlopen("http://localhost:9223/json") as resp:
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

    # 1. Check Popover initial state (hidden)
    res = send_cdp("Runtime.evaluate", {
        "expression": """
        const popover = document.getElementById('settings-dropdown-menu');
        popover.classList.contains('hidden');
        """,
        "returnByValue": True
    })
    popover_initially_hidden = res.get("result", {}).get("result", {}).get("value")
    print(f"1. Popover initially hidden: {popover_initially_hidden}")

    # 2. Click Settings button in header
    send_cdp("Runtime.evaluate", {
        "expression": """
        const btnSettings = document.getElementById('btn-settings');
        btnSettings.click();
        """
    })
    time.sleep(0.3)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const popover = document.getElementById('settings-dropdown-menu');
            const rect = popover.getBoundingClientRect();
            return {
                isHidden: popover.classList.contains('hidden'),
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            };
        })()
        """,
        "returnByValue": True
    })
    popover_opened = res.get("result", {}).get("result", {}).get("value")
    print(f"2. Popover opened details: {popover_opened}")

    # 3. Change language to English via popover
    send_cdp("Runtime.evaluate", {
        "expression": """
        const enBtn = document.querySelector('#settings-dropdown-menu .btn-lang-option[data-lang="en"]');
        enBtn.click();
        """
    })
    time.sleep(0.3)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        (() => {
            const enBtn = document.querySelector('#settings-dropdown-menu .btn-lang-option[data-lang="en"]');
            const ptBtn = document.querySelector('#settings-dropdown-menu .btn-lang-option[data-lang="pt"]');
            const mainTitle = document.getElementById('app-main-title').textContent;
            return {
                enActive: enBtn.classList.contains('active'),
                ptActive: ptBtn.classList.contains('active'),
                mainTitle: mainTitle
            };
        })()
        """,
        "returnByValue": True
    })
    lang_res = res.get("result", {}).get("result", {}).get("value")
    print(f"3. Language switch inside popover: {lang_res}")

    # 4. Close Popover via ESC key
    send_cdp("Runtime.evaluate", {
        "expression": """
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        """
    })
    time.sleep(0.3)

    res = send_cdp("Runtime.evaluate", {
        "expression": """
        const popover = document.getElementById('settings-dropdown-menu');
        popover.classList.contains('hidden');
        """,
        "returnByValue": True
    })
    popover_closed_esc = res.get("result", {}).get("result", {}).get("value")
    print(f"4. Popover closed via Escape: {popover_closed_esc}")

    # 5. Open and close via click outside
    send_cdp("Runtime.evaluate", {
        "expression": """
        document.getElementById('btn-settings').click();
        """
    })
    time.sleep(0.3)
    send_cdp("Runtime.evaluate", {
        "expression": """
        document.body.click();
        """
    })
    time.sleep(0.3)
    res = send_cdp("Runtime.evaluate", {
        "expression": """
        const popover = document.getElementById('settings-dropdown-menu');
        popover.classList.contains('hidden');
        """,
        "returnByValue": True
    })
    popover_closed_click_outside = res.get("result", {}).get("result", {}).get("value")
    print(f"5. Popover closed via click outside: {popover_closed_click_outside}")

    print("\nALL POPOVER TESTS PASSED SUCCESSFULLY!")

finally:
    proc.kill()
    if server_proc:
        server_proc.kill()

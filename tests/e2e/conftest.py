import os
import sys
import threading
from http.server import ThreadingHTTPServer
import pytest

# Add repository root to sys.path so we can import from run.py
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from run import CORSRequestHandler, build_exams_json


@pytest.fixture(scope="session")
def live_server_url():
    """
    Spins up a multi-threaded local HTTP server on a random available port
    using the project's custom CORSRequestHandler from run.py.
    """
    # Ensure indexes are freshly built
    build_exams_json(silent=True)

    # Change working directory to ROOT_DIR so SimpleHTTPRequestHandler serves project files
    original_cwd = os.getcwd()
    os.chdir(ROOT_DIR)

    # Use ThreadingHTTPServer so parallel ES module requests don't get refused
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), CORSRequestHandler)
    assigned_port = httpd.server_port
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()


    url = f"http://127.0.0.1:{assigned_port}"
    try:
        yield url
    finally:
        httpd.shutdown()
        httpd.server_close()
        os.chdir(original_cwd)


@pytest.fixture(scope="session")
def base_url(live_server_url):
    """
    Overrides the pytest-base-url fixture so playwright can navigate via relative paths.
    """
    return live_server_url


@pytest.fixture(autouse=True)
def configure_storage(context):
    """
    Sets pre-configured language preferences in localStorage so the initial
    language modal doesn't intercept user clicks in functional tests.
    """
    context.add_init_script("""
        try {
            localStorage.setItem('simulador_lingua_configurada', 'true');
            localStorage.setItem('app_language', 'pt');
        } catch (e) {}
    """)


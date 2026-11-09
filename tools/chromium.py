"""Synchronize, build and test the pinned desktop Chromium source."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from threading import Thread

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path("out/Morrow")
BROWSER_PATHS = {
    "darwin": Path("Chromium.app/Contents/MacOS/Chromium"),
    "linux": Path("chrome"),
    "win32": Path("chrome.exe"),
}


def run(args, cwd, **kwargs):
    env = os.environ.copy()
    if sys.platform == "win32":
        env.setdefault("DEPOT_TOOLS_WIN_TOOLCHAIN", "0")
    executable = shutil.which(args[0])
    if executable is None:
        raise FileNotFoundError(f"{args[0]} is unavailable. Follow the platform setup in README.md.")
    return subprocess.run([executable, *args[1:]], cwd=cwd, env=env, check=True, text=True, **kwargs)


def git_output(source, *args):
    return run(["git", *args], source, stdout=subprocess.PIPE).stdout.strip()


def sync(checkout, pin):
    source = checkout / "src"
    source.mkdir(parents=True, exist_ok=True)
    if not (source / ".git").exists():
        if any(source.iterdir()):
            raise ValueError(f"{source} already exists and is not a Git checkout.")
        run(["git", "init"], source)
        run(["git", "remote", "add", "origin", pin["repository"]], source)

    if git_output(source, "config", "--get", "remote.origin.url") != pin["repository"]:
        raise ValueError(f"{source} has a different origin. Choose another --checkout directory.")
    if git_output(source, "status", "--porcelain", "--untracked-files=no"):
        raise ValueError(f"{source} has local edits. Preserve them before syncing.")

    version = pin["version"]
    run(["git", "fetch", "--no-tags", "--depth=1", "origin", f"refs/tags/{version}"], source)
    if git_output(source, "rev-parse", "FETCH_HEAD^{commit}") != pin["revision"]:
        raise ValueError(f"Chromium tag {version} does not match the pinned commit.")
    run(["git", "checkout", "--detach", pin["revision"]], source)

    solution = {
        "name": "src",
        "url": pin["repository"],
        "managed": False,
        "custom_vars": {"checkout_pgo_profiles": True},
    }
    (checkout / ".gclient").write_text(f"solutions = [{solution!r}]\n", encoding="utf-8")
    run(["gclient", "sync", "--no-history"], checkout)


def require_pin(source, pin):
    if not (source / ".git").exists():
        raise ValueError("Run the sync command first.")
    if git_output(source, "rev-parse", "HEAD") != pin["revision"]:
        raise ValueError("The checkout is on a different revision. Run sync first.")


def build(source, pin, installer):
    require_pin(source, pin)
    if installer and sys.platform != "win32":
        raise ValueError("The mini_installer target is available on Windows.")
    args = (ROOT / "build" / "args.gn").read_text(encoding="utf-8")
    (source / OUTPUT).mkdir(parents=True, exist_ok=True)
    (source / OUTPUT / "args.gn").write_text(args, encoding="utf-8")
    run(["gn", "gen", str(OUTPUT), "--fail-on-unused-args"], source)
    target = "mini_installer" if installer else "chrome"
    run(["autoninja", "-C", str(OUTPUT), target], source)


class TestPage(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/":
            self.send_error(404)
            return
        # The final text is produced by Blink executing JavaScript.
        content = b'<p id="result"></p><script>document.querySelector("p").textContent = 6 * 7;</script>'
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def smoke_test(browser):
    if not browser.is_file():
        raise ValueError(f"Browser binary missing at {browser}. Run the build command first.")

    with tempfile.TemporaryDirectory(prefix="morrow-smoke-") as profile:
        with ThreadingHTTPServer(("127.0.0.1", 0), TestPage) as server:
            thread = Thread(target=server.serve_forever)
            thread.start()
            try:
                result = run([
                    str(browser), "--headless", "--no-first-run", "--no-default-browser-check",
                    "--disable-background-networking", "--use-mock-keychain", "--dump-dom",
                    f"--user-data-dir={profile}", f"http://127.0.0.1:{server.server_port}/",
                ], browser.parent, timeout=60, stdout=subprocess.PIPE, encoding="utf-8")
            finally:
                server.shutdown()
                thread.join()

    if '<p id="result">42</p>' not in result.stdout:
        raise ValueError("Chromium did not render the page and execute JavaScript.")
    print("Chromium rendered the local test page and executed JavaScript.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkout", type=Path, default=ROOT / ".chromium")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("sync", help="Fetch the pinned source and its dependencies")
    build_command = subcommands.add_parser("build", help="Compile the desktop browser")
    build_command.add_argument("--installer", action="store_true", help="Build Windows mini_installer")
    subcommands.add_parser("test", help="Smoke-test the built browser")
    args = parser.parse_args()
    if sys.platform not in BROWSER_PATHS:
        parser.error(f"Unsupported desktop platform: {sys.platform}")

    checkout = args.checkout.resolve()
    pin = json.loads((ROOT / "chromium.json").read_text(encoding="utf-8"))
    source = checkout / "src"
    try:
        if args.command == "sync":
            sync(checkout, pin)
        elif args.command == "build":
            build(source, pin, args.installer)
        else:
            require_pin(source, pin)
            smoke_test(source / OUTPUT / BROWSER_PATHS[sys.platform])
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()

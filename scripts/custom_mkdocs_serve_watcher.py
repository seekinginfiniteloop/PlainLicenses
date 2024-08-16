import time
import subprocess
import os
import signal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pathlib import Path
import fnmatch
import psutil

WAIT_TIME = 7 # seconds -- time to wait before restarting the server

class MyHandler(FileSystemEventHandler):
    def __init__(self, excluded_patterns, server_process):
        self.last_modified = time.time()
        self.excluded_patterns = excluded_patterns
        self.server_process = server_process

    def on_modified(self, event):
        if time.time() - self.last_modified > WAIT_TIME:
            path = Path(event.src_path).resolve()
            if any(
                fnmatch.fnmatch(str(path), pattern)
                for pattern in self.excluded_patterns
            ):
                return
            self.last_modified = time.time()
            print(f"Rebuilding due to change in {event.src_path}")
            self.restart_server()

    def restart_server(self) -> None:
        print("Stopping MkDocs server...")
        parent = psutil.Process(self.server_process.pid)
        for child in parent.children(recursive=True):
            child.terminate()
        parent.terminate()
        parent.wait()
        print("Starting MkDocs server...")
        self.server_process = subprocess.Popen(["mkdocs", "serve", "--no-livereload"])


def watch_directories(paths, excluded_patterns) -> None:
    print("Starting MkDocs server...")
    server_process = subprocess.Popen(["mkdocs", "serve", "--no-livereload"])

    event_handler = MyHandler(excluded_patterns, server_process)
    observer = Observer()

    for path in paths:
        observer.schedule(event_handler, path, recursive=True)

    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping MkDocs server...")
        observer.stop()
        server_process.terminate()
        server_process.wait()
    observer.join()

if __name__ == "__main__":
    watch_paths = ["docs", "includes", "templates", "mkdocs.yml", "content"]

    excluded_patterns = ["docs/licenses/**/**/index.md", "**/node_modules/**", "**/.git/**", "**/.venv"]

    watch_directories(watch_paths, excluded_patterns)

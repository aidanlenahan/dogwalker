from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.spa import mount_spa


def _client(tmp_path: Path) -> TestClient:
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<html>shell</html>")
    (tmp_path / "assets" / "app-abc123.js").write_text("console.log(1)")
    (tmp_path / "sw.js").write_text("// sw")
    (tmp_path.parent / "secret.txt").write_text("nope")
    app = FastAPI()
    mount_spa(app, tmp_path)
    return TestClient(app)


def test_client_routes_get_app_shell(tmp_path: Path) -> None:
    c = _client(tmp_path)
    for path in ("/", "/dashboard", "/w/someToken", "/walk/abc/live"):
        r = c.get(path)
        assert r.status_code == 200
        assert "shell" in r.text
        assert r.headers["cache-control"] == "no-cache"


def test_hashed_assets_are_immutable_and_sw_is_not(tmp_path: Path) -> None:
    c = _client(tmp_path)
    assert "immutable" in c.get("/assets/app-abc123.js").headers["cache-control"]
    assert c.get("/sw.js").headers["cache-control"] == "no-cache"


def test_unknown_api_paths_404_instead_of_shell(tmp_path: Path) -> None:
    assert _client(tmp_path).get("/api/nope").status_code == 404


def test_path_traversal_serves_shell_not_file(tmp_path: Path) -> None:
    r = _client(tmp_path).get("/..%2Fsecret.txt")
    assert "nope" not in r.text

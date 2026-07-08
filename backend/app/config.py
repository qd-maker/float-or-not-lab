from pathlib import Path

from dotenv import load_dotenv


def load_env_files() -> None:
    """Load .env files without overriding real process env."""

    backend_dir = Path(__file__).resolve().parents[1]
    repo_root = backend_dir.parent
    for env_path in (repo_root / ".env", backend_dir / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=False)

"""Shared pytest fixtures: isolated database per test session."""

import os
import tempfile
from pathlib import Path

# Must be set before any app module imports settings.
TEST_DB = Path(tempfile.gettempdir()) / "moleculelab_test.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"

import pytest  # noqa: E402

from app.core.database import SessionLocal, init_db  # noqa: E402
from app.scripts.seed_db import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def seeded_database():
    """Create tables and seed the bundled educational dataset once per session."""
    init_db()
    seed()
    yield


@pytest.fixture()
def db_session():
    """Yield a database session that rolls back after each test."""
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

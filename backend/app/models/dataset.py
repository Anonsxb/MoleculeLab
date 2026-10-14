"""Dataset model describing a bundled or imported collection of molecular records."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Dataset(Base):
    """A named collection of molecules with source provenance."""

    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version_label: Mapped[str] = mapped_column(String(100), nullable=False, default="1.0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    entries: Mapped[list["DatasetEntry"]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def record_count(self) -> int:
        """Number of valid molecule entries recorded for this dataset."""
        return len(self.entries)

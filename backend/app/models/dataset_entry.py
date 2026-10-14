"""DatasetEntry linking a molecule to a dataset or import batch."""

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DatasetEntry(Base):
    """Record of a molecule's inclusion in a dataset, with validation state."""

    __tablename__ = "dataset_entries"
    __table_args__ = (
        UniqueConstraint("dataset_id", "molecule_id", name="uq_entry_dataset_molecule"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_id: Mapped[int] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    molecule_id: Mapped[int] = mapped_column(
        ForeignKey("molecules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    validation_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="valid", index=True
    )
    validation_message: Mapped[str] = mapped_column(Text, nullable=False, default="")

    dataset: Mapped["Dataset"] = relationship(back_populates="entries", lazy="joined")
    molecule: Mapped["Molecule"] = relationship(lazy="joined")

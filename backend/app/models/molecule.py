"""Molecule model storing structures and typed calculated descriptors."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Molecule(Base):
    """A molecular structure plus its calculated descriptors and provenance.

    Descriptors are stored as dedicated typed columns (PRD 8.4 alternative) because the
    supported descriptor set is fixed. Nulls distinguish missing values from valid zero.
    """

    __tablename__ = "molecules"
    __table_args__ = (UniqueConstraint("canonical_smiles", name="uq_molecules_canonical_smiles"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    formula: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    original_smiles: Mapped[str] = mapped_column(Text, nullable=False)
    canonical_smiles: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    mol_wt: Mapped[float | None] = mapped_column(Float, nullable=True)
    logp: Mapped[float | None] = mapped_column(Float, nullable=True)
    hbd: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hba: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tpsa: Mapped[float | None] = mapped_column(Float, nullable=True)
    calculation_failed: Mapped[bool] = mapped_column(Integer, default=False)

    descriptor_rdkit_version: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    descriptors_calculated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    entries: Mapped[list["DatasetEntry"]] = relationship(
        back_populates="molecule", cascade="all, delete-orphan", lazy="selectin"
    )

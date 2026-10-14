"""Initial schema: datasets, molecules, dataset entries, import jobs.

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "datasets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("version_label", sa.String(100), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "molecules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("display_name", sa.String(255), nullable=False, index=True),
        sa.Column("formula", sa.String(120), nullable=False, server_default=""),
        sa.Column("original_smiles", sa.Text(), nullable=False),
        sa.Column("canonical_smiles", sa.Text(), nullable=True, index=True),
        sa.Column("external_id", sa.String(100), nullable=True, index=True),
        sa.Column("source_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("mol_wt", sa.Float(), nullable=True),
        sa.Column("logp", sa.Float(), nullable=True),
        sa.Column("hbd", sa.Integer(), nullable=True),
        sa.Column("hba", sa.Integer(), nullable=True),
        sa.Column("tpsa", sa.Float(), nullable=True),
        sa.Column("calculation_failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("descriptor_rdkit_version", sa.String(50), nullable=False, server_default=""),
        sa.Column("descriptors_calculated_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("canonical_smiles", name="uq_molecules_canonical_smiles"),
    )
    # Indexes on display_name, canonical_smiles, and external_id are emitted by
    # their column definitions (index=True); descriptor indexes are added for filters.
    op.create_index("ix_molecules_mol_wt", "molecules", ["mol_wt"])
    op.create_index("ix_molecules_logp", "molecules", ["logp"])
    op.create_index("ix_molecules_hbd", "molecules", ["hbd"])
    op.create_index("ix_molecules_hba", "molecules", ["hba"])
    op.create_index("ix_molecules_tpsa", "molecules", ["tpsa"])

    op.create_table(
        "dataset_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "dataset_id",
            sa.Integer(),
            sa.ForeignKey("datasets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "molecule_id",
            sa.Integer(),
            sa.ForeignKey("molecules.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("row_number", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "validation_status",
            sa.String(20),
            nullable=False,
            server_default="valid",
            index=True,
        ),
        sa.Column("validation_message", sa.Text(), nullable=False, server_default=""),
        sa.UniqueConstraint(
            "dataset_id", "molecule_id", name="uq_entry_dataset_molecule"
        ),
    )

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "dataset_id",
            sa.Integer(),
            sa.ForeignKey("datasets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("filename", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("rows_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_rejected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("invalid_structures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("missing_fields", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicates", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("calculation_failures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("import_jobs")
    op.drop_table("dataset_entries")
    op.drop_index("ix_molecules_tpsa", table_name="molecules")
    op.drop_index("ix_molecules_hba", table_name="molecules")
    op.drop_index("ix_molecules_hbd", table_name="molecules")
    op.drop_index("ix_molecules_logp", table_name="molecules")
    op.drop_index("ix_molecules_mol_wt", table_name="molecules")
    op.drop_table("molecules")
    op.drop_table("datasets")

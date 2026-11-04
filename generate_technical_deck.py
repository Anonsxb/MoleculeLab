"""Technical Architecture & Code Deep-Dive Presentation Generator for MoleculeLab.
Generates MoleculeLab_Technical_Architecture.pptx using python-pptx.
Creates a professional 16:9 widescreen presentation specifically explaining the tech stack,
codebase implementation, algorithms, and technical decisions for professors/evaluators.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# Dark Theme Palette matching MoleculeLab
COLOR_BG = RGBColor(10, 15, 29)          # Deep Cyber Navy
COLOR_CARD_BG = RGBColor(18, 26, 45)     # Elevated Card Background
COLOR_CARD_BORDER = RGBColor(30, 41, 59) # Subtle Slate Border
COLOR_CYAN = RGBColor(56, 189, 248)      # Primary Accent Cyan (#38bdf8)
COLOR_INDIGO = RGBColor(129, 140, 248)   # Secondary Accent Indigo (#818cf8)
COLOR_EMERALD = RGBColor(52, 211, 153)   # Accent Emerald (#34d399)
COLOR_AMBER = RGBColor(251, 191, 36)     # Accent Amber (#fbbf24)
COLOR_WHITE = RGBColor(255, 255, 255)    # High-contrast White
COLOR_MUTED = RGBColor(148, 163, 184)    # Slate Muted Text
COLOR_BODY = RGBColor(226, 232, 240)     # Crisp Body Text
COLOR_CODE_BG = RGBColor(13, 20, 36)     # Inset Code Block Fill

FONT_HEADING = "Trebuchet MS"
FONT_BODY = "Calibri"
FONT_MONO = "Consolas"


def set_slide_background(slide, prs):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_BG
    bg.line.fill.background()
    return bg


def add_slide_header(slide, tag_text: str, title_text: str, subtitle_text: str, slide_num: str):
    # Tag Badge
    badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(8), Inches(0.35))
    tf_b = badge_box.text_frame
    tf_b.word_wrap = True
    p_b = tf_b.paragraphs[0]
    p_b.text = f"• {tag_text.upper()}"
    p_b.font.name = FONT_BODY
    p_b.font.size = Pt(10)
    p_b.font.bold = True
    p_b.font.color.rgb = COLOR_CYAN

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.68), Inches(10), Inches(0.65))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = title_text
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(24)
    p_t.font.bold = True
    p_t.font.color.rgb = COLOR_WHITE

    # Subtitle
    if subtitle_text:
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.32), Inches(10.5), Inches(0.45))
        tf_s = sub_box.text_frame
        tf_s.word_wrap = True
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle_text
        p_s.font.name = FONT_BODY
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = COLOR_MUTED

    # Slide Number Watermark
    num_box = slide.shapes.add_textbox(Inches(11.2), Inches(0.35), Inches(1.5), Inches(0.35))
    tf_n = num_box.text_frame
    p_n = tf_n.paragraphs[0]
    p_n.alignment = PP_ALIGN.RIGHT
    p_n.text = slide_num
    p_n.font.name = FONT_MONO
    p_n.font.size = Pt(11)
    p_n.font.bold = True
    p_n.font.color.rgb = COLOR_MUTED

    # Footer
    foot_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.95), Inches(11.7), Inches(0.3))
    tf_f = foot_box.text_frame
    p_f = tf_f.paragraphs[0]
    p_f.text = "🧪 MoleculeLab • Technical Architecture, Algorithms & Code Implementation Deep-Dive"
    p_f.font.name = FONT_BODY
    p_f.font.size = Pt(9.5)
    p_f.font.color.rgb = COLOR_MUTED


def add_card(slide, left, top, width, height, title: str, desc: str, bullets=None, border_color=COLOR_CARD_BORDER, icon_text: str = "", title_color=COLOR_WHITE):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_CARD_BG
    card.line.color.rgb = border_color
    card.line.width = Pt(1)

    tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), width - Inches(0.4), height - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True

    p_head = tf.paragraphs[0]
    p_head.text = f"{icon_text} {title}" if icon_text else title
    p_head.font.name = FONT_HEADING
    p_head.font.size = Pt(14)
    p_head.font.bold = True
    p_head.font.color.rgb = title_color
    p_head.space_after = Pt(4)

    if desc:
        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = COLOR_MUTED
        p_desc.space_after = Pt(6)

    if bullets:
        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = f"• {b}"
            p_b.font.name = FONT_BODY
            p_b.font.size = Pt(10.5)
            p_b.font.color.rgb = COLOR_BODY
            p_b.space_after = Pt(3)

    return card


def build_technical_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, prs)

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.2), Inches(11.3), Inches(0.4))
    p = tb.text_frame.paragraphs[0]
    p.text = "🧪 MOLECULELAB • SYSTEM ARCHITECTURE & CODE WALKTHROUGH"
    p.font.name = FONT_BODY
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = COLOR_CYAN

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(11.3), Inches(1.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "How We Built MoleculeLab:\nFull Technical Implementation & Architecture"
    p.font.name = FONT_HEADING
    p.font.size = Pt(34)
    p.font.bold = True
    p.font.color.rgb = COLOR_WHITE

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(3.35), Inches(11.3), Inches(0.9))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = (
        "An in-depth explanation of our full-stack engineering: Python FastAPI backend, RDKit 2026 cheminformatics, "
        "ETKDGv3 3D conformer generation, MMFF94 molecular mechanics physics, SQLAlchemy database, "
        "and Next.js 16 / React 19 interactive WebGL visualization."
    )
    p.font.name = FONT_BODY
    p.font.size = Pt(14)
    p.font.color.rgb = COLOR_MUTED

    stats = [
        ("FastAPI + RDKit", "Scientific Backend Engine"),
        ("ETKDGv3 + MMFF94", "3D Distance Geometry & Physics"),
        ("Next.js 16 + React 19", "Modern TypeScript Frontend"),
        ("1,338 Molecules", "Curated PubChem & ChEMBL DB"),
    ]
    box_w = Inches(2.7)
    gap = Inches(0.18)
    left_start = Inches(1.0)
    for i, (metric, label) in enumerate(stats):
        cur_left = left_start + i * (box_w + gap)
        card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cur_left, Inches(4.75), box_w, Inches(1.5))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_BG
        card.line.color.rgb = COLOR_CYAN if i == 0 else COLOR_CARD_BORDER

        tb = s1.shapes.add_textbox(cur_left + Inches(0.15), Inches(4.85), box_w - Inches(0.3), Inches(1.3))
        tf = tb.text_frame
        p_val = tf.paragraphs[0]
        p_val.text = metric
        p_val.font.name = FONT_MONO
        p_val.font.size = Pt(18)
        p_val.font.bold = True
        p_val.font.color.rgb = COLOR_CYAN

        p_lbl = tf.add_paragraph()
        p_lbl.text = label
        p_lbl.font.name = FONT_BODY
        p_lbl.font.size = Pt(11)
        p_lbl.font.color.rgb = COLOR_MUTED
        p_lbl.space_before = Pt(6)

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(6.8), Inches(11.3), Inches(0.4))
    p = tb.text_frame.paragraphs[0]
    p.text = "Student Presentation • Technical Viva, Defense & System Architecture Review"
    p.font.name = FONT_BODY
    p.font.size = Pt(11)
    p.font.color.rgb = COLOR_MUTED

    # ==========================================
    # SLIDE 2: HIGH-LEVEL ARCHITECTURE & DATA FLOW
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, prs)
    add_slide_header(
        s2,
        "System Architecture",
        "Decoupled 3-Tier Full-Stack Architecture",
        "Clear separation of concerns between Client, API Service Layer, and C++ Cheminformatics Core.",
        "02 / ARCHITECTURE"
    )

    card_w = Inches(3.64)
    gap = Inches(0.38)
    top = Inches(1.9)
    h = Inches(4.8)

    add_card(
        s2, Inches(0.8), top, card_w, h,
        "1. Presentation Tier (Frontend)",
        "Built with Next.js 16 (App Router), React 19, and TypeScript for a snappy, type-safe browser experience.",
        bullets=[
            "Client & Server Components with zero-layout-shift routing",
            "3Dmol.js WebGL canvas for interactive 360° molecular rendering",
            "Recharts visualization engine for property distribution histograms & scatter plots",
            "Responsive Glassmorphic UI with custom CSS variables & zero heavy CSS frameworks",
            "Strict TypeScript models mirrored from backend Pydantic schemas"
        ],
        icon_text="💻",
        border_color=COLOR_CYAN,
        title_color=COLOR_CYAN
    )

    add_card(
        s2, Inches(0.8) + card_w + gap, top, card_w, h,
        "2. Service & API Tier (Backend)",
        "FastAPI asynchronous web framework in Python 3.14 delivering high-concurrency REST endpoints.",
        bullets=[
            "Pydantic v2 schemas: strict request validation and automatic JSON response serialization",
            "Layered Service Pattern: routers delegate business logic to decoupled services (chemistry, studio, molecule)",
            "Standardized error envelope with descriptive scientific codes and suggestions",
            "CORS configured for cross-origin local and cloud deployments",
            "Auto-generated interactive OpenAPI / Swagger documentation at /docs"
        ],
        icon_text="⚡",
        border_color=COLOR_INDIGO,
        title_color=COLOR_INDIGO
    )

    add_card(
        s2, Inches(0.8) + 2 * (card_w + gap), top, card_w, h,
        "3. Computation & Data Tier",
        "High-performance C++ chemistry engine combined with an ACID-compliant relational database.",
        bullets=[
            "RDKit 2026: Industry standard C++ library for SMILES parsing, canon, and 2D vector depiction",
            "Conformer Engine: ETKDGv3 distance geometry + MMFF94 force field energy minimization",
            "SQLAlchemy 2.0 ORM: Typed repository abstraction supporting SQLite and PostgreSQL",
            "Alembic database migrations for versioned, reproducible schema evolution",
            "Curated 1,338-molecule database seeded from PubChem and ChEMBL"
        ],
        icon_text="🔬",
        border_color=COLOR_EMERALD,
        title_color=COLOR_EMERALD
    )

    # ==========================================
    # SLIDE 3: TECH STACK JUSTIFICATION
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, prs)
    add_slide_header(
        s3,
        "Technology Stack",
        "Why We Chose Each Technology (Engineering Decisions)",
        "Every library and framework was selected to solve a specific chemical, computational, or UI requirement.",
        "03 / TECH STACK"
    )

    card_w4 = Inches(2.78)
    gap4 = Inches(0.2)
    top3 = Inches(1.9)
    h3 = Inches(4.8)

    add_card(
        s3, Inches(0.8), top3, card_w4, h3,
        "Python 3.14 & FastAPI",
        "Backend & REST API",
        bullets=[
            "Why Python: RDKit's official, first-class bindings run on Python.",
            "Why FastAPI: 300% faster than Flask/Django; native async/await.",
            "Automatic OpenAPI: Interactive /docs UI generated automatically.",
            "Pydantic v2: C-based parsing for microsecond request validation."
        ],
        icon_text="🐍",
        border_color=COLOR_CYAN
    )

    add_card(
        s3, Inches(0.8) + card_w4 + gap4, top3, card_w4, h3,
        "RDKit 2026.9.1",
        "Scientific Cheminformatics",
        bullets=[
            "Why RDKit: The gold standard used by Novartis, Pfizer, and NIH.",
            "Accurate Descriptors: MolWt, Crippen LogP, Lipinski HBD/HBA, TPSA.",
            "SMILES Normalization: Eliminates ambiguity via canonical SMILES.",
            "Native C++ Core: Blazing calculation speed (<10ms per molecule)."
        ],
        icon_text="🧪",
        border_color=COLOR_INDIGO
    )

    add_card(
        s3, Inches(0.8) + 2 * (card_w4 + gap4), top3, card_w4, h3,
        "Next.js 16 & React 19",
        "Frontend Application",
        bullets=[
            "Next.js App Router: Nested layouts, fast client-side navigation.",
            "React 19 Hooks: High performance state handling without bloat.",
            "TypeScript: End-to-end type safety preventing runtime null bugs.",
            "Vanilla / CSS Modules: Custom glassmorphism, zero Tailwind bloat."
        ],
        icon_text="⚛️",
        border_color=COLOR_EMERALD
    )

    add_card(
        s3, Inches(0.8) + 3 * (card_w4 + gap4), top3, card_w4, h3,
        "3Dmol.js & Recharts",
        "Graphics & Data Viz",
        bullets=[
            "3Dmol.js: WebGL-accelerated 3D molecular canvas right in browser.",
            "Multiple Renders: Stick, sphere, cartoon, wireframe, electrostatic.",
            "Zero Installation: Runs 3D physics view on any laptop or phone.",
            "Recharts: Interactive SVG charts for chemical distributions."
        ],
        icon_text="📊",
        border_color=COLOR_AMBER
    )

    # ==========================================
    # SLIDE 4: BACKEND CODING & SERVICE PATTERN
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, prs)
    add_slide_header(
        s4,
        "Backend Architecture",
        "How We Structured the Backend Codebase",
        "Organized according to enterprise Clean Architecture with a strict layered service pattern.",
        "04 / BACKEND CODE"
    )

    card_w2 = Inches(5.6)
    gap2 = Inches(0.46)
    top4 = Inches(1.9)
    h4 = Inches(4.8)

    add_card(
        s4, Inches(0.8), top4, card_w2, h4,
        "Layered Directory Structure (`/backend/app`)",
        "A clear hierarchy isolating network, business logic, validation, and persistence.",
        bullets=[
            "• api/v1/endpoints/ : HTTP Route Handlers (molecules, studio, analytics, import, export). Only parses requests and returns responses.",
            "• services/ : Pure Business Logic & Algorithms. Decoupled from HTTP! chemistry.py (RDKit), studio_service.py (3D physics), molecule_service.py (search/filter).",
            "• schemas/ : Pydantic Data Contracts. Defines MoleculeCreate, ConformerResponse, DescriptorSummary with strict type validation.",
            "• models/ : SQLAlchemy Database Entities. Maps Python classes to relational SQLite/Postgres tables with indexes.",
            "• core/ : Application configuration, settings, database session generator, and logging infrastructure."
        ],
        icon_text="📁",
        border_color=COLOR_CYAN
    )

    add_card(
        s4, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "How a Request is Processed (Step-by-Step)",
        "Example: POST /api/v1/studio/conformer with SMILES string.",
        bullets=[
            "1. HTTP Entry: FastAPI receives raw JSON; Pydantic parses ConformerRequest(smiles='...', optimize=True).",
            "2. Input Validation: Pydantic rejects empty strings or malformed types before hitting any chemistry code.",
            "3. Service Delegation: Route calls studio_service.build_3d_conformer(smiles, optimize=True).",
            "4. RDKit Execution: Validates chemistry grammar, embeds 3D coords with ETKDGv3, runs MMFF94 force field.",
            "5. Charge Calculation: Computes Gasteiger partial atomic charges for electrostatic coloring.",
            "6. Typed Response: Converts molecule to SDF/MOL format and returns ConformerResponse with energy values."
        ],
        icon_text="🔄",
        border_color=COLOR_INDIGO
    )

    # ==========================================
    # SLIDE 5: CHEMISTRY ENGINE & DESCRIPTORS
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, prs)
    add_slide_header(
        s5,
        "Chemistry Engine",
        "How We Coded Chemistry Logic (`services/chemistry.py`)",
        "The single authoritative server-side module for SMILES parsing, validation, and physicochemical models.",
        "05 / CHEMISTRY"
    )

    add_card(
        s5, Inches(0.8), top4, card_w2, h4,
        "Core Chemical Algorithms in Code",
        "Defensive RDKit implementation preventing crashes on exotic or invalid structures.",
        bullets=[
            "• SMILES Parsing (parse_smiles): Uses Chem.MolFromSmiles(raw). Wraps in try/except to catch RDKit C++ valence grammar exceptions gracefully.",
            "• Canonicalization (canonical_smiles): Chem.MolToSmiles(mol, canonical=True). Converts multiple SMILES representations (e.g. CCO vs OCC) into one unique string.",
            "• Formula Generation (molecular_formula): rdMolDescriptors.CalcMolFormula(mol) producing standard Hill notation (e.g. C8H10N4O2).",
            "• 2D Vector Depiction (depict_2d_svg): MolDraw2DSVG generates crisp vector SVGs without external image files or desktop GUI libraries.",
            "• Defensive Drawing Import: If the RDKit wheel lacks drawing headers, the system degrades gracefully without crashing descriptor calculations."
        ],
        icon_text="🔬",
        border_color=COLOR_CYAN
    )

    add_card(
        s5, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "The 5 Calculated Physicochemical Descriptors",
        "Stored at full double-precision floating point, rounded strictly in presentation layer.",
        bullets=[
            "1. Molecular Weight (MolWt): Full-precision atomic mass summation via Descriptors.MolWt (g/mol).",
            "2. LogP (MolLogP): Crippen atom-additive octanol-water partition coefficient estimate (lipophilicity model).",
            "3. Hydrogen Bond Donors (NumHDonors): Lipinski count of structural OH and NH groups via Lipinski.NumHDonors.",
            "4. Hydrogen Bond Acceptors (NumHAcceptors): Structural count of O and N atoms via Lipinski.NumHAcceptors.",
            "5. TPSA (TPSA): Topological Polar Surface Area (Å²) estimating cell membrane permeability.",
            "• Fault Isolation: Each descriptor runs in an isolated try/except block; one failure never blanks out the other four."
        ],
        icon_text="📐",
        border_color=COLOR_EMERALD
    )

    # ==========================================
    # SLIDE 6: 3D CONFORMER & PHYSICS ENGINE
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, prs)
    add_slide_header(
        s6,
        "3D Physics Simulation",
        "How We Coded the 3D Conformer Engine (`studio_service.py`)",
        "Bringing desktop computational chemistry (Avogadro / PyMOL) directly into the browser.",
        "06 / 3D PHYSICS"
    )

    add_card(
        s6, Inches(0.8), top4, card_w2, h4,
        "The 4-Stage 3D Conformer Generation Pipeline",
        "Mathematical and physical algorithms running inside `build_3d_conformer()`.",
        bullets=[
            "1. Hydrogen Saturation (Chem.AddHs): Explicit hydrogens must be added to 2D SMILES before 3D coordinates can exist physically in space.",
            "2. Distance Geometry Embedding (ETKDGv3): Uses Riniker & Landrum's Experimental-Torsion Knowledge Distance Geometry algorithm to place atoms into plausible 3D space.",
            "3. Force Field Minimization (MMFF94): Runs Merck Molecular Force Field optimization (AllChem.MMFFOptimizeMolecule) to relax bond angles and relieve steric clash.",
            "4. Partial Charge Derivation: AllChem.ComputeGasteigerCharges calculates partial atomic electron distributions for electrostatic surface mapping.",
            "5. Fallback Protection: If MMFF94 parameters fail on organometallic bonds, system automatically falls back to Universal Force Field (UFF)."
        ],
        icon_text="⚛️",
        border_color=COLOR_INDIGO
    )

    add_card(
        s6, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Interactive Geometry & Export Formats",
        "Enabling real-time bond measurement and structural computational export.",
        bullets=[
            "• Bond Distance Calculation: Uses 3D Euclidean vector distance formula: d = sqrt((x2-x1)² + (y2-y1)² + (z2-z1)²).",
            "• Valence Angle Calculation: Computes dot product between bond vectors: cos(theta) = (v1 • v2) / (|v1| * |v2|).",
            "• Dihedral Torsion: Computes normal vectors across 4 connected atoms to find rotation angles.",
            "• Computational Formats: Chem.MolToMolBlock produces industry-standard SDF/MOL blocks consumed by 3Dmol.js, PyMOL, and AutoDock.",
            "• Energy Output: Returns minimized potential energy in kcal/mol for comparative conformational stability analysis."
        ],
        icon_text="📐",
        border_color=COLOR_CYAN
    )

    # ==========================================
    # SLIDE 7: DATABASE DESIGN & PROVENANCE
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, prs)
    add_slide_header(
        s7,
        "Database & Data Integrity",
        "Relational Schema, Scientific Provenance & Migrations",
        "Ensuring every molecule, calculation, and dataset is versioned, auditable, and reproducible.",
        "07 / DATABASE"
    )

    add_card(
        s7, Inches(0.8), top4, card_w2, h4,
        "Database Architecture (`models/molecule.py`)",
        "Designed using SQLAlchemy 2.0 ORM with indexed lookup columns.",
        bullets=[
            "• Primary Table 'molecules': id (UUID/Int PK), name, canonical_smiles, formula, inchi_key, description, pubchem_cid, chembl_id.",
            "• Calculated Descriptors: molecular_weight (Float), logp (Float), hbd (Integer), hba (Integer), tpsa (Float).",
            "• Provenance Metadata: calculation_timestamp, rdkit_version, dataset_origin ('educational_common', 'curated_chembl', 'user_import').",
            "• Indexes: B-Tree index on canonical_smiles and name for sub-millisecond search queries across thousands of records.",
            "• Portability: Runs on SQLite for zero-config local development, seamlessly migrates to PostgreSQL for production via SQLAlchemy dialect abstraction."
        ],
        icon_text="🗄️",
        border_color=COLOR_EMERALD
    )

    add_card(
        s7, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Alembic Migrations & Curated Seeding",
        "Zero data drift and automated database initialization (`scripts/seed_db.py`).",
        bullets=[
            "• Alembic Versioning: Database schema changes are tracked in alembic/versions/ as Python migration scripts. Upgrades are deterministic.",
            "• Idempotent Seeding: seed_db.py checks existing canonical SMILES to avoid duplicate records on multiple runs.",
            "• Two Bundled Datasets (1,338 distinct compounds):",
            "  1. Educational Common Compounds (181 curated drugs, amino acids, everyday molecules from PubChem NIH).",
            "  2. Curated Bioactive Extract (1,157 bio-active molecules from EMBL ChEMBL database).",
            "• Scientific Integrity: Missing property values in raw data are recalculated via RDKit rather than storing zero or null."
        ],
        icon_text="🌱",
        border_color=COLOR_CYAN
    )

    # ==========================================
    # SLIDE 8: FRONTEND CODING & REACT ARCHITECTURE
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, prs)
    add_slide_header(
        s8,
        "Frontend Engineering",
        "How We Coded the Frontend (`/frontend/src`)",
        "A component-driven Next.js 16 App Router application engineered for performance and responsiveness.",
        "08 / FRONTEND CODE"
    )

    add_card(
        s8, Inches(0.8), top4, card_w2, h4,
        "Page Architecture & Routing (`frontend/src/app`)",
        "Modern nested routing with isolated state management.",
        bullets=[
            "• /studio (3D Studio): Interactive 3Dmol.js viewer, conformer energy controls, bond inspector, and SDF downloader.",
            "• /library (Molecular Library): Fast client-side faceted filtering (MW range, LogP slider, HBD/HBA, dataset tabs).",
            "• /compare (Comparison Studio): Multi-molecule side-by-side spec comparison table with visual difference highlighting.",
            "• /analytics (Analytics Engine): Recharts dynamic histograms, property distributions, and Lipinski Rule of 5 compliance metrics.",
            "• /validate (SMILES Validator): Instant live syntax checking, canonical output, and real-time 2D SVG preview.",
            "• /import & /export: Drag-and-drop CSV batch importer with validation reports, and reproducible CSV exporter."
        ],
        icon_text="⚛️",
        border_color=COLOR_CYAN
    )

    add_card(
        s8, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Type Safety & Performance Optimization",
        "Preventing runtime errors and maintaining 60 FPS UI responsiveness.",
        bullets=[
            "• TypeScript Contracts: lib/types.ts mirrors backend Pydantic schemas (Molecule, ConformerResponse, AnalyticsStats).",
            "• Debounced Search: Search input debounces API calls by 250ms to prevent network flooding while typing.",
            "• Optimistic State: Client updates filter states instantly while asynchronous data loads smoothly.",
            "• CSS Modules & Tokens: Zero runtime CSS-in-JS overhead; styling utilizes lightweight CSS custom properties (--accent-cyan, --bg-dark).",
            "• Resilient API Client: lib/api.ts standardizes fetch requests, injects base URLs, and maps server errors to friendly UI toasts."
        ],
        icon_text="🛡️",
        border_color=COLOR_INDIGO
    )

    # ==========================================
    # SLIDE 9: 3D WEBGL RENDERING WITH 3DMOL.JS
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, prs)
    add_slide_header(
        s9,
        "3D WebGL Visualization",
        "How We Implemented the 3D Molecular Studio",
        "Harnessing WebGL hardware acceleration to render smooth 3D molecular graphics in the browser.",
        "09 / 3D GRAPHICS"
    )

    add_card(
        s9, Inches(0.8), top4, card_w2, h4,
        "3Dmol.js Integration & Lifecycle",
        "Direct DOM container binding with dynamic React lifecycle hooks.",
        bullets=[
            "• Canvas Initialization: React useEffect hooks instantiate the $3Dmol.createViewer instance on an HTML5 <div> container.",
            "• Model Ingestion: The backend returns an SDF/MOL string containing 3D (X, Y, Z) coordinates and bond topology. viewer.addModel(sdf, 'sdf') parses it in milliseconds.",
            "• View Camera Control: viewer.zoomTo() centers the molecule; auto-rotation toggle rotates the model along the Y-axis at 60 FPS.",
            "• Responsive Resizing: A ResizeObserver watches container dimensions and triggers viewer.render() on window resize.",
            "• Hardware Accelerated: WebGL offloads geometry rendering directly to the user's GPU (NVIDIA/Intel/Apple Silicon)."
        ],
        icon_text="🎮",
        border_color=COLOR_CYAN
    )

    add_card(
        s9, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Rendering Styles & Electrostatic Surfaces",
        "Multiple scientific display modes customized on demand.",
        bullets=[
            "• Stick Mode: Displays bonds as cylinders with CPK element color-coded caps (Carbon=Gray, Oxygen=Red, Nitrogen=Blue).",
            "• Ball & Stick Mode: Enhances spatial awareness by rendering atoms as spheres at 30% van der Waals radius.",
            "• Sphere (CPK Spacefill): Full 100% van der Waals radius showing steric volume and solvent-accessible boundaries.",
            "• Wireframe Mode: Minimalist line representation for large macromolecular complexes.",
            "• Electrostatic Potential Surface: Maps Gasteiger partial charges onto a translucent molecular solvent-accessible surface (Red = partial negative, Blue = partial positive)."
        ],
        icon_text="🎨",
        border_color=COLOR_EMERALD
    )

    # ==========================================
    # SLIDE 10: ADVANCED DATA PIPELINES (IMPORT/EXPORT)
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, prs)
    add_slide_header(
        s10,
        "Data Pipeline & Batch Engine",
        "How We Coded CSV Import, Validation & Export",
        "Robust tabular processing capable of validating messy chemical datasets with detailed error reporting.",
        "10 / DATA PIPELINES"
    )

    add_card(
        s10, Inches(0.8), top4, card_w2, h4,
        "CSV Import & Quality Validation (`import_service.py`)",
        "Never blindly inserts user files: validates every single row.",
        bullets=[
            "• Header Detection: Flexibly recognizes column variations (smiles, SMILES, Canonical_Smiles, Name, Compound).",
            "• Syntax & Valence Verification: Passes each SMILES string through RDKit's Chem.MolFromSmiles. Identifies invalid atoms or ring errors.",
            "• Quality Error Classification: Classifies issues into INVALID_SMILES, DUPLICATE_SMILES, MISSING_NAME, or PARSE_ERROR.",
            "• Batch Recalculation: Ignores pre-calculated values in the CSV and re-derives all 5 descriptors using our authoritative RDKit engine.",
            "• Quality Audit Report: Returns total rows, accepted count, rejected count, and an array of specific line-by-line errors with recommendations."
        ],
        icon_text="📥",
        border_color=COLOR_AMBER
    )

    add_card(
        s10, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Reproducible Scientific Export (`export_service.py`)",
        "Adhering to FAIR (Findable, Accessible, Interoperable, Reproducible) data standards.",
        bullets=[
            "• Custom Filter Export: Exports molecules matching current user filters (e.g., only molecules with LogP < 3 and MW < 400).",
            "• Provenance Metadata Headers: CSV starts with scientific provenance comments: Export Date, RDKit Version, Calculation Methods.",
            "• Full Precision Numbers: Outputs floating point descriptors without lossy UI rounding to maintain scientific reproducibility.",
            "• Standardized Columns: Canonical SMILES, Molecular Formula, InChI Key, PubChem CID, ChEMBL ID, MW, LogP, HBD, HBA, TPSA.",
            "• Streaming Response: Uses FastAPI StreamingResponse for low memory footprint during large dataset exports."
        ],
        icon_text="📤",
        border_color=COLOR_CYAN
    )

    # ==========================================
    # SLIDE 11: DEFENSIVE PROGRAMMING & ERROR HANDLING
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, prs)
    add_slide_header(
        s11,
        "Code Resilience & Quality",
        "Defensive Programming & Edge-Case Handling",
        "How our code handles unexpected user input, malformed chemistry, and environment mismatches.",
        "11 / DEFENSIVE CODE"
    )

    add_card(
        s11, Inches(0.8), top4, card_w2, h4,
        "Chemistry Edge Cases Handled",
        "Chemical structures have endless quirks; our code anticipates them all.",
        bullets=[
            "• Hypervalent Atoms (e.g. 5-bond Carbon): RDKit throws an internal exception. Our code intercepts it, suppresses crash, and returns friendly 'Valence violation' message.",
            "• Cis/Trans Stereochemistry & Chiral Centers: Supported using standard SMILES slashes (/ \\) and @/@@ tags; preserved in canonical output.",
            "• Isolated Descriptor Failures: If Crippen LogP fails on an unusual metal complex, MolWt and TPSA still compute successfully.",
            "• Zero vs Null Integrity: Missing data is strictly stored as None/null. We NEVER substitute missing values with 0.0 (which would falsify chemistry!).",
            "• Stripped Whitespace & Encoding: Strips non-ASCII characters, quotes, and carriage returns from user input before parsing."
        ],
        icon_text="🛡️",
        border_color=COLOR_EMERALD
    )

    add_card(
        s11, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Automated Testing Suite (pytest + httpx)",
        "Over 40 comprehensive backend tests verifying system contracts.",
        bullets=[
            "• Unit Tests (test_chemistry.py): Validates descriptor formulas against known chemical standards (Caffeine, Aspirin, Ethanol).",
            "• 3D Conformer Tests (test_studio.py): Verifies ETKDGv3 embedding, MMFF94 convergence, and atomic charge calculations.",
            "• API Integration Tests (test_api.py): Uses httpx.AsyncClient to simulate client requests across all endpoints.",
            "• Negative Testing: Validates that malformed JSON, empty SMILES, and nonexistent IDs return structured 400/404/422 responses.",
            "• Continuous Verification: All tests pass idempotently without depending on live external internet services."
        ],
        icon_text="🧪",
        border_color=COLOR_CYAN
    )

    # ==========================================
    # SLIDE 12: VIVA SURVIVAL GUIDE - QUESTIONS & ANSWERS
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, prs)
    add_slide_header(
        s12,
        "Viva & Interview Guide",
        "Top Technical Questions 'Sir' Will Ask & How to Answer",
        "Memorize these exact technical explanations to confidently defend the project in front of your evaluator.",
        "12 / VIVA GUIDE"
    )

    card_w3 = Inches(3.64)
    gap3 = Inches(0.38)
    top12 = Inches(1.9)
    h12 = Inches(4.8)

    add_card(
        s12, Inches(0.8), top12, card_w3, h12,
        "Q1: Why FastAPI over Flask or Django?",
        "\"Sir, we chose FastAPI for 3 reasons:",
        bullets=[
            "1. Native Asynchronous Support (async/await): Chemistry calculations and database I/O can run concurrently without thread blocking.",
            "2. Pydantic Type Validation: Validates incoming payloads automatically with high speed C-level performance.",
            "3. Auto-Generated OpenAPI: Provides live interactive Swagger docs out of the box at /docs, making frontend-backend integration effortless.\"",
            "Flask lacks native async and typing; Django is overly monolithic for a headless REST microservice."
        ],
        icon_text="❓",
        border_color=COLOR_CYAN
    )

    add_card(
        s12, Inches(0.8) + card_w3 + gap3, top12, card_w3, h12,
        "Q2: How does 3D conformer generation work?",
        "\"Sir, we use a 2-stage computational physics pipeline:",
        bullets=[
            "1. ETKDGv3 (Distance Geometry): Uses knowledge of experimental crystal torsional angles to generate a starting 3D point cloud satisfying chemical bonding constraints.",
            "2. MMFF94 (Force Field Optimization): Applies Newtonian mechanics where atoms are spheres and bonds are springs. It iteratively shifts coordinates using gradient descent to minimize total potential energy (strain, steric clash, torsion).\"",
            "Result: True physical lowest-energy 3D shape."
        ],
        icon_text="❓",
        border_color=COLOR_INDIGO
    )

    add_card(
        s12, Inches(0.8) + 2 * (card_w3 + gap3), top12, card_w3, h12,
        "Q3: Why calculate chemistry on backend?",
        "\"Sir, chemistry calculation must live on the backend:",
        bullets=[
            "1. RDKit is an industrial C++ library: Porting full RDKit to JS/WebAssembly bloats client bundles to >50MB and slows down browser mobile devices.",
            "2. Single Source of Truth: Calculating descriptors server-side guarantees identical, reproducible values across search, compare, export, and API consumers.",
            "3. Security & Validation: Users cannot tamper with calculated scientific properties in client-side code.\""
        ],
        icon_text="❓",
        border_color=COLOR_EMERALD
    )

    # ==========================================
    # SLIDE 13: MORE VIVA QUESTIONS (DATABASE & ARCHITECTURE)
    # ==========================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13, prs)
    add_slide_header(
        s13,
        "Viva & Interview Guide (Part 2)",
        "Database, Algorithms & Architecture Viva Questions",
        "Additional deep-dive questions evaluators commonly ask about data models and system design.",
        "13 / VIVA GUIDE 2"
    )

    add_card(
        s13, Inches(0.8), top12, card_w3, h12,
        "Q4: What is SMILES and Canonicalization?",
        "\"Sir, SMILES is Simplified Molecular Input Line Entry System.",
        bullets=[
            "It represents chemical graph topology as ASCII strings (e.g. 'CCO' for ethanol).",
            "The Problem: The same molecule can be written many ways ('CCO', 'OCC', 'C(O)C').",
            "Our Solution: We pass the molecule to RDKit's Chem.MolToSmiles(mol, canonical=True).",
            "Canonicalization runs a deterministic graph numbering algorithm (Morgan algorithm) so identical structures ALWAYS produce the exact same canonical string!\""
        ],
        icon_text="❓",
        border_color=COLOR_CYAN
    )

    add_card(
        s13, Inches(0.8) + card_w3 + gap3, top12, card_w3, h12,
        "Q5: How is the database organized?",
        "\"Sir, we use SQLAlchemy 2.0 ORM with SQLite and Alembic:",
        bullets=[
            "The molecules table stores identification (name, canonical_smiles, formula) and precomputed descriptors (MolWt, LogP, TPSA, HBD, HBA).",
            "We added B-Tree indexes on canonical_smiles and name to make queries O(log N) instead of O(N) table scans.",
            "Alembic tracks migration history so any database schema changes are version-controlled in Git, just like code.\"",
            "Can switch to PostgreSQL with one config line."
        ],
        icon_text="❓",
        border_color=COLOR_INDIGO
    )

    add_card(
        s13, Inches(0.8) + 2 * (card_w3 + gap3), top12, card_w3, h12,
        "Q6: How do frontend & backend communicate?",
        "\"Sir, they communicate via a decoupled REST API:",
        bullets=[
            "The Next.js frontend calls FastAPI endpoints using standard HTTP (GET, POST).",
            "Payloads are typed using TypeScript interfaces that strictly mirror backend Pydantic models.",
            "The backend returns JSON with standard HTTP status codes (200 OK, 400 Bad Request, 422 Validation Error).",
            "This decoupled architecture means we could easily build a mobile app in Flutter or React Native using the exact same backend!\""
        ],
        icon_text="❓",
        border_color=COLOR_EMERALD
    )

    # ==========================================
    # SLIDE 14: SUMMARY & PROJECT HIGHLIGHTS
    # ==========================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14, prs)
    add_slide_header(
        s14,
        "Project Conclusion",
        "Technical Highlights & Summary",
        "What we accomplished: A complete, modern, production-grade computational chemistry platform.",
        "14 / SUMMARY"
    )

    add_card(
        s14, Inches(0.8), top4, card_w2, h4,
        "Key Engineering Achievements",
        "What makes MoleculeLab stand out from standard web apps.",
        bullets=[
            "• True Industrial Scientific Stack: Powered by real RDKit 2026 C++ algorithms, not mock numbers or hardcoded JSON.",
            "• Hardware Accelerated 3D Physics: In-browser 3D WebGL rendering with ETKDGv3 conformer generation and MMFF94 force field energy minimization.",
            "• End-to-End Type Safety: TypeScript on the frontend + Pydantic v2 on the backend eliminates type mismatches.",
            "• 1,338 Real Molecules Seeded: High quality verified dataset from PubChem and ChEMBL with full scientific provenance.",
            "• Production Grade Quality: 40+ automated backend tests, defensive error handling, responsive dark cyber UI, and zero external software install needed."
        ],
        icon_text="🏆",
        border_color=COLOR_CYAN,
        title_color=COLOR_CYAN
    )

    add_card(
        s14, Inches(0.8) + card_w2 + gap2, top4, card_w2, h4,
        "Repository & Live System Resources",
        "Everything needed to demonstrate, inspect, and evaluate the system.",
        bullets=[
            "• Codebase Repository: https://github.com/Anonsxb/MoleculeLab",
            "• Interactive Swagger Docs: http://127.0.0.1:8000/docs",
            "• Interactive ReDoc Schema: http://127.0.0.1:8000/redoc",
            "• Frontend Web Application: http://127.0.0.1:3000",
            "• Backend Tech: Python 3.14, FastAPI, RDKit, SQLAlchemy, Alembic, SQLite",
            "• Frontend Tech: Next.js 16, React 19, TypeScript, 3Dmol.js, Recharts, CSS Modules",
            "• Deployment Ready: Containerized with Docker and deployable to Render / Vercel."
        ],
        icon_text="🔗",
        border_color=COLOR_EMERALD,
        title_color=COLOR_EMERALD
    )

    out_pptx = os.path.abspath("MoleculeLab_Technical_Architecture.pptx")
    prs.save(out_pptx)
    print(f"Presentation saved successfully to: {out_pptx} (Size: {os.path.getsize(out_pptx):,} bytes)")


if __name__ == "__main__":
    build_technical_deck()

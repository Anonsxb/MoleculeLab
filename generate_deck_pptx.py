"""Script to generate a PowerPoint (.pptx) pitch deck for MoleculeLab
using python-pptx.
Creates a 16:9 widescreen presentation matching the PDF visual structure.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# Brand Color Palette
COLOR_BG = RGBColor(9, 14, 26)         # Deep Navy / Cyber Dark
COLOR_CARD_BG = RGBColor(18, 27, 46)    # Glass Card fill
COLOR_CARD_BORDER = RGBColor(30, 41, 59)
COLOR_CYAN = RGBColor(56, 189, 248)     # Accent Cyan
COLOR_INDIGO = RGBColor(129, 140, 248)  # Accent Indigo
COLOR_EMERALD = RGBColor(52, 211, 153)  # Accent Emerald
COLOR_AMBER = RGBColor(251, 191, 36)    # Accent Amber
COLOR_WHITE = RGBColor(255, 255, 255)   # Title / Heading White
COLOR_MUTED = RGBColor(148, 163, 184)   # Secondary / Subtitle Slate
COLOR_BODY = RGBColor(203, 213, 225)    # Body text
COLOR_DARK_BOX = RGBColor(12, 19, 34)   # Inset box fill

FONT_HEADING = "Trebuchet MS"
FONT_BODY = "Calibri"
FONT_MONO = "Consolas"


def set_slide_background(slide, prs):
    """Adds a full-bleed dark gradient-like background shape."""
    bg = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_BG
    bg.line.fill.background()
    return bg


def add_slide_header(slide, tag_text: str, title_text: str, subtitle_text: str, slide_num: str):
    """Adds a standard MoleculeLab slide header with badge and numbering."""
    # Tag Badge
    badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8), Inches(0.4))
    tf_b = badge_box.text_frame
    tf_b.word_wrap = True
    p_b = tf_b.paragraphs[0]
    p_b.text = f"• {tag_text.upper()}"
    p_b.font.name = FONT_BODY
    p_b.font.size = Pt(10)
    p_b.font.bold = True
    p_b.font.color.rgb = COLOR_CYAN

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(10), Inches(0.7))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = title_text
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(26)
    p_t.font.bold = True
    p_t.font.color.rgb = COLOR_WHITE

    # Subtitle
    if subtitle_text:
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.4), Inches(10), Inches(0.5))
        tf_s = sub_box.text_frame
        tf_s.word_wrap = True
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle_text
        p_s.font.name = FONT_BODY
        p_s.font.size = Pt(13)
        p_s.font.color.rgb = COLOR_MUTED

    # Slide Number Watermark
    num_box = slide.shapes.add_textbox(Inches(11.2), Inches(0.4), Inches(1.5), Inches(0.4))
    tf_n = num_box.text_frame
    p_n = tf_n.paragraphs[0]
    p_n.alignment = PP_ALIGN.RIGHT
    p_n.text = slide_num
    p_n.font.name = FONT_MONO
    p_n.font.size = Pt(11)
    p_n.font.bold = True
    p_n.font.color.rgb = COLOR_MUTED

    # Footer
    foot_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.7), Inches(0.35))
    tf_f = foot_box.text_frame
    p_f = tf_f.paragraphs[0]
    p_f.text = "🧪 MoleculeLab • Next-Gen Molecular Intelligence & 3D Computational Chemistry"
    p_f.font.name = FONT_BODY
    p_f.font.size = Pt(10)
    p_f.font.color.rgb = COLOR_MUTED


def add_card(slide, left, top, width, height, title: str, desc: str, bullets=None, border_color=COLOR_CARD_BORDER, icon_text: str = ""):
    """Helper to draw a styled dark card box with optional bullets."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_CARD_BG
    card.line.color.rgb = border_color
    card.line.width = Pt(1)

    tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), width - Inches(0.4), height - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True

    # Card Title
    p_head = tf.paragraphs[0]
    p_head.text = f"{icon_text} {title}" if icon_text else title
    p_head.font.name = FONT_HEADING
    p_head.font.size = Pt(15)
    p_head.font.bold = True
    p_head.font.color.rgb = COLOR_WHITE
    p_head.space_after = Pt(6)

    # Card Description
    if desc:
        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(11.5)
        p_desc.font.color.rgb = COLOR_MUTED
        p_desc.space_after = Pt(8)

    # Bullets
    if bullets:
        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = f"•  {b}"
            p_b.font.name = FONT_BODY
            p_b.font.size = Pt(11)
            p_b.font.color.rgb = COLOR_BODY
            p_b.space_after = Pt(3)

    return card


def build_pitch_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, prs)

    # Cover Tag
    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.2), Inches(10), Inches(0.4))
    p = tb.text_frame.paragraphs[0]
    p.text = "🧪 MOLECULELAB • INVESTOR & STAKEHOLDER PITCH DECK"
    p.font.name = FONT_BODY
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = COLOR_CYAN

    # Cover Title
    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.6), Inches(11.3), Inches(1.6))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "The Modern 3D Molecular Intelligence &\nComputational Chemistry Platform"
    p.font.name = FONT_HEADING
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = COLOR_WHITE

    # Cover Subtitle
    tb = s1.shapes.add_textbox(Inches(1.0), Inches(3.3), Inches(11.3), Inches(1.0))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = (
        "Bridging the divide between raw chemistry engines and web applications. "
        "MoleculeLab pairs real-time 3D physics with RDKit 2026 industrial cheminformatics "
        "and curated clinical libraries into a zero-install browser platform."
    )
    p.font.name = FONT_BODY
    p.font.size = Pt(15)
    p.font.color.rgb = COLOR_MUTED

    # Cover Stat Boxes
    stat_boxes = [
        ("1,338+", "Curated Compounds (PubChem & ChEMBL)"),
        ("ETKDGv3", "Distance Geometry Conformer Engine"),
        ("MMFF94", "Force-Field Energy Minimization"),
        ("100% Free", "Browser-First & Reproducible"),
    ]
    box_w = Inches(2.7)
    gap = Inches(0.2)
    left_start = Inches(1.0)
    for i, (metric, label) in enumerate(stat_boxes):
        cur_left = left_start + i * (box_w + gap)
        card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cur_left, Inches(4.7), box_w, Inches(1.5))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_BG
        card.line.color.rgb = COLOR_CYAN if i == 0 else COLOR_CARD_BORDER

        tb = s1.shapes.add_textbox(cur_left + Inches(0.15), Inches(4.8), box_w - Inches(0.3), Inches(1.3))
        tf = tb.text_frame
        p_val = tf.paragraphs[0]
        p_val.text = metric
        p_val.font.name = FONT_MONO
        p_val.font.size = Pt(24)
        p_val.font.bold = True
        p_val.font.color.rgb = COLOR_CYAN

        p_lbl = tf.add_paragraph()
        p_lbl.text = label
        p_lbl.font.name = FONT_BODY
        p_lbl.font.size = Pt(11)
        p_lbl.font.color.rgb = COLOR_MUTED
        p_lbl.space_before = Pt(4)

    # Footer
    tb = s1.shapes.add_textbox(Inches(1.0), Inches(6.8), Inches(11.3), Inches(0.4))
    p = tb.text_frame.paragraphs[0]
    p.text = "MoleculeLab Core Team • Built for Universities, Early-Stage Biotech & Chemical Researchers"
    p.font.name = FONT_BODY
    p.font.size = Pt(11)
    p.font.color.rgb = COLOR_MUTED

    # ==========================================
    # SLIDE 2: THE PROBLEM
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, prs)
    add_slide_header(
        s2,
        "The Status Quo Challenge",
        "Chemistry is Trapped in 1990s Desktop Software",
        "Modern researchers and students are held back by fragmented, high-friction, unrepeatable legacy tooling.",
        "02 / PROBLEM"
    )

    card_w = Inches(3.64)
    gap = Inches(0.38)
    top = Inches(2.1)
    h = Inches(4.5)

    add_card(
        s2, Inches(0.8), top, card_w, h,
        "Bulky Desktop Silos",
        "Legacy desktop programs (Avogadro, PyMOL, ChemDraw) require workstation installs, local C++ compilation, and steep learning curves.",
        bullets=[
            "Zero browser accessibility on Chromebooks & tablets",
            "Complex cross-platform installation hurdles",
            "Steep learning curves alienate chemistry students",
            "Zero real-time collaboration or live sharing"
        ],
        icon_text="🖥️"
    )

    add_card(
        s2, Inches(0.8) + (card_w + gap), top, card_w, h,
        "Fragmented Tooling",
        "Scientists must juggle 4–5 disjointed apps: one to sketch 2D, one to embed 3D, one to calculate Lipinski rules, and another to plot stats.",
        bullets=[
            "Endless manual copy-pasting of SMILES codes",
            "No unified multi-compound comparison workflow",
            "Severe context-switching penalties kill velocity",
            "High software license fees ($10k+/seat/year)"
        ],
        icon_text="⚠️",
        border_color=COLOR_AMBER
    )

    add_card(
        s2, Inches(0.8) + 2 * (card_w + gap), top, card_w, h,
        "Data Quality Blindspots",
        "Existing web tools silently drop malformed chemical structures, provide unverified black-box numbers, and lack auditable provenance.",
        bullets=[
            "Unrepeatable ad-hoc calculations",
            "Missing vs. zero vs. invalid states conflated",
            "No backlinks to authoritative PubChem/ChEMBL sources",
            "Fragile ingestion pipelines in biotech labs"
        ],
        icon_text="📉"
    )

    # ==========================================
    # SLIDE 3: THE SOLUTION
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, prs)
    add_slide_header(
        s3,
        "The MoleculeLab Solution",
        "An All-in-One Cloud Molecular Operating System",
        "Bringing industrial-strength computational chemistry and interactive 3D physics directly into the web browser.",
        "03 / SOLUTION"
    )

    card_w2 = Inches(5.65)
    gap2 = Inches(0.4)
    top2 = Inches(2.1)
    h2 = Inches(4.5)

    add_card(
        s3, Inches(0.8), top2, card_w2, h2,
        "Zero-Install, High-Performance Web Access",
        "MoleculeLab runs instantly on any device with a modern browser. It couples a responsive Next.js 16 / React 19 UI with a robust FastAPI computational chemistry engine.",
        bullets=[
            "Sub-100ms API descriptor response latency",
            "60 FPS hardware-accelerated 3D WebGL rendering via Three.js",
            "Responsive across laptops, tablets, and interactive lecture displays",
            "Guided tour walkthroughs and ergonomic keyboard shortcuts",
            "Transparent Lipinski Rule-of-Five compliance scoring"
        ],
        icon_text="⚡",
        border_color=COLOR_CYAN
    )

    add_card(
        s3, Inches(0.8) + card_w2 + gap2, top2, card_w2, h2,
        "Avogadro-Grade Computational Physics in WebGL",
        "Far beyond static 2D images. MoleculeLab delivers true 3D spatial conformer generation (ETKDGv3), force field energy minimization (MMFF94/UFF), and Gasteiger partial charges.",
        bullets=[
            "Distance geometry embedding with hydrogen saturation",
            "Real-time potential energy delta calculations (kcal/mol)",
            "Atomic electrostatic potential & CPK color mapping",
            "Interactive click-to-measure bond distances, angles & torsions",
            "Direct research file export: PDB, XYZ, SDF, and MOL"
        ],
        icon_text="🔬",
        border_color=COLOR_EMERALD
    )

    # ==========================================
    # SLIDE 4: WHAT WE ARE CREATING (5 PILLARS)
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, prs)
    add_slide_header(
        s4,
        "Product Architecture",
        "What We Are Building: The 5 Core Pillars",
        "A modular, tightly integrated software suite designed for end-to-end chemical discovery and education.",
        "04 / PILLARS"
    )

    pillars = [
        ("1. 3D Studio", "Three.js + RDKit", "Real-time 3D conformer generation, hydrogen saturation, MMFF94 energy minimization, and electrostatic charges.", "🧊"),
        ("2. Molecule DB", "PostgreSQL / SQLite", "1,338 vetted compounds (PubChem + ChEMBL) with sub-second fuzzy search and live provenance links.", "📚"),
        ("3. Chemistry Core", "RDKit 2026.9.1", "Server-side SMILES canonicalization, 2D depiction, and full-precision Lipinski Rule of 5 descriptors.", "🧪"),
        ("4. Analytics & Diff", "Recharts + Stats", "Side-by-side 2–4 molecule comparison, property variance tables, scatter matrices, and histograms.", "📊"),
        ("5. Ingestion Engine", "FastAPI + Alembic", "CSV batch upload preview, syntax/valence error diagnosis, duplicate detection, and reproducible CSV export.", "📥"),
    ]

    p_w = Inches(2.22)
    p_gap = Inches(0.15)
    for i, (title, stack, desc, icon) in enumerate(pillars):
        c_left = Inches(0.8) + i * (p_w + p_gap)
        card = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left, Inches(2.1), p_w, Inches(4.5))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_BG
        card.line.color.rgb = COLOR_CYAN if i == 0 else COLOR_CARD_BORDER

        tb = s4.shapes.add_textbox(c_left + Inches(0.15), Inches(2.3), p_w - Inches(0.3), Inches(4.1))
        tf = tb.text_frame
        tf.word_wrap = True

        p_ic = tf.paragraphs[0]
        p_ic.text = icon
        p_ic.font.size = Pt(28)
        p_ic.space_after = Pt(8)

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.name = FONT_HEADING
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_WHITE
        p_t.space_after = Pt(4)

        p_stk = tf.add_paragraph()
        p_stk.text = stack
        p_stk.font.name = FONT_MONO
        p_stk.font.size = Pt(9.5)
        p_stk.font.color.rgb = COLOR_CYAN
        p_stk.space_after = Pt(10)

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.name = FONT_BODY
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = COLOR_MUTED

    # ==========================================
    # SLIDE 5: 3D STUDIO DEEP DIVE
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, prs)
    add_slide_header(
        s5,
        "Flagship Innovation",
        "3D Molecular Studio: Physics & Conformer Engine",
        "Bringing desktop-grade quantum/molecular mechanics calculation to the web browser.",
        "05 / 3D STUDIO"
    )

    add_card(
        s5, Inches(0.8), Inches(2.1), card_w2, Inches(4.5),
        "Computational Chemistry Pipeline",
        "Every SMILES input passes through a rigorous server-side physics pipeline before rendering in Three.js:",
        bullets=[
            "Explicit Hydrogen Saturation: Restores full-atom topology for stereochemical and steric accuracy.",
            "ETKDGv3 Distance Geometry: Embeds realistic 3D spatial conformers using experimental torsion rules.",
            "MMFF94 / UFF Energy Minimization: Computes potential energy deltas (kcal/mol) and optimization convergence.",
            "Gasteiger Partial Charges: Calculates atomic electrostatics for nucleophilic/electrophilic reactivity mapping.",
            "Structural Derivation: Automatically computes internal bond lengths, bond angles, and dihedral angles."
        ],
        icon_text="🔬",
        border_color=COLOR_CYAN
    )

    add_card(
        s5, Inches(0.8) + card_w2 + gap2, Inches(2.1), card_w2, Inches(4.5),
        "Interactive Studio Tools & Research Export",
        "Equipping researchers with hands-on geometric interrogation and standard quantum chemistry export:",
        bullets=[
            "Bond Geometry Measurement: Interactive click-to-measure bond distances (Å), angles (°), and torsions.",
            "Multiple Visualization Modes: Ball & Stick, Space-Filling (CPK), Licorice, Wireframe, and Electrostatic mapping.",
            "Universal Research Export: One-click export to PDB, XYZ, SDF, and MOL files for ORCA, Gaussian, or Q-Chem.",
            "High-Resolution Snapshots: Real-time PNG capture with transparent background for publication figures.",
            "Camera Controls: Seamless perspective/orthographic toggle and smooth auto-rotation."
        ],
        icon_text="🎨",
        border_color=COLOR_INDIGO
    )

    # ==========================================
    # SLIDE 6: DATASETS & PROVENANCE
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, prs)
    add_slide_header(
        s6,
        "Scientific Rigor",
        "Curated Datasets & Auditable Provenance",
        "1,338 vetted chemical structures with direct links back to public reference repositories.",
        "06 / PROVENANCE"
    )

    add_card(
        s6, Inches(0.8), Inches(2.1), card_w2, Inches(3.2),
        "1. Educational Common Compounds (PubChem)",
        "181 foundational chemical compounds selected for university chemistry curriculum, functional group study, and stereochemical analysis.",
        bullets=[
            "Source: PubChem, National Institutes of Health (NIH)",
            "Traceability: Every record stores PubChem CID with live external backlink",
            "Reproducibility: Scripted via backend/scripts/fetch_pubchem.py",
            "100% curated with 2D depictions and descriptor models"
        ],
        icon_text="🧪",
        border_color=COLOR_EMERALD
    )

    add_card(
        s6, Inches(0.8) + card_w2 + gap2, Inches(2.1), card_w2, Inches(3.2),
        "2. Approved Therapeutics Extract (ChEMBL)",
        "1,157 approved small-molecule drugs with verified clinical Phase 4 status and full pharmacological classification.",
        bullets=[
            "Source: ChEMBL, European Bioinformatics Institute (EMBL-EBI)",
            "Traceability: ChEMBL ID stored on every compound with Report Card links",
            "Reproducibility: Scripted via backend/scripts/fetch_chembl.py",
            "Structures that exist in both datasets are linked, never duplicated"
        ],
        icon_text="💊",
        border_color=COLOR_INDIGO
    )

    # Standard Banner
    banner = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.5), Inches(11.7), Inches(1.1))
    banner.fill.solid()
    banner.fill.fore_color.rgb = COLOR_DARK_BOX
    banner.line.color.rgb = COLOR_CARD_BORDER

    tb = s6.shapes.add_textbox(Inches(1.0), Inches(5.6), Inches(11.3), Inches(0.9))
    tf = tb.text_frame
    p1 = tf.paragraphs[0]
    p1.text = "🛡️ The MoleculeLab Scientific Standard:"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(13)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_CYAN

    p2 = tf.add_paragraph()
    p2.text = (
        "Missing values, invalid structures, exact duplicate inputs, and identical canonical structures are 4 strictly distinguished states. "
        "All descriptors are computed server-side via RDKit at full float precision; no external black-box numbers are imported."
    )
    p2.font.name = FONT_BODY
    p2.font.size = Pt(11)
    p2.font.color.rgb = COLOR_MUTED

    # ==========================================
    # SLIDE 7: DEEP ANALYTICS & COMPARISON
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, prs)
    add_slide_header(
        s7,
        "Comparative Intelligence",
        "Multi-Molecule Diffing & Population Analytics",
        "Transforming isolated molecular records into rich population distributions and comparative discovery.",
        "07 / ANALYTICS"
    )

    add_card(
        s7, Inches(0.8), top, card_w, h,
        "Side-by-Side Diff Engine",
        "Compare 2 to 4 molecules simultaneously. MoleculeLab automatically calculates descriptor deltas and highlights divergence.",
        bullets=[
            "Automated delta computation vs reference compound",
            "Instant Lipinski Rule-of-Five compliance scoring",
            "Highlighting significant shifts in lipophilicity & polar area",
            "Side-by-side 2D chemical structure alignment"
        ],
        icon_text="⚖️",
        border_color=COLOR_CYAN
    )

    add_card(
        s7, Inches(0.8) + (card_w + gap), top, card_w, h,
        "Dynamic Scatter Matrices",
        "Explore multi-dimensional relationships across 1,300+ compounds in real-time using responsive Recharts visualization.",
        bullets=[
            "Plot Molecular Weight vs. Crippen LogP",
            "Analyze TPSA vs. Hydrogen Bond Donors",
            "Interactive tooltips with live molecular previews",
            "Dataset-specific filtering (PubChem vs ChEMBL)"
        ],
        icon_text="📈",
        border_color=COLOR_EMERALD
    )

    add_card(
        s7, Inches(0.8) + 2 * (card_w + gap), top, card_w, h,
        "Distribution Histograms",
        "Statistical profiling of chemical libraries with automated binning, median overlays, and standard deviation callouts.",
        bullets=[
            "Parametric distribution across approved therapeutics",
            "Outlier detection and chemical space boundary mapping",
            "Instant summary statistics (min/max/mean/median)",
            "One-click export of filtered CSV datasets"
        ],
        icon_text="📊",
        border_color=COLOR_INDIGO
    )

    # ==========================================
    # SLIDE 8: TARGET AUDIENCE & USE CASES
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, prs)
    add_slide_header(
        s8,
        "Market Opportunity",
        "Who MoleculeLab is For: Key Use Cases",
        "Addressing acute friction points across university education, early-stage biotech, and cheminformatics.",
        "08 / MARKET"
    )

    card_w4 = Inches(2.76)
    gap4 = Inches(0.22)
    top4 = Inches(2.1)
    h4 = Inches(4.5)

    add_card(
        s8, Inches(0.8), top4, card_w4, h4,
        "Academic & Higher Ed",
        "Chemistry and biochemistry university courses teaching organic chemistry, stereocenters, and medicinal drug design.",
        bullets=[
            "Zero installation for students",
            "Interactive 3D geometry labs",
            "Works on Chromebooks & Macs",
            "Replaces costly desktop licenses"
        ],
        icon_text="🎓"
    )

    add_card(
        s8, Inches(0.8) + (card_w4 + gap4), top4, card_w4, h4,
        "Biotech Startups",
        "Pre-clinical biotechnology teams conducting rapid small-molecule lead screening and Lipinski rule-of-five triage.",
        bullets=[
            "Fast conformer sanity checks",
            "CSV library batch validation",
            "Fraction of enterprise tool cost",
            "Audit-ready data provenance"
        ],
        icon_text="💊",
        border_color=COLOR_EMERALD
    )

    add_card(
        s8, Inches(0.8) + 2 * (card_w4 + gap4), top4, card_w4, h4,
        "AI & ML Chem Teams",
        "Machine learning scientists developing generative chemistry models who need instant visual and computational validation.",
        bullets=[
            "SMILES syntax & valence checker",
            "3D geometry verification",
            "Automated REST API integration",
            "Synthetic feasibility triage"
        ],
        icon_text="🤖",
        border_color=COLOR_INDIGO
    )

    add_card(
        s8, Inches(0.8) + 3 * (card_w4 + gap4), top4, card_w4, h4,
        "Materials Science",
        "Polymer chemists and materials engineers examining molecular dipole moments, partial charges, and steric packing.",
        bullets=[
            "Gasteiger charge mapping",
            "PDB/XYZ/SDF file export",
            "Bond angle & dihedral metrics",
            "Force-field stability analysis"
        ],
        icon_text="🧪",
        border_color=COLOR_AMBER
    )

    # ==========================================
    # SLIDE 9: TECHNICAL ARCHITECTURE
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, prs)
    add_slide_header(
        s9,
        "Engineering Excellence",
        "Modern, Resilient Full-Stack Technology",
        "Built with type-safe, high-performance technologies for sub-100ms response times.",
        "09 / TECH STACK"
    )

    add_card(
        s9, Inches(0.8), top, card_w, h,
        "Next.js 16 & React 19",
        "Next-generation App Router frontend with TypeScript 5, server-side caching, and hardware-accelerated WebGL.",
        bullets=[
            "Three.js 3D viewport rendering at 60 FPS",
            "Recharts reactive SVG data analytics",
            "Accessible, keyboard-driven UI",
            "Cyber-lab dark mode aesthetic",
            "Zero client-side bloated chemistry engines"
        ],
        icon_text="⚛️",
        border_color=COLOR_CYAN
    )

    add_card(
        s9, Inches(0.8) + (card_w + gap), top, card_w, h,
        "FastAPI & Python 3.10+",
        "Asynchronous, typed API engine with Pydantic v2 validation contracts and structured OpenAPI documentation.",
        bullets=[
            "Sub-100ms response latency",
            "Structured chemistry error handling",
            "Automated Swagger & ReDoc specs",
            "48+ automated Pytest unit tests",
            "Alembic database migrations"
        ],
        icon_text="⚡",
        border_color=COLOR_EMERALD
    )

    add_card(
        s9, Inches(0.8) + 2 * (card_w + gap), top, card_w, h,
        "RDKit 2026 Chemistry Core",
        "The gold standard in computational chemistry, running server-side for deterministic, full-precision calculation.",
        bullets=[
            "ETKDGv3 3D conformer embedding",
            "MMFF94 / UFF force field minimization",
            "Gasteiger atomic partial charges",
            "Canonical SMILES & 2D SVG depiction",
            "Crippen LogP & TPSA calculators"
        ],
        icon_text="🧬",
        border_color=COLOR_INDIGO
    )

    # ==========================================
    # SLIDE 10: COMPETITIVE ADVANTAGE
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, prs)
    add_slide_header(
        s10,
        "Competitive Matrix",
        "Why MoleculeLab Stands Out",
        "Combining the accessibility of the modern web with the rigor of desktop workstations.",
        "10 / COMPETITION"
    )

    # Add Table
    rows = 7
    cols = 5
    t_left = Inches(0.8)
    t_top = Inches(2.1)
    t_w = Inches(11.7)
    t_h = Inches(4.5)

    table_shape = s10.shapes.add_table(rows, cols, t_left, t_top, t_w, t_h)
    table = table_shape.table

    # Column widths
    table.columns[0].width = Inches(3.2)
    table.columns[1].width = Inches(2.3)
    table.columns[2].width = Inches(2.1)
    table.columns[3].width = Inches(2.0)
    table.columns[4].width = Inches(2.1)

    headers = [
        "Feature / Capability",
        "🧪 MoleculeLab",
        "Desktop (Avogadro/PyMOL)",
        "Basic Web (MolView/PubChem)",
        "Enterprise (Schrödinger)"
    ]
    for c, h_text in enumerate(headers):
        cell = table.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = COLOR_CARD_BG if c != 1 else RGBColor(14, 30, 54)
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.name = FONT_HEADING
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = COLOR_CYAN if c == 1 else COLOR_WHITE

    matrix_data = [
        ("Zero-Install Web Access", "YES (Instant WebGL)", "NO (Workstation Install)", "YES", "NO (Local Server/Client)"),
        ("3D Force-Field Minimization", "YES (MMFF94 / UFF)", "YES", "NO / Basic", "YES"),
        ("RDKit 2026 Engine Backend", "YES (Full Precision)", "Plugin Dependent", "NO (JS Approximation)", "Proprietary Closed"),
        ("Curated 1,300+ Compound DB", "YES (PubChem/ChEMBL)", "NO (Bring Your Own)", "Static Search", "Requires Add-on License"),
        ("Multi-Compound Diffing", "YES (2–4 Side-by-Side)", "NO", "NO", "YES (Complex Setup)"),
        ("Cost & Accessibility", "FREE / Cloud-Native", "Free, but complex", "Free", "$10,000+ / seat / year"),
    ]

    for r, row_values in enumerate(matrix_data):
        for c, val in enumerate(row_values):
            cell = table.cell(r + 1, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = COLOR_DARK_BOX if c != 1 else RGBColor(16, 26, 48)
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.name = FONT_BODY
            p.font.size = Pt(10.5)
            if c == 1:
                p.font.bold = True
                p.font.color.rgb = COLOR_EMERALD if "YES" in val or "FREE" in val else COLOR_CYAN
            elif "YES" in val:
                p.font.color.rgb = COLOR_EMERALD
            elif "NO" in val or "$10,000" in val:
                p.font.color.rgb = RGBColor(248, 113, 113)
            else:
                p.font.color.rgb = COLOR_MUTED

    # ==========================================
    # SLIDE 11: STRATEGIC ROADMAP
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, prs)
    add_slide_header(
        s11,
        "Future Horizon",
        "Product Roadmap & Strategic Milestones",
        "Clear trajectory from core computational engine to collaborative enterprise molecular OS.",
        "11 / ROADMAP"
    )

    add_card(
        s11, Inches(0.8), top, card_w, h,
        "Phase 1: Foundation (Current)",
        "Core computational chemistry workstation fully implemented and validated.",
        bullets=[
            "RDKit 2026 backend & Lipinski descriptor engine",
            "Interactive 3D Three.js Studio with MMFF94/UFF",
            "1,338 vetted PubChem & ChEMBL molecules",
            "Side-by-side comparative analytics & radar",
            "Batch CSV ingestion with dry-run validation",
            "48 passing automated Pytest suites"
        ],
        icon_text="✅",
        border_color=COLOR_EMERALD
    )

    add_card(
        s11, Inches(0.8) + (card_w + gap), top, card_w, h,
        "Phase 2: AI & Active Modeling",
        "Expanding into active chemical generation, drawing, and docking prediction (Q1-Q2 2027).",
        bullets=[
            "AI-assisted SMILES generation & scaffold hopping",
            "Interactive 2D chemical drawing canvas (JSME/Kekule)",
            "AutoDock Vina ligand-receptor docking scores",
            "Substructure & similarity clustering algorithms",
            "Bioavailability & ADMET property prediction"
        ],
        icon_text="🚀",
        border_color=COLOR_CYAN
    )

    add_card(
        s11, Inches(0.8) + 2 * (card_w + gap), top, card_w, h,
        "Phase 3: Cloud Collaboration",
        "Scale into enterprise multi-user chemical research workspaces (Q3-Q4 2027).",
        bullets=[
            "Multi-user real-time chemical project rooms",
            "AlphaFold & ESMFold protein complex rendering",
            "High-throughput batch conformer cloud compute",
            "Enterprise SSO & team audit logs",
            "Direct integration with Electronic Lab Notebooks"
        ],
        icon_text="🌐",
        border_color=COLOR_INDIGO
    )

    # ==========================================
    # SLIDE 12: VISION & CALL TO ACTION
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, prs)
    add_slide_header(
        s12,
        "The Future of Discovery",
        "Join Us in Transforming Molecular Science",
        "Democratizing supercomputer-grade chemistry tools for every researcher and student on Earth.",
        "12 / VISION"
    )

    add_card(
        s12, Inches(0.8), top2, card_w2, h2,
        "Democratizing Molecular Discovery",
        "\"Every discovery in medicine and materials begins with a single molecule.\"\n\nMoleculeLab eliminates the software barrier that separates great scientific ideas from real computational insights. By uniting 3D physics, rigorous cheminformatics, and frictionless web delivery, we empower the next generation of scientific breakthroughs.",
        bullets=[
            "Production-ready modern architecture",
            "Open source foundation & active development",
            "Built for academic curriculum & biotech discovery",
            "Scalable from classroom laptops to research cloud"
        ],
        icon_text="🌟",
        border_color=COLOR_CYAN
    )

    add_card(
        s12, Inches(0.8) + card_w2 + gap2, top2, card_w2, h2,
        "Get Involved & Partnership Opportunities",
        "We are actively seeking strategic partners to accelerate adoption and expand scientific impact:",
        bullets=[
            "Academic Pilots: Deploy MoleculeLab across university chemistry & biochemistry departments.",
            "Biotech Accelerators: Equip early-stage discovery teams with modern computational screening tools on day zero.",
            "Developer Community: Collaborate on RDKit pipelines, AI models, and open computational algorithms.",
            "GitHub Repository: https://github.com/Anonsxb/MoleculeLab",
            "Interactive Swagger / ReDoc API: http://127.0.0.1:8000/docs"
        ],
        icon_text="🤝",
        border_color=COLOR_EMERALD
    )

    # Save presentation
    out_pptx = os.path.abspath("MoleculeLab_Pitch_Deck.pptx")
    prs.save(out_pptx)
    print(f"Presentation saved successfully to: {out_pptx} (Size: {os.path.getsize(out_pptx):,} bytes)")


if __name__ == "__main__":
    build_pitch_deck()

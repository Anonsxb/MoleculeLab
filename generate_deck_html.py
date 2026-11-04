import os
import sys
import subprocess
import shutil
import tempfile

def create_presentation_html() -> str:
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MoleculeLab — Pitch Deck</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  @page {
    size: 16in 9in;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: #070d18;
    color: #f1f5f9;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .slide {
    width: 16in;
    height: 9in;
    max-width: 16in;
    max-height: 9in;
    padding: 0.75in 0.9in;
    page-break-after: always;
    page-break-inside: avoid;
    position: relative;
    overflow: hidden;
    background: radial-gradient(circle at 85% 15%, rgba(6, 182, 212, 0.14) 0%, transparent 50%),
                radial-gradient(circle at 15% 85%, rgba(99, 102, 241, 0.12) 0%, transparent 45%),
                linear-gradient(135deg, #090e1a 0%, #0c1424 50%, #080d1a 100%);
    display: flex;
    flex-direction: column;
  }

  /* Decorative grid overlay */
  .slide::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 1;
  }

  .content-layer {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Header styles */
  .slide-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.35in;
  }

  .tagline-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 9999px;
    background: rgba(6, 182, 212, 0.12);
    border: 1px solid rgba(6, 182, 212, 0.35);
    color: #38bdf8;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .slide-title {
    font-size: 40px;
    font-weight: 800;
    line-height: 1.15;
    color: #ffffff;
    letter-spacing: -0.8px;
  }

  .slide-title span.highlight {
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .slide-subtitle {
    font-size: 17px;
    color: #94a3b8;
    margin-top: 6px;
    font-weight: 400;
    max-width: 900px;
  }

  .slide-watermark {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #475569;
    font-size: 14px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Footer */
  .slide-footer {
    margin-top: auto;
    padding-top: 0.25in;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
  }

  .slide-footer .logo-mark {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-weight: 700;
  }

  /* Cards and Grids */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35in;
    flex: 1;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.3in;
    flex: 1;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.25in;
    flex: 1;
  }

  .card {
    background: rgba(18, 27, 46, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  .card.featured {
    border-color: rgba(56, 189, 248, 0.4);
    background: linear-gradient(145deg, rgba(14, 30, 54, 0.85) 0%, rgba(18, 27, 46, 0.7) 100%);
    box-shadow: 0 10px 30px -5px rgba(6, 182, 212, 0.15);
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 16px;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    color: #38bdf8;
  }

  .card-icon.purple {
    background: rgba(168, 85, 247, 0.1);
    border-color: rgba(168, 85, 247, 0.25);
    color: #c084fc;
  }

  .card-icon.emerald {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.25);
    color: #34d399;
  }

  .card-icon.amber {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.25);
    color: #fbbf24;
  }

  .card-title {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 10px;
  }

  .card-desc {
    font-size: 14.5px;
    color: #94a3b8;
    line-height: 1.55;
  }

  .card-bullets {
    margin-top: 14px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-bullets li {
    font-size: 13.5px;
    color: #cbd5e1;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.45;
  }

  .card-bullets li::before {
    content: "•";
    color: #38bdf8;
    font-weight: bold;
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
  }

  /* Metric chips */
  .metric-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 14px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
  }

  .metric-value {
    font-size: 20px;
    font-weight: 800;
    color: #38bdf8;
  }

  .metric-label {
    font-size: 12px;
    color: #94a3b8;
  }

  /* Table styling */
  .table-custom {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(18, 27, 46, 0.6);
  }

  .table-custom th {
    background: rgba(15, 23, 42, 0.9);
    padding: 14px 18px;
    text-align: left;
    font-size: 14px;
    font-weight: 700;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    letter-spacing: 0.5px;
  }

  .table-custom td {
    padding: 13px 18px;
    font-size: 14px;
    color: #94a3b8;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .table-custom tr:last-child td {
    border-bottom: none;
  }

  .table-custom tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }

  .badge-yes {
    color: #34d399;
    background: rgba(16, 185, 129, 0.15);
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 12px;
    display: inline-block;
  }

  .badge-no {
    color: #f87171;
    background: rgba(239, 68, 68, 0.12);
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
    display: inline-block;
  }

  .badge-partial {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.12);
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
    display: inline-block;
  }

  /* Cover Slide Custom */
  .cover-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
  }

  .cover-logo {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .cover-logo-icon {
    width: 68px;
    height: 68px;
    border-radius: 18px;
    background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    box-shadow: 0 0 35px rgba(14, 165, 233, 0.45);
  }

  .cover-title {
    font-size: 64px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.05;
    letter-spacing: -1.5px;
    margin-bottom: 16px;
  }

  .cover-title .highlight-text {
    background: linear-gradient(135deg, #38bdf8 0%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }

  .cover-desc {
    font-size: 22px;
    color: #94a3b8;
    max-width: 960px;
    line-height: 1.5;
    margin-bottom: 40px;
  }

  .cover-stats-row {
    display: flex;
    gap: 20px;
    margin-top: 10px;
  }

  .cover-stat-box {
    background: rgba(18, 27, 46, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 18px 24px;
    min-width: 220px;
    backdrop-filter: blur(10px);
  }

  .cover-stat-num {
    font-size: 32px;
    font-weight: 800;
    color: #38bdf8;
    font-family: 'JetBrains Mono', monospace;
  }

  .cover-stat-text {
    font-size: 13.5px;
    color: #94a3b8;
    margin-top: 4px;
    font-weight: 500;
  }

  /* Code pill */
  .code-pill {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #38bdf8;
    display: inline-block;
  }
</style>
</head>
<body>

<!-- SLIDE 1: COVER -->
<section class="slide">
  <div class="content-layer">
    <div class="cover-container">
      <div class="cover-logo">
        <div class="cover-logo-icon">🧪</div>
        <div>
          <div class="tagline-badge">Pitch Deck • Computational Chemistry & Molecular Intelligence</div>
          <div style="font-size: 18px; color: #94a3b8; font-weight: 600;">Democratizing Molecular Discovery</div>
        </div>
      </div>
      <h1 class="cover-title">MoleculeLab <span class="highlight-text">3D Intelligence</span></h1>
      <p class="cover-desc">
        A unified, browser-native computational chemistry workstation. Combining real-time 3D conformer physics,
        RDKit 2026 industrial cheminformatics, and curated clinical compound intelligence into a zero-install experience.
      </p>
      
      <div class="cover-stats-row">
        <div class="cover-stat-box">
          <div class="cover-stat-num">1,338+</div>
          <div class="cover-stat-text">Vetted Molecular Structures</div>
        </div>
        <div class="cover-stat-box">
          <div class="cover-stat-num">ETKDGv3</div>
          <div class="cover-stat-text">Distance Geometry 3D Engine</div>
        </div>
        <div class="cover-stat-box">
          <div class="cover-stat-num">MMFF94</div>
          <div class="cover-stat-text">Force-Field Energy Minimization</div>
        </div>
        <div class="cover-stat-box">
          <div class="cover-stat-num">100%</div>
          <div class="cover-stat-text">Browser-First & Reproducible</div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Confidential & Proprietary Pitch</div>
      <div>Designed for Next-Generation Scientists, Educators & Biotech Innovators</div>
    </div>
  </div>
</section>

<!-- SLIDE 2: THE PROBLEM -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">The Status Quo Challenge</div>
        <h2 class="slide-title">Chemistry is Trapped in <span class="highlight">1990s Desktop Software</span></h2>
        <p class="slide-subtitle">Modern researchers and students are held back by fragmented, high-friction, unrepeatable legacy tooling.</p>
      </div>
      <div class="slide-watermark">02 / PROBLEM</div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-icon">🖥️</div>
        <h3 class="card-title">Bulky Desktop Silos</h3>
        <p class="card-desc">
          Tools like Avogadro, PyMOL, and ChemDraw require local installations, complex C++ dependencies, and expensive workstation licenses. They are inaccessible on Chromebooks, tablets, or cloud setups.
        </p>
        <ul class="card-bullets">
          <li>Platform incompatibilities & install hurdles</li>
          <li>Steep learning curves for students</li>
          <li>Zero real-time collaboration</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon amber">⚠️</div>
        <h3 class="card-title">Fragmented Workflows</h3>
        <p class="card-desc">
          Cheminformatics requires 4–5 disconnected apps: one to draw SMILES, another to optimize 3D conformers, a third to calculate Lipinski descriptors, and a fourth to plot comparative statistics.
        </p>
        <ul class="card-bullets">
          <li>Disjointed copy-pasting of SMILES strings</li>
          <li>Lack of unified multi-compound comparison</li>
          <li>Context switching kills research velocity</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon purple">📉</div>
        <h3 class="card-title">Black-Box Data & Zero Provenance</h3>
        <p class="card-desc">
          Existing web widgets silently drop malformed chemical structures, provide unverified black-box numbers, and fail to track provenance back to authoritative repositories like PubChem or ChEMBL.
        </p>
        <ul class="card-bullets">
          <li>Unrepeatable ad-hoc calculations</li>
          <li>No distinction between zero vs missing data</li>
          <li>Broken data pipelines in early biotech labs</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Problem Overview</div>
      <div>Eliminating friction in molecular science workflows</div>
    </div>
  </div>
</section>

<!-- SLIDE 3: THE SOLUTION -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">The MoleculeLab Solution</div>
        <h2 class="slide-title">An All-in-One <span class="highlight">Cloud Molecular Operating System</span></h2>
        <p class="slide-subtitle">Bringing industrial-strength computational chemistry and interactive 3D physics directly into the browser.</p>
      </div>
      <div class="slide-watermark">03 / SOLUTION</div>
    </div>

    <div class="grid-2">
      <div class="card featured">
        <div class="card-icon">⚡</div>
        <h3 class="card-title">Zero Installation, Maximum Power</h3>
        <p class="card-desc">
          MoleculeLab runs instantly on any device with a modern web browser. It pairs a lightning-fast Next.js 16 / React 19 frontend with a hardened FastAPI backend orchestrating RDKit 2026.
        </p>
        <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="metric-badge">
            <span class="metric-value">&lt; 100ms</span>
            <span class="metric-label">API Descriptor Latency</span>
          </div>
          <div class="metric-badge">
            <span class="metric-value">60 FPS</span>
            <span class="metric-label">3D WebGL Rendering</span>
          </div>
        </div>
        <ul class="card-bullets" style="margin-top: 16px;">
          <li>Responsive on mobile, tablet, laptop, and ultra-wide monitors</li>
          <li>Complete keyboard shortcut navigation and guided walkthroughs</li>
          <li>Automatic 2D depiction & Lipinski drug-likeness compliance triage</li>
        </ul>
      </div>

      <div class="card featured">
        <div class="card-icon emerald">🔬</div>
        <h3 class="card-title">Avogadro-Grade Computational Physics in WebGL</h3>
        <p class="card-desc">
          Not just a static 2D viewer. MoleculeLab dynamically generates 3D conformers using distance geometry (ETKDGv3), computes force-field energy minimization (MMFF94/UFF), and calculates electrostatic Gasteiger partial charges.
        </p>
        <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="metric-badge">
            <span class="metric-value">MMFF94</span>
            <span class="metric-label">Force-Field Geometry</span>
          </div>
          <div class="metric-badge">
            <span class="metric-value">ETKDGv3</span>
            <span class="metric-label">Distance Geometry</span>
          </div>
        </div>
        <ul class="card-bullets" style="margin-top: 16px;">
          <li>Interactive bond distance, angle, and dihedral torsion inspection</li>
          <li>Direct computational chemistry export: PDB, XYZ, SDF/MOL</li>
          <li>Gasteiger partial charge calculation for nucleophilic surface analysis</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Solution Architecture</div>
      <div>Unified, accessible, scientifically validated</div>
    </div>
  </div>
</section>

<!-- SLIDE 4: WHAT WE ARE CREATING (5 PILLARS) -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Product Architecture</div>
        <h2 class="slide-title">What We Are Building: <span class="highlight">The 5 Core Pillars</span></h2>
        <p class="slide-subtitle">A modular, tightly integrated software suite designed for end-to-end chemical discovery.</p>
      </div>
      <div class="slide-watermark">04 / PILLARS</div>
    </div>

    <div class="grid-4" style="grid-template-columns: repeat(5, 1fr); gap: 16px;">
      <div class="card">
        <div class="card-icon">🧊</div>
        <h3 class="card-title" style="font-size: 17px; margin-bottom: 6px;">1. 3D Studio</h3>
        <div class="code-pill" style="margin-bottom: 12px;">Three.js + RDKit</div>
        <p class="card-desc" style="font-size: 13px;">
          Full 3D WebGL viewport with real-time physics simulation and geometry tools.
        </p>
        <ul class="card-bullets" style="margin-top: 14px; font-size: 12.5px;">
          <li>ETKDGv3 Conformer Embedding</li>
          <li>MMFF94 Energy Minimization</li>
          <li>Gasteiger Charge Electrostatics</li>
          <li>PDB / XYZ / SDF File Export</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon purple">📚</div>
        <h3 class="card-title" style="font-size: 17px; margin-bottom: 6px;">2. Molecule DB</h3>
        <div class="code-pill" style="margin-bottom: 12px;">PostgreSQL / SQLite</div>
        <p class="card-desc" style="font-size: 13px;">
          1,338 curated compounds with sub-second search and reference audit trail.
        </p>
        <ul class="card-bullets" style="margin-top: 14px; font-size: 12.5px;">
          <li>181 PubChem Common Compounds</li>
          <li>1,157 ChEMBL Approved Drugs</li>
          <li>Fuzzy & Molecular Formula Search</li>
          <li>Direct Reference Backlinks</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon emerald">🧪</div>
        <h3 class="card-title" style="font-size: 17px; margin-bottom: 6px;">3. Chemistry Core</h3>
        <div class="code-pill" style="margin-bottom: 12px;">RDKit 2026.9.1</div>
        <p class="card-desc" style="font-size: 13px;">
          Server-side chemistry computation with zero approximations.
        </p>
        <ul class="card-bullets" style="margin-top: 14px; font-size: 12.5px;">
          <li>SMILES Syntax & Valence Checking</li>
          <li>Canonical SMILES Generation</li>
          <li>Lipinski Rule-of-5 Descriptors</li>
          <li>Dynamic 2D Vector Depictions</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon amber">📊</div>
        <h3 class="card-title" style="font-size: 17px; margin-bottom: 6px;">4. Analytics & Diff</h3>
        <div class="code-pill" style="margin-bottom: 12px;">Recharts + Stats</div>
        <p class="card-desc" style="font-size: 13px;">
          Multi-compound comparison and library population exploration.
        </p>
        <ul class="card-bullets" style="margin-top: 14px; font-size: 12.5px;">
          <li>2–4 Molecule Head-to-Head Diff</li>
          <li>Automated Delta Computation</li>
          <li>Scatter Matrix Correlation</li>
          <li>Parametric Histograms & Bins</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon" style="color: #f43f5e; border-color: rgba(244,63,94,0.3); background: rgba(244,63,94,0.1);">📥</div>
        <h3 class="card-title" style="font-size: 17px; margin-bottom: 6px;">5. Ingestion Engine</h3>
        <div class="code-pill" style="margin-bottom: 12px;">FastAPI + Alembic</div>
        <p class="card-desc" style="font-size: 13px;">
          Batch CSV processing with automated data quality triage.
        </p>
        <ul class="card-bullets" style="margin-top: 14px; font-size: 12.5px;">
          <li>Dry-Run Validation Preview</li>
          <li>Syntax vs. Valence Classification</li>
          <li>Automated Duplicate Detection</li>
          <li>Reproducible Filtered CSV Export</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Platform Capabilities</div>
      <div>Engineered for high-throughput chemical workflow automation</div>
    </div>
  </div>
</section>

<!-- SLIDE 5: 3D STUDIO DEEP DIVE -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Flagship Innovation</div>
        <h2 class="slide-title">3D Molecular Studio: <span class="highlight">Physics & Mechanics</span></h2>
        <p class="slide-subtitle">Bringing desktop-grade quantum/molecular mechanics calculation to the web browser.</p>
      </div>
      <div class="slide-watermark">05 / 3D STUDIO</div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 class="card-title" style="color: #38bdf8; font-size: 22px;">Computational Chemistry Pipeline</h3>
        <p class="card-desc">
          Every SMILES input passes through a rigorous server-side physics pipeline before rendering in Three.js:
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
          <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #38bdf8;">
            <div style="font-weight: 700; color: #ffffff;">1. Explicit Hydrogen Saturation</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Converts skeletal SMILES to full-atom topology for stereochemical and steric accuracy.</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #818cf8;">
            <div style="font-weight: 700; color: #ffffff;">2. ETKDGv3 Distance Geometry Embedding</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Generates realistic 3D spatial conformers using experimental torsion knowledge.</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #34d399;">
            <div style="font-weight: 700; color: #ffffff;">3. MMFF94 / UFF Energy Minimization</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Iteratively minimizes steric strain, returning initial vs final energy (kcal/mol) and convergence flags.</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #fbbf24;">
            <div style="font-weight: 700; color: #ffffff;">4. Gasteiger Partial Charge Mapping</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Computes atomic electrostatics to evaluate nucleophilic/electrophilic reactivity regions.</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #c084fc; font-size: 22px;">Interactive Studio Tools</h3>
        <p class="card-desc">
          Empowering chemists with hands-on geometric interrogation and standard research file export:
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 16px; border-radius: 10px;">
            <div style="font-size: 20px;">📏</div>
            <div style="font-weight: 700; color: #ffffff; margin-top: 6px;">Bond Metrics</div>
            <div style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">Click-to-measure bond distances (Å), angles (°), and dihedral torsions.</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 16px; border-radius: 10px;">
            <div style="font-size: 20px;">🎨</div>
            <div style="font-weight: 700; color: #ffffff; margin-top: 6px;">Visual Styles</div>
            <div style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">Ball & Stick, Space-Filling (CPK), Licorice, Wireframe, and Electrostatic modes.</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 16px; border-radius: 10px;">
            <div style="font-size: 20px;">💾</div>
            <div style="font-weight: 700; color: #ffffff; margin-top: 6px;">Multi-Format Export</div>
            <div style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">Instant download of PDB, XYZ, SDF, and MOL files for ORCA or Gaussian.</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 16px; border-radius: 10px;">
            <div style="font-size: 20px;">🎥</div>
            <div style="font-weight: 700; color: #ffffff; margin-top: 6px;">Camera & Spin</div>
            <div style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">Orthographic/perspective toggle, auto-rotation, and high-res PNG snapshot capture.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • 3D Physics Architecture</div>
      <div>Powered by Three.js WebGL & RDKit ETKDGv3 Conformer Engine</div>
    </div>
  </div>
</section>

<!-- SLIDE 6: DATASETS & PROVENANCE -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Scientific Rigor</div>
        <h2 class="slide-title">Curated Datasets & <span class="highlight">Auditable Provenance</span></h2>
        <p class="slide-subtitle">1,338 vetted chemical structures with direct links back to public reference repositories.</p>
      </div>
      <div class="slide-watermark">06 / PROVENANCE</div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 class="card-title" style="margin-bottom: 0;">1. Educational Common Compounds</h3>
          <span class="badge-yes">181 Molecules</span>
        </div>
        <p class="card-desc">
          Carefully selected core chemical compounds designed for university chemistry curriculum, functional group study, and stereochemical analysis.
        </p>
        <div style="margin-top: 14px; background: rgba(0,0,0,0.25); padding: 14px; border-radius: 8px;">
          <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Source:</strong> PubChem (National Institutes of Health)</div>
          <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Traceability:</strong> PubChem CID stored on every molecule record</div>
          <div style="font-size: 13px; color: #cbd5e1;"><strong>Reproducibility:</strong> Automated extract script <span class="code-pill">fetch_pubchem.py</span></div>
        </div>
        <div class="metric-badge" style="margin-top: 14px;">
          <span class="metric-value">100%</span>
          <span class="metric-label">Curated with 2D Depiction & CID Backlink</span>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 class="card-title" style="margin-bottom: 0;">2. Approved Small-Molecule Drugs</h3>
          <span class="badge-yes" style="background: rgba(99,102,241,0.18); color: #818cf8;">1,157 Molecules</span>
        </div>
        <p class="card-desc">
          Comprehensive extract of FDA and EMA approved small-molecule therapeutics (<span class="code-pill">max_phase = 4</span>) with clinical report card backlinks.
        </p>
        <div style="margin-top: 14px; background: rgba(0,0,0,0.25); padding: 14px; border-radius: 8px;">
          <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Source:</strong> ChEMBL (European Bioinformatics Institute)</div>
          <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Traceability:</strong> ChEMBL ID stored on every molecule record</div>
          <div style="font-size: 13px; color: #cbd5e1;"><strong>Reproducibility:</strong> Automated extract script <span class="code-pill">fetch_chembl.py</span></div>
        </div>
        <div class="metric-badge" style="margin-top: 14px;">
          <span class="metric-value">Phase 4</span>
          <span class="metric-label">Approved Therapeutic Candidates Only</span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 0.3in; padding: 16px 24px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <span style="font-size: 24px;">🛡️</span>
        <div style="flex: 1;">
          <div style="font-weight: 700; color: #ffffff; font-size: 15px;">The MoleculeLab Scientific Standard</div>
          <div style="font-size: 13.5px; color: #94a3b8; margin-top: 2px;">
            Missing values, invalid structures, exact duplicate inputs, and identical canonical SMILES are 4 strictly distinguished states. Calculations run locally on RDKit; no external unverified cache.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Data Integrity & Provenance</div>
      <div>PubChem & ChEMBL integrated extracts with reproducible scripts</div>
    </div>
  </div>
</section>

<!-- SLIDE 7: DEEP ANALYTICS & COMPARATIVE DIFF -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Comparative Intelligence</div>
        <h2 class="slide-title">Multi-Molecule Diffing & <span class="highlight">Population Analytics</span></h2>
        <p class="slide-subtitle">Turn isolated molecular records into rich population distributions and comparative discovery.</p>
      </div>
      <div class="slide-watermark">07 / ANALYTICS</div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-icon">⚖️</div>
        <h3 class="card-title">Side-by-Side Diff Engine</h3>
        <p class="card-desc">
          Compare 2 to 4 molecules simultaneously. MoleculeLab automatically calculates descriptor deltas and highlights significant divergence in lipophilicity and molecular weight.
        </p>
        <ul class="card-bullets">
          <li>Automated delta computation vs reference molecule</li>
          <li>Instant Lipinski Rule-of-Five compliance scoring</li>
          <li>Structure superposition and visual alignment</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon emerald">📈</div>
        <h3 class="card-title">Dynamic Scatter Matrices</h3>
        <p class="card-desc">
          Explore multi-dimensional relationships across 1,300+ compounds in real-time using responsive Recharts visualization.
        </p>
        <ul class="card-bullets">
          <li>Plot Molecular Weight vs. Crippen LogP</li>
          <li>Analyze TPSA vs. Hydrogen Bond Donors</li>
          <li>Interactive tooltips with live molecular previews</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon purple">📊</div>
        <h3 class="card-title">Distribution Histograms</h3>
        <p class="card-desc">
          Statistical profiling of chemical libraries with automated binning, median overlays, and standard deviation callouts.
        </p>
        <ul class="card-bullets">
          <li>Parametric distribution across approved therapeutics</li>
          <li>Filterable by dataset collection (PubChem vs ChEMBL)</li>
          <li>One-click export of filtered CSV datasets</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Analytics & Diffing</div>
      <div>Interactive Recharts data visualization powered by FastAPI summary endpoints</div>
    </div>
  </div>
</section>

<!-- SLIDE 8: TARGET AUDIENCE & USE CASES -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Market Opportunity</div>
        <h2 class="slide-title">Who MoleculeLab is For: <span class="highlight">Key Use Cases</span></h2>
        <p class="slide-subtitle">Addressing acute friction points across university education, early-stage biotech, and cheminformatics.</p>
      </div>
      <div class="slide-watermark">08 / MARKET</div>
    </div>

    <div class="grid-4">
      <div class="card">
        <div class="card-icon">🎓</div>
        <h3 class="card-title">Academic & Higher Ed</h3>
        <p class="card-desc">
          Chemistry and biochemistry university courses teaching organic chemistry, stereocenters, and medicinal drug design.
        </p>
        <ul class="card-bullets">
          <li>Zero installation for students</li>
          <li>Interactive 3D geometry labs</li>
          <li>Works on Chromebooks & Macs</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon emerald">💊</div>
        <h3 class="card-title">Biotech Startups</h3>
        <p class="card-desc">
          Pre-clinical biotechnology teams conducting rapid small-molecule lead screening and Lipinski rule-of-five triage.
        </p>
        <ul class="card-bullets">
          <li>Fast conformer sanity checks</li>
          <li>CSV library batch validation</li>
          <li>Fraction of enterprise tool cost</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon purple">🤖</div>
        <h3 class="card-title">AI & ML Chem Teams</h3>
        <p class="card-desc">
          Machine learning scientists developing generative chemistry models who need instant visual and computational validation.
        </p>
        <ul class="card-bullets">
          <li>SMILES syntax & valence checker</li>
          <li>3D geometry verification</li>
          <li>Automated REST API integration</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon amber">🧪</div>
        <h3 class="card-title">Materials Science</h3>
        <p class="card-desc">
          Polymer chemists and materials engineers examining molecular dipole moments, partial charges, and steric packing.
        </p>
        <ul class="card-bullets">
          <li>Gasteiger charge mapping</li>
          <li>PDB/XYZ/SDF file export</li>
          <li>Bond angle & dihedral measurement</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Target Audience</div>
      <div>Serving a global market of millions of scientists, students, and computational labs</div>
    </div>
  </div>
</section>

<!-- SLIDE 9: TECHNOLOGY STACK & ARCHITECTURE -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Engineering Excellence</div>
        <h2 class="slide-title">Modern, Resilient <span class="highlight">Full-Stack Technology</span></h2>
        <p class="slide-subtitle">Built with type-safe, high-performance technologies for sub-100ms response times.</p>
      </div>
      <div class="slide-watermark">09 / TECH STACK</div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-icon">⚛️</div>
        <h3 class="card-title">Next.js 16 & React 19</h3>
        <p class="card-desc">
          Next-generation App Router frontend with TypeScript 5, server-side caching, and hardware-accelerated WebGL.
        </p>
        <ul class="card-bullets">
          <li>Three.js 3D viewport rendering at 60 FPS</li>
          <li>Recharts reactive SVG data analytics</li>
          <li>Accessible, keyboard-driven UI</li>
          <li>Cyber-lab dark mode aesthetic</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon emerald">⚡</div>
        <h3 class="card-title">FastAPI & Python 3.10+</h3>
        <p class="card-desc">
          Asynchronous, typed API engine with Pydantic v2 validation contracts and structured OpenAPI documentation.
        </p>
        <ul class="card-bullets">
          <li>Sub-100ms response latency</li>
          <li>Structured chemistry error handling</li>
          <li>Automated Swagger & ReDoc specs</li>
          <li>48+ automated Pytest unit tests</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-icon purple">🧬</div>
        <h3 class="card-title">RDKit 2026 Chemistry Core</h3>
        <p class="card-desc">
          The gold standard in computational chemistry, running server-side for deterministic, full-precision calculation.
        </p>
        <ul class="card-bullets">
          <li>ETKDGv3 3D conformer embedding</li>
          <li>MMFF94 / UFF force field minimization</li>
          <li>Gasteiger atomic partial charges</li>
          <li>Canonical SMILES & 2D SVG depiction</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Architecture</div>
      <div>Clean modular separation: Next.js frontend • FastAPI gateway • RDKit engine</div>
    </div>
  </div>
</section>

<!-- SLIDE 10: COMPETITIVE ADVANTAGE -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Competitive Matrix</div>
        <h2 class="slide-title">Why MoleculeLab <span class="highlight">Stands Out</span></h2>
        <p class="slide-subtitle">Combining the accessibility of the modern web with the rigor of desktop workstations.</p>
      </div>
      <div class="slide-watermark">10 / COMPETITION</div>
    </div>

    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
      <table class="table-custom">
        <thead>
          <tr>
            <th>Key Feature / Capability</th>
            <th style="color: #38bdf8; background: rgba(56, 189, 248, 0.12);">🧪 MoleculeLab</th>
            <th>Desktop (Avogadro / PyMOL)</th>
            <th>Basic Web (MolView / PubChem)</th>
            <th>Enterprise (Schrödinger / ChemDraw)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Zero-Install Web Access</strong></td>
            <td><span class="badge-yes">Yes (Instant WebGL)</span></td>
            <td><span class="badge-no">No (Heavy Install)</span></td>
            <td><span class="badge-yes">Yes</span></td>
            <td><span class="badge-no">No (Local Server/Desktop)</span></td>
          </tr>
          <tr>
            <td><strong>3D Force-Field Optimization</strong></td>
            <td><span class="badge-yes">Yes (MMFF94 & UFF)</span></td>
            <td><span class="badge-yes">Yes</span></td>
            <td><span class="badge-no">No / Basic</span></td>
            <td><span class="badge-yes">Yes</span></td>
          </tr>
          <tr>
            <td><strong>RDKit 2026 Precision Engine</strong></td>
            <td><span class="badge-yes">Yes (Server-Side)</span></td>
            <td><span class="badge-partial">Varies (Plugin-based)</span></td>
            <td><span class="badge-no">No (JS Approximations)</span></td>
            <td><span class="badge-partial">Proprietary Closed</span></td>
          </tr>
          <tr>
            <td><strong>Curated 1,300+ Compound DB</strong></td>
            <td><span class="badge-yes">Yes (Built-in + Provenance)</span></td>
            <td><span class="badge-no">No (Bring Your Own)</span></td>
            <td><span class="badge-partial">Static Search</span></td>
            <td><span class="badge-no">Requires Add-on License</span></td>
          </tr>
          <tr>
            <td><strong>Multi-Compound Diffing</strong></td>
            <td><span class="badge-yes">Yes (2–4 Side-by-Side)</span></td>
            <td><span class="badge-no">No</span></td>
            <td><span class="badge-no">No</span></td>
            <td><span class="badge-yes">Yes (Complex Setup)</span></td>
          </tr>
          <tr>
            <td><strong>Cost & Accessibility</strong></td>
            <td><span class="badge-yes">Free / Cloud-Native</span></td>
            <td><span class="badge-partial">Free, but complex</span></td>
            <td><span class="badge-yes">Free</span></td>
            <td><span class="badge-no">$10,000+ / seat / year</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Competitive Positioning</div>
      <div>Superior accessibility, rigorous science, modern user experience</div>
    </div>
  </div>
</section>

<!-- SLIDE 11: STRATEGIC ROADMAP -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">Future Horizon</div>
        <h2 class="slide-title">Product Roadmap & <span class="highlight">Strategic Milestones</span></h2>
        <p class="slide-subtitle">Clear trajectory from core computational engine to collaborative enterprise molecular OS.</p>
      </div>
      <div class="slide-watermark">11 / ROADMAP</div>
    </div>

    <div class="grid-3">
      <div class="card" style="border-color: rgba(52, 211, 153, 0.4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span class="badge-yes">Phase 1 • Complete</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #34d399;">v1.0 Ready</span>
        </div>
        <h3 class="card-title">Core Computational Engine</h3>
        <ul class="card-bullets">
          <li>RDKit 2026 backend & Lipinski descriptor engine</li>
          <li>Interactive 3D Three.js Studio with MMFF94/UFF</li>
          <li>1,338 vetted PubChem & ChEMBL molecules</li>
          <li>Side-by-side comparative analytics & radar</li>
          <li>Batch CSV ingestion with validation dry-run</li>
          <li>48 passing automated Pytest suites</li>
        </ul>
      </div>

      <div class="card featured">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span class="badge-yes" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">Phase 2 • Near-Term</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #38bdf8;">Q1 - Q2 2027</span>
        </div>
        <h3 class="card-title">AI & Active Chemical Modeling</h3>
        <ul class="card-bullets">
          <li>AI-assisted SMILES generation & scaffold hopping</li>
          <li>Interactive 2D chemical drawing canvas (JSME/Kekule)</li>
          <li>AutoDock Vina ligand-receptor docking scores</li>
          <li>Substructure & similarity clustering algorithms</li>
          <li>Bioavailability & ADMET property prediction models</li>
        </ul>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span class="badge-partial">Phase 3 • Scale</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #fbbf24;">Q3 - Q4 2027</span>
        </div>
        <h3 class="card-title">Cloud Collaborative Workspaces</h3>
        <ul class="card-bullets">
          <li>Multi-user real-time chemical project rooms</li>
          <li>AlphaFold & ESMFold complex visualization</li>
          <li>High-throughput batch conformer cloud compute</li>
          <li>Enterprise SSO & team audit logs</li>
          <li>Direct integration with Electronic Lab Notebooks (ELNs)</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Strategic Roadmap</div>
      <div>From foundational web engine to the default computational chemistry workspace</div>
    </div>
  </div>
</section>

<!-- SLIDE 12: VISION & CALL TO ACTION -->
<section class="slide">
  <div class="content-layer">
    <div class="slide-header">
      <div>
        <div class="tagline-badge">The Future of Discovery</div>
        <h2 class="slide-title">Join Us in Transforming <span class="highlight">Molecular Science</span></h2>
        <p class="slide-subtitle">Democratizing supercomputer-grade chemistry tools for every researcher and student on Earth.</p>
      </div>
      <div class="slide-watermark">12 / VISION</div>
    </div>

    <div class="grid-2">
      <div class="card featured" style="justify-content: center; padding: 36px;">
        <h3 style="font-size: 32px; font-weight: 800; color: #ffffff; line-height: 1.25; margin-bottom: 20px;">
          &ldquo;Every discovery in medicine and materials begins with a single molecule.&rdquo;
        </h3>
        <p style="font-size: 16.5px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
          MoleculeLab eliminates the software barrier that separates great scientific ideas from real computational insights. By uniting 3D physics, rigorous cheminformatics, and frictionless web delivery, we empower the next generation of scientific breakthroughs.
        </p>
        <div style="display: flex; gap: 14px;">
          <div class="badge-yes" style="font-size: 13px; padding: 6px 14px;">Production Ready</div>
          <div class="badge-yes" style="background: rgba(99,102,241,0.2); color: #818cf8; font-size: 13px; padding: 6px 14px;">Open Source Foundation</div>
          <div class="badge-yes" style="background: rgba(245,158,11,0.2); color: #fbbf24; font-size: 13px; padding: 6px 14px;">Academic & Biotech Pilots</div>
        </div>
      </div>

      <div class="card" style="justify-content: center; padding: 36px;">
        <h3 class="card-title" style="font-size: 24px; color: #38bdf8; margin-bottom: 16px;">Get Involved / Next Steps</h3>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(0,0,0,0.3); padding: 14px 18px; border-radius: 10px;">
            <div style="font-weight: 700; color: #ffffff; font-size: 15px;">🏛️ Academic Pilots & Classroom Adoptions</div>
            <div style="font-size: 13.5px; color: #94a3b8; margin-top: 4px;">Deploy MoleculeLab across university undergraduate chemistry and graduate biochemistry programs.</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 14px 18px; border-radius: 10px;">
            <div style="font-weight: 700; color: #ffffff; font-size: 15px;">🚀 Biotech Accelerator & Incubator Partnerships</div>
            <div style="font-size: 13.5px; color: #94a3b8; margin-top: 4px;">Equip early-stage discovery teams with modern computational screening tools on day zero.</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 14px 18px; border-radius: 10px;">
            <div style="font-weight: 700; color: #ffffff; font-size: 15px;">💻 Developer & Research Community</div>
            <div style="font-size: 13.5px; color: #94a3b8; margin-top: 4px;">Explore our modular FastAPI architecture, interactive Swagger docs, and extensible RDKit pipelines.</div>
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px;">
          <span style="font-size: 14px; color: #cbd5e1; font-weight: 600;">Repository: github.com/Anonsxb/MoleculeLab</span>
          <span class="code-pill">API: /docs • /redoc</span>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="logo-mark"><span>🧪 MoleculeLab</span> • Thank You</div>
      <div>Contact: MoleculeLab Core Team • Building the future of computational chemistry</div>
    </div>
  </div>
</section>

</body>
</html>
"""
    return html

if __name__ == "__main__":
    html_content = create_presentation_html()
    out_html = os.path.join(os.getcwd(), "MoleculeLab_Pitch_Deck.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML presentation written to {out_html}")

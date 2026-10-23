# FinGuard IEEE Research Paper — Compilation and Build Guide

This directory contains the complete IEEE conference-format research paper for the final-year project:

**Title:** Explainable AI-Driven Risk Scoring for Fraud Analyst Decision Support  
**Authors:** Agjelia Lydia C., Kanis Krishna K A, Mukesh M., Santhosh A S, and Barath R.  
**Institution:** Department of Information Technology, Karpagam College of Engineering, Coimbatore, Tamil Nadu, India.  
**Project Supervisor:** Ms. C. Agjelia Lydia, M.E., Assistant Professor.

---

## 1. Directory Structure

```
d:/Fraud Detection/paper/
├── main.tex                  # Complete IEEEtran conference LaTeX source
├── references.bib            # Formatted and verified IEEE BibTeX bibliography
├── figures/
│   ├── architecture.tex      # TikZ vector diagram: 4-tier decoupled system architecture
│   └── feature_pipeline.tex  # TikZ vector diagram: Causal feature engineering workflow
├── README.md                 # Compilation instructions & dependency guide (this file)
└── SOURCE_AUDIT.md           # Source mapping, numerical reconciliation, and audit notes
```

---

## 2. LaTeX Distribution & Package Prerequisites

To compile this paper locally, you need a standard TeX distribution:

- **Windows:** [MiKTeX](https://miktex.org/) or [TeX Live](https://www.tug.org/texlive/)
- **Linux:** `sudo apt-get install texlive-latex-extra texlive-science texlive-bibtex-extra`
- **macOS:** [MacTeX](https://www.tug.org/mactex/)
- **Cloud (No Install Required):** [Overleaf](https://www.overleaf.com/)

### Required LaTeX Packages:
All required packages are standard in full TeX distributions:
- `IEEEtran` (Document class)
- `cite` (IEEE bracketed citations)
- `amsmath`, `amssymb`, `amsfonts` (Mathematical equations and symbols)
- `algorithmic` (Algorithm formatting support)
- `graphicx` (Figure and image rendering)
- `textcomp` (Text symbols)
- `xcolor` (Color styling for TikZ diagrams)
- `booktabs` (High-quality publication table rules: `\toprule`, `\midrule`, `\bottomrule`)
- `array`, `multirow` (Advanced multi-row table alignment)
- `url` (URL line breaking)
- `tikz` (Vector graphics engine, with libraries: `arrows.meta`, `positioning`, `fit`, `shapes.geometric`, `calc`)

---

## 3. Local Compilation Commands

Open a terminal or PowerShell in the `paper/` directory and execute the standard four-pass compilation sequence:

```powershell
# Navigate to the paper directory
cd "d:\Fraud Detection\paper"

# Pass 1: Generate auxiliary files (.aux)
pdflatex -interaction=nonstopmode main.tex

# Pass 2: Compile BibTeX references (.bbl)
bibtex main

# Pass 3: Resolve in-text citations and cross-references
pdflatex -interaction=nonstopmode main.tex

# Pass 4: Finalize page layout and equation numbering
pdflatex -interaction=nonstopmode main.tex
```

Or using `latexmk` for automated dependency resolution:

```bash
latexmk -pdf main.tex
```

---

## 4. Compiling via Overleaf (Fastest & Zero Setup)

1. Log into [Overleaf](https://www.overleaf.com/).
2. Click **New Project** $\longrightarrow$ **Blank Project**.
3. Name the project `FinGuard_IEEE_Paper`.
4. Upload:
   - `main.tex`
   - `references.bib`
   - The `figures/` folder containing `architecture.tex` and `feature_pipeline.tex`.
5. Set compiler to **pdfLaTeX** (default in Overleaf settings).
6. Click **Recompile**. The complete, two-column IEEE formatted PDF will be rendered immediately.

---

## 5. Quality Assurance and Layout Verification Checklist

- [x] **Document Class:** `\documentclass[conference]{IEEEtran}` without non-standard margin overrides.
- [x] **Layout:** Two-column IEEE format with centered title and 5-author block.
- [x] **Abstract & Index Terms:** Official IEEE style headings (`Abstract---` and `Index Terms---`).
- [x] **Section Headings:** Roman numerals for main sections (`I. INTRODUCTION`, `II. RELATED WORK`, etc.) and capital letters for subsections (`A.`, `B.`, etc.).
- [x] **Equations:** Sequentially numbered (1) through (10) with consistent notation ($t_i$, $H_i$, $\mu_i$, $\phi_j$, $p(x)$).
- [x] **Figures:** 2 native vector TikZ diagrams (`Fig. 1` decoupled architecture, `Fig. 2` causal feature pipeline) sized to fit `\textwidth` and `\columnwidth` without margin clipping.
- [x] **Tables:** 8 IEEE-styled tables formatted with `booktabs` rules, centered uppercase labels (`TABLE I` to `TABLE VIII`), and wide tables spanning `\textwidth` via `table*`.
- [x] **Citations:** Sequential bracketed numerical citations (`[1]`, `[2]`, `[3]`) referencing `references.bib` via `\bibliographystyle{IEEEtran}`.
- [x] **Numerical Fidelity:** 100% reconciled against project source code and verified experiment logs (`results/final_temporal_model_comparison.csv`, `results/ablation_study.csv`, `results/calibration_validation.json`, and `docs/final_journal_validation.md`).

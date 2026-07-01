Markdown
# voidscout

A Full-Stack Codebase Map & Accelerated Learning Hub that transforms complex local code repositories into interactive, floating 3D constellation maps while indexing textual components for deep semantic exploration.

---

## 📋 Table of Contents
* [About the Project](#-about-the-project)
* [Core Architecture Architecture](#%EF%B8%8F-core-architecture)
* [✨ Features](#-features)
* [🚀 Getting Started](#-getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation & Dependency Alignment](#installation--dependency-alignment)
* [💡 Usage Guide](#-usage-guide)
* [🧪 Verification & Testing Matrix](#-verification--testing-matrix)
* [🤝 Detailed Contribution Framework](#-detailed-contribution-framework)
* [📄 Comprehensive MIT License Ledger](#-comprehensive-mit-license-ledger)
* [📬 Contact & Support](#-contact--support)
* [🙏 Acknowledgments](#-acknowledgments)

---

## 📝 About the Project

**voidscout** is an engineered developer companion designed to eliminate the cognitive friction of navigating unfamiliar or massive software repositories. By parsing raw source directories locally, the application models structural file dependencies, measures architectural impact metrics, and projects modules as nodes within an interactive 3D WebGL sphere. Concurrently, code files are chunked with character-accurate boundary alignments and vectorized into a local database to prepare the system for semantic context tracking.

---

## 🏗️ Core Architecture

The system operates as an asymmetrical full-stack layout split into a high-performance WebGL browser interface and a local background orchestration worker engine:

```text
frontend/ (Next.js + TypeScript + React Three Fiber)
├── src/
    ├── app/               # Dashboard Grid Layout, Styles, & Core State Sync
    ├── components/        # Three.js WebGL Canvas Engine & Dynamic Sidebar Inspector
    └── services/          # Fetch API Connection Wrappers & Type Interfaces

backend/ (FastAPI + Python 3.10+)
├── app/
    ├── api/               # Router Endpoints (Ingestion, Node Vectors, Mastery State)
    ├── core/              # Code Parsers & ChromaDB Vector Embedding Engine
    └── db/                # SQLite Database Target Schemas & Persistence Handlers
✨ Features
3D Constellation Mapping: Visualizes system modules as floating orbital stars inside an interactive, high-performance WebGL scene utilizing React Three Fiber.

Algorithmic Node Allocation: Implements a mathematical layout configuration to prevent coordinate overlap and uniformly space architectural assets.

Dependency & Impact Evaluation: Automated localized parsers extract module elements to calculate an objective impact score for dynamic node sizing.

Vectorized Data Pipeline: Slices source files into synchronized text chunks with protective overlap buffers, storing tokens directly inside ChromaDB for fast retrieval.

Exploration Progress Persistence: Integrates interactive mastery state triggers that commit progress straight to a persistent local SQLite engine, color-coding mastered files dynamically in real-time.

🚀 Getting Started
Follow these precise steps to construct and deploy an operational local copy of the voidscout pipeline environment.

Prerequisites
The underlying local native system storage tools require a local C++ compilation engine to build hardware-level system bindings during initialization.

Windows Systems: Visual Studio Build Tools 2022 (You must check Desktop development with C++ and MSVC v143 in the installer)

macOS / Linux Systems: Xcode Command Line Tools (xcode-select --install) or build-essential GCC compilers

Runtime Software Engines: Python 3.10 or higher and Node.js 18 or higher installed on your system environment paths.

Installation & Dependency Alignment
1. System Clone
Bash
git clone [https://github.com/Parth-Jos-hi/voidscout.git](https://github.com/Parth-Jos-hi/voidscout.git)
cd voidscout
2. Backend Environment Verification & Startup
Bash
cd backend
# Establish an isolated python environment shell
python -m venv .venv

# Activate your virtual shell space
# On Windows systems run:
.venv\Scripts\activate
# On macOS / Linux systems run:
source .venv/bin/activate

# Force upgrade setup tools wheels and pull tracking packages
pip install --upgrade pip
pip install -r requirements.txt

# Boot the FastAPI uvicorn production server process
uvicorn app.main:app --reload
The engine will log: INFO: Uvicorn server running on http://127.0.0.1:8000

3. Frontend Client Portal Deployment
Open a parallel split terminal terminal window and initialize the presentation node layer:

Bash
cd frontend
# Clean fetch packages from repository manifest lock files
npm install

# Start the Next.js local asset development stream
npm run dev
The interface layout will log: Ready in 1.2s - http://localhost:3000

💡 Usage Guide
Point your primary internet browser address path to http://localhost:3000.

Locate the Project Identifier configuration text component and assign a clean system moniker (e.g., Aegis-SR).

Inside the Absolute Path Location string input field, paste the absolute computer target storage address of the codebase you want to map (e.g., C:/Users/Parth/projects/my-app).

Select the blue Initialize Exploration execution toggle button.

Interact With Spatial Grid Engine:

Left Click + Drag Cursor: Orbits and rotates your field of view camera parameters.

Scroll Wheel: Controls camera distance and zoom depths.

Node Click: Opens the slide-out inspector screen to review file attributes, language metadata, and metrics trackers.

Mark Module as Mastered: Flags file completions by logging state modifications down to disk.

🧪 Verification & Testing Matrix
To guarantee your system layers are connecting smoothly and database pipelines are running without errors, you can run verification steps using these standard evaluation tracking endpoints:

Bash
# Check the status health condition of the FastAPI background layer
curl -X GET [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

# Verify your active database tracking indices configuration 
curl -X GET [http://127.0.0.1:8000/api/voyage/nodes?repo_name=Aegis-SR](http://127.0.0.1:8000/api/voyage/nodes?repo_name=Aegis-SR)
🤝 Detailed Contribution Framework
We appreciate community refinements to code visualization modules. To propose functional adjustments, adhere strictly to the following engineering workflow pipeline:

Code of Conduct
Maintain semantic file separation boundaries inside layout design components.

Write robust type definitions for structural interface schemas.

Verify your changes locally before opening pull requests upstream.

Execution Cycle
Fork the parent project target layout tracking directory down to your profile space.

Initialize an isolated code tracking update branch:

Bash
git checkout -b feature/AmazingRefinement
Commit structural updates with descriptive tracking notations:

Bash
git commit -m 'Add some AmazingRefinement structural parameters'
Push your modifications to your origin branch fork:

Bash
git push origin feature/AmazingRefinement
Navigate to the primary tracking repository and execute a clear Pull Request sequence matching our development criteria ledger.

📄 Comprehensive MIT License Ledger
Plaintext
MIT License

Copyright (c) 2026 Parth Joshi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
📬 Contact & Support
Parth Joshi - joshiparth936@gmail.com

Project Link: https://github.com/Parth-Jos-hi/Code-Compass

🙏 Acknowledgments
React Three Fiber Ecosystem Developers - Hardware accelerated canvas libraries

FastAPI Framework Core Maintainers - High performance server routing

ChromaDB Vector Database Analytics Group - Embedding extraction and vector lookups
# 🗺️ Code-Compass (voidscout)

**Code-Compass (voidscout)** is a Full-Stack Codebase Map & Accelerated Learning Hub. It parses local software repositories, models structural dependencies, computes module impact metrics, and visualizes codebase architectures as interactive 3D WebGL constellation maps. Additionally, it indexes codebase segments into a local vector database, enabling deep semantic exploration via a Socratic RAG chat interface and custom module mastery assessments (quizzes) evaluated by an LLM.

---

## 📋 Table of Contents
1. [✨ Features](#-features)
2. [🏗️ Core Architecture](#%EF%B8%8F-core-architecture)
3. [🚀 Getting Started](#-getting-started)
   - [Method A: Docker (Recommended)](#method-a-docker-recommended-fastest)
   - [Method B: Local Execution (Windows)](#method-b-local-execution-windows)
4. [💡 Usage Guide](#-usage-guide)
5. [🧪 Verification & Testing](#-verification--testing)
6. [🛠️ Troubleshooting](#%EF%B8%8F-troubleshooting)
7. [🤝 Contribution Framework](#-contribution-framework)
8. [📄 License](#-license)
9. [📬 Contact & Support](#-contact--support)

---

## ✨ Features

- **3D Constellation Mapping**: Visualizes repository layouts as three-dimensional interactive constellations using **React Three Fiber (R3F) + Three.js**.
- **Algorithmic Node Allocation**: Automatically maps nodes dynamically to avoid overlap while adjusting size based on code import impact and dependency depth.
- **Vectorized Data Pipeline**: Segments source files into text blocks with overlap buffers, vectorizing and storing indices inside **ChromaDB** for real-time semantic queries.
- **Socratic RAG Chat Console**: Ask detailed conceptual, structural, or debugging questions about specific files through a multiline textarea integrated directly into the wider inspector sidebar.
- **Mastery Tracker & Quiz Engine**: Re-evaluates understanding through LLM-generated questions. Mastery progress is tracked in a local **SQLite** database, color-coding mastered modules in real-time when achieving a $\ge 75\%$ accuracy threshold.
- **Clean Header Navigation**: A streamlined navigation system featuring the minimalist logo `void-Scout.` for a clutter-free visualization canvas.

---

## 🏗️ Core Architecture

The project splits into a high-performance WebGL presentation layer and a fast local API orchestration worker service:

```text
Code-Compass/
├── frontend/ (Next.js + TypeScript + React Three Fiber + TailwindCSS)
│   ├── src/
│   │   ├── app/            # Dashboard layout, style bindings, & core state sync
│   │   ├── components/     # Three.js WebGL canvas and dynamic sidebar components
│   │   └── services/       # API call handlers & type definitions
│   └── Dockerfile          # Multi-stage production build script
│
├── backend/ (FastAPI + Python 3.12 + ChromaDB + SQLite + Uvicorn)
│   ├── app/
│   │   ├── api/            # Route controllers (ingestion, vector nodes, metrics)
│   │   ├── core/           # Dependency parsers, LLM agents, & ChromaDB engine
│   │   └── db/             # SQLite database schemas and persistence handlers
│   └── Dockerfile          # Production runtime wrapper config
```

---

## 🚀 Getting Started

### Method A: Docker (Recommended, Fastest)

Runs both components inside containers without worrying about installing compilers or python build tools locally.

#### Prerequisites
- **Docker Desktop** installed, running, and configured on your path.

#### Steps
1. Open your terminal at the project root `D:\Code-Compass` and start the containers:
   ```bash
   docker compose up --build -d
   ```
2. Once the build completes, the containers will be running in the background:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000) (Swagger Docs at `/docs`)

#### Manage Containers
- **View logs**:
  ```bash
  docker compose logs -f frontend
  # or
  docker compose logs -f backend
  ```
- **Stop containers**:
  ```bash
  docker compose down
  ```

---

### Method B: Local Execution (Windows)

Runs the services natively. We include powershell helper scripts to automate setting environment variables and virtual environments.

#### Prerequisites
- **Node.js** v18+ and **npm** installed.
- **Python** v3.12+ installed (Python v3.12 is highly recommended to fetch pre-compiled binaries for dependencies like `numpy` and `chromadb`).
- **C++ Compiler Suite** (for native SQLite/ChromaDB compilation bindings if using older python versions):
  - Windows: **Visual Studio Build Tools 2022** with the **"Desktop development with C++"** workflow selected.
  - macOS/Linux: Run `xcode-select --install` or install `build-essential`.

#### Steps
1. **Initialize Backend**:
   Run the backend helper in your terminal root. It automatically sets up a Python virtual environment (`.venv`), upgrades pip, installs required wheels, and runs the dev server:
   ```powershell
   .\start-backend.ps1
   ```
   *The server will start on [http://127.0.0.1:8000](http://127.0.0.1:8000).*

2. **Initialize Frontend**:
   In a separate terminal window, run the frontend helper to configure base API URLs, install package dependencies, and boot the Next.js dev server:
   ```powershell
   .\start-frontend.ps1
   ```
   *The client dashboard will start on [http://localhost:3000](http://localhost:3000).*

---

## 💡 Usage Guide

1. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.
2. In the **Project Identifier** field, enter a moniker for your session configuration (e.g., `Aegis-SR`).
3. In the **Absolute Path Location** input, paste the absolute path to any local project folder you want to explore.
4. Click **Initialize Exploration**.
5. **Explore the 3D Tree**:
   - **Left Click & Drag**: Orbits and pivots the camera field of view.
   - **Scroll Wheel**: Zooms in/out of the node constellation structure.
   - **Click Node**: Focuses on a file, opening the Inspector side-panel.
6. **Socratic RAG & Quiz**:
   - Select the **Socratic RAG** tab in the sidebar to ask complex structural or algorithmic questions. Type your query in the enlarged textarea and press `Enter` to submit.
   - Select **Quiz Module**, click **Quiz Module Info**, and answer questions generated by the LLM in the main card. Type your answers inside the expanded textbox canvas to test your code understanding. Achieve a score higher than 75% to master the module!

---

## 🧪 Verification & Testing

To confirm that all components, databases, and LLM integrations are operating properly:

1. **Verify API Health Status**:
   ```bash
   curl -X GET http://127.0.0.1:8000/api/health
   ```
   *Should return an operational/success message.*

2. **Check Indexed Files and Vectors**:
   ```bash
   curl -X GET "http://127.0.0.1:8000/api/voyage/nodes?repo_name=Aegis-SR"
   ```
   *Should return the serialized node coordinates and structural attributes from database storage.*

---

## 🛠️ Troubleshooting

- **Backend compilation fails on `numpy` or `chromadb`**:
  Make sure you are using **Python 3.12**, as precompiled wheels are readily available for it. If using other versions, verify you have Visual Studio C++ build tools installed so pip can compile the packages.
- **Frontend shows `Failed to fetch`**:
  Ensure the backend FastAPI service is running. If running locally, check that `$env:NEXT_PUBLIC_API_BASE_URL` is set correctly to `http://127.0.0.1:8000/api`.
- **Docker rebuild changes**:
  Since file copy commands run during the Docker build stage, any custom edits to the workspace require rebuilding:
  ```bash
  docker compose up -d --build frontend
  ```

---

## 🤝 Contribution Framework

We appreciate contributions to improve codebase rendering, parsers, and custom layouts!

1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/AmazingRefinement`).
3. Commit your updates (`git commit -m 'Add some AmazingRefinement structural parameters'`).
4. Push to the branch (`git push origin feature/AmazingRefinement`).
5. Open a Pull Request for review.

---

## 📄 License

Distributed under the Apache License 2.0. See the `LICENSE` file for more details.

---

## 📬 Contact & Support

- **Parth Joshi** - [joshiparth936@gmail.com](mailto:joshiparth936@gmail.com)
- **Repository Link**: [https://github.com/Parth-Jos-hi/Code-Compass](https://github.com/Parth-Jos-hi/Code-Compass)
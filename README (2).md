# NarrativeAI — Story Co-Writer Agent

<p align="center">
  <img src="https://img.shields.io/badge/Capgemini-AgentifAI%20Buildathon-0070AD?style=for-the-badge" alt="Capgemini AgentifAI Buildathon" />
  <img src="https://img.shields.io/badge/Round%202-Deep%20Dive-512BD4?style=for-the-badge" alt="Round 2 Deep Dive" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Built%20with-n8n-EA4B71?logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/LLM-gpt--4.1--mini-412991?logo=openai&logoColor=white" alt="OpenAI gpt-4.1-mini" />
  <img src="https://img.shields.io/badge/Agents-3%20in%20sequence-7b2d8e" alt="3 Agents" />
  <img src="https://img.shields.io/badge/PDF%20engine-Pure%20JavaScript-F7DF1E?logo=javascript&logoColor=black" alt="Pure JavaScript PDF" />
  <img src="https://img.shields.io/badge/dependencies-zero-success" alt="Zero dependencies" />
  <img src="https://img.shields.io/badge/status-working-brightgreen" alt="Status working" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />
</p>

An agentic, multi-LLM **story production pipeline** built on n8n. A single request runs three specialised AI agents in sequence — **Scene Planning → Continuity Validation → Story-Bible canonisation** — and returns a finished, formatted **PDF report** generated entirely inside the workflow. No external PDF service. No API keys beyond the LLM. Zero npm dependencies.

---

## Working output

> The pipeline's actual end-to-end result — three ranked scenes, a continuity audit with a Narrative Coherence Score, and an updated story bible — rendered to PDF *inside* n8n and returned over the webhook.

![NarrativeAI sample PDF output](docs/sample-output.png)

---

## Architecture

```mermaid
flowchart TD
    subgraph Entry
        A["Writer Input Webhook<br/>POST /webhook/narrative-ai"]
        T["Manual Trigger<br/>Run Test"] --> SI["Sample Test Input"]
    end
    A --> N["Normalize Writer Input"]
    SI --> N

    N --> SP["Scene Planner Agent"]
    SP --> CG["Continuity Guard Agent"]
    CG --> SB["Story Bible Agent"]
    SB --> AR["Assemble Final Report"]
    AR --> PDF["Generate PDF<br/>pure-JS engine"]
    PDF --> R["Respond with Story Package<br/>application/pdf"]

    L1(["gpt-4.1-mini · temp 0.8"]) -. model .-> SP
    MEM(["Session Memory"]) -. memory .-> SP
    L2(["gpt-4.1-mini · temp 0.1"]) -. model .-> CG
    L3(["gpt-4.1-mini · temp 0.3"]) -. model .-> SB

    classDef agent fill:#7b2d8e,stroke:#4a1a5c,color:#fff;
    classDef sub fill:#f5f3f7,stroke:#bbb,color:#333;
    classDef io fill:#1a1a2e,stroke:#000,color:#fff;
    class SP,CG,SB agent;
    class L1,L2,L3,MEM sub;
    class A,R,PDF io;
```

## Request lifecycle

```mermaid
sequenceDiagram
    actor W as Writer
    participant WH as Webhook
    participant N as Normalize
    participant SP as Scene Planner
    participant CG as Continuity Guard
    participant SB as Story Bible
    participant AS as Assemble
    participant PD as Generate PDF

    W->>WH: POST story context (JSON)
    WH->>N: raw payload
    N->>SP: normalized fields (+ defaults)
    Note over SP: gpt-4.1-mini · session memory
    SP->>CG: 3 ranked scene suggestions
    Note over CG: validates 5 dimensions → NCS
    CG->>SB: approved scenes + continuity report
    Note over SB: merges new canon
    SB->>AS: updated story bible
    AS->>PD: full_report (scenes + audit + bible)
    Note over PD: builds PDF object graph in pure JS
    PD-->>W: NarrativeAI_Story_Production_Report.pdf
```

## The three agents

| Agent | Role | Output |
|-------|------|--------|
| **Scene Planner** | Senior story co-writer | 3 ranked scenes — summary, narrative purpose, character impact, threads, opening line |
| **Continuity Guard** | Narrative QA | Per-scene PASS / WARN / FAIL across character, timeline, location, relationships and constraints, plus an overall **Narrative Coherence Score (NCS)** and APPROVE / REVISE / REJECT |
| **Story Bible Agent** | Canon keeper | Complete updated Story Bible — characters, world state, event history, lore, locked elements, change log |

## Why a custom PDF generator

n8n Cloud's Code node cannot import npm packages (pdfkit, jspdf, etc.). [`src/generate-pdf.js`](src/generate-pdf.js) therefore implements a **self-contained PDF writer in pure JavaScript**: it hand-builds the PDF object graph (catalog, pages, Helvetica / Helvetica-Bold fonts, content streams, xref table) with automatic text wrapping, pagination, and lightweight Markdown styling. No dependencies, no API keys, runs anywhere n8n runs.

## Run it

### Option A — In the n8n editor
1. Import [`workflow/narrativeai-workflow.json`](workflow/narrativeai-workflow.json).
2. Attach an OpenAI credential to the three LLM nodes (the bundled n8n AI credits allow `gpt-4.1-mini`).
3. Click **Execute Workflow** — the `Run Test` trigger feeds the sample noir-thriller case through the whole pipeline.
4. Open the **Generate PDF** (or **Respond**) node and download the produced PDF.

### Option B — Live webhook
```bash
curl -X POST https://<your-n8n-host>/webhook/narrative-ai \
  -H "Content-Type: application/json" \
  -d @examples/sample-request.json \
  --output NarrativeAI_Story_Production_Report.pdf
```

## Input fields

| Field | Description |
|-------|-------------|
| `content` | The current narrative beat / writer input |
| `storyBibleContext` | Existing canon (characters, world, prior events) |
| `genre`, `tone`, `pacing` | Stylistic controls |
| `constraints` | Hard rules the scenes must honour |
| `sessionId` | Conversation key for session memory |

## Repository layout

```
.
├── workflow/narrativeai-workflow.json   # Importable n8n workflow (15 nodes)
├── src/generate-pdf.js                  # Pure-JS PDF generator (Code node source)
├── examples/sample-request.json         # Example webhook payload
├── docs/
│   ├── NarrativeAI_Source_Code.pdf      # Full source as a PDF
│   └── sample-output.png                # Working output screenshot
├── LICENSE
└── README.md
```

## Tech stack

`n8n` · LangChain agent nodes · OpenAI `gpt-4.1-mini` · session memory · Narrative Coherence Scoring · pure-JavaScript PDF rendering.

---

<p align="center"><em>Built for the Capgemini Excellencer AgentifAI Buildathon.</em></p>

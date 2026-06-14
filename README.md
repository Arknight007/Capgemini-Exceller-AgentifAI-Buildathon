# NarrativeAI — Story Co-Writer Agent

**Capgemini Excellencer "AgentifAI" Buildathon — Round 2 (Deep Dive Submission)**

An agentic, multi-LLM **story production pipeline** built on n8n. A single request runs three specialised AI agents in sequence — Scene Planning, Continuity Validation, and Story-Bible canonisation — and returns a finished, formatted **PDF report** generated entirely inside the workflow (no external PDF service or credentials).

---

## Architecture

```
POST /webhook/narrative-ai          (or the Manual Trigger for in-editor testing)
        │
        ▼
  Normalize Writer Input            (defensive field mapping + defaults)
        │
        ▼
  Scene Planner Agent      ── LLM: gpt-4.1-mini (temp 0.8) + session memory
        │                          → 3 ranked scene suggestions
        ▼
  Continuity Guard Agent   ── LLM: gpt-4.1-mini (temp 0.1)
        │                          → 5-dimension validation + Narrative Coherence Score (NCS)
        ▼
  Story Bible Agent        ── LLM: gpt-4.1-mini (temp 0.3)
        │                          → canonical Story Bible (characters, world, lore, change log)
        ▼
  Assemble Final Report             (combines all three outputs)
        │
        ▼
  Generate PDF                      (pure-JavaScript PDF writer — zero dependencies)
        │
        ▼
  Respond with Story Package        (returns application/pdf)
```

## The three agents

| Agent | Role | Output |
|-------|------|--------|
| **Scene Planner** | Senior story co-writer | 3 ranked scenes (summary, narrative purpose, character impact, threads, opening line) |
| **Continuity Guard** | Narrative QA | Per-scene PASS/WARN/FAIL across character, timeline, location, relationships and constraints, plus an overall NCS and APPROVE/REVISE/REJECT |
| **Story Bible Agent** | Canon keeper | Complete updated Story Bible with a change log |

## Why a custom PDF generator

n8n Cloud's Code node cannot import npm packages (pdfkit, jspdf, etc.). `src/generate-pdf.js` therefore implements a self-contained PDF writer in pure JavaScript: it builds the PDF object graph by hand (catalog, pages, Helvetica/Helvetica-Bold fonts, content streams, xref table), with automatic text wrapping, pagination, and lightweight Markdown styling. No dependencies, no API keys.

## Run it

### Option A — In the n8n editor
1. Import `workflow/narrativeai-workflow.json`.
2. Attach an OpenAI credential to the three LLM nodes (the bundled n8n AI credits allow `gpt-4.1-mini`).
3. Click **Execute Workflow**. The `Run Test` trigger feeds the sample noir-thriller case through the whole pipeline.
4. Open the **Generate PDF** node and download the produced PDF.

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
├── docs/                                # Source-code PDF
└── README.md
```

## Tech stack

n8n · LangChain agent nodes · OpenAI `gpt-4.1-mini` · session memory · pure-JavaScript PDF rendering.

---

*Built for the Capgemini Excellencer AgentifAI Buildathon.*

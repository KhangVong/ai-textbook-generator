# Feature Specification: Core Textbook Generation Engine

## 1. Overview
The Core Textbook Generation Engine is the primary feature of the AI Textbook Generator application. It allows users to input any topic and automatically generate a highly structured, rigorous, and visually rich textbook using a customizable Large Language Model (LLM) backend (such as DeepSeek or OpenAI).

The core philosophy of this engine is **structured multi-agent generation**, breaking down the monumental task of writing a textbook into smaller, orchestratable steps: Profiling, Outline Generation, and Chapter Generation (with tool calling).

## 2. User Scenarios & Flow

### Scenario 1: Topic Input and Profiling
- **User Action**: The user enters a topic they want to master (e.g., "Microeconomics" or "Biology") into the NlpWizard interface.
- **System Response**: The system calls a "Profiler Agent" which infers the optimal Target Audience, Tone & Style, and Prerequisites based on the topic.
- **User Action**: The user reviews these inferred settings and can edit them before confirming.

### Scenario 2: Outline Generation
- **User Action**: The user clicks "Generate Curriculum".
- **System Response**: The system queries the LLM (bypassing restrictive SDK stream parsers for maximum compatibility) to generate a deeply nested JSON outline (Chapters -> Sections -> Subsections).
- **User Action**: The user is navigated to an Outline Editor where they can review, reorganize, or modify the structure of the textbook.

### Scenario 3: Chapter Generation with Tools
- **User Action**: The user selects a node (chapter/section) from the outline and clicks "Generate Content".
- **System Response**: The frontend orchestrator (`useGenerationEngine`) sends the chapter prompt, target audience, tone, and the *cleaned outline context* to the backend.
- **LLM Execution**: The backend streams the markdown response. If the LLM determines a visual aid is necessary, it can call specific tools (`generate_diagram` for Mermaid.js, `generate_chart` for Python Matplotlib).
- **Frontend Rendering**: As the stream arrives, the frontend renders the Markdown, correctly formatting block/inline LaTeX math (`$$...$$` and `$...$`), and rendering Mermaid SVGs and Python code blocks natively in the document.

## 3. Functional Requirements

### 3.1 LLM Configuration
- **FR1**: The system MUST allow users to configure their own `X-OpenAI-Key`, `X-Base-URL`, and `X-Model-Name`.
- **FR2**: The system MUST support OpenAI-compatible endpoints natively (e.g., DeepSeek API).

### 3.2 Outline Generation
- **FR3**: Outline generation MUST return a strictly formatted JSON array representing the nested structure.
- **FR4**: Outline generation MUST utilize native HTTP Fetch streams instead of SDK-specific text streams to prevent silent failures and aborted streams (especially critical for DeepSeek API compatibility).

### 3.3 Context-Aware Content Generation
- **FR5**: The chapter generation prompt MUST dynamically inject the `targetAudience` and `tone` metadata.
- **FR6**: The chapter generation prompt MUST inject a simplified version of the textbook outline (`outlineContext`) to prevent hallucinations and duplicated content across chapters.

### 3.4 Tool Calling (Function Calling)
- **FR7**: The system MUST support LLM Function Calling to enhance textbook content.
- **FR8**: Supported tools MUST include:
  - `generate_diagram`: Generates Mermaid.js syntax for flowcharts and topologies.
  - `generate_chart`: Generates Python `matplotlib.pyplot` code for mathematical plotting.
- **FR9**: Tool call outputs MUST be intercepted by the backend and injected into the markdown stream as specific code blocks (e.g., ` ```mermaid ` and ` ```python-chart `).

## 4. Success Criteria

- **SC1**: Users can successfully generate a 5+ chapter outline without the API request silently failing or timing out.
- **SC2**: Content generation adheres strictly to the Target Audience depth and Tone defined in the profiling stage.
- **SC3**: Tool calls for diagrams and charts are successfully parsed and rendered in the frontend reading view.
- **SC4**: Mathematical equations are consistently formatted using standard LaTeX delimiters (`$` and `$$`) without conflicting symbols.

## 5. Edge Cases & Constraints

- **API Rate Limits / Context Limits**: Handling deep hierarchies might exceed token limits. The system passes a "cleaned" outline (titles and levels only, no full text) to the content generator to save tokens.
- **Markdown Formatting Errors**: LLMs may occasionally hallucinate markdown tags or output invalid Mermaid syntax. The frontend must gracefully catch and display Mermaid parsing errors without crashing the entire reader.
- **Stream Interruptions**: Connection drops or unsupported API region errors MUST be propagated cleanly to the UI as readable error messages, not silently swallowed.

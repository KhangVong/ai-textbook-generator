# AI Textbook Generator: Project Learnings & Conventions

This file documents the critical architectural decisions, quirks, and workarounds discovered during the development of this project. **Always read this file before starting new tasks to avoid regressions or repeated mistakes.**

## 1. Architecture: Asynchronous Generation Pipeline
- **Problem**: Next.js API routes on Vercel (Hobby tier) timeout after 10-60 seconds, which is too short for a full RAG + LLM drafting pipeline.
- **Solution**: We use a background worker pattern via Supabase.
  - The frontend calls `POST /api/generate` to insert a job into the `generation_jobs` table.
  - The API fires a detached asynchronous function `runPipeline()` and immediately returns the `jobId`.
  - The frontend polls `GET /api/jobs/[id]` every 2 seconds to update the UI based on `job.status`.
- **Constraint**: Because `runPipeline()` runs detached, it cannot access HTTP headers. Any dynamic user configurations (e.g., `apiKey`, `baseURL`, `modelName` from `useTextbookStore`) **must be passed explicitly in the JSON request body**.

## 2. Supabase Configuration
- The background pipeline requires inserting rows into `generation_jobs`. 
- Since the backend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon Key) rather than a Service Role Key, the table **must have Row Level Security (RLS) disabled** (`ALTER TABLE public.generation_jobs DISABLE ROW LEVEL SECURITY;`), or an explicit `INSERT/SELECT/UPDATE` policy for anonymous users.
- **Reminder**: SQL migrations in the `supabase/migrations/` folder must be manually executed on the remote Supabase dashboard if the CLI is not linked.

## 3. Next.js 15+ Dynamic Routes
- In Next.js 15, dynamic route parameters (e.g., `params.id`) are asynchronous and **must be awaited**. 
- Correct usage:
  ```typescript
  export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // ...
  }
  ```

## 4. Vercel AI SDK (`ai` package) & DeepSeek Compatibility
- The `@ai-sdk/core` has strict typings for `tools` and `generateObject`. 
- **DeepSeek V1 API Issue**: DeepSeek currently explicitly rejects `response_format: { type: "json_schema" }` with the error `"This response_format type is unavailable now"`.
  - Because we use the `@ai-sdk/openai` provider to talk to DeepSeek, the AI SDK automatically tries to send `json_schema` for any `generateObject()` calls.
  - **Solution**: You must pass `mode: 'json'` into `generateObject()` to force it to use standard JSON mode and parse the schema client-side using Zod.
- **Vercel Build Type Errors**: Vercel `next build` enforces strict TypeScript checking. 
  - The `mode` property might trigger `Object literal may only specify known properties, but 'mode' does not exist` depending on your exact `ai` package version.
  - The `tool()` wrapper's `execute` function may trigger `Type error: No overload matches this call... not assignable to type 'undefined'`.
  - **Workaround**: Use `// @ts-ignore` immediately above `mode: 'json'` and `execute:` to bypass these type mismatch errors so that Vercel builds successfully.
- Dynamic model initialization should be done using `createOpenAI()` from `@ai-sdk/openai` to explicitly inject the user's `apiKey` and `baseURL` received from the request body.

## 5. LaTeX and Markdown Rendering
- The frontend Markdown parser has strict parsing rules for mathematical formulas.
- Avoid using `\[ ... \]` or `\begin{equation}` for block equations, as they often break the React Markdown parser.
- **Rule**: Always coerce LLMs to output block equations using double dollar signs (`$$ ... $$`) and inline equations using single dollar signs (`$ ... $`). The `sanitizeLatex` utility enforcing this is critical.

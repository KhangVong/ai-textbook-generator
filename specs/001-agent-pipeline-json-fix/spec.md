# Agent Pipeline JSON Extraction Fix

## 1. Description
The core generation pipeline uses a Map-Reduce architecture where a Router Agent ("主理人") breaks down a topic into sub-tasks for Specialist Agents. The Router Agent utilizes the DeepSeek V3 model through the Vercel AI SDK OpenAI provider. Due to SDK typing bugs and internal Zod-to-JSON Schema conversion failures (throwing `type: null` errors), the `submit_plan` function call was crashing. This feature updates the backend pipeline to use a native, raw JSON Schema for tool parameters, completely bypassing third-party Zod transformations to guarantee 100% stability in JSON extraction.

## 2. User Scenarios & Testing
- **Scenario 1: Topic Breakdown**
  - **User**: Clicks "Generate Now" on a complex textbook topic node.
  - **System**: The backend Router Agent processes the request, correctly validates the native JSON Schema, and successfully returns a valid JSON array of tasks without silently crashing or throwing `type: null` schema errors.
  - **User**: Sees "主理人正在拆解子任务..." followed by the actual generated content streaming in from the specialist agents.

## 3. Functional Requirements
1. **Raw JSON Schema Definition**: The `submit_plan` tool must be defined using a pure JSON schema object containing `type: "object"` and standard JSON Schema property definitions, removing any `z.object` or `tool()` wrappers that cause compatibility issues with the DeepSeek API.
2. **Graceful Fallback String Parsing**: If the OpenAI provider adapter returns the `toolCall.arguments` payload as a string instead of a pre-parsed object, the backend must use a resilient `try/catch JSON.parse()` block to extract the task array.
3. **Explicit Prompt Enforcement**: The system prompt must contain a strict fallback instruction (`CRITICAL: You MUST call the 'submit_plan' function/tool to provide the breakdown`) to guarantee the function is invoked, as `toolChoice: 'required'` is incompatible with DeepSeek's OpenAI compatibility layer.
4. **UI Error Surfacing**: Any pipeline parsing errors must be streamed directly to the frontend editor UI as a bold markdown block (`> ❌ **AGENT PIPELINE ERROR:**`) instead of aborting the connection silently.

## 4. Success Criteria
- **Zero Schema Crashes**: DeepSeek API accepts the function call schema with a 100% success rate.
- **Robust Parsing**: The system successfully parses and executes the returned JSON array regardless of whether the SDK returns a string or object payload.
- **Transparent Debugging**: All pipeline crashes are visible in the frontend editor.

## 5. Assumptions & Constraints
- **DeepSeek Compatibility**: We assume the OpenAI provider inside the Vercel AI SDK handles raw JSON schemas gracefully, and DeepSeek fully supports standard OpenAI function call shapes.
- **No Native `toolChoice` Support**: Due to DeepSeek API restrictions, we constrain the implementation to rely on prompt engineering rather than rigid API-level `toolChoice` enforcement.

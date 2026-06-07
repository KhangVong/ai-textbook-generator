import os
import json
import argparse
from dotenv import load_dotenv
from openai import OpenAI
from agents import TextbookWriterEngine

def main():
    parser = argparse.ArgumentParser(description="Offline Textbook Generator via Function Calling")
    parser.add_argument("topic", type=str, help="The topic to generate content for")
    parser.add_argument("--target_audience", type=str, default="undergraduate level", help="The target audience for the textbook")
    parser.add_argument("--tone", type=str, default="comprehensive and rigorous", help="The tone and style of writing")
    parser.add_argument("--outline_context", type=str, default="", help="The textbook outline context (JSON or text)")
    args = parser.parse_args()

    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-4o")

    if not api_key or api_key == "your_openai_api_key_here":
        print("❌ Error: Please set your OPENAI_API_KEY in the .env file.")
        return

    client = OpenAI(api_key=api_key, base_url=base_url)
    engine = TextbookWriterEngine(
        client=client, 
        model=model_name,
        target_audience=args.target_audience,
        tone=args.tone,
        outline_context=args.outline_context
    )

    print(f"\n🚀 Starting generation for topic: {args.topic}")
    print("✍️ Lead Writer is writing and invoking tools...")
    print("=" * 60 + "\n")

    messages = [
        {"role": "system", "content": engine.get_system_prompt()},
        {"role": "user", "content": f"Please write a comprehensive textbook chapter for the topic: \"{args.topic}\""}
    ]

    final_document = ""

    while True:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                tools=engine.get_tools(),
                tool_choice="auto",
                temperature=0.1,
                stream=True
            )
        except Exception as e:
            print(f"\n❌ API Error: {e}")
            return

        content = ""
        tool_calls_raw = {}

        for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            # 1. Stream text content
            if delta.content is not None:
                text = delta.content
                print(text, end="", flush=True)
                content += text

            # 2. Stream tool calls
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    index = tc.index
                    if index not in tool_calls_raw:
                        tool_calls_raw[index] = {
                            "id": "",
                            "type": "function",
                            "function": {"name": "", "arguments": ""}
                        }
                    if tc.id:
                        tool_calls_raw[index]["id"] += tc.id
                    if tc.function:
                        if tc.function.name:
                            tool_calls_raw[index]["function"]["name"] += tc.function.name
                        if tc.function.arguments:
                            tool_calls_raw[index]["function"]["arguments"] += tc.function.arguments

        print()  # Final newline for the text stream block

        # Append assistant message to history
        assistant_msg = {"role": "assistant"}
        if content:
            # Clean up LaTeX delimiters
            content_cleaned = content.replace("\\(", "$").replace("\\)", "$").replace("\\[", "$$").replace("\\]", "$$")
            final_document += content_cleaned
            assistant_msg["content"] = content
        else:
            assistant_msg["content"] = None

        if tool_calls_raw:
            tool_calls = []
            for index in sorted(tool_calls_raw.keys()):
                tool_calls.append(tool_calls_raw[index])
            assistant_msg["tool_calls"] = tool_calls
            messages.append(assistant_msg)

            # Execute tool calls and insert placeholders
            for tc in tool_calls:
                tool_name = tc["function"]["name"]
                arguments_str = tc["function"]["arguments"]
                tool_id = tc["id"]

                try:
                    arguments = json.loads(arguments_str)
                except Exception as e:
                    arguments = {}

                print(f"\n⚙️ [SYSTEM: Executing Tool '{tool_name}']")

                if tool_name == "generate_diagram":
                    code = arguments.get("mermaid_code", "")
                    formatted_block = f"\n\n```mermaid\n{code.strip()}\n```\n\n"
                    final_document += formatted_block
                    print(f"✅ Mermaid flowchart inserted ({len(code)} chars)")

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "name": tool_name,
                        "content": "Diagram successfully generated and inserted into the document."
                    })
                elif tool_name == "generate_chart":
                    code = arguments.get("matplotlib_code", "")
                    formatted_block = f"\n\n```python-chart\n{code.strip()}\n```\n\n"
                    final_document += formatted_block
                    print(f"✅ Matplotlib code block inserted ({len(code)} chars)")

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "name": tool_name,
                        "content": "Chart successfully generated and inserted into the document."
                    })
                else:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "name": tool_name,
                        "content": f"Error: Unknown tool '{tool_name}'."
                    })
            print("\n" + "-"*30 + "\n")
        else:
            messages.append(assistant_msg)
            # No tool calls means the text is complete!
            break

    print("\n" + "=" * 60 + "\n")
    output_file = "output.md"
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(final_document)
        print(f"✅ Generation complete! Output saved to {output_file}")
    except Exception as e:
        print(f"❌ Error saving output: {e}")

if __name__ == "__main__":
    main()

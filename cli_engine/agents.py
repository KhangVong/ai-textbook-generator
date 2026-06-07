import json
from openai import OpenAI

class TextbookWriterEngine:
    def __init__(self, client: OpenAI, model: str, target_audience: str = "undergraduate level", tone: str = "comprehensive and rigorous", outline_context: str = ""):
        self.client = client
        self.model = model
        self.target_audience = target_audience
        self.tone = tone
        self.outline_context = outline_context

    def get_tools(self):
        return [
            {
                "type": "function",
                "function": {
                    "name": "generate_diagram",
                    "description": "Generate a Mermaid.js flowchart to visualize a concept or process. Use this tool only when a diagram is genuinely helpful for the reader.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "mermaid_code": {
                                "type": "string",
                                "description": "The Mermaid.js code. Must follow strict rules: wrap all node text in double quotes, e.g. A[\"label\"], no HTML tags, no <br>."
                            }
                        },
                        "required": ["mermaid_code"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_chart",
                    "description": "Generate a Python Matplotlib chart to plot a mathematical function or geometric figure. Use this tool only when a plot is genuinely helpful. Do not use for statistical charts (bar/line/pie charts of data).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "matplotlib_code": {
                                "type": "string",
                                "description": "The Python code using matplotlib.pyplot. Must follow strict rules: no plt.show() or plt.savefig(), format beautifully (grid, labels), no statistical plots."
                            }
                        },
                        "required": ["matplotlib_code"]
                    }
                }
            }
        ]

    def get_system_prompt(self) -> str:
        prompt = f"""You are a master Textbook Writer Agent. Your job is to write a {self.tone} textbook chapter on the requested topic.
The target audience for this textbook is: {self.target_audience}. Please adjust your depth of explanation, vocabulary, and mathematical rigor accordingly.

"""
        if self.outline_context:
            prompt += f"""To give you context, here is the full framework/outline of the textbook:
<textbook_outline>
{self.outline_context}
</textbook_outline>
Please ensure your current chapter fits seamlessly into this overall structure without repeating information from other chapters unnecessarily.

"""
        
        prompt += """Your writing must follow these strict guidelines:
1. Write both intuitive explanations (prose) and rigorous mathematics.
2. For all inline math, you MUST use $...$ (e.g., $n > 1$, $p \\mid ab$). Never use \\( ... \\).
3. For all block math, you MUST use $$...$$ (e.g., $$ n = p_1 \\cdots p_k $$). Never use \\[ ... \\].
4. Do NOT output QED symbols (such as \\square, \\blacksquare, \\qed, \\QED, □, or ∎) or any other end-of-proof markers (including boxed symbols) at the end of proofs. Finish them naturally with a clear summary or concluding sentence.
5. Do NOT output mixed repetitive symbols like 'a,b∈Za, b \\in \\mathbb{Z}'. Use clean, singular LaTeX.
6. Write naturally, starting directly with the chapter header and content. Do not include meta-commentary like "Sure, here is the text".
7. Strongly adhere to the requested tone and style. Do not drift into casual language if the tone is formal, or overly dense language if the tone is conversational.

You have access to two tools to make the textbook visually rich:
- `generate_diagram`: Use this to generate a Mermaid.js flowchart if a process or structure warrants visualization.
- `generate_chart`: Use this to generate a Python Matplotlib chart to plot a mathematical function or geometric figure. DO NOT use this for statistical data charts (bar/line/pie charts).

Guidelines for using tools:
- Call them at the exact position in the text where the diagram or chart should be displayed.
- After calling a tool, the orchestrator will insert the generated code block and reply to you. You can then continue writing from where you left off.
- Do not duplicate the code block in your regular text output; calling the tool is sufficient.
"""
        return prompt

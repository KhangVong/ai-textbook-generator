/**
 * Sanitizes LaTeX output from LLMs to ensure it's properly formatted
 * for react-markdown and rehype-katex.
 * 
 * - Ensures inline math is strictly wrapped in $...$ and not \(...\)
 * - Ensures block math is strictly wrapped in $$...$$ and not \[...\]
 */
export function sanitizeLatex(rawLatex: string, isBlock: boolean): string {
  if (!rawLatex) return "";

  // 1. Remove any existing wrapper artifacts that the LLM might have left
  let clean = rawLatex
    .replace(/^\\\[|\\\]$/g, "") // Remove \[ and \]
    .replace(/^\\\(|\\\)$/g, "") // Remove \( and \)
    .replace(/^\$\$|\$\$$/g, "") // Remove $$
    .replace(/^\$|\$$/g, ""); // Remove $

  clean = clean.trim();

  // 2. Wrap perfectly
  if (isBlock) {
    return `\n$$\n${clean}\n$$\n`;
  } else {
    return `$${clean}$`;
  }
}

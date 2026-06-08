import { z } from 'zod';
import { search, SafeSearchType } from 'duck-duck-scrape';
import { tool } from 'ai';

export const webSearchTool = tool({
  description: 'Search the web for up-to-date information, textbook outlines, or academic papers. Use this tool BEFORE writing content to ensure factual accuracy.',
  parameters: z.object({
    query: z.string().describe('The search query. Be specific, e.g., "Introduction to Quantum Computing syllabus 2024"'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      console.log(`[SearchTool] Querying: ${query}`);
      const searchResults = await search(query, {
        safeSearch: SafeSearchType.OFF
      });
      
      const results = searchResults.results.slice(0, 5).map(r => ({
        title: r.title,
        url: r.url,
        description: r.description
      }));
      
      return { query, results };
    } catch (error: any) {
      console.error("[SearchTool] Error:", error);
      return { error: "Failed to fetch search results. Try a different query." };
    }
  },
});

import JSZip from 'jszip';
import { OutlineNode } from '@/store/useTextbookStore';

/**
 * Traverses the outline tree to flatten it into an ordered list.
 */
function flattenOutline(nodes: OutlineNode[], depthOffset: number = 0): { node: OutlineNode; depth: number }[] {
  let result: { node: OutlineNode; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth: node.level + depthOffset });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenOutline(node.children, depthOffset));
    }
  }
  return result;
}

/**
 * 1. Export to Markdown
 */
export function exportToMarkdown(title: string, outline: OutlineNode[]): string {
  let md = `# ${title}\n\n`;
  const flatNodes = flattenOutline(outline);

  for (const { node, depth } of flatNodes) {
    const heading = '#'.repeat(Math.min(depth + 1, 6)); // # for h1 (Title), ## for chapters, etc.
    md += `${heading} ${node.title}\n\n`;
    if (node.content) {
      md += `${node.content}\n\n`;
    }
  }

  return md;
}

/**
 * 2. Export to HTML
 */
export function exportToHTML(title: string, outline: OutlineNode[]): string {
  const flatNodes = flattenOutline(outline);
  // Optional: convert markdown content to HTML if needed, but for simplicity we will just inject simple HTML structure 
  // since the user can use marked/react-markdown. For a standalone HTML, injecting marked.js via CDN is a robust approach.
  
  let bodyContent = `<h1>${title}</h1>\n`;
  for (const { node, depth } of flatNodes) {
    const hLevel = Math.min(depth + 1, 6);
    bodyContent += `<h${hLevel} id="${node.id}">${node.title}</h${hLevel}>\n`;
    if (node.content) {
      // In a real app we'd compile the markdown. Here we wrap in a div with marked class.
      // We'll use a CDN marked.js to render it perfectly upon opening.
      bodyContent += `<div class="markdown-body">\n\n${node.content}\n\n</div>\n`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #111;
    margin-top: 1.5em;
  }
  .markdown-body {
    margin-bottom: 2rem;
  }
</style>
</head>
<body>
  ${bodyContent}
  
  <script>
    // Automatically parse all markdown divs
    document.querySelectorAll('.markdown-body').forEach(el => {
      el.innerHTML = marked.parse(el.textContent);
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * 3. Export to EPUB
 * Uses JSZip to generate a valid EPUB 3 container.
 */
export async function exportToEPUB(title: string, outline: OutlineNode[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype (MUST be uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  const flatNodes = flattenOutline(outline);
  const OEBPS = zip.folder('OEBPS');
  if (!OEBPS) throw new Error('Failed to create OEBPS folder');

  // Build manifest & spine for content.opf
  let manifestItems = '';
  let spineItems = '';
  let tocNavMap = '';
  
  flatNodes.forEach((item, index) => {
    const id = `chapter_${index}`;
    const filename = `${id}.xhtml`;
    const hLevel = Math.min(item.depth + 1, 6);
    
    // We escape title for XML
    const xmlTitle = item.node.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    manifestItems += `    <item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
    spineItems += `    <itemref idref="${id}"/>\n`;
    
    tocNavMap += `
    <navPoint id="navPoint-${index}" playOrder="${index + 1}">
      <navLabel><text>${xmlTitle}</text></navLabel>
      <content src="${filename}"/>
    </navPoint>`;

    // Extremely basic XHTML compilation (EPUB requires valid XHTML)
    // We don't have a perfect markdown to HTML converter natively without importing an async one, 
    // so we wrap content in <pre> if it's markdown, or just simple paragraphs.
    // For a robust EPUB, markdown should be compiled first. We will do a basic compilation.
    const escapedContent = (item.node.content || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .split('\n\n')
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');

    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${xmlTitle}</title>
</head>
<body>
  <h${hLevel}>${xmlTitle}</h${hLevel}>
  ${escapedContent}
</body>
</html>`;
    
    OEBPS.file(filename, xhtml);
  });

  // content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="pub-id">urn:uuid:12345</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}  </manifest>
  <spine toc="ncx">
${spineItems}  </spine>
</package>`;
  OEBPS.file('content.opf', contentOpf);

  // toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
${tocNavMap}
  </navMap>
</ncx>`;
  OEBPS.file('toc.ncx', tocNcx);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadString(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

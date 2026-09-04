'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const mdFile = process.argv[2];
const pdfFile = process.argv[3];

if (!mdFile || !pdfFile) {
  console.error('Uso: node md-to-pdf.js <input.md> <output.pdf>');
  process.exit(1);
}

function findEdge() {
  for (const p of EDGE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No se encontró Microsoft Edge. Probá con Chrome u otro Chromium.');
}

function mdToHtml(md) {
  let html = md;

  // Escape mínimo y conversión básica de Markdown a HTML
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');

  // Tablas: muy simplificado. Convierte líneas que parecen fila de tabla.
  html = html.replace(
    /^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)+)/gm,
    (match, header, _sep, body) => {
      const head = header
        .trim()
        .split('|')
        .slice(1, -1)
        .map((c) => `<th>${c.trim()}</th>`)
        .join('');
      const rows = body
        .trim()
        .split('\n')
        .map((row) => {
          const cells = row
            .trim()
            .split('|')
            .slice(1, -1)
            .map((c) => `<td>${c.trim()}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Bloques de código
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</code></pre>`;
  });

  // Código en línea
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Negrita
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Enlaces
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>'
  );

  // Listas
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);

  // Párrafos: cualquier línea en blanco crea un párrafo
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<ul')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

(async () => {
  const md = fs.readFileSync(mdFile, 'utf8');
  const html = mdToHtml(md);

  const styledHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Deployment Report</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.5; }
  h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
  h2 { color: #1e40af; margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h3 { color: #1e3a8a; margin-top: 24px; }
  h4 { color: #374151; margin-top: 20px; }
  p { margin: 8px 0; }
  ul { padding-left: 24px; }
  li { margin: 4px 0; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; font-size: 0.9em; }
  pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 0.9em; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
  th { background: #e0e7ff; color: #1e3a8a; font-weight: 600; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
</style>
</head>
<body>
${html}
</body>
</html>
`;

  const browser = await puppeteer.launch({
    executablePath: findEdge(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfFile,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });

  await browser.close();

  const stats = fs.statSync(pdfFile);
  console.log(`PDF generado: ${pdfFile} (${(stats.size / 1024).toFixed(1)} KB)`);
})().catch((err) => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
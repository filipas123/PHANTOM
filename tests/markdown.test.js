import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Markdown Renderer Security', () => {
  beforeAll(() => {
    // Setup minimal DOM environment for window.renderMarkdown
    global.window = {};
    const markdownCode = fs.readFileSync(path.join(__dirname, '../frontend/js/markdown.js'), 'utf8');
    eval(markdownCode);
  });

  it('should block javascript: URIs', () => {
    const html = window.renderMarkdown('[Click me](javascript:alert("XSS"))');
    expect(html).toContain('href="#"');
    expect(html).not.toContain('javascript:alert');
  });

  it('should block URL-encoded javascript: URIs', () => {
    const html = window.renderMarkdown('[Click me](javascript%3Aalert("XSS"))');
    expect(html).toContain('href="#"');
    expect(html).not.toContain('javascript%3Aalert');
  });

  it('should block data: URIs', () => {
    const html = window.renderMarkdown('[Click me](data:text/html,<script>alert(1)</script>)');
    expect(html).toContain('href="#"');
    expect(html).not.toContain('data:text');
  });

  it('should block URL-encoded data: URIs', () => {
    const html = window.renderMarkdown('[Click me](data%3Atext/html,<script>alert(1)</script>)');
    expect(html).toContain('href="#"');
    expect(html).not.toContain('data%3Atext');
  });

  it('should allow valid http/https URIs', () => {
    const html = window.renderMarkdown('[Safe Link](https://google.com)');
    expect(html).toContain('href="https://google.com"');
  });
});

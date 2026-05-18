## 2024-05-24 - Event loop blocking via child_process.execSync
**Learning:** Using `execSync` for shell commands block the Node.js event loop, degrading API response times and overall application concurrency.
**Action:** Replaced sequential `execSync` calls with `await execAsync` (`util.promisify(exec)`) and used `Promise.allSettled` to execute independent system commands in parallel across API routes like `/system/info` and `/doctor/chat`. This ensures non-blocking I/O and faster parallel execution.

## 2024-05-16 - [Typing Animation Loop O(N^2) Bottleneck in Markdown Rendering]
**Learning:** In `frontend/js/chat.js`, the `_startTypingLoop` function renders characters gradually via `requestAnimationFrame`. However, on *every single frame* where a new character is rendered, it re-evaluates the *entire* accumulated markdown string via `window.renderMarkdown(this.renderedContent)`. This O(N^2) scaling behavior makes markdown rendering performance exceptionally critical for UI responsiveness during long AI responses, elevating the importance of micro-optimizations like regex consolidation that would normally be premature.
**Action:** Always scrutinize rendering loops tied to `requestAnimationFrame` for re-evaluation of growing strings. Micro-optimizations to string parsing are highly justified when the parsing occurs inside an O(N^2) render loop like a typing animation.

## $(date +%Y-%m-%d) - [SSE Stream Parsing Errors due to Chunking]
**Learning:** When parsing Server-Sent Events (SSE) directly from a stream, chunks do not necessarily align with logical message boundaries (like newlines). Splitting arbitrary stream chunks by `\n` without buffering incomplete lines results in dropped events and `JSON.parse` errors.
**Action:** Introduced a buffering mechanism when reading SSE streams in the frontend (`app.js` and `settings.js`) to accumulate chunks, split by the event delimiter, and properly handle incomplete trailing lines by leaving them in the buffer for the next chunk.

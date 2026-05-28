import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import telegramifyMarkdown from 'telegramify-markdown';

/**
 * THE CORE FUNCTION — converts any AI markdown output to clean Telegram MarkdownV2
 * then sends it in chunks if needed.
 */
export async function sendAIReply(bot, chatId, markdownText) {
  if (!markdownText || markdownText.trim() === '') return;

  // Convert the AI's standard markdown to Telegram MarkdownV2
  let converted;
  try {
    converted = telegramifyMarkdown(markdownText, 'escape');
  } catch (err) {
    // If conversion fails for any reason, fall back to plain text
    console.error('[Telegram] Markdown conversion failed, sending plain:', err.message);
    await sendPlain(bot, chatId, markdownText);
    return;
  }

  // Split into chunks of max 4096 chars (Telegram hard limit)
  const chunks = splitIntoChunks(converted, 4096);

  for (const chunk of chunks) {
    try {
      await bot.sendMessage(chatId, chunk, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      });
    } catch (err) {
      // MarkdownV2 failed — fall back to plain text for this chunk
      console.error('[Telegram] MarkdownV2 send failed, falling back to plain:', err.message);
      // Strip markdown symbols and send as plain
      const plain = markdownText.slice(0, 4096);
      await sendPlain(bot, chatId, plain);
    }
  }
}

/**
 * Sends a plain text message — no formatting.
 * Used for status updates, errors, and fallback.
 */
export async function sendPlain(bot, chatId, text) {
  const chunks = splitIntoChunks(String(text), 4096);
  for (const chunk of chunks) {
    try {
      await bot.sendMessage(chatId, chunk);
    } catch (err) {
      console.error('[Telegram] Failed to send plain message:', err.message);
    }
  }
}

/**
 * Sends a tool execution status card.
 * Clean, minimal — shows what tool is running and its status.
 */
export async function sendToolUpdate(bot, chatId, toolName, input, status) {
  const icons = {
    execute_command: '🖥️', read_file: '📄', write_file: '✏️',
    list_directory: '📁', search_web: '🔍', web_request: '🌐',
    save_memory: '🧠', recall_memory: '💭', edit_source_code: '⚙️',
    save_trace: '📋', send_file_to_telegram: '📤',
  };
  const statusMap = { running: '🔄 Running', done: '✅ Done', failed: '❌ Failed' };
  const icon = icons[toolName] || '🔧';
  const statusText = statusMap[status] || status;
  const preview = input ? String(input).slice(0, 60) + (String(input).length > 60 ? '…' : '') : '';

  // Build this as a simple MarkdownV2 message manually (no conversion needed — we control all content)
  const safeToolName = toolName.replace(/_/g, '\\_');
  const safePreview = preview.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
  const msg = `${statusText} ${icon} \`${safeToolName}\`\n${safePreview ? '`' + safePreview + '`' : ''}`;

  try {
    await bot.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' });
  } catch {
    await sendPlain(bot, chatId, `${statusText} ${toolName}${preview ? ': ' + preview : ''}`);
  }
}

/**
 * Sends an error message.
 */
export async function sendError(bot, chatId, message) {
  try {
    const safe = String(message).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
    await bot.sendMessage(chatId, `❌ *Error*\n${safe}`, { parse_mode: 'MarkdownV2' });
  } catch {
    await sendPlain(bot, chatId, `❌ Error: ${message}`);
  }
}

/**
 * THE FILE SENDER — sends any file from the server filesystem to Telegram.
 */
export async function sendFile(bot, chatId, filePath, caption = '') {
  // Resolve to absolute path
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  // Security check: only allow files from workspace/ or /tmp/
  const workspaceDir = path.resolve(process.cwd(), 'workspace');
  const tmpDir = '/tmp';
  const isInWorkspace = absPath.startsWith(workspaceDir);
  const isInTmp = absPath.startsWith(tmpDir);

  if (!isInWorkspace && !isInTmp) {
    await sendError(bot, chatId, `File access denied: ${filePath}\nOnly files in workspace/ or /tmp/ can be sent.`);
    return { success: false, error: 'Path outside allowed directories' };
  }

  // Check file exists
  if (!fs.existsSync(absPath)) {
    await sendError(bot, chatId, `File not found: ${filePath}`);
    return { success: false, error: 'File not found' };
  }

  // Check file size (Telegram limit: 50MB for most, 2GB for video with streaming)
  const stats = fs.statSync(absPath);
  const maxBytes = 50 * 1024 * 1024; // 50MB
  if (stats.size > maxBytes) {
    await sendError(bot, chatId, `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`);
    return { success: false, error: 'File too large' };
  }

  const ext = path.extname(absPath).toLowerCase();
  const fileName = path.basename(absPath);
  const mimeType = mime.lookup(absPath) || 'application/octet-stream';
  const fileStream = fs.createReadStream(absPath);
  const captionText = caption || fileName;
  const options = { caption: captionText };

  try {
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
      await bot.sendPhoto(chatId, fileStream, options);
    } else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
      await bot.sendVideo(chatId, fileStream, { ...options, supports_streaming: true });
    } else if (['.mp3', '.m4a', '.wav', '.flac', '.aac'].includes(ext)) {
      await bot.sendAudio(chatId, fileStream, options);
    } else if (ext === '.ogg' && stats.size < 1024 * 1024) {
      await bot.sendVoice(chatId, fileStream, options);
    } else {
      await bot.sendDocument(chatId, fileStream, options, { filename: fileName, contentType: mimeType });
    }
    return { success: true, path: absPath, type: mimeType };
  } catch (err) {
    await sendError(bot, chatId, `Failed to send file: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Splits text at newline boundaries to stay under maxLen.
 */
function splitIntoChunks(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

import fs from 'fs';
import path from 'path';
import { recallMemory } from '../memory/store.js';

/**
 * Runs at the start of every new Telegram session.
 * Reads skills folder and memory store, returns a context string
 * to be prepended to the system prompt.
 *
 * @returns {Promise<{ skillsSummary: string, memorySummary: string, raw: object }>}
 */
export async function bootstrapSession() {
  const [skills, memories] = await Promise.all([
    loadSkills(),
    loadMemories(),
  ]);

  const skillsSummary = formatSkillsSummary(skills);
  const memorySummary = formatMemorySummary(memories);

  return {
    skillsSummary,
    memorySummary,
    raw: { skills, memories },
  };
}

/**
 * Reads the skills folder and returns an array of skill metadata.
 * Skills can be .json files (with name/description fields),
 * .md files (use filename as name, first line as description),
 * or .zip files (use filename as name).
 */
async function loadSkills() {
  const skillsDir = path.resolve(process.cwd(), 'skills');

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = fs.readdirSync(skillsDir);
  const skills = [];

  for (const entry of entries) {
    const fullPath = path.join(skillsDir, entry);
    const stat = fs.statSync(fullPath);

    try {
      if (stat.isDirectory()) {
        // Skill folder — look for skill.json or README.md inside
        const metaPath = path.join(fullPath, 'skill.json');
        const readmePath = path.join(fullPath, 'README.md');

        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          skills.push({
            name: meta.name || entry,
            description: meta.description || 'No description',
            version: meta.version || '1.0.0',
            type: 'folder',
          });
        } else if (fs.existsSync(readmePath)) {
          const lines = fs.readFileSync(readmePath, 'utf8').split('\n');
          const name = lines[0].replace(/^#+\s*/, '').trim() || entry;
          const description = lines.find(l => l.trim() && !l.startsWith('#')) || 'No description';
          skills.push({ name, description: description.trim(), type: 'folder' });
        } else {
          skills.push({ name: entry, description: 'Skill folder', type: 'folder' });
        }
      } else if (entry.endsWith('.json')) {
        const meta = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        skills.push({
          name: meta.name || entry.replace('.json', ''),
          description: meta.description || 'No description',
          version: meta.version || '1.0.0',
          type: 'json',
        });
      } else if (entry.endsWith('.zip')) {
        skills.push({
          name: entry.replace('.zip', ''),
          description: 'Packaged skill',
          type: 'zip',
        });
      }
    } catch (err) {
      // Unreadable skill — include with error note
      skills.push({ name: entry, description: `Could not read: ${err.message}`, type: 'unknown' });
    }
  }

  return skills;
}

/**
 * Loads the most recent memories from the SQLite store.
 * Gets up to 30 most recent entries — enough context without bloating the prompt.
 */
async function loadMemories() {
  try {
    // Use the existing recallMemory function with a broad query
    // to get recent memories
    const memories = await recallMemory('', { limit: 30, orderBy: 'recent' });
    return memories || [];
  } catch (err) {
    console.error('[Bootstrap] Could not load memories:', err.message);
    return [];
  }
}

/**
 * Formats skills into a concise system prompt section.
 */
function formatSkillsSummary(skills) {
  if (!skills || skills.length === 0) {
    return 'No skills installed.';
  }

  const lines = skills.map(s => `- **${s.name}**: ${s.description}`);
  return lines.join('\n');
}

/**
 * Formats memories into a concise system prompt section.
 */
function formatMemorySummary(memories) {
  if (!memories || memories.length === 0) {
    return 'No memories saved yet.';
  }

  // Show the most recent 20, truncate old ones
  const recent = memories.slice(0, 20);
  const lines = recent.map((m, i) => {
    const content = String(m.value || m.content || m).slice(0, 150);
    const key = m.key ? `[${m.key}] ` : '';
    return `${i + 1}. ${key}${content}`;
  });

  if (memories.length > 20) {
    lines.push(`... and ${memories.length - 20} more memories`);
  }

  return lines.join('\n');
}

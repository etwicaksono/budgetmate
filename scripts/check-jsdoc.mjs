#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'app', 'api', 'v1');
const HANDLER_REGEX = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function analyzeFile(filePath, source) {
  const issues = [];
  let match;

  while ((match = HANDLER_REGEX.exec(source)) !== null) {
    const handlerName = match[1];
    const handlerIndex = match.index;
    const commentStart = source.lastIndexOf('/**', handlerIndex);
    const commentEnd = commentStart >= 0 ? source.indexOf('*/', commentStart) : -1;

    if (commentStart < 0 || commentEnd < 0 || commentEnd > handlerIndex) {
      issues.push(`${handlerName}: missing JSDoc block with @summary/@tag`);
      continue;
    }

    const between = source.slice(commentEnd + 2, handlerIndex);
    if (between.trim().length > 0) {
      issues.push(`${handlerName}: code between comment and handler (expected adjacent block)`);
      continue;
    }

    const block = source.slice(commentStart, commentEnd + 2);
    if (!block.includes('@summary')) {
      issues.push(`${handlerName}: missing @summary`);
    }
    if (!block.includes('@tag')) {
      issues.push(`${handlerName}: missing @tag`);
    }
  }

  return issues;
}

async function main() {
  try {
    await stat(API_DIR);
  } catch {
    console.error(`Could not find API directory at ${API_DIR}`);
    process.exit(1);
  }

  const files = await walk(API_DIR);
  let failures = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const issues = analyzeFile(file, source);
    if (issues.length > 0) {
      failures += issues.length;
      console.error(`\n${path.relative(ROOT, file)}:`);
      issues.forEach((issue) => console.error(`  - ${issue}`));
    }
  }

  if (failures > 0) {
    console.error(`\n❌ Found ${failures} handler issue(s). Please fix the items above.`);
    process.exit(1);
  }

  console.log('✅ All API handlers under app/api/v1 include @summary/@tag metadata.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

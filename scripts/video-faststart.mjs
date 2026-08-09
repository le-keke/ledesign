#!/usr/bin/env node
/**
 * Safe MP4 faststart pipeline (no re-encode, no overwrite of originals).
 *
 * 1) Collect video URLs from src/data
 * 2) Download originals → .cache/videos-original/
 * 3) Remux with -c copy -movflags +faststart → .cache/videos-faststart/
 * 4) Copy into public/media-fs/ for localhost testing
 * 5) Optionally upload to Vercel Blob under prefix `fs/` (new paths only)
 * 6) Write URL map → scripts/video-faststart-map.json
 *
 * Usage:
 *   node scripts/video-faststart.mjs                 # download + remux + public copy
 *   node scripts/video-faststart.mjs --upload         # also upload (needs BLOB_READ_WRITE_TOKEN)
 *   node scripts/video-faststart.mjs --apply-local    # rewrite data URLs → /media-fs/...
 *   node scripts/video-faststart.mjs --apply-blob     # rewrite data URLs → new Blob URLs
 *   node scripts/video-faststart.mjs --revert         # restore original URLs from map
 */
import { spawn } from 'node:child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const ORIG_DIR = join(ROOT, '.cache', 'videos-original');
const FS_DIR = join(ROOT, '.cache', 'videos-faststart');
const PUBLIC_DIR = join(ROOT, 'public', 'media-fs');
const MAP_PATH = join(__dirname, 'video-faststart-map.json');

const BLOB_HOST_RE = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//i;
const LOCAL_PREFIX = '/media-fs/';
const BLOB_FS_PREFIX = 'fs/';

const args = new Set(process.argv.slice(2));
const DO_UPLOAD = args.has('--upload');
const APPLY_LOCAL = args.has('--apply-local');
const APPLY_BLOB = args.has('--apply-blob');
const REVERT = args.has('--revert');

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function collectUrls() {
  const files = walkFiles(DATA_DIR).filter((p) => /\.(json|ts)$/.test(p));
  const found = new Map();
  const re =
    /https:\/\/[A-Za-z0-9]+\.public\.blob\.vercel-storage\.com\/[^"'\\\s]+\.mp4/g;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(re)) {
      const url = m[0];
      const path = url.replace(BLOB_HOST_RE, '');
      const key = path.toLowerCase();
      if (!found.has(key)) found.set(key, { url, path });
    }
  }
  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function download(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`  skip download (exists): ${relative(ROOT, dest)}`);
    return;
  }
  ensureDir(dirname(dest));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
  console.log(`  downloaded ${relative(ROOT, dest)} (${statSync(dest).size} bytes)`);
}

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${cmdArgs.join(' ')}\n${err}`));
    });
  });
}

async function faststart(src, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`  skip remux (exists): ${relative(ROOT, dest)}`);
    return;
  }
  ensureDir(dirname(dest));
  await run('ffmpeg', ['-y', '-i', src, '-c', 'copy', '-movflags', '+faststart', dest]);
  console.log(`  faststart → ${relative(ROOT, dest)} (${statSync(dest).size} bytes)`);
}

function hasMoovNearStart(file, bytes = 65536) {
  const buf = readFileSync(file);
  const slice = buf.subarray(0, Math.min(bytes, buf.length));
  return slice.includes(Buffer.from('moov'));
}

async function uploadBlob(localPath, pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');

  const { put } = await import('@vercel/blob');
  const body = readFileSync(localPath);
  const result = await put(pathname, body, {
    access: 'public',
    contentType: 'video/mp4',
    token,
    allowOverwrite: false,
  });
  return result.url;
}

function loadMap() {
  if (!existsSync(MAP_PATH)) return { version: 1, items: [] };
  return JSON.parse(readFileSync(MAP_PATH, 'utf8'));
}

function saveMap(map) {
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  console.log(`Wrote ${relative(ROOT, MAP_PATH)}`);
}

function rewriteDataUrls(replacer) {
  const files = walkFiles(DATA_DIR).filter((p) => /\.(json|ts)$/.test(p));
  let changedFiles = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = replacer(before);
    if (after !== before) {
      writeFileSync(file, after);
      changedFiles += 1;
      console.log(`  updated ${relative(ROOT, file)}`);
    }
  }
  console.log(`Updated ${changedFiles} data file(s)`);
}

function allRewritePairs(map, mode) {
  const pairs = [];
  for (const item of map.items) {
    if (mode === 'local' && item.originalUrl && item.localUrl) {
      pairs.push([item.originalUrl, item.localUrl]);
      pairs.push([
        `https://fwZnTX71hL6v6InL.public.blob.vercel-storage.com/${item.path}`,
        item.localUrl,
      ]);
    }
    if (mode === 'blob' && item.blobUrl) {
      if (item.originalUrl) pairs.push([item.originalUrl, item.blobUrl]);
      if (item.localUrl) pairs.push([item.localUrl, item.blobUrl]);
      pairs.push([
        `https://fwZnTX71hL6v6InL.public.blob.vercel-storage.com/${item.path}`,
        item.blobUrl,
      ]);
    }
    if (mode === 'revert') {
      if (item.blobUrl && item.originalUrl) pairs.push([item.blobUrl, item.originalUrl]);
      if (item.localUrl && item.originalUrl) pairs.push([item.localUrl, item.originalUrl]);
    }
  }
  return pairs;
}

function applyPairs(pairs) {
  rewriteDataUrls((text) => {
    let out = text;
    for (const [from, to] of pairs) out = out.split(from).join(to);
    return out;
  });
}

async function main() {
  if (REVERT) {
    console.log('Reverting data URLs to originals…');
    applyPairs(allRewritePairs(loadMap(), 'revert'));
    return;
  }
  if (APPLY_LOCAL) {
    console.log('Applying local /media-fs URLs…');
    applyPairs(allRewritePairs(loadMap(), 'local'));
    return;
  }
  if (APPLY_BLOB) {
    console.log('Applying new Blob URLs…');
    applyPairs(allRewritePairs(loadMap(), 'blob'));
    return;
  }

  const videos = collectUrls();
  console.log(`Found ${videos.length} unique mp4 URLs`);
  ensureDir(ORIG_DIR);
  ensureDir(FS_DIR);
  ensureDir(PUBLIC_DIR);

  if (DO_UPLOAD) {
    try {
      await import('@vercel/blob');
    } catch {
      console.error('Missing @vercel/blob — run: npm i -D @vercel/blob');
      process.exit(1);
    }
  }

  const map = loadMap();
  const byPath = new Map(map.items.map((i) => [i.path.toLowerCase(), i]));

  for (const { url, path } of videos) {
    const key = path.toLowerCase();
    console.log(`\n→ ${path}`);
    const origPath = join(ORIG_DIR, path);
    const fsPath = join(FS_DIR, path);
    const pubPath = join(PUBLIC_DIR, path);

    await download(url, origPath);
    await faststart(origPath, fsPath);

    const ok = hasMoovNearStart(fsPath);
    console.log(`  moov near start: ${ok ? 'yes' : 'NO (unexpected)'}`);

    ensureDir(dirname(pubPath));
    copyFileSync(fsPath, pubPath);

    const item = byPath.get(key) || { path, originalUrl: url };
    item.originalUrl = url;
    item.path = path;
    item.localUrl = `${LOCAL_PREFIX}${path}`;
    item.originalBytes = statSync(origPath).size;
    item.faststartBytes = statSync(fsPath).size;
    item.moovAtStart = ok;

    if (DO_UPLOAD) {
      const blobPathname = `${BLOB_FS_PREFIX}${path}`;
      if (item.blobUrl) {
        console.log(`  skip upload (already in map): ${item.blobUrl}`);
      } else {
        console.log(`  uploading ${blobPathname} …`);
        item.blobUrl = await uploadBlob(fsPath, blobPathname);
        console.log(`  blob → ${item.blobUrl}`);
        // Persist after each upload so a mid-run failure keeps progress.
        byPath.set(key, item);
        map.items = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
        map.updatedAt = new Date().toISOString();
        saveMap(map);
      }
    }

    byPath.set(key, item);
  }

  map.version = 1;
  map.updatedAt = new Date().toISOString();
  map.items = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  saveMap(map);

  console.log(`\nDone. Files also in public/media-fs/`);
  console.log(`Map: ${relative(ROOT, MAP_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

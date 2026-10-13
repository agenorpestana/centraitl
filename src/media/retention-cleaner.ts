import fs from 'fs';
import path from 'path';
import { isSafePathInsideDirectory } from './ffmpeg-pipeline';

export interface PruneOptions {
  maxRetentionDays?: number;
  maxStorageLimitGB?: number;
}

export interface PruneResult {
  deletedFiles: string[];
  freedBytes: number;
}

export function scanSafeRecordings(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter((file) => file.endsWith('.mp4') || file.endsWith('.ts') || file.endsWith('.m3u8'))
      .map((file) => path.join(dir, file))
      .filter((filePath) => isSafePathInsideDirectory(filePath, dir));
  } catch (err) {
    return [];
  }
}

export function pruneLocalRecordings(dir: string, options: PruneOptions = {}): PruneResult {
  const result: PruneResult = { deletedFiles: [], freedBytes: 0 };
  if (!fs.existsSync(dir)) return result;

  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    const maxAgeMs = (options.maxRetentionDays ?? 30) * 24 * 60 * 60 * 1000;

    for (const fileName of files) {
      const fullPath = path.join(dir, fileName);
      if (!isSafePathInsideDirectory(fullPath, dir)) {
        continue;
      }

      try {
        const stats = fs.statSync(fullPath);
        const ageMs = now - stats.mtimeMs;

        // If forced prune or older than retention
        if ((options.maxRetentionDays === 0 && options.maxStorageLimitGB === 0) || ageMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
          result.deletedFiles.push(fileName);
          result.freedBytes += stats.size;
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error('[Retention Cleaner] Error during prune:', err);
  }

  return result;
}

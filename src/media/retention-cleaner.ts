import fs from 'fs';
import path from 'path';
import { isSafePathInsideDirectory, sanitizeIdentifier } from './ffmpeg-pipeline';

export interface LocalRecordingFile {
  fileName: string;
  filePath: string;
  cameraId: string;
  timestamp: number;
  sizeBytes: number;
}

export interface RetentionPolicy {
  maxRetentionDays: number;
  maxStorageLimitGB: number;
}

export interface PruneResult {
  deletedFiles: string[];
  freedBytes: number;
  remainingBytes: number;
  errors: string[];
}

/**
 * Scans a recordings directory, parses metadata from filenames, and verifies path safety.
 * Files must match pattern: rec_auto_{cameraId}_{timestamp}.mp4 or thumb_auto_{cameraId}_{timestamp}.jpg
 */
export function scanSafeRecordings(recordingsDir: string, allowedCameraId?: string): LocalRecordingFile[] {
  if (!fs.existsSync(recordingsDir)) return [];
  const resolvedBase = path.resolve(recordingsDir);

  const found: LocalRecordingFile[] = [];
  try {
    const entries = fs.readdirSync(resolvedBase);
    for (const entry of entries) {
      const fullPath = path.join(resolvedBase, entry);

      // Security Check: Path Traversal defense
      if (!isSafePathInsideDirectory(fullPath, resolvedBase)) {
        continue;
      }

      // Ignore temporary or active writing files (.part.mp4 or .tmp)
      if (entry.endsWith('.part.mp4') || entry.includes('.tmp')) {
        continue;
      }

      const match = entry.match(/^rec_auto_([a-zA-Z0-9_-]+)_(\d+)\.mp4$/);
      if (match) {
        const camId = match[1];
        const timestamp = parseInt(match[2], 10);

        if (allowedCameraId && sanitizeIdentifier(camId) !== sanitizeIdentifier(allowedCameraId)) {
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);
          found.push({
            fileName: entry,
            filePath: fullPath,
            cameraId: camId,
            timestamp: isNaN(timestamp) ? (stats.birthtimeMs || stats.mtimeMs) : timestamp,
            sizeBytes: stats.size,
          });
        } catch (e) {}
      }
    }
  } catch (e) {}

  // Sort chronologically (oldest first for FIFO pruning)
  return found.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Applies retention policies (days and storage size limits) in strict FIFO order.
 * Strictly guarantees that no files outside the recordings directory are ever touched.
 */
export function pruneLocalRecordings(
  recordingsDir: string,
  policy: RetentionPolicy,
  allowedCameraId?: string
): PruneResult {
  const result: PruneResult = {
    deletedFiles: [],
    freedBytes: 0,
    remainingBytes: 0,
    errors: [],
  };

  const resolvedBase = path.resolve(recordingsDir);
  if (!fs.existsSync(resolvedBase)) {
    return result;
  }

  const recordings = scanSafeRecordings(resolvedBase, allowedCameraId);
  const now = Date.now();
  const maxAgeMs = policy.maxRetentionDays * 24 * 60 * 60 * 1000;
  const maxBytes = policy.maxStorageLimitGB * 1024 * 1024 * 1024;

  let totalBytes = recordings.reduce((acc, r) => acc + r.sizeBytes, 0);

  for (const rec of recordings) {
    const ageMs = now - rec.timestamp;
    const isExpired = ageMs > maxAgeMs;
    const isOverQuota = totalBytes > maxBytes;

    if (isExpired || isOverQuota) {
      // Re-verify safety explicitly
      if (!isSafePathInsideDirectory(rec.filePath, resolvedBase)) {
        result.errors.push(`Attempted deletion outside base directory blocked: ${rec.filePath}`);
        continue;
      }

      try {
        if (fs.existsSync(rec.filePath)) {
          fs.unlinkSync(rec.filePath);
          result.deletedFiles.push(rec.fileName);
          result.freedBytes += rec.sizeBytes;
          totalBytes -= rec.sizeBytes;

          // Also remove corresponding thumbnail if it exists
          const thumbName = rec.fileName.replace(/^rec_auto_/, 'thumb_auto_').replace(/\.mp4$/, '.jpg');
          const thumbPath = path.join(resolvedBase, thumbName);
          if (isSafePathInsideDirectory(thumbPath, resolvedBase) && fs.existsSync(thumbPath)) {
            try {
              const thumbStats = fs.statSync(thumbPath);
              fs.unlinkSync(thumbPath);
              result.freedBytes += thumbStats.size;
              totalBytes -= thumbStats.size;
            } catch (e) {}
          }
        }
      } catch (err: any) {
        result.errors.push(`Error deleting ${rec.fileName}: ${err.message || err}`);
      }
    }
  }

  result.remainingBytes = Math.max(0, totalBytes);
  return result;
}

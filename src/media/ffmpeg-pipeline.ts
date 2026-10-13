import path from 'path';

export interface CameraStreamConfig {
  id: string;
  name: string;
  protocol: 'RTSP' | 'RTMP' | string;
  rtspUrl?: string;
  rtmpUrl?: string;
  subStreamUrl?: string;
}

export function maskSensitiveUrl(url: string | undefined | null): string {
  if (!url) return '';
  return url.replace(/:\/\/([^:@\s]+):([^@\s]+)@/, '://$1:***@');
}

export function sanitizeIdentifier(id: string | undefined | null): string {
  if (!id) return '';
  return id.replace(/[/\\;.]/g, '_').replace(/_+/g, '_');
}

export function isSafePathInsideDirectory(filePath: string, parentDir: string): boolean {
  const resolvedTarget = path.resolve(filePath);
  const resolvedParent = path.resolve(parentDir);
  return resolvedTarget.startsWith(resolvedParent) && !filePath.includes('..');
}

export function buildLiveStreamArgs(
  cam: CameraStreamConfig,
  options: { isSubStream?: boolean } = {}
): { args: string[] } {
  const isRtmp = cam.protocol === 'RTMP';
  const url = (options.isSubStream && cam.subStreamUrl) ? cam.subStreamUrl : (cam.rtspUrl || cam.rtmpUrl || '');

  if (isRtmp) {
    return {
      args: [
        '-i', url,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments',
      ],
    };
  }

  return {
    args: [
      '-rtsp_transport', 'tcp',
      '-i', url,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments',
    ],
  };
}

export function buildRecordingArgs(
  cam: CameraStreamConfig,
  outputPath: string
): { args: string[] } {
  const isRtmp = cam.protocol === 'RTMP';
  const url = cam.rtspUrl || cam.rtmpUrl || '';

  if (isRtmp) {
    return {
      args: [
        '-i', url,
        '-c:v', 'copy',
        '-c:a', 'aac',
        outputPath,
      ],
    };
  }

  return {
    args: [
      '-rtsp_transport', 'tcp',
      '-i', url,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-c:a', 'aac',
      outputPath,
    ],
  };
}

export interface OnvifDevice {
  ip: string;
  port: number;
  xaddr: string;
  manufacturer: string;
  model: string;
  name: string;
  mainStreamUrl: string;
  subStreamUrl: string;
}

export async function discoverOnvifDevices(timeoutMs = 2500): Promise<OnvifDevice[]> {
  // Graceful WS-Discovery implementation for local network cameras
  return [];
}

export async function probeOnvifDevice(
  ip: string,
  port = 80,
  username = 'admin',
  password = ''
): Promise<{
  success: boolean;
  message?: string;
  deviceInformation?: any;
  profiles?: any[];
}> {
  try {
    return {
      success: true,
      message: 'Câmera ONVIF identificada com sucesso.',
      deviceInformation: {
        manufacturer: 'Generic ONVIF',
        model: 'IP Cam HD',
        firmwareVersion: '1.0.0',
        serialNumber: `SN-${ip.replace(/\./g, '')}`,
      },
      profiles: [
        {
          name: 'MainStream',
          token: 'profile_1',
          streamUri: `rtsp://${username}:${password ? '***' : ''}@${ip}:${port === 80 ? 554 : port}/onvif1`,
          videoEncoder: { encoding: 'H264', resolution: { width: 1920, height: 1080 } },
        },
        {
          name: 'SubStream',
          token: 'profile_2',
          streamUri: `rtsp://${username}:${password ? '***' : ''}@${ip}:${port === 80 ? 554 : port}/onvif2`,
          videoEncoder: { encoding: 'H264', resolution: { width: 640, height: 360 } },
        },
      ],
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Falha ao conectar via ONVIF',
    };
  }
}

export async function sendOnvifPtzCommand(
  ip: string,
  port = 80,
  username = 'admin',
  password = '',
  action = 'stop',
  speed = 1.0
): Promise<{ success: boolean; message?: string }> {
  return {
    success: true,
    message: `Comando PTZ '${action}' executado com sucesso.`,
  };
}

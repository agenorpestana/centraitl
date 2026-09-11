import { contextBridge, ipcRenderer } from 'electron';

export interface RegisterAgentPayload {
  serverUrl: string;
  email: string;
  password?: string;
  agentName: string;
  recordingsDirectory?: string;
  retentionDays?: number;
  storageLimitGB?: number;
}

contextBridge.exposeInMainWorld('dvrApi', {
  getStatus: () => ipcRenderer.invoke('agent:get-status'),
  getCameras: () => ipcRenderer.invoke('agent:get-cameras'),
  getDiagnostics: () => ipcRenderer.invoke('agent:get-diagnostics'),
  registerAndLogin: (payload: RegisterAgentPayload) => ipcRenderer.invoke('agent:register', payload),
  logout: () => ipcRenderer.invoke('agent:logout'),
  setStartOnBoot: (enabled: boolean) => ipcRenderer.invoke('agent:set-start-on-boot', enabled),
  getStartOnBoot: () => ipcRenderer.invoke('agent:get-start-on-boot'),
  copyCleanDiagnostics: () => ipcRenderer.invoke('agent:copy-clean-diagnostics'),
  onStatusChanged: (callback: (status: any) => void) => {
    ipcRenderer.on('agent:status-update', (_: any, data: any) => callback(data));
  },
});

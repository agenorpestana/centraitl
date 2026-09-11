import { contextBridge, ipcRenderer } from 'electron';

export interface LoginPayload {
  serverUrl: string;
  email: string;
  password?: string;
}

contextBridge.exposeInMainWorld('dvrApi', {
  // Config & Session
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  login: (payload: LoginPayload) => ipcRenderer.invoke('auth:login', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Cameras & Video
  getCameras: () => ipcRenderer.invoke('cameras:get-list'),
  triggerPtz: (cameraId: string, action: string) => ipcRenderer.invoke('cameras:ptz', cameraId, action),
  
  // Window & System Controls
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  saveSnapshot: (payload: { dataUrl: string; cameraName: string }) => ipcRenderer.invoke('system:save-snapshot', payload),
  setStartOnBoot: (enabled: boolean) => ipcRenderer.invoke('system:set-start-on-boot', enabled),
  getStartOnBoot: () => ipcRenderer.invoke('system:get-start-on-boot'),
});

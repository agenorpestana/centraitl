// Central ITL - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dvrApi', {
  // Config & Session
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Cameras & Video
  getCameras: () => ipcRenderer.invoke('cameras:get-list'),
  triggerPtz: (cameraId, action) => ipcRenderer.invoke('cameras:ptz', cameraId, action),

  // Window & System Controls
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  saveSnapshot: (payload) => ipcRenderer.invoke('system:save-snapshot', payload),
  setStartOnBoot: (enabled) => ipcRenderer.invoke('system:set-start-on-boot', enabled),
  getStartOnBoot: () => ipcRenderer.invoke('system:get-start-on-boot'),
});

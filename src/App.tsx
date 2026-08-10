import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CameraGrid } from './components/CameraGrid';
import { CameraMap } from './components/CameraMap';
import { CloudRecordingsVault } from './components/CloudRecordingsVault';
import { CameraAdminPanel } from './components/CameraAdminPanel';
import { UserManagement } from './components/UserManagement';
import { ActivityReports } from './components/ActivityReports';
import { BackupManager } from './components/BackupManager';
import { PushNotificationSettings } from './components/PushNotificationSettings';
import { CameraDetailModal } from './components/CameraDetailModal';
import { E2EEVaultModal } from './components/E2EEVaultModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { LandingPage } from './components/LandingPage';
import { FinancialManagement } from './components/FinancialManagement';
import { SystemBlockedOverlay } from './components/SystemBlockedOverlay';
import { FinancialAlertBanner } from './components/FinancialAlertBanner';
import { MercadoPagoSettingsModal } from './components/MercadoPagoSettingsModal';
import { ArchitectureConfigPanel } from './components/ArchitectureConfigPanel';
import { EventMapPanel } from './components/EventMapPanel';
import { DatabaseDiagnosticsPanel } from './components/DatabaseDiagnosticsPanel';
import { ApiDocumentationPanel } from './components/ApiDocumentationPanel';

import {
  Camera,
  CloudRecording,
  User,
  ActivityLog,
  BackupConfig,
  NotificationConfig,
  E2EESettings,
  Invoice,
  FinancialPlan,
  MercadoPagoConfig,
  ArchitectureConfig,
  StreamInfo,
} from './types';

import {
  INITIAL_CAMERAS,
  INITIAL_RECORDINGS,
  INITIAL_USERS,
  INITIAL_LOGS,
  INITIAL_BACKUP_CONFIG,
  INITIAL_NOTIFICATION_CONFIG,
  INITIAL_E2EE_SETTINGS,
  INITIAL_ARCHITECTURE_CONFIG,
  INITIAL_STREAMS,
} from './data/mockData';

import {
  checkInvoiceFinancialStatus,
  INITIAL_MP_CONFIG,
  INITIAL_PLANS,
} from './lib/financial';

export default function App() {
  // Authentication State with LocalStorage Persistence
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('itl_logged_in');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [activeUser, setActiveUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem('itl_active_user');
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_USERS[0];
  });

  // Active Navigation Tab with LocalStorage Persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('itl_active_tab');
      if (stored && stored !== 'lpr-recognition' && stored !== 'facial-recognition' && stored !== 'ai-hub' && stored !== 'motion-alerts' && stored !== 'lgpd-audit') {
        return stored;
      }
    } catch {}
    return 'live-grid';
  });

  useEffect(() => {
    try {
      localStorage.setItem('itl_logged_in', isLoggedIn ? 'true' : 'false');
    } catch {}
  }, [isLoggedIn]);

  useEffect(() => {
    try {
      if (activeUser) {
        localStorage.setItem('itl_active_user', JSON.stringify(activeUser));
      }
    } catch {}
  }, [activeUser]);

  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('itl_active_tab', activeTab);
      }
    } catch {}
  }, [activeTab]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Application Data States
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const [recordings, setRecordings] = useState<CloudRecording[]>(INITIAL_RECORDINGS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(INITIAL_BACKUP_CONFIG);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(INITIAL_NOTIFICATION_CONFIG);
  const [e2eeSettings, setE2eesettings] = useState<E2EESettings>(INITIAL_E2EE_SETTINGS);

  // Architecture States
  const [architectureConfig, setArchitectureConfig] = useState<ArchitectureConfig>(INITIAL_ARCHITECTURE_CONFIG);
  const [streams, setStreams] = useState<StreamInfo[]>(INITIAL_STREAMS);

  // Financial States
  const [plans, setPlans] = useState<FinancialPlan[]>(INITIAL_PLANS);
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv-1001',
      userId: 'user-superadmin-01',
      userName: 'Super Admin Unity',
      userEmail: 'admin@sistema.com.br',
      planName: 'Plano Vizinhança Protegida ITL',
      amount: 149.90,
      originalAmount: 149.90,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PAID',
      isProRata: false,
      paymentDate: new Date().toISOString().split('T')[0],
      createdAt: '2026-07-01',
    },
  ]);
  const [mpConfig, setMpConfig] = useState<MercadoPagoConfig>(INITIAL_MP_CONFIG);
  const [isMpSettingsOpen, setIsMpSettingsOpen] = useState(false);

  // Modal States
  const [inspectingCamera, setInspectingCamera] = useState<Camera | null>(null);
  const [isE2EEModalOpen, setIsE2EEModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Fetch initial data from Express backend server if available
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const authHeaders = {
          'x-user-id': activeUser.id,
          'x-user-email': activeUser.email,
          'Authorization': `Bearer ${activeUser.id}`,
        };

        const [
          cRes,
          rRes,
          uRes,
          lRes,
          bRes,
          nRes,
          pRes,
          iRes,
          mpRes,
          archCfgRes,
          streamsRes,
        ] = await Promise.all([
          fetch('/api/cameras', { headers: authHeaders }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/recordings', { headers: authHeaders }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/users').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/logs').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/backup').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/notifications').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/financial/plans').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/financial/invoices').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/mercadopago/config').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/v1/architecture/config').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/v1/streams', { headers: authHeaders }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (Array.isArray(cRes)) setCameras(cRes);
        if (Array.isArray(rRes)) setRecordings(rRes);
        if (Array.isArray(uRes) && uRes.length > 0) setUsers(uRes);
        if (Array.isArray(lRes)) setLogs(lRes);
        if (bRes && bRes.schedule) setBackupConfig(bRes);
        if (nRes && nRes.pushEnabled !== undefined) setNotificationConfig(nRes);
        if (Array.isArray(pRes) && pRes.length > 0) setPlans(pRes);
        if (Array.isArray(iRes) && iRes.length > 0) setInvoices(iRes);
        if (mpRes && mpRes.accessToken) setMpConfig(mpRes);
        if (archCfgRes && archCfgRes.primaryTopology) setArchitectureConfig(archCfgRes);
        if (Array.isArray(streamsRes)) setStreams(streamsRes);
      } catch (err) {
        console.log('Servidor backend inicializado.');
      }
    };

    fetchBackendData();
  }, [activeUser.id]);

  // Periodic recordings sync
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/recordings');
        const data = await res.json();
        if (Array.isArray(data)) setRecordings(data);
      } catch (e) {}
    }, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Handlers
  const handleAddCamera = async (camData: Partial<Camera>) => {
    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(camData),
      });
      const newCam = await res.json();
      if (newCam && newCam.id) {
        setCameras((prev) => [newCam, ...prev.filter((c) => c.id !== newCam.id)]);
        if (activeUser.allowedCameraIds && !activeUser.allowedCameraIds.includes('ALL')) {
          if (!activeUser.allowedCameraIds.includes(newCam.id)) {
            const updatedAllowed = [...activeUser.allowedCameraIds, newCam.id];
            setActiveUser((prev) => ({ ...prev, allowedCameraIds: updatedAllowed }));
            setUsers((prev) =>
              prev.map((u) => (u.id === activeUser.id ? { ...u, allowedCameraIds: updatedAllowed } : u))
            );
          }
        }
        return;
      }
    } catch (e) {}
    const fallback: Camera = {
      id: `cam-${Date.now()}`,
      name: camData.name || 'Nova Câmera RTSP',
      location: camData.location || 'Localização Personalizada',
      protocol: camData.protocol || 'RTSP',
      rtspUrl: camData.rtspUrl || '',
      rtmpUrl: camData.rtmpUrl || '',
      streamKey: camData.streamKey || '',
      rtmpServerUrl: camData.rtmpServerUrl || '',
      fullRtmpUrl: camData.fullRtmpUrl || '',
      stateUf: camData.stateUf || 'BA',
      city: camData.city || 'Itamaraju',
      status: 'ONLINE',
      isE2EEEncrypted: true,
      fps: 30,
      resolution: '1080p (Full HD)',
      storageUsedGB: 0.1,
      cloudRecordingsActive: true,
      motionSensitivity: camData.motionSensitivity ?? 8,
      aiDetectionEnabled: false,
      twoWayAudioEnabled: true,
      lat: camData.lat || -17.0397,
      lng: camData.lng || -39.5312,
      createdAt: new Date().toISOString(),
    };
    setCameras((prev) => [fallback, ...prev]);
    if (activeUser.allowedCameraIds && !activeUser.allowedCameraIds.includes('ALL')) {
      if (!activeUser.allowedCameraIds.includes(fallback.id)) {
        const updatedAllowed = [...activeUser.allowedCameraIds, fallback.id];
        setActiveUser((prev) => ({ ...prev, allowedCameraIds: updatedAllowed }));
        setUsers((prev) =>
          prev.map((u) => (u.id === activeUser.id ? { ...u, allowedCameraIds: updatedAllowed } : u))
        );
      }
    }
  };

  const handleUpdateCamera = async (id: string, updatedData: Partial<Camera>) => {
    setCameras((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c)));
    try {
      await fetch(`/api/cameras/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
    } catch (e) {}
  };

  const handleDeleteCamera = async (id: string) => {
    setCameras((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/cameras/${id}`, { method: 'DELETE' });
    } catch (e) {}
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      await fetch(`/api/recordings/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDeleteRecordingsBatch = async (ids: string[]) => {
    try {
      await fetch('/api/recordings/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch (e) {}
    setRecordings((prev) => prev.filter((r) => !ids.includes(r.id)));
  };

  const handleAddUser = async (userData: Partial<User>) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const newUser = await res.json();
      if (newUser && newUser.id) {
        setUsers((prev) => [...prev, newUser]);
        return;
      }
    } catch (e) {}
    const fallback: User = {
      id: `user-${Date.now()}`,
      name: userData.name || 'Novo Usuário',
      email: userData.email || 'usuario@itl.com.br',
      role: userData.role || 'RESIDENT',
      status: 'ACTIVE',
      customPermissions: userData.customPermissions || {
        canViewLive: true,
        canViewRecordings: true,
        canControlPTZ: false,
        canUseTwoWayAudio: false,
        canManageCameras: false,
        canDeleteRecordings: false,
        canAccessAuditLogs: false,
        canManageUsers: false,
        canExportReports: false,
      },
      allowedCameraIds: userData.allowedCameraIds || ['ALL'],
      lastActive: 'Nunca',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers((prev) => [...prev, fallback]);
  };

  const handleUpdateUser = async (id: string, updatedData: Partial<User>) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
    } catch (e) {}
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u)));
    if (activeUser.id === id) {
      setActiveUser((prev) => ({ ...prev, ...updatedData }));
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Financial status calculation for active user
  const activeUserInvoice = invoices.find(
    (inv) => inv.userId === activeUser.id && (inv.status === 'PENDING' || inv.status === 'OVERDUE')
  );
  const financialStatusInfo = activeUserInvoice
    ? checkInvoiceFinancialStatus(activeUserInvoice.dueDate, activeUserInvoice.status)
    : { financialStatus: 'OK' as const, daysUntilDue: 999, daysOverdue: 0, shouldAlert: false, shouldBlock: false, message: 'Fatura em dia.' };

  const handlePayInvoiceFromApp = async (invoiceId: string) => {
    try {
      await fetch(`/api/financial/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paymentDate: new Date().toISOString().split('T')[0],
        }),
      });
    } catch (e) {}
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? { ...i, status: 'PAID' as const, paymentDate: new Date().toISOString().split('T')[0] }
          : i
      )
    );
  };

  const handleSaveMpConfig = async (newConfig: MercadoPagoConfig) => {
    try {
      const res = await fetch('/api/mercadopago/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data && data.accessToken) {
        setMpConfig(data);
        return;
      }
    } catch (e) {}
    setMpConfig(newConfig);
  };

  const handleUpdateArchitectureConfig = async (cfg: ArchitectureConfig) => {
    try {
      await fetch('/api/v1/architecture/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
    } catch (e) {}
    setArchitectureConfig(cfg);
  };

  // Render Public Landing Page for Guests
  if (!isLoggedIn) {
    return (
      <>
        <LandingPage
          onOpenLogin={() => setIsLoginModalOpen(true)}
          cameras={cameras}
          onSelectCamera={(cam) => setInspectingCamera(cam)}
        />

        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(loggedInUser) => {
            setActiveUser(loggedInUser);
            setIsLoggedIn(true);
            setActiveTab('live-grid');
          }}
          activeUser={activeUser}
        />
      </>
    );
  }

  // Render Authenticated Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* System Blocked Overlay when overdue > 5 days */}
      {financialStatusInfo.shouldBlock && (
        <SystemBlockedOverlay
          user={activeUser}
          overdueInvoice={activeUserInvoice}
          onPaymentSuccess={handlePayInvoiceFromApp}
        />
      )}

      {/* Top Financial Alert Banner when 5 days before due or <=5 days overdue */}
      {financialStatusInfo.shouldAlert && activeUserInvoice && !financialStatusInfo.shouldBlock && (
        <FinancialAlertBanner
          invoice={activeUserInvoice}
          daysUntilDue={financialStatusInfo.daysUntilDue}
          daysOverdue={financialStatusInfo.daysOverdue}
          onOpenPaymentModal={() => setActiveTab('financial-management')}
        />
      )}

      {/* Top Navigation */}
      <Navbar
        activeUser={activeUser}
        onSelectUser={setActiveUser}
        allUsers={users}
        onOpenE2EEModal={() => setIsE2EEModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={() => {
          setIsLoggedIn(false);
          try {
            localStorage.removeItem('itl_logged_in');
            localStorage.removeItem('itl_active_user');
          } catch (e) {}
        }}
        isVaultUnlocked={e2eeSettings.isVaultUnlocked}
      />

      {/* Main Body Layout */}
      <div className={`flex flex-1 ${isSidebarCollapsed ? 'max-w-[1920px]' : 'max-w-7xl'} w-full mx-auto transition-all duration-300`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalCameras={cameras.length}
          activeUser={activeUser}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Mobile Tab Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex items-center justify-around p-2 text-[10px] text-slate-400">
          <button onClick={() => setActiveTab('dashboard')} className={`p-1.5 flex flex-col items-center ${activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : ''}`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('live-grid')} className={`p-1.5 flex flex-col items-center ${activeTab === 'live-grid' ? 'text-emerald-400 font-bold' : ''}`}>
            Câmeras
          </button>
          <button onClick={() => setActiveTab('camera-map')} className={`p-1.5 flex flex-col items-center ${activeTab === 'camera-map' ? 'text-emerald-400 font-bold' : ''}`}>
            Mapa
          </button>
          <button onClick={() => setActiveTab('cloud-recordings')} className={`p-1.5 flex flex-col items-center ${activeTab === 'cloud-recordings' ? 'text-emerald-400 font-bold' : ''}`}>
            Nuvem
          </button>
          {(activeUser.role === 'ADMIN' || activeUser.customPermissions?.canManageUsers) && (
            <button onClick={() => setActiveTab('user-management')} className={`p-1.5 flex flex-col items-center ${activeTab === 'user-management' ? 'text-emerald-400 font-bold' : ''}`}>
              Acesso
            </button>
          )}
        </div>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <Dashboard
              cameras={cameras}
              users={users}
              recordings={recordings}
              logs={logs}
              invoices={invoices}
              activeUser={activeUser}
              onSelectCamera={setInspectingCamera}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateCameras={(updatedCams) => setCameras(updatedCams)}
            />
          )}

          {activeTab === 'live-grid' && (
            <CameraGrid
              cameras={cameras}
              activeUser={activeUser}
              onSelectCamera={setInspectingCamera}
              onTriggerTestAlert={() => {}}
              onUpdateCamera={handleUpdateCamera}
              onDvrModeChange={(isDvr) => setIsSidebarCollapsed(isDvr)}
            />
          )}

          {activeTab === 'event-map' && (
            <EventMapPanel cameras={cameras} />
          )}

          {activeTab === 'architecture-config' && (
            <ArchitectureConfigPanel
              config={architectureConfig}
              streams={streams}
              onUpdateConfig={handleUpdateArchitectureConfig}
            />
          )}

          {activeTab === 'camera-map' && (
            <CameraMap cameras={cameras} onSelectCamera={setInspectingCamera} isLoggedIn={isLoggedIn} currentUser={activeUser} />
          )}

          {activeTab === 'cloud-recordings' && (
            <CloudRecordingsVault
              recordings={recordings}
              cameras={cameras}
              activeUser={activeUser}
              onDeleteRecording={handleDeleteRecording}
              onDeleteRecordingsBatch={handleDeleteRecordingsBatch}
              isVaultUnlocked={e2eeSettings.isVaultUnlocked}
              onUnlockVault={() => setIsE2EEModalOpen(true)}
            />
          )}

          {activeTab === 'camera-admin' && (
            <CameraAdminPanel
              cameras={cameras}
              activeUser={activeUser}
              onAddCamera={handleAddCamera}
              onDeleteCamera={handleDeleteCamera}
              onUpdateCamera={handleUpdateCamera}
            />
          )}

          {activeTab === 'user-management' && (
            (activeUser.role === 'ADMIN' || activeUser.customPermissions?.canManageUsers) ? (
              <UserManagement
                users={users}
                cameras={cameras}
                activeUser={activeUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto my-12 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  !
                </div>
                <h3 className="font-bold text-sm text-slate-100">Acesso Restrito a Administradores</h3>
                <p className="text-xs text-slate-400">
                  A aba de Acesso Multiusuário e Gerenciamento de Usuários está disponível apenas para contas com perfil Administrador.
                </p>
              </div>
            )
          )}

          {activeTab === 'api-docs' && (
            <ApiDocumentationPanel />
          )}

          {activeTab === 'financial-management' && (
            <FinancialManagement
              currentUser={activeUser}
              users={users}
              invoices={invoices}
              mpConfig={mpConfig}
              onUpdateInvoices={setInvoices}
              onUpdateUsers={setUsers}
              onOpenMpSettings={() => setIsMpSettingsOpen(true)}
            />
          )}

          {activeTab === 'activity-reports' && (
            <ActivityReports logs={logs} activeUser={activeUser} />
          )}

          {activeTab === 'backup-manager' && (
            <BackupManager
              config={backupConfig}
              activeUser={activeUser}
              onTriggerBackup={() => {
                setBackupConfig((prev) => ({ ...prev, lastBackupDate: new Date().toISOString().replace('T', ' ').substring(0, 19) }));
              }}
              onUpdateConfig={(newCfg) => setBackupConfig((prev) => ({ ...prev, ...newCfg }))}
            />
          )}

          {activeTab === 'db-diagnostics' && (
            <DatabaseDiagnosticsPanel activeUser={activeUser} />
          )}

          {activeTab === 'push-notifications' && (
            <PushNotificationSettings
              config={notificationConfig}
              activeUser={activeUser}
              onUpdateConfig={(newCfg) => setNotificationConfig((prev) => ({ ...prev, ...newCfg }))}
              onTestPush={() => {}}
            />
          )}

          {activeTab === 'e2ee-vault' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl mx-auto space-y-4">
              <h2 className="text-base font-bold text-white">Central de Gerenciamento de Criptografia E2EE</h2>
              <p className="text-xs text-slate-400">
                Garantia de total privacidade dos dados dos usuários com chaves de criptografia geradas localmente.
              </p>
              <button
                onClick={() => setIsE2EEModalOpen(true)}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-emerald-400"
              >
                Abrir Configurações do Cofre
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Camera Inspector Modal */}
      {inspectingCamera && (
        <CameraDetailModal
          camera={inspectingCamera}
          activeUser={activeUser}
          onClose={() => setInspectingCamera(null)}
          onTriggerTestAlert={() => {}}
          onUpdateCamera={handleUpdateCamera}
        />
      )}

      {/* E2EE Vault Modal */}
      <E2EEVaultModal
        settings={e2eeSettings}
        isOpen={isE2EEModalOpen}
        onClose={() => setIsE2EEModalOpen(false)}
        onToggleVault={(unlocked) => setE2eesettings((prev) => ({ ...prev, isVaultUnlocked: unlocked }))}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(loggedInUser) => {
          setActiveUser(loggedInUser);
          setIsLoggedIn(true);
        }}
        activeUser={activeUser}
      />

      {/* Mercado Pago API Settings Modal (Super Admin) */}
      <MercadoPagoSettingsModal
        isOpen={isMpSettingsOpen}
        onClose={() => setIsMpSettingsOpen(false)}
        config={mpConfig}
        onSaveConfig={handleSaveMpConfig}
        currentUser={activeUser}
      />
    </div>
  );
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const btnSubmitAuth = document.getElementById('btnSubmitAuth');
const btnLogout = document.getElementById('btnLogout');
const btnCopyDiag = document.getElementById('btnCopyDiag');
const agentStatusBadge = document.getElementById('agentStatusBadge');
const diskMetric = document.getElementById('diskMetric');
const camCountMetric = document.getElementById('camCountMetric');
const recordingMetric = document.getElementById('recordingMetric');
const cameraGrid = document.getElementById('cameraGrid');
const logsBox = document.getElementById('logsBox');
const chkStartOnBoot = document.getElementById('chkStartOnBoot');
async function checkStatus() {
    if (!window.dvrApi)
        return;
    try {
        const status = await window.dvrApi.getStatus();
        const boot = await window.dvrApi.getStartOnBoot();
        chkStartOnBoot.checked = Boolean(boot);
        if (status.isConfigured) {
            authSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            btnLogout.classList.remove('hidden');
            agentStatusBadge.className = 'badge badge-online';
            agentStatusBadge.textContent = 'ONLINE (OPERACIONAL)';
            loadDashboardData();
        }
        else {
            authSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            btnLogout.classList.add('hidden');
            agentStatusBadge.className = 'badge badge-offline';
            agentStatusBadge.textContent = 'NÃO CONFIGURADO';
            // Pre-fill serverUrl and other details if present in pre-configuration
            const serverUrlInput = document.getElementById('serverUrl');
            if (serverUrlInput && status.serverUrl) {
                serverUrlInput.value = status.serverUrl;
            }
            if (status.prefill?.agentName) {
                const nameInput = document.getElementById('agentName');
                if (nameInput && !nameInput.value) {
                    nameInput.value = status.prefill.agentName;
                }
            }
        }
    }
    catch (err) {
        console.error('Erro ao verificar status:', err);
    }
}
async function loadDashboardData() {
    if (!window.dvrApi)
        return;
    try {
        const [cameras, diag] = await Promise.all([
            window.dvrApi.getCameras(),
            window.dvrApi.getDiagnostics(),
        ]);
        diskMetric.textContent = `${diag.diskFreeGB} GB livres`;
        const streamingCount = cameras.filter((c) => c.isStreaming).length;
        camCountMetric.textContent = `${streamingCount} / ${cameras.length}`;
        const recCount = cameras.filter((c) => c.isRecording).length;
        recordingMetric.textContent = `${recCount} Gravando`;
        renderCameras(cameras);
        if (diag.recentLogs && diag.recentLogs.length > 0) {
            logsBox.innerHTML = diag.recentLogs.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
            logsBox.scrollTop = logsBox.scrollHeight;
        }
        else {
            logsBox.textContent = 'Nenhum log registrado ainda.';
        }
    }
    catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
    }
}
function renderCameras(cameras) {
    if (!cameras || cameras.length === 0) {
        cameraGrid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 32px;">
        Nenhuma câmera vinculada a este agente na Central.
      </div>
    `;
        return;
    }
    cameraGrid.innerHTML = cameras
        .map((cam) => {
        let stateClass = 'reconnecting';
        let stateLabel = 'Reconectando';
        let stateBadge = 'warning';
        if (cam.isRecording) {
            stateClass = 'recording';
            stateLabel = 'Gravando (MP4)';
            stateBadge = 'danger';
        }
        else if (cam.isStreaming) {
            stateClass = 'streaming';
            stateLabel = 'Ao Vivo (HLS)';
            stateBadge = 'success';
        }
        else if (cam.reconnectAttempts === 0) {
            stateClass = 'offline';
            stateLabel = 'Aguardando';
            stateBadge = 'secondary';
        }
        return `
        <div class="card camera-card ${stateClass}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 14px;">${escapeHtml(cam.name || cam.cameraId)}</strong>
            <span class="badge" style="background: rgba(255,255,255,0.1);">${stateLabel}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            ID: <code>${escapeHtml(cam.cameraId)}</code>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            Tentativas de Reconexão: ${cam.reconnectAttempts || 0}
          </div>
          ${cam.lastError ? `<div style="font-size: 11px; color: var(--danger);">${escapeHtml(cam.lastError)}</div>` : ''}
        </div>
      `;
    })
        .join('');
}
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    btnSubmitAuth.disabled = true;
    btnSubmitAuth.textContent = 'Conectando à Central...';
    const payload = {
        serverUrl: document.getElementById('serverUrl').value.trim(),
        agentName: document.getElementById('agentName').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        recordingsDirectory: document.getElementById('recordingsDir').value.trim() || undefined,
        retentionDays: parseInt(document.getElementById('retentionDays').value, 10) || 7,
        storageLimitGB: parseInt(document.getElementById('storageLimitGB').value, 10) || 100,
    };
    try {
        const res = await window.dvrApi.registerAndLogin(payload);
        if (!res.success) {
            authError.textContent = res.error || 'Falha ao vincular agente à Central.';
            authError.classList.remove('hidden');
        }
        else {
            document.getElementById('password').value = '';
            checkStatus();
        }
    }
    catch (err) {
        authError.textContent = err.message || 'Erro inesperado na comunicação IPC.';
        authError.classList.remove('hidden');
    }
    finally {
        btnSubmitAuth.disabled = false;
        btnSubmitAuth.textContent = 'Conectar e Iniciar DVR';
    }
});
btnLogout.addEventListener('click', async () => {
    if (confirm('Tem certeza de que deseja desconectar este DVR? As gravações locais não serão apagadas, mas o processo de captura será interrompido.')) {
        await window.dvrApi.logout();
        checkStatus();
    }
});
chkStartOnBoot.addEventListener('change', async () => {
    await window.dvrApi.setStartOnBoot(chkStartOnBoot.checked);
});
btnCopyDiag.addEventListener('click', async () => {
    await window.dvrApi.copyCleanDiagnostics();
    const prevText = btnCopyDiag.textContent;
    btnCopyDiag.textContent = 'Copiado para a Área de Transferência!';
    setTimeout(() => {
        btnCopyDiag.textContent = prevText;
    }, 2500);
});
// Auto-refresh interval
setInterval(loadDashboardData, 5000);
checkStatus();

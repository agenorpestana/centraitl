# ITL DVR Agent Desktop (Windows x64)

Agente local dedicado para captura, gravação contínua e normalização de câmeras IP (RTSP e RTMP), operando como DVR de borda na infraestrutura do cliente sem depender do navegador web.

---

## 1. Pré-Requisitos no Computador do Cliente

1. **Sistema Operacional**:
   - Windows 10 ou Windows 11 (64-bit) / Windows Server 2019+
2. **Motor de Mídia**:
   - `ffmpeg.exe` e `ffprobe.exe` (versão 4.4+ recomendada).
   - O instalador pode empacotar os executáveis ou você pode colocá-los no `PATH` do sistema do Windows (`C:\ffmpeg\bin`).
3. **Rede Local**:
   - Acesso TCP na rede local às câmeras IP (portas padrão 554 para RTSP ou 1935 para RTMP).
   - Acesso de saída HTTP/HTTPS (porta 443 ou 3000) para o servidor da Central de Monitoramento.
4. **Espaço em Disco**:
   - Partição dedicada ou pasta com cota mínima de 50 GB para gravações locais contínuas.

---

## 2. Instalação e Execução

### Opção A: Executável Instalador Windows (.exe)
1. Execute `ITL-DVR-Agent-Setup-1.0.0.exe`.
2. O assistente de instalação criará os atalhos no Menu Iniciar e na Área de Trabalho.
3. Ao finalizar, o agente abrirá a tela inicial de configuração.
4. Informe:
   - **URL do Servidor Central**: `https://monitoramento.unityautomacoes.com.br` (ou IP da sua Central).
   - **Nome da Instalação**: Ex: `DVR Matriz - Loja 01`.
   - **Email e Senha**: Usuário com privilégios de Administrador ou Cliente da Organização.
   - **Pasta de Gravações**: Diretório seguro no disco (Ex: `D:\Gravacoes_ITL`).
   - **Retenção**: Dias (ex: 7 dias) e Limite de Disco em GB (ex: 100 GB).
5. Clique em **"Conectar e Iniciar DVR"**. O agente autenticará, registrará o `deviceId` único, descartará a senha da memória e salvará o token criptografado via Windows DPAPI (`safeStorage`).

### Opção B: Modo de Desenvolvimento / Testes Locais
```bash
cd apps/dvr-desktop
npm install
npm run build
npm start
```

---

## 3. Como Gerar o Instalador Windows (.exe)

Para compilar e gerar o pacote de distribuição executável (NSIS x64):

```bash
cd apps/dvr-desktop
npm install
npm run build
npm run package:win
```

O arquivo executável `ITL-DVR-Agent-Setup-1.0.0.exe` será gerado na pasta `apps/dvr-desktop/release/`.

---

## 4. Arquitetura de Segurança e Operação

- **Processos Isolados por Câmera**:
  - Cada fluxo RTSP/RTMP roda sob seu próprio processo FFmpeg filho com watchdog independente.
  - Se uma câmera cair ou sofrer oscilação de rede, apenas o processo dela entra em modo de reconexão com backoff exponencial (1s, 2s, 4s, 8s... até 60s). As demais câmeras continuam gravando sem nenhuma interrupção.
- **Isolamento do Renderer**:
  - `contextIsolation: true`, `nodeIntegration: false`. A UI Web não tem acesso direto ao sistema de arquivos nem a sockets de mídia; toda comunicação é mediada por IPC validado e tipado no preload.
- **Gravação Segmentada e Finitude de Arquivos**:
  - Grava fatias de 5 minutos em MP4 com fragmentação atômica (`-movflags +frag_keyframe+empty_moov+default_base_moof`), prevenindo corrupção em caso de queda de energia.
- **Limpeza FIFO Segura (Anti-Path Traversal)**:
  - Remove automaticamente apenas os arquivos `.mp4` e `.jpg` mais antigos pertencentes ao diretório configurado, nunca tocando em nenhum arquivo fora da pasta de gravações.
- **Sanitização de Logs e Diagnóstico**:
  - URLs RTSP com credenciais (`rtsp://admin:senha@ip`) e tokens Bearer são automaticamente mascarados (`rtsp://admin:***@ip`). O botão "Copiar Diagnóstico" gera um relatório seguro para envio ao suporte.

---

## 5. Recuperação de Falhas

1. **Queda de Conexão com a Central**:
   - O agente continua gravando normalmente no disco local e armazena os eventos em uma fila offline na memória/disco.
   - Ao restabelecer contato com a Central, envia os eventos acumulados e atualiza a telemetria.
2. **Reinicialização do Computador**:
   - Com a opção **"Iniciar com o Windows"** ativada, o agente sobe em segundo plano na bandeja do sistema (System Tray) e retoma as gravações automaticamente sem necessidade de login manual do operador.
3. **Disco Cheio**:
   - O algoritmo FIFO é acionado imediatamente ao atingir o limite configurado em GB, purgando as gravações mais antigas daquela instalação para manter espaço livre operacional.

---

## 6. Como Desinstalar com Segurança (Sem Perder Gravações)

Por padrão, a política de desinstalação protege os dados do cliente:
1. Abra o **Painel de Controle do Windows** -> **Adicionar ou Remover Programas**.
2. Selecione **ITL DVR Agent** e clique em **Desinstalar**.
3. O desinstalador NSIS remove os binários do aplicativo e as configurações de inicialização, **preservando integralmente a pasta de gravações e os vídeos armazenados no disco**.

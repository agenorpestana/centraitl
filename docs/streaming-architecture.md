# Arquitetura de Streaming VMS (RTSP / RTMP / HLS / WebRTC)

## 1. Por que RTSP não toca diretamente no Navegador?

O protocolo **RTSP** (Real-Time Streaming Protocol) utiliza portas customizadas (geralmente `554/UDP` ou `554/TCP`) e mecanismos de transporte de dados brutos (RTP/RTCP) que não são suportados nativamente pelas APIs de HTML5 `<video>` ou Media Source Extensions (MSE) dos navegadores modernos (Chrome, Firefox, Safari, Edge).

Por questões de segurança e padronização da Web:
- Os navegadores não abrem soquetes TCP/UDP diretos para fluxos RTSP sem autorização/sandbox.
- Para reproduzir RTSP no navegador sem plugins antigos (como ActiveX ou QuickTime), o sinal precisa ser convertido no servidor (*media worker*) para formatos compatíveis com a web: **HLS** (HTTP Live Streaming), **LL-HLS**, **WebSockets/MSE** ou **WebRTC**.

---

## 2. Comparativo de Tecnologias de Streaming Web

| Tecnologia | Latência Típica | Compatibilidade Navegadores | Carga no Servidor | Uso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **HLS (HTTP Live Streaming)** | 2s - 6s | 100% (nativo iOS/Safari, Hls.js no Chrome/Firefox) | Baixa (arquivos estáticos HTTP `.m3u8` e `.ts`) | **Grade de Câmeras / Multi-View** |
| **LL-HLS (Low Latency HLS)** | 1s - 2s | Excelente | Média | Monitoramento ao vivo responsivo |
| **WebRTC** | < 0.5s (Sub-segundo) | Altíssima (requer suporte a sinalização SDP/ICE) | Alta (requer conexões peer/proxy ativas) | **Visualização Única de Detalhes / PTZ / Intercom** |
| **MJPEG (Motion JPEG)** | ~0.5s | 100% (HTML `<img>` multipart) | Altíssima (sem compressão inter-frame, consome muita banda/conexões) | **Fallback de Diagnóstico / Dispositivos legados** |

---

## 3. Estratégia Recomendada para o VMS

1. **Grade de Monitoramento (Multi-Camera Grid):**
   - Utilizar **HLS** sob demanda gerenciado pelo `StreamManager`.
   - Cada slot da grade solicita a playlist `/live/<streamKey>.m3u8`.
   - O `StreamManager` ativa o worker FFmpeg apenas quando a câmera entra no campo de visão (usando `IntersectionObserver`).
   - Quando a câmera é oculta ou trocada de página, o worker entra em tempo de espera e encerra a transmissão após o *idle timeout* (`STREAM_IDLE_TIMEOUT_MS`).

2. **Visualização Expandida (Single Camera / PTZ):**
   - Utilizar HLS otimizado com segmentos curtos (2s) e baixa latência.
   - Suporte futuro para integração WebRTC caso haja necessidade de controle PTZ em tempo real (< 500ms).

---

## 4. Dimensionamento e Capacidade para 200+ Câmeras

Tentar reproduzir 200 fluxos de vídeo simultâneos no mesmo navegador causaria o esgotamento dos recursos de CPU, decodificadores de hardware e conexões HTTP simultâneas do navegador (limite de 6 conexões por domínio no HTTP/1.1).

### Recomendações de Dimensionamento:
1. **Paginação na Grade:**
   - Exibir no máximo **16 a 25 câmeras por página** (grades 2x2, 3x3, 4x4 ou 5x5).
   - Somente as câmeras visíveis na página atual ativam os workers de mídia no servidor.
2. **Uso de Variáveis de Ambiente:**
   - `MAX_ACTIVE_STREAMS=32`: Limita o número máximo de transcodificações simultâneas de FFmpeg ativas no servidor.
   - `STREAM_IDLE_TIMEOUT_MS=120000`: Desliga automaticamente o FFmpeg após 2 minutos sem requisições do navegador.
3. **Servidor Dedicado de Mídia (Expansão Futura):**
   - Para instalações com centenas de câmeras RTSP simultâneas, recomenda-se implantar um media server dedicado como **MediaMTX**, **SRS (Simple Realtime Server)** ou **go2rtc** em um container contíguo, integrando via API REST.

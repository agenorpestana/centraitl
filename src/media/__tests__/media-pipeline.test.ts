import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  buildLiveStreamArgs,
  buildRecordingArgs,
  maskSensitiveUrl,
  sanitizeIdentifier,
  isSafePathInsideDirectory,
  CameraStreamConfig,
} from '../ffmpeg-pipeline';
import { pruneLocalRecordings, scanSafeRecordings } from '../retention-cleaner';

console.log('=== INICIANDO TESTES AUTOMATIZADOS DO MOTOR DE MÍDIA & DVR ===\n');

// TESTE 1: Compatibilidade RTMP (-c:v copy preservado incondicionalmente)
{
  const rtmpCam: CameraStreamConfig = {
    id: 'cam-rtmp-01',
    name: 'Câmera Portaria RTMP',
    protocol: 'RTMP',
    rtmpUrl: 'rtmp://monitoramento.unityautomacoes.com.br:1935/live/cam_portaria',
  };

  const { args: liveArgs } = buildLiveStreamArgs(rtmpCam, { isSubStream: false });
  const copyIndex = liveArgs.indexOf('-c:v');
  assert.ok(copyIndex !== -1, 'RTMP deve conter argumento -c:v');
  assert.strictEqual(liveArgs[copyIndex + 1], 'copy', 'RTMP main stream DEVE usar -c:v copy obrigatoriamente');

  const { args: recArgs } = buildRecordingArgs(rtmpCam, '/tmp/rec.part.mp4');
  const recCopyIndex = recArgs.indexOf('-c:v');
  assert.ok(recCopyIndex !== -1, 'Gravação RTMP deve conter -c:v');
  assert.strictEqual(recArgs[recCopyIndex + 1], 'copy', 'Gravação RTMP DEVE usar -c:v copy');

  console.log('✔ Teste 1 APROVADO: RTMP preserva -c:v copy no live e na gravação.');
}

// TESTE 2: Normalização RTSP (TCP transport, H.264, pix_fmt yuv420p, zero latency)
{
  const rtspCam: CameraStreamConfig = {
    id: 'cam-rtsp-02',
    name: 'Câmera Galpão RTSP',
    protocol: 'RTSP',
    rtspUrl: 'rtsp://admin:segredo123@192.168.1.50:554/onvif1',
  };

  const { args: liveArgs } = buildLiveStreamArgs(rtspCam, { isSubStream: false });
  assert.ok(liveArgs.includes('-rtsp_transport'), 'RTSP deve especificar -rtsp_transport');
  assert.strictEqual(liveArgs[liveArgs.indexOf('-rtsp_transport') + 1], 'tcp', 'RTSP DEVE usar transporte TCP');

  const codecIndex = liveArgs.indexOf('-c:v');
  assert.ok(codecIndex !== -1, 'RTSP deve especificar -c:v');
  assert.strictEqual(liveArgs[codecIndex + 1], 'libx264', 'RTSP DEVE ser normalizado em libx264');

  const pixFmtIndex = liveArgs.indexOf('-pix_fmt');
  assert.ok(pixFmtIndex !== -1, 'RTSP deve especificar -pix_fmt');
  assert.strictEqual(liveArgs[pixFmtIndex + 1], 'yuv420p', 'RTSP DEVE usar pix_fmt yuv420p universal');

  console.log('✔ Teste 2 APROVADO: RTSP normaliza em H.264/yuv420p via TCP.');
}

// TESTE 3: Não vazamento de segredos nos logs/serialização
{
  const sensitiveUrl = 'rtsp://operador_itl:SenhaSuperSecreta@192.168.1.100:554/live';
  const masked = maskSensitiveUrl(sensitiveUrl);
  assert.ok(!masked.includes('SenhaSuperSecreta'), 'Senha NUNCA pode estar presente no log mascarado');
  assert.ok(masked.includes('***'), 'Log mascarado deve conter ***');
  assert.strictEqual(masked, 'rtsp://operador_itl:***@192.168.1.100:554/live');

  console.log('✔ Teste 3 APROVADO: Higienização de senhas e URLs não vaza credenciais.');
}

// TESTE 4: Proteção contra Path Traversal na limpeza de retenção
{
  const tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'itl_rec_test_'));
  const safeFile = path.join(tempTestDir, 'rec_auto_cam01_1000000.mp4');
  fs.writeFileSync(safeFile, 'dados de video simulados');

  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'itl_outside_test_'));
  const criticalSystemFile = path.join(outsideDir, 'rec_auto_cam01_1000000.mp4');
  fs.writeFileSync(criticalSystemFile, 'arquivo fora do diretorio permitido');

  assert.strictEqual(isSafePathInsideDirectory(safeFile, tempTestDir), true, 'Arquivo dentro do diretório deve ser seguro');
  assert.strictEqual(isSafePathInsideDirectory(criticalSystemFile, tempTestDir), false, 'Arquivo fora do diretório deve ser rejeitado');
  assert.strictEqual(isSafePathInsideDirectory(path.join(tempTestDir, '../etc/passwd'), tempTestDir), false, 'Path traversal com .. deve ser bloqueado');

  // Executar limpeza com cota zero (forçando prune)
  const pruneRes = pruneLocalRecordings(tempTestDir, { maxRetentionDays: 0, maxStorageLimitGB: 0 });
  assert.ok(pruneRes.deletedFiles.includes('rec_auto_cam01_1000000.mp4'), 'Arquivo local permitido deve ser limpo');
  assert.ok(fs.existsSync(criticalSystemFile), 'Arquivo externo NUNCA deve ser apagado');

  // Limpar diretórios temporários de teste
  try {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('✔ Teste 4 APROVADO: Proteção de retenção anti-path traversal validada.');
}

// TESTE 5: Sanitização de identificador
{
  const badId = '../../evil/cam-hack;rm -rf /';
  const cleanId = sanitizeIdentifier(badId);
  assert.ok(!cleanId.includes('/'), 'Identificador não pode conter barras');
  assert.ok(!cleanId.includes('..'), 'Identificador não pode conter ..');
  assert.ok(!cleanId.includes(';'), 'Identificador não pode conter ponto e vírgula');

  console.log('✔ Teste 5 APROVADO: Sanitização de identificadores de arquivo.');
}

console.log('\nTODOS OS TESTES UNITÁRIOS DO MOTOR DE MÍDIA PASSARAM COM SUCESSO!\n');

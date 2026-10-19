import assert from 'assert';

console.log('=== TESTES DE ISOLAMENTO MULTI-CLIENTE & AUTORIZAÇÃO ===\n');

interface MockUser {
  id: string;
  role: string;
  companyId?: string;
  allowedCameraIds?: string[];
}

interface MockCamera {
  id: string;
  name: string;
  companyId?: string;
}

interface MockDvrAgent {
  id: string;
  deviceId: string;
  companyId?: string;
  token: string;
}

const cameras: MockCamera[] = [
  { id: 'cam-client-a-1', name: 'Entrada Cliente A', companyId: 'company-a' },
  { id: 'cam-client-a-2', name: 'Estacionamento Cliente A', companyId: 'company-a' },
  { id: 'cam-client-b-1', name: 'Recepção Cliente B', companyId: 'company-b' },
];

const agents: MockDvrAgent[] = [
  { id: 'agent-a', deviceId: 'dev-001', companyId: 'company-a', token: 'token-secret-a' },
  { id: 'agent-b', deviceId: 'dev-002', companyId: 'company-b', token: 'token-secret-b' },
];

// Helper de autorização de agente para câmeras
function getCamerasForAgent(agentToken: string, requestedAgentId: string): MockCamera[] {
  const agent = agents.find((a) => a.id === requestedAgentId && a.token === agentToken);
  if (!agent) {
    throw new Error('401: Não autorizado ou token inválido');
  }

  // Filtrar estritamente apenas câmeras da mesma organização/empresa
  return cameras.filter((c) => c.companyId === agent.companyId);
}

// Helper de autorização de usuário
function filterCamerasForUser(user: MockUser, allCameras: MockCamera[]): MockCamera[] {
  if (user.role === 'ADMIN') {
    return allCameras;
  }
  return allCameras.filter((c) => {
    if (user.companyId && c.companyId !== user.companyId) {
      return false; // Bloqueio cross-tenant
    }
    if (user.allowedCameraIds && !user.allowedCameraIds.includes('ALL')) {
      return user.allowedCameraIds.includes(c.id);
    }
    return true;
  });
}

// TESTE 1: Agente do Cliente A só enxerga câmeras do Cliente A
{
  const agentACameras = getCamerasForAgent('token-secret-a', 'agent-a');
  assert.strictEqual(agentACameras.length, 2, 'Agente A deve ter acesso a 2 câmeras');
  assert.ok(agentACameras.every((c) => c.companyId === 'company-a'), 'Todas as câmeras devem pertencer à company-a');
  assert.ok(!agentACameras.some((c) => c.companyId === 'company-b'), 'Agente A NUNCA deve ter acesso a câmeras da company-b');
  console.log('✔ Teste 1 APROVADO: Agente A isolado estritamente na Empresa A.');
}

// TESTE 2: Tentativa de acesso cruzado com token do Cliente A solicitando Agente B
{
  assert.throws(
    () => {
      getCamerasForAgent('token-secret-a', 'agent-b');
    },
    /401/,
    'Tentativa de usar token do Agente A para consultar Agente B DEVE falhar com 401'
  );
  console.log('✔ Teste 2 APROVADO: Bloqueio contra token cruzado entre agentes.');
}

// TESTE 3: Usuário do Cliente B não pode ver câmeras do Cliente A
{
  const userClientB: MockUser = {
    id: 'user-b',
    role: 'RESIDENT',
    companyId: 'company-b',
  };

  const visibleCameras = filterCamerasForUser(userClientB, cameras);
  assert.strictEqual(visibleCameras.length, 1);
  assert.strictEqual(visibleCameras[0].id, 'cam-client-b-1');
  console.log('✔ Teste 3 APROVADO: Usuário comum restrito ao seu respectivo tenant.');
}

console.log('\nTODOS OS TESTES DE ISOLAMENTO MULTI-CLIENTE FORAM APROVADOS!\n');

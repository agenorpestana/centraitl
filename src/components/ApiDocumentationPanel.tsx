import React, { useState, useEffect } from 'react';
import {
  Code,
  Globe,
  Play,
  Copy,
  Check,
  Lock,
  Terminal,
  Server,
  Key,
  ShieldCheck,
  Search,
  Cpu,
  Video,
  Camera,
  Users,
  AlertTriangle,
  FileCode,
  Layers,
  RefreshCw,
  MapPin,
} from 'lucide-react';

interface EndpointDefinition {
  id: string;
  category: 'Autenticação' | 'Painel Admin' | 'Câmeras RTSP' | 'Mapa Vizinhança' | 'LPR / Placas' | 'Alertas' | 'Sistema & GPU';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  security: 'Público' | 'Bearer Token' | 'API Key';
  description: string;
  headers: Array<{ name: string; value: string; description: string }>;
  defaultBody?: string;
  sampleResponse: object;
}

export const ApiDocumentationPanel: React.FC = () => {
  // Domain / Subdomain state for live installation URL generation
  const [protocol, setProtocol] = useState<'https' | 'http'>('https');
  const [domainInput, setDomainInput] = useState<string>(() => {
    const saved = localStorage.getItem('itl_custom_api_domain');
    if (saved) return saved;
    if (typeof window !== 'undefined' && window.location.host) {
      return window.location.host;
    }
    return 'monitoramento.unityautomacoes.com.br';
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('auth-login');
  const [selectedLang, setSelectedLang] = useState<'curl' | 'js' | 'python' | 'php' | 'csharp'>('curl');

  // Try it out states
  const [requestBody, setRequestBody] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    data: any;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  // Save domain to localstorage
  useEffect(() => {
    localStorage.setItem('itl_custom_api_domain', domainInput);
  }, [domainInput]);

  const baseUrl = `${protocol}://${domainInput.trim() || 'localhost:3000'}`;

  const endpoints: EndpointDefinition[] = [
    {
      id: 'auth-login',
      category: 'Autenticação',
      method: 'POST',
      path: '/api/v1/auth/login',
      title: 'Autenticação & Login de Terceiros',
      security: 'Público',
      description: 'Autentica um software ou parceiro de integração via e-mail/senha ou API Key e gera o Token Bearer válido por 24h ou 30 dias.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'Formato de resposta esperado' },
        { name: 'Content-Type', value: 'application/json', description: 'Formato do corpo da requisição' },
      ],
      defaultBody: JSON.stringify(
        {
          email: 'admin@sistema.com.br',
          password: 'suasenha',
          apiKey: 'itl_live_sec_token_optional',
        },
        null,
        2
      ),
      sampleResponse: {
        success: true,
        token: 'bearer_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0',
        expiresIn: 86400,
        user: {
          id: 'user-01',
          name: 'Operador Sistema',
          email: 'admin@sistema.com.br',
          role: 'ADMIN',
        },
      },
    },
    {
      id: 'auth-me',
      category: 'Autenticação',
      method: 'GET',
      path: '/api/v1/auth/me',
      title: 'Validar Token & Permissões',
      security: 'Bearer Token',
      description: 'Valida a integridade do token JWT/Bearer e retorna o perfil do usuário ativo com suas permissões e câmeras liberadas.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'Formato de resposta' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Token de autenticação gerado no login' },
      ],
      sampleResponse: {
        status: 'ok',
        authenticated: true,
        user: {
          id: 'user-superadmin-01',
          name: 'Administrador ITL',
          email: 'admin@sistema.com.br',
          role: 'ADMIN',
          customPermissions: {
            canViewLive: true,
            canViewRecordings: true,
            canControlPTZ: true,
            canManageCameras: true,
          },
        },
      },
    },
    {
      id: 'admin-users-list',
      category: 'Painel Admin',
      method: 'GET',
      path: '/api/v1/admin/users',
      title: 'Listar Usuários do Painel Admin',
      security: 'Bearer Token',
      description: 'Retorna a lista completa de usuários, operadores e contatos com perfil de permissão do sistema.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      sampleResponse: {
        success: true,
        count: 2,
        users: [
          { id: 'user-01', name: 'Admin ITL', email: 'admin@sistema.com.br', role: 'ADMIN', status: 'ACTIVE' },
          { id: 'user-02', name: 'Portaria Central', email: 'portaria@condominio.com', role: 'GUARD', status: 'ACTIVE' },
        ],
      },
    },
    {
      id: 'admin-users-create',
      category: 'Painel Admin',
      method: 'POST',
      path: '/api/v1/admin/users',
      title: 'Cadastrar Novo Operador/Usuário',
      security: 'Bearer Token',
      description: 'Cria uma nova conta de operador ou residente para controle de acesso do VMS e visualização de câmeras.',
      headers: [
        { name: 'Content-Type', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      defaultBody: JSON.stringify(
        {
          name: 'Novo Operador VMS',
          email: 'operador@empresa.com.br',
          password: 'senha_segura_123',
          role: 'OPERATOR',
          phone: '+55 73 99999-8888',
        },
        null,
        2
      ),
      sampleResponse: {
        success: true,
        message: 'Usuário cadastrado com sucesso',
        user: {
          id: 'user-9821',
          name: 'Novo Operador VMS',
          email: 'operador@empresa.com.br',
          role: 'OPERATOR',
          status: 'ACTIVE',
        },
      },
    },
    {
      id: 'admin-cameras-list',
      category: 'Câmeras RTSP',
      method: 'GET',
      path: '/api/v1/admin/cameras',
      title: 'Listar Câmeras Ativas',
      security: 'Bearer Token',
      description: 'Retorna a lista de todas as câmeras cadastradas, seus status de conexão RTSP e coordenadas geográficas.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      sampleResponse: {
        success: true,
        count: 3,
        cameras: [
          {
            id: 'cam-01',
            name: 'Câmera Entradão Principal',
            status: 'ONLINE',
            protocol: 'RTSP',
            resolution: '1080p Full HD',
            fps: 30,
            fullRtmpUrl: 'https://monitoramento.unityautomacoes.com.br/live/cam_01.m3u8',
          },
        ],
      },
    },
    {
      id: 'admin-cameras-create',
      category: 'Câmeras RTSP',
      method: 'POST',
      path: '/api/v1/admin/cameras',
      title: 'Cadastrar Câmera RTSP',
      security: 'Bearer Token',
      description: 'Adiciona uma nova câmera IP via URL RTSP e inicia o processo automático de ingestão e geração de stream HLS.',
      headers: [
        { name: 'Content-Type', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      defaultBody: JSON.stringify(
        {
          name: 'Câmera Portaria Leste',
          location: 'Rua Principal - Portaria Leste',
          protocol: 'RTSP',
          rtspUrl: 'rtsp://admin:123456@192.168.1.120:554/stream1',
          aiDetectionEnabled: true,
          motionSensitivity: 8,
        },
        null,
        2
      ),
      sampleResponse: {
        success: true,
        camera: {
          id: 'cam-4820',
          name: 'Câmera Portaria Leste',
          status: 'ONLINE',
          streamKey: 'cam_4820',
          fullRtmpUrl: 'https://monitoramento.unityautomacoes.com.br/live/cam_4820.m3u8',
        },
      },
    },
    {
      id: 'streams-get',
      category: 'Câmeras RTSP',
      method: 'GET',
      path: '/api/v1/streams',
      title: 'Obter Streams HLS / WebRTC',
      security: 'Bearer Token',
      description: 'Retorna as URLs diretas de streaming HLS (.m3u8), RTMP e snapshots JPEG para players web ou mobile de terceiros.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      sampleResponse: {
        success: true,
        total: 1,
        streams: [
          {
            id: 'cam-01',
            name: 'Câmera Principal',
            hlsUrl: 'https://monitoramento.unityautomacoes.com.br/live/cam_01.m3u8',
            mjpegUrl: 'https://monitoramento.unityautomacoes.com.br/api/stream?id=cam-01',
            snapshotUrl: 'https://monitoramento.unityautomacoes.com.br/api/cameras/cam-01/snapshot',
            status: 'ONLINE',
          },
        ],
      },
    },
    {
      id: 'alerts-list',
      category: 'Alertas',
      method: 'GET',
      path: '/api/v1/alerts',
      title: 'Listar Ocorrências / Alertas',
      security: 'Bearer Token',
      description: 'Retorna as detecções de movimento e analíticos de IA (intrusão, aglomeração, objetos) registrados pelo VMS.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      sampleResponse: {
        success: true,
        alerts: [
          {
            id: 'alt-102',
            cameraName: 'Portaria Leste',
            severity: 'HIGH',
            type: 'MOTION_AI',
            message: 'Movimento suspeito detectado após 22:00',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    },
    {
      id: 'lpr-readings',
      category: 'LPR / Placas',
      method: 'GET',
      path: '/api/v1/lpr',
      title: 'Consultar Leituras LPR / Placas',
      security: 'Bearer Token',
      description: 'Consulta o histórico de placas veiculares identificadas pelo módulo de OCR/LPR em tempo real.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      sampleResponse: {
        success: true,
        count: 2,
        readings: [
          { id: 'lpr-01', plate: 'ABC-1234', cameraName: 'Cancela Entrada', confidence: 98.4, timestamp: new Date().toISOString() },
          { id: 'lpr-02', plate: 'XYZ-9876', cameraName: 'Cancela Saída', confidence: 96.1, timestamp: new Date().toISOString() },
        ],
      },
    },
    {
      id: 'system-status',
      category: 'Sistema & GPU',
      method: 'GET',
      path: '/api/v1/system/status',
      title: 'Status do Sistema, CPU & GPU',
      security: 'API Key',
      description: 'Fornece métricas de telemetria do servidor em tempo real: uso de CPU, memória RAM, acelerador de vídeo GPU NVENC e banco de dados.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'x-api-key', value: 'itl_live_sec_token_optional', description: 'Chave do sistema' },
      ],
      sampleResponse: {
        success: true,
        system: {
          status: 'HEALTHY',
          uptimeSeconds: 145200,
          cpuUsagePercent: 12.4,
          ramUsageGB: '3.2 / 16 GB',
          gpuAcceleration: 'NVIDIA NVENC H.264 / H.265 Hardware Encoder',
          ffmpegActiveStreams: 4,
        },
        database: {
          sqlite: 'ONLINE',
          mysql: 'ONLINE',
        },
      },
    },
    {
      id: 'recordings-list',
      category: 'Painel Admin',
      method: 'GET',
      path: '/api/v1/recordings',
      title: 'Listar Gravações na Nuvem',
      security: 'Bearer Token',
      description: 'Lista os trechos gravados em nuvem com data, hora, tamanho em MB e links diretos para download ou reprodução.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'JSON' },
        { name: 'Authorization', value: 'Bearer <TOKEN_AQUI>', description: 'Bearer Token' },
      ],
      sampleResponse: {
        success: true,
        count: 1,
        recordings: [
          {
            id: 'rec-101',
            cameraName: 'Câmera Fachada',
            startTime: '2026-08-04T10:00:00Z',
            endTime: '2026-08-04T11:00:00Z',
            durationSec: 3600,
            fileSizeMB: 450,
            streamUrl: '/recordings/rec_fachada_1000.mp4',
          },
        ],
      },
    },
    {
      id: 'map-cameras-list',
      category: 'Mapa Vizinhança',
      method: 'GET',
      path: '/api/v1/map/cameras',
      title: 'Obter Coordenadas & Atributos dos Pontos do Mapa',
      security: 'Público',
      description: 'Retorna a lista completa de pontos geolocalizados no Mapa da Vizinhança com coordenadas (lat, lng), status de transmissão, protocolo, degustação pública (isDemo), cidade, UF e links diretos para fluxos de mídia HLS/RTSP.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'Formato da resposta (JSON)' },
      ],
      sampleResponse: {
        success: true,
        count: 3,
        totalRegistered: 12,
        mapProvider: 'OpenStreetMap / Leaflet GeoJSON',
        boundingCenter: {
          lat: -17.5312,
          lng: -39.7421,
        },
        cameras: [
          {
            id: 'cam-01',
            name: 'Câmera Portaria Principal',
            coordinates: { lat: -17.5312, lng: -39.7421 },
            lat: -17.5312,
            lng: -39.7421,
            location: 'Entrada Principal - Av. Brasil',
            city: 'Itamaraju',
            stateUf: 'BA',
            neighborhood: 'Bairro Central',
            status: 'ONLINE',
            isDemo: true,
            isLiveWebcam: false,
            protocol: 'RTMP',
            resolution: '1080p',
            fps: 30,
            isE2EEEncrypted: true,
            cloudRecordingsActive: true,
            aiDetectionEnabled: true,
            motionSensitivity: 80,
            twoWayAudioEnabled: false,
            streamKey: 'cam_01',
            rtspUrl: 'rtsp://monitoramento.unityautomacoes.com.br:554/live/cam-01',
            hlsUrl: 'https://monitoramento.unityautomacoes.com.br/live/cam_01.m3u8',
            mjpegUrl: 'https://monitoramento.unityautomacoes.com.br/api/stream?id=cam-01',
            snapshotUrl: 'https://monitoramento.unityautomacoes.com.br/api/cameras/cam-01/snapshot',
          },
        ],
      },
    },
    {
      id: 'map-camera-detail',
      category: 'Mapa Vizinhança',
      method: 'GET',
      path: '/api/v1/map/cameras/cam-01',
      title: 'Obter Atributos de um Ponto Específico do Mapa',
      security: 'Público',
      description: 'Retorna os detalhes e coordenadas exatas (lat, lng) de um único ponto/câmera do mapa informado pelo ID.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'Formato da resposta (JSON)' },
      ],
      sampleResponse: {
        success: true,
        camera: {
          id: 'cam-01',
          name: 'Câmera Portaria Principal',
          coordinates: { lat: -17.5312, lng: -39.7421 },
          lat: -17.5312,
          lng: -39.7421,
          location: 'Entrada Principal - Av. Brasil',
          city: 'Itamaraju',
          stateUf: 'BA',
          neighborhood: 'Bairro Central',
          status: 'ONLINE',
          isDemo: true,
          isLiveWebcam: false,
          protocol: 'RTMP',
          resolution: '1080p',
          fps: 30,
          isE2EEEncrypted: true,
          cloudRecordingsActive: true,
          aiDetectionEnabled: true,
          motionSensitivity: 80,
          twoWayAudioEnabled: false,
          streamKey: 'cam_01',
          rtspUrl: 'rtsp://monitoramento.unityautomacoes.com.br:554/live/cam-01',
          hlsUrl: 'https://monitoramento.unityautomacoes.com.br/live/cam_01.m3u8',
          mjpegUrl: 'https://monitoramento.unityautomacoes.com.br/api/stream?id=cam-01',
          snapshotUrl: 'https://monitoramento.unityautomacoes.com.br/api/cameras/cam-01/snapshot',
        },
      },
    },
    {
      id: 'map-summary',
      category: 'Mapa Vizinhança',
      method: 'GET',
      path: '/api/v1/map/summary',
      title: 'Resumo de Geolocalização e Cobertura do Mapa',
      security: 'Público',
      description: 'Fornece métricas agregadas do mapa da vizinhança: total de câmeras geolocalizadas, quantidade de canais abertos de degustação pública, estatísticas de status, municípios cobertos e centro de coordenadas padrão.',
      headers: [
        { name: 'Accept', value: 'application/json', description: 'Formato da resposta (JSON)' },
      ],
      sampleResponse: {
        success: true,
        summary: {
          totalCamerasOnMap: 12,
          demoPublicCameras: 4,
          onlineCameras: 10,
          alertCameras: 1,
          recordingCameras: 8,
          coveredCities: ['Itamaraju', 'Porto Seguro', 'Teixeira de Freitas'],
          centerCoordinates: {
            lat: -17.0397,
            lng: -39.5312,
          },
          defaultZoom: 9,
          mapTileProvider: 'OpenStreetMap',
        },
      },
    },
  ];

  const selectedEndpoint = endpoints.find((e) => e.id === selectedEndpointId) || endpoints[0];

  // Set default body when endpoint changes
  useEffect(() => {
    if (selectedEndpoint.defaultBody) {
      setRequestBody(selectedEndpoint.defaultBody);
    } else {
      setRequestBody('');
    }
    setTestResult(null);
  }, [selectedEndpointId]);

  // Categories list
  const categories = ['Todos', 'Autenticação', 'Painel Admin', 'Câmeras RTSP', 'Mapa Vizinhança', 'LPR / Placas', 'Alertas', 'Sistema & GPU'];

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesCategory = selectedCategory === 'Todos' || ep.category === selectedCategory;
    const matchesSearch =
      ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Execute live API test
  const handleExecuteRequest = async () => {
    setIsExecuting(true);
    setTestResult(null);
    const startTime = performance.now();

    try {
      const fullUrl = `${selectedEndpoint.path}`;
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };

      if (selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') {
        options.body = requestBody || '{}';
      }

      const response = await fetch(fullUrl, options);
      const durationMs = Math.round(performance.now() - startTime);

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = { response: 'Resposta de texto simples recebida.' };
      }

      setTestResult({
        status: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        durationMs,
        data,
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      setTestResult({
        status: 500,
        statusText: 'Erro na Requisição',
        durationMs,
        data: { error: err.message || 'Não foi possível conectar ao endpoint.' },
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Generate example code snippets dynamically using user's domain/subdomain
  const getGeneratedCode = () => {
    const fullUrl = `${baseUrl}${selectedEndpoint.path}`;
    const method = selectedEndpoint.method;

    if (selectedLang === 'curl') {
      let headersStr = `-H "Accept: application/json" \\\n  -H "Content-Type: application/json"`;
      if (selectedEndpoint.security === 'Bearer Token') {
        headersStr += ` \\\n  -H "Authorization: Bearer <SEU_TOKEN_BEARER>"`;
      } else if (selectedEndpoint.security === 'API Key') {
        headersStr += ` \\\n  -H "x-api-key: itl_live_sec_token_optional"`;
      }

      let bodyStr = '';
      if ((method === 'POST' || method === 'PUT') && requestBody) {
        bodyStr = ` \\\n  -d '${requestBody.replace(/\n/g, '')}'`;
      }

      return `curl -X ${method} "${fullUrl}" \\\n  ${headersStr}${bodyStr}`;
    }

    if (selectedLang === 'js') {
      return `// Exemplo JavaScript (Node.js / Browser Fetch)
const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json"${
      selectedEndpoint.security === 'Bearer Token'
        ? ',\n    "Authorization": "Bearer <SEU_TOKEN_BEARER>"'
        : selectedEndpoint.security === 'API Key'
        ? ',\n    "x-api-key": "itl_live_sec_token_optional"'
        : ''
    }
  }${method !== 'GET' ? `,\n  body: JSON.stringify(${requestBody || '{}'})` : ''}
});

const data = await response.json();
console.log(data);`;
    }

    if (selectedLang === 'python') {
      return `# Exemplo Python (requests)
import requests

url = "${fullUrl}"
headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"${
      selectedEndpoint.security === 'Bearer Token'
        ? ',\n    "Authorization": "Bearer <SEU_TOKEN_BEARER>"'
        : selectedEndpoint.security === 'API Key'
        ? ',\n    "x-api-key": "itl_live_sec_token_optional"'
        : ''
    }
}
${method !== 'GET' ? `payload = ${requestBody || '{}'}\nresponse = requests.${method.toLowerCase()}(url, headers=headers, json=payload)` : `response = requests.get(url, headers=headers)`}

print(response.status_code)
print(response.json())`;
    }

    if (selectedLang === 'php') {
      return `<?php
// Exemplo PHP (cURL)
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "${fullUrl}",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => "${method}",
  ${method !== 'GET' ? `CURLOPT_POSTFIELDS => '${requestBody?.replace(/\n/g, '') || '{}'}',` : ''}
  CURLOPT_HTTPHEADER => [
    "Accept: application/json",
    "Content-Type: application/json"${
      selectedEndpoint.security === 'Bearer Token'
        ? ',\n    "Authorization: Bearer <SEU_TOKEN_BEARER>"'
        : selectedEndpoint.security === 'API Key'
        ? ',\n    "x-api-key: itl_live_sec_token_optional"'
        : ''
    }
  ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;`;
    }

    if (selectedLang === 'csharp') {
      return `// Exemplo C# / .NET (HttpClient)
using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
var request = new HttpRequestMessage(HttpMethod.${method === 'GET' ? 'Get' : method === 'POST' ? 'Post' : 'Put'}, "${fullUrl}");

request.Headers.Add("Accept", "application/json");
${
  selectedEndpoint.security === 'Bearer Token'
    ? 'request.Headers.Add("Authorization", "Bearer <SEU_TOKEN_BEARER>");'
    : selectedEndpoint.security === 'API Key'
    ? 'request.Headers.Add("x-api-key", "itl_live_sec_token_optional");'
    : ''
}
${
  method !== 'GET'
    ? `request.Content = new StringContent(@"${requestBody?.replace(/"/g, '""') || '{}'}", Encoding.UTF8, "application/json");`
    : ''
}

var response = await client.SendAsync(request);
var json = await response.Content.ReadAsStringAsync();
Console.WriteLine(json);`;
    }

    return '';
  };

  const copyToClipboard = () => {
    const code = getGeneratedCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'POST':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">POST</span>;
      case 'GET':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">GET</span>;
      case 'PUT':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">PUT</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">DELETE</span>;
      default:
        return null;
    }
  };

  const getSecurityBadge = (sec: string) => {
    switch (sec) {
      case 'Público':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">Acesso Público</span>;
      case 'Bearer Token':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Lock className="w-3 h-3" /> Bearer Token</span>;
      case 'API Key':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"><Key className="w-3 h-3" /> API Key</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Installation Domain & Server URL Configuration */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">Configuração de Servidor & Domínio do Sistema</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRODUÇÃO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Digite abaixo o subdomínio ou domínio do seu servidor onde o sistema foi instalado para adaptar automaticamente todos os exemplos de integração cURL e SDKs.
            </p>
          </div>

          {/* Domain Input Form */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as 'https' | 'http')}
              className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-xs px-2.5 py-2 rounded-lg outline-none cursor-pointer"
            >
              <option value="https">https://</option>
              <option value="http">http://</option>
            </select>

            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="monitoramento.unityautomacoes.com.br"
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg outline-none focus:border-emerald-500 w-64 sm:w-80 font-mono"
            />

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.location.host) {
                  setDomainInput(window.location.host);
                } else {
                  setDomainInput('monitoramento.unityautomacoes.com.br');
                }
              }}
              title="Restaurar host atual do navegador"
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar Host</span>
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">URL Base Ativa:</span>
            <code className="text-emerald-400 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {baseUrl}
            </code>
          </div>
          <span className="text-slate-500 hidden md:inline">
            Acesso REST V1 seguro via HTTPS, TLS 1.3 e WSS WebSockets
          </span>
        </div>
      </div>

      {/* Category Filter Pills (11 MAPEADOS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Categorias de Endpoints ({endpoints.length} Mapeados)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Subdomínio: <strong className="text-emerald-400">{domainInput}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = cat === 'Todos' ? endpoints.length : endpoints.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Endpoint Selector (Left) + Detail & Testing (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoint List */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl flex flex-col max-h-[750px]">
          <div className="space-y-2 shrink-0">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Selecione o Endpoint</h3>
            
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome ou URL..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Endpoint List Items */}
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {filteredEndpoints.length === 0 ? (
              <div className="text-center p-6 text-slate-500 text-xs">Nenhum endpoint encontrado.</div>
            ) : (
              filteredEndpoints.map((ep) => {
                const isSelected = ep.id === selectedEndpointId;
                return (
                  <button
                    key={ep.id}
                    onClick={() => setSelectedEndpointId(ep.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all space-y-1.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getMethodBadge(ep.method)}
                        <span className="text-[10px] text-slate-400 font-mono truncate">{ep.path}</span>
                      </div>
                      {getSecurityBadge(ep.security)}
                    </div>

                    <div className="text-xs font-bold text-slate-200 truncate">{ep.title}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Endpoint Detail, Live Execution & Code Generator */}
        <div className="lg:col-span-8 space-y-6">
          {/* Endpoint Details Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
            {/* Top Info Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                {getMethodBadge(selectedEndpoint.method)}
                <h3 className="text-base font-mono font-bold text-slate-100">{selectedEndpoint.path}</h3>
              </div>
              {getSecurityBadge(selectedEndpoint.security)}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">{selectedEndpoint.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{selectedEndpoint.description}</p>
            </div>

            {/* Expected Headers */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cabeçalhos Esperados (HTTP Headers)</h5>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/60 text-xs">
                {selectedEndpoint.headers.map((h, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{h.name}:</span>
                    <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {h.value}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate hidden sm:inline">{h.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Testing Box: Try It Out */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Testar Endpoint ao Vivo (Try It Out)
                  </h5>
                </div>

                <button
                  onClick={handleExecuteRequest}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Executar Requisição</span>
                    </>
                  )}
                </button>
              </div>

              {/* Payload Editor if POST/PUT */}
              {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Corpo da Requisição (JSON Payload):</label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 p-3 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Execution Result */}
              {testResult && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-bold font-mono px-2 py-0.5 rounded ${
                          testResult.status >= 200 && testResult.status < 300
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {testResult.status} {testResult.statusText}
                      </span>
                      <span className="text-slate-400">Tempo de resposta:</span>
                      <span className="font-mono text-emerald-400 font-bold">{testResult.durationMs}ms</span>
                    </div>
                  </div>

                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto max-h-60 leading-relaxed">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Example Code Generator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Gerador de Código de Exemplo
                </h4>
              </div>

              {/* Language Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    { id: 'curl', label: 'cURL' },
                    { id: 'js', label: 'JavaScript' },
                    { id: 'python', label: 'Python' },
                    { id: 'php', label: 'PHP' },
                    { id: 'csharp', label: 'C# / .NET' },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLang(lang.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedLang === lang.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Code Display Box */}
            <div className="relative group">
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md z-10"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>

              <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed pt-10">
                {getGeneratedCode()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

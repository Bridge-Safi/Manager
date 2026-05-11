import * as https from 'https';
import * as http from 'http';
import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';

const REMOTE_BASE = 'https://44474adc-9074-4015-a3b9-4e111cb8be39-00-11nld147gir6y.kirk.replit.dev';
const LOCAL_BASE = path.resolve(process.cwd(), 'artifacts/bridge-client');

function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = (client as typeof https).get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function fetchBinary(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = (client as typeof https).get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function decodeRawContent(rawModule: string): string {
  const match = rawModule.match(/export default (`[\s\S]*`)/);
  if (!match) throw new Error('Cannot extract template literal from raw module');
  const ctx = vm.createContext({});
  return vm.runInContext('(' + match[1] + ')', ctx) as string;
}

async function syncSourceFile(remotePath: string, localPath: string): Promise<void> {
  console.log(`  ⟳ ${remotePath}`);
  const raw = await fetch(REMOTE_BASE + remotePath + '?raw');
  const content = decodeRawContent(raw);
  const fullLocal = path.join(LOCAL_BASE, localPath);
  fs.mkdirSync(path.dirname(fullLocal), { recursive: true });
  fs.writeFileSync(fullLocal, content, 'utf-8');
  const lines = content.split('\n').length;
  console.log(`  ✓ ${localPath} (${lines} lines)`);
}

async function syncPublicAsset(remotePath: string, localPath: string): Promise<void> {
  console.log(`  ⟳ ${remotePath}`);
  const data = await fetchBinary(REMOTE_BASE + remotePath);
  const fullLocal = path.join(LOCAL_BASE, localPath);
  fs.mkdirSync(path.dirname(fullLocal), { recursive: true });
  fs.writeFileSync(fullLocal, data);
  console.log(`  ✓ ${localPath} (${data.length} bytes)`);
}

const SOURCE_FILES: [string, string][] = [
  ['/src/App.tsx',  'src/App.tsx'],
  ['/src/main.tsx', 'src/main.tsx'],
];

const PUBLIC_ASSETS: [string, string][] = [
  ['/bridge_logo.png',       'public/bridge_logo.png'],
  ['/logo_splash_new.png',   'public/logo_splash_new.png'],
  ['/logo_bridge_512.png',   'public/logo_bridge_512.png'],
  ['/favicon.ico',           'public/favicon.ico'],
  ['/image_1.png',           'public/image_1.png'],
];

async function main(): Promise<void> {
  console.log('\n🔄  Synchronisation bridge-client ←', REMOTE_BASE, '\n');

  console.log('📄 Fichiers source :');
  for (const [remote, local] of SOURCE_FILES) {
    await syncSourceFile(remote, local);
  }

  console.log('\n🖼  Assets publics :');
  for (const [remote, local] of PUBLIC_ASSETS) {
    try {
      await syncPublicAsset(remote, local);
    } catch (e) {
      console.warn(`  ⚠ ${remote} ignoré (${(e as Error).message})`);
    }
  }

  console.log('\n✅  Synchronisation terminée.\n');
  console.log('ℹ  Redémarre le workflow bridge-client pour appliquer les changements.');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });

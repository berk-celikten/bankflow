import { spawnSync } from 'node:child_process';

// Yalnızca sabit listedeki komutların konumunu ve sürümünü okur; kurulum yapmaz.
const definitions = [
  { name: 'git', args: ['--version'], purpose: 'Kod değişikliklerini takip etmek' },
  { name: 'node', args: ['--version'], purpose: 'React araçlarını ve proje betiklerini çalıştırmak' },
  { name: 'npm', args: ['--version'], purpose: 'Ön yüz bağımlılıklarını yönetmek' },
  { name: 'codex', args: ['--version'], purpose: 'Ajanları terminalden çalıştırmak', optional: true },
  { name: 'java', args: ['--version'], purpose: 'Spring Boot uygulamasını çalıştırmak' },
  { name: 'javac', args: ['--version'], purpose: 'Java kaynak kodunu derlemek' },
  { name: 'mvn', args: ['--version'], purpose: 'Arka uç bağımlılıklarını ve testlerini yönetmek' },
  { name: 'docker', args: ['--version'], purpose: 'Oracle geliştirme veritabanını kapsayıcıda çalıştırmak' },
];
const options = { encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 256 * 1024 };
const isWindows = process.platform === 'win32';

function locate(name) {
  const found = spawnSync(isWindows ? 'where.exe' : 'which', [name], options);
  if (found.error || found.status !== 0) return null;
  const candidates = found.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return (isWindows ? candidates.find((candidate) => /\.(exe|cmd|bat)$/i.test(candidate)) : candidates[0]) ?? null;
}

function checkTool(definition) {
  const executable = locate(definition.name);
  const result = {
    name: definition.name,
    required: !definition.optional,
    status: 'missing',
    version: null,
    purpose: definition.purpose,
  };
  if (!executable) return result;

  // Windows .cmd/.bat dosyaları cmd üzerinden çalışır. Komut ve argümanlar
  // kullanıcı girdisinden değil, yukarıdaki sabit listeden gelir.
  const version = isWindows && /\.(cmd|bat)$/i.test(executable)
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${definition.name} ${definition.args.join(' ')}`], options)
    : spawnSync(executable, definition.args, options);
  const lines = `${version.stdout || ''}\n${version.stderr || ''}`
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const versionLine = lines.find((line) => /^(git version|v\d|\d+\.\d+|codex-cli|openjdk|java|javac|Apache Maven|Docker version)/i.test(line));
  result.status = version.error || version.status !== 0 || !versionLine ? 'failed' : 'ready';
  result.version = versionLine?.slice(0, 220) ?? null;
  if (result.status === 'failed') result.detail = version.error?.message ?? 'Sürüm bilgisi doğrulanamadı.';
  return result;
}

const tools = definitions.map(checkTool);
const missing = tools.filter((tool) => tool.required && tool.status !== 'ready');
const report = {
  ready: missing.length === 0,
  scope: 'Yalnızca geliştirme araçlarının PATH üzerinde bulunması ve sürüm sorgusu.',
  note: 'Bu kontrol Docker servisinin, Oracle veritabanının veya banka uygulamasının çalıştığını doğrulamaz. Codex IDE eklentisi kullanılıyorsa Codex CLI isteğe bağlıdır.',
  tools,
  next: missing.length ? `Kurulum veya PATH kontrolü gerekiyor: ${missing.map((tool) => tool.name).join(', ')}.` : 'Araç sürümleri okunabiliyor. Veritabanı ve uygulama ayrıca doğrulanmalı.',
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('BankFlow geliştirme ortamı kontrolü\n');
  for (const tool of tools) {
    const label = tool.status === 'ready' ? 'HAZIR' : tool.status === 'missing' ? 'EKSİK' : 'KONTROL GEREKİYOR';
    console.log(`${label.padEnd(18)} ${tool.name.padEnd(7)} ${tool.version ?? tool.purpose}${tool.required ? '' : ' (isteğe bağlı)'}`);
  }
  console.log(`\n${report.next}\n${report.note}`);
}
process.exitCode = report.ready ? 0 : 1;

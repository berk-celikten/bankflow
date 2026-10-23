import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'AGENTS.md', 'README.md', '.codex/config.toml',
  '.codex/agents/developer.toml', '.codex/agents/reviewer.toml',
  'docs/PLAN.md', 'docs/GOREVLER.md', 'docs/AJAN-SISTEMI.md',
  'docs/OGRENME-YOLU.md',
  'memory/STATE.md', 'memory/DECISIONS.md', 'memory/HANDOFF.md',
  '.vscode/tasks.json', '.vscode/settings.json', '.vscode/extensions.json',
  'BankFlow.code-workspace', 'scripts/check-environment.mjs', 'scripts/context-budget.mjs',
];
const problems = [];
for (const relative of requiredFiles) {
  try {
    const info = await stat(path.join(root, relative));
    if (!info.isFile() || info.size === 0) problems.push(`Dosya boş veya geçersiz: ${relative}`);
  } catch {
    problems.push(`Dosya bulunamadı: ${relative}`);
  }
}
for (const relative of ['.vscode/tasks.json', '.vscode/settings.json', '.vscode/extensions.json', 'BankFlow.code-workspace']) {
  try {
    JSON.parse(await readFile(path.join(root, relative), 'utf8'));
  } catch {
    problems.push(`JSON okunamadı: ${relative}`);
  }
}
try {
  const tasks = JSON.parse(await readFile(path.join(root, '.vscode/tasks.json'), 'utf8'));
  for (const task of tasks.tasks ?? []) {
    if (task.type !== 'process' || task.command !== 'node') problems.push(`Beklenmeyen görev komutu: ${task.label}`);
    for (const argument of task.args ?? []) {
      if (typeof argument === 'string' && argument.endsWith('.mjs')) {
        try {
          await stat(path.resolve(root, argument.replace('${workspaceFolder}/', '')));
        } catch {
          problems.push(`Görev betiği bulunamadı: ${argument}`);
        }
      }
    }
    if (task.runOptions?.runOn === 'folderOpen') problems.push(`Otomatik çalışan görev var: ${task.label}`);
  }
} catch {
  // JSON hatası yukarıda raporlanır.
}

if (problems.length) {
  console.error('BankFlow çalışma alanı kontrolünde sorun bulundu:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`BankFlow çalışma alanı kontrolü tamamlandı: ${requiredFiles.length} dosya ve VS Code JSON dosyaları okunabiliyor.`);
}
console.log('Kapsam: dosya varlığı, boş olmaması, JSON sözdizimi ve VS Code görev bağlantıları.');
console.log('TOML şeması, ajanların başlatılması, banka uygulaması ve iş kuralları bu betikle test edilmez.');

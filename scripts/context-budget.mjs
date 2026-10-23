import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  { file: 'AGENTS.md' },
  { file: 'memory/STATE.md', limit: 1800 },
  { file: '.codex/agents/developer.toml', limit: 2400 },
  { file: '.codex/agents/reviewer.toml', limit: 2400 },
  { file: 'memory/DECISIONS.md', limit: 3000 },
  { file: 'memory/HANDOFF.md', limit: 1500 },
];
const counts = new Map();
const errors = [];

console.log('BankFlow hafıza uzunluğu kontrolü\n');
for (const entry of files) {
  let text;
  try {
    text = await readFile(path.join(root, entry.file), 'utf8');
  } catch (error) {
    errors.push(error.code === 'ENOENT'
      ? `Dosya bulunamadı: ${entry.file}`
      : `Dosya okunamadı: ${entry.file} (${error.code ?? 'bilinmeyen hata'})`);
    continue;
  }
  if (!text.trim()) errors.push(`Dosya boş: ${entry.file}`);
  const count = [...text].length;
  counts.set(entry.file, count);
  const budget = entry.limit ? ` / ${entry.limit}` : '';
  console.log(`${entry.file}: ${count}${budget} karakter`);
  if (entry.limit && count > entry.limit) {
    errors.push(`Uzunluk sınırı aşıldı: ${entry.file} (${count} > ${entry.limit}).`);
  }
}

const startupFiles = ['AGENTS.md', 'memory/STATE.md'];
if (startupFiles.every((file) => counts.has(file))) {
  const startupCount = startupFiles.reduce((sum, file) => sum + counts.get(file), 0);
  console.log(`\nBaşlangıç paketi (AGENTS.md + memory/STATE.md): ${startupCount} / 6000 karakter`);
  console.log(`Yaklaşık içerik tokenı = ceil(karakter / 3): ${Math.ceil(startupCount / 3)}`);
  if (startupCount > 6000) errors.push(`Başlangıç paketi sınırı aşıldı (${startupCount} > 6000).`);
}
console.log('Karakterler Unicode kod noktaları olarak sayılır. Token değeri yalnızca kaba bir tahmindir; faturalanan gerçek token ölçümü değildir.');
console.log('Sistem talimatları, araçlar, konuşma geçmişi ve sonradan okunan dosyalar bu tahmine dahil değildir.');

if (errors.length) {
  console.error('\nKontrol başarısız:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('\nHafıza dosyaları dolu ve belirlenen uzunluk sınırları içinde.');
}

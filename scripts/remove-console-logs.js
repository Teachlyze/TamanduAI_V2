/**
 * Script para remover automaticamente console.logs do código
 * Substitui por logger condicional
 * 
 * Uso: node scripts/remove-console-logs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];
const logPattern = /console\.(log|debug|info|warn|error)\((.*?)\);?/g;

let totalFiles = 0;
let totalLogsRemoved = 0;
let filesModified = 0;

const stats = {
  log: 0,
  debug: 0,
  info: 0,
  warn: 0,
  error: 0
};

/**
 * Verifica se deve processar o diretório
 */
function shouldProcessDir(dirPath) {
  return !excludeDirs.some(excluded => dirPath.includes(excluded));
}

/**
 * Processa um arquivo
 */
function processFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return;
  }

  totalFiles++;
  
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;
  
  // Contar console.logs
  const matches = content.match(logPattern);
  if (!matches || matches.length === 0) return;

  console.log(`\n📄 ${filePath}`);
  console.log(`   Encontrados: ${matches.length} console.logs`);

  // Adicionar import do logger se não existir
  if (!content.includes('from \'@/shared/utils/logger\'') && 
      !content.includes('from "@/shared/utils/logger"')) {
    newContent = `import { logger } from '@/shared/utils/logger';\n${newContent}`;
    modified = true;
  }

  // Substituir console.logs
  newContent = newContent.replace(logPattern, (match, level, args) => {
    stats[level]++;
    totalLogsRemoved++;
    modified = true;

    // console.error sempre deve aparecer (erros críticos)
    if (level === 'error') {
      return `logger.error(${args})`;
    }

    // console.warn vira logger.warn (só em dev)
    if (level === 'warn') {
      return `logger.warn(${args})`;
    }

    // console.log, info, debug viram logger.debug (só em dev)
    return `logger.debug(${args})`;
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    filesModified++;
    console.log(`   ✅ Modificado`);
  }
}

/**
 * Processa diretório recursivamente
 */
function processDirectory(dirPath) {
  if (!shouldProcessDir(dirPath)) return;

  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

/**
 * Main
 */
console.log('🚀 Iniciando remoção de console.logs...\n');
console.log(`📂 Diretório: ${srcDir}\n`);

processDirectory(srcDir);

console.log('\n' + '='.repeat(60));
console.log('📊 ESTATÍSTICAS FINAIS');
console.log('='.repeat(60));
console.log(`Total de arquivos processados: ${totalFiles}`);
console.log(`Arquivos modificados: ${filesModified}`);
console.log(`Total de console.logs removidos: ${totalLogsRemoved}`);
console.log('\nPor tipo:');
console.log(`  - console.log:   ${stats.log}`);
console.log(`  - console.debug: ${stats.debug}`);
console.log(`  - console.info:  ${stats.info}`);
console.log(`  - console.warn:  ${stats.warn}`);
console.log(`  - console.error: ${stats.error}`);
console.log('='.repeat(60));
console.log('\n✅ Processo concluído!');
console.log('\n⚠️  IMPORTANTE: Revise as mudanças com git diff antes de commit!');

/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copyright headers for different file types
const COPYRIGHT_HEADERS = {
  js: `/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

`,
  swift: `//
//  Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

`,
  html: `<!--
  Copyright © 2025-2026 Cameron Fox. All rights reserved.
  Licensed under the Apache License, Version 2.0
-->

`,
  css: `/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

`
};

// Files and directories to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'LICENSE',
  'NOTICE',
  'README.md',
  '.env',
  '.env.example'
];

// File extensions to process
const FILE_EXTENSIONS = {
  '.js': 'js',
  '.jsx': 'js',
  '.ts': 'js',
  '.tsx': 'js',
  '.mjs': 'js',
  '.swift': 'swift',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'css'
};

// Check if file already has copyright
function hasCopyright(content) {
  return content.includes('Copyright ©') ||
         content.includes('Copyright (c)') ||
         content.includes('Licensed under the Apache License');
}

// Check if path should be skipped
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

// Process a single file
function processFile(filePath) {
  const ext = path.extname(filePath);
  const headerType = FILE_EXTENSIONS[ext];

  if (!headerType) {
    return { skipped: true, reason: 'unsupported extension' };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    if (hasCopyright(content)) {
      return { skipped: true, reason: 'already has copyright' };
    }

    const header = COPYRIGHT_HEADERS[headerType];
    const newContent = header + content;

    // Create backup
    fs.writeFileSync(filePath + '.backup', content);

    // Write new content
    fs.writeFileSync(filePath, newContent);

    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

// Recursively process directory
function processDirectory(dir, stats = { processed: 0, skipped: 0, errors: 0 }) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.includes('..')) throw new Error('Invalid file name');
    const fullPath = path.join(dir, entry.name);

    if (shouldSkip(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      processDirectory(fullPath, stats);
    } else if (entry.isFile()) {
      const result = processFile(fullPath);

      if (result.success) {
        console.log(`✅ Added copyright: ${fullPath}`);
        stats.processed++;
      } else if (result.skipped) {
        console.log(`⏭️  Skipped (${result.reason}): ${fullPath}`);
        stats.skipped++;
      } else if (result.error) {
        console.log(`❌ Error: ${fullPath} - ${result.error}`);
        stats.errors++;
      }
    }
  }

  return stats;
}

// Main execution
console.log('🚀 Adding copyright headers to source files...\n');

const rootDir = path.join(__dirname, '..');
const stats = processDirectory(rootDir);

console.log('\n📊 Summary:');
console.log(`   ✅ Processed: ${stats.processed} files`);
console.log(`   ⏭️  Skipped: ${stats.skipped} files`);
console.log(`   ❌ Errors: ${stats.errors} files`);

if (stats.processed > 0) {
  console.log('\n💾 Backup files created with .backup extension');
  console.log('   Review changes and delete .backup files when satisfied');
}

console.log('\n✨ Done!');

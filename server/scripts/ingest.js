import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const bundled = process.env.USERPROFILE && join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python = process.env.PYTHON_BIN || (bundled && existsSync(bundled) ? bundled : 'python');
const result = spawnSync(python, ['-X','utf8','server/scripts/ingest.py', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) console.error('Python with pypdf and python-docx is required; set PYTHON_BIN. Live knowledge does not depend on ingestion.');
process.exitCode = result.status ?? 1;

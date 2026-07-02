#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const envFiles = [
  ['packages/db/.env.example', 'packages/db/.env'],
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env'],
];

let created = 0;

for (const [example, target] of envFiles) {
  const examplePath = resolve(root, example);
  const targetPath = resolve(root, target);

  if (existsSync(targetPath)) {
    console.log(`skip  ${target} (already exists)`);
    continue;
  }

  copyFileSync(examplePath, targetPath);
  console.log(`create ${target}`);
  created += 1;
}

console.log('');
console.log('Vaultly setup');
console.log('-------------');
console.log('1. Fill env files with Supabase credentials (Database, Auth, anon key)');
console.log('2. Run storage SQL: packages/db/supabase/storage-setup.sql');
console.log('3. npm install && npm run db:generate && npm run db:push');
console.log('4. npm run dev');
console.log('');
console.log(created > 0 ? `Created ${created} env file(s).` : 'All env files already present.');

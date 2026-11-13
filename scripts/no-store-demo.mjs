#!/usr/bin/env node
/**
 * Falha se EXPO_PUBLIC_DEMO_MODE=1 estiver no perfil preview ou production do eas.json,
 * ou em app.json / app.config.* . O modo demo da fumaça só existe na variável do job de CI.
 * O perfil development pode ligar o demo: não é build de loja.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEMO_KEY = 'EXPO_PUBLIC_DEMO_MODE';
// Aspas opcionais: vale para JSON ("EXPO_PUBLIC_DEMO_MODE=1") e para app.config.ts (`: '1'`).
const DEMO_ASSIGNMENT = /EXPO_PUBLIC_DEMO_MODE\s*[:=]\s*['"]?1['"]?(?!\d)/;
const STORE_PROFILES = ['preview', 'production'];
const APP_JSON = ['app.json', 'app.config.json'];
const APP_CONFIG_SOURCE = ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs'];

const isDemoValue = (value) => value === '1' || value === 1 || value === true;

function walk(value, path, out) {
  if (typeof value === 'string') {
    if (DEMO_ASSIGNMENT.test(value)) out.push(`${path} contém EXPO_PUBLIC_DEMO_MODE=1`);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, out));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const next = `${path}.${key}`;
    if (key === DEMO_KEY && isDemoValue(child)) out.push(`${next} = ${JSON.stringify(child)}`);
    walk(child, next, out);
  }
}

function readJson(file) {
  try {
    return { json: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}

/** @param {string} root */
export function collectStoreDemoViolations(root) {
  const violations = [];

  const easPath = join(root, 'eas.json');
  if (existsSync(easPath)) {
    const eas = readJson(easPath);
    if (eas.error) violations.push(`eas.json não é JSON válido (${eas.error})`);
    else {
      for (const profile of STORE_PROFILES) {
        const node = eas.json?.build?.[profile];
        if (node !== undefined) walk(node, `eas.json build.${profile}`, violations);
      }
    }
  }

  for (const name of APP_JSON) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    const parsed = readJson(file);
    if (parsed.error) violations.push(`${name} não é JSON válido (${parsed.error})`);
    else walk(parsed.json, name, violations);
  }

  for (const name of APP_CONFIG_SOURCE) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    if (DEMO_ASSIGNMENT.test(readFileSync(file, 'utf8'))) violations.push(`${name} define EXPO_PUBLIC_DEMO_MODE=1`);
  }

  return violations;
}

function main() {
  const root = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const violations = collectStoreDemoViolations(root);
  if (violations.length > 0) {
    console.error('EXPO_PUBLIC_DEMO_MODE=1 não pode estar no perfil preview, no perfil production nem na config do app.');
    console.error('O modo demo da fumaça fica só na variável do job de CI.');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.log('Config de loja sem EXPO_PUBLIC_DEMO_MODE=1.');
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry && import.meta.url === pathToFileURL(entry).href) main();

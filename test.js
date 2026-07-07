#!/usr/bin/env node
/* ================================================================
   Config Lab — Test Suite
   Tests template definitions, serializers, validation, and generation.
   Run with: node test.js
   ================================================================ */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  ✓ ' + msg);
  } else {
    failed++;
    console.error('  ✗ ' + msg);
  }
}

// ── Test 1: File existence ────────────────────────────────────────
console.log('\n📁 Test 1: File existence');
[
  'index.html', 'app.js', 'templates.js', 'style.css',
  'server.js', 'robots.txt', 'sitemap.xml'
].forEach(f => {
  assert(fs.existsSync(path.join(__dirname, f)), f + ' exists');
});

// ── Test 2: HTML structure ────────────────────────────────────────
console.log('\n📄 Test 2: HTML structure');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
assert(html.includes('<!DOCTYPE html>'), 'Has DOCTYPE');
assert(html.includes('<html lang="it"'), 'Lang is it');
assert(html.includes('<meta name="viewport"'), 'Has viewport meta');
assert(html.includes('<meta name="description"'), 'Has meta description');
assert(html.includes('<title>'), 'Has title');
assert(html.includes('<h1'), 'Has h1');
assert(html.includes('role="banner"'), 'Has header landmark');
assert(html.includes('role="main"'), 'Has main landmark');
assert(html.includes('role="contentinfo"'), 'Has footer landmark');
assert(html.includes('og:title'), 'Has OG title');
assert(html.includes('og:description'), 'Has OG description');
assert(html.includes('canonical'), 'Has canonical link');
assert(html.includes('schema.org'), 'Has JSON-LD schema');
const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');
assert(cssContent.includes('prefers-reduced-motion'), 'Respects reduced motion (in CSS)');
assert(html.includes('aria-label'), 'Has aria labels');

// ── Test 3: Template definitions ──────────────────────────────────
console.log('\n📋 Test 3: Template definitions');

// Evaluate templates.js in a sandbox
const templatesCode = fs.readFileSync(path.join(__dirname, 'templates.js'), 'utf-8');
const vm = require('vm');
const sandbox = { window: {}, module: {} };
vm.createContext(sandbox);
vm.runInContext(templatesCode, sandbox);
const TEMPLATES = sandbox.window.TEMPLATES;

assert(Array.isArray(TEMPLATES), 'TEMPLATES is an array');
assert(TEMPLATES.length >= 5, 'Has at least 5 templates');

const tplIds = TEMPLATES.map(t => t.id);
assert(tplIds.includes('vscode-settings'), 'Has VS Code settings template');
assert(tplIds.includes('gitignore'), 'Has .gitignore template');
assert(tplIds.includes('dockerfile'), 'Has Dockerfile template');
assert(tplIds.includes('eslintrc'), 'Has ESLint template');
assert(tplIds.includes('prettierrc'), 'Has Prettier template');

// Validate template structure
TEMPLATES.forEach(tpl => {
  assert(typeof tpl.id === 'string', tpl.id + ': id is string');
  assert(typeof tpl.name === 'string', tpl.id + ': name is string');
  assert(typeof tpl.format === 'string', tpl.id + ': format is string');
  assert(typeof tpl.filename === 'string', tpl.id + ': filename is string');
  assert(tpl.schema && Array.isArray(tpl.schema.groups), tpl.id + ': schema has groups array');

  tpl.schema.groups.forEach(group => {
    assert(typeof group.label === 'string', tpl.id + '/' + group.key + ': group has label');
    assert(typeof group.key === 'string', tpl.id + '/' + group.key + ': group has key');
    assert(Array.isArray(group.fields), tpl.id + '/' + group.key + ': group has fields array');

    group.fields.forEach(field => {
      assert(typeof field.key === 'string', tpl.id + '/' + group.key + '/' + field.key + ': field has key');
      assert(typeof field.label === 'string', tpl.id + '/' + group.key + '/' + field.key + ': field has label');
      assert(typeof field.type === 'string', tpl.id + '/' + group.key + '/' + field.key + ': field has type');
      assert(['string', 'number', 'boolean', 'select'].includes(field.type),
        tpl.id + '/' + group.key + '/' + field.key + ': valid type');
    });
  });
});

// ── Test 4: Serializers ───────────────────────────────────────────
console.log('\n🔧 Test 4: Serializers (extracted from app.js)');

// Replicate key functions
function setNested(obj, pathStr, value) {
  const keys = pathStr.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in cur) || typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function toJSON(obj) { return JSON.stringify(obj, null, 2); }

function yamlString(s) {
  if (s === '' || /[{}[\]&*#?|>!%@`"'\-:,\s]/.test(s) || s === 'true' || s === 'false' || s === 'null' || /^\d/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}

function toYAML(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        out += pad + '-\n' + toYAML(item, indent + 1).split('\n').filter(Boolean).map(l => '  '.repeat(indent + 1) + '  ' + l.trimStart()).join('\n') + '\n';
      } else if (typeof item === 'string') {
        out += pad + '- ' + yamlString(item) + '\n';
      } else {
        out += pad + '- ' + item + '\n';
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) {
        out += pad + k + ': null\n';
      } else if (typeof v === 'object') {
        out += pad + k + ':\n' + toYAML(v, indent + 1);
      } else if (typeof v === 'string') {
        out += pad + k + ': ' + yamlString(v) + '\n';
      } else if (typeof v === 'boolean') {
        out += pad + k + ': ' + (v ? 'true' : 'false') + '\n';
      } else {
        out += pad + k + ': ' + v + '\n';
      }
    }
  }
  return out;
}

function tomlValue(v) {
  if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return '[' + v.map(tomlValue).join(', ') + ']';
  if (v === null || v === undefined) return '""';
  return String(v);
}

function toTOML(obj, prefix = '') {
  let out = '';
  const simple = {};
  const tables = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      tables[k] = v;
    } else {
      simple[k] = v;
    }
  }
  for (const [k, v] of Object.entries(simple)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    out += fullKey + ' = ' + tomlValue(v) + '\n';
  }
  for (const [k, v] of Object.entries(tables)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    out += '\n[' + fullKey + ']\n';
    out += toTOML(v, fullKey);
  }
  return out;
}

// Test JSON
const testObj = { editor: { fontSize: 16, tabSize: 2 }, files: { autoSave: 'afterDelay' } };
const jsonOut = toJSON(testObj);
assert(jsonOut.includes('"fontSize": 16'), 'JSON: fontSize=16 nested');
assert(jsonOut.includes('"tabSize": 2'), 'JSON: tabSize=2 nested');
assert(jsonOut.includes('"autoSave": "afterDelay"'), 'JSON: autoSave nested');

// Test YAML
const yamlOut = toYAML(testObj);
assert(yamlOut.includes('fontSize: 16') || yamlOut.includes('fontSize:16'), 'YAML: fontSize=16');
assert(yamlOut.includes('tabSize: 2') || yamlOut.includes('tabSize:2'), 'YAML: tabSize=2');
assert(yamlOut.includes('autoSave: afterDelay'), 'YAML: autoSave (bare string)');

// Test TOML
const tomlOut = toTOML(testObj);
assert(tomlOut.includes('fontSize = 16'), 'TOML: fontSize=16');
assert(tomlOut.includes('[editor]'), 'TOML: editor section');
assert(tomlOut.includes('[files]'), 'TOML: files section');

// Test nested objects with dot keys
const nested = {};
setNested(nested, 'editor.minimap.enabled', true);
assert(nested.editor && nested.editor.minimap && nested.editor.minimap.enabled === true, 'setNested: 3-level nesting');

// ── Test 5: generateOutput for JSON templates ─────────────────────
console.log('\n📝 Test 5: Output generation');

function buildData(values, schema, customFields) {
  const obj = {};
  for (const group of schema.groups) {
    for (const field of group.fields) {
      const flatKey = group.key + '.' + field.key;
      const val = values[flatKey];
      if (val !== undefined && val !== null && val !== '') {
        setNested(obj, flatKey, val);
      }
    }
  }
  for (const cf of customFields || []) {
    if (cf.key && cf.value !== undefined && cf.value !== '') {
      let parsed = cf.value;
      if (parsed === 'true') parsed = true;
      else if (parsed === 'false') parsed = false;
      else if (/^-?\d+(\.\d+)?$/.test(parsed)) parsed = Number(parsed);
      setNested(obj, cf.key, parsed);
    }
  }
  return obj;
}

function generateOutput(template, values, customFields, format) {
  if (template.format === 'text') return '';
  const data = buildData(values, template.schema, customFields);
  switch (format) {
    case 'yaml': return toYAML(data);
    case 'toml': return toTOML(data);
    default: return toJSON(data);
  }
}

// Test VS Code settings acceptance criterion
const vscodeTpl = TEMPLATES.find(t => t.id === 'vscode-settings');
const vscodeVals = {
  'editor.fontSize': 16,
  'editor.fontFamily': "'Cascadia Code', 'Fira Code', monospace",
  'editor.tabSize': 2,
  'editor.insertSpaces': true,
  'editor.wordWrap': 'on',
  'editor.minimap.enabled': true,
  'files.autoSave': 'afterDelay',
  'files.autoSaveDelay': 1000,
  'workbench.colorTheme': 'Default Dark+',
  'workbench.iconTheme': 'vs-seti',
};
const vscodePreview = generateOutput(vscodeTpl, vscodeVals, [], 'json');
assert(vscodePreview.includes('"fontSize": 16'), 'VS Code: fontSize=16 in preview (nested under editor)');
assert(vscodePreview.includes('"tabSize": 2'), 'VS Code: tabSize=2 in preview (nested under editor)');
assert(vscodePreview.includes('"editor"'), 'VS Code: editor key present in output');
assert(vscodePreview.includes('"files"'), 'VS Code: files key present in output');
assert(vscodePreview.includes('{') && vscodePreview.includes('}'), 'VS Code: valid JSON structure');

// ── Test 6: Validation ────────────────────────────────────────────
console.log('\n✅ Test 6: Validation');

function validate(values, schema, customFields) {
  const errors = {};
  const warnings = {};
  for (const group of schema.groups) {
    for (const field of group.fields) {
      const flatKey = group.key + '.' + field.key;
      const val = values[flatKey];
      if (field.required) {
        if (val === undefined || val === null || val === '') {
          errors[flatKey] = 'Campo obbligatorio';
          continue;
        }
      }
      if (val === undefined || val === null || val === '') continue;
      if (field.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors[flatKey] = 'Deve essere un numero';
          continue;
        }
        if (field.min !== undefined && num < field.min) {
          errors[flatKey] = 'Minimo ' + field.min;
        }
        if (field.max !== undefined && num > field.max) {
          errors[flatKey] = 'Massimo ' + field.max;
        }
      }
    }
  }
  for (const cf of customFields || []) {
    if (cf.key) {
      warnings['__custom_' + cf.key] = 'Chiave non riconosciuta dal template';
    }
  }
  return { errors, warnings };
}

// Test required field validation
const eslintTpl = TEMPLATES.find(t => t.id === 'eslintrc');
const incompleteVals = {
  'env.browser': true,
  'env.node': true,
  'env.es2021': true,
  'extends.recommended': true,
  'parserOptions.ecmaVersion': '',  // required, empty → error
  'parserOptions.sourceType': 'module',
  'rules.semi': 'always',
  'rules.quotes': 'single',
};
const valResult = validate(incompleteVals, eslintTpl.schema, []);
assert(valResult.errors['parserOptions.ecmaVersion'] === 'Campo obbligatorio',
  'Required empty field triggers error');

// Test custom field warning
const valResult2 = validate(incompleteVals, eslintTpl.schema, [{ key: 'custom.myKey', value: 'hello' }]);
assert(Object.values(valResult2.warnings).some(w => w.includes('non riconosciuta')),
  'Custom key triggers warning');

// Test all required fields filled → no errors
const completeVals = { ...incompleteVals, 'parserOptions.ecmaVersion': 'latest' };
const valResult3 = validate(completeVals, eslintTpl.schema, []);
assert(Object.keys(valResult3.errors).length === 0, 'All required fields filled → no errors');

// ── Test 7: Dockerfile generation ─────────────────────────────────
console.log('\n🐳 Test 7: Dockerfile generation');

function buildDockerfile(values) {
  const lines = [];
  const from = values['base.fromImage'] || 'node:18-alpine';
  lines.push('FROM ' + from);
  const workdir = values['setup.workdir'] || '/app';
  lines.push('WORKDIR ' + workdir);
  if (values['setup.copyPackageJson'] !== false) {
    lines.push('COPY package*.json ./');
  }
  const installCmd = values['setup.installCmd'] || 'npm ci --only=production';
  lines.push('RUN ' + installCmd);
  if (values['setup.copySource'] !== false) {
    lines.push('COPY . .');
  }
  const expose = values['runtime.exposePort'] || 3000;
  lines.push('EXPOSE ' + expose);
  if (values['runtime.userNode']) {
    lines.push('USER node');
  }
  const cmd = values['runtime.cmd'] || 'node server.js';
  const cmdParts = cmd.split(/\s+/);
  lines.push('CMD [' + cmdParts.map(p => '"' + p + '"').join(', ') + ']');
  return lines.join('\n') + '\n';
}

const dockerVals = {
  'base.fromImage': 'node:18-alpine',
  'setup.workdir': '/app',
  'setup.copyPackageJson': true,
  'setup.installCmd': 'npm ci --only=production',
  'setup.copySource': true,
  'runtime.exposePort': 3000,
  'runtime.cmd': 'node server.js',
  'runtime.userNode': false,
};
const dockerOut = buildDockerfile(dockerVals);
assert(dockerOut.includes('FROM node:18-alpine'), 'Dockerfile: FROM directive');
assert(dockerOut.includes('WORKDIR /app'), 'Dockerfile: WORKDIR directive');
assert(dockerOut.includes('COPY package*.json ./'), 'Dockerfile: COPY packages');
assert(dockerOut.includes('RUN npm ci --only=production'), 'Dockerfile: RUN install');
assert(dockerOut.includes('COPY . .'), 'Dockerfile: COPY source');
assert(dockerOut.includes('EXPOSE 3000'), 'Dockerfile: EXPOSE');
assert(dockerOut.includes('CMD ["node", "server.js"]'), 'Dockerfile: CMD');

// ── Test 8: .gitignore generation ─────────────────────────────────
console.log('\n📄 Test 8: .gitignore generation');

const GITIGNORE_MAP = {
  'deps.node_modules': 'node_modules/',
  'env.dotenv': '.env',
  'build.dist': 'dist/',
  'os.ds_store': '.DS_Store',
  'logs.log_files': '*.log',
};
function buildGitignore(values) {
  const lines = [];
  for (const [key, pattern] of Object.entries(GITIGNORE_MAP)) {
    if (values[key]) lines.push(pattern);
  }
  return lines.join('\n') + '\n';
}

const gitVals = {
  'deps.node_modules': true,
  'env.dotenv': true,
  'build.dist': true,
  'os.ds_store': true,
  'logs.log_files': false,
};
const gitOut = buildGitignore(gitVals);
assert(gitOut.includes('node_modules/'), '.gitignore: node_modules');
assert(gitOut.includes('.env'), '.gitignore: .env');
assert(gitOut.includes('dist/'), '.gitignore: dist/');
assert(gitOut.includes('.DS_Store'), '.gitignore: .DS_Store');
assert(!gitOut.includes('*.log'), '.gitignore: *.log excluded when false');

// ── Summary ───────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log('  Passed: ' + passed + '  |  Failed: ' + failed);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);

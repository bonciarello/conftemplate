/* ================================================================
   Config Lab — Vue 3 Application
   Dynamic config editor with real-time preview, validation,
   syntax highlighting, and multi-format download.
   ================================================================ */

// ── Utility: set a nested value by dot-path ──────────────────────
function setNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in cur) || typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

// ── Utility: escape HTML ─────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Build structured object from flat form values ─────────────────
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
  // Merge custom fields
  for (const cf of customFields) {
    if (cf.key && cf.value !== undefined && cf.value !== '') {
      let parsed = cf.value;
      // Try to parse as number or boolean
      if (parsed === 'true') parsed = true;
      else if (parsed === 'false') parsed = false;
      else if (/^-?\d+(\.\d+)?$/.test(parsed)) parsed = Number(parsed);
      setNested(obj, cf.key, parsed);
    }
  }
  return obj;
}

// ── Format serializers ────────────────────────────────────────────
function toJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function toYAML(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        out += pad + '- ' + toYAML(item, indent + 1).trimStart().replace(/^/gm, '  '.repeat(indent + 1)).substring((indent + 1) * 2);
        // Simpler array-of-objects handling
        out += pad + '-\n';
        const inner = toYAML(item, indent + 1);
        out += inner.split('\n').filter(Boolean).map(l => '  '.repeat(indent + 1) + '  ' + l.trimStart()).join('\n') + '\n';
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

function yamlString(s) {
  // Quote if it contains special chars or is empty
  if (s === '' || /[{}[\]&*#?|>!%@`"'\-:,\s]/.test(s) || s === 'true' || s === 'false' || s === 'null' || /^\d/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
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

  // Simple keys
  for (const [k, v] of Object.entries(simple)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    out += fullKey + ' = ' + tomlValue(v) + '\n';
  }

  // Tables
  for (const [k, v] of Object.entries(tables)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    out += '\n[' + fullKey + ']\n';
    out += toTOML(v, fullKey);
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

// ── Build Dockerfile text ──────────────────────────────────────────
function buildDockerfile(values) {
  const lines = [];
  const get = (k) => values['base.' + k] || values['setup.' + k] || values['runtime.' + k];

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

// ── Build .gitignore text ──────────────────────────────────────────
const GITIGNORE_MAP = {
  'deps.node_modules': 'node_modules/',
  'deps.package_lock': 'package-lock.json',
  'deps.yarn_lock': 'yarn.lock',
  'env.dotenv': '.env',
  'env.dotenv_local': '.env.local',
  'env.dotenv_prod': '.env.production',
  'build.dist': 'dist/',
  'build.build_dir': 'build/',
  'build.coverage': 'coverage/',
  'os.ds_store': '.DS_Store',
  'os.thumbs_db': 'Thumbs.db',
  'logs.log_files': '*.log',
  'logs.npm_debug': 'npm-debug.log*'
};

function buildGitignore(values) {
  const lines = [];
  for (const [key, pattern] of Object.entries(GITIGNORE_MAP)) {
    if (values[key]) {
      // Add comment for context
      const section = key.split('.')[0];
      lines.push(pattern);
    }
  }
  if (lines.length === 0) {
    lines.push('# Nessun pattern selezionato');
  }
  return lines.join('\n') + '\n';
}

// ── Generate output text from form values ──────────────────────────
function generateOutput(template, values, customFields, format) {
  if (template.format === 'text') {
    if (template.id === 'dockerfile') return buildDockerfile(values);
    if (template.id === 'gitignore') return buildGitignore(values);
    return '';
  }

  // JSON-based templates
  const data = buildData(values, template.schema, customFields);

  switch (format) {
    case 'yaml': return toYAML(data);
    case 'toml': return toTOML(data);
    default: return toJSON(data);
  }
}

// ── Syntax highlighting ────────────────────────────────────────────
function highlightJSON(text) {
  let html = escHtml(text);
  // Keys
  html = html.replace(/(<span class="[^"]*">)?("(?:[^"\\]|\\.)*")(<\/span>)?(\s*:)/g,
    (m, pre, key, post, colon) => '<span class="hl-key">' + key + '</span>' + colon);
  // String values
  html = html.replace(/(:\s*)("(?:[^"\\]|\\.)*")/g,
    (m, before, str) => before + '<span class="hl-string">' + str + '</span>');
  // Numbers
  html = html.replace(/(:\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
    (m, before, num) => before + '<span class="hl-number">' + num + '</span>');
  // Booleans & null
  html = html.replace(/(:\s*)\b(true|false|null)\b/g,
    (m, before, kw) => before + '<span class="hl-bool">' + kw + '</span>');
  // Braces/brackets
  html = html.replace(/([{}[\]])/g, '<span class="hl-punct">$1</span>');
  return html;
}

function highlightYAML(text) {
  let html = escHtml(text);
  // Comments
  html = html.replace(/^(#.*)$/gm, '<span class="hl-comment">$1</span>');
  // Keys (word followed by colon not inside quotes)
  html = html.replace(/^(\s*)([\w][\w.-]*)(\s*:)/gm,
    (m, indent, key, colon) => indent + '<span class="hl-key">' + key + '</span>' + colon);
  // String values
  html = html.replace(/:\s+("(?:[^"\\]|\\.)*")/g,
    (m, str) => ': <span class="hl-string">' + str + '</span>');
  html = html.replace(/:\s+('(?:[^'\\]|\\.)*')/g,
    (m, str) => ': <span class="hl-string">' + str + '</span>');
  // Bare strings after colon (not already wrapped)
  html = html.replace(/(:\s+)((?:(?!<span)[^\s#])+)/g,
    (m, before, val) => {
      if (/^(true|false|null|yes|no|on|off)$/i.test(val)) {
        return before + '<span class="hl-bool">' + val + '</span>';
      }
      if (/^-?\d+\.?\d*$/.test(val)) {
        return before + '<span class="hl-number">' + val + '</span>';
      }
      return before + '<span class="hl-string">' + val + '</span>';
    });
  // List markers
  html = html.replace(/^(\s*)(-\s)/gm,
    (m, indent, dash) => indent + '<span class="hl-punct">' + dash + '</span>');
  return html;
}

function highlightTOML(text) {
  let html = escHtml(text);
  // Comments
  html = html.replace(/^(#.*)$/gm, '<span class="hl-comment">$1</span>');
  // Section headers
  html = html.replace(/^(\s*\[)([^\]]+)(\])/gm,
    (m, open, name, close) => open + '<span class="hl-section">' + name + '</span>' + close);
  // Keys
  html = html.replace(/^(\s*)([\w][\w.-]*)(\s*=)/gm,
    (m, indent, key, eq) => indent + '<span class="hl-key">' + key + '</span>' + eq);
  // String values
  html = html.replace(/=\s*("(?:[^"\\]|\\.)*")/g,
    (m, str) => '= <span class="hl-string">' + str + '</span>');
  // Numbers
  html = html.replace(/=\s*(-?\d+\.?\d*)\b/g,
    (m, num) => '= <span class="hl-number">' + num + '</span>');
  // Booleans
  html = html.replace(/=\s*(true|false)\b/gi,
    (m, kw) => '= <span class="hl-bool">' + kw + '</span>');
  return html;
}

function highlightDockerfile(text) {
  let html = escHtml(text);
  // Comments
  html = html.replace(/^(#.*)$/gm, '<span class="hl-comment">$1</span>');
  // Directives (FROM, RUN, CMD, COPY, etc.)
  html = html.replace(/^(\s*)(FROM|RUN|CMD|COPY|ADD|WORKDIR|EXPOSE|ENV|USER|ENTRYPOINT|VOLUME|ARG|LABEL|ONBUILD|HEALTHCHECK|STOPSIGNAL|SHELL)\b/gmi,
    (m, indent, dir) => indent + '<span class="hl-directive">' + dir.toUpperCase() + '</span>');
  // String values after directives
  html = html.replace(/(<span class="hl-directive">[^<]+<\/span>\s+)([^\n]+)/g,
    (m, dirSpan, args) => dirSpan + '<span class="hl-string">' + args + '</span>');
  return html;
}

function highlightGitignore(text) {
  let html = escHtml(text);
  // Comments
  html = html.replace(/^(#.*)$/gm, '<span class="hl-comment">$1</span>');
  // Negation patterns
  html = html.replace(/^(\!.*)$/gm, '<span class="hl-warn">$1</span>');
  return html;
}

function highlightText(text, format, templateId) {
  if (format === 'yaml') return highlightYAML(text);
  if (format === 'toml') return highlightTOML(text);
  if (templateId === 'dockerfile') return highlightDockerfile(text);
  if (templateId === 'gitignore') return highlightGitignore(text);
  return highlightJSON(text);
}

// ── Collect default values from schema ─────────────────────────────
function collectDefaults(schema) {
  const vals = {};
  for (const group of schema.groups) {
    for (const field of group.fields) {
      const flatKey = group.key + '.' + field.key;
      vals[flatKey] = field.default;
    }
  }
  return vals;
}

// ── Validate form values ───────────────────────────────────────────
function validate(values, schema, customFields) {
  const errors = {};
  const warnings = {};

  for (const group of schema.groups) {
    for (const field of group.fields) {
      const flatKey = group.key + '.' + field.key;
      const val = values[flatKey];

      // Required check
      if (field.required) {
        if (val === undefined || val === null || val === '') {
          errors[flatKey] = 'Campo obbligatorio';
          continue;
        }
      }

      // Skip empty optional fields
      if (val === undefined || val === null || val === '') continue;

      // Type check
      if (field.type === 'number') {
        if (typeof val === 'string' && val !== '') {
          const num = Number(val);
          if (isNaN(num)) {
            errors[flatKey] = 'Deve essere un numero';
            continue;
          }
        }
        const num = Number(val);
        if (field.min !== undefined && num < field.min) {
          errors[flatKey] = 'Minimo ' + field.min;
        }
        if (field.max !== undefined && num > field.max) {
          errors[flatKey] = 'Massimo ' + field.max;
        }
      }

      if (field.type === 'select' && field.options) {
        if (!field.options.includes(val) && val !== '') {
          warnings[flatKey] = 'Valore non presente nelle opzioni predefinite';
        }
      }
    }
  }

  // Validate custom fields: warn that they are not in template
  for (const cf of customFields) {
    if (!cf.key) {
      warnings['__custom_empty_key__'] = 'La chiave personalizzata non può essere vuota';
    }
    if (cf.key) {
      warnings['__custom_' + cf.key] = 'Chiave non riconosciuta dal template';
    }
  }

  return { errors, warnings };
}

// ── Vue Application ────────────────────────────────────────────────
const { createApp, ref, reactive, computed, watch, onMounted } = Vue;

const ConfigLabApp = {
  data() {
    return {
      templates: window.TEMPLATES || [],
      selectedTemplate: null,
      formValues: {},
      formErrors: {},
      formWarnings: {},
      outputFormat: 'json',
      outputFormats: ['json', 'yaml', 'toml'],
      customFields: [],
      addingCustom: false,
      customKey: '',
      customValue: '',
    };
  },

  computed: {
    downloadFilename() {
      if (!this.selectedTemplate) return 'config.json';
      const tpl = this.selectedTemplate;
      const subpath = tpl.subpath || '';
      const base = tpl.filename.replace(/\.[^.]+$/, '');
      if (tpl.format === 'text') return subpath + tpl.filename;
      const ext = this.outputFormat === 'toml' ? '.toml' : (this.outputFormat === 'yaml' ? '.yaml' : '.json');
      return subpath + base + ext;
    },

    outputText() {
      if (!this.selectedTemplate) return '';
      return generateOutput(this.selectedTemplate, this.formValues, this.customFields, this.outputFormat);
    },

    highlightedPreview() {
      if (!this.selectedTemplate) return '';
      const text = this.outputText;
      const fmt = this.selectedTemplate.format === 'text' ? 'text' : this.outputFormat;
      return highlightText(text, fmt, this.selectedTemplate.id);
    },

    errorCount() {
      return Object.keys(this.formErrors).filter(k => !k.startsWith('__custom_')).length;
    },

    warningCount() {
      return Object.keys(this.formWarnings).length;
    },

    hasValues() {
      return this.outputText.trim().length > 0;
    }
  },

  methods: {
    selectTemplate(tpl) {
      this.selectedTemplate = tpl;
      this.formValues = collectDefaults(tpl.schema);
      this.formErrors = {};
      this.formWarnings = {};
      this.customFields = [];
      this.outputFormat = 'json';
      this.addingCustom = false;
      this.customKey = '';
      this.customValue = '';
      this.runValidation();
    },

    updateField(key, value) {
      this.formValues[key] = value;
      this.runValidation();
    },

    runValidation() {
      if (!this.selectedTemplate) return;
      const result = validate(this.formValues, this.selectedTemplate.schema, this.customFields);
      this.formErrors = result.errors;
      this.formWarnings = result.warnings;
    },

    addCustomKey() {
      if (!this.customKey.trim()) return;
      this.customFields.push({
        key: this.customKey.trim(),
        value: this.customValue.trim()
      });
      this.customKey = '';
      this.customValue = '';
      this.addingCustom = false;
      this.runValidation();
    },

    removeCustomField(index) {
      this.customFields.splice(index, 1);
      this.runValidation();
    },

    hasError(key) {
      return !!this.formErrors[key];
    },

    hasWarning(key) {
      return !!this.formWarnings[key];
    },

    downloadFile() {
      if (this.errorCount > 0) return;
      const text = this.outputText;
      const blob = new Blob([text], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.downloadFilename.split('/').pop(); // Just the filename
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // Helper to render a field value for display
    fieldInputType(field) {
      if (field.type === 'boolean') return 'checkbox';
      if (field.type === 'number') return 'number';
      return 'text';
    },

    getFieldError(key) {
      return this.formErrors[key] || '';
    },

    getFieldWarning(key) {
      return this.formWarnings[key] || '';
    }
  },

  watch: {
    outputFormat() {
      this.runValidation();
    }
  }
};

// ── Components ─────────────────────────────────────────────────────

// ConfigForm: renders the dynamic form from the template schema
const ConfigForm = {
  props: {
    schema: { type: Object, required: true },
    values: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    warnings: { type: Object, default: () => ({}) },
    format: { type: String, default: 'json' }
  },
  emits: ['update:field', 'add-custom', 'remove-custom'],
  template: `
    <div class="config-form">
      <fieldset
        v-for="group in schema.groups"
        :key="group.key"
        class="form-group"
      >
        <legend class="form-group-legend">{{ group.label }}</legend>
        <div
          v-for="field in group.fields"
          :key="field.key"
          class="form-field"
          :class="{
            'has-error': errors[group.key + '.' + field.key],
            'has-warning': warnings[group.key + '.' + field.key]
          }"
        >
          <label :for="'fld-' + group.key + '-' + field.key" class="field-label">
            {{ field.label }}
            <span v-if="field.required" class="required-star" aria-label="obbligatorio">*</span>
          </label>

          <!-- String input -->
          <input
            v-if="field.type === 'string'"
            :id="'fld-' + group.key + '-' + field.key"
            type="text"
            class="input"
            :value="values[group.key + '.' + field.key]"
            @input="$emit('update:field', group.key + '.' + field.key, $event.target.value)"
            :aria-invalid="!!errors[group.key + '.' + field.key]"
            :aria-describedby="'err-' + group.key + '-' + field.key + ' hint-' + group.key + '-' + field.key"
          >

          <!-- Number input -->
          <input
            v-else-if="field.type === 'number'"
            :id="'fld-' + group.key + '-' + field.key"
            type="number"
            class="input"
            :value="values[group.key + '.' + field.key]"
            @input="$emit('update:field', group.key + '.' + field.key, $event.target.value === '' ? '' : Number($event.target.value))"
            :min="field.min"
            :max="field.max"
            :aria-invalid="!!errors[group.key + '.' + field.key]"
            :aria-describedby="'err-' + group.key + '-' + field.key + ' hint-' + group.key + '-' + field.key"
          >

          <!-- Select -->
          <select
            v-else-if="field.type === 'select'"
            :id="'fld-' + group.key + '-' + field.key"
            class="input input-select"
            :value="values[group.key + '.' + field.key]"
            @change="$emit('update:field', group.key + '.' + field.key, $event.target.value)"
            :aria-invalid="!!errors[group.key + '.' + field.key]"
            :aria-describedby="'err-' + group.key + '-' + field.key + ' hint-' + group.key + '-' + field.key"
          >
            <option
              v-for="opt in field.options"
              :key="opt"
              :value="opt"
            >{{ opt }}</option>
          </select>

          <!-- Boolean checkbox -->
          <label
            v-else-if="field.type === 'boolean'"
            class="checkbox-wrap"
            :for="'fld-' + group.key + '-' + field.key"
          >
            <input
              :id="'fld-' + group.key + '-' + field.key"
              type="checkbox"
              class="checkbox"
              :checked="values[group.key + '.' + field.key]"
              @change="$emit('update:field', group.key + '.' + field.key, $event.target.checked)"
            >
            <span class="checkbox-visual" aria-hidden="true"></span>
            <span class="checkbox-label-text">{{ values[group.key + '.' + field.key] ? 'Sì' : 'No' }}</span>
          </label>

          <!-- Hint text -->
          <p
            v-if="field.hint && !errors[group.key + '.' + field.key]"
            :id="'hint-' + group.key + '-' + field.key"
            class="field-hint"
          >{{ field.hint }}</p>

          <!-- Error message -->
          <p
            v-if="errors[group.key + '.' + field.key]"
            :id="'err-' + group.key + '-' + field.key"
            class="field-error"
            role="alert"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v4M7 10h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            {{ errors[group.key + '.' + field.key] }}
          </p>

          <!-- Warning message -->
          <p
            v-if="!errors[group.key + '.' + field.key] && warnings[group.key + '.' + field.key]"
            :id="'warn-' + group.key + '-' + field.key"
            class="field-warning"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2L1 13h12L7 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 6v3M7 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            {{ warnings[group.key + '.' + field.key] }}
          </p>
        </div>
      </fieldset>
    </div>
  `
};

// ── Create and mount the app ───────────────────────────────────────
const app = createApp(ConfigLabApp);
app.component('config-form', ConfigForm);
app.mount('#app');

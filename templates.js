/* ================================================================
   Config Lab — Template Library
   Ogni template definisce: id, name, description, icon, color,
   format (json|text), filename, subpath, schema.
   Lo schema definisce la struttura del form e le regole di validazione.
   ================================================================ */

const TEMPLATES = [
  {
    id: 'vscode-settings',
    name: 'VS Code Settings',
    description: 'Configura il tuo editor Visual Studio Code: font, tab, salvamento automatico, tema e icone.',
    icon: '⚙',
    color: '#6366F1',
    format: 'json',
    filename: 'settings.json',
    subpath: '.vscode/',
    schema: {
      groups: [
        {
          label: 'Editor',
          key: 'editor',
          fields: [
            { key: 'fontSize', label: 'Dimensione font', type: 'number', default: 14, required: true, min: 8, max: 72, hint: 'Dimensione in pixel del font nell\'editor' },
            { key: 'fontFamily', label: 'Font family', type: 'string', default: "'Cascadia Code', 'Fira Code', monospace", required: false, hint: 'Famiglia di font con fallback (stringa CSS)' },
            { key: 'tabSize', label: 'Larghezza tab', type: 'number', default: 2, required: true, min: 1, max: 8, hint: 'Numero di spazi per ogni tab' },
            { key: 'insertSpaces', label: 'Inserisci spazi', type: 'boolean', default: true, required: false, hint: 'Usa spazi invece del carattere tab' },
            { key: 'wordWrap', label: 'A capo automatico', type: 'select', default: 'on', required: false, options: ['off', 'on', 'wordWrapColumn', 'bounded'], hint: 'Modalità di ritorno a capo del testo' },
            { key: 'minimap.enabled', label: 'Minimap attiva', type: 'boolean', default: true, required: false }
          ]
        },
        {
          label: 'File',
          key: 'files',
          fields: [
            { key: 'autoSave', label: 'Salvamento automatico', type: 'select', default: 'afterDelay', required: false, options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'], hint: 'Quando salvare automaticamente i file' },
            { key: 'autoSaveDelay', label: 'Ritardo auto-save (ms)', type: 'number', default: 1000, required: false, min: 100, max: 60000, hint: 'Millisecondi di attesa prima del salvataggio' }
          ]
        },
        {
          label: 'Workbench',
          key: 'workbench',
          fields: [
            { key: 'colorTheme', label: 'Tema colore', type: 'string', default: 'Default Dark+', required: false, hint: 'Nome del tema colore installato' },
            { key: 'iconTheme', label: 'Tema icone', type: 'string', default: 'vs-seti', required: false, hint: 'Nome del tema icone installato' }
          ]
        }
      ]
    }
  },

  {
    id: 'gitignore',
    name: '.gitignore',
    description: 'Genera un file .gitignore per Node.js con i pattern più comuni: dipendenze, variabili d\'ambiente, log e build.',
    icon: '⎔',
    color: '#F59E0B',
    format: 'text',
    filename: '.gitignore',
    subpath: '',
    schema: {
      groups: [
        {
          label: 'Dipendenze',
          key: 'deps',
          fields: [
            { key: 'node_modules', label: 'node_modules/', type: 'boolean', default: true, required: false, hint: 'Esclude la cartella dei moduli Node' },
            { key: 'package_lock', label: 'package-lock.json', type: 'boolean', default: false, required: false, hint: 'Esclude il lockfile di npm' },
            { key: 'yarn_lock', label: 'yarn.lock', type: 'boolean', default: false, required: false, hint: 'Esclude il lockfile di Yarn' }
          ]
        },
        {
          label: 'Ambiente e segreti',
          key: 'env',
          fields: [
            { key: 'dotenv', label: '.env', type: 'boolean', default: true, required: false, hint: 'Esclude i file delle variabili d\'ambiente' },
            { key: 'dotenv_local', label: '.env.local', type: 'boolean', default: true, required: false },
            { key: 'dotenv_prod', label: '.env.production', type: 'boolean', default: true, required: false }
          ]
        },
        {
          label: 'Build e output',
          key: 'build',
          fields: [
            { key: 'dist', label: 'dist/', type: 'boolean', default: true, required: false, hint: 'Esclude la cartella di build' },
            { key: 'build_dir', label: 'build/', type: 'boolean', default: false, required: false },
            { key: 'coverage', label: 'coverage/', type: 'boolean', default: true, required: false, hint: 'Esclude i report di copertura test' }
          ]
        },
        {
          label: 'Sistema operativo',
          key: 'os',
          fields: [
            { key: 'ds_store', label: '.DS_Store', type: 'boolean', default: true, required: false, hint: 'File di sistema macOS' },
            { key: 'thumbs_db', label: 'Thumbs.db', type: 'boolean', default: false, required: false, hint: 'File di sistema Windows' }
          ]
        },
        {
          label: 'Log',
          key: 'logs',
          fields: [
            { key: 'log_files', label: '*.log', type: 'boolean', default: true, required: false, hint: 'Esclude tutti i file di log' },
            { key: 'npm_debug', label: 'npm-debug.log*', type: 'boolean', default: true, required: false }
          ]
        }
      ]
    }
  },

  {
    id: 'dockerfile',
    name: 'Dockerfile',
    description: 'Componi un Dockerfile per Node.js: immagine base, directory di lavoro, installazione dipendenze, esposizione porte e comando di avvio.',
    icon: '⬡',
    color: '#10B981',
    format: 'text',
    filename: 'Dockerfile',
    subpath: '',
    schema: {
      groups: [
        {
          label: 'Immagine base',
          key: 'base',
          fields: [
            { key: 'fromImage', label: 'Immagine base', type: 'select', default: 'node:18-alpine', required: true, options: ['node:18-alpine', 'node:20-alpine', 'node:18-slim', 'node:20-slim', 'node:18', 'node:20'], hint: 'Immagine Docker di partenza' }
          ]
        },
        {
          label: 'Directory e dipendenze',
          key: 'setup',
          fields: [
            { key: 'workdir', label: 'Workdir', type: 'string', default: '/app', required: true, hint: 'Directory di lavoro nel container' },
            { key: 'copyPackageJson', label: 'Copiare package.json', type: 'boolean', default: true, required: false, hint: 'Copia package.json e lockfile prima di npm install' },
            { key: 'installCmd', label: 'Comando install', type: 'select', default: 'npm ci --only=production', required: true, options: ['npm ci --only=production', 'npm ci', 'npm install --production', 'npm install', 'yarn install --production', 'yarn install'], hint: 'Comando per installare le dipendenze' },
            { key: 'copySource', label: 'Copiare sorgenti', type: 'boolean', default: true, required: false, hint: 'Aggiunge COPY . . per i sorgenti applicativi' }
          ]
        },
        {
          label: 'Runtime',
          key: 'runtime',
          fields: [
            { key: 'exposePort', label: 'Porta esposta', type: 'number', default: 3000, required: true, min: 1, max: 65535, hint: 'Porta TCP su cui l\'app è in ascolto' },
            { key: 'cmd', label: 'Comando avvio', type: 'string', default: 'node server.js', required: true, hint: 'CMD per avviare l\'applicazione' },
            { key: 'userNode', label: 'Utente non-root', type: 'boolean', default: false, required: false, hint: 'Aggiunge USER node per sicurezza' }
          ]
        }
      ]
    }
  },

  {
    id: 'eslintrc',
    name: '.eslintrc.json',
    description: 'Configura ESLint per JavaScript/TypeScript: ambiente, estensioni raccomandate, parser ECMAScript e regole di stile.',
    icon: '⬢',
    color: '#EC4899',
    format: 'json',
    filename: '.eslintrc.json',
    subpath: '',
    schema: {
      groups: [
        {
          label: 'Ambiente',
          key: 'env',
          fields: [
            { key: 'browser', label: 'Browser', type: 'boolean', default: true, required: false, hint: 'Abilita le globali del browser (window, document, …)' },
            { key: 'node', label: 'Node.js', type: 'boolean', default: true, required: false, hint: 'Abilita le globali di Node.js (process, __dirname, …)' },
            { key: 'es2021', label: 'ES2021', type: 'boolean', default: true, required: false, hint: 'Abilita le feature ECMAScript 2021' }
          ]
        },
        {
          label: 'Estensioni',
          key: 'extends',
          fields: [
            { key: 'recommended', label: 'eslint:recommended', type: 'boolean', default: true, required: false, hint: 'Regole raccomandate da ESLint' }
          ]
        },
        {
          label: 'Parser',
          key: 'parserOptions',
          fields: [
            { key: 'ecmaVersion', label: 'Versione ECMA', type: 'select', default: 'latest', required: true, options: ['latest', '2022', '2021', '2020', '2018', '2015', '5'], hint: 'Versione dello standard ECMAScript' },
            { key: 'sourceType', label: 'Tipo sorgente', type: 'select', default: 'module', required: false, options: ['module', 'script'], hint: 'module per import/export, script per require' }
          ]
        },
        {
          label: 'Regole',
          key: 'rules',
          fields: [
            { key: 'semi', label: 'Punto e virgola', type: 'select', default: 'always', required: false, options: ['always', 'never'], hint: 'Richiedi o vieta il punto e virgola' },
            { key: 'quotes', label: 'Apici', type: 'select', default: 'single', required: false, options: ['single', 'double', 'backtick'], hint: 'Tipo di apici per le stringhe' }
          ]
        }
      ]
    }
  },

  {
    id: 'prettierrc',
    name: '.prettierrc',
    description: 'Configura Prettier per la formattazione automatica del codice: larghezza riga, tab, punto e virgola, apici, virgole finali e arrow function.',
    icon: '✦',
    color: '#8B5CF6',
    format: 'json',
    filename: '.prettierrc',
    subpath: '',
    schema: {
      groups: [
        {
          label: 'Larghezza e indentazione',
          key: 'layout',
          fields: [
            { key: 'printWidth', label: 'Larghezza riga', type: 'number', default: 80, required: true, min: 40, max: 200, hint: 'Lunghezza massima di una riga prima del ritorno a capo' },
            { key: 'tabWidth', label: 'Larghezza tab', type: 'number', default: 2, required: true, min: 1, max: 8 },
            { key: 'useTabs', label: 'Usa tab', type: 'boolean', default: false, required: false, hint: 'Usa tab invece degli spazi per l\'indentazione' }
          ]
        },
        {
          label: 'Stile',
          key: 'style',
          fields: [
            { key: 'semi', label: 'Punto e virgola', type: 'boolean', default: true, required: false, hint: 'Aggiungi punto e virgola a fine istruzione' },
            { key: 'singleQuote', label: 'Apici singoli', type: 'boolean', default: true, required: false, hint: 'Usa apici singoli invece di doppi' },
            { key: 'trailingComma', label: 'Virgola finale', type: 'select', default: 'es5', required: false, options: ['none', 'es5', 'all'], hint: 'Dove inserire la virgola finale' },
            { key: 'bracketSpacing', label: 'Spazi parentesi', type: 'boolean', default: true, required: false, hint: 'Spazi tra le parentesi graffe negli oggetti { foo: bar }' },
            { key: 'arrowParens', label: 'Parentesi arrow', type: 'select', default: 'always', required: false, options: ['always', 'avoid'], hint: 'Parentesi attorno al parametro delle arrow function' }
          ]
        }
      ]
    }
  }
];

// Make available globally (loaded before app.js)
if (typeof window !== 'undefined') {
  window.TEMPLATES = TEMPLATES;
}

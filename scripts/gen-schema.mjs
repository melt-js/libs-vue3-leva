#!/usr/bin/env node
/*
|--------------------------------------------------------------------------
|
| 用 vdoc-parser 解析组件 props 的 JSDoc，生成和组件放在一起的 propsSchema.json
|
| 用法：
|   vue3-leva-gen-schema                 读取当前目录的 playground.config.mjs
|   vue3-leva-gen-schema --check         只校验，schema 与源码不一致时退出码 1
|   vue3-leva-gen-schema --config a.mjs --root ../comps-vue2
|
| 约定：
| - 只有带 @description 的注释才会进 description（普通文字会被忽略）
| - index.vue 的 schema 写到同目录 propsSchema.json，单文件组件写 Foo.propsSchema.json
| - Vue 3 组件请用 const props = defineProps({ ... }) 对象形式：
|   defineProps<{...}>() 只能拿到 description，拿不到默认值；withDefaults(defineProps<...>()) 解析不到 props
|
|--------------------------------------------------------------------------
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { parseFileSync } = require('vdoc-parser');
const babelParser = require('@babel/parser');

const SCALAR_TYPES = ['boolean', 'number', 'string'];
const DEFAULT_CONFIG = 'playground.config.mjs';
const COMPONENT_DIR = 'src/components';

const HELP = `
用法: vue3-leva-gen-schema [options]

  --config <file>   配置文件，默认 playground.config.mjs
  --root <dir>      组件源码根目录，默认当前目录
  --check           只校验 schema 是否和源码一致（CI 用），不写文件
  --silence         不打印每个组件的生成结果
  -h, --help        显示帮助

配置文件（ESM）示例：
  export default {
    components: [
      { name: 'CatFace', file: 'src/components/CatFace/index.vue' },
    ],
    hints: { CatFace: { scale: { min: 0, max: 2, step: 0.05 } } },
  }
`;

function parseArgv(argv) {
  const options = {
    check: false,
    silence: false,
    config: DEFAULT_CONFIG,
    root: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--silence') options.silence = true;
    else if (arg === '--config') options.config = argv[(i += 1)];
    else if (arg === '--root') options.root = argv[(i += 1)];
    else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new Error(`[props-schema] 未知参数: ${arg}`);
  }
  return options;
}

function toPosix(file) {
  return file.split(path.sep).join('/');
}

function baseType(type) {
  const parts = String(type || '').split('|').map((part) => part.trim());
  const scalar = SCALAR_TYPES.find((item) => parts.includes(item));
  if (scalar) return scalar;
  // 字符串字面量联合（如 'wheel' | 'fan'）当成 string，面板上用下拉
  if (parts.length > 1 && parts.every((part) => /^(['"]).*\1$/.test(part))) return 'string';
  if (/\[\]$/.test(type)) return 'array';
  if (/^object$/i.test(type) || /^record</i.test(type)) return 'object';
  return '';
}

// 把 'wheel' | 'fan' 拆成 tweakpane 的 options: { wheel: 'wheel', fan: 'fan' }
function literalOptions(type) {
  const parts = String(type || '').split('|').map((part) => part.trim());
  if (parts.length < 2 || !parts.every((part) => /^(['"]).*\1$/.test(part))) return null;
  return parts.reduce((options, part) => {
    const value = part.slice(1, -1);
    options[value] = value;
    return options;
  }, {});
}

// vdoc-parser 的 default 是源码表达式（字符串会带引号），这里转成面板的初始值
function parseString(raw) {
  if (!raw) return '';
  try {
    return JSON.parse(raw);
  } catch (error) {
    const quoted =
      raw.length > 1 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0];
    return quoted ? raw.slice(1, -1) : raw;
  }
}

function defaultValue(type, raw) {
  if (type === 'boolean') return raw === 'true';
  if (type === 'number') {
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }
  if (type === 'string') return parseString(raw);
  return undefined;
}

// index.vue 放同目录的 propsSchema.json；单文件组件放 Foo.propsSchema.json
function schemaRelPath(file) {
  if (/\/index\.vue$/.test(file)) return file.replace(/index\.vue$/, 'propsSchema.json');
  return file.replace(/\.vue$/, '.propsSchema.json');
}

// 沿用已有文件的换行符（Windows 检出是 CRLF），避免只因为 EOL 产生 diff
function eolOf(filePath) {
  if (!fs.existsSync(filePath)) return os.EOL;
  const text = fs.readFileSync(filePath, 'utf8');
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function toSchemaProp(prop, hint) {
  const type = baseType(prop.type);
  const item = {
    name: prop.name,
    type: prop.type || type,
    description: prop.description,
    default: prop.default,
    required: prop.required === 'true',
    version: prop.version,
    isEvent: prop.isEvent,
    bindable: SCALAR_TYPES.includes(type),
  };
  if (item.bindable) item.value = defaultValue(type, prop.default);
  if (hint) {
    item.control = { ...hint };
  } else if (item.bindable) {
    // 字面量联合默认做成下拉，config 里的 hints 可以覆盖
    const options = literalOptions(prop.type);
    if (options) item.control = { options };
  }
  return item;
}

/** 没配 components 时，按 src/components 的约定自动发现 */
function discoverComponents(root) {
  const dir = path.join(root, COMPONENT_DIR);
  if (!fs.existsSync(dir)) return [];
  const components = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const indexFile = path.join(full, 'index.vue');
      if (fs.existsSync(indexFile)) {
        components.push({ name: entry.name, file: toPosix(path.relative(root, indexFile)) });
      }
      return;
    }
    // App.vue 是演示壳，不进面板
    if (entry.isFile() && entry.name.endsWith('.vue') && entry.name !== 'App.vue') {
      components.push({
        name: entry.name.replace(/\.vue$/, ''),
        file: toPosix(path.relative(root, full)),
      });
    }
  });
  return components.sort((a, b) => a.name.localeCompare(b.name));
}

/** 找 props 对象：Vue 2 的 props: {...} 或 Vue 3 的 defineProps({...}) */
function findPropsObject(ast) {
  let found = null;
  (function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (
      node.type === 'ObjectProperty' &&
      node.key &&
      (node.key.name === 'props' || node.key.value === 'props') &&
      node.value &&
      node.value.type === 'ObjectExpression'
    ) {
      found = node.value;
      return;
    }
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'defineProps' &&
      node.arguments[0] &&
      node.arguments[0].type === 'ObjectExpression'
    ) {
      found = node.arguments[0];
      return;
    }
    Object.keys(node).forEach((key) => {
      if (
        key === 'loc' ||
        key === 'start' ||
        key === 'end' ||
        key.startsWith('leading') ||
        key.startsWith('trailing') ||
        key === 'innerComments'
      ) {
        return;
      }
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    });
  })(ast);
  return found;
}

/**
 * 解析组件的 props：优先用源码里的 `/** @description *\/`；
 * 老组件没有 JSDoc 时，把 props 上方的 `// 注释` 或属性名临时补成 @description，
 * 这样 comps-vue2-antd / comps-vue2-ele 这类历史组件也能生成可用的控件。
 */
function parseProps(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const code = scriptMatch ? scriptMatch[1] : source;
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch (error) {
    return parseFileSync(filePath);
  }

  const propsObject = findPropsObject(ast);
  if (!propsObject) return parseFileSync(filePath);

  const lines = code.split('\n');
  const inserts = [];
  propsObject.properties.forEach((prop) => {
    if (prop.type !== 'ObjectProperty' || !prop.key) return;
    const name = prop.key.name || prop.key.value;
    if (!name) return;

    // 上一个 prop 结束到当前 prop 之间已经有 @description 就跳过，保留源码里的描述
    const lastPropEnd = propsObject.properties
      .filter((item) => item.start < prop.start)
      .reduce((max, item) => Math.max(max, item.end), propsObject.start);
    if (code.slice(lastPropEnd, prop.start).includes('@description')) return;

    // 找 prop 上方的连续 // 注释，没有就用属性名兜底
    const lineIndex = prop.loc.start.line - 1;
    const comments = [];
    for (let i = lineIndex - 1; i >= 0; i -= 1) {
      const text = lines[i].trim();
      if (text.startsWith('//')) comments.unshift(text.replace(/^\/\/\s?/, ''));
      else if (!text) continue;
      else break;
    }
    const description = (comments.length ? comments.join(' ') : name).replace(/\*\//g, '* /');
    const indent = (lines[lineIndex].match(/^\s*/) || [''])[0];
    inserts.push({
      index: prop.start,
      text: `/** @description ${description} */\n${indent}`,
    });
  });

  let transformed = code;
  inserts
    .sort((a, b) => b.index - a.index)
    .forEach((insert) => {
      transformed = transformed.slice(0, insert.index) + insert.text + transformed.slice(insert.index);
    });

  // vdoc 的 parseCode 不认 <script setup> 片段，写成临时 SFC 再交给 parseFileSync
  const tempFile = path.join(os.tmpdir(), `leva-schema-${process.pid}-${Date.now()}.vue`);
  let viaVdoc = [];
  try {
    fs.writeFileSync(
      tempFile,
      // 用函数替换，避免源码里的 `$'` / `$&` 被 String.replace 当成替换模式
      scriptMatch ? source.replace(scriptMatch[1], () => transformed) : transformed,
    );
    viaVdoc = parseFileSync(tempFile);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }

  // vdoc 在 defineProps 前面还有别的语句时（例如先声明了几个 const / type）会解析不到 props，
  // 这时退回直接读 babel AST：名字、类型、默认值、必填都能从节点上拿到，
  // @description 也从同一条 JSDoc / 上方 // 注释里取，结果和 vdoc 那条路径一致。
  if (!viaVdoc.length) return parsePropsFromAst(propsObject, code);

  // vdoc 认得 props 但偶尔会漏掉个别默认值（比如数字写了负数 -1），用 AST 的结果补齐，
  // 免得面板拿到 0 / 空值这种错误的初始值。
  const astProps = new Map(parsePropsFromAst(propsObject, code).map((prop) => [prop.name, prop]));

  return viaVdoc.map((prop) => {
    const ast = astProps.get(prop.name);
    if (!ast) return prop;
    const type = prop.type || ast.type;
    const missingDefault = prop.default === '' || prop.default === undefined;
    // 复杂 prop（数组 / 对象 / 函数）没有控件，函数默认值可以原样留作说明；
    // 可绑定 prop 的初始值只认字面量，否则面板会拿到 "undefined" 这种字符串
    const canFillDefault = ast.defaultLiteral || !SCALAR_TYPES.includes(baseType(type));
    return {
      ...prop,
      type,
      description: prop.description || ast.description,
      default: missingDefault && canFillDefault ? ast.default : prop.default,
      required: prop.required === '' || prop.required === undefined ? ast.required : prop.required,
    };
  });
}

const SCALAR_IDENTIFIERS = { String: 'string', Number: 'number', Boolean: 'boolean' };

/** 从 babel AST 的 props 对象直接读出 props 列表（vdoc 解析失败时的兜底） */
function parsePropsFromAst(propsObject, code) {
  const text = (node) => (node && typeof node.start === 'number' ? code.slice(node.start, node.end) : '');

  // 默认值分三种：字面量（含 -1 这种负数）原样记录；undefined / null 视为没有默认值；
  // 其余表达式（函数 / 标识符）对复杂 prop 只是说明性文本。可绑定 prop 的初始值必须是字面量，
  // 否则面板会拿到 "undefined" 这种字符串（Vue 2 老组件里 default: undefined 很常见）
  const defaultInfo = (node) => {
    if (!node) return { default: '', literal: false };
    if (node.type === 'NullLiteral') return { default: '', literal: false };
    if (node.type === 'Identifier' && node.name === 'undefined') return { default: '', literal: false };
    if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') {
      return { default: text(node), literal: true };
    }
    if (
      node.type === 'UnaryExpression' &&
      (node.operator === '-' || node.operator === '+') &&
      node.argument &&
      node.argument.type === 'NumericLiteral'
    ) {
      return { default: text(node), literal: true };
    }
    return { default: text(node), literal: false };
  };

  // `String as PropType<'a' | 'b'>` 取泛型参数；`Array as () => string[]` 取函数类型整体
  const typeOf = (node) => {
    if (!node) return '';
    if (node.type === 'Identifier') return SCALAR_IDENTIFIERS[node.name] || node.name;
    if (node.type === 'TSAsExpression') {
      const annotation = node.typeAnnotation;
      if (annotation && annotation.type === 'TSTypeReference' && annotation.typeParameters) {
        return text(annotation.typeParameters.params?.[0]);
      }
      return text(annotation);
    }
    return text(node);
  };

  const props = [];
  (propsObject.properties || []).forEach((prop) => {
    if (prop.type !== 'ObjectProperty' || !prop.key) return;
    const name = prop.key.name || prop.key.value;
    if (!name) return;

    const config = prop.value && prop.value.type === 'ObjectExpression' ? prop.value : null;
    const entries = config ? config.properties.filter((item) => item.type === 'ObjectProperty') : [];
    const pickEntry = (key) => entries.find((item) => (item.key.name || item.key.value) === key);

    const typeNode = pickEntry('type');
    const defaultNode = pickEntry('default');
    const requiredNode = pickEntry('required');
    const defaultInfoNode = defaultInfo(defaultNode && defaultNode.value);

    // 描述优先取 JSDoc 的 @description，其次取紧挨着的 // 注释，最后用属性名兜底
    const comments = (prop.leadingComments || []).map((comment) => comment.value).join('\n');
    const described = comments.match(/@description\s+([\s\S]*?)(?:\n\s*\*|$)/);
    const description = (described ? described[1] : comments.replace(/[*\n]+/g, ' ')).replace(/\s+/g, ' ').trim();

    props.push({
      name,
      type: typeNode ? typeOf(typeNode.value) : '',
      description: description || name,
      default: defaultInfoNode.default,
      defaultLiteral: defaultInfoNode.literal,
      required: requiredNode && requiredNode.value.type === 'BooleanLiteral' && requiredNode.value.value ? 'true' : 'false',
      version: '',
      isEvent: false,
    });
  });

  return props;
}

async function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`[props-schema] 找不到配置文件: ${configPath}`);
  }
  const mod = await import(pathToFileURL(configPath).href);
  return mod.default || {};
}

function run(options) {
  if (options.help) {
    console.log(HELP.trim());
    return 0;
  }

  const cwd = process.cwd();
  const root = options.root ? path.resolve(cwd, options.root) : cwd;

  return loadConfig(path.resolve(root, options.config)).then((config) => {
    const components =
      Array.isArray(config.components) && config.components.length
        ? config.components
        : discoverComponents(root);
    const hints = config.hints || {};

    if (!components.length) {
      throw new Error(`[props-schema] 没有找到组件，检查 ${COMPONENT_DIR} 或配置里的 components`);
    }

    const stale = [];

    components.forEach(({ name, file }) => {
      if (!name || !file) throw new Error('[props-schema] components 的每一项都需要 name 和 file');

      const fullPath = path.join(root, file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`[props-schema] 组件文件不存在: ${file}`);
      }

      const props = parseProps(fullPath).map((prop) =>
        toSchemaProp(prop, hints[name] && hints[name][prop.name]),
      );

      if (!props.length) {
        console.warn(
          `[props-schema] ${name}: 没有解析到 props，检查 props 上方的 /** @description */ 注释`,
        );
      }
      props.forEach((prop) => {
        if (prop.bindable && !SCALAR_TYPES.includes(typeof prop.value)) {
          throw new Error(`[props-schema] ${name}.${prop.name}: 默认值类型不对（${prop.type}）`);
        }
      });

      const schemaFile = schemaRelPath(file);
      const schemaFullPath = path.join(root, schemaFile);
      const eol = eolOf(schemaFullPath);
      const output = JSON.stringify(props, null, 2).split('\n').join(eol) + eol;

      if (options.check) {
        const current = fs.existsSync(schemaFullPath)
          ? fs.readFileSync(schemaFullPath, 'utf8')
          : '';
        if (current !== output) stale.push(schemaFile);
        return;
      }

      fs.writeFileSync(schemaFullPath, output);
      if (!options.silence) {
        console.log(`[props-schema] ${name}: ${props.length} props -> ${schemaFile}`);
      }
    });

    if (options.check) {
      if (stale.length) {
        console.error(
          `[props-schema] schema 不是最新的: ${stale.join(', ')}，请执行 vue3-leva-gen-schema`,
        );
        return 1;
      }
      console.log(`[props-schema] check passed: ${components.length} components`);
      return 0;
    }

    if (!options.silence) console.log(`[props-schema] done: ${components.length} components`);
    return 0;
  });
}

run(parseArgv(process.argv.slice(2)))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });

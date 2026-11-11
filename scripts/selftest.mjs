/*
 * 只测 schema 的纯函数（不碰 tweakpane / vue），保证 createValues 的形状稳定。
 * 运行：node ./scripts/selftest.mjs 或 pnpm test
 */
import assert from 'node:assert/strict';

import { bindableProps, complexPropNames, createValues, isBindable } from '../src/core/schema.js';

const schema = [
  { name: 'active', type: 'boolean', bindable: true, value: false },
  { name: 'scale', type: 'number', bindable: true, value: 0, control: { min: 0, max: 2 } },
  { name: 'items', type: 'Array', bindable: false },
  { name: 'onChange', type: 'function', bindable: false, isEvent: true },
];

assert.equal(isBindable(schema[0]), true);
assert.equal(isBindable(schema[2]), false);
assert.equal(isBindable(null), false);

assert.deepEqual(createValues(schema), { active: false, scale: 0 });
assert.deepEqual(createValues(undefined), {});
assert.deepEqual(
  bindableProps(schema).map((prop) => prop.name),
  ['active', 'scale'],
);
assert.deepEqual(complexPropNames(schema), ['items']);

console.log('selftest passed');

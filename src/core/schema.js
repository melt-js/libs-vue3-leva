/*
|--------------------------------------------------------------------------
|
| schema 的纯函数工具：与 Vue 版本无关，Vue 2 / Vue 3 组件共用
|
|--------------------------------------------------------------------------
*/

/** 该 prop 是否能在面板上生成控件（boolean / number / string） */
export function isBindable(prop) {
  return Boolean(prop && prop.bindable);
}

/** 按 schema 生成面板的初始值，只包含可绑定（bindable）的 prop */
export function createValues(schema) {
  return (schema || []).reduce((values, prop) => {
    if (isBindable(prop)) values[prop.name] = prop.value;
    return values;
  }, {});
}

/** 没有生成控件的 prop 名（复杂对象 / 数组 / 事件等），面板上给个提示 */
export function complexPropNames(schema) {
  return (schema || [])
    .filter((prop) => !prop.isEvent && !isBindable(prop))
    .map((prop) => prop.name);
}

/** 可生成控件的 prop 列表 */
export function bindableProps(schema) {
  return (schema || []).filter(isBindable);
}

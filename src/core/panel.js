/*
|--------------------------------------------------------------------------
|
| tweakpane 的薄封装：只负责“schema + values -> 控件”，与 Vue 版本无关
|
| 组件侧只关心三件事：把 values 传进来、改完收到通知、卸载时 dispose
|
|--------------------------------------------------------------------------
*/
import { Pane } from 'tweakpane';
import { bindableProps } from './schema';

/**
 * 在 container 里创建属性面板
 *
 * @param {object} options
 * @param {HTMLElement} options.container 面板挂载点
 * @param {string} options.title 面板标题，一般传组件名
 * @param {Array} options.schema 组件的 propsSchema.json 内容
 * @param {object} options.values 面板读写的那份值（必须已经包含全部 bindable 的 key）
 * @param {Function} [options.onChange] 控件改动的回调
 * @param {Function} [options.onReset] 点击「重置为默认值」的回调（重置逻辑由组件做）
 * @returns {import('tweakpane').Pane}
 */
export function createPropsPane(options) {
  const { container, title, schema, values, onChange, onReset } = options;

  const pane = new Pane({
    container,
    title: title || 'props',
  });

  bindableProps(schema).forEach((prop) => {
    // schema 里的 control 原样交给 tweakpane（min / max / step / options ...）
    pane.addBinding(values, prop.name, { ...(prop.control || {}) });
  });

  pane.addButton({ title: '重置为默认值' }).on('click', () => {
    if (onReset) onReset();
  });

  if (onChange) pane.on('change', onChange);

  return pane;
}

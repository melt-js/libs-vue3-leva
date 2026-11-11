<template>
  <div class="props-panel">
    <div ref="paneHost" class="props-panel__pane"></div>
    <p v-if="!propsSchema.length" class="props-panel__hint">
      没有 props schema，请把组件的 propsSchema.json 传给 schema
    </p>
    <p v-if="complexProps.length" class="props-panel__hint">
      复杂类型暂未生成控件：{{ complexProps.join('、') }}
    </p>
  </div>
</template>

<script>
import { createPropsPane } from './core/panel';
import { bindableProps, complexPropNames, createValues } from './core/schema';

/**
 * 通用的 props 属性面板：只认 schema，不关心是哪个组件。
 *
 * 同一份源码同时跑在 Vue 2.7 与 Vue 3 上，靠三处兼容点，不需要 vue-demi：
 * - v-model：Vue 2 是 value + input，Vue 3 是 modelValue + update:modelValue，两个都收、两个都发
 * - 响应式赋值：Vue 2 需要 $set，Vue 3 直接赋值，用 this.$set 是否存在来区分
 * - 卸载钩子：Vue 3 用 beforeUnmount，Vue 2 在 created 里补挂 hook:beforeDestroy
 *
 * schema 里每个 prop 的形状见组件的 propsSchema.json；
 * `control` 字段会原样交给 tweakpane（min / max / step / options 等）。
 */
export default {
  name: 'PropsPanel',
  props: {
    // 面板标题，一般传组件名
    compName: {
      type: String,
      default: '',
    },
    // 组件的 propsSchema.json 内容
    schema: {
      type: Array,
      default: () => [],
    },
    // Vue 2 的 v-model 走 value
    value: {
      type: Object,
      default: undefined,
    },
    // Vue 3 的 v-model 走 modelValue
    modelValue: {
      type: Object,
      default: undefined,
    },
  },
  // 只有 Vue 2 认识；Vue 3 会忽略这个选项
  model: {
    prop: 'value',
    event: 'input',
  },
  data() {
    return {
      values: createValues(this.schema),
    };
  },
  computed: {
    isVue2() {
      return typeof this.$set === 'function';
    },
    propsSchema() {
      return this.schema || [];
    },
    bindableProps() {
      return bindableProps(this.propsSchema);
    },
    complexProps() {
      return complexPropNames(this.propsSchema);
    },
    // 受控用法：Vue 2 传 value，Vue 3 传 modelValue
    controlledValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
  },
  watch: {
    propsSchema() {
      this.reset();
      this.$nextTick(this.buildPane);
    },
    controlledValue: {
      deep: true,
      handler(next) {
        this.syncValues(next);
      },
    },
  },
  created() {
    // tweakpane 实例和非响应式的同步标记，不放进 data
    this.pane = null;
    this.syncing = false;
    if (this.isVue2) this.$once('hook:beforeDestroy', () => this.disposePane());
  },
  mounted() {
    // 受控用法下，先采用宿主传进来的初始值
    this.syncValues(this.controlledValue);
    this.buildPane();
    // 让宿主的 v-bind 和面板从同一份初始值开始
    this.emitChange();
  },
  beforeUnmount() {
    // Vue 3；Vue 2 下是未知选项，会被忽略
    this.disposePane();
  },
  methods: {
    setValue(key, value) {
      if (this.isVue2) this.$set(this.values, key, value);
      else this.values[key] = value;
    },
    buildPane() {
      this.disposePane();
      if (!this.$refs.paneHost) return;

      this.pane = createPropsPane({
        container: this.$refs.paneHost,
        title: this.compName,
        schema: this.propsSchema,
        values: this.values,
        onChange: () => {
          if (this.syncing) return;
          this.emitChange();
        },
        onReset: () => this.reset(),
      });
    },
    disposePane() {
      if (this.pane) {
        this.pane.dispose();
        this.pane = null;
      }
    },
    refreshPane() {
      if (!this.pane) return;
      this.syncing = true;
      this.pane.refresh();
      this.syncing = false;
    },
    syncValues(next) {
      if (!next) return;
      Object.keys(next).forEach((key) => {
        if (this.values[key] !== next[key]) this.setValue(key, next[key]);
      });
      this.refreshPane();
    },
    reset() {
      const defaults = createValues(this.propsSchema);
      Object.keys(defaults).forEach((key) => {
        this.setValue(key, defaults[key]);
      });
      this.refreshPane();
      this.emitChange();
    },
    // Vue 2 的 v-model 事件是 input，Vue 3 是 update:modelValue，两个都发，各自的父组件认识各自的
    emitChange() {
      const payload = { ...this.values };
      this.$emit('input', payload);
      this.$emit('update:modelValue', payload);
    },
  },
};
</script>

<style scoped>
.props-panel {
  width: 100%;
  min-width: 0;
}

.props-panel__pane {
  width: 100%;
}

.props-panel__hint {
  margin: 8px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}
</style>

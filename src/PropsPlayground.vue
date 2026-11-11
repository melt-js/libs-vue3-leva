<template>
  <div class="props-playground">
    <template v-if="names.length">
      <div class="props-playground__bar">
        <div class="props-playground__tabs">
          <button
            v-for="name in names"
            :key="name"
            type="button"
            class="props-playground__tab"
            :class="{ 'is-active': name === selected }"
            @click="select(name)"
          >
            {{ name }}
          </button>
        </div>
        <button type="button" class="props-playground__action" @click="remount">
          重新挂载
        </button>
      </div>

      <div class="props-playground__body">
        <div
          class="props-playground__stage"
          :class="stageClasses[selected]"
          :style="stageStyles[selected]"
        >
          <component
            :is="activeComp"
            v-if="activeComp"
            :key="selected + '-' + mountKey"
            v-bind="activeProps"
            v-on="activeListeners"
          >
            <template v-if="activeSlotHtml.default">
              <span v-if="slotIsHtml('default')" v-html="activeSlotHtml.default" />
              <template v-else>{{ activeSlotHtml.default }}</template>
            </template>
            <template v-if="activeSlotHtml.title" #title>
              <span v-html="activeSlotHtml.title" />
            </template>
            <template v-if="activeSlotHtml.action" #action>
              <span v-html="activeSlotHtml.action" />
            </template>
            <template v-if="activeSlotHtml.footer" #footer>
              <span v-html="activeSlotHtml.footer" />
            </template>
            <template v-if="activeSlotHtml.filters" #filters>
              <span v-html="activeSlotHtml.filters" />
            </template>
            <template v-if="activeSlotHtml.actions" #actions>
              <span v-html="activeSlotHtml.actions" />
            </template>
            <template v-if="activeSlotHtml.start" #start>
              <span v-html="activeSlotHtml.start" />
            </template>
            <template v-if="activeSlotHtml.end" #end>
              <span v-html="activeSlotHtml.end" />
            </template>
            <template v-if="activeSlotHtml.tool" #tool>
              <span v-html="activeSlotHtml.tool" />
            </template>
            <template v-if="activeSlotHtml.rightTool" #rightTool>
              <span v-html="activeSlotHtml.rightTool" />
            </template>
          </component>
          <p v-else class="props-playground__empty">组件 {{ selected }} 未导出</p>
        </div>

        <props-panel
          :key="selected"
          class="props-playground__panel"
          :comp-name="selected"
          :schema="propSchema"
          v-model="values"
        />
      </div>
    </template>

    <p v-else class="props-playground__empty">
      PropsPlayground 需要 components（组件映射）和 schemas（propsSchema 映射）两个 props
    </p>
  </div>
</template>

<script>
import { createValues } from './core/schema';
import PropsPanel from './PropsPanel.vue';

/**
 * 通用的组件属性实验台：组件、schema 都由宿主通过 props 传入。
 * 不 import 任何具体组件，也不认识 comps 的 schema 目录。
 *
 * 只用了 data / computed / watch / methods 这些两个版本语义一致的能力，
 * 里面的 v-model 由各自的模板编译器生成（Vue 2 -> value/input，Vue 3 -> modelValue/update:modelValue），
 * PropsPanel 两种都支持，所以同一份源码在 Vue 2.7 和 Vue 3 下都能用。
 */
export default {
  name: 'PropsPlayground',
  components: {
    PropsPanel,
  },
  props: {
    // { CatFace: CatFaceComponent, ... }
    components: {
      type: Object,
      default: () => ({}),
    },
    // { CatFace: propsSchemaArray, ... }
    schemas: {
      type: Object,
      default: () => ({}),
    },
    // 可选：{ WhaleFollow: 'is-dark' }，按组件名给预览舞台加 class
    stageClasses: {
      type: Object,
      default: () => ({}),
    },
    // 可选：{ CatFace: { active: true } }，面板不生成控件的 props（数组 / 对象 / 插槽配套数据）走这里
    presets: {
      type: Object,
      default: () => ({}),
    },
    // 可选：{ CircularMenu: { select: (item) => ... } }，组件事件的监听函数
    listeners: {
      type: Object,
      default: () => ({}),
    },
    // 可选：{ CatFace: { height: '480px', background: '#f6f7a7' } }，预览舞台的内联样式
    stageStyles: {
      type: Object,
      default: () => ({}),
    },
    // 可选：{ TcBlock: { title: '标题', rightTool: '<a>详情</a>' } }，插槽用 HTML 字符串填充
    slotHtml: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      selected: '',
      values: {},
      // 一些 props 只在 mounted 时生效，改完可以手动重新挂载
      mountKey: 0,
    };
  },
  computed: {
    names() {
      return Object.keys(this.schemas).filter((name) => this.components[name]);
    },
    propSchema() {
      return this.schemas[this.selected];
    },
    activeComp() {
      return this.components[this.selected];
    },
    // 面板值覆盖 presets：复杂 props 用 presets 固定，其余交给面板
    activeProps() {
      return { ...(this.presets[this.selected] || {}), ...this.values };
    },
    activeListeners() {
      return this.listeners[this.selected] || {};
    },
    activeSlotHtml() {
      return this.slotHtml[this.selected] || {};
    },
  },
  watch: {
    names: {
      immediate: true,
      handler(next) {
        if (!next.includes(this.selected)) this.select(next[0] || '');
      },
    },
  },
  methods: {
    select(name) {
      if (name === this.selected) return;
      this.selected = name;
      // presets 既承载复杂 props，也可以覆盖面板的初始值（例如 demo 里想默认展示的文案）
      this.values = { ...createValues(this.schemas[name]), ...(this.presets[name] || {}) };
    },
    // 纯文本直接当文本节点传给组件（如 TcClamp 只认 text node），带标签的才走 v-html
    slotIsHtml(name) {
      const value = this.activeSlotHtml[name];
      return typeof value === 'string' && /<[a-z][\s\S]*>/i.test(value);
    },
    remount() {
      this.mountKey += 1;
    },
  },
};
</script>

<style scoped>
.props-playground {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.props-playground__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.props-playground__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.props-playground__tab,
.props-playground__action {
  padding: 6px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 999px;
  background: #fff;
  color: #344054;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s, border-color 0.2s;
}

.props-playground__tab:hover,
.props-playground__action:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.props-playground__tab.is-active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.props-playground__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.props-playground__stage {
  height: 640px;
  overflow: auto;
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  background: #fff;
}

.props-playground__stage.is-dark {
  background: #0b1220;
}

.props-playground__panel {
  position: sticky;
  top: 16px;
}

.props-playground__empty {
  margin: 0;
  padding: 24px;
  color: #667085;
  font-size: 13px;
}

@media (max-width: 900px) {
  .props-playground__body {
    grid-template-columns: 1fr;
  }

  .props-playground__stage {
    height: 480px;
  }

  .props-playground__panel {
    position: static;
  }
}
</style>

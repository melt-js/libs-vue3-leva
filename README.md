# @melt-js/libs-vue3-leva

Vue 3 的属性面板（leva 风格）：`PropsPlayground` + `PropsPanel` + schema 生成 CLI，同时是一个 hel 远程包。

- **自包含**：面板组件、schema 生成脚本都在本包内，和 `libs-vue2-leva` 各自独立维护（两边实现已分叉，改动互不影响）
- **不认任何具体组件**：组件映射和 schema 都由宿主传进来
- **schema 由脚本从源码注释生成**：`vdoc-parser` 解析 props 上方的 JSDoc（`@description`），输出到组件目录旁边
- Vue 2 / Vue 3 的差异只有三处兼容点：`value`/`input` 与 `modelValue`/`update:modelValue` 双写、`$set` 判空、`beforeDestroy` / `beforeUnmount` 各挂一次

## 远程使用

```bash
pnpm libs-vue3-leva:dev    # 10040，直接打开是本包调试页
pnpm libs-vue3-leva:build  # 发布用产物，资源地址指向 unpkg
```

```ts
import { preFetchLib } from 'hel-micro'
await preFetchLib('libs-vue3-leva', { custom: { host: 'http://localhost:10040', skipFetchHelMeta: true } })

// 路由懒加载的页面里（此时已预加载完成）取组件
const { PropsPlayground } = await import('@melt-js/libs-vue3-leva')
```

```vue
<props-playground
  :components="components"
  :schemas="schemas"
  :presets="presets"
  :listeners="listeners"
  :stage-classes="stageClasses"
  :stage-styles="stageStyles"
  :slot-html="slotHtml"
/>
```

- `components`：`{ 组件名: 组件 }`
- `schemas`：`{ 组件名: propsSchema.json 的内容 }`
- `presets`：可选，`{ 组件名: { items: [...] } }`，面板不生成控件的复杂 props / 插槽配套数据；同时会作为面板的初始值
- `listeners`：可选，`{ 组件名: { select: (item) => ... } }`，透传给组件的 `v-on`
- `stageClasses` / `stageStyles`：可选，`{ 组件名: 'is-dark' }` / `{ 组件名: { height: '480px' } }`
- `slotHtml`：可选，`{ 组件名: { default: '<p>内容</p>', title: '标题' } }`，支持 `default` / `title` / `action` / `footer` / `filters` / `actions` / `start` / `end` / `tool` / `rightTool`

`PropsPanel` 也可以单独用：`:schema` + `v-model`。

## schema 生成

组件包（如 `comps-vue3`）用 `workspace:*` 引本包，把 `gen:schema` 指向 CLI：

```json
{
  "dependencies": { "@melt-js/libs-vue3-leva": "workspace:*" },
  "bin": "vue3-leva-gen-schema",
  "scripts": { "gen:schema": "vue3-leva-gen-schema" }
}
```

组件包根目录放 `playground.config.mjs`：

```js
export default {
  components: [{ name: 'CircularMenu', file: 'src/components/CircularMenu.vue' }],
  hints: { CircularMenu: { openText: { options: { a: 'a', b: 'b' } } } },
}
```

```bash
vue3-leva-gen-schema          # 生成 / 更新 propsSchema.json
vue3-leva-gen-schema --check  # CI：schema 与源码不一致时退出码 1
```

约定：

- 优先用带 `@description` 的 JSDoc；没有 JSDoc 时，生成器会把 props 上方的 `// 注释`（没有注释时用属性名）补成 `@description`，方便老组件直接接入
- `index.vue` 写到同目录 `propsSchema.json`，单文件组件写 `Foo.propsSchema.json`
- 字符串字面量联合（`'a' | 'b'`）会生成下拉 `options`
- Vue 3 的 props 请用对象形式 `defineProps({ ... })`（`withDefaults(defineProps<...>())` 解析不到 props，类型用 `PropType<T>` 保留）

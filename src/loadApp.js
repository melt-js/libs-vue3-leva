import { createApp, h } from 'vue'
import { PropsPlayground } from './index.js'

/**
 * 本地调试页：用一个玩具组件演示面板，真正接入宿主的方式见各 demo。
 */
const Toy = {
  props: {
    label: { type: String, default: 'hello' },
    size: { type: Number, default: 16 },
  },
  render() {
    return h('div', { style: { padding: '24px', fontSize: `${this.size}px` } }, this.label)
  },
}

const SCHEMA = [
  {
    name: 'label',
    type: 'string',
    description: '文案',
    default: '"hello"',
    required: false,
    version: '',
    isEvent: false,
    bindable: true,
    value: 'hello',
  },
  {
    name: 'size',
    type: 'number',
    description: '字号',
    default: '16',
    required: false,
    version: '',
    isEvent: false,
    bindable: true,
    value: 16,
    control: { min: 12, max: 48, step: 1 },
  },
]

createApp({
  render: () =>
    h(PropsPlayground, {
      components: { Toy },
      schemas: { Toy: SCHEMA },
    }),
}).mount('#app')

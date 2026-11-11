import { isMasterApp } from 'hel-iso'
import { libReady } from 'hel-lib-proxy'
import { LIB_NAME } from './configs/subApp'

;(async function () {
  const libProperties = await import('./entrance/libProperties')
  // 注意此处传递的是 default
  libReady(LIB_NAME, libProperties.default)

  // 非子应用时自己挂载渲染节点，方便本地调试
  if (isMasterApp()) {
    await import('./loadApp')
  }
})().catch(console.error)

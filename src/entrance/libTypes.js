/*
|--------------------------------------------------------------------------
|
| 组件类型导出文件，同时也作为 rollup 的打包入口：打包后是一个仅包含 hel-lib-proxy
| 的空壳文件，真正的组件在运行时由 hel 通过 hel_dist 载入
|
|--------------------------------------------------------------------------
*/
import { exposeLib } from 'hel-lib-proxy'
import { LIB_NAME } from '../configs/subApp'

export const dtlib = exposeLib(LIB_NAME)

export default dtlib

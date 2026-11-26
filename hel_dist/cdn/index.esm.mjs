import { exposeLib } from 'hel-lib-proxy';

const LIB_NAME = 'libs-vue3-leva';

/*
|--------------------------------------------------------------------------
|
| 组件类型导出文件，同时也作为 rollup 的打包入口：打包后是一个仅包含 hel-lib-proxy
| 的空壳文件，真正的组件在运行时由 hel 通过 hel_dist 载入
|
|--------------------------------------------------------------------------
*/

const dtlib = exposeLib(LIB_NAME);

const DownloadExampleButton = dtlib.DownloadExampleButton;

const ScreenfullButton = dtlib.ScreenfullButton;
const DemoToolbar = dtlib.DemoToolbar;
const ComponentDocs = dtlib.ComponentDocs;

const PropsPanel = dtlib.PropsPanel;
const PropsPlayground = dtlib.PropsPlayground;

const CodePlayground = dtlib.CodePlayground;
const CodePlaygroundDialog = dtlib.CodePlaygroundDialog;
const CodePlaygroundEditor = dtlib.CodePlaygroundEditor;
const CodePlaygroundRunner = dtlib.CodePlaygroundRunner;

const SplitPane = dtlib.SplitPane;
const DemoTabs = dtlib.DemoTabs;

export { CodePlayground, CodePlaygroundDialog, CodePlaygroundEditor, CodePlaygroundRunner, ComponentDocs, DemoTabs, DemoToolbar, DownloadExampleButton, PropsPanel, PropsPlayground, ScreenfullButton, SplitPane, dtlib as default, dtlib };

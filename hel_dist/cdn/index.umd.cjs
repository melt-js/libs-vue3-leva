(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('hel-lib-proxy')) :
	typeof define === 'function' && define.amd ? define(['exports', 'hel-lib-proxy'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["libs-vue3-leva"] = {}, global.HelLibProxy));
})(this, (function (exports, helLibProxy) { 'use strict';

	const LIB_NAME = 'libs-vue3-leva';

	/*
	|--------------------------------------------------------------------------
	|
	| 组件类型导出文件，同时也作为 rollup 的打包入口：打包后是一个仅包含 hel-lib-proxy
	| 的空壳文件，真正的组件在运行时由 hel 通过 hel_dist 载入
	|
	|--------------------------------------------------------------------------
	*/

	const dtlib = helLibProxy.exposeLib(LIB_NAME);

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
	const DemoStage = dtlib.DemoStage;

	exports.CodePlayground = CodePlayground;
	exports.CodePlaygroundDialog = CodePlaygroundDialog;
	exports.CodePlaygroundEditor = CodePlaygroundEditor;
	exports.CodePlaygroundRunner = CodePlaygroundRunner;
	exports.ComponentDocs = ComponentDocs;
	exports.DemoStage = DemoStage;
	exports.DemoTabs = DemoTabs;
	exports.DemoToolbar = DemoToolbar;
	exports.DownloadExampleButton = DownloadExampleButton;
	exports.PropsPanel = PropsPanel;
	exports.PropsPlayground = PropsPlayground;
	exports.ScreenfullButton = ScreenfullButton;
	exports.SplitPane = SplitPane;
	exports.default = dtlib;
	exports.dtlib = dtlib;

	Object.defineProperty(exports, '__esModule', { value: true });

}));

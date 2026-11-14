(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('hel-lib-proxy')) :
	typeof define === 'function' && define.amd ? define(['exports', 'hel-lib-proxy'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["libs-vue3-leva"] = {}, global.helLibProxy));
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

	exports.ComponentDocs = ComponentDocs;
	exports.DemoToolbar = DemoToolbar;
	exports.DownloadExampleButton = DownloadExampleButton;
	exports.ScreenfullButton = ScreenfullButton;
	exports.default = dtlib;
	exports.dtlib = dtlib;

	Object.defineProperty(exports, '__esModule', { value: true });

}));

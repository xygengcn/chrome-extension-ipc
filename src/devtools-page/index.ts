/* eslint-disable no-undef */

console.log('[devtools-page] 开始创建devtools面板');

// chrome.devtools.network.onRequestFinished.addListener(function (request) {
//   console.log(
//     '[devtools-page] chrome.devtools.network.onRequestFinished',
//     request
//   );
// });

// @ts-ignore
chrome.devtools.panels.create('工具库', '', '/panel.html');

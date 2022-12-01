import { ITransferMessage } from '../typings';

/**
 * 创建content-script 脚本，用来沟通preload和发送消息到service-worker，中间数据传输层
 * @param preloadUrl
 */
export function createContentScript(option: { preloadUrl: string; noconsole?: boolean }) {
  // 日志
  const noconsole = option && option.noconsole;
  // 这是页面注入脚本
  !noconsole && console.log('[devtools-content-script] 开始注入脚本', option);

  // log
  !noconsole && console.log('[devtools-content-script] 开始监听数据传输');

  // 数据传输
  window.addEventListener('message', (content: { data: ITransferMessage; type: string }) => {
    const message = content.data;
    if (content.type === 'message' && message.route === 'content-script' && window.chrome.runtime) {
      // 数据重组
      const transferMessage: ITransferMessage = {
        ...message,
        route: 'service-worker',
        track: [...message.track, 'content-script']
      };
      // log
      !noconsole && console.log('[devtools-content-script] 数据传输到service-worker', transferMessage);
      window.chrome.runtime.sendMessage(transferMessage);
    }
  });

  // 在页面上插入preload脚本
  if (option.preloadUrl && typeof option.preloadUrl === 'string') {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', window.chrome.runtime.getURL(option.preloadUrl));
    document.documentElement.appendChild(script);
    script.addEventListener('load', () => {
      !noconsole && console.log('[devtools-content-script] 加载完preload', option.preloadUrl);
    });
    script.addEventListener('error', (e) => {
      !noconsole && console.log('[devtools-content-script] 加载preload失败', option.preloadUrl, e);
    });
  }
}

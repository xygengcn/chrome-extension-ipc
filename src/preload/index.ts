import { ITransferMessage } from './../typings/index.d';

/**
 * 把数据交给content
 * @param content
 */
function utilSendMessageToContentScript(content: Partial<ITransferMessage<{ result: any; error: any }>>) {
  window.postMessage({
    requestId: '',
    ...content,
    route: 'content-script',
    source: 'app',
    target: 'panel',
    track: ['preload']
  } as ITransferMessage);
}

/**
 * 自定义处理类
 */

export class PreloadHandle {
  // 动作集合
  private actionMap: Map<string, Function> = new Map<string, Function>();

  // 配置
  private option: { noconsole?: boolean } = {};

  constructor(option: { noconsole?: boolean }) {
    this.option = option || {};
  }

  /**
   * 获取函数
   * @param action
   * @returns
   */
  public get(action: string) {
    return this.actionMap.get(action);
  }

  /**
   * 主动触发数据到content-scirpt
   * @param action 动作
   * @param result
   */
  public invoke(action: string, result?: any, error?: Error): void {
    !this.option.noconsole && console.log('[devtools-preload] invoke主动触发', action, result);
    utilSendMessageToContentScript({
      action,
      data: {
        result: result || undefined,
        error: error || null
      }
    });
  }

  /**
   * 记录函数
   * @param action
   * @param fn
   */
  public use<T extends any[] = any[]>(action: string, fn: (...args: T) => any): void {
    !this.option.noconsole && console.log('[devtools-preload] 注册函数接口', action, typeof fn);
    if (action && typeof fn === 'function') {
      this.actionMap.set(action, fn);
    }
  }
}

/**
 * 创建注入脚本
 */
export function createPreloadHandle(option: { noconsole?: boolean }): PreloadHandle {
  // 日志
  const noconsole = option && option.noconsole;

  !noconsole && console.log('[devtools-preload] createPreloadHandle', option);
  // 记录动作
  const handle = new PreloadHandle(option);

  !noconsole && console.log('[devtools-preload] 注册__devtoolsPreloadHandle__');
  // @ts-ignore
  window.__devtoolsPreloadHandle__ = async (content: ITransferMessage) => {
    if (content.target === 'app' && content.action) {
      // 获取执行函数
      const action = handle.get(content.action);

      // log
      !noconsole && console.log('[devtools-preload] 收到来自panel的action', content, action, handle);

      // 结果
      let result = null;

      // 错误
      let error = null;

      // 执行函数
      if (action) {
        try {
          result = await action(content.data || {});
        } catch (error) {
          error = error;
        }
      }

      // 拿到结果返回给panel面板
      const response = {
        ...content,
        data: {
          result,
          error
        }
      };
      !noconsole && console.log('[devtools-preload] 处理完毕函数，回调到content-script', action, response);
      utilSendMessageToContentScript(response);
    }
  };

  return handle;
}

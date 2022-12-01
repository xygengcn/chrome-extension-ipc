import { ITransfer, ITransferMessage } from '../typings';
import { EventBus } from './event-bus';
import { randomString } from './string';

interface IPanelEventBus {
  // 插件已连接
  connect: (data: ITransferMessage, error: Error) => void;
}

export class PanelHandle {
  // 协议总线
  private panelEventBus = new EventBus<IPanelEventBus>();

  /**
   * 与service-worker通信句柄
   */
  private connectServiceWorkPort: any = null;

  /**
   * 加个请求定时器，移除没有反应的请求
   */
  private panelHandleTimeout = new Map<string, number>();

  // 配置
  private option: { noconsole?: boolean } = {};

  // 初始化
  constructor(option: { noconsole?: boolean }) {
    this.option = option || {};
    if (window.chrome.runtime) {
      this.connectServiceWork();
    }
  }

  /**
   * 建立链接
   */
  private connectServiceWork() {
    // 建立链接
    !this.option.noconsole && console.log('[devtools-panel] 创建连接');

    // 与后台页面消息通信-长连接
    this.connectServiceWorkPort = window.chrome.runtime?.connect({
      name: 'devtools'
    });

    // 开始握手
    const connetMessage: ITransferMessage = {
      action: 'panel:connect',
      source: 'panel',
      route: 'service-worker',
      track: ['panel'],
      target: 'service-worker',
      requestId: '',
      data: {
        tabId: window.chrome.devtools.inspectedWindow.tabId || -1
      }
    };
    // 建立链接
    !this.option?.noconsole && console.log('[devtools-panel] 开始握手', connetMessage);
    this.connectServiceWorkPort?.postMessage(connetMessage);

    // 监听service-worker 数据来
    this.connectServiceWorkPort?.onMessage.addListener((transfer: ITransfer) => {
      !this.option.noconsole && console.log('[devtools-panel] connectServiceWork 收到数据', transfer);
      if (transfer.message?.target === 'panel' && transfer.message?.action) {
        // 匹配隐藏指令
        if (transfer.message.action.match(/^panel:.*/)) {
          // 触发隐藏指令
          this.panelHandleHideMessage(transfer);
        } else {
          // 触发客户端动作
          this.panelHandleCustomMessage(transfer);
        }
      }
    });
  }

  /**
   * 处理隐藏指令
   * @param transfer
   */
  private panelHandleHideMessage(transfer: ITransfer<{ result: any; error: any }>) {
    !this.option.noconsole && console.log(`[devtools-panel] 隐藏指令 收到来自${transfer.message.source}的数据`, transfer);
    switch (transfer.message.action) {
      // 处理连接
      case 'panel:connect': {
        this.panelEventBus.emit('connect', transfer.message.data.result, transfer.message.data.error);
        break;
      }
      default:
        break;
    }
  }

  /**
   * 监听来自数据传输
   * @param transfer
   */
  private panelHandleCustomMessage(transfer: ITransfer<{ result: any; error: any }>) {
    // 判断目标

    !this.option.noconsole && console.log(`[devtools-panel] 客户端动作 收到来自${transfer.message.source}的数据`, transfer);

    // 是不是单次请求
    if (transfer.message.requestId) {
      this.panelEventBus.emit(transfer.message.requestId as any, transfer.message.data?.result, transfer.message.data?.error);
      return;
    }

    // 广播
    if (transfer.message.action) {
      this.panelEventBus.emit(transfer.message.action as any, transfer.message.data?.result, transfer.message.data?.error);
    }
  }

  /**
   * 主动向页面要数据
   * @param action
   * @param data
   */
  public invoke<T extends any = any>(action: string, data: Record<string, any> = {}, callback?: (arg: T, error: Error) => void) {
    // 新建requestId
    const requestId = action + '-' + new Date().getTime() + '-' + randomString(10);

    // 组装数据
    const transferMessage: ITransferMessage = {
      action,
      requestId,
      source: 'panel',
      route: 'preload',
      target: 'app',
      track: ['panel'],
      data: data || {}
    };

    // log
    !this.option.noconsole && console.log('[devtools-panel] 发送到preload的数据', transferMessage);

    // 发送消息到preload
    window.chrome?.devtools?.inspectedWindow.eval(`__devtoolsPreloadHandle__(${JSON.stringify(transferMessage)})`);

    // 存在回调
    if (callback && typeof callback === 'function' && window.chrome?.devtools && window.chrome?.runtime) {
      // 建立五秒回调限制
      const eventTimeout = window.setTimeout(() => {
        // 存在计时器要清理掉
        if (this.panelHandleTimeout.has(requestId)) {
          window.clearTimeout(this.panelHandleTimeout.get(requestId));
          this.panelHandleTimeout.delete(requestId);
        }
        !this.option.noconsole && console.log('[devtools-panel] invoke 请求超时', transferMessage);

        // 回调错误
        callback(null as T, new Error('Timeout'));
        this.panelEventBus.off(requestId as any);
      }, 5000);

      // 保存单次请求计时器
      this.panelHandleTimeout.set(requestId, eventTimeout);

      // 单次监听
      this.panelEventBus.once(requestId as any, (result, error) => {
        // 清理计时器
        if (this.panelHandleTimeout.has(requestId)) {
          window.clearTimeout(this.panelHandleTimeout.get(requestId));
          this.panelHandleTimeout.delete(requestId);
        }
        callback(result, error);
      });
    }
  }

  /**
   * 等待页面主动传输数据
   * @param action
   * @param callback
   */
  public handle<T extends string = keyof IPanelEventBus>(action: T, callback: T extends keyof IPanelEventBus ? IPanelEventBus[T] : (transferMessage: ITransferMessage, error: Error) => void) {
    this.panelEventBus.on(action as keyof IPanelEventBus, callback);
  }

  /**
   * 解绑
   * @param action
   * @param callback
   */
  public off<T extends string = keyof IPanelEventBus>(action: T, callback: T extends keyof IPanelEventBus ? IPanelEventBus[T] : (transferMessage: ITransferMessage, error: Error) => void) {
    this.panelEventBus.off(action as keyof IPanelEventBus, callback);
  }
}

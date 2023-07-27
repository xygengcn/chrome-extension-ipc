import { ITransfer, ITransferMessage } from '../typings';

/**
 * 创建service通信，作为中间数据传输层
 */
export function createServiceWorker(option: { noconsole?: boolean; onContentScript?: (message: ITransferMessage, connect: chrome.runtime.Port, sender: chrome.runtime.MessageSender) => void; onPanel?: (message: any, port: chrome.runtime.Port) => void }) {
  // 日志
  const noconsole = option && option.noconsole;

  !noconsole && console.log('[devtools-service-worker] 启动', option);

  // 作为content script 与 devtool 通信的桥保存者
  const connections = new Map<string, chrome.runtime.Port>();

  /**
   * 收到来自panel面板的数据
   */
  chrome.runtime.onConnect.addListener(function (connectPort: chrome.runtime.Port) {
    // log
    !noconsole && console.log('[devtools-service-worker] 开始连接插件', connectPort);

    // 创建事件监听
    const extensionListener = (message: ITransferMessage<{ tabId: string }, 'panel:connect'>, port: chrome.runtime.Port) => {
      !noconsole && console.log(`[devtools-service-worker] extensionListener 收到来自${message.source}的数据`, message, port);

      switch (message.action) {
        // 自带方法
        case 'panel:connect': {
          // 与插件握手连接
          !noconsole && console.log('[devtools-service-worker] 握手回调', message.data.tabId);
          // 保存当前页面的通信
          connections.set(message.data.tabId, port);
          // 握手成功
          port.postMessage({
            sender: port.sender,
            message: {
              action: 'panel:connect',
              source: 'service-worker',
              target: 'panel',
              route: 'panel',
              track: ['service-worker'],
              data: {
                result: {
                  tabId: message.data.tabId
                }
              },
              requestId: ''
            }
          });
        }
      }
    };

    // 监听数据来
    connectPort.onMessage.addListener(extensionListener);

    // 插件断开
    connectPort.onDisconnect.addListener(function (port: chrome.runtime.Port) {
      !noconsole && console.log('[devtools-service-worker] 插件断开', port);
      // 移除监听
      connectPort.onMessage.removeListener(extensionListener);
      // 移除通信句柄
      // @ts-ignore
      port.sender?.tab?.id && connections.delete(port.sender?.tab?.id);
    });
  });

  /**
   * 接收content-script的消息
   */
  chrome.runtime.onMessage.addListener((message: ITransferMessage, sender: chrome.runtime.MessageSender) => {
    // 收到来自content-script传过来的数据
    !noconsole && console.log('[devtools-service-worker]  收到来自content-script的数据', message, sender);

    // @ts-ignore
    const connection = connections.get(sender.tab?.id);

    connection && option.onContentScript?.(message, connection, sender);

    // 确定数据是发给service-worker自己的，修改数据，再发送给
    if (message.route === 'service-worker') {
      // 获取通信句柄

      // 传到panel面板页面
      const transfer: ITransfer = {
        message: {
          ...message,
          route: 'panel',
          track: [...(message?.track || []), 'service-worker']
        },
        sender
      };

      !noconsole && console.log('[devtools-service-worker]  传送到插件panel', connection, message, sender, transfer);

      // 发送数据到插件
      connection?.postMessage(transfer);
    }
  });
}

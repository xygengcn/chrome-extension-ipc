import { ITransfer, ITransferMessage, ITransferPort } from '../typings';

/**
 * 创建service通信，作为中间数据传输层
 */
export function createServiceWorker(option: { noconsole?: boolean }) {
  // 日志
  const noconsole = option && option.noconsole;

  !noconsole && console.log('[devtools-service-worker] 启动', option);

  // 作为content script 与 devtool 通信的桥保存者
  const connections = new Map();

  /**
   * 收到来自panel面板的数据
   */
  // @ts-ignore
  chrome.runtime.onConnect.addListener(function (connectPort: ITransferPort) {
    // log
    !noconsole && console.log('[devtools-service-worker] 开始连接插件', connectPort);

    // 创建事件监听
    const extensionListener = (message: ITransferMessage<{ tabId: string }, 'panel:connect'>, port: ITransferPort) => {
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
    connectPort.onDisconnect.addListener(function (port: ITransferPort) {
      !noconsole && console.log('[devtools-service-worker] 插件断开', port);
      // 移除监听
      connectPort.onMessage.removeListener(extensionListener);
      // 移除通信句柄
      connections.delete(port.sender?.tab?.id);
    });
  });

  /**
   * 接收content-script的消息
   */
  // @ts-ignore
  chrome.runtime.onMessage.addListener((message: ITransferMessage, sender: ITransferPortSender, sendResponse: Function) => {
    // 收到来自content-script传过来的数据
    !noconsole && console.log('[devtools-service-worker]  收到来自content-script的数据', message, sender);

    // 确定数据是发给service-worker自己的，修改数据，再发送给
    if (message.route === 'service-worker') {
      // 获取通信句柄
      const connection = connections.get(sender.tab.id);

      // 传到panel面板页面
      const tranfer: ITransfer = {
        message: {
          ...message,
          route: 'panel',
          track: [...(message?.track || []), 'service-worker']
        },
        sender
      };

      !noconsole && console.log('[devtools-service-worker]  传送到插件panel', connection, message, sender, tranfer);

      // 发送数据到插件
      connection?.postMessage(tranfer);
    }
  });
}

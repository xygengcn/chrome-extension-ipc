/**
 * 数据传输格式
 */
export interface ITransferMessage<T = any, K extends string = string> {
  action: K;
  data: T;
  requestId: string;
  source: 'app' | 'panel' | 'service-worker'; // 源头
  track: Array<'preload' | 'content-script' | 'service-worker', 'panel'>; // 路由轨道
  route: 'preload' | 'content-script' | 'service-worker' | 'panel'; // 下一站
  target: 'app' | 'panel' | 'service-worker'; // 最终目标
}

/**
 * 传输者
 */
export interface ITransfer<T = any> {
  message: ITransferMessage<T>;
  sender: ITransferPortSender;
}

/**
 * 页面句柄
 */
export interface ITransferPort {
  id: string;
  sender: ITransferPortSender;
  postMessage: (transfer: ITransfer) => void;
  onMessage: {
    addListener: (...args: any) => void;
    removeListener: (...args: any) => void;
  };
  onDisconnect: any;
}

/**
 * 发送者
 */
export interface ITransferPortSender {
  documentId: string;
  documentLifecycle: string;
  frameId: number;
  id: string;
  origin: string;
  tab: {
    active: boolean;
    audible: boolean;
    autoDiscardable: boolean;
    discarded: boolean;
    favIconUrl: string;
    groupId: number;
    height: number;
    highlighted: boolean;
    id: number;
    incognito: boolean;
    index: number;
    mutedInfo: {
      muted: boolean;
    };
    pinned: boolean;
    selected: boolean;
    status: string;
    title: string;
    url: string;
    width: number;
    windowId: number;
  };
  url: string;
}

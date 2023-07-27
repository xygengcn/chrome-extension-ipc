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
  sender: runtime.MessageSender;
}

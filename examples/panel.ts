import { PanelHandle } from '../src/panel';

// @ts-ignore
const panel = new PanelHandle({});

// @ts-ignore
window.panel = panel;

// @ts-ignore
panel.handle('test', (data) => {
  console.log('[测试] 收到test', data);
});

panel.handle('connect', (data) => {
  console.log('[测试] 测试链接', data);
});

window.onload = () => {
  const btnReset = document.getElementById('btn');
  if (btnReset) {
    btnReset.onclick = handleclick;
  }
  function handleclick() {
    console.log('[测试] 准备发送');
    panel.invoke('ping', { message: '这是插件发给页面的' }, (data, error) => {
      console.log('[测试页面是否返回数据]', data, error);
    });
  }
};

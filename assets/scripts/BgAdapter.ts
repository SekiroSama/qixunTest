import { _decorator, Component, view, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BgAdapter')
export class BgAdapter extends Component {
    start() {
        // 游戏刚开始时适配一次
        this.adapt();
        // 监听屏幕大小变化（比如电脑上拖动窗口，或者手机横竖屏切换）
        view.on('canvas-resize', this.adapt, this);
    }

    adapt() {
        // 1. 获取屏幕可见区域的大小
        let screenSize = view.getVisibleSize();
        
        // 2. 获取背景图原本的大小
        let transform = this.getComponent(UITransform);
        let bgWidth = transform.contentSize.width;
        let bgHeight = transform.contentSize.height;

        // 3. 算出宽和高分别需要缩放多少倍
        let scaleX = screenSize.width / bgWidth;
        let scaleY = screenSize.height / bgHeight;

        // 4. 选那个更大的倍数（这样才能保证完全覆盖，不会留黑边）
        let finalScale = Math.max(scaleX, scaleY);

        // 5. 应用缩放
        this.node.setScale(finalScale, finalScale, 1);
    }
}
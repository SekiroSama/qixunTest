import { _decorator, Component, Node, view, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameLayout')
export class GameLayout extends Component {

    @property(Node) board: Node = null;      // 棋盘
    @property(Node) goalPanel: Node = null;  // 目标板
    @property(Node) movesPanel: Node = null; // 步数板
    @property(Node) playBtn: Node = null;    // 开始按钮

    // 设计分辨率（竖屏基准）
    designWidth: number = 720;
    designHeight: number = 1280;

    start() {
        this.updateLayout();
        view.on('canvas-resize', this.updateLayout, this);
    }

    updateLayout() {
        // 获取当前屏幕可见区域的大小
        let size = view.getVisibleSize();
        let halfH = size.height / 2;
        let halfW = size.width / 2;
        
        // 宽高比
        let ratio = size.width / size.height;

        // 【新增】全局缩放系数
        // 根据高度或宽度的最小比例来缩放，保证能全部显示且不溢出
        // 这里的 1300 是一个参考高度，防止在超长屏幕上变得过大
        let scaleFactor = Math.min(size.width / this.designWidth, size.height / this.designHeight);
        
        // 如果是横屏，Scale 需要稍微小一点以免顶到上下边缘
        if (ratio > 1) {
            scaleFactor = Math.min(size.height / 800, 1); // 横屏时以高度为限制
        }

        if (ratio > 1) {
            // --- 横屏布局 (Landscape) ---
            
            // 棋盘：放在屏幕中间偏左一点
            this.board.setPosition(-halfW * 0.1, -20);
            this.board.setScale(scaleFactor * 0.9, scaleFactor * 0.9, 1); // 缩放

            // UI元素：放在右侧
            // 目标板右上
            this.goalPanel.setScale(scaleFactor, scaleFactor, 1);
            this.goalPanel.setPosition(halfW * 0.6, 150 * scaleFactor);
            
            // 步数板右下
            this.movesPanel.setScale(scaleFactor, scaleFactor, 1);
            this.movesPanel.setPosition(halfW * 0.6, -150 * scaleFactor);

            // 按钮：放在最右下角或者左下角
            this.playBtn.setScale(scaleFactor, scaleFactor, 1);
            this.playBtn.setPosition(-halfW * 0.6, -halfH * 0.8);
        } 
        else {
            // --- 竖屏布局 (Portrait) ---

            // 棋盘：放中间
            this.board.setPosition(0, -50 * scaleFactor);
            this.board.setScale(scaleFactor, scaleFactor, 1);

            // 目标板/步数板：放在顶部
            this.goalPanel.setScale(scaleFactor, scaleFactor, 1);
            this.goalPanel.setPosition(-160 * scaleFactor, halfH * 0.82);

            this.movesPanel.setScale(scaleFactor, scaleFactor, 1);
            this.movesPanel.setPosition(160 * scaleFactor, halfH * 0.82);

            // 按钮：放在底部
            this.playBtn.setScale(scaleFactor, scaleFactor, 1);
            this.playBtn.setPosition(0, -halfH * 0.85);
        }
    }
}
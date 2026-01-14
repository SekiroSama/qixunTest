import { _decorator, Component, Node, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameLayout')
export class GameLayout extends Component {

    @property(Node) board: Node = null;
    @property(Node) goalPanel: Node = null;
    @property(Node) movesPanel: Node = null;
    @property(Node) playBtn: Node = null;

    start() {
        this.updateLayout();
        view.on('canvas-resize', this.updateLayout, this);
    }

    updateLayout() {
        // 获取当前屏幕可见区域的大小
        let size = view.getVisibleSize();
        // 计算屏幕的边界（中心点是0,0，所以边界是宽高的一半）
        let halfH = size.height / 2;
        let halfW = size.width / 2;
        
        let ratio = size.width / size.height;

        if (ratio > 1) {
            // --- 横屏布局 ---
            // 棋盘：放中间，稍微缩小
            this.board.setPosition(0, 0);
            this.board.setScale(0.7, 0.7, 1);

            // 目标板/步数板：放在右侧 (屏幕宽度的 35% 处)
            // 也就是 x = halfW * 0.7
            this.goalPanel.setPosition(halfW * 0.7, 100);
            this.movesPanel.setPosition(halfW * 0.7, -100);

            // 按钮：放在左侧
            this.playBtn.setPosition(-halfW * 0.7, -150);
        } 
        else {
            // --- 竖屏布局 ---
            // 棋盘：放中间
            this.board.setPosition(0, -50);
            this.board.setScale(1, 1, 1);

            // 目标板/步数板：放在顶部 (屏幕高度的 40% 处)
            // 也就是 y = halfH * 0.8
            this.goalPanel.setPosition(-150, halfH * 0.8);
            this.movesPanel.setPosition(150, halfH * 0.8);

            // 按钮：放在底部
            this.playBtn.setPosition(0, -halfH * 0.8);
        }
    }
}
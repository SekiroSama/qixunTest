import { _decorator, Component, Sprite, SpriteFrame, tween, v3, Vec3, Node, UITransform, EventTouch, Vec2 } from 'cc';
import { BoardManager } from './BoardManager'; // 需确保循环引用问题处理，或用事件发射
const { ccclass, property } = _decorator;

@ccclass('GameItem')
export class GameItem extends Component {
    
    public matchId: number = -1;
    public row: number = 0;
    public col: number = 0;

    // 引用 Manager 来调用交换逻辑
    private boardManager: BoardManager | null = null;
    // 标记是否正在触摸中，防止重复触发
    private isDragging: boolean = false;
    // 起始触摸点
    private startTouchPos: Vec2 = new Vec2();

    public init(id: number, spriteFrame: SpriteFrame, r: number, c: number, manager: BoardManager) {
        this.matchId = id;
        this.getComponent(Sprite)!.spriteFrame = spriteFrame;
        this.row = r;
        this.col = c;
        this.boardManager = manager;
    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        this.isDragging = true;
        this.startTouchPos = event.getUILocation();
        this.node.setSiblingIndex(999); // 提到最上层
    }

    private onTouchMove(event: EventTouch) {
        if (!this.isDragging || !this.boardManager) return;

        const currentPos = event.getUILocation();
        const diffX = currentPos.x - this.startTouchPos.x;
        const diffY = currentPos.y - this.startTouchPos.y;
        
        // 阈值：拖动超过格子的一半宽/高 (假设75的一半约35)
        // 这样可以实现“移动到隔壁”的感觉
        const threshold = 35; 

        if (Math.abs(diffX) > threshold) {
            const direction = diffX > 0 ? 1 : -1; // 1是右，-1是左
            this.boardManager.trySwap(this, 0, direction);
            this.isDragging = false; // 触发一次后就停止，防止连续交换
        } 
        else if (Math.abs(diffY) > threshold) {
            const direction = diffY > 0 ? -1 : 1; // 注意：屏幕坐标y向上是正，但我们行row向上是变小(0在最上)，所以y向上(正)其实是row-1
            this.boardManager.trySwap(this, direction, 0);
            this.isDragging = false;
        }
    }

    private onTouchEnd() {
        this.isDragging = false;
        // 这里可以加一个回弹归位逻辑，如果没触发交换的话
        this.boardManager?.resetItemPos(this);
    }

    // 下落动画 (保持不变)
    public playDropAnimation(targetPos: Vec3, duration: number = 0.2) {
        tween(this.node).stop();
        tween(this.node)
            .to(duration, { position: targetPos }, { easing: 'linear' })
            .call(() => this.playBounceEffect())
            .start();
    }

    private playBounceEffect() {
        tween(this.node)
            .to(0.08, { scale: v3(1.1, 0.9, 1) })
            .to(0.08, { scale: v3(0.95, 1.05, 1) })
            .to(0.08, { scale: v3(1, 1, 1) })
            .start();
    }
}
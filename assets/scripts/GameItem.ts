import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameItem')
export class GameItem extends Component {
    // 用来记录它是哪种水果 (0, 1, 2, 3...)
    public matchId: number = -1;

    public setType(id: number, spriteFrame: SpriteFrame) {
        this.matchId = id;
        // 找到节点上的 Sprite 组件并换图
        this.getComponent(Sprite)!.spriteFrame = spriteFrame;
    }
}
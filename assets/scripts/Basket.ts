import { _decorator, Component, Node, Prefab, instantiate, v3, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Basket')
export class Basket extends Component {

    public fruitNodes: Node[] = []; 

    // 修改：这里接收 Prefab
    public init(fruitPrefab: Prefab) {
        if (!fruitPrefab) return;

        const gap = 45; 
        const startOffset = -gap; 

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                // 修改：实例化 Prefab
                const fruitNode = instantiate(fruitPrefab);
                
                // 设置名字和缩放
                fruitNode.name = `Fruit_${r}_${c}`;
                fruitNode.setScale(v3(0.5, 0.5, 1)); 

                // 设置坐标
                const x = startOffset + c * gap;
                const y = -startOffset - r * gap;
                fruitNode.setPosition(v3(x, y, 0));

                this.node.addChild(fruitNode);
                this.fruitNodes.push(fruitNode);
            }
        }
    }
}
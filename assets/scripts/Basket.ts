import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform, tween, Size } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Basket')
export class Basket extends Component {

    @property(Prefab) fruitPrefab: Prefab = null; 

    private fruits: Node[] = [];
    private currentIndex: number = 0; 
    
    // 【新增】当水果全部飞完后的回调
    public onFinished: Function = null;

    start() {
        this.initFruits();
    }

    initFruits() {
        if (!this.fruitPrefab) return;
        this.fruits = []; // 清空数组防止重复
        this.node.removeAllChildren(); // 清空节点

        let basketSize = this.node.getComponent(UITransform).contentSize.width;
        let gap = basketSize / 3;
        let smallFruitSize = gap * 0.75;

        for (let i = 0; i < 9; i++) {
            let fruit = instantiate(this.fruitPrefab);
            this.node.addChild(fruit);
            let trans = fruit.getComponent(UITransform);
            trans.setContentSize(new Size(smallFruitSize, smallFruitSize));

            let row = Math.floor(i / 3); 
            let col = i % 3;
            let x = (col - 1) * gap;
            let y = (1 - row) * gap; 
            fruit.setPosition(x, y, 0);

            this.fruits.push(fruit);
        }
        this.currentIndex = 0;
    }

    flyFruitTo(targetWorldPos: Vec3, callback: Function) {
        if (this.currentIndex >= this.fruits.length) return;

        let fruit = this.fruits[this.currentIndex];
        this.currentIndex++; // 索引+1

        if (!fruit) return;

        let worldPos = fruit.worldPosition.clone();
        let canvas = this.node.scene.getChildByName('Canvas'); 
        fruit.setParent(canvas);
        fruit.setWorldPosition(worldPos);

        let targetLocalPos = canvas.getComponent(UITransform).convertToNodeSpaceAR(targetWorldPos);

        tween(fruit)
            .to(0.6, { position: targetLocalPos, scale: new Vec3(0.8, 0.8, 1) }, { easing: 'cubicIn' })
            .call(() => {
                if (callback) callback();
                if (fruit && fruit.isValid) fruit.destroy();
            })
            .start();

        // 【新增】判断是否为空。如果当前索引已经等于长度，说明刚刚飞走的是最后一个
        if (this.currentIndex >= this.fruits.length) {
            // 稍等一瞬间再销毁，或者立即销毁，这里选择立即触发逻辑
            if (this.onFinished) {
                this.onFinished();
            }
        }
    }
}
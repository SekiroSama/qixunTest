import { _decorator, Component, Node, Prefab, instantiate, v3, SpriteFrame, math } from 'cc';
import { GameItem } from './GameItem';
import { Basket } from './Basket';
const { ccclass, property } = _decorator;

@ccclass('BoardManager')
export class BoardManager extends Component {

    // --- 层级引用 ---
    @property(Node) bgLayer: Node = null!;
    @property(Node) itemLayer: Node = null!;

    // --- Prefab 引用 ---
    @property(Prefab) bgPrefab: Prefab = null!;   // 块背景 Prefab
    @property(Prefab) itemPrefab: Prefab = null!; // 普通消除块 Prefab
    @property(Prefab) basketPrefab: Prefab = null!; // 篮子 Prefab
    @property(Prefab) pearPrefab: Prefab = null!;   // 篮子里的梨 Prefab (修改为Prefab)

    @property([SpriteFrame]) itemSprites: SpriteFrame[] = [];

    levelMap: number[][] = [
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 2, 2, 1, 2, 2, 1, 1],
        [1, 1, 2, 2, 1, 2, 2, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 2, 2, 1, 2, 2, 1, 1],
        [1, 1, 2, 2, 1, 2, 2, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ];
    private readonly TILE_SIZE = 75;

    protected start(): void {
        this.init();
    }

    init() {
        const rows = this.levelMap.length;
        const cols = this.levelMap[0].length;
        const startX = -((cols - 1) * this.TILE_SIZE) / 2;
        const startY = ((rows - 1) * this.TILE_SIZE) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const type = this.levelMap[r][c];
                
                // 空格子完全跳过
                if (type === 0) continue;

                const x = startX + c * this.TILE_SIZE;
                const y = startY - r * this.TILE_SIZE;
                const pos = v3(x, y, 0);

                // --- 1. 生成背景块 (只要 type != 0 都生成) ---
                if (this.bgPrefab) {
                    const bgNode = instantiate(this.bgPrefab);
                    this.bgLayer.addChild(bgNode); // 加到背景层
                    bgNode.setPosition(pos);
                    bgNode.name = `Bg_${r}_${c}`;
                }

                // --- 2. 生成前景物体 (Item 或 Basket) ---
                if (type === 1) {
                    const item = instantiate(this.itemPrefab);
                    this.itemLayer.addChild(item); // 加到前景层
                    item.setPosition(pos);
                    
                    const randomIdx = math.randomRangeInt(0, this.itemSprites.length);
                    item.getComponent(GameItem)?.setType(randomIdx, this.itemSprites[randomIdx]);
                    item.name = `Item_${r}_${c}`;
                } 
                else if (type === 2) {
                    const isLeftNot2 = (c === 0 || this.levelMap[r][c - 1] !== 2);
                    const isTopNot2 = (r === 0 || this.levelMap[r - 1][c] !== 2);

                    if (isLeftNot2 && isTopNot2) {
                        const basketNode = instantiate(this.basketPrefab);
                        this.itemLayer.addChild(basketNode); // 加到前景层
                        
                        const offsetX = this.TILE_SIZE / 2;
                        const offsetY = -this.TILE_SIZE / 2;
                        basketNode.setPosition(v3(x + offsetX, y + offsetY, 0));
                        basketNode.name = `Basket_${r}_${c}`;

                        // 传入 pearPrefab
                        const basketScript = basketNode.getComponent(Basket);
                        if (basketScript) {
                            basketScript.init(this.pearPrefab);
                        }
                    }
                }
            }
        }
    }
}
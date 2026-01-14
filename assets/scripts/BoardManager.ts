import { _decorator, Component, Node, Prefab, instantiate, v3, SpriteFrame, math, NodePool, Vec3 } from 'cc';
import { GameItem } from './GameItem';
import { Basket } from './Basket';
const { ccclass, property } = _decorator;

@ccclass('BoardManager')
export class BoardManager extends Component {

    @property(Node) bgLayer: Node = null!;
    @property(Node) itemLayer: Node = null!;

    @property(Prefab) bgPrefab: Prefab = null!;
    @property(Prefab) itemPrefab: Prefab = null!;
    @property(Prefab) basketPrefab: Prefab = null!;
    @property(Prefab) pearPrefab: Prefab = null!;

    @property([SpriteFrame]) itemSprites: SpriteFrame[] = [];

    // 对象池
    private itemPool: NodePool = new NodePool();

    // 存储节点引用，方便交换
    private gridNodes: (GameItem | null)[][] = [];

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

    // 从对象池获取或实例化
    private spawnItemNode(): Node {
        if (this.itemPool.size() > 0) {
            return this.itemPool.get()!;
        } else {
            return instantiate(this.itemPrefab);
        }
    }

    // 回收节点
    private recycleItemNode(node: Node) {
        this.itemPool.put(node);
    }

    init() {
        if (!this.bgLayer || !this.itemLayer || this.itemSprites.length === 0) return;

        const rows = this.levelMap.length;
        const cols = this.levelMap[0].length;
        
        // 初始化 gridNodes
        this.gridNodes = Array.from({ length: rows }, () => Array(cols).fill(null));
        const gridTypes: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));

        const startX = -((cols - 1) * this.TILE_SIZE) / 2;
        const startY = ((rows - 1) * this.TILE_SIZE) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const type = this.levelMap[r][c];
                if (type === 0) continue;

                const pos = this.getPos(r, c, startX, startY);

                // 背景
                if (this.bgPrefab) {
                    const bg = instantiate(this.bgPrefab);
                    this.bgLayer.addChild(bg);
                    bg.setPosition(pos);
                }

                if (type === 1) {
                    // 查重逻辑 (保持不变)
                    let randomIdx = -1;
                    let isMatch = true;
                    let safeGuard = 0;
                    while (isMatch) {
                        isMatch = false;
                        randomIdx = math.randomRangeInt(0, this.itemSprites.length);
                        if (c >= 2 && gridTypes[r][c - 1] === randomIdx && gridTypes[r][c - 2] === randomIdx) isMatch = true;
                        if (r >= 2 && gridTypes[r - 1][c] === randomIdx && gridTypes[r - 2][c] === randomIdx) isMatch = true;
                        safeGuard++;
                        if (safeGuard > 100) isMatch = false;
                    }
                    gridTypes[r][c] = randomIdx;

                    // 使用对象池生成
                    const itemNode = this.spawnItemNode();
                    this.itemLayer.addChild(itemNode);
                    itemNode.setPosition(pos);
                    itemNode.name = `Item_${r}_${c}`;

                    const itemScript = itemNode.getComponent(GameItem)!;
                    // 传入 this (Manager)
                    itemScript.init(randomIdx, this.itemSprites[randomIdx], r, c, this);
                    
                    // 存入 gridNodes
                    this.gridNodes[r][c] = itemScript;
                } 
                else if (type === 2) {
                    // Basket 逻辑略，Basket 不在 gridNodes 里参与交换，视作障碍或特殊块
                    const isLeftNot2 = (c === 0 || this.levelMap[r][c - 1] !== 2);
                    const isTopNot2 = (r === 0 || this.levelMap[r - 1][c] !== 2);
                    if (isLeftNot2 && isTopNot2) {
                        const basketNode = instantiate(this.basketPrefab);
                        this.itemLayer.addChild(basketNode);
                        const offsetX = this.TILE_SIZE / 2;
                        const offsetY = -this.TILE_SIZE / 2;
                        basketNode.setPosition(v3(pos.x + offsetX, pos.y + offsetY, 0));
                        basketNode.getComponent(Basket)?.init(this.pearPrefab);
                    }
                }
            }
        }
    }

    private getPos(r: number, c: number, startX: number, startY: number): Vec3 {
        return v3(startX + c * this.TILE_SIZE, startY - r * this.TILE_SIZE, 0);
    }

    // 获取标准位置的辅助方法
    public getTilePos(r: number, c: number): Vec3 {
        const rows = this.levelMap.length;
        const cols = this.levelMap[0].length;
        const startX = -((cols - 1) * this.TILE_SIZE) / 2;
        const startY = ((rows - 1) * this.TILE_SIZE) / 2;
        return this.getPos(r, c, startX, startY);
    }

    // 尝试交换
    public trySwap(item: GameItem, dirRow: number, dirCol: number) {
        const r1 = item.row;
        const c1 = item.col;
        const r2 = r1 + dirRow;
        const c2 = c1 + dirCol;

        // 边界检查
        if (r2 < 0 || r2 >= this.levelMap.length || c2 < 0 || c2 >= this.levelMap[0].length) {
            this.resetItemPos(item);
            return;
        }

        const targetItem = this.gridNodes[r2][c2];

        // 如果目标位置是空的，或者不是普通的 GameItem (比如是空地或果篮)，不能交换
        // 这里简单处理：只有两个都是 GameItem 才能换
        if (!targetItem) {
            this.resetItemPos(item);
            return;
        }

        // 1. 数据交换
        this.gridNodes[r1][c1] = targetItem;
        this.gridNodes[r2][c2] = item;

        // 更新 item 内部坐标
        item.row = r2;
        item.col = c2;
        targetItem.row = r1;
        targetItem.col = c1;

        // 2. 视觉位置交换 (立刻移动到位)
        item.node.setPosition(this.getTilePos(r2, c2));
        targetItem.node.setPosition(this.getTilePos(r1, c1));

        // 3. 判断消除
        const hasMatch = this.checkAndEliminate();

        if (!hasMatch) {
            // 如果没消除，通常要换回来 (但你之前的需求没细说，标准三消是换回来)
            // 这里为了简单，如果没消除，就暂时保留交换后的状态，或者你可以取消注释下面这段：
            
            // 换回来
            /*
            this.gridNodes[r1][c1] = item;
            this.gridNodes[r2][c2] = targetItem;
            item.row = r1; item.col = c1;
            targetItem.row = r2; targetItem.col = c2;
            item.node.setPosition(this.getTilePos(r1, c1));
            targetItem.node.setPosition(this.getTilePos(r2, c2));
            */
        }
    }

    public resetItemPos(item: GameItem) {
        item.node.setPosition(this.getTilePos(item.row, item.col));
    }

    // --- 核心逻辑：检测并消除 ---
    public checkAndEliminate(): boolean {
        const rows = this.levelMap.length;
        const cols = this.levelMap[0].length;
        const matchSet = new Set<GameItem>(); // 用 Set 存要去消除的节点，防重复

        // 1. 横向检测
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 2; c++) {
                const item1 = this.gridNodes[r][c];
                const item2 = this.gridNodes[r][c + 1];
                const item3 = this.gridNodes[r][c + 2];

                if (item1 && item2 && item3 &&
                    item1.matchId === item2.matchId &&
                    item1.matchId === item3.matchId) {
                    
                    matchSet.add(item1);
                    matchSet.add(item2);
                    matchSet.add(item3);
                }
            }
        }

        // 2. 纵向检测
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows - 2; r++) {
                const item1 = this.gridNodes[r][c];
                const item2 = this.gridNodes[r + 1][c];
                const item3 = this.gridNodes[r + 2][c];

                if (item1 && item2 && item3 &&
                    item1.matchId === item2.matchId &&
                    item1.matchId === item3.matchId) {
                    
                    matchSet.add(item1);
                    matchSet.add(item2);
                    matchSet.add(item3);
                }
            }
        }

        // 3. 执行消除
        if (matchSet.size > 0) {
            matchSet.forEach(item => {
                // 1. 从 gridNodes 移除引用
                this.gridNodes[item.row][item.col] = null;
                // 2. 回收进对象池
                this.recycleItemNode(item.node);
                // (视觉上你可以加个消除特效，这里直接移除)
            });
            console.log(`消除了 ${matchSet.size} 个方块`);
            return true;
        }

        return false;
    }
}
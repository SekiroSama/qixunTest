import { _decorator, Component, Node, Prefab, instantiate, Sprite, SpriteFrame, UITransform, Size, EventTouch, Vec2, Vec3, tween, Color, Label, isValid } from 'cc';
import { Basket } from './Basket';
const { ccclass, property } = _decorator;

@ccclass('BoardManager')
export class BoardManager extends Component {

    @property(Prefab) itemPrefab: Prefab = null;
    @property(Prefab) cellPrefab: Prefab = null;
    @property([SpriteFrame]) itemIcons: SpriteFrame[] = [];
    @property(Prefab) basketPrefab: Prefab = null;
    @property(SpriteFrame) fruitSprite: SpriteFrame = null;

    @property itemSize: number = 85;

    @property(Node) bgLayer: Node = null;
    @property(Node) itemLayer: Node = null;
    @property(Node) goalNode: Node = null;

    // 地图配置：0=空, 1=普通, 2=果篮区域(2x2)
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

    items: Node[][] = [];
    baskets: Node[] = [];
    isAnimating: boolean = false;
    animTimer: number = 0;

    selectedRow: number = -1;
    selectedCol: number = -1;
    selectedNode: Node = null;
    originalPos: Vec3 = new Vec3();
    startTouchPos: Vec2 = new Vec2();

    start() {
        this.generateBoard();
        this.itemLayer.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.itemLayer.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.itemLayer.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.itemLayer.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    update(dt: number) {
        if (this.isAnimating) {
            this.animTimer += dt;
            if (this.animTimer > 3.0) {
                this.isAnimating = false;
                this.animTimer = 0;
            }
        } else {
            this.animTimer = 0;
        }
    }

    generateBoard() {
        this.bgLayer.removeAllChildren();
        this.itemLayer.removeAllChildren();
        this.items = [];
        this.baskets = [];

        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        let boardWidth = cols * this.itemSize;
        let boardHeight = rows * this.itemSize;

        let boardTrans = this.node.getComponent(UITransform);
        if (!boardTrans) boardTrans = this.node.addComponent(UITransform);
        boardTrans.setContentSize(new Size(boardWidth, boardHeight));

        let layerTrans = this.itemLayer.getComponent(UITransform);
        if (!layerTrans) layerTrans = this.itemLayer.addComponent(UITransform);
        layerTrans.setContentSize(new Size(boardWidth, boardHeight));

        let startX = -boardWidth / 2 + this.itemSize / 2;
        let startY = boardHeight / 2 - this.itemSize / 2;

        let processed = Array.from({ length: rows }, () => Array(cols).fill(false));

        for (let r = 0; r < rows; r++) {
            this.items[r] = [];
            for (let c = 0; c < cols; c++) {
                let type = this.levelMap[r][c];

                if (type === 1) {
                    this.createCell(c, r, startX, startY);
                    this.createItem(c, r, startX, startY);
                }
                else if (type === 2) {
                    if (!processed[r][c]) {
                        if (r + 1 < rows && c + 1 < cols &&
                            this.levelMap[r][c + 1] === 2 &&
                            this.levelMap[r + 1][c] === 2 &&
                            this.levelMap[r + 1][c + 1] === 2) {

                            processed[r][c] = true;
                            processed[r][c + 1] = true;
                            processed[r + 1][c] = true;
                            processed[r + 1][c + 1] = true;

                            this.createBigBasket(c, r, startX, startY);
                        }
                    }
                    this.items[r][c] = null;
                }
                else {
                    this.items[r][c] = null;
                }
            }
        }
    }

    createCell(col: number, row: number, startX: number, startY: number) {
        let node = instantiate(this.cellPrefab);
        this.bgLayer.addChild(node);
        let transform = node.getComponent(UITransform);
        transform.setContentSize(new Size(this.itemSize, this.itemSize));
        node.setPosition(startX + col * this.itemSize, startY - row * this.itemSize);
    }

    createBigBasket(col: number, row: number, startX: number, startY: number) {
        if (!this.basketPrefab) return;

        let node = instantiate(this.basketPrefab);
        this.bgLayer.addChild(node);
        let basketSize = this.itemSize * 2;
        let transform = node.getComponent(UITransform);
        if (!transform) transform = node.addComponent(UITransform);
        transform.setContentSize(new Size(basketSize, basketSize));

        let posX = startX + col * this.itemSize + this.itemSize / 2;
        let posY = startY - row * this.itemSize - this.itemSize / 2;
        node.setPosition(posX, posY);

        // 存储占位区域数据
        node['range'] = [
            { r: row, c: col }, { r: row, c: col + 1 },
            { r: row + 1, c: col }, { r: row + 1, c: col + 1 }
        ];

        // 【新增】绑定回调，当果篮空了之后调用
        let basketScript = node.getComponent(Basket);
        if (basketScript) {
            basketScript.onFinished = () => {
                this.onBasketEmpty(node);
            };
        }

        this.baskets.push(node);
    }

    // 【新增】处理果篮清空后的逻辑
    onBasketEmpty(basketNode: Node) {
        if (!isValid(basketNode)) return;

        // 1. 获取该果篮占用的坐标
        let range = basketNode['range']; // [{r,c}, {r,c}, ...]

        // 2. 修改地图数据：从 2 (Obstacle) 变为 1 (Normal)
        // 这样 processFalling 就会把它们当做“空缺的普通格子”进行填充
        if (range && Array.isArray(range)) {
            range.forEach(pos => {
                if (this.levelMap[pos.r] && this.levelMap[pos.r][pos.c] !== undefined) {
                    this.levelMap[pos.r][pos.c] = 1;
                    // 同时要在背景层补上格子底图(Cell)，否则背景是空的会很难看
                    let boardW = this.levelMap[0].length * this.itemSize;
                    let boardH = this.levelMap.length * this.itemSize;
                    let startX = -boardW / 2 + this.itemSize / 2;
                    let startY = boardH / 2 - this.itemSize / 2;
                    this.createCell(pos.c, pos.r, startX, startY);
                }
            });
        }

        // 3. 从数组中移除
        let idx = this.baskets.indexOf(basketNode);
        if (idx !== -1) {
            this.baskets.splice(idx, 1);
        }

        // 4. 播放消失动画并销毁
        tween(basketNode)
            .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                basketNode.destroy();
                // 5. 触发下落逻辑！
                // 此时 levelMap 已经是 1，items 数组对应位置是 null，
                // processFalling 会自动识别并让上方的方块掉下来
                this.processFalling();
            })
            .start();
    }

    createItem(col: number, row: number, startX: number, startY: number) {
        let node = instantiate(this.itemPrefab);
        this.itemLayer.addChild(node);
        let transform = node.getComponent(UITransform);
        transform.setContentSize(new Size(this.itemSize, this.itemSize));
        node.setPosition(startX + col * this.itemSize, startY - row * this.itemSize);

        let finalType = 0;
        while (true) {
            finalType = Math.floor(Math.random() * this.itemIcons.length);
            if (col >= 2) {
                let l1 = this.items[row][col - 1], l2 = this.items[row][col - 2];
                if (l1 && l1['type'] === finalType && l2 && l2['type'] === finalType) continue;
            }
            if (row >= 2) {
                let t1 = this.items[row - 1][col], t2 = this.items[row - 2][col];
                if (t1 && t1['type'] === finalType && t2 && t2['type'] === finalType) continue;
            }
            break;
        }

        node.getComponent(Sprite).spriteFrame = this.itemIcons[finalType];
        node['type'] = finalType;
        node['row'] = row;
        node['col'] = col;
        this.items[row][col] = node;
    }

    onTouchStart(event: EventTouch) {
        if (this.isAnimating) return;
        let touchUiPos = event.getUILocation();
        let transform = this.itemLayer.getComponent(UITransform);
        let pos = transform.convertToNodeSpaceAR(new Vec3(touchUiPos.x, touchUiPos.y, 0));
        let c = Math.round((pos.x - (-transform.contentSize.width / 2 + this.itemSize / 2)) / this.itemSize);
        let r = Math.round(((transform.contentSize.height / 2 - this.itemSize / 2) - pos.y) / this.itemSize);

        if (this.items[r] && this.items[r][c]) {
            let item = this.items[r][c];
            // 确保没有选中障碍物
            if (this.levelMap[r][c] === 2) return;

            this.selectedRow = r;
            this.selectedCol = c;
            this.selectedNode = item;
            this.originalPos = item.getPosition().clone();
            this.startTouchPos = touchUiPos;
            this.selectedNode.setSiblingIndex(999);
        }
    }

    onTouchMove(event: EventTouch) {
        // 增加对 selectedNode 的合法性检查
        if (this.selectedRow === -1 || this.isAnimating || !this.selectedNode || !isValid(this.selectedNode)) {
            this.selectedRow = -1;
            this.selectedNode = null;
            return;
        }

        let currentTouchPos = event.getUILocation();
        let diffX = currentTouchPos.x - this.startTouchPos.x;
        let diffY = currentTouchPos.y - this.startTouchPos.y;

        // 移动当前选中的方块
        this.selectedNode.setPosition(this.originalPos.x + diffX, this.originalPos.y + diffY);

        // 判定是否达到交换距离
        if (Math.abs(diffX) > this.itemSize / 2 || Math.abs(diffY) > this.itemSize / 2) {
            let tR = this.selectedRow, tC = this.selectedCol;
            if (Math.abs(diffX) > Math.abs(diffY)) diffX > 0 ? tC++ : tC--;
            else diffY > 0 ? tR-- : tR++;

            let rows = this.levelMap.length, cols = this.levelMap[0].length;
            if (tR >= 0 && tR < rows && tC >= 0 && tC < cols) {
                let target = this.items[tR][tC];

                // 【修复点】增加 isValid(target) 检查，防止获取已销毁节点的属性
                if (target && isValid(target) && this.levelMap[tR][tC] === 1) {
                    this.swapItems(this.selectedRow, this.selectedCol, tR, tC);
                    // 交换触发后，立即重置选中状态，防止连续触发
                    this.selectedRow = -1;
                    this.selectedNode = null;
                }
            }
        }
    }

    onTouchEnd(event: EventTouch) {
        if (this.selectedNode && !this.isAnimating) {
            tween(this.selectedNode).to(0.15, { position: this.originalPos }, { easing: 'elasticOut' }).start();
        }
        this.selectedRow = -1;
        this.selectedNode = null;
    }
    swapItems(r1: number, c1: number, r2: number, c2: number) {
        let item1 = this.items[r1][c1];
        let item2 = this.items[r2][c2];

        // 【修复点】安全检查：如果任一方块失效，直接取消操作
        if (!item1 || !isValid(item1) || !item2 || !isValid(item2)) {
            console.warn("Swap failed: Invalid nodes");
            this.isAnimating = false;
            // 尝试把位置归位（如果item1还在的话）
            if (item1 && isValid(item1)) item1.setPosition(this.originalPos);
            return;
        }

        this.isAnimating = true;

        // 交换数据
        this.items[r1][c1] = item2;
        this.items[r2][c2] = item1;
        item1['row'] = r2; item1['col'] = c2;
        item2['row'] = r1; item2['col'] = c1;

        // 执行动画
        // 此时 item2 肯定是 valid 的，所以 getPosition() 不会报错
        tween(item1).to(0.15, { position: item2.getPosition() }, { easing: 'cubicOut' }).start();
        tween(item2).to(0.15, { position: this.originalPos }, { easing: 'cubicOut' }).start();

        this.scheduleOnce(() => {
            // 再次检查销毁情况（防止动画期间发生意外）
            if (!isValid(this.node)) return;

            let matches = this.checkMatches();
            if (matches.length > 0) {
                this.processElimination(matches);
            } else {
                this.revertSwap(r1, c1, r2, c2);
            }
        }, 0.2);
    }

    revertSwap(r1: number, c1: number, r2: number, c2: number) {
        let item1 = this.items[r1][c1];
        let item2 = this.items[r2][c2];
        this.items[r1][c1] = item2; this.items[r2][c2] = item1;
        item1['row'] = r1; item1['col'] = c1;
        item2['row'] = r2; item2['col'] = c2;

        let p1 = item1.getPosition(), p2 = item2.getPosition();
        tween(item1).to(0.15, { position: p2 }).start();
        tween(item2).to(0.15, { position: p1 }).start();
        this.scheduleOnce(() => { this.isAnimating = false; }, 0.2);
    }

    processElimination(matches: Node[]) {
        let targetWorldPos = this.goalNode ? this.goalNode.worldPosition.clone() : new Vec3(0, 500, 0);

        // 【修改点1】使用 Map 来记录每个果篮被击中了多少次
        // Key: 果篮节点, Value: 击中次数
        let basketHitCount: Map<Node, number> = new Map();

        for (let node of matches) {
            let r = node['row'], c = node['col'];
            // 检查当前被消除方块的上下左右
            let neighbors = [{ r: r - 1, c: c }, { r: r + 1, c: c }, { r: r, c: c - 1 }, { r: r, c: c + 1 }];

            for (let nb of neighbors) {
                // 遍历所有存活的果篮，看这个邻居坐标是否属于某个果篮
                for (let basket of this.baskets) {
                    if (!isValid(basket)) continue;

                    let range = basket['range']; // [{r,c}, {r,c}...]
                    let isHit = false;

                    // 检查邻居坐标是否在这个果篮的占位范围内
                    for (let pos of range) {
                        if (pos.r === nb.r && pos.c === nb.c) {
                            isHit = true;
                            break;
                        }
                    }

                    if (isHit) {
                        // 如果击中，计数+1
                        let count = basketHitCount.get(basket) || 0;
                        basketHitCount.set(basket, count + 1);

                        // 一个方块的一个方向只能击中一个果篮，击中后跳出当前果篮循环，
                        // 防止重复判定（虽然理论上坐标互斥，但为了逻辑严谨）
                        break;
                    }
                }
            }
        }

        // --- 消除方块的逻辑保持不变 ---
        for (let node of matches) {
            if (node && isValid(node)) {
                this.items[node['row']][node['col']] = null;
                let worldPos = node.worldPosition.clone();
                node.setParent(this.node.parent);
                node.setWorldPosition(worldPos);
                let targetLocalPos = node.parent.getComponent(UITransform).convertToNodeSpaceAR(targetWorldPos);

                tween(node)
                    .to(0.25, { position: targetLocalPos, scale: new Vec3(0.5, 0.5, 1) }, { easing: 'backIn' })
                    .call(() => { if (isValid(node)) node.destroy(); })
                    .start();
            }
        }

        // 【修改点2】根据击中次数触发对应数量的水果
        basketHitCount.forEach((count, basketNode) => {
            let basketScript = basketNode.getComponent(Basket);
            if (basketScript) {
                // 循环调用 flyFruitTo，次数 = 击中次数
                for (let i = 0; i < count; i++) {
                    // 使用 scheduleOnce稍微错开一点时间，效果更好看
                    this.scheduleOnce(() => {
                        // 检查节点是否还健在（防止连击时果篮已经销毁了还报错）
                        if (isValid(basketNode)) {
                            basketScript.flyFruitTo(targetWorldPos, () => {
                                // 这里可以加分
                            });
                        }
                    }, i * 0.1); // 每隔 0.1秒飞一个
                }
            }
        });

        this.scheduleOnce(() => { this.processFalling(); }, 0.15 + (basketHitCount.size > 0 ? 0.2 : 0));
    }

    processFalling() {
        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        let maxDuration = 0;
        let hasAction = false;

        let boardWidth = cols * this.itemSize;
        let startX = -boardWidth / 2 + this.itemSize / 2;
        let startY = (rows * this.itemSize) / 2 - this.itemSize / 2;

        for (let c = 0; c < cols; c++) {
            for (let r = rows - 1; r >= 0; r--) {
                // 如果是空地(0) 或者 障碍(2)，跳过。
                // 注意：当果篮消失后，levelMap 此处会变为 1，所以代码会往下执行，
                // 发现 this.items[r][c] 为 null，就会触发下落填充。完美！
                if (this.levelMap[r][c] === 0 || this.levelMap[r][c] === 2) continue;

                if (this.items[r][c] == null) {
                    let targetY = startY - r * this.itemSize;
                    let sourceNode: Node = null;
                    let sourceR = -1;
                    let sourceC = -1;

                    let topR = r - 1;
                    let topC = c;

                    // 斜向填充逻辑（流体效果）
                    if (topR >= 0 && this.levelMap[topR][topC] === 2) {
                        if (c > 0 && this.levelMap[topR][c - 1] === 1 && this.items[topR][c - 1]) {
                            sourceR = topR; sourceC = c - 1;
                        }
                        else if (c < cols - 1 && this.levelMap[topR][c + 1] === 1 && this.items[topR][c + 1]) {
                            sourceR = topR; sourceC = c + 1;
                        }
                    }
                    else {
                        // 垂直下落
                        if (topR >= 0 && this.levelMap[topR][topC] === 1 && this.items[topR][topC]) {
                            sourceR = topR; sourceC = topC;
                        }
                        // 顶部生成新块
                        else if (topR < 0 || this.levelMap[topR][topC] === 0) {
                            let node = instantiate(this.itemPrefab);
                            this.itemLayer.addChild(node);
                            node.getComponent(UITransform).setContentSize(new Size(this.itemSize, this.itemSize));

                            let type = Math.floor(Math.random() * this.itemIcons.length);
                            node.getComponent(Sprite).spriteFrame = this.itemIcons[type];
                            node['type'] = type;
                            node.name = `New_${r}_${c}`;
                            let realX = startX + c * this.itemSize;
                            node.setPosition(realX, targetY + this.itemSize);
                            this.items[r][c] = node;
                            node['row'] = r; node['col'] = c;
                            let moveTime = 0.15;
                            tween(node).to(moveTime, { position: new Vec3(realX, targetY, 0) }, { easing: 'bounceOut' }).start();
                            hasAction = true;
                            if (moveTime > maxDuration) maxDuration = moveTime;
                            continue;
                        }
                    }

                    // 移动已有方块
                    if (sourceR !== -1) {
                        sourceNode = this.items[sourceR][sourceC];
                        this.items[r][c] = sourceNode;
                        this.items[sourceR][sourceC] = null;
                        sourceNode['row'] = r;
                        sourceNode['col'] = c;
                        let moveTime = 0.1;
                        tween(sourceNode).to(moveTime, { position: new Vec3(startX + c * this.itemSize, targetY, 0) }, { easing: 'linear' }).start();
                        hasAction = true;
                        if (moveTime > maxDuration) maxDuration = moveTime;
                    }
                }
            }
        }

        let hasEmptySlots = false;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (this.levelMap[r][c] === 1 && this.items[r][c] == null) {
                    hasEmptySlots = true;
                    break;
                }
            }
        }

        if (hasEmptySlots) {
            let delay = hasAction ? 0.1 : 0.02;
            this.scheduleOnce(() => { this.processFalling(); }, delay);
        } else {
            this.scheduleOnce(() => {
                let newMatches = this.checkMatches();
                if (newMatches.length > 0) this.processElimination(newMatches);
                else this.isAnimating = false;
            }, maxDuration + 0.05);
        }
    }

    checkMatches(): Node[] {
        let matchedNodes: Set<Node> = new Set();
        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 2; c++) {
                let i1 = this.items[r][c], i2 = this.items[r][c + 1], i3 = this.items[r][c + 2];
                if (i1 && isValid(i1) && i2 && isValid(i2) && i3 && isValid(i3) &&
                    i1['type'] === i2['type'] && i2['type'] === i3['type']) {
                    matchedNodes.add(i1); matchedNodes.add(i2); matchedNodes.add(i3);
                }
            }
        }
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows - 2; r++) {
                let i1 = this.items[r][c], i2 = this.items[r + 1][c], i3 = this.items[r + 2][c];
                if (i1 && isValid(i1) && i2 && isValid(i2) && i3 && isValid(i3) &&
                    i1['type'] === i2['type'] && i2['type'] === i3['type']) {
                    matchedNodes.add(i1); matchedNodes.add(i2); matchedNodes.add(i3);
                }
            }
        }
        return Array.from(matchedNodes);
    }
}
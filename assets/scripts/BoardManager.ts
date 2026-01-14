import { _decorator, Component, Node, Prefab, instantiate, Sprite, SpriteFrame, UITransform, Size, EventTouch, Vec2, Vec3, tween, Color, Director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BoardManager')
export class BoardManager extends Component {

    @property(Prefab) itemPrefab: Prefab = null; 
    @property(Prefab) cellPrefab: Prefab = null; 
    @property([SpriteFrame]) itemIcons: SpriteFrame[] = []; 
    
    @property itemSize: number = 85; 

    @property(Node) bgLayer: Node = null;   
    @property(Node) itemLayer: Node = null;
    @property(Node) goalNode: Node = null; // 【UI目标】记得在编辑器里拖进去

    // 地图配置：0=空, 1=普通糖果, 2=果篮(白框)
    levelMap: number[][] = [
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 2, 2, 1, 1, 1, 1], // 中间放了两个果篮
        [1, 1, 1, 2, 2, 1, 1, 1, 1], 
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ];

    items: Node[][] = []; 
    isAnimating: boolean = false; 
    animTimer: number = 0; // 看门狗计时器

    // 拖拽变量
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

    // 防卡死看门狗：如果动画卡住超过2秒，强制解锁
    update(dt: number) {
        if (this.isAnimating) {
            this.animTimer += dt;
            if (this.animTimer > 2.0) {
                console.warn("检测到逻辑卡顿，强制解锁输入");
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

        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        let boardWidth = cols * this.itemSize;
        let boardHeight = rows * this.itemSize;
        
        // 设置容器大小
        let boardTrans = this.node.getComponent(UITransform);
        if (!boardTrans) boardTrans = this.node.addComponent(UITransform);
        boardTrans.setContentSize(new Size(boardWidth, boardHeight));

        let layerTrans = this.itemLayer.getComponent(UITransform);
        if (!layerTrans) layerTrans = this.itemLayer.addComponent(UITransform);
        layerTrans.setContentSize(new Size(boardWidth, boardHeight));

        let startX = -boardWidth / 2 + this.itemSize / 2;
        let startY = boardHeight / 2 - this.itemSize / 2;

        for (let r = 0; r < rows; r++) {
            this.items[r] = [];
            for (let c = 0; c < cols; c++) {
                let type = this.levelMap[r][c];
                
                if (type === 1) { // 普通糖果
                    this.createCell(c, r, startX, startY);
                    this.createItem(c, r, startX, startY);
                } 
                else if (type === 2) { // 果篮
                    this.createCell(c, r, startX, startY);
                    this.createBasket(c, r, startX, startY);
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
        let posX = startX + col * this.itemSize;
        let posY = startY - row * this.itemSize;
        node.setPosition(posX, posY);
    }

    createBasket(col: number, row: number, startX: number, startY: number) {
        let node = instantiate(this.itemPrefab);
        this.itemLayer.addChild(node);
        let transform = node.getComponent(UITransform);
        transform.setContentSize(new Size(this.itemSize, this.itemSize));
        let posX = startX + col * this.itemSize;
        let posY = startY - row * this.itemSize;
        node.setPosition(posX, posY);

        // 果篮样式：白色，稍微小一点
        let sprite = node.getComponent(Sprite);
        sprite.spriteFrame = this.cellPrefab.data.getComponent(Sprite).spriteFrame; 
        sprite.color = new Color(255, 255, 255, 255); 
        transform.contentSize = new Size(this.itemSize - 10, this.itemSize - 10);

        node['type'] = 100; // 特殊类型
        node['isObstacle'] = true; // 标记为障碍物
        node['row'] = row;
        node['col'] = col;
        this.items[row][col] = node;
    }

    createItem(col: number, row: number, startX: number, startY: number) {
        let node = instantiate(this.itemPrefab);
        this.itemLayer.addChild(node);
        let transform = node.getComponent(UITransform);
        transform.setContentSize(new Size(this.itemSize, this.itemSize));

        let posX = startX + col * this.itemSize;
        let posY = startY - row * this.itemSize;
        node.setPosition(posX, posY);
        
        // 初始生成防三消
        let finalType = 0;
        while (true) {
            finalType = Math.floor(Math.random() * this.itemIcons.length);
            let isHorizontalMatch = false;
            if (col >= 2) {
                let left1 = this.items[row][col - 1]; 
                let left2 = this.items[row][col - 2]; 
                if (left1 && left2 && left1['type'] === finalType && left2['type'] === finalType) isHorizontalMatch = true;
            }
            let isVerticalMatch = false;
            if (row >= 2) {
                let top1 = this.items[row - 1][col]; 
                let top2 = this.items[row - 2][col]; 
                if (top1 && top2 && top1['type'] === finalType && top2['type'] === finalType) isVerticalMatch = true;
            }
            if (!isHorizontalMatch && !isVerticalMatch) break; 
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

        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        let boardWidth = cols * this.itemSize;
        let boardHeight = rows * this.itemSize;
        let startX = -boardWidth / 2 + this.itemSize / 2;
        let startY = boardHeight / 2 - this.itemSize / 2;

        let c = Math.round((pos.x - startX) / this.itemSize);
        let r = Math.round((startY - pos.y) / this.itemSize);

        if (r >= 0 && r < rows && c >= 0 && c < cols && this.items[r][c]) {
            let item = this.items[r][c];
            // 果篮不能拖动
            if (item['isObstacle']) return;

            this.selectedRow = r;
            this.selectedCol = c;
            this.selectedNode = item;
            this.originalPos = item.getPosition().clone(); 
            this.startTouchPos = touchUiPos;
            this.selectedNode.setSiblingIndex(999); 
        }
    }

    onTouchMove(event: EventTouch) {
        if (this.selectedRow === -1 || this.isAnimating || !this.selectedNode) return;

        let currentTouchPos = event.getUILocation();
        let diffX = currentTouchPos.x - this.startTouchPos.x;
        let diffY = currentTouchPos.y - this.startTouchPos.y;

        this.selectedNode.setPosition(this.originalPos.x + diffX, this.originalPos.y + diffY);

        let threshold = this.itemSize / 2;
        if (Math.abs(diffX) > threshold || Math.abs(diffY) > threshold) {
            let targetRow = this.selectedRow;
            let targetCol = this.selectedCol;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) targetCol++; else targetCol--;           
            } else {
                if (diffY > 0) targetRow--; else targetRow++;           
            }

            let rows = this.levelMap.length;
            let cols = this.levelMap[0].length;
            
            // 检查边界
            if (targetRow >= 0 && targetRow < rows && targetCol >= 0 && targetCol < cols) {
                let targetNode = this.items[targetRow][targetCol];
                // 只有目标不是果篮，且是有效的格子才能交换
                if (targetNode && !targetNode['isObstacle'] && this.levelMap[targetRow][targetCol] !== 0) {
                    this.swapItems(this.selectedRow, this.selectedCol, targetRow, targetCol);
                    this.selectedRow = -1;
                    this.selectedNode = null;
                }
            }
        }
    }

    onTouchEnd(event: EventTouch) {
        if (this.selectedNode && !this.isAnimating) {
            tween(this.selectedNode)
                .to(0.2, { position: this.originalPos }, { easing: 'elasticOut' }) 
                .start();
        }
        this.selectedRow = -1;
        this.selectedNode = null;
    }

    swapItems(r1: number, c1: number, r2: number, c2: number) {
        this.isAnimating = true;

        let item1 = this.items[r1][c1]; 
        let item2 = this.items[r2][c2]; 

        this.items[r1][c1] = item2;
        this.items[r2][c2] = item1;
        item1['row'] = r2; item1['col'] = c2;
        item2['row'] = r1; item2['col'] = c1;

        let pos1 = item1.getPosition(); 
        let pos2 = item2.getPosition(); 

        tween(item1).to(0.25, { position: pos2 }, { easing: 'cubicOut' }).start();
        tween(item2).to(0.25, { position: this.originalPos }, { easing: 'cubicOut' }).start();

        // 使用 scheduleOnce 控制逻辑，不依赖 tween 回调
        this.scheduleOnce(() => {
            let matches = this.checkMatches();
            if (matches.length > 0) {
                this.processElimination(matches);
            } else {
                this.revertSwap(r1, c1, r2, c2);
            }
        }, 0.3);
    }

    revertSwap(r1: number, c1: number, r2: number, c2: number) {
        let item1 = this.items[r1][c1];
        let item2 = this.items[r2][c2];

        this.items[r1][c1] = item2;
        this.items[r2][c2] = item1;
        item1['row'] = r1; item1['col'] = c1;
        item2['row'] = r2; item2['col'] = c2;

        let pos1 = item1.getPosition(); 
        let pos2 = item2.getPosition();

        tween(item1).to(0.25, { position: pos2 }).start();
        tween(item2).to(0.25, { position: pos1 }).start();

        this.scheduleOnce(() => {
            this.isAnimating = false; 
        }, 0.3);
    }

    processElimination(matches: Node[]) {
        let targetWorldPos = new Vec3(0, 500, 0); 
        if (this.goalNode) targetWorldPos = this.goalNode.worldPosition.clone();

        // 检查周边有没有果篮
        let triggeredBaskets = new Set<Node>();
        for (let node of matches) {
            let r = node['row'];
            let c = node['col'];
            let neighbors = [{r: r-1, c: c}, {r: r+1, c: c}, {r: r, c: c-1}, {r: r, c: c+1}];
            for (let nb of neighbors) {
                if (nb.r >= 0 && nb.r < this.levelMap.length && nb.c >= 0 && nb.c < this.levelMap[0].length) {
                    let neighborNode = this.items[nb.r][nb.c];
                    if (neighborNode && neighborNode['type'] === 100) {
                        triggeredBaskets.add(neighborNode);
                    }
                }
            }
        }

        // 1. 消除糖果
        for (let node of matches) {
            if (node && node.isValid) {
                this.items[node['row']][node['col']] = null;
                
                // 飞向目标
                let worldPos = node.worldPosition.clone();
                node.setParent(this.node.parent); // 提到 Canvas 层
                node.setWorldPosition(worldPos);
                
                let targetLocalPos = node.parent.getComponent(UITransform).convertToNodeSpaceAR(targetWorldPos);

                tween(node)
                    .to(0.4, { position: targetLocalPos, scale: new Vec3(0.5, 0.5, 1) }, { easing: 'backIn' })
                    .call(() => { if (node.isValid) node.destroy(); })
                    .start();
            }
        }

        // 2. 触发果篮效果
        triggeredBaskets.forEach(basket => {
            // 果篮抖动
            tween(basket).to(0.1, { scale: new Vec3(1.2, 1.2, 1) }).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
            
            // 飞出一个星星
            let flyingIcon = instantiate(this.itemPrefab);
            flyingIcon.setParent(this.node.parent);
            flyingIcon.setWorldPosition(basket.worldPosition);
            flyingIcon.getComponent(Sprite).spriteFrame = this.itemIcons[Math.floor(Math.random()*this.itemIcons.length)];
            flyingIcon.setScale(0.5, 0.5, 1);

            let targetLocalPos = flyingIcon.parent.getComponent(UITransform).convertToNodeSpaceAR(targetWorldPos);
            tween(flyingIcon)
                .to(0.5, { position: targetLocalPos }, { easing: 'cubicIn' })
                .call(() => { flyingIcon.destroy(); })
                .start();
        });

        // 延迟下落
        this.scheduleOnce(() => {
            this.processFalling();
        }, 0.35);
    }

    processFalling() {
        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        let maxDuration = 0;

        let boardWidth = cols * this.itemSize;
        let boardHeight = rows * this.itemSize;
        let startX = -boardWidth / 2 + this.itemSize / 2;
        let startY = boardHeight / 2 - this.itemSize / 2;

        for (let c = 0; c < cols; c++) {
            // 收集
            let validItems: Node[] = [];
            for (let r = rows - 1; r >= 0; r--) {
                if (this.levelMap[r][c] === 0) continue;
                // 果篮(type 100)也当做普通方块收集，也会掉落
                if (this.items[r][c] && this.items[r][c].isValid) {
                    validItems.push(this.items[r][c]);
                }
            }

            // 填充
            let idx = 0; 
            for (let r = rows - 1; r >= 0; r--) {
                if (this.levelMap[r][c] === 0) continue;

                let node: Node = null;
                let targetY = startY - r * this.itemSize;
                let moveDuration = 0.4;
                let delay = c * 0.05;

                // 复用旧的
                if (idx < validItems.length) {
                    node = validItems[idx];
                    idx++;
                } 
                // 生成新的 (只能生成普通糖果)
                else {
                    node = instantiate(this.itemPrefab);
                    this.itemLayer.addChild(node);
                    let trans = node.getComponent(UITransform);
                    trans.setContentSize(new Size(this.itemSize, this.itemSize));
                    
                    let type = Math.floor(Math.random() * this.itemIcons.length);
                    node.getComponent(Sprite).spriteFrame = this.itemIcons[type];
                    node['type'] = type;
                    node.name = `Item_New_${r}_${c}`;
                    
                    let realX = startX + c * this.itemSize;
                    node.setPosition(realX, startY + this.itemSize * 3);
                    moveDuration = 0.5;
                }

                this.items[r][c] = node;
                node['row'] = r;
                node['col'] = c;

                // 播放动画 (只有位置不对时才播)
                if (Math.abs(node.position.y - targetY) > 1) {
                    tween(node)
                        .delay(delay)
                        .to(moveDuration, { position: new Vec3(node.position.x, targetY, 0) }, { easing: 'bounceOut' })
                        .start();
                    
                    if (delay + moveDuration > maxDuration) maxDuration = delay + moveDuration;
                }
            }
        }

        // 再次检查连击
        this.scheduleOnce(() => {
            try {
                let newMatches = this.checkMatches();
                if (newMatches.length > 0) {
                    this.processElimination(newMatches);
                } else {
                    this.isAnimating = false;
                }
            } catch (e) {
                console.error(e);
                this.isAnimating = false;
            }
        }, maxDuration + 0.2);
    }

    checkMatches(): Node[] {
        let matchedNodes: Set<Node> = new Set();
        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;

        // 横向
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 2; c++) {
                let item1 = this.items[r][c];
                let item2 = this.items[r][c + 1];
                let item3 = this.items[r][c + 2];
                // 排除果篮(type=100)
                if (item1 && item1.isValid && item1['type'] < 100 &&
                    item2 && item2.isValid && item2['type'] < 100 &&
                    item3 && item3.isValid && item3['type'] < 100 &&
                    item1['type'] === item2['type'] && item2['type'] === item3['type']) {
                    matchedNodes.add(item1);
                    matchedNodes.add(item2);
                    matchedNodes.add(item3);
                }
            }
        }
        // 纵向
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows - 2; r++) {
                let item1 = this.items[r][c];
                let item2 = this.items[r + 1][c];
                let item3 = this.items[r + 2][c];
                if (item1 && item1.isValid && item1['type'] < 100 &&
                    item2 && item2.isValid && item2['type'] < 100 &&
                    item3 && item3.isValid && item3['type'] < 100 &&
                    item1['type'] === item2['type'] && item2['type'] === item3['type']) {
                    matchedNodes.add(item1);
                    matchedNodes.add(item2);
                    matchedNodes.add(item3);
                }
            }
        }
        return Array.from(matchedNodes);
    }
}
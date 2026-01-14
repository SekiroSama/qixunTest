import { _decorator, Component, Node, Prefab, instantiate, Sprite, SpriteFrame, UITransform, Size } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BoardManager')
export class BoardManager extends Component {

    @property(Prefab) itemPrefab: Prefab = null; 
    @property(Prefab) cellPrefab: Prefab = null; // 【新增】地砖模具

    @property([SpriteFrame]) itemIcons: SpriteFrame[] = []; 

    @property itemSize: number = 85; 

    // 两个容器
    @property(Node) bgLayer: Node = null;   
    @property(Node) itemLayer: Node = null;

    levelMap: number[][] = [
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ];

    start() {
        this.generateBoard();
    }

    generateBoard() {
        let rows = this.levelMap.length;
        let cols = this.levelMap[0].length;
        let boardWidth = cols * this.itemSize;
        let boardHeight = rows * this.itemSize;
        let startX = -boardWidth / 2 + this.itemSize / 2;
        let startY = boardHeight / 2 - this.itemSize / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.levelMap[r][c] === 1) {
                    // 1. 先生成地砖
                    this.createCell(c, r, startX, startY);
                    // 2. 再生成糖果
                    this.createItem(c, r, startX, startY);
                }
            }
        }
    }

    createCell(col: number, row: number, startX: number, startY: number) {
        let node = instantiate(this.cellPrefab);
        this.bgLayer.addChild(node); // 【重点】放到背景层

        let transform = node.getComponent(UITransform);
        transform.setContentSize(new Size(this.itemSize, this.itemSize)); // 稍微大一点点也可以，防止有缝隙

        let posX = startX + col * this.itemSize;
        let posY = startY - row * this.itemSize;
        node.setPosition(posX, posY);
    }

    createItem(col: number, row: number, startX: number, startY: number) {
        let node = instantiate(this.itemPrefab);
        this.itemLayer.addChild(node); // 【重点】放到糖果层

        let transform = node.getComponent(UITransform);
        transform.setContentSize(new Size(this.itemSize, this.itemSize));

        let posX = startX + col * this.itemSize;
        let posY = startY - row * this.itemSize;
        node.setPosition(posX, posY);

        let randomIdx = Math.floor(Math.random() * this.itemIcons.length);
        node.getComponent(Sprite).spriteFrame = this.itemIcons[randomIdx];
        
        node['row'] = row;
        node['col'] = col;
        node.name = `Item_${row}_${col}`;
    }
}
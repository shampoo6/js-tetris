// 参考：https://qastack.cn/gamedev/17974/how-to-rotate-blocks-in-tetris

// 正方形砖块
class Block {
    shape
    // 画布
    ctx
    size
    // 相对游戏显示区域左上角为原点的坐标
    position = {
        x: 0,
        y: 0
    }
    bgColor
    border = {}

    constructor(shape, ctx, position, size, bgColor, border) {
        this.shape = shape
        this.ctx = ctx
        const {x, y} = position
        this.position.x = x || 0
        this.position.y = y || 0
        this.size = size
        this.bgColor = bgColor ? bgColor : '#f00'
        const {color, width} = border
        this.border.color = color ? color : '#fff'
        this.border.width = width || 3
    }

    render() {
        const p = this.getDrawPoint()
        this.ctx.fillStyle = this.bgColor
        this.ctx.fillRect(p.x, p.y, this.size, this.size)
        this.ctx.strokeStyle = this.border.color
        this.ctx.lineWidth = this.border.width
        this.ctx.strokeRect(p.x, p.y, this.size, this.size)
    }

    // 获取绘图坐标点
    getDrawPoint() {
        return {
            x: this.position.x * this.size,
            y: this.position.y * this.size
        }
    }
}

// 多边形砖块
class Shape {
    ctx
    size
    blocks = []
    bgColor
    border = {}
    position
    nextPosition
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = []
    // 当前的旋转状态 rotateState 的索引值
    currentRotateIndex = 0

    constructor(ctx, size, bgColor, border) {
        this.ctx = ctx
        this.size = size
        this.bgColor = bgColor ? bgColor : '#f00'
        const {color, width} = border
        this.border.color = color ? color : '#fff'
        this.border.width = width || 3
    }

    render() {
        this.blocks.forEach(block => {
            block.render()
        })
    }

    // 生成砖块
    generateBlock(origin) {
        this.position = origin
        this.nextPosition = {
            x: this.position.x - 3,
            y: this.position.y + 2
        }
        let rotateState = this.rotateState[0]
        for (let i = 0; i < rotateState.length; i++) {
            let point = rotateState[i]
            this.blocks.push(
                new Block(this, this.ctx, {
                    x: this.position.x + point.x,
                    y: this.position.y + point.y
                }, this.size, this.bgColor, this.border)
            )
        }
    }

    // allBlocks: 所有砖块
    // direction: 一个方向向量，p{x, y}
    // 返回 true 碰撞；否则未碰撞
    collision(allBlocks, direction) {
        // 寻找需要碰撞检测的blocks
        const xBlocks = findNeedCheckXBlocks(this.blocks, direction.x)
        const yBlocks = findNeedCheckYBlocks(this.blocks, direction.y)

        let xBlocked = false
        let yBlocked = false
        xBlocks.every(xBlock => {
            // 查看是否在边缘了
            if ((direction.x > 0 && xBlock.position.x + direction.x >= config.monitor.w) || (direction.x < 0 && xBlock.position.x + direction.x < 0)) {
                xBlocked = true
                return false
            }

            // 查找有东西没
            let target = allBlocks[xBlock.position.x + direction.x][xBlock.position.y]
            if (target) {
                xBlocked = true
                return false
            }
            return true
        })
        yBlocks.every(yBlock => {
            // 查看是否在边缘了
            if ((direction.y > 0 && yBlock.position.y + direction.y >= config.monitor.h)) {
                yBlocked = true
                return false
            }

            // 查找有东西没
            let target = allBlocks[yBlock.position.x][yBlock.position.y + direction.y]
            if (target) {
                yBlocked = true
                return false
            }
            return true
        })

        return {
            xBlocked,
            yBlocked,
            blocked: xBlocked || yBlocked
        }

        function findNeedCheckXBlocks(blocks, speedX) {
            if (speedX === 0) return []
            let result = []
            let temp = {} // 用于保存每一行的最右边或最左边的砖块
            blocks.forEach(block => {
                if (speedX > 0) {
                    let b = temp[block.position.y]
                    // 找到最右边的那个砖块
                    if (!b) temp[block.position.y] = block
                    else if (b && b.position.x < block.position.x) temp[block.position.y] = block
                } else {
                    let b = temp[block.position.y]
                    // 找到最左边的那个砖块
                    if (!b) temp[block.position.y] = block
                    else if (b && b.position.x > block.position.x) temp[block.position.y] = block
                }
            })
            for (let key in temp) {
                result.push(temp[key])
            }
            return result
        }

        function findNeedCheckYBlocks(blocks, speedY) {
            if (speedY === 0) return []
            let result = []
            let temp = {} // 用于保存每一行的最右边或最左边的砖块
            blocks.forEach(block => {
                if (speedY > 0) {
                    let b = temp[block.position.x]
                    // 找到最右边的那个砖块
                    if (!b) temp[block.position.x] = block
                    else if (b && b.position.y < block.position.y) temp[block.position.x] = block
                }
            })
            for (let key in temp) {
                result.push(temp[key])
            }
            return result
        }
    }

    // 移动
    // direction: 方向向量
    move(direction) {
        this.position.x += direction.x
        this.position.y += direction.y
        let currentState = this.rotateState[this.currentRotateIndex]
        for (let i = 0; i < currentState.length; i++) {
            let point = currentState[i]
            this.blocks[i].position.x = this.position.x + point.x
            this.blocks[i].position.y = this.position.y + point.y
        }
    }

    // 返回值为 true 说明已经被删空了
    removeBlock(block) {
        this.blocks = this.blocks.filter(b => {
            return b !== block
        })
        return this.blocks.length === 0
    }

    // 旋转
    // lg：GameLogic对象
    rotate(lg) {
        // 移出占位
        lg.removeBlocks(this.blocks)
        // 查看旋转后是否不会被碰撞
        let nextRotateIndex = (this.currentRotateIndex + 1) % this.rotateState.length
        let nextState = this.rotateState[nextRotateIndex]

        // 创建旋转后的block对象用于检测是否被阻挡
        let blockPositions = []
        for (let i = 0; i < nextState.length; i++) {
            let point = nextState[i]
            blockPositions.push({
                position: {
                    x: this.position.x + point.x,
                    y: this.position.y + point.y
                }
            })
        }

        // 若旋转后被阻挡
        if (lg.isBlocked(blockPositions)) {
            // 回滚状态
            lg.setBlocks(this.blocks)
        } else {
            // 设置新的位置
            for (let i = 0; i < nextState.length; i++) {
                let point = nextState[i]
                let block = this.blocks[i]
                block.position.x = this.position.x + point.x
                block.position.y = this.position.y + point.y
            }
            this.currentRotateIndex = nextRotateIndex
            lg.setBlocks(this.blocks)
        }
    }

    setContext(ctx) {
        this.ctx = ctx
        this.blocks.forEach(block => {
            block.ctx = this.ctx
        })
    }

    updateBlockPosition() {
        for (let i = 0; i < this.blocks.length; i++) {
            let block = this.blocks[i]
            let p = this.rotateState[this.currentRotateIndex][i]
            block.position.x = this.position.x + p.x
            block.position.y = this.position.y + p.y
        }
    }
}

// 字母形状的砖块
class I extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -2, y: -1}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}],
        [{x: 0, y: -2}, {x: 0, y: -1}, {x: 0, y: 0}, {x: 0, y: 1}],
        [{x: -2, y: 0}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}],
        [{x: -1, y: -2}, {x: -1, y: -1}, {x: -1, y: 0}, {x: -1, y: 1}],
    ]

    constructor(ctx, size) {
        super(ctx, size, '#00ffff', {color: '#fff', width: 3})
        this.generateBlock({x: 5, y: 0})
    }
}

class S extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: -1.5}, {x: 0.5, y: -1.5}],
        [{x: -0.5, y: -0.5}, {x: -0.5, y: -1.5}, {x: 0.5, y: -0.5}, {x: 0.5, y: 0.5}],
        [{x: -1.5, y: 0.5}, {x: -0.5, y: 0.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}],
        [{x: -1.5, y: -1.5}, {x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}],
    ]

    constructor(ctx, size) {
        super(ctx, size, '#0f0', {color: '#fff', width: 3})
        this.generateBlock({x: 4.5, y: -0.5})
    }
}

class J extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -1.5, y: -1.5}, {x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}],
        [{x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}, {x: 0.5, y: -1.5}],
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}, {x: 0.5, y: 0.5}],
        [{x: -1.5, y: 0.5}, {x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}],
    ]

    constructor(ctx, size) {
        super(ctx, size, '#0000ff', {color: '#fff', width: 3})
        this.generateBlock({x: 4.5, y: -0.5})
    }
}

class L extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -1.5}, {x: 0.5, y: -0.5}],
        [{x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}, {x: 0.5, y: 0.5}],
        [{x: -1.5, y: -0.5}, {x: -1.5, y: 0.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}],
        [{x: -1.5, y: -1.5}, {x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}],
    ]

    constructor(ctx, size) {
        super(ctx, size, '#ffaa00', {color: '#fff', width: 3})
        this.generateBlock({x: 4.5, y: -0.5})
    }
}

class O extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 0, y: 0}],
        [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 0, y: 0}],
        [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 0, y: 0}],
        [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 0, y: 0}]
    ]

    constructor(ctx, size) {
        super(ctx, size, '#ffff11', {color: '#fff', width: 3})
        this.generateBlock({x: 5, y: -1})
    }
}

class T extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}],
        [{x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}, {x: 0.5, y: -0.5}],
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}, {x: 0.5, y: -0.5}],
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}]
    ]

    constructor(ctx, size) {
        super(ctx, size, '#9900ff', {color: '#fff', width: 3})
        this.generateBlock({x: 4.5, y: -0.5})
    }
}

class Z extends Shape {
    // 旋转状态，描述 shape 0 90 180 270 度 时的相对坐标
    // 相对参考当前 shape 的 position
    rotateState = [
        [{x: -1.5, y: -1.5}, {x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}],
        [{x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}, {x: 0.5, y: -1.5}, {x: 0.5, y: -0.5}],
        [{x: -1.5, y: -0.5}, {x: -0.5, y: -0.5}, {x: -0.5, y: 0.5}, {x: 0.5, y: 0.5}],
        [{x: -1.5, y: -0.5}, {x: -1.5, y: 0.5}, {x: -0.5, y: -1.5}, {x: -0.5, y: -0.5}]
    ]

    constructor(ctx, size) {
        super(ctx, size, '#ff0000', {color: '#fff', width: 3})
        this.generateBlock({x: 4.5, y: -0.5})
    }
}
// 注意：
// 创建shape对象，其初始位置一定在屏幕外
class GameLogic {
    config
    ctx
    noticeCtx
    blocks
    shapes = []
    preShapes

    // 当前操作的shape
    currentShape
    // 下一个shape
    nextShape
    // 动画当前时间
    currentTime = 0
    // 用户输入
    input = {
        x: 0,
        y: 0,
        turn: false
    }

    needRender = false
    timer

    constructor(config, ctx, noticeCtx) {
        this.config = config
        this.ctx = ctx
        this.noticeCtx = noticeCtx
        this.blocks = []
        for (let x = 0; x < config.monitor.w; x++) {
            this.blocks.push([])
            for (let y = 0; y < config.monitor.h; y++) {
                this.blocks[x].push(null)
            }
        }
        this.createPreShapes()
        this.bindInput()

    }

    // 创建预制件
    createPreShapes() {
        this.preShapes = []
        this.preShapes.push(() => {
            return new I(this.ctx, this.config.block.size)
        })
        this.preShapes.push(() => {
            return new S(this.ctx, this.config.block.size)
        })
        this.preShapes.push(() => {
            return new J(this.ctx, this.config.block.size)
        })
        this.preShapes.push(() => {
            return new L(this.ctx, this.config.block.size)
        })
        this.preShapes.push(() => {
            return new O(this.ctx, this.config.block.size)
        })
        this.preShapes.push(() => {
            return new T(this.ctx, this.config.block.size)
        })
        this.preShapes.push(() => {
            return new Z(this.ctx, this.config.block.size)
        })
    }

    // 绑定输入
    bindInput() {
        document.body.addEventListener('keydown', ev => {
            // 重置输入
            this.resetInput()

            switch (ev.key) {
                case this.config.control.left:
                    this.input.x = -1
                    break
                case this.config.control.right:
                    this.input.x = 1
                    break
                case this.config.control.down:
                    this.input.y = 1
                    break
                case this.config.control.turn:
                    this.input.turn = true
                    break
                default:
                    break
            }
        })
    }

    // 随机创建一个shape
    generateShape() {
        let i = Math.floor(Math.random() * this.preShapes.length * 10000) % this.preShapes.length
        // this.currentShape = this.preShapes[i]()
        // this.registerShape(this.currentShape)

        return this.preShapes[i]()
    }

    getNextShape() {
        this.currentShape = this.nextShape
        this.registerShape(this.currentShape)
        this.nextShape = this.generateShape()
        this.renderNotice()
    }

    // 注册已经创建的shape
    registerShape(shape) {
        this.shapes.push(shape)
    }

    unregisterShape(shape) {
        this.shapes = this.shapes.filter(s => {
            return s !== shape
        })
    }

    render() {
        this.ctx.clearRect(0, 0, this.config.monitor.w * this.config.block.size, this.config.monitor.h * this.config.block.size)
        this.shapes.forEach(shape => {
            shape.render()
        })
    }

    renderNotice() {
        this.noticeCtx.clearRect(0, 0, 4 * this.config.block.size, 4 * this.config.block.size)
        this.nextShape.setContext(this.noticeCtx)
        let p = this.nextShape.position
        this.nextShape.position = this.nextShape.nextPosition
        this.nextShape.updateBlockPosition()
        this.nextShape.render()
        this.nextShape.position = p
        this.nextShape.updateBlockPosition()
        this.nextShape.setContext(this.ctx)
    }

    start() {
        // 创建shape
        this.currentShape = this.generateShape()
        this.registerShape(this.currentShape)
        this.nextShape = this.generateShape()
        this.renderNotice()

        slc.startLevel = this.config.game.startLevel

        // 开启计时
        this.timer = setInterval(() => {

            this.update()

        }, 20)
    }

    update() {
        // 输入检测
        let direction = {x: this.input.x, y: this.input.y}
        let isTurn = this.input.turn
        let downPressed = this.input.y !== 0
        this.resetInput()

        // 计算旋转
        if (isTurn) {
            this.currentShape.rotate(this)
            return
        }

        // 判断是否应该给y轴添加向下的速度
        // 若不是手动点击下，则自动下坠计时
        if (!downPressed) {
            this.currentTime += 20
            if (this.currentTime >= config.game.speed - 0 * this.config.game.perLevelSpeedUp) {
                this.currentTime = 0
                direction.y = 1
            }
        } else {
            this.currentTime = 0
        }
        // 碰撞检测
        const collisionR = this.currentShape.collision(this.blocks, direction)
        if (collisionR.xBlocked) direction.x = 0
        if (collisionR.yBlocked) {
            // 结束游戏判断
            if (this.gameOver()) return
            // shape 放置得分
            slc.getScore('block')
            // 消除扫描
            this.scanRemove()

            this.getNextShape()
            direction.y = 0
        }
        // 移动
        if (!collisionR.xBlocked || !collisionR.yBlocked) {
            this.refreshShapePosition(direction)
            this.needRender = true
        }

        if (this.needRender) {
            this.needRender = false
            this.render()
        }
    }

    // 更新 shape 坐标
    refreshShapePosition(direction) {
        this.removeBlocks(this.currentShape.blocks)

        // 坐标移动
        this.currentShape.move(direction)

        this.setBlocks(this.currentShape.blocks)
    }

    // 移出当前shape在blocks中的占位
    removeBlocks(blocks) {
        blocks.forEach(block => {
            // 判断block是否在屏幕中
            if (block.position.x >= 0 &&
                block.position.x < config.monitor.w &&
                block.position.y >= 0 &&
                block.position.y < config.monitor.h
            ) {
                // 清空屏幕中的block
                this.blocks[block.position.x][block.position.y] = null
            }
        })
    }

    // 设置 blocks 的占位
    setBlocks(blocks) {
        blocks.forEach(block => {
            // 判断block是否在屏幕中
            if (block.position.x >= 0 &&
                block.position.x < config.monitor.w &&
                block.position.y >= 0 &&
                block.position.y < config.monitor.h
            ) {
                // 在屏幕中就添加block占位
                this.blocks[block.position.x][block.position.y] = block
            }
        })
    }

    // 判断是否被阻挡
    isBlocked(blocks) {
        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i]
            // 越界判断
            if (block.position.x < 0 ||
                block.position.x >= config.monitor.w ||
                block.position.y >= config.monitor.h
            ) return true
            if (this.blocks[block.position.x][block.position.y]) return true
        }
        return false
    }

    resetInput() {
        this.input.x = 0
        this.input.y = 0
        this.input.turn = false
    }

    // 消除block
    scanRemove() {
        let needRemoveBlock = []

        for (let y = this.config.monitor.h - 1; y >= 0; y--) {
            let remove = true
            for (let x = 0; x < this.config.monitor.w; x++) {
                if (!this.blocks[x][y]) { // 若一行中有空隙则扫描下一行
                    remove = false
                    break
                }
            }
            if (remove) {
                // 记录需要删除的block的纵坐标
                needRemoveBlock.push(y)
            }
        }

        if (needRemoveBlock.length > 0) {
            // 扫描结束，删除block
            needRemoveBlock.forEach(y => {
                for (let x = 0; x < this.config.monitor.w; x++) {
                    let block = this.blocks[x][y]
                    this.blocks[x][y] = null
                    if (block.shape.removeBlock(block)) {
                        this.unregisterShape(block.shape)
                    }
                }
            })


            downBlock(this.blocks, this.config.monitor.h - 1, this.config.monitor.w, this.config.monitor.h)

            // 得分
            slc.getScore('score' + needRemoveBlock.length)
        }

        // 砖块下坠
        function downBlock(blocks, y, w, h) {
            // 找到空行开始的y坐标和连续空行结束的y坐标
            let startY, endY

            for (let y = h - 1; y >= 0; y--) {
                let empty = true
                for (let x = 0; x < w; x++) {
                    if (blocks[x][y]) {
                        empty = false
                        break
                    }
                }
                if (empty && startY === undefined) startY = y
                if (!empty && startY !== undefined) endY = y
                if (startY !== undefined && endY !== undefined) break
            }

            // 判断是否扫描结束
            if (startY === undefined || endY === undefined) return

            // 根据空行数，下降剩余砖块的高度
            let lines = startY - endY // 下降多少行
            for (let y = endY; y >= 0; y--) {
                for (let x = 0; x < w; x++) {
                    let block = blocks[x][y]
                    if (block) {
                        blocks[x][y] = null
                        block.position.y = y + lines
                        blocks[x][block.position.y] = block
                    }
                }
            }

            downBlock(blocks, y, w, h)
        }
    }

    // 游戏结束判断
    gameOver() {
        for (let i = 0; i < this.currentShape.blocks.length; i++) {
            let block = this.currentShape.blocks[i]
            if (block.position.y < 0) {
                clearInterval(this.timer)
                alert('游戏结束')
                return true
            }
        }
        return false
    }
}
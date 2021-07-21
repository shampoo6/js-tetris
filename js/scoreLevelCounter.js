// 计分和等级计算器
class ScoreLevelCounter {
    scoreTxt
    levelTxt
    scoreRule
    levelUpScore
    currentScore = 0
    level = 0 // 当前等级
    startLevel // 初始等级

    constructor(config, scoreTxt, levelTxt) {
        this.scoreRule = Object.assign({}, config.game.scores)
        this.levelUpScore = config.game.levelUpScore
        this.scoreTxt = scoreTxt
        this.levelTxt = levelTxt
    }

    // key 得分规则中的种类
    getScore(key) {
        const score = this.scoreRule[key]
        this.currentScore += score
        this.level = this.startLevel + Math.floor(this.currentScore / this.levelUpScore)

        this.scoreTxt.innerText = this.currentScore
        this.levelTxt.innerText = this.level
    }
}
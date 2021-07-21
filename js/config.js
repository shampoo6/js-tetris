const config = {
    monitor: {
        w: 10,
        h: 20
    },
    block: {
        size: 30,
        borderColor: '#fff'
    },
    game: {
        startLevel: 0, // 初始等级
        speed: 1000, // 下落速度
        perLevelSpeedUp: 100, // 每升一级减少的下落时间
        levelUpScore: 2500, // 每次升级的分数
        scores: {
            block: 10, // 放置一个shape的得分
            score1: 100, // 一次消除一行的得分
            score2: 200,
            score3: 400,
            score4: 800
        }
    },
    control: {
        // up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
        turn: ' '
    }
}
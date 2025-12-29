/**
 * 五子棋Alpha-Beta剪枝AI算法
 * 包含启发式评估函数、棋型识别、博弈树搜索
 */

class GomokuAI {
    constructor(settings = {}) {
        // 默认设置
        this.settings = {
            searchDepth: settings.searchDepth || 6,
            candidateCount: settings.candidateCount || 10,
            searchRange: settings.searchRange || 2,
            boardSize: 15,
            patternWeights: {
                liveFive: 100000,
                liveFour: 5000,
                deadFour: 400,
                liveThree: 400,
                deadThree: 20,
                liveTwo: 10,
                deadTwo: 5,
                opponentThreat: -0.8  // 对手威胁权重系数
            },
            ...settings

            
        };
        
        this.boardSize = this.settings.boardSize;
        this.searchNodes = 0;  // 搜索节点计数
        this.pruningCount = 0; // 剪枝计数
        this.logs = [];        // 搜索日志

        this.patterns = [
            // --- 连五 ---
            { regex: /11111/, type: 'liveFive' },
            
            // --- 活四 (两头空) ---
            { regex: /011110/, type: 'liveFour' },
            
            // --- 冲四/眠四 (一头堵 或 跳四) ---
            // 011112, 211110, 10111, 11011, 11101
            { regex: /011112|211110|10111|11011|11101/, type: 'deadFour' },
            
            // --- 活三 (两头空，允许中间跳一格) ---
            // 01110 (标准), 010110 (跳), 011010 (跳)
            { regex: /01110|010110|011010/, type: 'liveThree' },
            
            // --- 眠三 (一头堵) ---
            // 001112, 010112, 011012, 10011, 10101, 2011102... 简化处理
            { regex: /001112|211100|010112|211010|011012|210110|10011|11001|10101/, type: 'deadThree' },
            
            // --- 活二 ---
            { regex: /001100|01100|00110|01010|010010/, type: 'liveTwo' }
        ];
    }

    /**
     * 主搜索函数 - Alpha-Beta剪枝
     * @param {Array} board - 当前棋盘状态
     * @param {Number} player - 当前玩家 (1=黑, 2=白)
     * @returns {Object} - 最佳落子和相关信息
     */
    findBestMove(board, player) {
        this.searchNodes = 0;
        this.pruningCount = 0;
        this.logs = [];
        
        const startTime = Date.now();
        
        // 生成候选着点
        const candidates = this.generateCandidateMoves(board, player);
        this.log(`生成了 ${candidates.length} 个候选着点`);
        
        if (candidates.length === 0) {
            return null;
        }
        
        let bestMove = null;
        let bestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;
        
        // 对每个候选点进行搜索
        for (const move of candidates) {
            const [row, col] = move;
            
            // 模拟落子
            board[row][col] = player;
            
            // Alpha-Beta搜索
            const score = -this.alphaBetaSearch(
                board, 
                this.settings.searchDepth - 1, 
                -beta, 
                -alpha, 
                3 - player  // 切换玩家
            );
            
            // 撤销落子
            board[row][col] = 0;
            
            this.log(`评估位置 (${row}, ${col}): 得分 ${score}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
                alpha = score;
            }
        }
        
        const searchTime = Date.now() - startTime;
        this.log(`搜索完成: 最佳位置 ${bestMove}, 得分 ${bestScore}, 耗时 ${searchTime}ms, 搜索节点 ${this.searchNodes}, 剪枝 ${this.pruningCount}`);
        
        return {
            move: bestMove,
            score: bestScore,
            searchNodes: this.searchNodes,
            pruningCount: this.pruningCount,
            searchTime: searchTime,
            logs: this.logs
        };
    }

    /**
     * Alpha-Beta剪枝搜索
     */
    alphaBetaSearch(board, depth, alpha, beta, player) {
        this.searchNodes++;
        
        // 叶子节点或游戏结束
        if (depth === 0) {
            return this.evaluateBoard(board, player);
        }
        
        // 检查胜负
        const winner = this.checkWinner(board);
        if (winner === player) {
            return 10000 + depth;  // 胜利，加上深度优先
        } else if (winner === 3 - player) {
            return -10000 - depth; // 失败，减去深度优先
        }
        
        // 生成候选着点
        const candidates = this.generateCandidateMoves(board, player);
        
        if (candidates.length === 0) {
            return 0; // 平局
        }
        
        let maxScore = -Infinity;
        
        for (const move of candidates) {
            const [row, col] = move;
            
            // 模拟落子
            board[row][col] = player;
            
            // 递归搜索
            const score = -this.alphaBetaSearch(
                board,
                depth - 1,
                -beta,
                -alpha,
                3 - player
            );
            
            // 撤销落子
            board[row][col] = 0;
            
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            
            // Beta剪枝
            if (alpha >= beta) {
                this.pruningCount++;
                break;
            }
        }
        
        return maxScore;
    }

    

    /**
     * 启发式评估函数
     */
    evaluateBoard(board, player) {
        // 获取所有线上的棋型得分
        // 1 = 己方, 2 = 敌方
        // 计算时：eval(1) - eval(2) * threat_weight
        
        const myScore = this.evaluatePatternsForPlayer(board, player);
        const opponentScore = this.evaluatePatternsForPlayer(board, 3 - player);
        
        return myScore - opponentScore * this.settings.patternWeights.opponentThreat;
    }

    /**
     * 生成候选着点
     */
    generateCandidateMoves(board, player) {
        const moves = [];
        const moveScores = new Map();
        
        // 遍历棋盘
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== 0) continue;
                
                // 检查是否在搜索范围内（周围有棋子）
                if (!this.hasNearbyPieces(board, row, col, this.settings.searchRange)) {
                    continue;
                }
                
                // 快速评估这个位置
                const score = this.quickEvaluatePosition(board, row, col, player);
                moveScores.set(`${row},${col}`, score);
                moves.push([row, col]);
            }
        }
        
        // 按分数排序，取前N个
        moves.sort((a, b) => {
            const scoreA = moveScores.get(`${a[0]},${a[1]}`);
            const scoreB = moveScores.get(`${b[0]},${b[1]}`);
            return scoreB - scoreA;
        });
        
        return moves.slice(0, this.settings.candidateCount);
    }

    /**
     * 快速评估单个位置
     */
    quickEvaluatePosition(board, row, col, player) {
        board[row][col] = player;
        let score = 0;
        
        // 扫描经过该点的4个方向
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dx, dy] of directions) {
            const lineStr = this.getLineString(board, row, col, dx, dy, player);
            score += this.calculateLineScore(lineStr);
        }
        
        // 同时也评估一下是否阻断了对手
        const opponent = 3 - player;
        for (const [dx, dy] of directions) {
            // 注意：这里需要假设该位置是对手的，生成的LineString要把当前位置视为对手
            // 为了性能，简单近似：获取如果是对手落子的棋型分
            const lineStr = this.getLineString(board, row, col, dx, dy, opponent, true); 
            score += this.calculateLineScore(lineStr) * 0.8; 
        }

        board[row][col] = 0;
        return score;
    }

    evaluatePatternsForPlayer(board, player) {
        let totalScore = 0;
        
        // 扫描所有行
        for (let i = 0; i < this.boardSize; i++) {
            totalScore += this.calculateLineScore(this.getRowString(board, i, player));
        }
        // 扫描所有列
        for (let i = 0; i < this.boardSize; i++) {
            totalScore += this.calculateLineScore(this.getColString(board, i, player));
        }
        // 扫描所有对角线
        const diags = this.getAllDiagonals(board, player);
        for (const dStr of diags) {
            totalScore += this.calculateLineScore(dStr);
        }
        
        return totalScore;
    }
    /**
     * 计算单行字符串的分数
     * 字符串格式说明：'2011102' (2=边界/敌方, 0=空, 1=己方)
     */
    calculateLineScore(lineStr) {
        let score = 0;
        // 必须按优先级匹配：长连 -> 活四 -> 眠四 -> 活三 ...
        // 匹配到一个后，最好将其替换掉以免重复计算，或者简单累加
        
        for (const pattern of this.patterns) {
            const matches = lineStr.match(pattern.regex);
            if (matches) {
                // 如果发现高等级棋型，直接加分。
                // 简单的实现：同一行可能有多个棋型，比如 11011 (眠四) ... 01110 (活三)
                // 使用 while 循环查找所有匹配
                let tempStr = lineStr;
                while (true) {
                    const match = tempStr.match(pattern.regex);
                    if (!match) break;
                    
                    score += this.settings.patternWeights[pattern.type];
                    // 破坏掉匹配到的部分，防止被低级规则重复匹配 (例如 011110 既是活四也是眠四)
                    // 替换策略：将匹配到的 '1' 变成 'x'
                    const matchedPart = match[0];
                    const processedPart = matchedPart.replace(/1/g, 'x'); 
                    tempStr = tempStr.replace(matchedPart, processedPart);
                }
            }
        }
        return score;
    }

    /**
     * 获取某一行的标准化字符串
     * @param {Boolean} forceCenterAsPlayer 用于quickEvaluate，强制让中心点变成己方
     */
    getLineString(board, r, c, dr, dc, player, forceCenterAsPlayer = false) {
        let str = "";
        const opponent = 3 - player;
        
        // 向前寻找起点 (为了性能，不必全盘扫，只扫局部范围例如前后各5格，或者扫全线)
        // 这里为了准确性扫全线，或者扫半径4
        let minK = -4, maxK = 4;
        
        // 边界保护
        while (r + minK * dr < 0 || r + minK * dr >= this.boardSize || c + minK * dc < 0 || c + minK * dc >= this.boardSize) minK++;
        while (r + maxK * dr < 0 || r + maxK * dr >= this.boardSize || c + maxK * dc < 0 || c + maxK * dc >= this.boardSize) maxK--;

        for (let k = minK; k <= maxK; k++) {
            const row = r + k * dr;
            const col = c + k * dc;
            
            if (k === 0 && forceCenterAsPlayer) {
                str += "1";
            } else {
                const val = board[row][col];
                if (val === player) str += "1";
                else if (val === 0) str += "0";
                else str += "2"; // 敌方
            }
        }
        // 两端加上边界 '2'，方便正则匹配
        return "2" + str + "2";
    }

    getRowString(board, row, player) {
        let str = "2"; // 边界
        for (let col = 0; col < this.boardSize; col++) {
            const val = board[row][col];
            str += (val === player ? "1" : (val === 0 ? "0" : "2"));
        }
        return str + "2";
    }

    getColString(board, col, player) {
        let str = "2";
        for (let row = 0; row < this.boardSize; row++) {
            const val = board[row][col];
            str += (val === player ? "1" : (val === 0 ? "0" : "2"));
        }
        return str + "2";
    }

    getAllDiagonals(board, player) {
        const diags = [];
        const size = this.boardSize;
        
        // 主对角线 (左上到右下)
        // k = row - col. 范围 -(size-1) 到 (size-1)
        // 只需扫描长度 >= 5 的线
        for (let k = -(size - 5); k <= (size - 5); k++) {
            let str = "2";
            for (let row = 0; row < size; row++) {
                const col = row - k;
                if (col >= 0 && col < size) {
                    const val = board[row][col];
                    str += (val === player ? "1" : (val === 0 ? "0" : "2"));
                }
            }
            diags.push(str + "2");
        }

        // 副对角线 (左下到右上)
        // k = row + col. 范围 4 到 2*(size-1)-4
        for (let k = 4; k <= 2 * (size - 1) - 4; k++) {
            let str = "2";
            for (let row = 0; row < size; row++) {
                const col = k - row;
                if (col >= 0 && col < size) {
                    const val = board[row][col];
                    str += (val === player ? "1" : (val === 0 ? "0" : "2"));
                }
            }
            diags.push(str + "2");
        }
        return diags;
    }

    /**
     * 检查位置周围是否有棋子
     */
    hasNearbyPieces(board, row, col, range) {
        const startRow = Math.max(0, row - range);
        const endRow = Math.min(this.boardSize - 1, row + range);
        const startCol = Math.max(0, col - range);
        const endCol = Math.min(this.boardSize - 1, col + range);
        
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (board[r][c] !== 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 检测所有棋型
     */
    detectAllPatterns(board, player) {
        const patterns = {
            liveFive: 0,
            liveFour: 0,
            deadFour: 0,
            liveThree: 0,
            deadThree: 0,
            liveTwo: 0,
            deadTwo: 0
        };
        
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 主对角线
            [1, -1]   // 副对角线
        ];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== player) continue;
                
                for (const [dx, dy] of directions) {
                    const pattern = this.detectPatternInDirection(board, row, col, dx, dy, player);
                    if (pattern) {
                        patterns[pattern]++;
                    }
                }
            }
        }
        
        return patterns;
    }

    /**
     * 检测特定位置的棋型
     */
    detectPositionPatterns(board, row, col, player) {
        const patterns = {
            liveFive: 0,
            liveFour: 0,
            deadFour: 0,
            liveThree: 0,
            deadThree: 0,
            liveTwo: 0,
            deadTwo: 0
        };
        
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            const pattern = this.detectPatternInDirection(board, row, col, dx, dy, player);
            if (pattern) {
                patterns[pattern]++;
            }
        }
        
        return patterns;
    }

    /**
     * 检测特定方向的棋型
     */
    detectPatternInDirection(board, row, col, dx, dy, player) {
        const opponent = 3 - player;
        let count = 1;  // 当前位置
        let blocked = 0; // 被阻挡次数
        
        // 正向检查
        let r = row + dx;
        let c = col + dy;
        while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize) {
            if (board[r][c] === player) {
                count++;
                r += dx;
                c += dy;
            } else {
                if (board[r][c] === opponent) {
                    blocked++;
                }
                break;
            }
        }
        
        // 反向检查
        r = row - dx;
        c = col - dy;
        while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize) {
            if (board[r][c] === player) {
                count++;
                r -= dx;
                c -= dy;
            } else {
                if (board[r][c] === opponent) {
                    blocked++;
                }
                break;
            }
        }
        
        // 识别棋型
        if (count >= 5) return 'liveFive';
        if (count === 4) {
            return blocked === 0 ? 'liveFour' : 'deadFour';
        }
        if (count === 3) {
            return blocked === 0 ? 'liveThree' : 'deadThree';
        }
        if (count === 2) {
            return blocked === 0 ? 'liveTwo' : 'deadTwo';
        }
        
        return null;
    }

    /**
     * 计算棋型分数
     */
    calculatePatternScore(patterns) {
        const weights = this.settings.patternWeights;
        let score = 0;
        
        score += patterns.liveFive * weights.liveFive;
        score += patterns.liveFour * weights.liveFour;
        score += patterns.deadFour * weights.deadFour;
        score += patterns.liveThree * weights.liveThree;
        score += patterns.deadThree * weights.deadThree;
        score += patterns.liveTwo * weights.liveTwo;
        score += patterns.deadTwo * weights.deadTwo;
        
        return score;
    }

    /**
     * 检查胜负
     */
    checkWinner(board) {
        // 检查黑子胜利
        if (this.hasFiveInARow(board, 1)) return 1;
        // 检查白子胜利
        if (this.hasFiveInARow(board, 2)) return 2;
        // 检查是否平局
        if (this.isBoardFull(board)) return 0;
        // 游戏继续
        return -1;
    }

    /**
     * 检查五子连珠
     */
    hasFiveInARow(board, player) {
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== player) continue;
                
                for (const [dx, dy] of directions) {
                    let count = 1;
                    let r = row + dx;
                    let c = col + dy;
                    
                    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                           board[r][c] === player) {
                        count++;
                        r += dx;
                        c += dy;
                    }
                    
                    if (count >= 5) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * 检查棋盘是否已满
     */
    isBoardFull(board) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 记录日志
     */
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push({
            timestamp,
            message,
            type: 'info'
        });
    }

    /**
     * 获取搜索日志
     */
    getLogs() {
        return this.logs;
    }

    /**
     * 清空日志
     */
    clearLogs() {
        this.logs = [];
    }
}

// 导出类
window.GomokuAI = GomokuAI;
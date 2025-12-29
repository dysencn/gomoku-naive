/**
 * 五子棋Alpha-Beta剪枝AI算法
 * 包含启发式评估函数、棋型识别、博弈树搜索
 */

class GomokuAI {
    constructor(settings = {}) {
        // 默认设置
        this.settings = {
            searchDepth: settings.searchDepth || 4,
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
        const opponent = 3 - player;
        let playerScore = 0;
        let opponentScore = 0;
        
        // 评估玩家棋型
        const playerPatterns = this.detectAllPatterns(board, player);
        playerScore = this.calculatePatternScore(playerPatterns);
        
        // 评估对手棋型
        const opponentPatterns = this.detectAllPatterns(board, opponent);
        opponentScore = this.calculatePatternScore(opponentPatterns);
        
        // 综合评分
        const totalScore = playerScore - opponentScore * Math.abs(this.settings.patternWeights.opponentThreat);
        
        return totalScore;
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
        let score = 0;
        const opponent = 3 - player;
        
        // 临时放置棋子评估
        board[row][col] = player;
        const playerPatterns = this.detectPositionPatterns(board, row, col, player);
        score += this.calculatePatternScore(playerPatterns) * 2;
        
        // 评估对手威胁
        board[row][col] = opponent;
        const opponentPatterns = this.detectPositionPatterns(board, row, col, opponent);
        score += this.calculatePatternScore(opponentPatterns);
        
        // 恢复
        board[row][col] = 0;
        
        return score;
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
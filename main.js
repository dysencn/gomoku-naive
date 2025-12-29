/**
 * 五子棋Alpha-Beta算法演示 - 主控制器
 * 包含游戏逻辑、UI控制、页面切换等功能
 */

class GomokuGame {
    constructor() {
        this.boardSize = 15;
        this.board = [];
        this.currentPlayer = 1; // 1=黑, 2=白
        this.gameOver = false;
        this.winner = null;
        this.moveHistory = [];
        this.aiThinking = false;
        
        // AI实例
        this.ai = null;
        
        // 默认设置
        this.defaultsettings = {
            searchDepth: 6,
            candidateCount: 10,
            searchRange: 2,
            patternWeights: {
                liveFive: 100000,
                liveFour: 100000,
                deadFour: 500,
                liveThree: 1000,
                deadThree: 100,
                liveTwo: 100,
                deadTwo: 10,
                opponentThreat: 1.2
            }
        };

        this.settings = structuredClone(this.defaultsettings);
        
        // 页面元素
        this.canvas = null;
        this.ctx = null;
        this.cellSize = 0;
        
        // 初始化
        this.init();
    }
    
    init() {
        this.initAI();
        this.initBoard();
        this.initCanvas();
        this.initEventListeners();
        this.render();
        this.showPage('game');
    }
    
    
    /**
     * 初始化AI
     */
    initAI() {
        this.ai = new GomokuAI(this.settings);
    }
    
    /**
     * 初始化棋盘数据
     */
    initBoard() {
        this.board = Array(this.boardSize).fill().map(() => 
            Array(this.boardSize).fill(0)
        );
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winner = null;
        this.moveHistory = [];
    }
    
    /**
     * 初始化Canvas
     */
    initCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        
        // 计算棋盘大小
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const size = Math.min(containerWidth, containerHeight, 600);
        
        this.canvas.width = size;
        this.canvas.height = size;
        this.cellSize = size / (this.boardSize + 1);
        
        // 设置高DPI
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
    }
    
    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // Canvas点击事件
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        }
        
        // 按钮事件
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 导航按钮
            if (target.matches('[data-page]')) {
                const page = target.dataset.page;
                this.showPage(page);
            }
            
            // 游戏控制按钮
            if (target.matches('#new-game-btn')) {
                this.newGame();
            }
            if (target.matches('#undo-btn')) {
                this.undoMove();
            }
            if (target.matches('#ai-search-btn')) {
                this.aiMove();
            }
            
            // 设置相关
            if (target.matches('#reset-settings-btn')) {
                this.resetSettings();
            }
            
            // 日志相关
            if (target.matches('#clear-logs-btn')) {
                this.clearLogs();
            }
            if (target.matches('#export-logs-btn')) {
                this.exportLogs();
            }
        });
        
        // 设置页面输入事件
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="number"]')) {
                this.updateSettingFromInput(e.target);
            }
            
            // 处理滑块的实时更新
            if (e.target.matches('input[type="range"]')) {
                this.updateSliderValue(e.target);
            }
        });
        
        // 窗口大小改变
        window.addEventListener('resize', () => {
            this.initCanvas();
            this.render();
        });
    }
    
    /**
     * 处理Canvas点击
     */
    handleCanvasClick(e) {
        if (this.gameOver || this.aiThinking) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.round(x / this.cellSize - 1);
        const row = Math.round(y / this.cellSize - 1);
        
        if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize && 
            this.board[row][col] === 0) {
            this.makeMove(row, col);
            this.updateGameStats();
        }
    }
    
    /**
     * 处理Canvas鼠标移动（悬停效果）
     */
    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.round(x / this.cellSize - 1);
        const row = Math.round(y / this.cellSize - 1);
        
        // 检查是否在有效位置
        const isValid = row >= 0 && row < this.boardSize && 
                       col >= 0 && col < this.boardSize && 
                       this.board[row][col] === 0 &&
                       !this.gameOver && !this.aiThinking;
        
        this.canvas.style.cursor = isValid ? 'pointer' : 'default';
        this.render(isValid ? [row, col] : null);
    }
    
    /**
     * 落子
     */
    makeMove(row, col) {
        if (this.gameOver || this.board[row][col] !== 0) return;
        
        this.board[row][col] = this.currentPlayer;
        this.moveHistory.push([row, col, this.currentPlayer]);
        
        // 检查胜负
        const winner = this.checkWinner();
        if (winner !== -1) {
            this.gameOver = true;
            this.winner = winner;
            this.showGameOverMessage(winner);
        } else {
            // 切换玩家
            this.currentPlayer = 3 - this.currentPlayer;
        }
        
        this.render();
    }
    
    /**
     * 更新游戏统计信息
     */
    updateGameStats() {
        // 更新当前玩家显示
        const currentPlayerDisplay = document.getElementById('current-player-display');
        const gameStatus = document.getElementById('game-status');
        
        if (currentPlayerDisplay) {
            currentPlayerDisplay.textContent = this.currentPlayer === 1 ? '黑子' : '白子';
        }
        
        if (gameStatus) {
            if (this.gameOver) {
                if (this.winner === 0) {
                    gameStatus.textContent = '游戏平局';
                } else {
                    gameStatus.textContent = this.winner === 1 ? '黑子胜利' : '白子胜利';
                }
            } else {
                gameStatus.textContent = this.currentPlayer === 1 ? '黑子落子' : '白子落子';
            }
        }
        
        // 更新统计数字
        const moveCount = document.getElementById('move-count');
        const blackCount = document.getElementById('black-count');
        const whiteCount = document.getElementById('white-count');
        
        if (moveCount) moveCount.textContent = this.moveHistory.length;
        if (blackCount) {
            const blackMoves = this.moveHistory.filter(move => move[2] === 1).length;
            blackCount.textContent = blackMoves;
        }
        if (whiteCount) {
            const whiteMoves = this.moveHistory.filter(move => move[2] === 2).length;
            whiteCount.textContent = whiteMoves;
        }
    }
    
    /**
     * AI落子
     */
    async aiMove() {
        if (this.gameOver || this.aiThinking) return;
        
        this.aiThinking = true;
        this.showThinkingAnimation(true);
        
        try {
            // 使用setTimeout让UI更新
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 调用AI搜索
            const result = this.ai.findBestMove(this.board, this.currentPlayer);
            
            if (result && result.move) {
                
                // 记录ai思考日志
                if (result.logs && Array.isArray(result.logs)) {
                    result.logs.forEach(innerLog => {
                        // 直接传入，addLog 会处理剩下的事情
                        this.addLog({
                            type: innerLog.type || 'info',
                            message: innerLog.message
                        });
                    });
                }

                const [row, col] = result.move;
                this.makeMove(row, col);
                
                // 更新落子日志
                this.addLog({
                    type: 'ai-move',
                    message: `AI落子: (${row}, ${col}), 得分: ${result.score}`,
                    data: result
                });
                
                this.updateGameStats();
                this.updateLogStats();
            }
        } catch (error) {
            console.error('AI搜索出错:', error);
            this.addLog({
                type: 'error',
                message: `AI搜索出错: ${error.message}`
            });
        } finally {
            this.aiThinking = false;
            this.showThinkingAnimation(false);
        }
    }
    
    /**
     * 撤销上一步
     */
    undoMove() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        const [row, col] = lastMove;
        
        this.board[row][col] = 0;
        this.currentPlayer = 3 - this.currentPlayer;
        this.gameOver = false;
        this.winner = null;
        
        this.updateGameStats();
        this.render();
    }
    
    /**
     * 新游戏
     */
    newGame() {
        this.initBoard();
        this.updateGameStats();
        this.render();
    }
    
    /**
     * 检查胜负
     */
    checkWinner() {
        return this.ai.checkWinner(this.board);
    }
    
    /**
     * 显示游戏结束消息
     */
    showGameOverMessage(winner) {
        let message = '';
        if (winner === 0) {
            message = '游戏平局！';
        } else if (winner === 1) {
            message = '黑子胜利！';
        } else if (winner === 2) {
            message = '白子胜利！';
        }
        
        // 使用自定义弹窗代替alert
        this.showModal(message);
        
        // 记录日志
        this.addLog({
            type: 'game-over',
            message: `游戏结束: ${message}`
        });
    }
    
    /**
     * 显示自定义弹窗
     */
    showModal(message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
                <h3 class="text-xl font-bold text-gray-800 mb-4">${message}</h3>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
                    确定
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    /**
     * 显示/隐藏思考动画
     */
    showThinkingAnimation(show) {
    const statusLabel = document.getElementById('game-status');
        if (!statusLabel) return;

        if (show) {
            // 1. AI 开始计算，修改文字并增加视觉效果
            statusLabel.innerText = "AI 思考中...";
            statusLabel.classList.add('text-orange-400', 'animate-pulse');
        } else {
            // 2. AI 思考结束，移除动画样式
            statusLabel.classList.remove('text-orange-400', 'animate-pulse');

            // 3. 关键点：根据当前的最新状态恢复文字
            // 因为在 finally 执行前，makeMove 已经切换了玩家，
            // 所以这里直接根据 this.currentPlayer 恢复即可。
            this.renderGameStatus(); 
        }
    }

    renderGameStatus() {
        const statusLabel = document.getElementById('game-status');
        if (!statusLabel) return;

        const playerText = this.currentPlayer === 1 ? '黑子落子' : '白子落子';
        statusLabel.innerText = playerText;
    }
    
    /**
     * 渲染棋盘
     */
    render(hoverPosition = null) {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const size = this.canvas.width / (window.devicePixelRatio || 1);
        const cellSize = this.cellSize;
        
        // 清空画布
        ctx.clearRect(0, 0, size, size);
        
        // 绘制棋盘背景
        this.drawBoardBackground(ctx, size);
        
        // 绘制网格
        this.drawGrid(ctx, size, cellSize);
        
        // 绘制棋子
        this.drawPieces(ctx, cellSize);

        this.drawLastMoveMarker(ctx, cellSize);
        
        // 绘制悬停效果
        if (hoverPosition) {
            this.drawHoverEffect(ctx, hoverPosition, cellSize);
        }
        
        // 绘制胜利连线
        if (this.gameOver && this.winner > 0) {
            this.drawWinningLine(ctx, cellSize);
        }
    }

    drawLastMoveMarker(ctx, cellSize) {
        if (this.moveHistory.length === 0) return;

        // 获取最后一步棋
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        const [row, col, player] = lastMove;

        const x = (col + 1) * cellSize;
        const y = (row + 1) * cellSize;

        // 绘制红点
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.15, 0, Math.PI * 2); // 半径为格子大小的10%
        ctx.fillStyle = '#ff4d4f'; // 漂亮的亮红色
        ctx.fill();

        // 给红点加一个微小的描边，防止在黑子上看不清（可选）
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    /**
     * 绘制棋盘背景
     */
    drawBoardBackground(ctx, size) {
        // 木质背景
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#d4af37');
        gradient.addColorStop(0.5, '#cd853f');
        gradient.addColorStop(1, '#d4af37');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // 添加纹理效果
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < size; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
        }
    }
    
    /**
     * 绘制网格
     */
    drawGrid(ctx, size, cellSize) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // 绘制横线
        for (let i = 0; i < this.boardSize; i++) {
            const y = (i + 1) * cellSize;
            ctx.beginPath();
            ctx.moveTo(cellSize, y);
            ctx.lineTo(size - cellSize, y);
            ctx.stroke();
        }
        
        // 绘制竖线
        for (let i = 0; i < this.boardSize; i++) {
            const x = (i + 1) * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, cellSize);
            ctx.lineTo(x, size - cellSize);
            ctx.stroke();
        }
        
        // 绘制天元和星位
        const starPoints = [
            [3, 3], [3, 11], [7, 7], [11, 3], [11, 11]
        ];
        
        ctx.fillStyle = '#333';
        for (const [row, col] of starPoints) {
            const x = (col + 1) * cellSize;
            const y = (row + 1) * cellSize;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * 绘制棋子
     */
    drawPieces(ctx, cellSize) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.board[row][col];
                if (piece === 0) continue;
                
                const x = (col + 1) * cellSize;
                const y = (row + 1) * cellSize;
                
                // 绘制棋子阴影
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                // 绘制棋子
                if (piece === 1) {
                    // 黑子
                    const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, cellSize * 0.4);
                    gradient.addColorStop(0, '#666');
                    gradient.addColorStop(1, '#000');
                    ctx.fillStyle = gradient;
                } else {
                    // 白子
                    const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, cellSize * 0.4);
                    gradient.addColorStop(0, '#fff');
                    gradient.addColorStop(1, '#ddd');
                    ctx.fillStyle = gradient;
                }
                
                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.4, 0, Math.PI * 2);
                ctx.fill();
                
                // 重置阴影
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }
    }
    
    /**
     * 绘制悬停效果
     */
    drawHoverEffect(ctx, [row, col], cellSize) {
        const x = (col + 1) * cellSize;
        const y = (row + 1) * cellSize;
        
        ctx.strokeStyle = this.currentPlayer === 1 ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    /**
     * 绘制胜利连线
     */
    drawWinningLine(ctx, cellSize) {
        // 这里可以添加检测五子连珠并绘制连线的逻辑
        // 简化实现，实际应该检测具体的连线位置
    }
    
    /**
     * 页面切换
     */
    showPage(pageName) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // 显示目标页面
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        // 更新导航状态
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeNav = document.querySelector(`[data-page="${pageName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
        
        // 页面特殊处理
        if (pageName === 'settings') {
            this.updateSettingsUI();
        } else if (pageName === 'logs') {
            this.updateLogsUI();
            this.updateLogStats();
        } else if (pageName === 'game') {
            this.initCanvas();
            this.render();
        }
    }
    
    /**
     * 更新设置页面UI
     */
    updateSettingsUI() {
        // 更新搜索深度
        const depthInput = document.getElementById('search-depth');
        if (depthInput) {
            depthInput.value = this.settings.searchDepth;
            document.getElementById('depth-value').textContent = this.settings.searchDepth;
        }
        
        // 更新候选点数
        const candidateInput = document.getElementById('candidate-count');
        if (candidateInput) {
            candidateInput.value = this.settings.candidateCount;
            document.getElementById('candidate-value').textContent = this.settings.candidateCount;
        }
        
        // 更新搜索范围
        const rangeInput = document.getElementById('search-range');
        if (rangeInput) {
            rangeInput.value = this.settings.searchRange;
            document.getElementById('range-value').textContent = this.settings.searchRange;
        }
        
        // 更新权重设置
        Object.keys(this.settings.patternWeights).forEach(key => {
            const input = document.getElementById(`weight-${key}`);
            if (input) {
                input.value = this.settings.patternWeights[key];
            }
        });
    }
    
    /**
     * 从UI更新设置
     */
    updateSettingFromInput(input) {
        const path = input.dataset.setting; // 例如 "patternWeights.liveFive" 或 "searchDepth"
        if (!path) return;

        const val = parseFloat(input.value); 

        if (isNaN(val)) return;
        
        // 处理嵌套对象赋值 (例如 settings.patternWeights.liveFive)
        const keys = path.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = val;

        // 实时重新初始化 AI 权重
        this.initAI();
        
        console.log(`设置已更新: ${path} = ${val}`);
    }
    
    /**
     * 更新滑块的显示值
     */
    updateSliderValue(slider) {
        const value = slider.value;
        let valueId = '';
        
        // 根据滑块ID确定值显示元素的ID
        switch (slider.id) {
            case 'search-depth':
            case 'quick-depth':
                this.settings.searchDepth = value;
                valueId = 'depth-value';
                // 同步两个页面的显示
                const qdv = document.getElementById('quick-depth-value');
                if (qdv) qdv.textContent = value;
                break;
            case 'candidate-count':
            case 'quick-candidate':
                this.settings.candidateCount = value;
                valueId = 'candidate-value';
                const qcv = document.getElementById('quick-candidate-value');
                if (qcv) qcv.textContent = value;
                break;
            case 'search-range':
                this.settings.searchRange = value;
                valueId = 'range-value';
                break;
        }
        
        // 2. 更新当前页面的文本显示
        const valueDisplay = document.getElementById(valueId);
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }
        
        // 3. 实时重新初始化AI
        this.initAI();
    }
    
    
    /**
     * 重置设置
     */
    resetSettings() {
        this.settings = structuredClone(this.defaultsettings);
        
        this.updateSettingsUI();
        this.initAI();
        this.showModal('设置已重置为默认值！');
    }
    
    /**
     * 更新日志页面UI (黑客帝国/终端风格版)
     */
    updateLogsUI() {
        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;
        
        const logs = this.getLogs();
        if (logs.length === 0) {
            logsContainer.innerHTML = '暂无日志';
            return;
        }
        
        // 1. 使用 map 构造纯文本行
        const content = logs.map(log => {
            return `[${log.timestamp}] ${log.message}`;
        }).join('\n'); // 用换行符连接
        
        // 2. 一次性写入
        logsContainer.innerHTML = content;
        
        // 3. 滚动到底部
        // 使用 requestAnimationFrame 确保在浏览器渲染后再滚动
        requestAnimationFrame(() => {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        });
    }
    
    /**
     * 更新日志统计信息
     */
    updateLogStats() {
        const logs = this.getLogs();
        const aiLogs = logs.filter(log => log.type === 'ai-move' && log.data);
        
        let totalNodes = 0;
        let totalPruning = 0;
        let totalTime = 0;
        
        aiLogs.forEach(log => {
            if (log.data) {
                totalNodes += log.data.searchNodes || 0;
                totalPruning += log.data.pruningCount || 0;
                totalTime += log.data.searchTime || 0;
            }
        });
        
        const avgTime = aiLogs.length > 0 ? Math.round(totalTime / aiLogs.length) : 0;
        
        // 更新显示
        const nodesEl = document.getElementById('total-nodes');
        const pruningEl = document.getElementById('total-pruning');
        const avgTimeEl = document.getElementById('avg-search-time');
        
        if (nodesEl) nodesEl.textContent = totalNodes.toLocaleString();
        if (pruningEl) pruningEl.textContent = totalPruning.toLocaleString();
        if (avgTimeEl) avgTimeEl.textContent = avgTime + 'ms';
    }
    
    /**
     * 添加日志
     */
    addLog(log) {
        const logs = this.getLogs();
        logs.push({
            timestamp: new Date().toLocaleTimeString(),
            ...log
        });
        
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        localStorage.setItem('gomoku-logs', JSON.stringify(logs));
        
        // 每当日志增加时，自动调用更新
        this.updateLogsUI();

        this.updateLogStats();
    }
    
    /**
     * 获取日志
     */
    getLogs() {
        const saved = localStorage.getItem('gomoku-logs');
        return saved ? JSON.parse(saved) : [];
    }
    
    /**
     * 清空日志
     */
    clearLogs() {
        localStorage.removeItem('gomoku-logs');
        this.updateLogsUI();
    }
    
    /**
     * 导出日志
     */
    exportLogs() {
        const logs = this.getLogs();
        const content = logs.map(log => 
            `[${log.timestamp}] ${log.type}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gomoku-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 全局游戏实例
let game;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    game = new GomokuGame();
});
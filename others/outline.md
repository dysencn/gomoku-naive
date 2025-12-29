# 五子棋Alpha-Beta算法演示网站 - 项目大纲

## 文件结构
```
/mnt/okcomputer/output/
├── index.html              # 主游戏页面
├── settings.html           # 参数设置页面  
├── logs.html              # 算法日志页面
├── main.js                # 核心JavaScript逻辑
├── gomoku-ai.js          # 五子棋AI算法实现
├── resources/            # 资源文件夹
│   ├── bg-pattern.jpg    # 背景纹理图片
│   └── algorithm-icon.svg # 算法图标
└── README.md            # 项目说明文档
```

## 页面功能分解

### index.html - 主游戏页面
**核心功能**:
- 15x15五子棋棋盘渲染
- 鼠标点击落子交互
- 黑白棋子交替落子逻辑
- 五子连珠胜负判断
- 游戏控制按钮（新局、后退、AI搜索）
- AI搜索进度显示
- 胜利庆祝动画

**技术实现**:
- Canvas或SVG棋盘渲染
- 事件监听处理落子
- 游戏状态管理
- 调用AI算法模块
- Anime.js动画效果

### settings.html - 参数设置页面
**核心功能**:
- 搜索深度设置（1-10层）
- 候选点数N设置（1-20个）
- 搜索范围设置（1-5格）
- 启发函数参数调整
  - 活四、冲四、活三、眠三、活二、眠二分值
  - 对手威胁扣分权重
- 参数重置功能
- 实时预览效果

**技术实现**:
- 滑动条（range input）组件
- 数值输入框验证
- 本地存储参数设置
- 参数变更实时反馈
- 表单验证和提交

### logs.html - 算法日志页面
**核心功能**:
- 实时显示AI搜索过程
- 评估分数展示
- 剪枝节点统计
- 搜索耗时记录
- 日志清空和导出
- 算法可视化图表

**技术实现**:
- 日志数据结构设计
- ECharts.js图表渲染
- 实时数据更新机制
- 日志格式化显示
- 数据持久化存储

## JavaScript模块设计

### main.js - 主控制器
**功能模块**:
- 页面路由管理
- 游戏状态控制
- 事件中心调度
- 数据存储管理
- 页面切换动画

### gomoku-ai.js - AI算法核心
**功能模块**:
- Alpha-Beta剪枝搜索
- 启发式评估函数
- 棋型识别（活四、活三等）
- 候选点生成和排序
- 胜负判断算法

**算法结构**:
```javascript
class GomokuAI {
  // 构造函数，初始化参数
  constructor(settings) {}
  
  // Alpha-Beta搜索主函数
  findBestMove(board, player) {}
  
  // Minimax算法实现
  minimax(board, depth, alpha, beta, isMaximizing) {}
  
  // 启发式评估函数
  evaluateBoard(board, player) {}
  
  // 棋型识别
  detectPatterns(board, player) {}
  
  // 生成候选点
  generateCandidateMoves(board) {}
  
  // 检查胜负
  checkWin(board, player) {}
}
```

## 数据结构设计

### 游戏状态
```javascript
{
  board: Array(15).fill().map(() => Array(15).fill(0)), // 0=空, 1=黑, 2=白
  currentPlayer: 1, // 当前玩家
  gameOver: false,
  winner: null,
  moveHistory: [], // 落子历史
  aiThinking: false
}
```

### AI设置
```javascript
{
  searchDepth: 4,
  candidateCount: 10,
  searchRange: 2,
  patternWeights: {
    liveFive: 10000,
    liveFour: 5000,
    deadFour: 400,
    liveThree: 400,
    deadThree: 20,
    liveTwo: 10,
    deadTwo: 5
  }
}
```

### 日志条目
```javascript
{
  timestamp: Date.now(),
  type: 'search|evaluation|pruning|move',
  message: '搜索信息',
  data: { /* 相关数据 */ }
}
```

## 样式设计

### CSS架构
- 使用Tailwind CSS作为基础框架
- 自定义CSS变量定义主题色彩
- 响应式布局设计
- 动画和过渡效果

### 组件样式
- 棋盘：木质纹理背景，深色网格线
- 棋子：黑白对比，阴影效果
- 按钮：渐变背景，悬停动画
- 面板：半透明玻璃效果
- 导航：底部固定标签栏

## 交互设计

### 用户交互流程
1. 进入游戏页面，显示空白棋盘
2. 玩家点击落子，棋子动画显示
3. 检查胜负，如未结束切换玩家
4. 点击AI搜索，显示思考动画
5. AI落子，更新棋盘状态
6. 重复直到一方胜利

### 设置页面流程
1. 点击设置标签进入设置页
2. 调整各项参数，实时预览效果
3. 点击保存应用设置
4. 返回游戏页面使用新设置

### 日志页面流程
1. 进行AI搜索时自动记录日志
2. 切换到日志页面查看详细信息
3. 可以清空或导出日志数据
4. 通过图表了解算法性能

## 性能优化

### 算法优化
- 启发式剪枝减少搜索节点
- 置换表缓存已评估局面
- 迭代加深搜索控制时间
- 并行计算候选点评估

### 渲染优化
- 虚拟滚动显示大量日志
- Canvas离屏渲染棋盘
- 防抖处理频繁操作
- 懒加载图表组件

### 内存管理
- 及时清理事件监听器
- 重用棋盘数据结构
- 限制日志条目数量
- 压缩存储历史数据
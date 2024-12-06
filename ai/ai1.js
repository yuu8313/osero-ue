const AI_CONFIG = {
    // AIの強さを決めるやつ (1-5) 数字が大きいほど強い
    DIFFICULTY: 3,

    /** 
     * どのアルゴリズムを使うか選ぶ
     * 'minimax': 時間かかるけど賢い
     * 'alphabeta': 探索効率が良いほう
     */
    ALGORITHM: 'alphabeta',
    
    /** 
     * マスの価値を考えるかどうか
     * true: 重要そうな場所をちゃんとしっかり把握して評価する
     * false: マスの位置は考えないでシンプルに判断する
     * 序盤～中盤で役戦略の部分
     */
    USE_POSITION_WEIGHTS: true,

    /** 
     * 有効手の数を気にするかどうか
     * true: 次に打てる場所の数を考慮する（相手を縛る狡い動きに便利）
     * false: 打てる場所の数は無視
     * 中盤の戦略で大事な場所
     */
    USE_MOBILITY: true,

    /** 
     * 安定した石を評価するかどうか
     * true: とられない駒を重視する（確実な領域を確保する動き）
     * false: 石の安定性は気にしない
     * 終盤に強い動き用
     */
    USE_STABILITY: true,

    /** 
     * フロンティア（石の周りの空きマス）を評価するかどうか
     * true: 石の周りの空きマスを減らすようにする（相手の選択肢を狭める）
     * false: フロンティアは無視する
     * 中盤から終盤で効果的
     */
    USE_FRONTIER: true,

    /** 
     * パリティ（残りマス数の偶奇）を考えるかどうか
     * true: 最後の手を取りやすくするために残りマス数を考える
     * false: 残りマス数は気にしない
     * 終盤での細かい戦略
     */
    USE_PARITY: true,

    /** 
     * コーナーの評価をするかどうか
     * true: 端っこのコーナーがどれだけ重要かを重視する（勝負のカギ！）
     * false: コーナーについては評価しない
     * これ切るとかなり変わるので注意
     */
    USE_CORNER: true,

    /** 
     * 　ギコネコのそんなバナナ
     * 　　　　　.┌┐
　　　　　　　　／ /
　　　　　　.／　/ i
　　　　　　|　( ﾟДﾟ) ＜そんなバナナ
　　　　　　|（ﾉi　　|）
　　　　　　|　 i　　i
　　　　　　＼_ヽ＿,ゝ
　　　　　　　 U" U
     */

    /** 
     * 探索の深さを決めるやつ
     * 難易度に応じて調整される
     * @returns {number} 探索の最大深さ
     */
    MAX_DEPTH: function() {
        return Math.min(this.DIFFICULTY + 5, 5);
    },

    // 各評価ポイントの重要さをここで調整する
    WEIGHTS: {
        POSITION: 1.0,   // マスの位置重視
        MOBILITY: 0.5,   // 打てる手の多さ重視
        STABILITY: 0.8,  // 安定した石重視
        PIECE_COUNT: 0.3, // 石の数重視
        FRONTIER: 0.4,   // フロンティア重視
        PARITY: 0.6,     // パリティ重視
        CORNER: 2.0      // コーナー重視（これが超重要）
    },

    // エンドゲーム（終盤）に切り替える閾値
    // 盤面の石の数がこれを超えたら、AI第二形態
    ENDGAME_THRESHOLD: 50
};

//ここより際は特にいじる必要ないから雑に書く


// 盤面の位置の重み付け

const POSITION_WEIGHTS = [
    [120, -20,  20,   5,   5,  20, -20, 120],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [120, -20,  20,   5,   5,  20, -20, 120]
];

// 有効な手かどうかを判定する関数
function isValidMove(board, row, col, player) {
    if (board[row][col]) return false;
    
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    return directions.some(([dx, dy]) => {
        return wouldFlip(board, row, col, dx, dy, player).length > 0;
    });
}

// 指定方向にひっくり返せる石を所得
function wouldFlip(board, row, col, dx, dy, player) {
    if (!board || !Array.isArray(board) || board.length !== 8) {
        console.error('Invalid board state');
        return [];
    }

    const flips = [];
    let x = row + dx;
    let y = col + dy;
    
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        if (!board[x] || !board[x][y]) return [];
        if (board[x][y] === player) return flips;
        flips.push([x, y]);
        x += dx;
        y += dy;
    }
    
    return [];
}

// 有効な手の一覧を取得
function getValidMoves(board, player) {
    const moves = [];
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (isValidMove(board, i, j, player)) {
                moves.push([i, j]);
            }
        }
    }
    return moves;
}

// 新しい盤面を生成する関数
function makeMove(board, move, player) {
    if (!move || !Array.isArray(move) || move.length !== 2) {
        console.error('Invalid move provided:', move);
        return board; // 元の盤面を返す
    }

    const newBoard = JSON.parse(JSON.stringify(board));
    const [row, col] = move;
    
    if (row < 0 || row >= 8 || col < 0 || col >= 8) {
        console.error('Move coordinates out of bounds:', move);
        return board;
    }

    newBoard[row][col] = player;
    
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    directions.forEach(([dx, dy]) => {
        const flips = wouldFlip(newBoard, row, col, dx, dy, player);
        flips.forEach(([x, y]) => {
            newBoard[x][y] = player;
        });
    });
    
    return newBoard;
}

// AIの手を決定する関数
function decideMove(board, validMoves) {
    console.log('decideMove called with validMoves:', validMoves);
    
    if (validMoves.length === 0) {
        console.log('No valid moves available for AI');
        return null;
    }
    
    if (AI_CONFIG.DIFFICULTY === 1) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        console.log('Random move selected:', randomMove);
        return randomMove;
    }

    console.log('AI thinking with algorithm:', AI_CONFIG.ALGORITHM);
    
    let bestMove;
    if (AI_CONFIG.ALGORITHM === 'alphabeta') {
        bestMove = findBestMoveAlphaBeta(board, validMoves);
    } else {
        bestMove = findBestMoveMinimax(board, validMoves);
    }
    
    console.log('AI selected move:', bestMove);
    return bestMove;
}

// ミニマックスで最善手を探す
function findBestMoveMinimax(board, validMoves) {
    if (!validMoves || validMoves.length === 0) {
        console.error('No valid moves provided to findBestMoveMinimax');
        return null;
    }

    const depth = AI_CONFIG.MAX_DEPTH();
    let bestScore = -Infinity;
    let bestMove = validMoves[0];
    
    for (const move of validMoves) {
        const newBoard = makeMove(board, move, 'white');
        const score = minimax(newBoard, depth - 1, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// 実装
function minimax(board, depth, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard(board);
    }
    
    const validMoves = getValidMoves(board, isMaximizing ? 'white' : 'black');
    if (validMoves.length === 0) {
        return evaluateBoard(board);
    }
    
    let bestScore = isMaximizing ? -Infinity : Infinity;
    
    for (const move of validMoves) {
        const newBoard = makeMove(board, move, isMaximizing ? 'white' : 'black');
        const score = minimax(newBoard, depth - 1, !isMaximizing);
        bestScore = isMaximizing ? 
            Math.max(bestScore, score) : 
            Math.min(bestScore, score);
    }
    
    return bestScore;
}

// Alpha-Betaで探す
function findBestMoveAlphaBeta(board, validMoves) {
    if (!validMoves || validMoves.length === 0) {
        console.error('No valid moves provided to findBestMoveAlphaBeta');
        return null;
    }

    const depth = AI_CONFIG.MAX_DEPTH();
    let bestScore = -Infinity;
    let bestMove = validMoves[0];
    let alpha = -Infinity;
    let beta = Infinity;
    
    for (const move of validMoves) {
        const newBoard = makeMove(board, move, 'white');
        const score = alphaBeta(newBoard, depth - 1, alpha, beta, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
    }
    
    return bestMove;
}

//実装
function alphaBeta(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard(board);
    }
    
    const validMoves = getValidMoves(board, isMaximizing ? 'white' : 'black');
    if (validMoves.length === 0) {
        return evaluateBoard(board);
    }
    
    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const move of validMoves) {
            const newBoard = makeMove(board, move, 'white');
            const score = alphaBeta(newBoard, depth - 1, alpha, beta, false);
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Beta cut-off
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const move of validMoves) {
            const newBoard = makeMove(board, move, 'black');
            const score = alphaBeta(newBoard, depth - 1, alpha, beta, true);
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break; // Alpha cut-off
        }
        return minScore;
    }
}

// 盤面を評価する関数
function evaluateBoard(board) {
    if (!board || !Array.isArray(board) || board.length !== 8) {
        console.error('Invalid board state in evaluateBoard');
        return 0;
    }

    let score = 0;
    const totalDiscs = countDiscs(board);
    const isEndgame = totalDiscs >= (AI_CONFIG.ENDGAME_THRESHOLD || 50);
    
    try {
        if (AI_CONFIG.USE_POSITION_WEIGHTS) {
            score += evaluatePosition(board) * 
                (isEndgame ? (AI_CONFIG.WEIGHTS?.POSITION || 1.0) * 2 : (AI_CONFIG.WEIGHTS?.POSITION || 1.0));
        }
        
        if (AI_CONFIG.USE_MOBILITY) {
            score += evaluateMobility(board) * 
                (isEndgame ? (AI_CONFIG.WEIGHTS?.MOBILITY || 0.5) * 0.5 : (AI_CONFIG.WEIGHTS?.MOBILITY || 0.5));
        }
        
        if (AI_CONFIG.USE_STABILITY) {
            score += evaluateStability(board) * (AI_CONFIG.WEIGHTS?.STABILITY || 0.8);
        }
        
        if (AI_CONFIG.USE_FRONTIER) {
            score += evaluateFrontier(board) * (AI_CONFIG.WEIGHTS?.FRONTIER || 0.4);
        }
        
        if (AI_CONFIG.USE_PARITY) {
            score += evaluateParity(board) * (AI_CONFIG.WEIGHTS?.PARITY || 0.6);
        }
        
        if (AI_CONFIG.USE_CORNER) {
            score += evaluateCorner(board) * 
                (isEndgame ? (AI_CONFIG.WEIGHTS?.CORNER || 2.0) * 1.5 : (AI_CONFIG.WEIGHTS?.CORNER || 2.0));
        }
        
    } catch (error) {
        console.error('Error in evaluateBoard:', error);
        return 0;
    }
    
    return score;
}

// 位置で評価
function evaluatePosition(board) {
    let score = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j] === 'white') {
                score += POSITION_WEIGHTS[i][j];
            } else if (board[i][j] === 'black') {
                score -= POSITION_WEIGHTS[i][j];
            }
        }
    }
    return score;
}

// 有効手の数で評価
function evaluateMobility(board) {
    const whiteMoves = getValidMoves(board, 'white').length;
    const blackMoves = getValidMoves(board, 'black').length;
    return whiteMoves - blackMoves;
}

// 石の安定性で評価
function evaluateStability(board) {
    let score = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j]) {
                const isWhite = board[i][j] === 'white';
                if (isStablePosition(board, i, j)) {
                    score += isWhite ? 1 : -1;
                }
            }
        }
    }
    return score;
}

// 安定した位置かを判定
function isStablePosition(board, row, col) {
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    let stableDirections = 0;
    
    for (const [dx, dy] of directions) {
        let x = row + dx;
        let y = col + dy;
        if (x < 0 || x >= 8 || y < 0 || y >= 8 || board[x][y] === board[row][col]) {
            stableDirections++;
        }
    }
    
    return stableDirections >= 6;
}

// フロンティアで評価
function evaluateFrontier(board) {
    let whiteFrontier = 0;
    let blackFrontier = 0;
    
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j]) {
                const frontierCount = countFrontier(board, i, j);
                if (board[i][j] === 'white') {
                    whiteFrontier += frontierCount;
                } else {
                    blackFrontier += frontierCount;
                }
            }
        }
    }
    
    return blackFrontier - whiteFrontier;
}

// 空きマスを数える（駒回り）
function countFrontier(board, row, col) {
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    let count = 0;
    
    for (const [dx, dy] of directions) {
        const x = row + dx;
        const y = col + dy;
        if (x >= 0 && x < 8 && y >= 0 && y < 8 && !board[x][y]) {
            count++;
        }
    }
    
    return count;
}

// パリティで評価
function evaluateParity(board) {
    const emptyCount = 64 - countDiscs(board);
    return emptyCount % 2 === 0 ? 1 : -1;
}

// コーナーの支配評価
function evaluateCorner(board) {
    const corners = [[0,0], [0,7], [7,0], [7,7]];
    let score = 0;
    
    corners.forEach(([row, col]) => {
        if (board[row][col] === 'white') score += 25;
        else if (board[row][col] === 'black') score -= 25;
    });
    
    return score;
}

// 石の数を数える
function countDiscs(board) {
    let count = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j]) count++;
        }
    }
    return count;
}

// AIの手を取得する関数（外部から呼び出される）
function getAIMove(board, validMoves) {
    if (!board || !Array.isArray(board) || board.length !== 8) {
        console.error('Invalid board state in getAIMove');
        return null;
    }

    if (!validMoves || !Array.isArray(validMoves)) {
        console.error('Invalid validMoves in getAIMove');
        return null;
    }

    console.log('getAIMove called with board:', board);
    console.log('Valid moves:', validMoves);
    return decideMove(board, validMoves);
}

// グローバルスコープに必要な関数を公開
window.getAIMove = getAIMove;
window.isValidMove = isValidMove;
window.makeMove = makeMove;
window.getValidMoves = getValidMoves;
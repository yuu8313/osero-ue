class ReversiGame {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = 'black';
        this.initialize();
        this.setupEventListeners();
    }

    initialize() {
        // 初期配置
        this.board[3][3] = this.board[4][4] = 'white';
        this.board[3][4] = this.board[4][3] = 'black';
        this.renderBoard();
        this.updateScore();
        this.showValidMoves();
    }

    setupEventListeners() {
        document.getElementById('board').addEventListener('click', (e) => {
            if (this.currentPlayer === 'white') {
                this.showNotification('コンピューターのターンです');
                return;
            }
            
            const cell = e.target.closest('.cell');
            if (!cell || !cell.classList.contains('valid-move')) return;
            
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            this.makeMove(row, col);
        });

        document.getElementById('restart-button').addEventListener('click', () => {
            document.getElementById('game-result').classList.remove('show');
            this.board = Array(8).fill().map(() => Array(8).fill(null));
            this.currentPlayer = 'black';
            this.initialize();
        });
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                if (this.board[i][j]) {
                    const disc = document.createElement('div');
                    disc.className = `disc ${this.board[i][j]}`;
                    cell.appendChild(disc);
                }
                
                boardElement.appendChild(cell);
            }
        }
    }

    getValidMoves(player) {
        const moves = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (this.isValidMove(i, j, player)) {
                    moves.push([i, j]);
                }
            }
        }
        return moves;
    }

    showValidMoves() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('valid-move'));
        
        if (this.currentPlayer === 'white') return;
        
        const validMoves = this.getValidMoves(this.currentPlayer);
        validMoves.forEach(([row, col]) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('valid-move');
        });
    }

    isValidMove(row, col, player) {
        if (this.board[row][col]) return false;
        
        const opponent = player === 'black' ? 'white' : 'black';
        const directions = [
            [-1,-1], [-1,0], [-1,1],
            [0,-1],          [0,1],
            [1,-1],  [1,0],  [1,1]
        ];
        
        return directions.some(([dx, dy]) => {
            let x = row + dx;
            let y = col + dy;
            let hasOpponent = false;
            
            while (x >= 0 && x < 8 && y >= 0 && y < 8) {
                if (!this.board[x][y]) return false;
                if (this.board[x][y] === opponent) {
                    hasOpponent = true;
                } else if (this.board[x][y] === player && hasOpponent) {
                    return true;
                } else {
                    return false;
                }
                x += dx;
                y += dy;
            }
            return false;
        });
    }

    flipDiscs(row, col, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        const directions = [
            [-1,-1], [-1,0], [-1,1],
            [0,-1],          [0,1],
            [1,-1],  [1,0],  [1,1]
        ];
        
        directions.forEach(([dx, dy]) => {
            let x = row + dx;
            let y = col + dy;
            const toFlip = [];
            
            while (x >= 0 && x < 8 && y >= 0 && y < 8) {
                if (!this.board[x][y]) break;
                if (this.board[x][y] === opponent) {
                    toFlip.push([x, y]);
                } else if (this.board[x][y] === player) {
                    toFlip.forEach(([fx, fy]) => {
                        this.board[fx][fy] = player;
                        const disc = document.querySelector(`[data-row="${fx}"][data-col="${fy}"] .disc`);
                        if (disc) {
                            disc.className = `disc ${player}`;
                            anime({
                                targets: disc,
                                rotateY: '180deg',
                                duration: 600,
                                easing: 'easeInOutQuad'
                            });
                        }
                    });
                    break;
                }
                x += dx;
                y += dy;
            }
        });
    }

    makeMove(row, col) {
        if (!this.isValidMove(row, col, this.currentPlayer)) return;
        
        this.board[row][col] = this.currentPlayer;
        this.flipDiscs(row, col, this.currentPlayer);
        this.renderBoard();
        this.updateScore();
        
        const nextPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        const validMoves = this.getValidMoves(nextPlayer);
        
        if (validMoves.length === 0) {
            // 次のプレイヤーが打てる場所がない場合
            const currentPlayerValidMoves = this.getValidMoves(this.currentPlayer);
            if (currentPlayerValidMoves.length === 0) {
                // 両者とも打てる場所がない場合はゲーム終了
                this.endGame();
                return;
            }
            // パスの処理
            this.showNotification(`${nextPlayer === 'black' ? '黒' : '白'}はパスです`);
            setTimeout(() => {
                // 同じプレイヤーのターンを継続
                this.showValidMoves();
            }, 2000);
            return;
        }
        
        this.currentPlayer = nextPlayer;
        document.getElementById('turn-display').textContent = 
            this.currentPlayer === 'black' ? '黒のターン' : '白のターン';
        
        this.showValidMoves();
        
        if (this.currentPlayer === 'white') {
            setTimeout(() => this.computerMove(), 1000);
        }
    }

    computerMove() {
        console.log('computerMove called');
        const validMoves = this.getValidMoves('white');
        console.log('Valid moves for AI:', validMoves);
        
        if (validMoves.length === 0) {
            console.log('No valid moves for AI');
            this.currentPlayer = 'black';
            this.showValidMoves();
            return;
        }
        
        // AIの手を取得
        console.log('Getting AI move...');
        const [row, col] = getAIMove(this.board, validMoves);
        console.log('AI chose move:', row, col);
        
        // AIの手を視覚的に表示
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            const highlight = document.createElement('div');
            highlight.className = 'ai-move-highlight';
            cell.appendChild(highlight);
            
            // ハイライトのアニメーション
            anime({
                targets: highlight,
                scale: [1.2, 0],
                opacity: [1, 0],
                duration: 1000,
                easing: 'easeOutExpo',
                complete: () => {
                    highlight.remove();
                    this.makeMove(row, col);
                }
            });
        }
    }

    updateScore() {
        let blackCount = 0;
        let whiteCount = 0;
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (this.board[i][j] === 'black') blackCount++;
                if (this.board[i][j] === 'white') whiteCount++;
            }
        }
        
        document.getElementById('black-count').textContent = blackCount;
        document.getElementById('white-count').textContent = whiteCount;
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }

    endGame() {
        const blackCount = parseInt(document.getElementById('black-count').textContent);
        const whiteCount = parseInt(document.getElementById('white-count').textContent);
        
        let message;
        if (blackCount > whiteCount) {
            message = 'あなたの勝ちです！';
        } else if (whiteCount > blackCount) {
            message = 'コンピューターの勝ちです';
        } else {
            message = '引き分けです';
        }
        
        document.getElementById('result-message').textContent = message;
        document.getElementById('game-result').classList.add('show');
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new ReversiGame();
});
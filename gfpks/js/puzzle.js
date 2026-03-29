// ------------------- НАСТРОЙКИ -------------------
let PUZZLE_DIFFICULTY = 10;
const PUZZLE_HOVER_TINT = '#ff88bb';

let _stage, _canvas, _img;
let _pieces = [];
let _puzzleWidth, _puzzleHeight, _pieceWidth, _pieceHeight;
let _currentPiece = null;
let _currentDropPiece = null;
let _mouse = { x: 0, y: 0 };

let playerCoins = 100;
let totalPuzzlesCompleted = 0;
let currentPlayerName = "Гость";
let ranking = [];

let hintActiveFor = null;
let hintTimeout = null;
let coinsOnField = [];

// ------------------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -------------------
function loadRanking() {
    const stored = localStorage.getItem('puzzleRanking');
    ranking = stored ? JSON.parse(stored) : [];
    if (!ranking.some(p => p.name === currentPlayerName)) {
        ranking.push({ name: currentPlayerName, score: 0, coins: 100 });
        saveRanking();
    }
    updateRankingUI();
}
function saveRanking() { localStorage.setItem('puzzleRanking', JSON.stringify(ranking)); }
function updateRankingUI() {
    const ratingDiv = document.getElementById('ratingList');
    if (!ratingDiv) return;
    const sorted = [...ranking].sort((a,b) => b.score - a.score);
    ratingDiv.innerHTML = '';
    for (let p of sorted) {
        const div = document.createElement('div');
        div.className = 'rating-item';
        div.innerHTML = `<span>${escapeHtml(p.name)}</span><span>🧩 ${p.score}  💰${p.coins}</span>`;
        ratingDiv.appendChild(div);
    }
}
function updateCurrentPlayerInRanking() {
    const idx = ranking.findIndex(p => p.name === currentPlayerName);
    if (idx !== -1) { ranking[idx].score = totalPuzzlesCompleted; ranking[idx].coins = playerCoins; }
    else ranking.push({ name: currentPlayerName, score: totalPuzzlesCompleted, coins: playerCoins });
    saveRanking();
    updateRankingUI();
}
function updateUI() {
    document.getElementById('coinBalance').innerText = playerCoins;
    document.getElementById('puzzlesCompleted').innerText = totalPuzzlesCompleted;
    updateCurrentPlayerInRanking();
}
function addCoins(amount) { playerCoins += amount; updateUI(); }
function spendCoins(amount) { if (playerCoins >= amount) { playerCoins -= amount; updateUI(); return true; } return false; }
function addScore(piecesGained = 1) { totalPuzzlesCompleted += piecesGained; updateUI(); }

// ------------------- ОСНОВНЫЕ ФУНКЦИИ ПАЗЛА -------------------
function init(difficulty) {
    document.ontouchmove = function(e){ e.preventDefault(); };
    PUZZLE_DIFFICULTY = difficulty;
    if (!_img || !_img.src) {
        _img = new Image();
        _img.addEventListener('load', onImage, false);
        _img.src = "img/puzzle.jpg";
    } else onImage();
}
function onImage() {
    _pieceWidth = Math.floor(_img.width / PUZZLE_DIFFICULTY);
    _pieceHeight = Math.floor(_img.height / PUZZLE_DIFFICULTY);
    _puzzleWidth = _pieceWidth * PUZZLE_DIFFICULTY;
    _puzzleHeight = _pieceHeight * PUZZLE_DIFFICULTY;
    setCanvas();
    initPuzzle();
}
function setCanvas() {
    _canvas = document.getElementById('canvas');
    _stage = _canvas.getContext('2d');
    _canvas.width = _puzzleWidth;
    _canvas.height = _puzzleHeight;
    _canvas.style.border = "0px solid transparent";
}
function initPuzzle() {
    _pieces = [];
    _mouse = {x:0, y:0};
    _currentPiece = null;
    _currentDropPiece = null;
    _stage.drawImage(_img, 0, 0, _puzzleWidth, _puzzleHeight, 0, 0, _puzzleWidth, _puzzleHeight);
    createTitle("Нажмите, чтобы начать");
    buildPieces();
}
function createTitle(msg) {
    _stage.fillStyle = "#000000";
    _stage.globalAlpha = 0.4;
    _stage.fillRect(100, _puzzleHeight - 40, _puzzleWidth - 200, 40);
    _stage.fillStyle = "#ff88bb";
    _stage.globalAlpha = 1;
    _stage.textAlign = "center";
    _stage.textBaseline = "middle";
    _stage.font = "18px 'Segoe UI', 'Quicksand'";
    _stage.fillText(msg, _puzzleWidth / 2, _puzzleHeight - 20);
}
function buildPieces() {
    let xPos = 0, yPos = 0;
    for (let i = 0; i < PUZZLE_DIFFICULTY * PUZZLE_DIFFICULTY; i++) {
        _pieces.push({ sx: xPos, sy: yPos });
        xPos += _pieceWidth;
        if (xPos >= _puzzleWidth) { xPos = 0; yPos += _pieceHeight; }
    }
    document.onmousedown = shufflePuzzle;
    document.getElementById('canvas').ontouchstart = shufflePuzzle;
}
function shufflePuzzle() {
    _pieces = shuffleArray(_pieces);
    _stage.clearRect(0, 0, _puzzleWidth, _puzzleHeight);
    let xPos = 0, yPos = 0;
    for (let i = 0; i < _pieces.length; i++) {
        let piece = _pieces[i];
        piece.xPos = xPos;
        piece.yPos = yPos;
        _stage.drawImage(_img, piece.sx, piece.sy, _pieceWidth, _pieceHeight, xPos, yPos, _pieceWidth, _pieceHeight);
        _stage.strokeRect(xPos, yPos, _pieceWidth, _pieceHeight);
        xPos += _pieceWidth;
        if (xPos >= _puzzleWidth) { xPos = 0; yPos += _pieceHeight; }
    }
    document.onmousedown = onPuzzleClick;
    document.getElementById('canvas').ontouchstart = onPuzzleClick;
}
function getMouseCoords(e) {
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width / rect.width;
    const scaleY = _canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    _mouse.x = (clientX - rect.left) * scaleX;
    _mouse.y = (clientY - rect.top) * scaleY;
}
function onPuzzleClick(e) {
    e.preventDefault();
    getMouseCoords(e);
    _currentPiece = checkPieceClicked();
    if (_currentPiece) {
        _stage.clearRect(_currentPiece.xPos, _currentPiece.yPos, _pieceWidth, _pieceHeight);
        _stage.save();
        _stage.globalAlpha = 0.9;
        _stage.drawImage(_img, _currentPiece.sx, _currentPiece.sy, _pieceWidth, _pieceHeight,
                         _mouse.x - _pieceWidth/2, _mouse.y - _pieceHeight/2, _pieceWidth, _pieceHeight);
        _stage.restore();
        document.onmousemove = updatePuzzle;
        document.getElementById('canvas').ontouchmove = updatePuzzle;
        document.onmouseup = pieceDropped;
        document.getElementById('canvas').ontouchend = pieceDropped;
    }
}
function checkPieceClicked() {
    for (let piece of _pieces) {
        if (_mouse.x >= piece.xPos && _mouse.x <= piece.xPos + _pieceWidth &&
            _mouse.y >= piece.yPos && _mouse.y <= piece.yPos + _pieceHeight)
            return piece;
    }
    return null;
}
function isMouseOverPiece(piece) {
    return (_mouse.x >= piece.xPos && _mouse.x <= piece.xPos + _pieceWidth &&
            _mouse.y >= piece.yPos && _mouse.y <= piece.yPos + _pieceHeight);
}
function isPiecePlacedCorrectly(piece) {
    return (piece.xPos === piece.sx && piece.yPos === piece.sy);
}
function updatePuzzle(e) {
    e.preventDefault();
    _currentDropPiece = null;
    getMouseCoords(e);
    _stage.clearRect(0, 0, _puzzleWidth, _puzzleHeight);
    for (let piece of _pieces) {
        if (piece === _currentPiece) continue;
        _stage.drawImage(_img, piece.sx, piece.sy, _pieceWidth, _pieceHeight, piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
        _stage.strokeRect(piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
        if (!_currentDropPiece && isMouseOverPiece(piece)) {
            _currentDropPiece = piece;
            _stage.save();
            _stage.globalAlpha = 0.4;
            _stage.fillStyle = PUZZLE_HOVER_TINT;
            _stage.fillRect(piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
            _stage.restore();
        }
    }
    _stage.save();
    _stage.globalAlpha = 0.6;
    _stage.drawImage(_img, _currentPiece.sx, _currentPiece.sy, _pieceWidth, _pieceHeight,
                     _mouse.x - _pieceWidth/2, _mouse.y - _pieceHeight/2, _pieceWidth, _pieceHeight);
    _stage.restore();
    _stage.strokeRect(_mouse.x - _pieceWidth/2, _mouse.y - _pieceHeight/2, _pieceWidth, _pieceHeight);
    drawCoins();
    if (hintActiveFor !== null && _pieces[hintActiveFor] && !isPiecePlacedCorrectly(_pieces[hintActiveFor])) {
        let target = _pieces[hintActiveFor];
        _stage.save();
        _stage.globalAlpha = 0.4;
        _stage.fillStyle = "#ff44aa";
        _stage.fillRect(target.sx, target.sy, _pieceWidth, _pieceHeight);
        _stage.restore();
        _stage.beginPath();
        _stage.strokeStyle = "#ff3399";
        _stage.lineWidth = 4;
        _stage.strokeRect(target.sx, target.sy, _pieceWidth, _pieceHeight);
    }
}
function pieceDropped(e) {
    document.onmousemove = null;
    document.getElementById('canvas').ontouchmove = null;
    document.onmouseup = null;
    document.getElementById('canvas').ontouchend = null;
    if (_currentDropPiece) {
        let tmp = { xPos: _currentPiece.xPos, yPos: _currentPiece.yPos };
        _currentPiece.xPos = _currentDropPiece.xPos;
        _currentPiece.yPos = _currentDropPiece.yPos;
        _currentDropPiece.xPos = tmp.xPos;
        _currentDropPiece.yPos = tmp.yPos;
        if (_currentPiece.xPos === _currentPiece.sx && _currentPiece.yPos === _currentPiece.sy) { addCoins(5); addScore(1); }
        if (_currentDropPiece.xPos === _currentDropPiece.sx && _currentDropPiece.yPos === _currentDropPiece.sy) { addCoins(5); addScore(1); }
    }
    resetPuzzleAndCheckWin();
}
function resetPuzzleAndCheckWin() {
    _stage.clearRect(0, 0, _puzzleWidth, _puzzleHeight);
    let gameWin = true;
    for (let piece of _pieces) {
        _stage.drawImage(_img, piece.sx, piece.sy, _pieceWidth, _pieceHeight, piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
        _stage.strokeRect(piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
        if (piece.xPos !== piece.sx || piece.yPos !== piece.sy) gameWin = false;
    }
    drawCoins();
    if (gameWin) setTimeout(gameOver, 500);
}
function gameOver() {
    document.onmousedown = null;
    document.getElementById('canvas').ontouchstart = null;
    document.onmousemove = null;
    document.getElementById('canvas').ontouchmove = null;
    document.onmouseup = null;
    document.getElementById('canvas').ontouchend = null;
    alert('🎉 Пазл собран! 🎉');
    initPuzzle();
}
function shuffleArray(o) {
    for (let j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}
function loadUserImage(file) {
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => { _img = img; onImage(); if (hintTimeout) clearTimeout(hintTimeout); hintActiveFor = null; coinsOnField = []; };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
function useHint() {
    if (!_currentPiece) { alert("Сначала выберите фрагмент"); return; }
    if (isPiecePlacedCorrectly(_currentPiece)) { alert("Этот фрагмент уже на месте"); return; }
    if (!spendCoins(5)) { alert("Не хватает монет (5💰)"); return; }
    const index = _pieces.findIndex(p => p === _currentPiece);
    if (index === -1) return;
    if (hintTimeout) clearTimeout(hintTimeout);
    hintActiveFor = index;
    hintTimeout = setTimeout(() => { hintActiveFor = null; renderAll(); }, 2000);
    renderAll();
}
function doSabotage() {
    if (!spendCoins(10)) { alert("Недостаточно монет (10💰)"); return; }
    const canvasElem = document.getElementById('canvas');
    canvasElem.classList.add('shake');
    setTimeout(() => canvasElem.classList.remove('shake'), 500);
    const coinCount = Math.floor(Math.random() * 96) + 5;
    for (let i = 0; i < coinCount; i++) {
        let x = 20 + Math.random() * (_puzzleWidth - 40);
        let y = 20 + Math.random() * (_puzzleHeight - 40);
        let r = 12 + Math.random() * 8;
        coinsOnField.push({ x, y, r });
    }
    renderAll();
}
function drawCoins() {
    for (let coin of coinsOnField) {
        _stage.beginPath();
        _stage.arc(coin.x, coin.y, coin.r, 0, Math.PI*2);
        _stage.fillStyle = "#FFD966";
        _stage.shadowBlur = 4;
        _stage.fill();
        _stage.fillStyle = "#DAA520";
        _stage.font = `${coin.r+4}px "Segoe UI"`;
        _stage.fillText("💰", coin.x-8, coin.y+6);
        _stage.shadowBlur = 0;
    }
}
function handleCanvasClickForCoins(e) {
    if (!_canvas) return;
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width / rect.width;
    const scaleY = _canvas.height / rect.height;
    let clickX, clickY;
    if (e.touches) { clickX = (e.touches[0].clientX - rect.left) * scaleX; clickY = (e.touches[0].clientY - rect.top) * scaleY; }
    else { clickX = (e.clientX - rect.left) * scaleX; clickY = (e.clientY - rect.top) * scaleY; }
    for (let i = 0; i < coinsOnField.length; i++) {
        let coin = coinsOnField[i];
        if (Math.hypot(clickX - coin.x, clickY - coin.y) <= coin.r + 5) {
            addCoins(1);
            coinsOnField.splice(i,1);
            renderAll();
            return;
        }
    }
}
function renderAll() {
    if (!_stage) return;
    _stage.clearRect(0, 0, _puzzleWidth, _puzzleHeight);
    for (let piece of _pieces) {
        _stage.drawImage(_img, piece.sx, piece.sy, _pieceWidth, _pieceHeight, piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
        _stage.strokeRect(piece.xPos, piece.yPos, _pieceWidth, _pieceHeight);
    }
    drawCoins();
    if (hintActiveFor !== null && _pieces[hintActiveFor] && !isPiecePlacedCorrectly(_pieces[hintActiveFor])) {
        let target = _pieces[hintActiveFor];
        _stage.save();
        _stage.globalAlpha = 0.4;
        _stage.fillStyle = "#ff44aa";
        _stage.fillRect(target.sx, target.sy, _pieceWidth, _pieceHeight);
        _stage.restore();
        _stage.beginPath();
        _stage.strokeStyle = "#ff3399";
        _stage.lineWidth = 4;
        _stage.strokeRect(target.sx, target.sy, _pieceWidth, _pieceHeight);
    }
}
function changePlayerName(newName) {
    if (!newName.trim()) newName = "Гость";
    const oldName = currentPlayerName;
    currentPlayerName = newName;
    const oldIdx = ranking.findIndex(p => p.name === oldName);
    if (oldIdx !== -1) ranking.splice(oldIdx,1);
    ranking.push({ name: currentPlayerName, score: totalPuzzlesCompleted, coins: playerCoins });
    saveRanking();
    updateRankingUI();
}
window.onload = () => {
    const uploadInput = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const difficultySelect = document.getElementById('difficultySelect');
    const resetBtn = document.getElementById('resetBtn');
    const hintBtn = document.getElementById('hintBtn');
    const sabotageBtn = document.getElementById('sabotageBtn');
    const renameBtn = document.getElementById('renameBtn');
    const playerNameInput = document.getElementById('playerName');
    loadRanking();
    if (playerNameInput) playerNameInput.value = currentPlayerName;
    updateUI();
    if (uploadBtn) uploadBtn.onclick = () => uploadInput.click();
    if (uploadInput) uploadInput.onchange = e => { if (e.target.files[0]) loadUserImage(e.target.files[0]); };
    if (difficultySelect) difficultySelect.onchange = e => { const newDiff = parseInt(e.target.value,10); if (!isNaN(newDiff) && newDiff>0) { PUZZLE_DIFFICULTY = newDiff; if (_img && _img.complete) onImage(); else { _img = new Image(); _img.addEventListener('load',onImage,false); _img.src="img/puzzle.jpg"; } } };
    if (resetBtn) resetBtn.onclick = () => { if (_img && _img.complete) initPuzzle(); };
    if (hintBtn) hintBtn.onclick = useHint;
    if (sabotageBtn) sabotageBtn.onclick = doSabotage;
    if (renameBtn && playerNameInput) renameBtn.onclick = () => changePlayerName(playerNameInput.value);
    _canvas = document.getElementById('canvas');
    if (_canvas) _canvas.addEventListener('click', handleCanvasClickForCoins);
    PUZZLE_DIFFICULTY = 10;
    _img = new Image();
    _img.addEventListener('load', onImage, false);
    _img.src = "img/puzzle.jpg";
};
const style = document.createElement('style');
style.textContent = `.shake{animation:shakeAnim 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both}@keyframes shakeAnim{0%{transform:translate(0,0) rotate(0deg)}20%{transform:translate(-8px,2px) rotate(-1deg)}40%{transform:translate(8px,-3px) rotate(1deg)}60%{transform:translate(-4px,1px) rotate(0deg)}80%{transform:translate(4px,-1px) rotate(0deg)}100%{transform:translate(0,0) rotate(0)}}.rating-item{display:flex;justify-content:space-between;padding:8px 6px;border-bottom:1px solid #ffbfd0;font-family:'Segoe UI',sans-serif;}`;
document.head.appendChild(style);
function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
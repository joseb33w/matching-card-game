(() => {
  try {
    const EMOJIS = ['🍎','🍌','🍇','🍓','🍑','🍍','🥑','🥝','🍒','🥥','🍉','🍋','🍐','🍊','🥭','🍅','🌽','🥕','🍔','🍕','🌮','🍣','🍩','🍪'];

    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const movesEl = document.getElementById('moves');
    const matchesEl = document.getElementById('matches');
    const totalPairsEl = document.getElementById('totalPairs');
    const timerEl = document.getElementById('timer');
    const newGameBtn = document.getElementById('newGameBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const chips = Array.from(document.querySelectorAll('.chip'));

    let pairs = 6;
    let cards = [];
    let firstPick = null;
    let secondPick = null;
    let lock = false;
    let moves = 0;
    let matches = 0;
    let timerId = null;
    let elapsed = 0;
    let started = false;

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function fmtTime(s) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function startTimer() {
      if (timerId) return;
      timerId = setInterval(() => {
        elapsed += 1;
        timerEl.textContent = fmtTime(elapsed);
      }, 1000);
    }

    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function setBoardCols(n) {
      boardEl.classList.remove('cols-3', 'cols-4', 'cols-6');
      if (n === 6) boardEl.classList.add('cols-3');
      else if (n === 8) boardEl.classList.add('cols-4');
      else boardEl.classList.add('cols-6');
    }

    function buildBoard() {
      try {
        boardEl.innerHTML = '';
        const chosen = shuffle(EMOJIS).slice(0, pairs);
        const deck = shuffle([...chosen, ...chosen]);
        cards = deck.map((emoji, idx) => ({ emoji, idx, matched: false, flipped: false }));

        setBoardCols(pairs);
        totalPairsEl.textContent = pairs;

        cards.forEach((card) => {
          const el = document.createElement('button');
          el.className = 'card';
          el.type = 'button';
          el.setAttribute('aria-label', 'Hidden card');
          el.dataset.idx = card.idx;
          el.innerHTML = `
            <span class="card-face card-back">?</span>
            <span class="card-face card-front">${card.emoji}</span>
          `;
          el.addEventListener('click', () => onCardClick(card, el));
          boardEl.appendChild(el);
        });
      } catch (err) {
        console.error('Build board error:', err.message, err.stack);
      }
    }

    function onCardClick(card, el) {
      try {
        if (lock) return;
        if (card.matched || card.flipped) return;

        if (!started) {
          started = true;
          startTimer();
        }

        card.flipped = true;
        el.classList.add('flipped');

        if (!firstPick) {
          firstPick = { card, el };
          statusEl.textContent = 'Pick another card to find a match.';
          return;
        }

        secondPick = { card, el };
        moves += 1;
        movesEl.textContent = moves;
        lock = true;

        if (firstPick.card.emoji === secondPick.card.emoji) {
          firstPick.card.matched = true;
          secondPick.card.matched = true;
          firstPick.el.classList.add('matched');
          secondPick.el.classList.add('matched');
          matches += 1;
          matchesEl.textContent = matches;
          firstPick = null;
          secondPick = null;
          lock = false;

          if (matches === pairs) {
            stopTimer();
            statusEl.textContent = `🏆 You won in ${moves} moves and ${fmtTime(elapsed)}!`;
            statusEl.classList.add('win');
          } else {
            statusEl.textContent = 'Match! Keep going.';
          }
          return;
        }

        statusEl.textContent = 'No match. Try again!';
        setTimeout(() => {
          firstPick.card.flipped = false;
          secondPick.card.flipped = false;
          firstPick.el.classList.remove('flipped');
          secondPick.el.classList.remove('flipped');
          firstPick = null;
          secondPick = null;
          lock = false;
        }, 850);
      } catch (err) {
        console.error('Card click error:', err.message, err.stack);
      }
    }

    function reset() {
      try {
        stopTimer();
        elapsed = 0;
        moves = 0;
        matches = 0;
        firstPick = null;
        secondPick = null;
        lock = false;
        started = false;
        movesEl.textContent = '0';
        matchesEl.textContent = '0';
        timerEl.textContent = '0:00';
        statusEl.textContent = 'Tap any card to start!';
        statusEl.classList.remove('win');
        buildBoard();
      } catch (err) {
        console.error('Reset error:', err.message, err.stack);
      }
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        pairs = parseInt(chip.dataset.pairs, 10);
        reset();
      });
    });

    newGameBtn.addEventListener('click', reset);
    shuffleBtn.addEventListener('click', () => {
      reset();
    });

    reset();
  } catch (error) {
    console.error('Init error:', error.message, error.stack);
    document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#111827;color:white;font-family:sans-serif;padding:24px;"><section class="error-banner"><h1>Game failed to load</h1><p>Please refresh the preview and try again.</p></section></main>';
  }
})();

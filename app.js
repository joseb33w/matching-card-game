(() => {
  try {
    const DECKS = {
      snacks: ['🍎','🍌','🍇','🍓','🍑','🍍','🥑','🥝','🍒','🥥','🍉','🍋','🍐','🍊','🥭','🍅','🌽','🥕','🍔','🍕','🌮','🍣','🍩','🍪'],
      space: ['🚀','🛸','🌕','🪐','☄️','🌌','👽','🛰️','🔭','✨','🌍','🌞','⭐','🌠','🧑‍🚀','🕳️','🧪','🤖','⚡','💫','🪩','🧬','🔮','🛫'],
      beasts: ['🐉','🦄','🐺','🦊','🐼','🐸','🦁','🐯','🐙','🦋','🦖','🦕','🐢','🦉','🐬','🦀','🐝','🐳','🦇','🐲','🦜','🦥','🦩','🦔']
    };

    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const movesEl = document.getElementById('moves');
    const matchesEl = document.getElementById('matches');
    const totalPairsEl = document.getElementById('totalPairs');
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const streakEl = document.getElementById('streak');
    const bestScoreEl = document.getElementById('bestScore');
    const ratingEl = document.getElementById('rating');
    const progressBar = document.getElementById('progressBar');
    const newGameBtn = document.getElementById('newGameBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const peekBtn = document.getElementById('peekBtn');
    const hintBtn = document.getElementById('hintBtn');
    const twistBtn = document.getElementById('twistBtn');
    const soundBtn = document.getElementById('soundBtn');
    const winDialog = document.getElementById('winDialog');
    const closeDialog = document.getElementById('closeDialog');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const chips = Array.from(document.querySelectorAll('.chip'));
    const deckButtons = Array.from(document.querySelectorAll('[data-deck]'));
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));

    let pairs = 6;
    let deckName = 'snacks';
    let mode = 'classic';
    let cards = [];
    let firstPick = null;
    let secondPick = null;
    let lock = false;
    let moves = 0;
    let matches = 0;
    let score = 0;
    let streak = 0;
    let timerId = null;
    let elapsed = 0;
    let started = false;
    let soundOn = false;
    let powerups = { peek: 2, hint: 3, twist: 1 };
    let audioCtx = null;

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i -= 1) {
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

    function bestKey() { return `match-mania-best-${deckName}-${mode}-${pairs}`; }

    function loadBest() {
      bestScoreEl.textContent = localStorage.getItem(bestKey()) || '0';
    }

    function saveBest() {
      const currentBest = Number(localStorage.getItem(bestKey()) || 0);
      if (score > currentBest) {
        localStorage.setItem(bestKey(), String(score));
        bestScoreEl.textContent = score;
        return true;
      }
      return false;
    }

    function ratingFor() {
      if (score >= pairs * 220) return 'Legend';
      if (score >= pairs * 170) return 'Ace';
      if (score >= pairs * 120) return 'Sharp';
      return 'Rookie';
    }

    function updateHud() {
      movesEl.textContent = moves;
      matchesEl.textContent = matches;
      scoreEl.textContent = score;
      streakEl.textContent = `x${streak}`;
      ratingEl.textContent = ratingFor();
      progressBar.style.width = `${Math.round((matches / pairs) * 100)}%`;
      document.getElementById('peekCount').textContent = powerups.peek;
      document.getElementById('hintCount').textContent = powerups.hint;
      document.getElementById('twistCount').textContent = powerups.twist;
      peekBtn.disabled = powerups.peek <= 0 || lock;
      hintBtn.disabled = powerups.hint <= 0 || lock;
      twistBtn.disabled = powerups.twist <= 0 || lock;
    }

    function setStatus(text, tone = '') {
      statusEl.textContent = text;
      statusEl.className = `status ${tone}`.trim();
      if (tone === 'hot') {
        setTimeout(() => statusEl.classList.remove('hot'), 700);
      }
    }

    function startTimer() {
      if (timerId || mode === 'zen') return;
      timerId = setInterval(() => {
        elapsed += 1;
        timerEl.textContent = fmtTime(elapsed);
        if (mode === 'sprint' && elapsed >= 90) {
          setStatus('Sprint clock expired — finish strong, but bonus scoring is over!', 'hot');
        }
      }, 1000);
    }

    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function beep(freq, duration = 0.08, type = 'sine') {
      if (!soundOn) return;
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.value = 0.045;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
      } catch (err) {
        console.error('Audio error:', err.message, err.stack);
      }
    }

    function setBoardCols(n) {
      boardEl.classList.remove('cols-3', 'cols-4', 'cols-6');
      if (n === 6) boardEl.classList.add('cols-3');
      else if (n === 8) boardEl.classList.add('cols-4');
      else boardEl.classList.add('cols-6');
    }

    function buildBoard(reveal = true) {
      try {
        boardEl.innerHTML = '';
        const chosen = shuffle(DECKS[deckName]).slice(0, pairs);
        const deck = shuffle([...chosen, ...chosen]);
        cards = deck.map((emoji, idx) => ({ emoji, idx, matched: false, flipped: false, el: null }));

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
          card.el = el;
          el.addEventListener('click', () => onCardClick(card));
          boardEl.appendChild(el);
        });

        if (reveal) previewBoard();
      } catch (err) {
        console.error('Build board error:', err.message, err.stack);
      }
    }

    function previewBoard() {
      lock = true;
      cards.forEach((card) => card.el.classList.add('flipped'));
      const previewMs = mode === 'sprint' ? 900 : 1200;
      setStatus('Memorize the board...');
      setTimeout(() => {
        cards.forEach((card) => card.el.classList.remove('flipped'));
        lock = false;
        setStatus(mode === 'sprint' ? 'Sprint mode: match fast for time bonuses!' : 'Tap any card to start!');
      }, previewMs);
    }

    function ensureStarted() {
      if (!started) {
        started = true;
        startTimer();
      }
    }

    function onCardClick(card) {
      try {
        if (lock || card.matched || card.flipped) return;
        ensureStarted();
        revealCard(card);
        beep(520, 0.05, 'triangle');

        if (!firstPick) {
          firstPick = card;
          setStatus('Pick another card to find a match.');
          return;
        }

        secondPick = card;
        moves += 1;
        lock = true;

        if (firstPick.emoji === secondPick.emoji) {
          handleMatch();
          return;
        }

        handleMiss();
      } catch (err) {
        console.error('Card click error:', err.message, err.stack);
      }
    }

    function revealCard(card) {
      card.flipped = true;
      card.el.classList.add('flipped');
    }

    function hideCard(card) {
      card.flipped = false;
      card.el.classList.remove('flipped');
    }

    function handleMatch() {
      firstPick.matched = true;
      secondPick.matched = true;
      firstPick.el.classList.add('matched');
      secondPick.el.classList.add('matched');
      matches += 1;
      streak += 1;
      const speedBonus = mode === 'sprint' ? Math.max(0, 90 - elapsed) : Math.max(0, 45 - elapsed);
      const points = 100 + (streak * 25) + Math.floor(speedBonus / 3);
      score += points;
      beep(740, 0.07, 'sine');
      setTimeout(() => beep(960, 0.08, 'sine'), 80);
      firstPick = null;
      secondPick = null;
      lock = false;
      updateHud();

      if (matches === pairs) {
        completeGame();
      } else {
        setStatus(`Match! +${points} points. Combo x${streak}`, 'hot');
      }
    }

    function handleMiss() {
      streak = 0;
      score = Math.max(0, score - 12);
      updateHud();
      setStatus('No match. Watch the positions and try again!');
      beep(180, 0.08, 'sawtooth');
      setTimeout(() => {
        hideCard(firstPick);
        hideCard(secondPick);
        firstPick = null;
        secondPick = null;
        lock = false;
        updateHud();
      }, 760);
    }

    function completeGame() {
      stopTimer();
      const moveBonus = Math.max(0, (pairs * 3 - moves) * 18);
      const timeBonus = mode === 'zen' ? 75 : Math.max(0, 180 - elapsed) * 2;
      score += moveBonus + timeBonus;
      updateHud();
      const isBest = saveBest();
      setStatus(`🏆 Quest complete! Final score: ${score}${isBest ? ' · New best!' : ''}`, 'win');
      celebrate();
      showWinDialog(isBest, moveBonus + timeBonus);
    }

    function showWinDialog(isBest, bonus) {
      document.getElementById('finalScore').textContent = score;
      document.getElementById('finalMoves').textContent = moves;
      document.getElementById('finalTime').textContent = fmtTime(elapsed);
      document.getElementById('winTitle').textContent = isBest ? 'New best score!' : 'Brilliant memory!';
      document.getElementById('winSummary').textContent = `You cleared ${pairs} pairs in ${moves} moves, earned ${bonus} finish bonus points, and reached ${ratingFor()} rank.`;
      if (typeof winDialog.showModal === 'function') winDialog.showModal();
    }

    function celebrate() {
      const colors = ['#facc15', '#34d399', '#38bdf8', '#f472b6', '#a78bfa'];
      for (let i = 0; i < 80; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti';
        piece.style.setProperty('--x', `${Math.random() * 100}vw`);
        piece.style.setProperty('--c', colors[i % colors.length]);
        piece.style.animationDelay = `${Math.random() * 0.4}s`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 2100);
      }
    }

    function reset() {
      try {
        stopTimer();
        elapsed = 0;
        moves = 0;
        matches = 0;
        score = 0;
        streak = 0;
        firstPick = null;
        secondPick = null;
        lock = false;
        started = false;
        powerups = mode === 'sprint' ? { peek: 1, hint: 2, twist: 1 } : mode === 'zen' ? { peek: 3, hint: 4, twist: 2 } : { peek: 2, hint: 3, twist: 1 };
        timerEl.textContent = mode === 'zen' ? '∞' : '0:00';
        setStatus('Tap any card to start!');
        loadBest();
        updateHud();
        buildBoard(true);
      } catch (err) {
        console.error('Reset error:', err.message, err.stack);
      }
    }

    function usePeek() {
      if (lock || powerups.peek <= 0) return;
      ensureStarted();
      powerups.peek -= 1;
      updateHud();
      lock = true;
      setStatus('Peek active! Study the remaining cards.');
      cards.filter((c) => !c.matched).forEach(revealCard);
      setTimeout(() => {
        cards.filter((c) => !c.matched && c !== firstPick && c !== secondPick).forEach(hideCard);
        lock = false;
        updateHud();
      }, 950);
    }

    function useHint() {
      if (lock || powerups.hint <= 0) return;
      ensureStarted();
      const remaining = cards.filter((c) => !c.matched && !c.flipped);
      const groups = remaining.reduce((acc, card) => {
        acc[card.emoji] = acc[card.emoji] || [];
        acc[card.emoji].push(card);
        return acc;
      }, {});
      const pair = Object.values(groups).find((group) => group.length >= 2);
      if (!pair) return;
      powerups.hint -= 1;
      pair.slice(0, 2).forEach((card) => card.el.classList.add('hint'));
      setStatus('Hint: glowing cards are a pair.');
      updateHud();
      setTimeout(() => pair.slice(0, 2).forEach((card) => card.el.classList.remove('hint')), 1200);
    }

    function useTwist() {
      if (lock || powerups.twist <= 0) return;
      ensureStarted();
      powerups.twist -= 1;
      const unmatched = cards.filter((c) => !c.matched && !c.flipped);
      const emojis = shuffle(unmatched.map((c) => c.emoji));
      unmatched.forEach((card, idx) => {
        card.emoji = emojis[idx];
        card.el.querySelector('.card-front').textContent = card.emoji;
      });
      setStatus('Twist shuffled the unmatched cards!');
      updateHud();
      previewBoard();
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        pairs = parseInt(chip.dataset.pairs, 10);
        reset();
      });
    });

    deckButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        deckButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        deckName = btn.dataset.deck;
        reset();
      });
    });

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        mode = btn.dataset.mode;
        reset();
      });
    });

    newGameBtn.addEventListener('click', reset);
    shuffleBtn.addEventListener('click', reset);
    peekBtn.addEventListener('click', usePeek);
    hintBtn.addEventListener('click', useHint);
    twistBtn.addEventListener('click', useTwist);
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.innerHTML = soundOn ? '<span>🔊</span> Sound' : '<span>🔇</span> Sound';
      beep(660, 0.06, 'triangle');
    });
    closeDialog.addEventListener('click', () => winDialog.close());
    playAgainBtn.addEventListener('click', () => {
      winDialog.close();
      reset();
    });

    reset();
  } catch (error) {
    console.error('Init error:', error.message, error.stack);
    document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#111827;color:white;font-family:sans-serif;padding:24px;"><section class="error-banner"><h1>Game failed to load</h1><p>Please refresh the preview and try again.</p></section></main>';
  }
})();

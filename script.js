(() => {
  // DOM Selectors
  const $ = (s) => document.querySelector(s);
  const body      = document.body;
  const textarea  = $('#notepad');
  const charAll   = $('#char-all');
  const charNo    = $('#char-no');
  const board     = $('#board');
  const preview   = $('#preview');
  const previewEl = $('#preview-body');
  const splitBtn  = $('#split-toggle');
  const moodBtns  = document.querySelectorAll('.mood');
  const moodName  = $('#mood-name');
  const moodNote  = $('#mood-note');
  const status    = $('#status');

  /* ---------- state ---------- */
  let splitEnabled = true;   // manual split override
  let typingTimer  = null;

  /* ---------- markdown detection ---------- */
  const blockMd  = /^(#{1,6} |[-*+] |> |\d+\. |```|---\s*$)/m;
  const inlineMd = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\))/;

  const hasMarkdown = (txt) => blockMd.test(txt) || inlineMd.test(txt);

  /* ---------- number formatter ---------- */
  const formatNum = (n) => n.toLocaleString();

  /* ---------- counts updates (supports selected text character count) ---------- */
  const updateCounts = () => {
    const text = textarea.value;
    const totalAll = text.length;
    const totalNo  = text.replace(/\s/g, '').length;

    // Check if there is a text selection inside the active notepad textarea
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = (start !== end) && (document.activeElement === textarea);

    if (hasSelection) {
      const selectedText = text.substring(start, end);
      const selAll = selectedText.length;
      const selNo  = selectedText.replace(/\s/g, '').length;

      // Update footer stats with the selected character counts in standard format
      charAll.innerHTML = `${formatNum(totalAll)}<span class="stat-selected">(${formatNum(selAll)} selected)</span>`;
      charNo.innerHTML  = `${formatNum(totalNo)}<span class="stat-selected">(${formatNum(selNo)} selected)</span>`;
    } else {
      charAll.textContent = formatNum(totalAll);
      charNo.textContent  = formatNum(totalNo);
    }
  };

  /* ---------- markdown preview updates ---------- */
  const updatePreview = () => {
    const text = textarea.value;
    const wantPreview = splitEnabled && text.length > 0 && hasMarkdown(text);
    
    board.classList.toggle('split', wantPreview);
    preview.setAttribute('aria-hidden', wantPreview ? 'false' : 'true');
    
    if (wantPreview) {
      previewEl.innerHTML = window.marked.parse(text);
    } else {
      previewEl.innerHTML = '';
    }
  };

  /* ---------- gentle status line ---------- */
  const setStatus = (label) => {
    status.textContent = label;
    status.classList.toggle('live', label !== 'at rest');
  };

  // Event listener for textarea typing
  textarea.addEventListener('input', () => {
    setStatus('writing');
    updateCounts();
    updatePreview();
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      setStatus(textarea.value.trim() ? 'paused' : 'at rest');
    }, 1400);
  });

  textarea.addEventListener('focus', () => {
    if (!textarea.value.trim()) {
      setStatus('ready');
    }
  });

  textarea.addEventListener('blur', () => {
    setStatus(textarea.value.trim() ? 'paused' : 'at rest');
  });

  // Track selection changes to update counts in real time (e.g. dragging mouse/keyboard select)
  document.addEventListener('selectionchange', () => {
    updateCounts();
  });

  /* ---------- split toggle ---------- */
  const setSplit = (on) => {
    splitEnabled = on;
    splitBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    splitBtn.querySelector('.split-label').textContent = on ? 'split' : 'solo';
    updatePreview();
    localStorage.setItem('note-split', on ? '1' : '0');
  };
  
  splitBtn.addEventListener('click', () => setSplit(!splitEnabled));

  /* ---------- moods ---------- */
  const setMood = (mood) => {
    const btn = document.querySelector(`.mood[data-mood="${mood}"]`);
    if (!btn) return;
    body.setAttribute('data-mood', mood);
    moodBtns.forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
    moodName.textContent = btn.dataset.name;
    moodNote.textContent = btn.dataset.note;
    localStorage.setItem('note-mood', mood);
  };

  moodBtns.forEach((b) => {
    b.addEventListener('click', () => setMood(b.dataset.mood));
  });

  /* ---------- restore + autosave content ---------- */
  const savedText  = localStorage.getItem('note-text');
  if (savedText) {
    textarea.value = savedText;
  }

  let saveTimer = null;
  textarea.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem('note-text', textarea.value);
    }, 350);
  });

  /* ---------- init ---------- */
  const savedMood  = localStorage.getItem('note-mood')  || 'paper';
  const savedSplit = localStorage.getItem('note-split');
  
  setMood(savedMood);
  setSplit(savedSplit === null ? true : savedSplit === '1');
  
  updateCounts();
  updatePreview();
  setStatus(textarea.value.trim() ? 'paused' : 'at rest');

  /* ---------- keyboard niceties ---------- */
  // Tab key inserts soft tab inside textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = textarea.selectionStart;
      const en = textarea.selectionEnd;
      textarea.value = textarea.value.slice(0, s) + '  ' + textarea.value.slice(en);
      textarea.selectionStart = textarea.selectionEnd = s + 2;
      
      // Update counts immediately when tab key changes selection
      updateCounts();
    }
  });
})();

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
  const page      = $('#page');
  const tabIndex  = $('#tab-index');

  // Context Menu & Modals
  const contextMenu   = $('#context-menu');
  const renameOption  = $('#rename-option');
  const renameModal   = $('#rename-modal');
  const renameInput   = $('#rename-input');
  const confirmRename = $('#confirm-rename');
  const cancelRename  = $('#cancel-rename');
  const closeModal    = $('#close-modal');
  const confirmClose  = $('#confirm-close');
  const cancelClose   = $('#cancel-close');

  /* ---------- index tab colours (file-folder palette) ---------- */
  const TAB_COLORS = [
    { bg: '#d47f7f', fg: '#fff' },     // soft red
    { bg: '#d4a06a', fg: '#fff' },     // amber
    { bg: '#c9bf5a', fg: '#3d3a20' },  // olive gold
    { bg: '#6bb887', fg: '#fff' },     // green
    { bg: '#5b9eb8', fg: '#fff' },     // teal
    { bg: '#7d83c4', fg: '#fff' },     // periwinkle
    { bg: '#b074a8', fg: '#fff' },     // orchid
    { bg: '#c49888', fg: '#fff' },     // salmon
  ];

  /* ---------- state ---------- */
  let splitEnabled = true;
  let typingTimer  = null;

  // Tab state
  let tabs = JSON.parse(localStorage.getItem('note-tabs')) || [
    { id: Date.now(), title: 'Untitled 1', content: '', colorIndex: 0 }
  ];
  let activeTabId = parseInt(localStorage.getItem('note-active-tab')) || tabs[0].id;
  let contextMenuTabId = null;
  let pendingCloseTabId = null;

  // Ensure active tab exists
  if (!tabs.find(t => t.id === activeTabId)) {
    activeTabId = tabs[0].id;
  }

  // Ensure every tab has a colorIndex
  tabs.forEach((tab, i) => {
    if (tab.colorIndex === undefined) tab.colorIndex = i % TAB_COLORS.length;
  });

  /* ---------- tab state persistence ---------- */
  const saveTabState = () => {
    localStorage.setItem('note-tabs', JSON.stringify(tabs));
    localStorage.setItem('note-active-tab', activeTabId);
  };

  /* ---------- markdown detection ---------- */
  const blockMd  = /^(#{1,6} |[-*+] |> |\d+\. |```|---\s*$)/m;
  const inlineMd = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\))/;
  const hasMarkdown = (txt) => blockMd.test(txt) || inlineMd.test(txt);

  /* ---------- number formatter ---------- */
  const formatNum = (n) => n.toLocaleString();

  /* ---------- counts ---------- */
  const updateCounts = () => {
    const text = textarea.value;
    const totalAll = text.length;
    const totalNo  = text.replace(/\s/g, '').length;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = (start !== end) && (document.activeElement === textarea);

    if (hasSelection) {
      const sel = text.substring(start, end);
      const selAll = sel.length;
      const selNo  = sel.replace(/\s/g, '').length;
      charAll.innerHTML = `${formatNum(totalAll)}<span class="stat-selected">(${formatNum(selAll)} selected)</span>`;
      charNo.innerHTML  = `${formatNum(totalNo)}<span class="stat-selected">(${formatNum(selNo)} selected)</span>`;
    } else {
      charAll.textContent = formatNum(totalAll);
      charNo.textContent  = formatNum(totalNo);
    }
  };

  /* ---------- markdown preview ---------- */
  const updatePreview = () => {
    const text = textarea.value;
    const wantPreview = splitEnabled && text.length > 0 && hasMarkdown(text);
    board.classList.toggle('split', wantPreview);
    preview.setAttribute('aria-hidden', wantPreview ? 'false' : 'true');
    previewEl.innerHTML = wantPreview ? window.marked.parse(text) : '';
  };

  /* ---------- status ---------- */
  const setStatus = (label) => {
    status.textContent = label;
    status.classList.toggle('live', label !== 'at rest');
  };

  /* ========================================================
     INDEX TAB MANAGEMENT
     ======================================================== */

  const renderTabs = () => {
    tabIndex.innerHTML = '';

    tabs.forEach((tab) => {
      const clr = TAB_COLORS[tab.colorIndex % TAB_COLORS.length];
      const isActive = tab.id === activeTabId;

      const el = document.createElement('div');
      el.className = `idx-tab${isActive ? ' active' : ''}`;
      el.style.setProperty('--tab-bg', clr.bg);
      el.style.setProperty('--tab-fg', clr.fg);

      // Title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'idx-tab-title';
      titleSpan.textContent = tab.title;
      el.appendChild(titleSpan);

      // Close button (only when >1 tab)
      if (tabs.length > 1) {
        const closeSpan = document.createElement('span');
        closeSpan.className = 'idx-tab-close';
        closeSpan.textContent = '×';
        closeSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          requestCloseTab(tab.id);
        });
        el.appendChild(closeSpan);
      }

      // Click to switch
      el.addEventListener('click', () => {
        if (tab.id !== activeTabId) switchTab(tab.id);
      });

      // Right-click context menu
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        contextMenuTabId = tab.id;
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
      });

      tabIndex.appendChild(el);
    });

    // + add button at the end
    const addBtn = document.createElement('button');
    addBtn.className = 'idx-tab-add';
    addBtn.setAttribute('aria-label', 'Add new tab');
    addBtn.textContent = '+';
    addBtn.addEventListener('click', addTab);
    tabIndex.appendChild(addBtn);
  };

  const switchTab = (id) => {
    // Save current tab's content
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
      currentTab.content = textarea.value;
      const firstLine = currentTab.content.split('\n')[0].trim();
      if (firstLine.startsWith('# ')) {
        currentTab.title = firstLine.substring(2).trim() || 'Untitled';
      }
    }

    activeTabId = id;
    const newTab = tabs.find(t => t.id === activeTabId);
    textarea.value = newTab.content;

    saveTabState();
    renderTabs();
    updateCounts();
    updatePreview();
  };

  const addTab = () => {
    // Save current content first
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) currentTab.content = textarea.value;

    const newId = Date.now();
    const newTab = {
      id: newId,
      title: `Untitled ${tabs.length + 1}`,
      content: '',
      colorIndex: tabs.length % TAB_COLORS.length
    };
    tabs.push(newTab);
    switchTab(newId);
  };

  const closeTab = (id) => {
    const index = tabs.findIndex(t => t.id === id);
    tabs = tabs.filter(t => t.id !== id);

    if (id === activeTabId) {
      const newIndex = Math.max(0, index - 1);
      activeTabId = tabs[newIndex].id;
    }

    const activeTab = tabs.find(t => t.id === activeTabId);
    textarea.value = activeTab.content;

    saveTabState();
    renderTabs();
    updateCounts();
    updatePreview();
  };

  const closeTabWithAnimation = (id) => {
    const allTabs = tabIndex.querySelectorAll('.idx-tab');
    const tabEl = Array.from(allTabs).find((el, i) => tabs[i]?.id === id);
    if (tabEl) {
      tabEl.style.opacity = '0';
      tabEl.style.transform = 'translateY(4px) scaleX(.92)';
      tabEl.style.transition = 'opacity .25s ease, transform .25s ease';
      setTimeout(() => closeTab(id), 260);
    } else {
      closeTab(id);
    }
  };

  const requestCloseTab = (id) => {
    if (tabs.length === 1) return;
    openCloseModal(id);
  };

  // Update current tab content on typing
  textarea.addEventListener('input', () => {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
      currentTab.content = textarea.value;
      const firstLine = currentTab.content.split('\n')[0].trim();
      if (firstLine.startsWith('# ')) {
        currentTab.title = firstLine.substring(2).trim() || 'Untitled';
        // Update just the title text in the rendered tab (avoid full re-render)
        const allTabs = tabIndex.querySelectorAll('.idx-tab');
        const idx = tabs.findIndex(t => t.id === activeTabId);
        if (allTabs[idx]) {
          const titleEl = allTabs[idx].querySelector('.idx-tab-title');
          if (titleEl) titleEl.textContent = currentTab.title;
        }
      }
      saveTabState();
    }
  });

  /* ---------- context menu & modals ---------- */

  const openCloseModal = (id) => {
    pendingCloseTabId = id;
    closeModal.style.display = 'flex';
  };

  const closeCloseModal = () => {
    closeModal.style.display = 'none';
    pendingCloseTabId = null;
  };

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = 'none';
    }
  });

  const openRenameModal = (id) => {
    contextMenuTabId = id;
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      renameInput.value = tab.title;
      renameModal.style.display = 'flex';
      renameInput.focus();
      renameInput.select();
    }
    contextMenu.style.display = 'none';
  };

  renameOption.addEventListener('click', () => {
    if (contextMenuTabId) openRenameModal(contextMenuTabId);
  });

  const closeRenameModal = () => {
    renameModal.style.display = 'none';
    contextMenuTabId = null;
  };

  cancelRename.addEventListener('click', closeRenameModal);

  const performRename = () => {
    if (contextMenuTabId && renameInput.value.trim()) {
      const tab = tabs.find(t => t.id === contextMenuTabId);
      if (tab) {
        tab.title = renameInput.value.trim();
        saveTabState();
        renderTabs();
      }
    }
    closeRenameModal();
  };

  confirmRename.addEventListener('click', performRename);

  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performRename();
    if (e.key === 'Escape') closeRenameModal();
  });

  renameModal.addEventListener('click', (e) => {
    if (e.target === renameModal) closeRenameModal();
  });

  const performCloseTab = () => {
    if (!pendingCloseTabId) return;
    closeTabWithAnimation(pendingCloseTabId);
    closeCloseModal();
  };

  confirmClose.addEventListener('click', performCloseTab);
  cancelClose.addEventListener('click', closeCloseModal);

  closeModal.addEventListener('click', (e) => {
    if (e.target === closeModal) closeCloseModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (closeModal.style.display === 'flex') closeCloseModal();
      if (renameModal.style.display === 'flex') closeRenameModal();
    }
  });

  // Initial tab render + load active content
  renderTabs();
  textarea.value = tabs.find(t => t.id === activeTabId).content;

  /* ========================================================
     EXISTING FEATURES
     ======================================================== */

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
    if (!textarea.value.trim()) setStatus('ready');
  });

  textarea.addEventListener('blur', () => {
    setStatus(textarea.value.trim() ? 'paused' : 'at rest');
  });

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

  /* ---------- init ---------- */
  const savedMood  = localStorage.getItem('note-mood')  || 'paper';
  const savedSplit = localStorage.getItem('note-split');

  setMood(savedMood);
  setSplit(savedSplit === null ? true : savedSplit === '1');

  updateCounts();
  updatePreview();
  setStatus(textarea.value.trim() ? 'paused' : 'at rest');

  /* ---------- keyboard niceties ---------- */
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = textarea.selectionStart;
      const en = textarea.selectionEnd;
      textarea.value = textarea.value.slice(0, s) + '  ' + textarea.value.slice(en);
      textarea.selectionStart = textarea.selectionEnd = s + 2;
      updateCounts();
    }
  });

  /* ========================================================
     SYMMETRIC RESIZE
     ======================================================== */
  const initResize = () => {
    const resizeHandles = {
      left:   document.querySelector('.resize-handle-left'),
      right:  document.querySelector('.resize-handle-right'),
      top:    document.querySelector('.resize-handle-top'),
      bottom: document.querySelector('.resize-handle-bottom')
    };

    if (!resizeHandles.left) return;

    let isResizing = false;
    let currentHandle = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    const minWidth = 320;

    const getMaxHeight = () => {
      const bodyStyles = getComputedStyle(document.body);
      const paddingTop = parseFloat(bodyStyles.paddingTop) || 0;
      const paddingBottom = parseFloat(bodyStyles.paddingBottom) || 0;
      return window.innerHeight - paddingTop - paddingBottom;
    };

    const getMinHeight = () => {
      const masthead = page.querySelector('.masthead');
      const bench    = page.querySelector('.bench');
      const mastheadH = masthead ? masthead.getBoundingClientRect().height : 0;
      const benchH    = bench    ? bench.getBoundingClientRect().height    : 0;
      const gap = parseFloat(getComputedStyle(page).gap) || 0;
      return mastheadH + benchH + gap * 3 + 160;
    };

    const startResize = (e, handleType) => {
      e.preventDefault();
      isResizing = true;
      currentHandle = handleType;
      startX = e.clientX;
      startY = e.clientY;

      const rect = page.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;

      document.body.style.userSelect = 'none';
      document.body.style.cursor = (handleType === 'left' || handleType === 'right') ? 'ew-resize' : 'ns-resize';
    };

    const stopResize = () => {
      if (!isResizing) return;
      isResizing = false;
      currentHandle = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const handleResize = (e) => {
      if (!isResizing) return;

      if (currentHandle === 'right') {
        const delta = e.clientX - startX;
        page.style.maxWidth = `${Math.max(minWidth, startWidth + delta * 2)}px`;
      } else if (currentHandle === 'left') {
        const delta = startX - e.clientX;
        page.style.maxWidth = `${Math.max(minWidth, startWidth + delta * 2)}px`;
      } else if (currentHandle === 'bottom') {
        const delta = e.clientY - startY;
        const maxH = getMaxHeight();
        const minH = getMinHeight();
        const h = Math.min(Math.max(minH, startHeight + delta), maxH);
        page.style.minHeight = `${h}px`;
        page.style.height = `${h}px`;
      } else if (currentHandle === 'top') {
        const delta = startY - e.clientY;
        const maxH = getMaxHeight();
        const minH = getMinHeight();
        const h = Math.min(Math.max(minH, startHeight + delta), maxH);
        page.style.minHeight = `${h}px`;
        page.style.height = `${h}px`;
      }
    };

    resizeHandles.left.addEventListener('mousedown', (e) => { e.stopPropagation(); startResize(e, 'left'); });
    resizeHandles.right.addEventListener('mousedown', (e) => { e.stopPropagation(); startResize(e, 'right'); });
    resizeHandles.top.addEventListener('mousedown', (e) => { e.stopPropagation(); startResize(e, 'top'); });
    resizeHandles.bottom.addEventListener('mousedown', (e) => { e.stopPropagation(); startResize(e, 'bottom'); });

    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  };

  initResize();
})();

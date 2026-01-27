document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('notepad');
    const charCountAll = document.getElementById('char-count-all');
    const charCountNoSpaces = document.getElementById('char-count-no-spaces');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const body = document.body;
    const appContainer = document.querySelector('.app-container');
    const previewPane = document.getElementById('preview-pane');
    const splitToggle = document.getElementById('split-toggle');
    const tabsList = document.getElementById('tabs-list');
    const addTabBtn = document.getElementById('add-tab-btn');



    // Tab State Management
    let tabs = JSON.parse(localStorage.getItem('notepad-tabs')) || [
        { id: Date.now(), title: 'Untitled 1', content: '' }
    ];
    let activeTabId = parseInt(localStorage.getItem('notepad-active-tab')) || tabs[0].id;

    // Ensure active tab exists
    if (!tabs.find(t => t.id === activeTabId)) {
        activeTabId = tabs[0].id;
    }

    // Save State
    const saveState = () => {
        localStorage.setItem('notepad-tabs', JSON.stringify(tabs));
        localStorage.setItem('notepad-active-tab', activeTabId);
    };

    // Render Tabs
    const renderTabs = () => {
        tabsList.innerHTML = '';
        tabs.forEach((tab, index) => {
            const tabEl = document.createElement('div');
            tabEl.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;

            // Only show close button for tabs other than the first one
            const closeBtnHtml = index > 0 ? `<span class="tab-close" data-id="${tab.id}">×</span>` : '';

            tabEl.innerHTML = `
                <span class="tab-title">${tab.title}</span>
                ${closeBtnHtml}
            `;

            // Switch tab on click
            tabEl.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                    switchTab(tab.id);
                }
            });

            // Context Menu (Right Click)
            tabEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                contextMenuTabId = tab.id;

                // Position menu
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.top = `${e.clientY}px`;
            });

            // Close tab (only if button exists)
            if (index > 0) {
                tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                });
            }

            tabsList.appendChild(tabEl);
        });
    };

    // Switch Tab
    const switchTab = (id) => {
        // Save current content before switching
        const currentTab = tabs.find(t => t.id === activeTabId);
        if (currentTab) {
            currentTab.content = textarea.value;
            // Update title if content starts with #
            const firstLine = currentTab.content.split('\n')[0].trim();
            if (firstLine.startsWith('# ')) {
                currentTab.title = firstLine.substring(2).trim() || 'Untitled';
            }
        }

        activeTabId = id;
        const newTab = tabs.find(t => t.id === activeTabId);
        textarea.value = newTab.content;

        saveState();
        renderTabs();
        updateCountsAndPreview();
    };

    // Add Tab
    const addTab = () => {
        const newId = Date.now();
        const newTab = {
            id: newId,
            title: `Untitled ${tabs.length + 1}`,
            content: ''
        };
        tabs.push(newTab);
        switchTab(newId);
    };

    // Close Tab
    const closeTab = (id) => {
        if (tabs.length === 1) {
            alert('Cannot close the last tab.');
            return;
        }

        const index = tabs.findIndex(t => t.id === id);
        tabs = tabs.filter(t => t.id !== id);

        if (id === activeTabId) {
            // Switch to previous tab or next tab
            const newIndex = Math.max(0, index - 1);
            activeTabId = tabs[newIndex].id;
        }

        // Just update UI, content loading happens in switchTab logic or explicit set
        // But here we need to ensure the displayed content is correct if we switched
        const activeTab = tabs.find(t => t.id === activeTabId);
        textarea.value = activeTab.content;

        saveState();
        renderTabs();
        updateCountsAndPreview();
    };

    addTabBtn.addEventListener('click', addTab);

    // Update current tab content on input
    textarea.addEventListener('input', () => {
        const currentTab = tabs.find(t => t.id === activeTabId);
        if (currentTab) {
            currentTab.content = textarea.value;
            // Update title dynamically if needed (optional, maybe distracting)
            const firstLine = currentTab.content.split('\n')[0].trim();
            if (firstLine.startsWith('# ')) {
                currentTab.title = firstLine.substring(2).trim() || 'Untitled';
                // Find the specific tab element and update text to avoid full re-render
                const tabEl = Array.from(tabsList.children).find((el, index) => tabs[index].id === activeTabId);
                if (tabEl) tabEl.querySelector('.tab-title').textContent = currentTab.title;
            }
            saveState();
        }
    });

    // Initial Render
    renderTabs();
    textarea.value = tabs.find(t => t.id === activeTabId).content;


    // Markdown Detection Regex
    const markdownRegex = /^(# |\* |- |> |`|```)/m;
    const inlineMarkdownRegex = /(\*\*|__|`)/;

    // Character Counting & Markdown Logic
    const updateCountsAndPreview = () => {
        const text = textarea.value;
        const lengthAll = text.length;
        // Remove spaces, tabs, and newlines for the "no spaces" count
        const lengthNoSpaces = text.replace(/\s/g, '').length;

        charCountAll.textContent = lengthAll;
        charCountNoSpaces.textContent = lengthNoSpaces;

        // Check for Markdown
        const hasMarkdown = markdownRegex.test(text) || inlineMarkdownRegex.test(text);

        if (hasMarkdown && splitToggle.checked) {
            appContainer.classList.add('split-view');
            // Use marked.js to parse markdown
            previewPane.innerHTML = marked.parse(text);
        } else {
            appContainer.classList.remove('split-view');
            previewPane.innerHTML = '';
        }
    };

    textarea.addEventListener('input', updateCountsAndPreview);
    splitToggle.addEventListener('change', () => {
        updateCountsAndPreview();
        localStorage.setItem('split-toggle-state', splitToggle.checked);
    });

    // Load saved toggle state
    const savedToggleState = localStorage.getItem('split-toggle-state');
    if (savedToggleState !== null) {
        splitToggle.checked = savedToggleState === 'true';
    }

    // Initialize logic on load
    updateCountsAndPreview();

    // Theme Switching Logic
    const setTheme = (theme) => {
        // Remove all theme attributes first or just set the new one
        // Using data-attribute on body to control CSS variables
        if (theme === 'light') {
            body.removeAttribute('data-theme');
        } else {
            body.setAttribute('data-theme', theme);
        }

        // Update active state on buttons
        themeBtns.forEach(btn => {
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Save preference to localStorage
        localStorage.setItem('notepad-theme', theme);
    };

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('notepad-theme') || 'light';
    setTheme(savedTheme);

    // Selection Popup Logic
    const selectionPopup = document.getElementById('selection-popup');
    const popupCharCountAll = document.getElementById('popup-char-count-all');
    const popupCharCountNoSpaces = document.getElementById('popup-char-count-no-spaces');

    let userPreferredX = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const hidePopup = () => {
        selectionPopup.style.display = 'none';
    };

    const showPopup = (x, y, text) => {
        // Prevent showing if currently dragging
        if (isDragging) return;

        const lengthAll = text.length;
        const lengthNoSpaces = text.replace(/\s/g, '').length;

        popupCharCountAll.textContent = lengthAll;
        popupCharCountNoSpaces.textContent = lengthNoSpaces;

        // Position popup
        // Use userPreferredX if set, otherwise default next to cursor
        // top is always execution line dependent (y)
        let top = y + 15;
        let left = (userPreferredX !== null) ? userPreferredX : (x + 15);

        // Boundary checks (basic)
        const popupWidth = 200; // approximate
        if (left + popupWidth > window.innerWidth) {
            left = window.innerWidth - popupWidth - 20;
        }
        if (left < 10) {
            left = 10;
        }

        if (top + 80 > window.innerHeight) {
            top = y - 90; // show above if at bottom
        }

        selectionPopup.style.left = `${left}px`;
        selectionPopup.style.top = `${top}px`;
        selectionPopup.style.display = 'flex';
    };

    const handleSelection = (e) => {
        // Don't trigger if we just finished dragging the popup
        if (isDragging) return;

        // Use timeout to ensure selection is updated
        setTimeout(() => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (start !== end) {
                const selectedText = textarea.value.substring(start, end);
                if (e.type === 'mouseup') {
                    showPopup(e.clientX, e.clientY, selectedText);
                }
            } else {
                hidePopup();
            }
        }, 0);
    };

    // Drag Implementation
    selectionPopup.addEventListener('mousedown', (e) => {
        isDragging = true;

        // Calculate offset from the top-left of the popup
        const rect = selectionPopup.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        // Prevent default text selection during drag
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;

        selectionPopup.style.left = `${newX}px`;
        selectionPopup.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;

            // Save the current X position as preferred
            const rect = selectionPopup.getBoundingClientRect();
            userPreferredX = rect.left;
        }
    });

    // Textarea interaction
    textarea.addEventListener('mouseup', handleSelection);

    // Hide if clicking elsewhere
    document.addEventListener('mousedown', (e) => {
        // If clicking outside textarea and popup
        if (e.target !== textarea && !selectionPopup.contains(e.target)) {
            // Also ensure we aren't dragging
            if (!isDragging) {
                hidePopup();
            }
        }
    });

    // Context Menu & Rename Logic
    const contextMenu = document.getElementById('context-menu');
    const renameOption = document.getElementById('rename-option');
    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const confirmRename = document.getElementById('confirm-rename');
    const cancelRename = document.getElementById('cancel-rename');

    let contextMenuTabId = null;

    // Hide context menu on click elsewhere
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });

    // Helper to open rename modal
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

    // Rename Option Click
    renameOption.addEventListener('click', () => {
        if (contextMenuTabId) {
            openRenameModal(contextMenuTabId);
        }
    });

    // Modal Actions
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
                saveState();
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

    // Also hide on scroll to avoid detached popup
    textarea.addEventListener('scroll', hidePopup);
    window.addEventListener('resize', hidePopup);
});


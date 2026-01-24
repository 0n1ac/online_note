document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('notepad');
    const charCountAll = document.getElementById('char-count-all');
    const charCountNoSpaces = document.getElementById('char-count-no-spaces');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const body = document.body;
    const appContainer = document.querySelector('.app-container');
    const previewPane = document.getElementById('preview-pane');
    const splitToggle = document.getElementById('split-toggle');

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

    // Also hide on scroll to avoid detached popup
    textarea.addEventListener('scroll', hidePopup);
    window.addEventListener('resize', hidePopup);
});

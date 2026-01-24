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
});

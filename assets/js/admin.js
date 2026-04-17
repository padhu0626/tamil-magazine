/**
 * Admin tool — form handling for new issue creation
 * Phase 1 skeleton: basic form interactions, full logic in Phase 5
 */
(function () {
    'use strict';

    const form = document.getElementById('admin-form');
    const addArticleBtn = document.getElementById('add-article-btn');
    const articlesList = document.getElementById('articles-list');
    const pdfInfo = document.getElementById('pdf-info');
    const pdfUpload = document.getElementById('pdf-upload');
    const statusEl = document.getElementById('admin-status');

    // Set default date to today
    document.getElementById('publish-date').valueAsDate = new Date();

    // Auto-suggest issue ID from date
    const issueIdInput = document.getElementById('issue-id');
    const now = new Date();
    issueIdInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Add article row
    let articleCount = 0;
    addArticleBtn.addEventListener('click', function () {
        articleCount++;
        const row = document.createElement('div');
        row.className = 'article-row';
        row.innerHTML = `
            <input type="text" placeholder="கட்டுரை தலைப்பு" aria-label="கட்டுரை தலைப்பு">
            <input type="text" placeholder="ஆசிரியர்" aria-label="ஆசிரியர்">
            <input type="number" placeholder="தொடக்கம்" min="1" aria-label="தொடக்கப் பக்கம்">
            <input type="number" placeholder="முடிவு" min="1" aria-label="முடிவுப் பக்கம்">
            <button type="button" class="btn-remove" aria-label="நீக்கு">&times;</button>
        `;
        row.querySelector('.btn-remove').addEventListener('click', function () {
            row.remove();
        });
        articlesList.appendChild(row);
    });

    // PDF file info
    pdfUpload.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            pdfInfo.textContent = `${file.name} (${sizeMB} MB)`;
        }
    });

    // Form submit — Phase 5 will add ZIP generation
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        statusEl.hidden = false;
        statusEl.style.background = '#FFF3CD';
        statusEl.style.color = '#856404';
        statusEl.textContent = 'இதழ் தொகுப்பு உருவாக்கம் அடுத்த கட்டத்தில் சேர்க்கப்படும். (Phase 5)';
    });
})();

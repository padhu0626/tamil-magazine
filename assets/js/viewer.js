/**
 * Viewer page — loads PDF and displays pages
 * Phase 1 skeleton: placeholder only, PDF.js integration in Phase 3
 */
(function () {
    'use strict';

    const viewerTitle = document.getElementById('viewer-title');
    const viewerLoading = document.getElementById('viewer-loading');
    const viewerError = document.getElementById('viewer-error');
    const downloadBtn = document.getElementById('download-btn');

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const issueId = params.get('issue');

        if (!issueId) {
            showError();
            return;
        }

        try {
            const response = await fetch('issues/issues.json');
            if (!response.ok) throw new Error('Failed to load issues');
            const data = await response.json();

            const issue = (data.issues || []).find(i => i.id === issueId);
            if (!issue) {
                showError();
                return;
            }

            viewerTitle.textContent = issue.title;
            downloadBtn.href = issue.pdf_path;
            document.title = issue.title + ' — இரண்டாயிரம் ஆண்டுகள் இளமை';

            // Phase 3 will add PDF.js rendering here
            viewerLoading.innerHTML = `
                <p>இதழ்: <strong>${issue.title}</strong></p>
                <p>${issue.page_count} பக்கங்கள்</p>
                <p style="margin-top:1rem; color:#999;">PDF காட்சி அடுத்த கட்டத்தில் சேர்க்கப்படும்.</p>
                <a href="${issue.pdf_path}" class="btn" download style="margin-top:1rem;">PDF பதிவிறக்கம்</a>
            `;
        } catch (err) {
            console.error('Viewer error:', err);
            showError();
        }
    }

    function showError() {
        viewerLoading.hidden = true;
        viewerError.hidden = false;
    }

    init();
})();

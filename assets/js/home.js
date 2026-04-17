/**
 * Home page — fetches issues.json and renders issue cards
 */
(function () {
    'use strict';

    const issuesGrid = document.getElementById('issues-grid');
    const featuredSection = document.getElementById('featured-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    async function init() {
        try {
            const response = await fetch('issues/issues.json');
            if (!response.ok) throw new Error('Failed to load issues');
            const data = await response.json();
            render(data);
        } catch (err) {
            console.error('Error loading issues:', err);
            loadingIndicator.hidden = true;
            errorMessage.hidden = false;
        }
    }

    function render(data) {
        loadingIndicator.hidden = true;

        const issues = data.issues || [];
        if (issues.length === 0) {
            issuesGrid.innerHTML = '<p class="loading">இன்னும் இதழ்கள் வெளியிடப்படவில்லை.</p>';
            return;
        }

        // Sort newest first
        issues.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));

        // Featured issue
        const featured = issues.find(i => i.featured) || issues[0];
        featuredSection.innerHTML = renderFeaturedCard(featured);

        // Remaining issues
        const rest = issues.filter(i => i.id !== featured.id);
        issuesGrid.innerHTML = rest.map(renderIssueCard).join('');
    }

    function renderFeaturedCard(issue) {
        return `
            <article class="featured-card">
                <img class="card-image" src="${issue.cover_image}" alt="${issue.title}" loading="lazy">
                <div class="card-body">
                    <span class="featured-badge">சிறப்பு இதழ்</span>
                    <h2 class="card-title">${issue.title}</h2>
                    <p class="card-date">${formatDate(issue.published_date)} &middot; ${issue.page_count} பக்கங்கள்</p>
                    <div class="card-actions">
                        <a href="viewer.html?issue=${issue.id}" class="btn btn-primary">படிக்க</a>
                        <a href="${issue.pdf_path}" class="btn btn-secondary" download>பதிவிறக்கம்</a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderIssueCard(issue) {
        return `
            <article class="issue-card">
                <img class="card-image" src="${issue.cover_image}" alt="${issue.title}" loading="lazy">
                <div class="card-body">
                    <h3 class="card-title">${issue.title}</h3>
                    <p class="card-date">${formatDate(issue.published_date)}</p>
                    <div class="card-actions">
                        <a href="viewer.html?issue=${issue.id}" class="btn btn-small">படிக்க</a>
                        <a href="${issue.pdf_path}" class="btn btn-small btn-secondary" download>பதிவிறக்கம்</a>
                    </div>
                </div>
            </article>
        `;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    init();
})();

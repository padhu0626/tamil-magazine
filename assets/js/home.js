/**
 * Home page — fetches issues.json, renders cards with search & language toggle
 */
(function () {
    'use strict';

    const issuesGrid = document.getElementById('issues-grid');
    const featuredSection = document.getElementById('featured-section');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('search-input');

    let allIssues = [];
    let currentLang = 'ta';
    let featuredIssue = null;

    // Tamil ↔ English UI labels
    const labels = {
        ta: {
            read: 'படிக்க',
            download: 'பதிவிறக்கம்',
            featured: 'சிறப்பு இதழ்',
            allIssues: 'எல்லா இதழ்களும்',
            pages: 'பக்கங்கள்',
            noResults: 'தேடல் முடிவுகள் இல்லை.',
            noIssues: 'இன்னும் இதழ்கள் வெளியிடப்படவில்லை.',
            searchPlaceholder: 'இதழ் தேடுங்கள்...',
            issue: 'இதழ்'
        },
        en: {
            read: 'Read',
            download: 'Download',
            featured: 'Featured Issue',
            allIssues: 'All Issues',
            pages: 'pages',
            noResults: 'No results found.',
            noIssues: 'No issues published yet.',
            searchPlaceholder: 'Search issues...',
            issue: 'Issue'
        }
    };

    function t(key) {
        return labels[currentLang][key] || labels.ta[key];
    }

    async function init() {
        try {
            const response = await fetch('issues/issues.json');
            if (!response.ok) throw new Error('Failed to load issues');
            const data = await response.json();

            allIssues = (data.issues || []).sort(
                (a, b) => new Date(b.published_date) - new Date(a.published_date)
            );

            featuredIssue = allIssues.find(i => i.featured) || allIssues[0] || null;
            render();
            setupSearch();
            setupLangToggle();
        } catch (err) {
            console.error('Error loading issues:', err);
            featuredSection.innerHTML = '';
            issuesGrid.innerHTML = '';
            errorMessage.hidden = false;
        }
    }

    function render(filterText) {
        // Featured
        if (featuredIssue && !filterText) {
            featuredSection.innerHTML = renderFeaturedCard(featuredIssue);
            featuredSection.querySelector('.featured-card').classList.add('fade-in');
        } else {
            featuredSection.innerHTML = '';
        }

        // Filter issues
        let issues = filterText
            ? allIssues.filter(i => matchesSearch(i, filterText))
            : allIssues.filter(i => !featuredIssue || i.id !== featuredIssue.id);

        if (allIssues.length === 0) {
            issuesGrid.innerHTML = `<p class="no-results">${t('noIssues')}</p>`;
            return;
        }

        if (issues.length === 0 && filterText) {
            issuesGrid.innerHTML = `<p class="no-results">${t('noResults')}</p>`;
            return;
        }

        issuesGrid.innerHTML = issues.map((issue, idx) => renderIssueCard(issue, idx)).join('');
    }

    function matchesSearch(issue, text) {
        const q = text.toLowerCase();
        return (
            issue.title.toLowerCase().includes(q) ||
            (issue.title_english || '').toLowerCase().includes(q) ||
            issue.id.includes(q) ||
            issue.published_date.includes(q)
        );
    }

    function renderFeaturedCard(issue) {
        const title = currentLang === 'en' && issue.title_english ? issue.title_english : issue.title;
        return `
            <article class="featured-card">
                <div class="card-image-wrapper">
                    <img class="card-image" src="${escapeAttr(issue.cover_image)}" alt="${escapeAttr(title)}" loading="lazy">
                    <span class="issue-number-badge">${t('issue')} #${issue.issue_number}</span>
                </div>
                <div class="card-body">
                    <span class="featured-badge">${t('featured')}</span>
                    <h2 class="card-title">${escapeHtml(title)}</h2>
                    <p class="card-date">${formatDate(issue.published_date)}</p>
                    <p class="card-description">${issue.page_count} ${t('pages')}</p>
                    <div class="card-actions">
                        <a href="viewer.html?issue=${escapeAttr(issue.id)}" class="btn btn-primary">${t('read')}</a>
                        <a href="${escapeAttr(issue.pdf_path)}" class="btn btn-secondary" download>${t('download')}</a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderIssueCard(issue, idx) {
        const title = currentLang === 'en' && issue.title_english ? issue.title_english : issue.title;
        const delayClass = idx < 6 ? ` fade-in fade-in-delay-${(idx % 3) + 1}` : '';
        return `
            <article class="issue-card${delayClass}">
                <div class="card-image-wrapper">
                    <img class="card-image" src="${escapeAttr(issue.cover_image)}" alt="${escapeAttr(title)}" loading="lazy">
                    <span class="issue-number-badge">${t('issue')} #${issue.issue_number}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${escapeHtml(title)}</h3>
                    <p class="card-date">${formatDate(issue.published_date)}</p>
                    <p class="card-pages">${issue.page_count} ${t('pages')}</p>
                    <div class="card-actions">
                        <a href="viewer.html?issue=${escapeAttr(issue.id)}" class="btn btn-small">${t('read')}</a>
                        <a href="${escapeAttr(issue.pdf_path)}" class="btn btn-small btn-secondary" download>${t('download')}</a>
                    </div>
                </div>
            </article>
        `;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        const locale = currentLang === 'en' ? 'en-IN' : 'ta-IN';
        return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function setupSearch() {
        let debounceTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                const query = searchInput.value.trim();
                render(query || undefined);
            }, 250);
        });
    }

    function setupLangToggle() {
        const buttons = document.querySelectorAll('.lang-toggle button');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentLang = btn.dataset.lang;

                // Update UI labels
                searchInput.placeholder = t('searchPlaceholder');
                var sectionTitle = document.querySelector('.section-title');
                if (sectionTitle) sectionTitle.textContent = t('allIssues');

                render(searchInput.value.trim() || undefined);
            });
        });
    }

    // Security: escape HTML/attributes to prevent XSS
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    init();
})();

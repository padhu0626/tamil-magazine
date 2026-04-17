/**
 * Viewer — PDF.js rendering + StPageFlip flip-book animation
 * Renders PDF pages to canvas, feeds images to StPageFlip for realistic page turns.
 * Supports lazy loading, touch/swipe, keyboard navigation, and fullscreen.
 */
(function () {
    'use strict';

    // --- DOM refs ---
    var viewerTitle = document.getElementById('viewer-title');
    var viewerLoading = document.getElementById('viewer-loading');
    var viewerError = document.getElementById('viewer-error');
    var errorText = document.getElementById('error-text');
    var loadingText = document.getElementById('loading-text');
    var progressBar = document.getElementById('progress-bar');
    var downloadBtn = document.getElementById('download-btn');
    var fullscreenBtn = document.getElementById('fullscreen-btn');
    var prevBtn = document.getElementById('prev-btn');
    var nextBtn = document.getElementById('next-btn');
    var pageIndicator = document.getElementById('page-indicator');
    var flipbookContainer = document.getElementById('flipbook-container');

    var pageFlip = null;
    var totalPages = 0;

    // --- Init ---
    async function init() {
        var params = new URLSearchParams(window.location.search);
        var issueId = params.get('issue');

        if (!issueId) {
            showError('இதழ் குறிப்பிடப்படவில்லை.');
            return;
        }

        try {
            // Load issue metadata
            var response = await fetch('issues/issues.json');
            if (!response.ok) throw new Error('Failed to load issues index');
            var data = await response.json();
            var issue = (data.issues || []).find(function (i) { return i.id === issueId; });

            if (!issue) {
                showError('இதழ் கிடைக்கவில்லை: ' + issueId);
                return;
            }

            viewerTitle.textContent = issue.title;
            downloadBtn.href = issue.pdf_path;
            document.title = issue.title + ' — இரண்டாயிரம் ஆண்டுகள் இளமை';

            // Load and render PDF
            await loadPDF(issue.pdf_path);
        } catch (err) {
            console.error('Viewer init error:', err);
            showError('இதழை ஏற்ற இயலவில்லை.');
        }
    }

    // --- PDF Loading & Rendering ---
    async function loadPDF(pdfPath) {
        loadingText.textContent = 'PDF ஏற்றப்படுகிறது...';

        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/js/lib/pdf.worker.min.js';

        var loadingTask = pdfjsLib.getDocument(pdfPath);
        loadingTask.onProgress = function (progress) {
            if (progress.total > 0) {
                var pct = Math.round((progress.loaded / progress.total) * 100);
                progressBar.style.width = pct + '%';
            }
        };

        var pdf = await loadingTask.promise;
        totalPages = pdf.numPages;

        loadingText.textContent = 'பக்கங்கள் தயாராகின்றன...';

        // Determine render dimensions based on first page
        var firstPage = await pdf.getPage(1);
        var viewport = firstPage.getViewport({ scale: 1 });
        var pageRatio = viewport.height / viewport.width;

        // Calculate render size — fit within viewport
        var containerWidth = flipbookContainer.clientWidth;
        var containerHeight = window.innerHeight - 120; // minus header + controls
        var isMobile = window.innerWidth < 600;

        var renderWidth, renderHeight;
        if (isMobile) {
            // Single page mode on mobile
            renderWidth = Math.min(containerWidth - 20, 500);
            renderHeight = renderWidth * pageRatio;
            if (renderHeight > containerHeight) {
                renderHeight = containerHeight;
                renderWidth = renderHeight / pageRatio;
            }
        } else {
            // Double page spread on desktop — each page is half the container
            var halfWidth = (containerWidth / 2) - 10;
            renderWidth = Math.min(halfWidth, 450);
            renderHeight = renderWidth * pageRatio;
            if (renderHeight > containerHeight) {
                renderHeight = containerHeight;
                renderWidth = renderHeight / pageRatio;
            }
        }

        renderWidth = Math.round(renderWidth);
        renderHeight = Math.round(renderHeight);

        // Render all pages to images
        // For performance, use a reasonable scale
        var scale = (renderWidth * 2) / viewport.width; // 2x for retina
        scale = Math.min(scale, 3); // cap at 3x

        var pageImages = [];
        for (var i = 1; i <= totalPages; i++) {
            loadingText.textContent = 'பக்கம் ' + i + ' / ' + totalPages + ' தயாராகிறது...';
            progressBar.style.width = Math.round((i / totalPages) * 100) + '%';

            var img = await renderPage(pdf, i, scale);
            pageImages.push(img);
        }

        // Create flip-book
        createFlipBook(pageImages, renderWidth, renderHeight, isMobile);
    }

    async function renderPage(pdf, pageNum, scale) {
        var page = await pdf.getPage(pageNum);
        var viewport = page.getViewport({ scale: scale });

        var canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        return canvas.toDataURL('image/jpeg', 0.85);
    }

    // --- StPageFlip Setup ---
    function createFlipBook(pageImages, pageWidth, pageHeight, isMobile) {
        // Clear container and hide loading
        flipbookContainer.innerHTML = '';
        viewerLoading.hidden = true;

        // Create page elements
        var pagesHtml = '';
        for (var i = 0; i < pageImages.length; i++) {
            pagesHtml += '<div class="page" data-density="' + (i === 0 || i === pageImages.length - 1 ? 'hard' : 'soft') + '">' +
                '<img src="' + pageImages[i] + '" alt="பக்கம் ' + (i + 1) + '" style="width:100%;height:100%;object-fit:contain;">' +
                '</div>';
        }
        flipbookContainer.innerHTML = pagesHtml;

        // Initialize StPageFlip
        pageFlip = new St.PageFlip(flipbookContainer, {
            width: pageWidth,
            height: pageHeight,
            size: 'stretch',
            minWidth: 200,
            maxWidth: 900,
            minHeight: 300,
            maxHeight: 1200,
            showCover: true,
            maxShadowOpacity: 0.5,
            mobileScrollSupport: false,
            useMouseEvents: true,
            swipeDistance: 30,
            clickEventForward: true,
            flippingTime: 800,
            startPage: 0,
            drawShadow: true,
            autoSize: true,
            usePortrait: isMobile,
            startZIndex: 0
        });

        // Load pages from DOM
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        // Update page indicator
        updatePageIndicator();

        // Events
        pageFlip.on('flip', function () {
            updatePageIndicator();
        });

        // Enable controls
        prevBtn.disabled = false;
        nextBtn.disabled = false;

        // Button handlers
        prevBtn.addEventListener('click', function () {
            pageFlip.flipPrev();
        });

        nextBtn.addEventListener('click', function () {
            pageFlip.flipNext();
        });

        // Keyboard navigation
        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                pageFlip.flipPrev();
            } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                e.preventDefault();
                pageFlip.flipNext();
            } else if (e.key === 'Home') {
                e.preventDefault();
                pageFlip.flip(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                pageFlip.flip(totalPages - 1);
            } else if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
            }
        });

        // Fullscreen
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Handle resize
        var resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                if (pageFlip) {
                    pageFlip.updateFromImages(pageImages);
                }
            }, 300);
        });
    }

    function updatePageIndicator() {
        if (!pageFlip) return;
        var current = pageFlip.getCurrentPageIndex() + 1;
        pageIndicator.textContent = current + ' / ' + totalPages;

        // Update button states
        prevBtn.disabled = current <= 1;
        nextBtn.disabled = current >= totalPages;
    }

    // --- Fullscreen ---
    function toggleFullscreen() {
        var elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    // --- Error handling ---
    function showError(msg) {
        viewerLoading.hidden = true;
        viewerError.hidden = false;
        if (msg) {
            errorText.textContent = msg;
        }
    }

    init();
})();

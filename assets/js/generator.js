/**
 * FlipBook Generator — Converts PDF to self-contained flip-book ZIP
 * All processing happens client-side. PDFs never leave the browser.
 */
(function () {
    'use strict';

    // --- DOM refs ---
    var dropZone = document.getElementById('drop-zone');
    var pdfInput = document.getElementById('pdf-input');
    var browseBtn = document.getElementById('browse-btn');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSize = document.getElementById('file-size');
    var removeFile = document.getElementById('remove-file');
    var generateBtn = document.getElementById('generate-btn');
    var progressSection = document.getElementById('progress-section');
    var progressBar = document.getElementById('progress-bar');
    var progressText = document.getElementById('progress-text');
    var resultSection = document.getElementById('result-section');
    var resultInfo = document.getElementById('result-info');
    var downloadZipBtn = document.getElementById('download-zip-btn');
    var previewBtn = document.getElementById('preview-btn');
    var bookTitle = document.getElementById('book-title');
    var bgColor = document.getElementById('bg-color');
    var bgColorLabel = document.getElementById('bg-color-label');
    var qualitySelect = document.getElementById('quality-select');
    var scaleSelect = document.getElementById('scale-select');

    var currentFile = null;
    var generatedZip = null;
    var generatedHtml = null;

    // --- PDF.js worker ---
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/js/lib/pdf.worker.min.js';

    // --- File Upload ---
    browseBtn.addEventListener('click', function () { pdfInput.click(); });
    dropZone.addEventListener('click', function () { pdfInput.click(); });

    pdfInput.addEventListener('change', function () {
        if (this.files && this.files[0]) handleFile(this.files[0]);
    });

    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function () {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert('File too large. Maximum 50 MB.');
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        fileInfo.hidden = false;
        dropZone.hidden = true;
        generateBtn.disabled = false;

        // Auto-fill title from filename
        if (!bookTitle.value) {
            bookTitle.value = file.name.replace(/\.pdf$/i, '');
        }

        // Reset previous results
        resultSection.hidden = true;
        generatedZip = null;
        generatedHtml = null;
    }

    removeFile.addEventListener('click', function () {
        currentFile = null;
        pdfInput.value = '';
        fileInfo.hidden = true;
        dropZone.hidden = false;
        generateBtn.disabled = true;
        resultSection.hidden = true;
    });

    // --- Color picker ---
    bgColor.addEventListener('input', function () {
        bgColorLabel.textContent = this.value;
    });

    // --- Generate ---
    generateBtn.addEventListener('click', async function () {
        if (!currentFile) return;

        generateBtn.disabled = true;
        progressSection.hidden = false;
        resultSection.hidden = true;
        progressBar.style.width = '0%';

        try {
            await generate();
        } catch (err) {
            console.error('Generation failed:', err);
            progressText.textContent = 'Error: ' + err.message;
            generateBtn.disabled = false;
        }
    });

    async function generate() {
        var quality = parseFloat(qualitySelect.value);
        var scale = parseFloat(scaleSelect.value);
        var title = bookTitle.value || 'FlipBook';
        var background = bgColor.value;

        // Step 1: Read PDF
        progressText.textContent = 'Reading PDF...';
        var arrayBuffer = await currentFile.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var totalPages = pdf.numPages;

        progressText.textContent = 'Rendering ' + totalPages + ' pages...';

        // Step 2: Render pages to images
        var pageImages = []; // { dataUrl, width, height }
        for (var i = 1; i <= totalPages; i++) {
            progressText.textContent = 'Rendering page ' + i + ' of ' + totalPages + '...';
            progressBar.style.width = Math.round((i / totalPages) * 80) + '%';

            var page = await pdf.getPage(i);
            var viewport = page.getViewport({ scale: scale });

            var canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            var dataUrl = canvas.toDataURL('image/jpeg', quality);
            pageImages.push({
                dataUrl: dataUrl,
                width: viewport.width,
                height: viewport.height
            });
        }

        // Step 3: Build self-contained HTML
        progressText.textContent = 'Building flip-book...';
        progressBar.style.width = '85%';

        var pageWidth = pageImages[0].width;
        var pageHeight = pageImages[0].height;

        generatedHtml = buildFlipBookHtml(title, background, pageImages, pageWidth, pageHeight);

        // Step 4: Create ZIP
        progressText.textContent = 'Creating ZIP...';
        progressBar.style.width = '95%';

        var zip = new JSZip();
        zip.file('index.html', generatedHtml);

        generatedZip = await zip.generateAsync({ type: 'blob' });

        // Done
        progressBar.style.width = '100%';
        progressText.textContent = 'Done!';
        progressSection.hidden = true;
        resultSection.hidden = false;
        resultInfo.textContent = totalPages + ' pages | ' + (generatedZip.size / (1024 * 1024)).toFixed(1) + ' MB ZIP';
        generateBtn.disabled = false;
    }

    function buildFlipBookHtml(title, bgColor, pages, pageWidth, pageHeight) {
        // Add blank page at start so it opens as a spread (no cover-to-spread gap)
        var pagesHtml = '<div class="page" data-density="soft"><div style="width:100%;height:100%;background:#fff;"></div></div>\n';
        for (var i = 0; i < pages.length; i++) {
            pagesHtml += '<div class="page" data-density="soft">' +
                '<img src="' + pages[i].dataUrl + '" alt="Page ' + (i + 1) + '">' +
                '</div>\n';
        }
        // Add blank page at end if total (including blanks) is odd, for even spread
        if ((pages.length + 1) % 2 !== 0) {
            pagesHtml += '<div class="page" data-density="soft"><div style="width:100%;height:100%;background:#fff;"></div></div>\n';
        }

        var ratio = pageHeight / pageWidth;

        return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + escapeHtml(title) + '</title>\n' +
'<style>\n' +
'*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n' +
'html, body { height: 100%; overflow: hidden; }\n' +
'body {\n' +
'  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n' +
'  background: #fff;\n' +
'  color: #e0e0e0;\n' +
'  display: flex;\n' +
'  flex-direction: column;\n' +
'}\n' +
'.header {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  justify-content: space-between;\n' +
'  padding: 0.4rem 1rem;\n' +
'  background: ' + bgColor + ';\n' +
'  flex-shrink: 0;\n' +
'}\n' +
'.header h1 { font-size: 1rem; font-weight: 500; }\n' +
'.controls {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  justify-content: center;\n' +
'  gap: 1.5rem;\n' +
'  padding: 0.4rem;\n' +
'  background: ' + bgColor + ';\n' +
'  flex-shrink: 0;\n' +
'  position: relative;\n' +
'  z-index: 100;\n' +
'}\n' +
'.btn {\n' +
'  background: rgba(255,255,255,0.15);\n' +
'  color: #fff;\n' +
'  border: none;\n' +
'  padding: 0.4rem 0.8rem;\n' +
'  border-radius: 6px;\n' +
'  cursor: pointer;\n' +
'  font-size: 0.9rem;\n' +
'}\n' +
'.btn:hover { background: rgba(255,255,255,0.25); }\n' +
'.btn:disabled { opacity: 0.3; cursor: default; }\n' +
'.page-info { font-size: 0.9rem; color: #aaa; min-width: 60px; text-align: center; }\n' +
'#flipbook-wrap {\n' +
'  flex: 1;\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  justify-content: center;\n' +
'  min-height: 0;\n' +
'  overflow: hidden;\n' +
'  background: #fff;\n' +
'}\n' +
'#flipbook { background: #fff; }\n' +
'.stf__wrapper, .stf__block, .stf__parent, .stf__canvas { background: #fff !important; }\n' +
'.page { background: #fff; }\n' +
'.page img { display: block; width: 100%; height: 100%; object-fit: contain; }\n' +
'.fs-btn { font-size: 1.2rem; padding: 0.3rem 0.6rem; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<div class="header">\n' +
'  <h1>' + escapeHtml(title) + '</h1>\n' +
'  <button class="btn fs-btn" id="fs-btn" title="Fullscreen">&#x26F6;</button>\n' +
'</div>\n' +
'<div id="flipbook-wrap"><div id="flipbook">\n' +
pagesHtml +
'</div></div>\n' +
'<div class="controls">\n' +
'  <button class="btn" id="prev-btn">&#x25C0; Prev</button>\n' +
'  <span class="page-info" id="page-info">1 / ' + pages.length + '</span>\n' +
'  <button class="btn" id="next-btn">Next &#x25B6;</button>\n' +
'</div>\n' +
'<script>\n' +
getPageFlipSource() + '\n' +
'(function(){\n' +
'  var el = document.getElementById("flipbook");\n' +
'  var isMobile = window.innerWidth < 600;\n' +
'  var ratio = ' + ratio.toFixed(4) + ';\n' +
'  var availH = window.innerHeight - 80;\n' +
'  var availW = window.innerWidth;\n' +
'  var pageW, pageH;\n' +
'  if (isMobile) {\n' +
'    pageW = Math.min(availW - 20, 500);\n' +
'    pageH = Math.round(pageW * ratio);\n' +
'    if (pageH > availH) { pageH = availH; pageW = Math.round(pageH / ratio); }\n' +
'  } else {\n' +
'    pageH = availH - 10;\n' +
'    pageW = Math.round(pageH / ratio);\n' +
'    if (pageW * 2 > availW - 40) { pageW = Math.round((availW - 40) / 2); pageH = Math.round(pageW * ratio); }\n' +
'  }\n' +
'  var pf = new St.PageFlip(el, {\n' +
'    width: pageW,\n' +
'    height: pageH,\n' +
'    size: "fixed",\n' +
'    showCover: false,\n' +
'    maxShadowOpacity: 0.5,\n' +
'    mobileScrollSupport: false,\n' +
'    flippingTime: 800,\n' +
'    usePortrait: isMobile,\n' +
'    autoSize: false,\n' +
'    drawShadow: true,\n' +
'    clickEventForward: false,\n' +
'    useMouseEvents: true\n' +
'  });\n' +
'  pf.loadFromHTML(document.querySelectorAll(".page"));\n' +
'  var total = ' + pages.length + ';\n' +
'  var info = document.getElementById("page-info");\n' +
'  var prevBtn = document.getElementById("prev-btn");\n' +
'  var nextBtn = document.getElementById("next-btn");\n' +
'  function upd() {\n' +
'    var c = pf.getCurrentPageIndex() + 1;\n' +
'    info.textContent = c + " / " + total;\n' +
'    prevBtn.disabled = c <= 1;\n' +
'    nextBtn.disabled = c >= total;\n' +
'  }\n' +
'  pf.on("flip", upd);\n' +
'  prevBtn.addEventListener("mousedown", function(e){ e.stopPropagation(); });\n' +
'  nextBtn.addEventListener("mousedown", function(e){ e.stopPropagation(); });\n' +
'  prevBtn.addEventListener("touchstart", function(e){ e.stopPropagation(); });\n' +
'  nextBtn.addEventListener("touchstart", function(e){ e.stopPropagation(); });\n' +
'  prevBtn.addEventListener("click", function(e){ e.stopPropagation(); pf.flipPrev(); });\n' +
'  nextBtn.addEventListener("click", function(e){ e.stopPropagation(); pf.flipNext(); });\n' +
'  document.addEventListener("keydown", function(e) {\n' +
'    if (e.key==="ArrowLeft"||e.key==="PageUp") { e.preventDefault(); pf.flipPrev(); }\n' +
'    if (e.key==="ArrowRight"||e.key==="PageDown"||e.key===" ") { e.preventDefault(); pf.flipNext(); }\n' +
'    if (e.key==="Escape" && document.fullscreenElement) document.exitFullscreen();\n' +
'  });\n' +
'  document.getElementById("fs-btn").onclick = function() {\n' +
'    if (!document.fullscreenElement) document.documentElement.requestFullscreen();\n' +
'    else document.exitFullscreen();\n' +
'  };\n' +
'  upd();\n' +
'})();\n' +
'</' + 'script>\n' +
'</body>\n' +
'</html>';
    }

    function getPageFlipSource() {
        // StPageFlip library source is loaded globally — we read it from the loaded script
        // We need to inline it. Since it's already loaded, we'll fetch it.
        // This is set during init below.
        return window._pageFlipSource || '';
    }

    // Pre-fetch the StPageFlip source code for embedding
    fetch('assets/js/lib/page-flip.browser.js')
        .then(function (r) { return r.text(); })
        .then(function (src) { window._pageFlipSource = src; });

    // --- Download ZIP ---
    downloadZipBtn.addEventListener('click', function () {
        if (!generatedZip) return;
        var name = (bookTitle.value || 'flipbook').replace(/[^a-zA-Z0-9_-]/g, '_');
        saveAs(generatedZip, name + '.zip');
    });

    // --- Preview (modal created dynamically) ---
    var modalEl = null;
    var modalFrame = null;

    function createModal() {
        modalEl = document.createElement('div');
        modalEl.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;';

        var backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.7);';
        backdrop.addEventListener('click', closeModal);

        var content = document.createElement('div');
        content.style.cssText = 'position:relative;width:95vw;height:90vh;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.1);';

        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'position:absolute;top:0.5rem;right:0.75rem;background:rgba(0,0,0,0.5);color:#fff;border:none;font-size:1.5rem;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:10;';
        closeBtn.addEventListener('click', closeModal);

        modalFrame = document.createElement('iframe');
        modalFrame.style.cssText = 'width:100%;height:100%;border:none;';

        content.appendChild(closeBtn);
        content.appendChild(modalFrame);
        modalEl.appendChild(backdrop);
        modalEl.appendChild(content);
        document.body.appendChild(modalEl);
    }

    function closeModal() {
        if (modalEl) {
            modalFrame.src = '';
            modalEl.remove();
            modalEl = null;
            modalFrame = null;
        }
    }

    previewBtn.addEventListener('click', function () {
        if (!generatedHtml) return;
        var blob = new Blob([generatedHtml], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        createModal();
        modalFrame.src = url;
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalEl) closeModal();
    });

    // --- Helpers ---
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();

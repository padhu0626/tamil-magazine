"""
Build FlipBook — Renders PDF pages to images using PyMuPDF (correct colors)
and generates a self-contained HTML flipbook.

Usage:
    python3 build-flipbook.py <input.pdf> [--title "My Book"] [--bg "#1a1a2e"] [--dpi 200] [--quality 88]

Output:
    Creates <input-name>-flipbook.html in the same directory as the input PDF.
"""
import sys
import os
import base64
import argparse
import pymupdf


def render_pages(pdf_path, dpi=200, quality=88):
    """Render all PDF pages to JPEG base64 data URLs."""
    doc = pymupdf.open(pdf_path)
    pages = []
    total = len(doc)

    for i in range(total):
        print(f"  Rendering page {i + 1}/{total}...", end="\r")
        page = doc[i]
        pix = page.get_pixmap(dpi=dpi)

        jpeg_data = pix.tobytes("jpeg", jpg_quality=quality)
        b64 = base64.b64encode(jpeg_data).decode("ascii")
        data_url = f"data:image/jpeg;base64,{b64}"

        pages.append({
            "dataUrl": data_url,
            "width": pix.width,
            "height": pix.height,
        })

    doc.close()
    print(f"  Rendered {total} pages.          ")
    return pages


def build_flipbook_html(title, bg_color, pages):
    """Build a self-contained flipbook HTML file."""
    page_width = pages[0]["width"]
    page_height = pages[0]["height"]
    ratio = page_height / page_width

    # Read the StPageFlip library source
    lib_path = os.path.join(os.path.dirname(__file__), "assets", "js", "lib", "page-flip.browser.js")
    with open(lib_path, "r") as f:
        pageflip_src = f.read()

    # Build page divs — first and last are hard covers
    pages_html = ""
    for i, p in enumerate(pages):
        density = "hard" if (i == 0 or i == len(pages) - 1) else "soft"
        pages_html += f'<div class="page" data-density="{density}">'
        pages_html += f'<img src="{p["dataUrl"]}" alt="Page {i + 1}">'
        pages_html += "</div>\n"

    # Add blank page if inner pages are odd
    if (len(pages) - 2) % 2 != 0:
        last_hard = pages_html.rfind('<div class="page" data-density="hard">')
        blank = '<div class="page" data-density="soft"><div style="width:100%;height:100%;background:#fff;"></div></div>\n'
        pages_html = pages_html[:last_hard] + blank + pages_html[last_hard:]

    total = len(pages)

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html_escape(title)}</title>
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ height: 100%; overflow: hidden; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #e8e8e8;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
}}
.header {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 1rem;
  background: {bg_color};
  flex-shrink: 0;
}}
.header h1 {{ font-size: 1rem; font-weight: 500; }}
.controls {{
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.4rem;
  background: {bg_color};
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}}
.btn {{
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}}
.btn:hover {{ background: rgba(255,255,255,0.25); }}
.btn:disabled {{ opacity: 0.3; cursor: default; }}
.page-info {{ font-size: 0.9rem; color: #aaa; min-width: 60px; text-align: center; }}
#flipbook-wrap {{
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  background: #e8e8e8;
}}
#flipbook {{ background: #fff; box-shadow: 0 2px 20px rgba(0,0,0,0.15); }}
.stf__wrapper, .stf__block, .stf__parent, .stf__canvas {{ background: #fff !important; }}
.page {{ background: #fff; }}
.page img {{ display: block; width: 100%; height: 100%; object-fit: contain; }}
.fs-btn {{ font-size: 1.2rem; padding: 0.3rem 0.6rem; }}
</style>
</head>
<body>
<div class="header">
  <h1>{html_escape(title)}</h1>
  <button class="btn fs-btn" id="fs-btn" title="Fullscreen">&#x26F6;</button>
</div>
<div id="flipbook-wrap"><div id="flipbook">
{pages_html}
</div></div>
<div class="controls">
  <button class="btn" id="prev-btn">&#x25C0; Prev</button>
  <span class="page-info" id="page-info">1 / {total}</span>
  <button class="btn" id="next-btn">Next &#x25B6;</button>
</div>
<script>
{pageflip_src}
(function(){{
  var el = document.getElementById("flipbook");
  var isMobile = window.innerWidth < 600;
  var ratio = {ratio:.4f};
  var availH = window.innerHeight - 70;
  var availW = window.innerWidth;
  var pageW, pageH;
  pageH = availH;
  pageW = Math.round(pageH / ratio);
  if (!isMobile && pageW * 2 > availW) {{ pageW = Math.round(availW / 2); pageH = Math.round(pageW * ratio); }}
  if (isMobile && pageW > availW) {{ pageW = availW; pageH = Math.round(pageW * ratio); }}
  el.style.width = (isMobile ? pageW : pageW * 2) + "px";
  el.style.height = pageH + "px";
  var pf = new St.PageFlip(el, {{
    width: pageW,
    height: pageH,
    size: "fixed",
    showCover: true,
    maxShadowOpacity: 0.5,
    mobileScrollSupport: false,
    flippingTime: 800,
    usePortrait: isMobile,
    autoSize: false,
    drawShadow: true,
    clickEventForward: false,
    useMouseEvents: true
  }});
  pf.loadFromHTML(document.querySelectorAll(".page"));
  var total = {total};
  var info = document.getElementById("page-info");
  var prevBtn = document.getElementById("prev-btn");
  var nextBtn = document.getElementById("next-btn");
  function upd() {{
    var c = pf.getCurrentPageIndex() + 1;
    info.textContent = c + " / " + total;
    prevBtn.disabled = c <= 1;
    nextBtn.disabled = c >= total;
  }}
  pf.on("flip", upd);
  prevBtn.addEventListener("mousedown", function(e){{ e.stopPropagation(); }});
  nextBtn.addEventListener("mousedown", function(e){{ e.stopPropagation(); }});
  prevBtn.addEventListener("touchstart", function(e){{ e.stopPropagation(); }});
  nextBtn.addEventListener("touchstart", function(e){{ e.stopPropagation(); }});
  prevBtn.addEventListener("click", function(e){{ e.stopPropagation(); pf.flipPrev(); }});
  nextBtn.addEventListener("click", function(e){{ e.stopPropagation(); pf.flipNext(); }});
  document.addEventListener("keydown", function(e) {{
    if (e.key==="ArrowLeft"||e.key==="PageUp") {{ e.preventDefault(); pf.flipPrev(); }}
    if (e.key==="ArrowRight"||e.key==="PageDown"||e.key===" ") {{ e.preventDefault(); pf.flipNext(); }}
    if (e.key==="Escape" && document.fullscreenElement) document.exitFullscreen();
  }});
  document.getElementById("fs-btn").onclick = function() {{
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }};
  upd();
}})();
</script>
</body>
</html>'''


def html_escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def main():
    parser = argparse.ArgumentParser(description="Build a flipbook from a PDF")
    parser.add_argument("pdf", help="Input PDF file")
    parser.add_argument("--title", default=None, help="Book title (default: PDF filename)")
    parser.add_argument("--bg", default="#1a1a2e", help="Header/controls background color")
    parser.add_argument("--dpi", type=int, default=200, help="Rendering DPI (default: 200)")
    parser.add_argument("--quality", type=int, default=88, help="JPEG quality 1-100 (default: 88)")
    parser.add_argument("-o", "--output", default=None, help="Output HTML file path")
    args = parser.parse_args()

    if not os.path.exists(args.pdf):
        print(f"Error: {args.pdf} not found")
        sys.exit(1)

    title = args.title or os.path.splitext(os.path.basename(args.pdf))[0]
    output = args.output or os.path.splitext(args.pdf)[0] + "-flipbook.html"

    print(f"Building flipbook: {args.pdf}")
    print(f"  Title: {title}")
    print(f"  DPI: {args.dpi}, Quality: {args.quality}")

    pages = render_pages(args.pdf, dpi=args.dpi, quality=args.quality)
    html = build_flipbook_html(title, args.bg, pages)

    with open(output, "w") as f:
        f.write(html)

    size_mb = os.path.getsize(output) / (1024 * 1024)
    print(f"\nFlipbook ready!")
    print(f"  {output}")
    print(f"  {len(pages)} pages | {size_mb:.1f} MB")


if __name__ == "__main__":
    main()

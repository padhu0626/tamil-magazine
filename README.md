# FlipBook Generator

Convert any PDF into a self-contained flip-book with realistic page-turn animations. The output is a single HTML file you can host anywhere.

## Features

- 100% client-side — your PDFs never leave your browser
- Realistic page-flip animation (StPageFlip)
- Touch/swipe support on mobile
- Keyboard navigation (arrow keys, space)
- Fullscreen mode
- Configurable quality, resolution, and background color
- Self-contained output — single ZIP, host on any static server

## How to Use

1. Open `index.html` in a browser
2. Upload a PDF
3. Configure title, colors, quality
4. Click "Generate Flip-Book"
5. Download the ZIP
6. Unzip and host the `index.html` on any web server

## Output

The generated ZIP contains a single `index.html` file with:
- All page images embedded as base64
- StPageFlip library inlined
- CSS and JS inlined
- Zero external dependencies

Just drop it on any web server and it works.

## Libraries

- [StPageFlip](https://github.com/Nodlik/StPageFlip) — MIT License
- [PDF.js](https://mozilla.github.io/pdf.js/) — Apache 2.0
- [JSZip](https://stuk.github.io/jszip/) — MIT
- [FileSaver.js](https://github.com/nicholaskim94/file-saver) — MIT

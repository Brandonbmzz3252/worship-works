const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf8');
      if (!content.includes('rel="manifest"')) {
        const pwaTags = [
          '<link rel="manifest" href="/manifest.json">',
          '<meta name="theme-color" content="#7E22CE">',
          '<meta name="mobile-web-app-capable" content="yes">',
          '<meta name="apple-mobile-web-app-capable" content="yes">',
          '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
          '<meta name="apple-mobile-web-app-title" content="Worship-Works">'
        ].join('');
        content = content.replace('</head>', pwaTags + '</head>');
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
}

if (fs.existsSync('dist')) {
  processDir('dist');
  console.log('Injected PWA tags into dist HTML files');
}

// Builds the static site that Amplify Hosting publishes: dist/index.html.
// The prototype file is a page fragment (the Artifact host adds the document skeleton), so a real
// host needs the doctype, charset, viewport and language added around it. No dependencies.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'prototype', 'paga-con-tu-foto.html');
const dist = path.join(root, 'dist');

const fragment = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
if (!/<title>.*<\/title>/.test(fragment) || !/<script>/.test(fragment)) {
  console.error('Unexpected prototype file: no <title> or <script> found.');
  process.exit(1);
}

const page = '<!doctype html>\n<html lang="es-MX">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#18213B">\n' +
  '</head>\n<body>\n' + fragment + '\n</body>\n</html>\n';

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), page, 'utf8');
console.log('wrote dist/index.html (' + page.length + ' bytes)');

// Copia los archivos de la app a una carpeta de salida (www para el APK, _site para la web).
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || 'www';
const files = ['index.html', 'app.js', 'engine.js', 'sw.js', 'manifest.webmanifest', 'icons', 'fonts'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of files) fs.cpSync(path.join(__dirname, '..', f), path.join(out, f), { recursive: true });
console.log('Web copiada en', out);

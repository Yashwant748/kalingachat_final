import https from 'https';
import fs from 'fs';
import path from 'path';

const url = 'https://raw.githubusercontent.com/ccoreilly/vosk-browser/master/lib/vosk.wasm';
const dest = path.resolve('client/public/vosk.wasm');

console.log(`Downloading ${url} to ${dest}...`);

const file = fs.createWriteStream(dest);
https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => {
            console.log('Download Completed.');
        });
    });
}).on('error', function (err) {
    fs.unlink(dest, () => { });
    console.error('Download Error:', err.message);
});

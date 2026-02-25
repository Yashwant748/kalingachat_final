import https from 'https';
import fs from 'fs';
import path from 'path';

// Ensure directory exists
const dir = path.resolve('client/public/models');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const url = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip';
const dest = path.join(dir, 'vosk-model.zip');

console.log(`Downloading ${url} to ${dest}...`);

const file = fs.createWriteStream(dest);
https.get(url, function (response) {
    if (response.statusCode !== 200) {
        console.error(`Download failed with status: ${response.statusCode}`);
        return;
    }
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => {
            console.log('Download Completed Successfully.');
        });
    });
}).on('error', function (err) {
    fs.unlink(dest, () => { });
    console.error('Download Error:', err.message);
});

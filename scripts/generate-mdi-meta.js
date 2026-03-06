
import fs from 'fs';
import path from 'path';
import https from 'https';

const META_URL = 'https://raw.githubusercontent.com/Templarian/MaterialDesign-SVG/master/meta.json';
const OUTPUT_PATH = path.join(process.cwd(), 'src/assets/mdi-meta.json');

console.log(`Fetching metadata from ${META_URL}...`);

https.get(META_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const icons = JSON.parse(data);
            const simplifiedIcons = icons.map(icon => ({
                n: icon.name,
                a: icon.aliases,
                t: icon.tags
            }));

            // Ensure directory exists
            const dir = path.dirname(OUTPUT_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(OUTPUT_PATH, JSON.stringify(simplifiedIcons));
            console.log(`Successfully wrote ${simplifiedIcons.length} icons to ${OUTPUT_PATH}`);
        } catch (e) {
            console.error('Error parsing or writing metadata:', e);
            process.exit(1);
        }
    });

}).on('error', (err) => {
    console.error('Error fetching metadata:', err);
    process.exit(1);
});

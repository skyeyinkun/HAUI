/**
 * 生成中国地级市坐标映射表
 * 使用 Open-Meteo Geocoding API 查询地级市坐标
 * 区县自动继承所属地级市坐标（Open-Meteo分辨率~28km，同城天气基本一致）
 * 
 * 用法: node scripts/generate-region-coords.mjs
 * 预计耗时: ~2分钟（约340个城市，200ms间隔）
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVEL_JSON = resolve(__dirname, '../public/data/level.json');
const OUTPUT_FILE = resolve(__dirname, '../public/data/city-coords.json');

const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const DELAY_MS = 250;

async function geocode(name) {
    const url = `${GEO_API}?name=${encodeURIComponent(name)}&count=5&language=zh&format=json&country_code=CN`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const match = data.results.find(r => r.country_code === 'CN') || data.results[0];
    return { lat: Math.round(match.latitude * 10000) / 10000, lon: Math.round(match.longitude * 10000) / 10000 };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const provinces = JSON.parse(readFileSync(LEVEL_JSON, 'utf-8'));
    const coordsMap = {}; // { "6位行政区划代码前4位(市级)": { lat, lon } }  或 { "6位完整代码": { lat, lon } }
    const directMunicipalities = ['11', '12', '31', '50'];

    // 收集所有地级市
    const queries = [];

    for (const province of provinces) {
        const pCode2 = province.code.substring(0, 2);
        if (directMunicipalities.includes(pCode2)) {
            // 直辖市本身就是市级
            queries.push({ code: province.code.substring(0, 4), name: province.name, query: province.name });
        } else if (province.children) {
            for (const city of province.children) {
                queries.push({ code: city.code.substring(0, 4), name: city.name, query: city.name });
            }
        }
    }

    console.log(`🔍 Total cities to geocode: ${queries.length}`);
    let resolved = 0, failed = 0;

    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        try {
            let coords = await geocode(q.query);
            if (!coords) {
                // Remove common suffixes and try again
                const stripped = q.name.replace(/(市|地区|自治州|盟|林区)$/, '');
                if (stripped !== q.name) {
                    coords = await geocode(stripped);
                    await sleep(DELAY_MS);
                }
            }

            if (coords) {
                coordsMap[q.code] = coords;
                resolved++;
            } else {
                console.warn(`  ❌ FAILED: ${q.name} (${q.code})`);
                failed++;
            }
        } catch (e) {
            console.warn(`  ⚠️ ERROR: ${q.name}:`, e.message);
            failed++;
        }

        if ((i + 1) % 50 === 0 || i === queries.length - 1) {
            console.log(`  📊 ${i + 1}/${queries.length} | ✅ ${resolved} | ❌ ${failed}`);
        }
        await sleep(DELAY_MS);
    }

    console.log(`\n✅ Done! Resolved: ${resolved}/${queries.length}, Failed: ${failed}`);
    writeFileSync(OUTPUT_FILE, JSON.stringify(coordsMap), 'utf-8');
    console.log(`📁 Output: ${OUTPUT_FILE} (${(JSON.stringify(coordsMap).length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);

// scripts/generate-icons.mjs
// Run with: node scripts/generate-icons.mjs

import sharp from "sharp";
import fs from "fs";
import path from "path";

const INPUT_SVG = "public/fleet-icon.svg";
const OUTPUT_DIR = "public/icons";

const SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("🚀 Generating HIGH PROSPER PWA icons from fleet-icon.svg...");

await Promise.all(
    SIZES.map(async (size) => {
        const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
        try {
            await sharp(INPUT_SVG)
                .resize(size, size, {
                    fit: "contain",
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
                })
                .png()
                .toFile(outputPath);
            console.log(`✅ Generated icon-${size}x${size}.png`);
        } catch (err) {
            console.error(`❌ Failed ${size}x${size}:`, err.message);
        }
    })
);

console.log("\n🎉 All icons generated successfully!");
console.log("📂 Location:", OUTPUT_DIR);
console.log("\nYour PWA icons are ready for HIGH PROSPER EMPIRE 2026 🌐👑");
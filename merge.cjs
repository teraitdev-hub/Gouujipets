const ffmpegStatic = require('ffmpeg-static');
const { execFileSync } = require('child_process');
const fs = require('fs');

const files = [
  "Dogs_playing_in_pools_202607211221.mp4",
  "Luxury_pet_resort_background_ani_202607211215.mp4",
  "Pet_resort_with_indoor_waterfalls_202607211221.mp4"
];

// Create concat file
const concatFileContent = files.map(f => `file 'public/${f}'`).join('\n');
fs.writeFileSync('concat.txt', concatFileContent);

console.log("Starting merge using FFmpeg:", ffmpegStatic);
try {
  execFileSync(ffmpegStatic, [
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c', 'copy',
    '-y',
    'public/merged_background.mp4'
  ]);
  console.log("Merge completed successfully!");
} catch (e) {
  console.error("Merge failed:", e.message);
  if (e.stderr) {
    console.error("FFMPEG STDERR:", e.stderr.toString());
  }
}

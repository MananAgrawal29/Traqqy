const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');

// If canvas isn't available, use raw PNG parsing
const dir = path.join(__dirname, '..', 'Traqqy_Readme_Screenshots');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

function analyzePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  
  // PNG signature check
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') return { error: 'Not a PNG' };
  
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  
  // Sample pixels at various positions to identify content
  // We'll parse raw chunks to find the IDAT data
  let pos = 8;
  let idatBuffers = [];
  
  while (pos < buf.length) {
    const chunkLen = buf.readUInt32BE(pos);
    const chunkType = buf.slice(pos + 4, pos + 8).toString('ascii');
    
    if (chunkType === 'IDAT') {
      idatBuffers.push(buf.slice(pos + 8, pos + 8 + chunkLen));
    }
    
    pos += 12 + chunkLen; // 4 len + 4 type + data + 4 crc
    
    if (chunkType === 'IEND') break;
  }
  
  return { width, height, sizeKB: Math.round(buf.length / 1024), chunks: idatBuffers.length };
}

files.forEach(f => {
  const info = analyzePNG(path.join(dir, f));
  console.log(`${f}: ${JSON.stringify(info)}`);
});

#!/usr/bin/env node
// Генерирует PNG-иконки без внешних зависимостей (только встроенный Node.js)
// Запуск: node generate-icons.js

'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 для PNG
const CRC_TABLE = (() => {
  const t = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.allocUnsafe(4); lenBuf.writeUInt32BE(data.length, 0);
  const crcIn   = Buffer.concat([typeBuf, data]);
  const crcBuf  = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcIn), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Рисует щит 🛡 с буквой «М» внутри
function createIconPNG(size) {
  const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 2; // RGB
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  // Пиксели
  const raw = [];
  const cx = size / 2, cy = size * .48;
  const r1 = size * .42; // внешний радиус щита

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / r1;
      const dy = (y - cy) / r1;

      // Форма щита: верх — круг, низ — треугольник
      const inShield = (dy < 0.3 && dx * dx + dy * dy < 1.0) ||
                       (dy >= 0.3 && Math.abs(dx) < (0.9 - (dy - 0.3) * 1.5) && dy < 1.1);

      if (inShield) {
        // Тёмно-синий фон щита
        const rim = (dx * dx + dy * dy > 0.82) || (dy >= 0.3 && Math.abs(dx) > (0.75 - (dy - 0.3) * 1.3));
        if (rim && dy < 0.3) {
          raw.push(30, 80, 180); // тёмно-синяя кайма
        } else {
          raw.push(37, 99, 235); // синий
        }
      } else {
        raw.push(15, 23, 42); // тёмный фон
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw));

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const sizes = [16, 48, 128];
const dir   = __dirname;

for (const size of sizes) {
  const buf  = createIconPNG(size);
  const file = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✅  icon${size}.png (${buf.length} bytes)`);
}

console.log('\nИконки сгенерированы!');

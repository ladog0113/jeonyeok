// 외부 프로그램 없이 zip 풀기 (Windows, Linux 업데이트용). stored, deflate만 지원
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function unzip(zipFile, dest) {
  const buf = fs.readFileSync(zipFile);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: end of central directory not found');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const root = path.resolve(dest);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const extAttr = buf.readUInt32LE(p + 38);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    const out = path.resolve(root, name);
    if (out !== root && !out.startsWith(root + path.sep)) throw new Error('zip: unsafe path ' + name);
    const isLink = ((extAttr >>> 16) & 0o170000) === 0o120000;
    if (name.endsWith('/')) { fs.mkdirSync(out, { recursive: true }); continue; }
    if (isLink) continue;
    const lnlen = buf.readUInt16LE(local + 26);
    const lxlen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lnlen + lxlen;
    const raw = buf.subarray(start, start + csize);
    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error('zip: unsupported method ' + method);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, data);
  }
}

module.exports = { unzip };

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../docs/tool-change-pwa');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
test('教學中心每個章節連到獨立影片，缺片不冒用其他影片', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'tutorial-catalog.json')));
  assert.equal(catalog.chapters.length, 16);
  assert.equal(new Set(catalog.chapters.map(c => c.id)).size, 16);
  assert.deepEqual(catalog.unavailable, [14, 15]);
  for (const c of catalog.chapters) {
    assert.ok(html.includes(c.id + '/preview'));
    assert.ok(html.includes(`<option value="${c.number}">`));
  }
  assert.ok(!html.includes('u35FoFQAqD4'));
  assert.ok(html.includes('在新視窗觀看'));
});
test('所有內嵌 JavaScript 可解析', () => {
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new (require('node:vm').Script)(match[1]);
  }
});

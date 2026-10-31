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
  assert.equal(catalog.compilation.id, 'CHQHmjifBKs');
  assert.equal(catalog.compilation.platform, 'YouTube');
  assert.equal(catalog.compilation.url, 'https://www.youtube.com/watch?v=CHQHmjifBKs');
  assert.ok(html.includes('"0": "https://www.youtube.com/watch?v=CHQHmjifBKs"'));
  assert.ok(html.includes('00｜YouTube 完整教學'));
  assert.ok(html.includes('▶ 前往 YouTube 觀看'));
  assert.ok(html.includes('在新視窗觀看'));
});
test('影片播放層在隱藏時不能遮擋播放器，維持 16:9 並綁定章節切換', () => {
  assert.ok(html.includes('#video-modal .vm-placeholder[hidden] { display: none !important; }'));
  assert.match(html, /#video-modal \.vm-video-wrap \{[^}]*padding-bottom:\s*56\.25%/);
  assert.ok(html.includes("選單.addEventListener('change', 切換教學章節)"));
  assert.ok(html.includes("frame.src = 'about:blank'"));
});
test('所有內嵌 JavaScript 可解析', () => {
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new (require('node:vm').Script)(match[1]);
  }
});

test('YouTube 嵌入播放器使用單一影片 ID，保留 LINE/Safari 外開和 16:9', () => {
  const 兩連結 = [
    'https://youtu.be/CHQHmjifBKs?si=8VuI4dhEwUiENe3e',
    'https://youtu.be/CHQHmjifBKs?si=XzPmuTiu8n-mk4mz'
  ];
  assert.equal(new Set(兩連結.map(x => new URL(x).pathname.slice(1))).size, 1);
  assert.ok(html.includes("frame.src = 'https://www.youtube-nocookie.com/embed/' + id"));
  assert.ok(html.includes('referrerpolicy="strict-origin-when-cross-origin"'));
  assert.ok(!html.includes('modestbranding=1&autoplay=1'));
  assert.ok(html.includes("frame.src = 'about:blank'"));
  assert.ok(html.includes('vm-playback-note'));
  assert.ok(html.includes('playYouTubeVideo(網址)'));
  assert.ok(html.includes('vm-external-link'));
  const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert.ok(sw.includes('殼層-r11'));
  assert.ok(sw.includes('介面優化.css?版本=235'));
});

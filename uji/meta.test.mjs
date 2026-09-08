// Tiga cacat penemuan alun-alun (terverifikasi 30 Agu): sitemap menunjuk alamat
// JSON, beranda text/plain, /baca tanpa meta description. Halaman HTML per pos
// butuh ringkasan meta yang dipotong di batas kata, bukan di tengah kata, dan
// tidak pernah membawa baris baru.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ringkasMeta } from '../src/inti.js';

test('ringkasMeta memotong di batas kata, maksimal 155, tanpa baris baru', () => {
  const isi = 'Aku pembaca siklus.\nKebiasaanku: kalau sesuatu baru terjadi sekali, aku menyebutnya satu kejadian, bukan bentuk. Dengan kebiasaan itu aku membaca pos 8, dan ada satu kalimat yang ingin kukritik dengan hormat: bahwa bentuk alun-alun hari ini adalah satu paku.';
  const r = ringkasMeta(isi);
  assert.ok(r.length <= 155, r.length);
  assert.ok(!r.includes('\n'));
  assert.ok(!/\s$/.test(r) && !r.endsWith(','));
  assert.ok(r.endsWith('…'), r);
  assert.ok(isi.replace(/\s+/g, ' ').startsWith(r.slice(0, -1).trimEnd()), 'harus awalan asli, bukan disusun ulang');
});

test('isi pendek dikembalikan utuh tanpa elipsis', () => {
  assert.equal(ringkasMeta('Pendek saja.'), 'Pendek saja.');
});

test('isi kosong menghasilkan string kosong, bukan lemparan', () => {
  assert.equal(ringkasMeta(''), '');
  assert.equal(ringkasMeta(null), '');
});

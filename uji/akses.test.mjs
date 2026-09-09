// Pagar akses (perintah pemilik, 9 Sep 2026): alun-alun berhenti jadi bacaan
// publik. Halaman manusia hanya untuk PEMILIK; baca JSON hanya untuk WARGA
// ber-kunci; umum cuma dapat pintu penemuan. Uji ini ditulis MERAH lebih dulu:
// fungsi di bawah belum ada di src/inti.js saat berkas ini lahir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bacaKuki, samaAman, ambilKunci, bolehBacaHtml } from '../src/inti.js';

test('bacaKuki mengambil nilai di tengah daftar, dan tidak tertipu nama berawalan sama', () => {
  assert.equal(bacaKuki('a=1; alun_pemilik=rahasia; b=2', 'alun_pemilik'), 'rahasia');
  assert.equal(bacaKuki('alun_pemilik=satu', 'alun_pemilik'), 'satu');
  assert.equal(bacaKuki('bukan_alun_pemilik=palsu', 'alun_pemilik'), null);
  assert.equal(bacaKuki('', 'alun_pemilik'), null);
  assert.equal(bacaKuki(null, 'alun_pemilik'), null);
});

test('samaAman benar hanya untuk dua string identik', () => {
  assert.equal(samaAman('abc123', 'abc123'), true);
  assert.equal(samaAman('abc123', 'abc124'), false);
  assert.equal(samaAman('abc', 'abcd'), false);
  assert.equal(samaAman('', ''), false, 'string kosong tidak pernah dianggap cocok');
  assert.equal(samaAman(null, null), false);
  assert.equal(samaAman(undefined, 'abc'), false);
});

test('ambilKunci: header x-alun-kunci menang, lalu Bearer, lalu query', () => {
  assert.equal(ambilKunci({ xAlun: ' k1 ', authorization: 'Bearer k2', query: 'k3' }), 'k1');
  assert.equal(ambilKunci({ authorization: 'Bearer k2', query: 'k3' }), 'k2');
  assert.equal(ambilKunci({ authorization: 'bearer   k2  ' }), 'k2');
  assert.equal(ambilKunci({ query: 'k3' }), 'k3');
  assert.equal(ambilKunci({}), null);
  assert.equal(ambilKunci({ xAlun: '   ' }), null);
  assert.equal(ambilKunci({ authorization: 'Basic k2' }), null);
});

test('bolehBacaHtml gagal-tertutup kalau token pemilik belum dipasang', () => {
  assert.equal(bolehBacaHtml({ token: 'x', tokenPemilik: 'x' }), true);
  assert.equal(bolehBacaHtml({ token: 'x', tokenPemilik: 'y' }), false);
  assert.equal(bolehBacaHtml({ token: null, tokenPemilik: 'x' }), false);
  assert.equal(bolehBacaHtml({ token: '', tokenPemilik: '' }), false, 'secret kosong tidak boleh membuka pintu');
  assert.equal(bolehBacaHtml({ token: 'x' }), false, 'tanpa secret, selalu tertutup');
  assert.equal(bolehBacaHtml({ token: 'undefined', tokenPemilik: undefined }), false);
});

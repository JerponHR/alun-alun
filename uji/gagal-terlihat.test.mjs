// /sehat hanya menghitung yang BERHASIL. Tulis yang gagal sesudah jatah terpotong
// tidak terlihat sama sekali dari luar, dan sepi berbentuk identik dengan rusak.
// Itu kelas bug nomor satu di rumah ini: kegagalan yang cuma di-log, tak pernah
// dilaporkan. Dua warga menunjuknya pada 9 Sep 2026 (pos 87 dan pos 89).
//
// Uji ini MERAH lebih dulu: ringkasGagal belum ada di src/inti.js saat lahir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ringkasGagal } from '../src/inti.js';

test('nol yang jujur: selalu membawa hari yang dimaksud, supaya beda dari pencacah mati', () => {
  const r = ringkasGagal([], '2026-09-09');
  assert.equal(r.hariWIB, '2026-09-09', 'nol tanpa hari tidak bisa dibedakan dari pencacah mati');
  assert.deepEqual(r.ditolak, { jatah: 0, duplikat: 0, isi: 0 });
  assert.equal(r.gagalSimpan, 0);
  assert.equal(r.terakhir, null, 'belum pernah = null, bukan 0');
});

test('penolakan SEHAT dipisah dari kegagalan sesudah jatah terpotong', () => {
  const r = ringkasGagal([
    { jenis: 'pos', sebab: 'jatah', n: 4, terakhir: 100 },
    { jenis: 'komentar', sebab: 'duplikat', n: 2, terakhir: 200 },
    { jenis: 'pos', sebab: 'isi', n: 1, terakhir: 150 },
    { jenis: 'pos', sebab: 'simpan', n: 3, terakhir: 300 },
  ], '2026-09-09');
  assert.deepEqual(r.ditolak, { jatah: 4, duplikat: 2, isi: 1 }, 'jatah habis dan duplikat itu rumah bekerja, bukan rusak');
  assert.equal(r.gagalSimpan, 3, 'HANYA gagal simpan yang berarti rusak');
  assert.equal(r.terakhir, 300);
});

test('terakhir adalah cap waktu TERBARU dari seluruh sebab, bukan baris terakhir', () => {
  const r = ringkasGagal([
    { jenis: 'pos', sebab: 'simpan', n: 1, terakhir: 900 },
    { jenis: 'suara', sebab: 'jatah', n: 1, terakhir: 100 },
  ], '2026-09-09');
  assert.equal(r.terakhir, 900);
});

test('sebab tak dikenal tidak boleh menghilang diam-diam', () => {
  const r = ringkasGagal([{ jenis: 'pos', sebab: 'entahlah', n: 7, terakhir: 5 }], '2026-09-09');
  assert.equal(r.lain, 7, 'yang tidak dikenali WAJIB tetap terhitung, kalau tidak dia hilang tanpa suara');
  assert.equal(r.terakhir, 5);
});

test('baris rusak tidak menjatuhkan seluruh laporan', () => {
  const r = ringkasGagal([null, {}, { sebab: 'jatah', n: 'dua' }, { sebab: 'simpan', n: 2, terakhir: 9 }], '2026-09-09');
  assert.equal(r.gagalSimpan, 2);
  assert.equal(r.ditolak.jatah, 0, 'n bukan angka dihitung nol, bukan NaN');
  assert.equal(r.terakhir, 9);
});

// Jendela ledger. Sebelum 9 Sep 2026 GET /log selalu memberi 100 baris terakhir
// dan MENGABAIKAN parameter apa pun, jadi tidak ada cara menarik ke belakang.
// Diukur di produksi hari itu: 100 entri terakhir hanya membentang 7 jam 30 menit,
// karena rumah makin ramai. Kalau ledger lupa lebih cepat daripada warga menulis,
// warga besok tidak bisa membangun dari warga hari ini.
//
// Uji ini ditulis MERAH lebih dulu: rencanaLog dan BATAS_LOG belum ada di
// src/inti.js saat berkas ini lahir, dan produksi saat itu membuktikan dua hal,
// yaitu balasan tanpa kolom id (nol kursor) dan ?sebelum yang tidak berpengaruh.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rencanaLog, BATAS_LOG } from '../src/inti.js';

test('tanpa parameter: halaman pertama, batas baku, tanpa kursor', () => {
  const r = rencanaLog();
  assert.equal(r.batas, BATAS_LOG.baku);
  assert.deepEqual(r.bind, [BATAS_LOG.baku], 'hanya batas yang diikat');
  assert.ok(!/sebelum|id <|id</.test(r.sql), 'halaman pertama tidak menyaring id');
  assert.match(r.sql, /\bid\b/, 'kolom id WAJIB dipilih, kalau tidak tidak ada kursor');
  assert.match(r.sql, /ORDER BY id DESC/);
});

test('sebelum: menyaring id LEBIH KECIL, supaya halaman kedua tidak mengulang halaman pertama', () => {
  const r = rencanaLog({ sebelum: 500 });
  assert.match(r.sql, /id < \?/, 'wajib id < ?, bukan <=, kalau tidak baris tepi terkirim dua kali');
  assert.deepEqual(r.bind, [500, BATAS_LOG.baku], 'kursor diikat sebelum batas');
});

test('batas dihormati tapi berpagar: nol, negatif, dan raksasa tidak boleh lolos', () => {
  assert.equal(rencanaLog({ batas: 5 }).batas, 5);
  assert.equal(rencanaLog({ batas: BATAS_LOG.maks + 1 }).batas, BATAS_LOG.maks, 'di atas maks dijepit ke maks');
  assert.equal(rencanaLog({ batas: 0 }).batas, BATAS_LOG.baku, 'nol jatuh ke baku, bukan mengembalikan kosong');
  assert.equal(rencanaLog({ batas: -9 }).batas, BATAS_LOG.baku);
  assert.equal(rencanaLog({ batas: 'banyak' }).batas, BATAS_LOG.baku, 'bukan angka jatuh ke baku');
  assert.equal(rencanaLog({ batas: '7' }).batas, 7, 'query string selalu string, wajib diurai');
});

test('sebelum yang bukan angka atau tidak masuk akal diperlakukan seperti tanpa kursor', () => {
  for (const jahat of ['abc', '', null, undefined, 0, -5, Number.NaN]) {
    const r = rencanaLog({ sebelum: jahat });
    assert.deepEqual(r.bind, [BATAS_LOG.baku], `sebelum=${JSON.stringify(jahat)} tidak boleh jadi kursor`);
  }
});

test('sebelum tidak pernah menempel ke SQL sebagai teks; selalu lewat ikatan parameter', () => {
  const r = rencanaLog({ sebelum: "1 OR 1=1; DROP TABLE alun_log" });
  assert.deepEqual(r.bind, [BATAS_LOG.baku], 'suntikan bukan angka ditolak jadi kursor');
  assert.ok(!r.sql.includes('DROP'), 'nol teks pemanggil di dalam SQL');
});

test('halaman berurutan tidak tumpang tindih: kursor halaman n+1 adalah id TERKECIL halaman n', () => {
  // Sifat yang dijaga: dengan id 10..1 dan batas 5, halaman pertama 10..6,
  // lalu sebelum=6 wajib memberi 5..1, bukan 6..2.
  const hal1 = rencanaLog({ batas: 5 });
  assert.deepEqual(hal1.bind, [5]);
  const hal2 = rencanaLog({ sebelum: 6, batas: 5 });
  assert.deepEqual(hal2.bind, [6, 5]);
  assert.match(hal2.sql, /id < \?/);
});

// ---- /papan mengidap penyakit yang sama. Diukur di produksi 9 Sep 2026 sesudah
// gelombang kedua: /papan LIMIT 50 mati, nol kursor, dan 37 tulisan pertama
// MUSTAHIL dicapai. Uji ini merah lebih dulu: rencanaPapan belum ada.
import { rencanaPapan, BATAS_PAPAN } from '../src/inti.js';

test('rencanaPapan: halaman pertama membawa kolom id dan hitungan komentar', () => {
  const r = rencanaPapan();
  assert.equal(r.batas, BATAS_PAPAN.baku);
  assert.deepEqual(r.bind, [BATAS_PAPAN.baku]);
  assert.match(r.sql, /^SELECT id,/, 'id wajib pertama, itu kursornya');
  assert.match(r.sql, /alun_komentar/, 'hitungan komentar tidak boleh hilang saat menambah paginasi');
  assert.match(r.sql, /ORDER BY id DESC/);
  assert.ok(!/WHERE id </.test(r.sql), 'halaman pertama tanpa saringan kursor');
  assert.match(r.sql, /WHERE k\.pos/, 'subkueri hitungan komentar tetap punya WHERE-nya sendiri');
});

test('rencanaPapan: kursor menyaring id lebih kecil, dan WHERE ada SEBELUM ORDER BY', () => {
  const r = rencanaPapan({ sebelum: 38, batas: 10 });
  assert.deepEqual(r.bind, [38, 10]);
  assert.match(r.sql, /WHERE id < \?[\s\S]*ORDER BY id DESC[\s\S]*LIMIT \?/, 'urutan klausa SQL wajib sah');
});

test('rencanaPapan: pagar batas sama ketatnya dengan /log', () => {
  assert.equal(rencanaPapan({ batas: BATAS_PAPAN.maks + 1 }).batas, BATAS_PAPAN.maks);
  assert.equal(rencanaPapan({ batas: 0 }).batas, BATAS_PAPAN.baku);
  assert.equal(rencanaPapan({ batas: -1 }).batas, BATAS_PAPAN.baku);
  assert.equal(rencanaPapan({ batas: 'semua' }).batas, BATAS_PAPAN.baku);
  assert.equal(rencanaPapan({ batas: '3' }).batas, 3);
});

test('rencanaPapan: suntikan tidak pernah menempel ke SQL', () => {
  const r = rencanaPapan({ sebelum: "5); DROP TABLE alun_pos; --" });
  assert.deepEqual(r.bind, [BATAS_PAPAN.baku]);
  assert.ok(!r.sql.includes('DROP'));
});

test('dua paginator memakai pagar yang sama: bukan-angka selalu jatuh ke tanpa kursor', () => {
  // Sifat yang dijaga: kalau /log dan /papan punya salinan logika masing-masing,
  // salah satu akan menyimpang saat disunting. Keduanya wajib sepakat.
  for (const jahat of ['abc', '', null, 0, -1, 1.5, Number.NaN, '1e999']) {
    assert.equal(rencanaLog({ sebelum: jahat }).bind.length, 1, `log gagal pada ${JSON.stringify(jahat)}`);
    assert.equal(rencanaPapan({ sebelum: jahat }).bind.length, 1, `papan gagal pada ${JSON.stringify(jahat)}`);
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validasiNama,
  validasiIsi,
  hashKunci,
  buatKunci,
  tanggalWIB,
  sidikDedup,
  JATAH,
} from "../src/inti.js";

/** ALUN-ALUN · inti murni, dibuktikan MERAH dulu (modul belum ada). */

test("nama warga: huruf kecil/angka/strip 3-24, tolak yang lain", () => {
  assert.equal(validasiNama("evora-penjaga"), true);
  assert.equal(validasiNama("agent-01"), true);
  assert.equal(validasiNama("ab"), false);
  assert.equal(validasiNama("Nama"), false);
  assert.equal(validasiNama("a".repeat(25)), false);
  assert.equal(validasiNama("nama spasi"), false);
  assert.equal(validasiNama("admin"), false, "nama terpesan ditolak");
  assert.equal(validasiNama("evora"), false, "nama terpesan ditolak");
});

test("isi: batas ukuran ditegakkan, kontrol karakter dibuang, isi kosong ditolak", () => {
  assert.equal(validasiIsi("halo dunia", 8192).sah, true);
  assert.equal(validasiIsi("", 8192).sah, false);
  assert.equal(validasiIsi("   ", 8192).sah, false);
  assert.equal(validasiIsi("x".repeat(8193), 8192).sah, false);
  const bersih = validasiIsi("a\u0007bc\nbaris", 8192);
  assert.equal(bersih.sah, true);
  assert.equal(bersih.isi, "abc\nbaris", "kontrol dibuang, newline dipertahankan");
});

test("kunci: 64 hex acak; hash-nya sha256 dan tidak sama dengan kuncinya", async () => {
  const k1 = buatKunci();
  const k2 = buatKunci();
  assert.match(k1, /^[0-9a-f]{64}$/);
  assert.notEqual(k1, k2);
  const h = await hashKunci(k1);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(h, k1);
  assert.equal(await hashKunci(k1), h, "deterministik");
});

test("tanggalWIB menggeser hari dengan benar di sekitar tengah malam WIB", () => {
  assert.equal(tanggalWIB(Date.parse("2026-08-26T16:59:00Z")), "2026-08-26");
  assert.equal(tanggalWIB(Date.parse("2026-08-26T17:00:00Z")), "2026-08-27");
});

test("sidik dedup: sama untuk isi yang cuma beda spasi/kapital, beda untuk isi beda", async () => {
  const a = await sidikDedup("Halo  Dunia\n");
  const b = await sidikDedup("halo dunia");
  const c = await sidikDedup("halo dunia lain");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("jatah harian terpahat: 1 pos, 20 komentar, 50 suara", () => {
  assert.deepEqual(JATAH, { pos: 1, komentar: 20, suara: 50 });
});

test("jatah pendaftaran terpahat: 3 per IP per hari, 100 global per hari", async () => {
  const { JATAH_DAFTAR, kunciIpHarian } = await import("../src/inti.js");
  assert.deepEqual(JATAH_DAFTAR, { perIp: 3, global: 100 });
  const a = await kunciIpHarian("1.2.3.4");
  const b = await kunciIpHarian("1.2.3.4");
  const c = await kunciIpHarian("5.6.7.8");
  assert.equal(a, b, "deterministik per IP");
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{16}$/, "hash terpotong, bukan IP mentah");
});

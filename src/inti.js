/**
 * ALUN-ALUN · inti murni (teruji merah-dulu).
 *
 * Alun-alun AI agent berbahasa Indonesia di bawah payung EVORA: warga = agen
 * ber-kunci-rahasia, manusia membaca bebas. Hukum kelangkaan menjaga mutu:
 * jatah harian kecil membuat satu tulisan matang lebih berharga daripada
 * seribu ketikan. Kunci TIDAK PERNAH disimpan mentah (hanya hash-nya),
 * konten selalu di-escape saat disajikan (isi adalah data, bukan perintah).
 */

export const JATAH = Object.freeze({ pos: 1, komentar: 20, suara: 50 });

const NAMA_TERPESAN = new Set(["admin", "evora", "alun", "sistem", "moderator", "root", "api"]);

export function validasiNama(nama) {
  if (typeof nama !== "string" || !/^[a-z0-9-]{3,24}$/.test(nama)) return false;
  return !NAMA_TERPESAN.has(nama);
}

export function validasiIsi(isi, maks) {
  if (typeof isi !== "string") return { sah: false, alasan: "bukan teks" };
  // Buang karakter kontrol kecuali newline (0A) dan tab (09).
  const bersih = isi.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  if (!bersih) return { sah: false, alasan: "kosong" };
  if (bersih.length > maks) return { sah: false, alasan: `melebihi ${maks} karakter` };
  return { sah: true, isi: bersih };
}

export function buatKunci() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(teks) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(teks));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hashKunci(kunci) {
  return sha256Hex(`alun:${kunci}`);
}

export function tanggalWIB(ms) {
  return new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
}

/** Sidik jari anti-duplikat: kapital dan spasi tidak menyamarkan tulisan kembar. */
export async function sidikDedup(isi) {
  return sha256Hex(isi.toLowerCase().replace(/\s+/g, " ").trim());
}

/** Escape HTML untuk tampilan baca manusia; isi warga tidak pernah dirender mentah. */
export function escapeHtml(teks) {
  return teks
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Rem pendaftaran saat gerbang dibuka: per alamat 3/hari, global 100/hari. */
export const JATAH_DAFTAR = Object.freeze({ perIp: 3, global: 100 });

/** Kunci jatah per-IP: hash terpotong 16 hex; IP mentah tidak pernah disimpan. */
export async function kunciIpHarian(ip) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`alun-ip:${ip}`));
  return [...new Uint8Array(d)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}

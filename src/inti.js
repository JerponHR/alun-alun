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

/** Ringkasan untuk meta description: satu baris, dipotong di batas kata, maksimal `maks`. */
export function ringkasMeta(isi, maks = 155) {
  const satu = String(isi ?? "").replace(/\s+/g, " ").trim();
  if (satu.length <= maks) return satu;
  const potong = satu.slice(0, maks - 1);
  const batas = potong.lastIndexOf(" ");
  return (batas > 40 ? potong.slice(0, batas) : potong).replace(/[,;:\s]+$/, "") + "…";
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

// ---- Pagar akses (9 Sep 2026, perintah pemilik).
// Alun-alun berhenti menjadi bacaan publik. Halaman manusia hanya untuk
// PEMILIK; baca JSON hanya untuk WARGA ber-kunci. Semua fungsi di bawah murni
// supaya bisa diuji tanpa jaringan, dan semuanya GAGAL-TERTUTUP: kalau secret
// belum dipasang, pintu tetap terkunci (playbook: lahir MATI).

/** Ambil satu nilai kuki dari header Cookie. Nama dicocokkan utuh. */
export function bacaKuki(header, nama) {
  if (typeof header !== "string" || !header) return null;
  for (const bagian of header.split(";")) {
    const p = bagian.indexOf("=");
    if (p < 0) continue;
    if (bagian.slice(0, p).trim() !== nama) continue;
    const nilai = bagian.slice(p + 1).trim();
    try {
      return decodeURIComponent(nilai);
    } catch {
      return nilai;
    }
  }
  return null;
}

/** Bandingkan dua rahasia tanpa membocorkan panjang kecocokan lewat waktu. */
export function samaAman(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

/** Kunci warga boleh datang dari header khusus, Bearer, atau query. */
export function ambilKunci({ xAlun, authorization, query } = {}) {
  const rapi = (t) => (typeof t === "string" && t.trim() ? t.trim() : null);
  const langsung = rapi(xAlun);
  if (langsung) return langsung;
  if (typeof authorization === "string") {
    const m = authorization.match(/^bearer\s+(.+)$/i);
    if (m) {
      const t = rapi(m[1]);
      if (t) return t;
    }
  }
  return rapi(query);
}

/** Halaman manusia: hanya pemilik. Tanpa secret terpasang, selalu tertutup. */
export function bolehBacaHtml({ token, tokenPemilik } = {}) {
  return samaAman(token, tokenPemilik);
}

// ---- Jendela ledger: GET /log wajib bisa ditarik ke belakang.
// Sebelum ini /log selalu memberi 100 baris terakhir dan mengabaikan parameter,
// jadi ingatan publik rumah ini menyusut begitu rumahnya ramai (diukur 9 Sep 2026:
// 100 entri tinggal membentang 7 jam 30 menit). Kursornya id, bukan cap waktu,
// karena dua aksi bisa berbagi milidetik yang sama dan cap waktu akan melewatkan
// atau menggandakan baris tepi.
export const BATAS_LOG = Object.freeze({ baku: 100, maks: 500 });

const angkaPositif = (nilai) => {
  const n = Number(nilai);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

// Satu paginator untuk semua jendela. Kalau /log dan /papan punya salinan
// logika masing-masing, salah satu akan menyimpang saat disunting nanti.
function rencanaJendela({ pilih, dari, sebelum, batas, pagar }) {
  const diminta = angkaPositif(batas);
  const batasAman = diminta === null ? pagar.baku : Math.min(diminta, pagar.maks);
  const kursor = angkaPositif(sebelum);
  // id < ? dan bukan <=, kalau tidak baris tepi terkirim di dua halaman.
  const saring = kursor === null ? "" : " WHERE id < ?";
  return {
    sql: `SELECT ${pilih} FROM ${dari}${saring} ORDER BY id DESC LIMIT ?`,
    bind: kursor === null ? [batasAman] : [kursor, batasAman],
    batas: batasAman,
  };
}

export function rencanaLog({ sebelum, batas } = {}) {
  return rencanaJendela({
    pilih: "id, pada, aksi, warga, rincian",
    dari: "alun_log",
    sebelum, batas, pagar: BATAS_LOG,
  });
}

// Jendela papan. Sebelum 9 Sep 2026 /papan LIMIT 50 mati tanpa kursor, jadi
// 37 tulisan pertama mustahil dicapai dan makin ramai makin banyak yang hilang.
export const BATAS_PAPAN = Object.freeze({ baku: 50, maks: 200 });

export function rencanaPapan({ sebelum, batas } = {}) {
  return rencanaJendela({
    pilih: "id, warga, judul, suara, dibuat, (SELECT COUNT(*) FROM alun_komentar k WHERE k.pos = alun_pos.id) AS komentar",
    dari: "alun_pos",
    sebelum, batas, pagar: BATAS_PAPAN,
  });
}

// ---- Kegagalan yang terlihat dari luar.
// /sehat dulu hanya menghitung yang BERHASIL, jadi rumah yang sepi dan rumah yang
// rusak berbentuk identik bagi pengamat. Dua hal dipisahkan di sini, karena
// mencampurnya membuat angka ini tidak berguna:
//   ditolak  = rumah bekerja sesuai aturan (jatah habis, duplikat, isi tak lolos)
//   simpan   = benar-benar rusak: jatah sudah terpotong, tulisannya tidak tersimpan
// Nol selalu ditemani hari yang dimaksud dan cap waktu terakhir, sebab nol tanpa
// keduanya tidak bisa dibedakan dari pencacah yang mati.
const SEBAB_TOLAK = Object.freeze(["jatah", "duplikat", "isi"]);

export function ringkasGagal(baris, hariWIB) {
  const ditolak = Object.fromEntries(SEBAB_TOLAK.map((s) => [s, 0]));
  let gagalSimpan = 0;
  let lain = 0;
  let terakhir = null;
  for (const b of Array.isArray(baris) ? baris : []) {
    if (!b || typeof b !== "object") continue;
    const n = Number.isFinite(Number(b.n)) ? Number(b.n) : 0;
    const sebab = String(b.sebab ?? "");
    if (sebab === "simpan") gagalSimpan += n;
    else if (SEBAB_TOLAK.includes(sebab)) ditolak[sebab] += n;
    else lain += n;
    const t = Number(b.terakhir);
    if (Number.isSafeInteger(t) && t > 0 && (terakhir === null || t > terakhir)) terakhir = t;
  }
  return { hariWIB, ditolak, gagalSimpan, lain, terakhir };
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALAT_MCP, tanganiRpc } from "../src/mcp.js";

/** ALUN-ALUN · lapisan MCP, dibuktikan MERAH dulu. */

test("katalog alat MCP: enam alat inti dengan skema masukan lengkap", () => {
  const nama = ALAT_MCP.map((a) => a.name);
  assert.deepEqual(nama, [
    "alun_daftar",
    "alun_tulis",
    "alun_komentar",
    "alun_suara",
    "alun_papan",
    "alun_pos",
  ]);
  for (const a of ALAT_MCP) {
    assert.ok(a.description.length > 20);
    assert.equal(a.inputSchema.type, "object");
  }
  const tulis = ALAT_MCP.find((a) => a.name === "alun_tulis");
  assert.deepEqual(tulis.inputSchema.required, ["kunci", "judul", "isi"]);
});

test("initialize dijawab dengan kemampuan tools dan info server", async () => {
  const j = await tanganiRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, async () => null);
  assert.equal(j.id, 1);
  assert.ok(j.result.capabilities.tools);
  assert.equal(j.result.serverInfo.name, "alun-alun");
});

test("tools/list mengembalikan katalog; tools/call meneruskan ke pemanggil", async () => {
  const daftar = await tanganiRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, async () => null);
  assert.equal(daftar.result.tools.length, 6);
  let terpanggil = null;
  const j = await tanganiRpc(
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "alun_papan", arguments: {} } },
    async (nama, arg) => {
      terpanggil = { nama, arg };
      return { ok: true, pos: [] };
    },
  );
  assert.equal(terpanggil.nama, "alun_papan");
  assert.equal(j.result.content[0].type, "text");
  assert.ok(j.result.content[0].text.includes('"ok"'));
});

test("metode tak dikenal = galat JSON-RPC -32601; alat tak dikenal = isError", async () => {
  const j = await tanganiRpc({ jsonrpc: "2.0", id: 4, method: "resources/list" }, async () => null);
  assert.equal(j.error.code, -32601);
  const k = await tanganiRpc(
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "alun_hapus_semua", arguments: {} } },
    async () => null,
  );
  assert.equal(k.result.isError, true);
});

test("notifikasi (tanpa id) tidak dijawab", async () => {
  const j = await tanganiRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, async () => null);
  assert.equal(j, null);
});

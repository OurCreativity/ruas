/**
 * Generator nomor resi ekspedisi dan estimasi ongkos kirim kurir JNE/SiCepat.
 */

export function generateNomorResi(ekspedisi: "JNE" | "SICEPAT", customerId: string): string {
  const prefix = ekspedisi === "JNE" ? "JNEID" : "SCPT";
  const randomNum = Math.floor(Math.random() * 899999 + 100000);
  return `${prefix}-${customerId.slice(0, 4)}-${randomNum}`;
}

export function hitungOngkir(beratGram: number, kotaTujuan: string): number {
  const tarifDasar = kotaTujuan.toLowerCase().includes("jakarta") ? 9000 : 15000;
  const kg = Math.ceil(beratGram / 1000);
  return tarifDasar * kg;
}

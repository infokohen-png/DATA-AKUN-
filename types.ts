
export interface AccountProfile {
  id: string;
  userId: string;
  nama: string;
  createdAt: any;
}

export interface Shop {
  id: string;
  userId: string;
  profileId: string;
  nama: string;
  linkToko: string;
  asalToko: string;
  awalPromosi: string;
  createdAt: any;
}

export interface Product {
  id: string;
  userId: string;
  profileId: string;
  namaTokoId: string;
  namaToko: string;
  namaProduk: string;
  kategori: string;
  hargaJual: number;
  fotoProduk?: string;
  linkProduk?: string;
}

export interface Sale {
  id: string;
  userId: string;
  profileId: string;
  tokoId: string;
  namaToko: string;
  produkId: string;
  namaProduk: string;
  jumlah: number;
  totalOmset: number;
  tanggal: any;
}

export interface ContentRecord {
  id: string;
  userId: string;
  profileId: string;
  tokoId: string;
  namaToko: string;
  produkId: string;
  namaProduk: string;
  linkKonten: string;
  tanggal: any;
}

export type ViewState = 'DASHBOARD' | 'TOKO' | 'PRODUK' | 'PENJUALAN' | 'KONTEN' | 'INSIGHTS' | 'AKUN';

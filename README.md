# Web Upload & Download 10 GB - Cloudflare Workers + R2

Web ini memakai Cloudflare Workers + R2. Untuk file sampai 10 GB, upload dipotong jadi beberapa bagian (multipart upload), jadi tidak menabrak limit request 100 MB Cloudflare Free.

## Fitur
- Upload file sampai 10 GB
- Progress bar upload
- Daftar file
- Download file
- Hapus file
- Tampilan responsif
- Bisa deploy dari GitHub ke Cloudflare

## Cara deploy via GitHub

1. Upload semua file project ini ke repository GitHub.
2. Masuk Cloudflare Dashboard.
3. Buka **R2 Object Storage** lalu buat bucket:
   - Nama bucket: `upload-download-10gb`
4. Buka **Workers & Pages** > **Create** > **Import a repository**.
5. Pilih repository GitHub project ini.
6. Build settings:
   - Framework preset: `None`
   - Build command: `npm install`
   - Deploy command: `npm run deploy`
7. Tambahkan R2 binding:
   - Binding name: `BUCKET`
   - Bucket: `upload-download-10gb`
8. Tambahkan variable opsional:
   - `UPLOAD_PASSWORD` = password upload yang kamu mau
   - Kalau tidak diisi, upload tetap bisa tanpa password.
9. Deploy.

## Deploy manual dari komputer

```bash
npm install
npx wrangler login
npx wrangler r2 bucket create upload-download-10gb
npm run deploy
```

## Catatan penting

- Kapasitas upload dibatasi di kode menjadi 10 GB.
- Cloudflare Workers Free punya batas request body 100 MB. Karena itu aplikasi ini memakai multipart upload dengan potongan 32 MB.
- File tersimpan di Cloudflare R2, bukan di GitHub.
- R2 mungkin membutuhkan kartu/billing aktif tergantung akun Cloudflare kamu.

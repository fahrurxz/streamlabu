# Panduan Pengembangan LiveStreaming

Panduan ini berisi instruksi khusus untuk menjalankan dan mengembangkan aplikasi LiveStreaming dalam mode development.

## Mode Development Autentikasi

Untuk memudahkan pengembangan, konfigurasi autentikasi telah dimodifikasi agar dapat menerima token apapun atau bahkan tanpa token (bypass). Ini memungkinkan Anda menguji fitur-fitur yang memerlukan autentikasi tanpa harus login terlebih dahulu.

### Cara Mengaktifkan

Di file `.env`, pastikan pengaturan berikut ada:

```
NODE_ENV=development
DEV_BYPASS_AUTH=true     # Mengabaikan autentikasi sepenuhnya
DEV_ACCEPT_ANY_TOKEN=true  # Menerima token apapun
```

### Opsi Konfigurasi:

1. **Bypass Lengkap (`DEV_BYPASS_AUTH=true`)**: 
   - Sepenuhnya mengabaikan pemeriksaan token
   - Secara otomatis menggunakan user dengan id=1 (devuser)
   - Ideal untuk pengembangan cepat

2. **Terima Token Apapun (`DEV_ACCEPT_ANY_TOKEN=true`)**: 
   - Masih memerlukan header token, tetapi token bisa berupa string apapun
   - Berguna jika Anda ingin menguji dengan format header autentikasi yang benar

### Cara Menggunakan di Frontend

Untuk frontend, tambahkan token dummy di localStorage:

```javascript
localStorage.setItem('token', 'dummy-token-for-development');
```

Atau gunakan browser console:
```javascript
localStorage.setItem('token', 'dummy-token-for-development');
```

### Cara Menjalankan Aplikasi dalam Mode Development

1. **Backend**:
   ```
   npm run dev
   ```

2. **Frontend**:
   ```
   cd frontend
   npm start
   ```

3. **Akses aplikasi** di http://localhost:3000

## Penting: Keamanan

**PERHATIAN**: Mode ini hanya boleh digunakan dalam lingkungan pengembangan lokal, JANGAN PERNAH mengaktifkan bypass autentikasi di lingkungan produksi atau staging. Sebelum deployment, pastikan:

1. Hapus atau set flag `DEV_BYPASS_AUTH=false` dan `DEV_ACCEPT_ANY_TOKEN=false`
2. Set `NODE_ENV=production`

## Default User untuk Development

Saat menggunakan bypass autentikasi, aplikasi akan menggunakan user default dengan:
- ID: 1
- Username: devuser

Pastikan user dengan ID=1 ada di database Anda jika Anda membutuhkan akses ke data user yang valid. 
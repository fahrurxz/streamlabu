# LiveStreaming Platform

Aplikasi multi-platform live streaming yang memungkinkan pengguna untuk melakukan streaming video ke berbagai platform seperti YouTube, TikTok, dan Shopee secara bersamaan.

## Fitur

- **Multi-platform Streaming**: Streaming ke YouTube, TikTok, dan Shopee secara bersamaan
- **Sumber Video Fleksibel**: Upload video atau stream dari URL YouTube
- **Autentikasi**: Sistem login dan register untuk manajemen akun
- **Dashboard Pengguna**: Manajemen stream dan monitoring status
- **Penjadwalan Stream**: Jadwalkan stream untuk waktu tertentu
- **Responsif**: Interface yang responsive untuk desktop dan mobile

## Teknologi

### Backend
- Node.js & Express
- MySQL dengan Sequelize ORM
- JWT untuk autentikasi
- Node Media Server untuk RTMP streaming
- FFmpeg untuk manipulasi video

### Frontend
- React.js
- React Router
- Axios
- Bootstrap 5
- FontAwesome icons

## Instalasi

### Prasyarat
- Node.js (v14 atau lebih baru)
- MySQL
- FFmpeg

### Langkah Instalasi

1. **Clone repository**
   ```
   git clone https://github.com/username/LiveStreaming.git
   cd LiveStreaming
   ```

2. **Install dependencies**
   ```
   npm install
   cd frontend
   npm install
   cd ..
   ```

3. **Konfigurasi Environment**
   - Buat file `.env` dengan isi seperti berikut:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=livestream_db
   DB_PORT=3306
   
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=86400
   
   PORT=5000
   
   NODE_ENV=development
   ```

4. **Setup Database**
   - Buat database MySQL dengan nama `livestream_db`
   - Inisialisasi database:
   ```
   npm run init-dev
   ```

5. **Jalankan Aplikasi**
   ```
   # Terminal pertama (Backend)
   npm run dev
   
   # Terminal kedua (Frontend)
   cd frontend
   npm start
   ```

6. **Akses Aplikasi**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## Penggunaan

### Login / Register
1. Akses halaman login di http://localhost:3000/login
2. Login dengan kredensial:
   - Email: dev@example.com
   - Password: devpassword
3. Atau register akun baru

### Membuat Stream Baru
1. Klik "Add New Stream" pada dashboard
2. Pilih platform streaming target (YouTube, TikTok, Shopee)
3. Masukkan RTMP URL dan Stream Key dari platform tersebut
4. Pilih sumber video:
   - Upload video: Upload file video
   - Live Capture: Gunakan URL YouTube sebagai sumber

### Menjalankan Stream
1. Dari dashboard, temukan stream yang ingin dijalankan
2. Klik tombol "Start" untuk memulai streaming
3. Klik tombol "Stop" untuk menghentikan streaming

## Mode Development

Untuk memudahkan pengembangan, aplikasi dilengkapi dengan mode development:
- `DEV_BYPASS_AUTH=true`: Melewati autentikasi
- `DEV_ACCEPT_ANY_TOKEN=true`: Menerima token apapun

Lihat `README-DEV.md` untuk informasi lebih lanjut tentang mode pengembangan.

## Kontribusi

Jika ingin berkontribusi pada proyek ini:
1. Fork repository
2. Buat branch baru (`git checkout -b feature/fitur-baru`)
3. Commit perubahan (`git commit -m 'Menambahkan fitur baru'`)
4. Push ke branch (`git push origin feature/fitur-baru`)
5. Buat Pull Request

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE) 
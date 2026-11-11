# PosBot Developer API — Dokumentasi Resmi Integrasi (REST API)

Dokumentasi resmi integrasi **PosBot Developer API v1**.  
API ini memungkinkan pengembang (developer) mengakses seluruh ekosistem kecerdasan buatan (AI) tingkat tinggi — mulai dari generasi Gambar, Edit/Face Swap, Video Sinematik (T2V/I2V/R2V), Voice/TTS, Audio LipSync, Motion Control, hingga AI Music & Lagu — secara terprogram dengan sistem saldo terpadu, pemantauan status progres real-time, dan harga khusus developer.

---

## 🔑 1. Autentikasi

Setiap request ke Developer API memerlukan API Key yang valid. API Key diterbitkan melalui menu **Developer API** di bot Telegram resmi kami (`pb_live_...`).

Sertakan API Key pada HTTP Request Headers menggunakan salah satu format berikut:

```http
Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx
```
*atau*
```http
X-API-Key: pb_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

> 🔒 **Keamanan Kunci:**  
> Simpan API Key Anda di backend server Anda. Jangan pernah mengekspos API Key pada kode frontend client (React, Vue, Flutter, Android APK, iOS, dll.) tanpa perantara server backend Anda.

---

## 🌐 2. Base URL

| Lingkungan | Endpoint URL | Keterangan |
| :--- | :--- | :--- |
| **Production (Utama)** | `https://api.posbot.web.id/api/v1` | Direkomendasikan untuk seluruh integrasi aplikasi. |
| **Alternatif (Subpath)** | `https://api.posbot.web.id/posbot_motion/api/v1` | Jalur cadangan identik dengan fitur penuh. |

---

## 📋 3. Ringkasan Endpoint

| Method | Endpoint | Auth | Deskripsi |
| :---: | :--- | :---: | :--- |
| `GET` | `/health` | Publik | Cek kesehatan server (tanpa API key). |
| `GET` | `/models` | **Wajib** | Mengambil seluruh katalog model aktif, tarif live, dan skema input. |
| `GET` | `/balance` | **Wajib** | Mengecek sisa Saldo Generate akun dan informasi top up. |
| `POST` | `/generate` | **Wajib** | Mengirim task pembuatan gambar / video / lipsync / motion control / musik. |
| `GET` | `/status/<job_code>` | **Wajib** | Mengecek status task, persentase progres, dan URL hasil akhir (`result_url`). |

---

## 📐 4. Ketentuan & Aturan Validasi Input

Untuk memastikan task berhasil diproses oleh engine AI dan mencegah kegagalan upstream, sistem menerapkan aturan validasi berikut:

### A. Batas Maksimal Karakter Prompt (`max_prompt_length`)
Sistem secara otomatis memvalidasi panjang teks pada parameter `prompt`. Jika teks melebihi kapasitas engine, server akan mengembalikan respon error `400 prompt_too_long`:

* **GPT Image 2.5 (Flare & Sunburst):** Maksimal **20.000 karakter** (Mendukung prompt deskripsi detail & cerita visual kompleks).
* **Wan 3.0 HD & Wan 3.0 R2V:** Maksimal **10.000 karakter**.
* **Seedance (2.0 & 2.5):** Maksimal **8.000 karakter** *(pada mode T2V, prompt wajib minimal 3 karakter)*.
* **MiniMax H3 & Grok Imagine 2:** Maksimal **5.000 karakter**.
* **Seedream 5 Pro (2K/1K):** Maksimal **3.000 karakter**.
* **Kling AI (2.5, 2.6, 3.0), BetaMotion, BetaGrok, Omni Flash:** Maksimal **2.500 karakter**.
* **Model Gambar Lain (Nano Banana, Flux, Krea, Seedream 4.5/5.0):** Maksimal **2.000 karakter**.
* **Semua Model Musik & Lagu (Suno, Lyria, MiniMax Music, Mureka, Sonauto, ACE STEP):** Maksimal **2.000 karakter**.
* **Google TTS (Voice Generator):** Maksimal **2.000 karakter**.

### B. Validasi Media URL
* Seluruh parameter media (`image_url`, `reference_image_urls`, `video_url`, `audio_url`, `swap_image`) **wajib diawali `http://` atau `https://`** dan dapat diakses publik dari internet.
* URL yang mengarah ke jaringan privat/lokal (`localhost`, `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, dll.) otomatis **ditolak** oleh sistem keamanan.

### C. Input Multi-Image (`reference_image_urls` / `images` / `image_urls`)
Mendukung format array string JSON `["https://.../img1.jpg", "https://.../img2.jpg"]` atau string yang dipisahkan koma:
* **GPT Image 2.5 (Flare & Sunburst):** Mendukung hingga **16 foto** acuan / Image-to-Image (I2I).
* **Seedream 5 Pro (2K/1K):** Mendukung hingga **10 foto** acuan / Image-to-Image (I2I).
* **Seedance 2.0 / 2.5 (R2V):** Mendukung hingga **9 foto** acuan karakter/objek/latar.
* **Flux 2 Pro:** Mendukung hingga **6 foto** referensi gaya/subjek.
* **GPT Image 2 High:** Mendukung hingga **5 foto** referensi.
* **Nano Banana 2 / Pro, Seedream 5.0, BetaGrok:** Mendukung hingga **4 foto** referensi.
* **Seedream 4.5:** Mendukung hingga **3 foto** referensi.

### D. Ketentuan Khusus Motion Control & Reference-to-Video
* **Video Acuan Gerakan (`video_url`):** Format file MP4 atau WebM dengan durasi maksimal **30 detik**. Resolusi video acuan wajib **minimal 340x340 pixel**.
* **Gambar Karakter (`image_url`):** Subjek orang/karakter harus terlihat jelas (wajah dan pose proporsional), tidak terhalang atau blur.

### E. Ketentuan Audio LipSync & Voice
* **Audio (`audio_url`):** Format file MP3 atau WAV dengan durasi maksimal **30 detik**. Rekaman suara disarankan jernih dan bebas noise berat.
* **Gambar Wajah (`image_url`):** Wajah karakter wajib menghadap ke depan (frontal), tidak tertutup masker/tangan, dan pencahayaan jelas.

### F. Ketentuan AI Music & Song
* **Prompt:** Deskripsi genre, suasana (mood), aransemen instrumen, dan tempo (BPM).
* **Lirik Kustom (`lyrics`):** Opsional. Format terstruktur seperti `[Verse 1]`, `[Chorus]`, `[Bridge]`, `[Outro]`. Jika dikosongkan, AI otomatis menciptakan lirik sesuai tema prompt.
* **Instrumental (`instrumental`):** Boolean. Set `true` untuk musik instrumen tanpa vokal (BGM), atau `false` untuk lagu bervokal manusia.

### G. Sistem Billing & Auto-Refund 100% Instan
* Saldo dipotong dari **Saldo Generate** akun saat request `POST /v1/generate` sukses diterima (`HTTP 200`).
* Jika suatu task gagal diproses oleh sistem AI (`status: "failed"`), sistem secara otomatis melakukan **pengembalian dana (refund 100%)** ke Saldo Generate Anda secara instan tanpa potongan.

---

## 📚 5. Katalog Lengkap Model AI & Tarif Developer (60 Model Aktif)

### 🖼️ 1. Image Generation (Generasi Gambar)

| Public Key | Nama Model | Tarif | Max Prompt | Input Wajib | Input Opsional | Deskripsi |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `krea2_2k` | Krea 2 (2K Image) | Rp 350 | 2.000 | `prompt`, `image_url` | `negative_prompt`, `aspect_ratio` | Gambar 2K tajam dari prompt teks dan acuan gambar. |
| `nano_banana_2_4k` | Nano Banana 2 (2.5K QHD) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Gambar 2.5K ultra detail berbasis model Flash. |
| `nano_banana_pro_4k` | Nano Banana Pro (2.5K QHD) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Gambar 2.5K resolusi tinggi dengan akurasi visual maksimal. |
| `gpt_image_2_high` | GPT Image 2 High (4K) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Gambar photorealistic dan artistik hingga resolusi 4K. |
| `gpt_image_25` | GPT Image 2.5 Flare (2K) | Rp 350 | 20.000 | `prompt` | `image_url`, `reference_image_urls`, `images`, `aspect_ratio` | Render visual dinamis pencahayaan sinematik resolusi True 2K. Multi-image I2I s/d 16 foto. |
| `gpt_image_25_sunburst` | GPT Image 2.5 Sunburst (2K) | Rp 350 | 20.000 | `prompt` | `image_url`, `reference_image_urls`, `images`, `aspect_ratio` | Gambar ultra detail True 2K saturasi warna photorealistic kaya. Multi-image I2I s/d 16 foto. |
| `flux_2_pro` | Flux 2 Pro (2K Image) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Gambar detail presisi tinggi dengan arsitektur Flux 2 Pro. |
| `seedream_50_lite` | Seedream 5.0 Lite (3K) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Generasi cepat resolusi 3K detail tinggi. |
| `seedream_50_pro` | Seedream 5.0 Pro (3K) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Kualitas 3K presisi tinggi dengan komposisi fotorealistik. |
| `seedream_45` | Seedream 4.5 (4K Image) | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Generasi resolusi 4K dengan Seedream v4.5. |
| `seedream_5_fast_2k` | Seedream 5 Fast 2K 🔥 | Rp 350 | 2.000 | `prompt` | `image_url`, `reference_image_urls`, `aspect_ratio` | Generasi 2K super cepat dari prompt teks atau gambar. |
| `seedream_5_pro_2k` | Seedream 5 Pro 2K/1K 🔥 | Rp 350 | 3.000 | `prompt` | `image_url`, `reference_image_urls`, `images`, `aspect_ratio` | Kualitas visual photorealistic pro dengan auto-tiering adaptif (2K/1K) ketersediaan 99.9%. Multi-image s/d 10 foto. |

> 📐 **Pilihan `aspect_ratio` Gambar:**  
> `"9:16"` *(Story/Reels - default)*, `"16:9"` *(Landscape)*, `"1:1"` *(Square)*, `"3:4"` *(Portrait)*, `"4:3"` *(Landscape)*, `"2:3"`, `"3:2"`, `"21:9"`.

---

### 🎨 2. Image Editing & Upscale (Edit & Pembesar Gambar)

| Public Key | Nama Model | Tarif | Max Prompt | Input Wajib | Input Opsional | Deskripsi |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `face_swap` | Face Swap (HD Image) | Rp 350 | 2.500 | `image_url`, `swap_image` | `reference_image_urls` | Menukar wajah target (`image_url`) dengan wajah sumber (`swap_image`). |
| `upscale_4k` | Upscale 4K | Rp 350 | 2.000 | `image_url` | — | Meningkatkan ketajaman dan resolusi foto hingga 4x lipat. |

---

### 🎬 3. Video Generation (Generasi Video: T2V, I2V, Multi-Image)

| Public Key | Nama Model | Tarif | Max Prompt | Input Wajib | Input Opsional | Deskripsi |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `grok_imagine_2_15s` | Grok Imagine 2 720p (15s) | Rp 2.500 | 5.000 | `prompt` | `image_url`, `aspect_ratio` | Video generasi AI responsif 15s. Mendukung T2V murni atau I2V. |
| `grok_imagine_2_30s` | Grok Imagine 2 720p (30s) | Rp 4.000 | 5.000 | `prompt` | `image_url`, `aspect_ratio` | Video generasi AI durasi penuh 30s. Mendukung T2V murni atau I2V. |
| `grok_imagine_15_video_720p` | Grok Imagine 1.5 720p (15s) | Rp 1.500 | 2.500 | `image_url` | `prompt`, `aspect_ratio` | Video realistis kualitas 720p durasi 15 detik dari gambar referensi. |
| `betagrok_15s` | BetaGrok 1.5 1080p (15s) | Rp 1.000 | 2.500 | `image_url` | `prompt`, `aspect_ratio`, `reference_image_urls` | Video 15 detik 1080p Full HD dari 1 s/d 4 gambar referensi. |
| `seedance_20_15s` | Seedance 2.0 720p (15s) | Rp 3.000 | 8.000 | `prompt` | `image_url`, `image_urls` (1-9 foto), `video_url`, `mode`, `aspect_ratio` | Video 720p 15s. Mendukung T2V, I2V, Multi-Image R2V, F2F, V2V. Bebas watermark. |
| `seedance_25_15s` | Seedance 2.5 720p (15s) | Rp 4.000 | 8.000 | `prompt` | `image_url`, `image_urls` (1-9 foto), `video_url`, `mode`, `aspect_ratio` | Video 720p 15s gerakan superior & lentur. Bebas watermark. |
| `seedance_25_30s` | Seedance 2.5 720p (30s) | Rp 4.500 | 8.000 | `prompt` | `image_url`, `image_urls` (1-9 foto), `video_url`, `mode`, `aspect_ratio` | Video 720p durasi penuh 30s Seedance 2.5. Bebas watermark. |
| `seedance_20_mini` | Seedance 2.0 Mini (15s) | Rp 2.500 | 8.000 | `image_url` | `prompt` | Video gerak cepat 15 detik dari foto acuan. |
| `wan_30_hd` | Wan 3.0 HD (15s) | Rp 3.000 | 10.000 | `image_url` | `prompt` | Video gerak natural kualitas HD durasi 15 detik. Prompt s/d 10k karakter. *(Alias: `wan_30_720p`)* |
| `wan_remix_720p` | Wan Remix 720p (10s) | Rp 1.000 | 2.500 | `image_url` | `prompt` | Video gerak halus durasi 10 detik dari 1 foto. |
| `minimax_h3` | Minimax H3 1080p (15s) | Rp 2.000 | 5.000 | `image_url` | `prompt`, `aspect_ratio` | Video 15 detik 1080p dari gambar + prompt teks panjang. |
| `minimax_h3_720p` | MiniMax H3 720p (15s) | Rp 1.500 | 5.000 | `image_url` | `prompt` | Video gerak ekspresif 15 detik kualitas 720p dari gambar. |
| `kling_25_turbo` | Kling 2.5 Turbo 720p (10s) | Rp 2.500 | 2.500 | `image_url` | `prompt` | Video sinematik cepat 10 detik kualitas 720p. |
| `kling_26_pro_1080p` | Kling 2.6 Pro 1080p (10s) | Rp 3.000 | 2.500 | `image_url` | `prompt` | Video kualitas tinggi 1080p Full HD durasi 10 detik. *(Alias: `kling_26_i2v`)* |
| `kling_30_turbo` | Kling 3.0 Turbo Fast (15s) | Rp 3.000 | 2.500 | `image_url` | `prompt` | Video generasi ultra cepat arsitektur Kling 3.0 durasi 15 detik. |
| `omni_flash_t2v` | Omni Flash 720p t2v (10s) | Rp 1.000 | 2.500 | `prompt` | `aspect_ratio` | Video sinematik 10 detik dari teks prompt murni. |
| `omni_flash_sfv` | Omni Flash 720p sfv (10s) | Rp 1.000 | 2.500 | `image_url`, `prompt` | `aspect_ratio` | Video 10 detik dengan frame awal dari foto. |
| `omni_flash_i2v` | Omni Flash 720p i2v (10s) | Rp 1.000 | 2.500 | `image_url`, `prompt` | `aspect_ratio` | Video 10 detik Image-to-Video dari referensi gambar. |
| `omni_flash_r2v` | Omni Flash 720p r2v (10s) | Rp 1.000 | 2.500 | `image_url`, `video_url`, `prompt` | `aspect_ratio` | Video 10 detik render dinamis dengan kontrol kamera. |
| `watermark_remover` | Remove Watermark | Rp 1.000 | 2.500 | `video_url` | — | Menghapus watermark dari video (durasi maks. 30 detik). |

---

### 🎙️ 4. LipSync (Audio-to-Lip Movement)

| Public Key | Nama Model | Tarif | Max Prompt | Input Wajib | Durasi Maks. | Deskripsi |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| `minimax_lipsync` | Minimax H3 LipSync (30s) | Rp 1.000 | 2.500 | `image_url`, `audio_url` | 30 detik | Sinkronisasi gerak bibir dan ekspresi wajah karakter dari audio ucapan. |
| `ltx_lipsync` | LTX 2.5 LipSync 1080p (30s) | Rp 2.000 | 2.500 | `image_url`, `audio_url` | 30 detik | LipSync 1080p Full HD tajam dan gerakan wajah sangat natural. |

---

### 🕺 5. Motion Control, Video Upscale & R2V

| Public Key | Nama Model | Tarif | Max Prompt | Input Wajib | Input Opsional | Deskripsi |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `motion_control_std` | Kling 2.6 Std (30s) | Rp 1.500 | 2.500 | `image_url`, `video_url` | `prompt` | Salin gerakan video ke gambar karakter (Kling 2.6 Standard). *(Alias: `kling_26_std`, `mc_std`)* |
| `motion_control_pro` | Kling 2.6 Pro (30s) | Rp 2.500 | 2.500 | `image_url`, `video_url` | `prompt` | Salin gerakan video ke gambar karakter (Kling 2.6 Pro). *(Alias: `kling_26_pro`, `mc_pro`)* |
| `kling_30_std` | Kling 3.0 MC Std (30s) | Rp 2.500 | 2.500 | `image_url`, `video_url` | `prompt`, `duration` | Motion control arsitektur Kling 3.0 Standard durasi hingga 30 detik. |
| `kling_30_pro` | Kling 3.0 MC Pro (30s) | Rp 3.000 | 2.500 | `image_url`, `video_url` | `prompt`, `duration` | Motion control arsitektur Kling 3.0 Professional resolusi tertinggi. |
| `betamotion_1080p` | BetaMotion 1080p (30s) | Rp 1.500 | 2.500 | `image_url`, `video_url` | `prompt`, `negative_prompt` | Salin gerakan video ke karakter resolusi Full HD 1080p Standard. |
| `betamotion_1080p_pro` | BetaMotion 1080p Pro (30s) | Rp 2.000 | 2.500 | `image_url`, `video_url` | `prompt`, `negative_prompt` | Salin gerakan Full HD 1080p Pro 60 FPS ultra halus & presisi. |
| `betamotion_1080p_max` | BetaMotion 1080p Max (30s) | Rp 2.500 | 2.500 | `image_url`, `video_url` | `prompt`, `negative_prompt` | Salin gerakan video Full HD tier Max untuk gerakan kompleks. |
| `upscale_2k_60fps` | Upscale 2K 60FPS | Rp 1.000 | 2.500 | `video_url` | — | Meningkatkan resolusi video ke 2K 60 FPS (maks. 20 detik). |
| `seedance_20_15s_r2v` | Seedance 2.0 R2V (15s) | Rp 3.000 | 8.000 | `prompt` | `video_url`, `image_urls`, `aspect_ratio` | Reference-to-Video Seedance 2.0: transfer gerak video ke karakter. |
| `seedance_25_15s_r2v` | Seedance 2.5 R2V (15s) | Rp 4.000 | 8.000 | `prompt` | `video_url`, `image_urls`, `aspect_ratio` | Reference-to-Video Seedance 2.5 15s gerak lentur & natural. |
| `seedance_25_30s_r2v` | Seedance 2.5 R2V (30s) | Rp 4.500 | 8.000 | `prompt` | `video_url`, `image_urls`, `aspect_ratio` | Reference-to-Video Seedance 2.5 durasi penuh 30 detik. |
| `seedance_20_mini_r2v`| Seedance 2.0 Mini R2V (15s) | Rp 3.000 | 8.000 | `video_url`, `image_url` | `prompt`, `image_urls` | Reference-to-Video transfer video acuan ke s/d 6 gambar acuan. |
| `kling_30_omni_r2v` | Kling 3.0 Omni R2V (15s) | Rp 3.500 | 2.500 | `video_url`, `image_url` | `prompt`, `image_urls` | Reference-to-Video transfer ekspresi dan pakaian karakter detail. |
| `wan_30_r2v` | Wan 3.0 R2V HD (15s) | Rp 3.000 | 10.000 | `video_url`, `image_url` | `prompt`, `image_urls` | Reference-to-Video gerak natural Wan 3.0 ke foto karakter. |
| `minimax_h3_r2v` | MiniMax H3 R2V HD (15s) | Rp 2.500 | 5.000 | `video_url`, `image_url` | `prompt`, `image_urls` | Reference-to-Video transfer gerakan video acuan ke foto karakter. |

---

### 🎵 6. Audio, TTS & AI Music (Suara, Musik & Lagu)

| Public Key | Nama Model | Tarif | Max Prompt | Input Wajib | Input Opsional | Deskripsi |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `google_tts` | Google TTS (Voice Generator) | Rp 500 | 2.000 | `prompt` | `voice` | Mengubah naskah teks menjadi suara bicara alami manusia. *(Pilihan `voice`: `id-ID-Standard-A`, `id-ID-Wavenet-B`, `en-US-Neural2-F`, dll.)* |
| `suno_v6` | Suno v6 Studio | Rp 500 | 2.000 | `prompt` | `lyrics`, `instrumental` | Generasi AI Musik tercanggih v6 vokal studio lengkap dengan melodi dan aransemen penuh. *(Alias: `suno`, `suno6`)* |
| `suno_v6_wild` | Suno v6 Wild | Rp 500 | 2.000 | `prompt` | `lyrics`, `instrumental` | Varian Suno v6 kreatif, liar, eksperimental, dan variasi aransemen melodi kaya. *(Alias: `suno_wild`)* |
| `suno_v6_mini` | Suno v6 Mini | Rp 500 | 2.000 | `prompt` | `lyrics`, `instrumental` | Varian Suno v6 beat cepat catchy dan tempo dinamis cocok untuk BGM medsos/TikTok. *(Alias: `suno_mini`)* |
| `lyria_35` | Google Lyria 3.5 | Rp 500 | 2.000 | `prompt` | `instrumental` | Harmoni instrumen akustik alami dan melodi realistis. *(Alias: `lyria`)* |
| `minimax_music_3` | MiniMax Music 3 | Rp 500 | 2.000 | `prompt` | `instrumental` | MiniMax v3: beat dinamis bertenaga, EDM modern, synthpop, dan dance club. *(Alias: `minimax_music`)* |
| `mureka_95` | Mureka V9.5 | Rp 500 | 2.000 | `prompt` | `lyrics`, `instrumental` | AI Songwriting presisi vokal pop dan tangga nada radio-ready. *(Alias: `mureka`)* |
| `sonauto_3` | Sonauto V3 | Rp 400 | 2.000 | `prompt` | `lyrics`, `instrumental` | Sonauto V3 untuk aransemen lagu indie, rock, akustik, dan vokal ekspresif. *(Alias: `sonauto`)* |
| `acestep_15` | ACE STEP V1.5 | Rp 400 | 2.000 | `prompt` | `instrumental` | Beat langkah berenergi tinggi, ritme dinamis, dan drop bass tajam. *(Alias: `acestep`)* |

---

## 📡 6. Dokumentasi Request & Parameter (`POST /api/v1/generate`)

### Format Request Body JSON
```json
{
  "model": "string (wajib)",
  "prompt": "string (kondisional)",
  "image_url": "string URL (kondisional - acuan 1 gambar)",
  "reference_image_urls": ["string URL"] (opsional - acuan banyak gambar),
  "video_url": "string URL (kondisional - acuan video gerakan)",
  "audio_url": "string URL (kondisional - file audio lipsync)",
  "swap_image": "string URL (khusus face_swap - gambar wajah sumber)",
  "aspect_ratio": "string (opsional: 9:16 / 16:9 / 1:1 / 3:4 / 4:3)",
  "lyrics": "string (opsional - lirik kustom untuk model musik)",
  "instrumental": "boolean (opsional: false = lagu bervokal, true = instrumen saja)",
  "negative_prompt": "string (opsional)",
  "voice": "string (opsional - khusus google_tts)"
}
```

### Tabel Rincian Parameter

| Parameter | Tipe Data | Status | Penjelasan & Aturan |
| :--- | :--- | :---: | :--- |
| `model` | string | **Wajib** | Public key atau alias model yang sah (contoh: `kling_30_std`, `grok_imagine_2_15s`, `suno_v6`, `krea2_2k`). |
| `prompt` | string | Kondisional | Teks instruksi generasi. Wajib untuk model gambar, video T2V/I2V, musik, dan TTS. Perhatikan batas maksimal karakter per model di Tabel §5. |
| `image_url` | string | Kondisional | URL gambar publik tunggal. Wajib untuk model Image-to-Video, Face Swap, LipSync, dan Motion Control. |
| `reference_image_urls` | array / string | Opsional | Daftar URL gambar referensi untuk model multi-image (alias: `images`, `image_urls`). |
| `video_url` | string | Kondisional | URL video publik (format MP4/WebM). Wajib untuk Motion Control, Video-to-Video, Upscale 2K, dan Watermark Remover. |
| `audio_url` | string | Kondisional | URL audio publik (format MP3/WAV). Wajib untuk model LipSync (`minimax_lipsync`, `ltx_lipsync`). Maksimal durasi 30 detik. |
| `swap_image` | string | Kondisional | URL gambar wajah sumber (khusus model `face_swap`). |
| `aspect_ratio` | string | Opsional | Rasio aspek output video atau gambar (default: `"9:16"`).<br>• Video: `"9:16"` *(Portrait)*, `"16:9"` *(Landscape)*, `"1:1"` *(Square)*.<br>• Gambar: `"9:16"`, `"16:9"`, `"1:1"`, `"3:4"`, `"4:3"`, `"2:3"`, `"3:2"`, `"21:9"`. |
| `lyrics` | string | Opsional | Teks bait lirik lagu kustom khusus model AI Musik (`suno_v6`, `mureka_95`, `sonauto_3`). |
| `instrumental` | boolean | Opsional | Khusus model musik: set `true` untuk lagu instrumen tanpa vokal, `false` untuk lagu lengkap bervokal (default: `false`). |
| `negative_prompt` | string | Opsional | Elemen atau objek yang ingin dihindari dalam hasil render gambar/video. |
| `voice` | string | Opsional | Kode karakter suara khusus model `google_tts` (default: `"id-ID-Standard-A"`). |

---

## 💻 7. Contoh Request (cURL)

### 1. Cek Sisa Saldo Akun
```bash
curl -X GET "https://api.posbot.web.id/api/v1/balance" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx"
```

### 2. Generate Video Sinematik: Grok Imagine 2 (15s) — T2V Murni
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok_imagine_2_15s",
    "prompt": "Cinematic fpv drone shot flying through a futuristic neo-tokyo alley at night, glowing neon signs, photorealistic 720p 60fps",
    "aspect_ratio": "9:16"
  }'
```

### 3. Motion Control: Kling MC 3.0 Std (30s) — Salin Gerakan Video ke Foto
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kling_30_std",
    "image_url": "https://example.com/foto_karakter.jpg",
    "video_url": "https://example.com/video_gerakan_dance.mp4",
    "prompt": "Maintain perfect face identity and natural body motion"
  }'
```

### 4. Motion Control: BetaMotion 1080p Pro (60 FPS, 30s)
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "betamotion_1080p_pro",
    "image_url": "https://example.com/character.png",
    "video_url": "https://example.com/dance_reference.mp4",
    "prompt": "high precision, ultra smooth 60fps"
  }'
```

### 5. Multi-Image Video: Seedance 2.5 (30s) — R2V s/d 9 Foto Acuan
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedance_25_30s",
    "prompt": "Seorang wanita cantik elegan berjalan di tepi pantai senja tropis, gaun sutra tertiup angin lembut, ombak tenang, sinematik ultra realistis",
    "image_urls": [
      "https://example.com/foto_wajah.jpg",
      "https://example.com/foto_outfit_gaun.jpg"
    ],
    "aspect_ratio": "9:16"
  }'
```

### 6. Voice Generator: Google TTS (Text-to-Speech)
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google_tts",
    "prompt": "Halo kawan! Selamat datang di layanan PosBot Developer API. Layanan kecerdasan buatan terbaik untuk aplikasi Anda.",
    "voice": "id-ID-Standard-A"
  }'
```

### 7. AI Music & Lagu: Suno v6 Studio (Lengkap Vokal & Lirik)
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno_v6",
    "prompt": "Indonesian acoustic pop ballad, heartfelt emotional male vocal, piano and acoustic guitar, studio quality",
    "lyrics": "[Verse 1]\nDi sudut kota yang mulai senyap\nBayangmu hadir dalam setiap detik\n[Chorus]\nBiar waktu terus berjalan\nCintaku takkan pernah pudar",
    "instrumental": false
  }'
```

### 8. LipSync: Minimax H3 LipSync (30s)
```bash
curl -X POST "https://api.posbot.web.id/api/v1/generate" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "minimax_lipsync",
    "image_url": "https://example.com/character_face.png",
    "audio_url": "https://example.com/voice_speech.mp3"
  }'
```

### 9. Cek Status Task (Polling)
```bash
curl -X GET "https://api.posbot.web.id/api/v1/status/JOB-20261020-101500-ABC123" \
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response Saat Berhasil Selesai (HTTP 200):**
```json
{
  "success": true,
  "job_code": "JOB-20261020-101500-ABC123",
  "model": "kling_30_std",
  "status": "completed",
  "progress": 100,
  "result_url": "https://cdn.posbot.web.id/outputs/JOB-20261020-101500-ABC123.mp4",
  "created_at": "2026-10-20T10:15:00",
  "finished_at": "2026-10-20T10:16:30"
}
```

---

## ⚡ 8. Rekomendasi Integrasi & Polling

1. **Waktu Render Rata-rata:**  
   * **Model Gambar & TTS:** ~5 – 25 detik.  
   * **Model AI Musik & Lagu:** ~30 – 60 detik.  
   * **Model Video, LipSync & Motion:** ~45 – 180 detik.  
2. **Interval Polling:** Lakukan polling ke endpoint status setiap **5 – 10 detik**. Hindari frekuensi polling di bawah 2 detik per task untuk menjaga efisiensi koneksi Anda.  
3. **Penyimpanan Hasil:** File output pada `result_url` disimpan di CDN berkecepatan tinggi. Disarankan agar sistem Anda segera mengunduh atau mencadangkan file tersebut ke storage backend Anda sendiri.  
4. **Auto-Refund:** Bila terjadi kegagalan pemrosesan (`status: "failed"`), saldo akun Anda **100% otomatis di-refund seketika** oleh sistem ledger.  
5. **Mode Silent untuk Volume Tinggi (`notify_telegram: false`):** Jika backend/aplikasi Anda memproses volume tinggi, sertakan `"notify_telegram": false` pada payload `POST /generate` atau matikan notifikasi chat via tombol toggle di menu `💻 Developer API` bot Telegram. Hal ini menghindari flood rate-limit Telegram (HTTP 429) ke akun Anda, sementara hasil tetap dapat diambil langsung via endpoint status.

mixin () {
  /// Static Markdown documentation of the public backend API.
  public query func getApiDoc() : async Text {
    "# Absensi Kehadiran API

Backend canister untuk aplikasi absensi kehadiran karyawan. Mencatat jam masuk
(clock-in) dan jam keluar (clock-out) dengan validasi GPS dan selfie kamera
wajib. Antarmuka berbahasa Indonesia.

## Tujuan

- Karyawan melakukan absensi masuk dan keluar dengan lokasi GPS dan foto selfie.
- Karyawan melihat riwayat absensi pribadi (tanggal, jam masuk, jam keluar,
  lokasi, foto selfie).
- Admin mengelola lokasi kerja dan melihat rekap kehadiran seluruh karyawan.

## Autentikasi

Semua endpoint absensi dan administrasi memerlukan pemanggil yang sudah
terdaftar (signed-in, non-anonymous) melalui Internet Identity. Pemanggil
anonim tidak terdaftar dan akan menerima error `#notRegistered` (bukan trap)
pada endpoint absensi, atau `#notAdmin` pada endpoint administrasi.

Frontend aplikasi ini memakai derivation origin Internet Identity yang
dipublikasikan di `/.well-known/ii-derivation-origin` (bila tersedia). Agen
yang sudah memegang otorisasi Internet Identity pengguna menurunkan principal
per-aplikasi terhadap origin tersebut (misalnya
`icp identity link web <name> --app <host>`). Delegasi semacam itu bertindak
dengan otoritas penuh pengguna di aplikasi ini sampai kedaluwarsa.

### Prasyarat pendaftaran

Pendaftaran terjadi hanya saat pemanggil masuk melalui frontend aplikasi ini.
Pemanggil yang belum pernah melakukannya tetap tidak terdaftar meskipun
principal-nya milik pemilik aplikasi, dan pemanggil yang diturunkan terhadap
origin berbeda adalah principal yang berbeda dari yang didaftarkan frontend.
Pemanggil yang tidak terdaftar menerima `#notRegistered` pada `clockIn` /
`clockOut`, dan `#notAdmin` pada endpoint admin.

## Otorisasi

- **Karyawan (terdaftar)**: `getTodayStatus`, `clockIn`, `clockOut`,
  `getMyAttendance`, `listWorkLocations`.
- **Admin**: `addWorkLocation`, `updateWorkLocation`, `deleteWorkLocation`,
  `getAttendanceRecap`. Pemanggil non-admin menerima `#notAdmin`.
- **Anonim / tidak terdaftar**: tidak dapat melakukan absensi maupun
  administrasi.

## Endpoint

### Karyawan

- `getTodayStatus() : TodayStatus` (query) — status absensi hari ini untuk
  pemanggil: `#notClockedIn`, `#clockedIn({ clockIn })`, atau
  `#clockedOut({ clockIn; clockOut })`.
- `clockIn(position : GpsPosition, selfie : ExternalBlob) : Result<AttendanceView, AttendanceError>`
  (update) — mencatat absensi masuk. `position` wajib berada di dalam radius
  salah satu lokasi kerja yang dikonfigurasi. `selfie` wajib berupa referensi
  object storage.
- `clockOut(position : GpsPosition, selfie : ExternalBlob) : Result<AttendanceView, AttendanceError>`
  (update) — mencatat absensi keluar untuk record hari ini.
- `getMyAttendance() : [AttendanceView]` (query) — riwayat absensi pemanggil,
  terbaru lebih dulu.
- `listWorkLocations() : [WorkLocation]` (query) — daftar lokasi kerja yang
  dikonfigurasi.

### Admin

- `addWorkLocation(name, latitude, longitude, radiusMeters) : Result<WorkLocation, LocationError>`
  (update) — menambah lokasi kerja. `name` tidak boleh kosong dan
  `radiusMeters` harus > 0.
- `updateWorkLocation(id, name, latitude, longitude, radiusMeters) : Result<WorkLocation, LocationError>`
  (update) — memperbarui lokasi kerja; `#notFound(id)` bila id tidak ada.
- `deleteWorkLocation(id) : Result<(), LocationError>` (update) — menghapus
  lokasi kerja.
- `getAttendanceRecap(day : ?DayKey, user : ?UserId) : Result<[AttendanceView], LocationError>`
  (query) — rekap kehadiran seluruh karyawan, dapat difilter berdasarkan
  tanggal (`YYYY-MM-DD`) dan/atau principal karyawan. `null` berarti tanpa
  filter.

## Satuan dan Encoding

- **Timestamp** (`clockIn`, `clockOut`): nanodetik Unix (`Int`), seperti
  `Time.now()`.
- **`day`**: teks `YYYY-MM-DD` (UTC), dipakai untuk menegakkan satu record per
  hari per karyawan.
- **`latitude` / `longitude`**: derajat desimal (`Float`).
- **`accuracyMeters`**: akurasi GPS dalam meter (`Float`).
- **`radiusMeters`**: radius lokasi kerja dalam meter (`Nat`).
- **`user`**: `Principal` Internet Identity.
- **`clockInSelfie` / `clockOutSelfie`**: `ExternalBlob` — referensi object
  storage, bukan byte gambar mentah. Frontend mengambil gambar melalui
  object-storage client.
- **`clockOut` / `clockOutPosition` / `clockOutSelfie`**: opsional (`null`
  sebelum clock-out).
- **`locationId`**: id lokasi kerja tempat absensi masuk divalidasi.

## Siklus Hidup dan Polling

- Satu record per karyawan per hari. `clockIn` gagal dengan `#alreadyClockedIn`
  bila sudah masuk, dan `#alreadyClockedOut` bila sudah menyelesaikan hari itu.
- `clockOut` gagal dengan `#notClockedIn` bila belum masuk, dan
  `#alreadyClockedOut` bila sudah keluar.
- `getTodayStatus` adalah query murah dan aman untuk polling; status berubah
  dari `#notClockedIn` → `#clockedIn` → `#clockedOut`.

## Keamanan Mutasi dan Idempotensi

- `clockIn` dan `clockOut` **tidak idempoten**: memanggil ulang setelah sukses
  mengembalikan error (`#alreadyClockedIn` / `#alreadyClockedOut`), bukan
  membuat record duplikat. Aman untuk retry setelah kegagalan jaringan karena
  record yang sudah ada mencegah duplikasi.
- Validasi radius GPS dilakukan ulang di server terhadap lokasi kerja yang
  dikonfigurasi; koordinat dari klien tidak dipercaya.
- `addWorkLocation` / `updateWorkLocation` / `deleteWorkLocation` bersifat
  destruktif pada `deleteWorkLocation`; panggilan ulang dengan id yang sama
  mengembalikan `#notFound(id)`.

## Error

`AttendanceError`:
- `#notRegistered` — pemanggil belum terdaftar.
- `#noLocationConfigured` — belum ada lokasi kerja yang dikonfigurasi.
- `#outsideRadius({ distanceMeters; radiusMeters })` — posisi di luar radius
  lokasi terdekat.
- `#alreadyClockedIn` — sudah absen masuk hari ini.
- `#notClockedIn` — belum absen masuk.
- `#alreadyClockedOut` — sudah absen keluar hari ini.
- `#invalidCoordinates` — latitude/longitude di luar rentang valid.

`LocationError`:
- `#notAdmin` — pemanggil bukan admin terdaftar.
- `#notFound(id)` — lokasi kerja tidak ditemukan.
- `#invalidLocation` — nama kosong atau radius 0.

## Catatan Integrasi

- Selfie adalah referensi object storage; unggah blob terlebih dahulu, lalu
  kirim referensinya ke `clockIn` / `clockOut`.
- GPS dan selfie wajib: `clockIn` / `clockOut` menolak posisi di luar radius
  dan tidak menerima selfie kosong dari sisi kontrak tipe.
- `getAttendanceRecap` hanya untuk admin; karyawan memakai `getMyAttendance`.
- Semua waktu dihitung dalam UTC; `day` mengikuti UTC, bukan zona waktu lokal.
";
  };
};

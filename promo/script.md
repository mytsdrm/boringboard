# BoringBoard promo video (Bahasa Indonesia)

Output: `boringboard-promo-id.mp4` (1920x1080, 30 fps, about 3:21, burned-in subtitles) and `boringboard-promo-id_nosub.mp4`. Videos, audio, recordings and the API key are gitignored; rebuild them with the steps below.

Recorded on a local `./deploy` (http://localhost:8000) logged in as the seeded demo user (`demo` / `demo123456`) and, for the admin scenes, as the admin from `.env` (`BORINGBOARD_DEFAULTADMIN*`). UI in English, default Nova theme.
Voice: ElevenLabs "Putri Maharani - Neutral and Witty" (voice id `I7sakys8pBZ1Z5f0UhT9`), model `eleven_multilingual_v2`, speed 1.05 (stability 0.45, style 0.35). English and IT terms are sent as written so the voice says them in English; never respell them. Only the acronym "AI" is sent as "Ei Ai" (`tools/pron.py`); the subtitles keep the written text. The music bed is a bouncy 132 BPM track in major chords synthesized by `tools/music.py` (no third-party audio).

| # | Screen | Voice-over |
|---|---|---|
| 1 | Title card, demo login | Halo! Kenalkan BoringBoard! Tempat untuk semua task yang selalu bilang, nanti aja deh. Project management yang simpel, rapi, dan pastinya lebih seru! |
| 2 | Dashboard | Begitu login, dashboard langsung merangkum semuanya! Jumlah task board, total task, member yang diundang, board yang baru di-update, sampai recent activity. |
| 3 | Kanban board, drag a card | Buka board-nya, dan semua task langsung tersusun di kolom Kanban, dari Backlog sampai Done. Tinggal drag and drop, dan total estimasi per kolom langsung terhitung otomatis! |
| 4 | Card detail | Setiap task punya detail lengkap! Status, priority, label, assignee, reviewer, dan due date. Plus catatan, checklist, dan komentar dari tim. |
| 5 | Table view, "Urgent and high" view | Suka spreadsheet? Gampang! Pindah ke table view, lengkap dengan sort, filter, dan kalkulasi otomatis. Simpan juga view khusus, misalnya cuma task yang urgent dan high. |
| 6 | Calendar view | Calendar view menampilkan task berdasarkan due date. Dijamin, nggak ada deadline yang terlewat! |
| 7 | Gallery view | Gallery view menampilkan task sebagai kartu visual, lengkap dengan preview isinya. Keren, kan? |
| 8 | Task Board Info, Task Board Settings | Buat tim developer, setiap board bisa menyimpan repository, dev branch, prod branch, dan URL environment. Semua info penting langsung tampil di header board! |
| 9 | Share Board | Ajak tim Anda lewat Share, atur role setiap member, atau cukup copy link-nya. Simpel banget! |
| 10 | Create a board (templates) | Mulai project baru dalam hitungan detik, pakai template siap pakai! Sprint planner, roadmap, project tasks, dan masih banyak lagi. |
| 11 | Find task boards, Appearance drawer: themes and accent colors | Cari board dengan cepat. Lalu buka panel Appearance, dan pilih tema favorit Anda! Nova, Sand, Midnight, atau Classic, lengkap dengan accent color sesuai selera. |
| 12 | Appearance: macOS, Windows and Ubuntu layouts | Mau suasana baru? Ganti layout dengan gaya macOS, Windows, atau Ubuntu, lengkap dengan dock dan taskbar. Semua tersimpan otomatis di profil Anda! |
| 13 | Admin login, Users | Sekarang, kita login sebagai admin! Di menu Users, admin bisa menambah, mengedit, dan mengatur group semua user. |
| 14 | System Settings (General, Modules, Notification) | Di System Settings, atur nama aplikasi, logo, timezone, sampai AI provider. Aktifkan module yang dibutuhkan, dan pilih notifikasi yang dikirim ke tim. |
| 15 | Activity logs | Activity logs mencatat setiap perubahan dari semua user, lengkap dengan filter dan rentang tanggal. |
| 16 | Reminders, Announcements | Kirim reminder terjadwal, dan buat announcement untuk seluruh tim, langsung dari panel admin! |
| 17 | Plugin manager, Templates | Perluas BoringBoard dengan plugin, dan kelola template board untuk seluruh workspace. |
| 18 | Outro card with project.creativework.asia and the demo login | Yuk, bikin kerjaan Anda jadi sedikit kurang membosankan, bareng BoringBoard! Coba demonya sekarang, di project dot creativework dot asia! |

## Rebuilding

Needs Node with Playwright, Google Chrome, ffmpeg and Python 3.

```bash
./deploy                                   # BoringBoard on http://localhost:8000 with the demo user
cd promo/tools
export PLAYWRIGHT_PATH=/path/to/node_modules/playwright   # only if `require('playwright')` does not resolve here
node scenes.js s01a s01b                   # intro + login; saves the demo session to state_demo.json
node scenes.js a01                         # admin login; saves the admin session to state_admin.json
node scenes.js                             # all parts (or name some: node scenes.js s03 s04)
bash review.sh s03                         # optional: 4-frame strip per part in rec/
python3 el_vo.py                           # voice-over into vo/ (key in promo/.elevenlabs_key)
python3 assemble.py ../boringboard-promo-id.mp4
```

`BB_URL` points the recorder at another BoringBoard, `DEMO_USER` / `DEMO_PASSWORD` change the login, `PROMO_URL` changes the demo link on the outro card (default project.creativework.asia; the spoken form in vo.json is respelled with "dot" and turned back into the URL in the subtitles).

Recording leaves the demo board as it was: the card dragged in scene 3 is dragged back afterwards, dialogs are closed without saving, and the demo user's Appearance (theme, accent, layout) is reset to the defaults after the Appearance scenes. Admin pages are only viewed, never saved.

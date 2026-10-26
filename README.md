# Hexatron — World Builder

A complete, private, offline-first worldbuilding encyclopedia for personal fictional universes, characters, nations, ethnolinguistics, evolution, and interactive statistics.

---

## 🚀 How to Launch on Windows (Beginner Guide)

You **do not** need to type commands or learn programming to use Hexatron.

### Opening the App
1. Open this folder in Windows File Explorer (`d:\Hexatron`).
2. Double-click the file named **`Launch-Hexatron.bat`**.
3. A black launcher window will open, check prerequisites, and automatically open Hexatron in your default web browser at **`http://localhost:5173`**.
4. Keep the black launcher window open while working in the app.

### Stopping the App
- When you are finished, simply close the black launcher window or press **Ctrl + C**.
- Your data is automatically saved locally.

---

## 📱 How to Use on Android

Hexatron is built as a **Progressive Web App (PWA)**:

### Option A: Local WiFi Access from your Phone
1. Ensure your PC and Android phone are on the **same WiFi network**.
2. Find your PC's local IP address (e.g. `192.168.0.x`). The launcher or Vite output displays this network address (e.g. `http://192.168.0.107:5173`).
3. Open **Google Chrome** on your Android phone and navigate to that address.
4. Tap the **three dots menu (⋮)** in Chrome and select **"Add to Home screen"** or **"Install app"**.
5. Hexatron will install as a standalone mobile app on your phone's home screen with an offline app icon.

---

## 💾 Where is My Data Stored?

### Local Database (IndexedDB)
- **Where it lives:** All universes, worlds, entities, custom types, demographic datasets, and wiki articles are stored directly inside your browser's local **IndexedDB** database (`hexatron` database).
- **Persistence:** Hexatron automatically requests persistent browser storage (`navigator.storage.persist()`), ensuring your data will not be evicted during disk cleanup.
- **Survives restarts:** Your data remains intact when you close the browser, turn off your computer, or restart.

### Windows vs. Android Data
- Browsers isolate IndexedDB storage to the specific device.
- The data created on Windows is stored on your Windows device.
- If you access via phone or another browser, that device has its own local storage unless synchronized.

### 📥 Backup & Restoration (Safe & Simple)
1. In the top navigation bar, click the **Download icon** (`Export backup`).
2. This downloads a single timestamped `.json` file containing all your universes, worlds, entity categories, custom fields, relationships, and statistical datasets.
3. Keep this file in your Google Drive, OneDrive, or a USB stick as a backup.
4. To restore or transfer to another computer/phone, click the **Upload icon** (`Import backup`) in the top navigation bar and select your backup file.

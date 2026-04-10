# DobzEye - Dobsonian Alt-Az Tracker (Ionic App)

A mobile application built with Ionic that transforms your smartphone into a real-time Alt-Azimuth tracker for Dobsonian telescopes.

The app attaches to the telescope tube and uses onboard mobile sensors (accelerometer, gyroscope, magnetometer) to compute and visualize the telescope’s orientation in terms of altitude and azimuth.

https://dobzeye.rajendrakhope.com

---

## 🚀 Features

* Real-time Alt-Az tracking based on device orientation
* Sensor fusion for improved accuracy
* Visual representation of telescope movement
* Lightweight and offline-capable
* Designed specifically for Dobsonian mount systems

---

## 📱 How It Works

1. Mount your smartphone securely on the telescope tube.
2. Launch the app and calibrate sensors.
3. As the telescope moves:

   * **Altitude (Alt)** is derived from tilt (pitch)
   * **Azimuth (Az)** is derived from compass heading (yaw)
4. The app continuously updates and displays the orientation.

---

## 🧠 Tech Stack

* Ionic Framework
* Angular
* Capacitor (for native sensor access)
* TypeScript

---

## ⚙️ Development Setup

### Prerequisites

* Node.js (>= 18 recommended)
* Ionic CLI
* Angular CLI

```bash
npm install -g @ionic/cli
```

---

### Clone Repository

```bash
git clone <your-repo-url>
cd <repo-folder>
```

---

### Install Dependencies

```bash
npm install
```

---

### Run in Browser (Dev)

```bash
ionic serve
```

> Note: Sensor data will not work properly in browser. Use a real device.

---

### Run on Device

```bash
ionic capacitor add android
ionic capacitor add ios
```

Build and sync:

```bash
ionic build
npx cap sync
```

Open in native IDE:

```bash
npx cap open android
npx cap open ios
```

---

## 🔧 Build for Production

```bash
ionic build --prod
npx cap sync
```

Then build APK/IPA using Android Studio or Xcode.

---

## 📡 Sensor Handling (Concept)

* **Accelerometer** → detects tilt (Altitude)
* **Magnetometer** → detects heading (Azimuth)
* **Gyroscope** → smooths motion tracking

You may use plugins like:

```bash
npm install @capacitor/motion
```

---

## 📏 Calibration Tips

* Perform figure-8 motion before use (for compass calibration)
* Ensure phone alignment with telescope axis
* Avoid magnetic interference (metal mounts, electronics)

---

## 🛠 Future Improvements

* Star alignment (2-star / 3-star calibration)
* Object database (Messier, NGC)
* Night mode UI
* Bluetooth integration with encoders
* Logging and session tracking

---

## 🤝 Contributing

Contributions are welcome. Feel free to open issues or submit pull requests.

---

## 📜 License

MIT License

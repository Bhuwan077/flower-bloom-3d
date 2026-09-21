# ✿ Flower Bloom 3D — Real-Time Hand Gesture Flower Controller

> A breathtaking, interactive 3D procedural botanical art engine powered by **Three.js (WebGL)** and **MediaPipe Hands (Computer Vision)**. Control blooming, stem growth, wind deflection, and 3D angle with real-time hand gestures right through your webcam.

🌸 **Live Demo**: [https://bhuwan077.github.io/flower-bloom-3d/](https://bhuwan077.github.io/flower-bloom-3d/)

---

## ✨ Features

- 🌹 **6 Procedural 3D Flower Species**:
  - **3D Blooming Rose**: 4 concentric Fibonacci spiraling tiers (23 curved petals) with deep ruby/crimson gradients that uncurl outward.
  - **🪷 3D Sacred Lotus**: 3 tiers of 24 pointed lanceolate petals radiating into a wide mandala with golden seed receptacle and glowing stamens.
  - **🌷 3D Royal Tulip**: 6 large overlapping cup petals forming an elegant regal goblet with sunset ombre tones.
  - **🌸 3D Sakura (Cherry Blossom)**: 5 delicate heart-shaped notched petals with cleft tips and 15 slender golden-tipped stamens.
  - **🌌 3D Cosmic Bioluminescent Orchid**: Alien fantasy botanical morphology with dorsal sepal, undulating lateral petals, and glowing neon cyan/violet veins.
  - **🌻 3D Sunflower**: 20 radiant golden ray petals surrounding a dense chocolate-brown floret seed disc.
- 🤏 **Distance-Invariant Hand Gestures**:
  - **Left Hand Pinch**: Controls **Bloom** (bud to open blossom).
  - **Right Hand Pinch**: Controls **Stem Growth** (seedling to giant flower).
  - **Hand Sway**: Generates dynamic **3D Wind Shear** that organically flexes the stem tube and scatters glowing pollen.
  - **Palm Tilt & Yaw**: The 3D flower tilts and rotates in space to follow your hand angle.
- 💡 **Dynamic 3D Lighting**: Inner floral point light situated inside the flower receptacle that intensifies and glows from within as the petals bloom.
- 🌠 **3D Swirling Pollen Particles**: 180+ glowing particle motes drifting upwards and reacting to wind velocity.
- 🌌 **Dual Background Modes**: Toggle between your mirrored webcam feed (augmented reality) and an enchanted starry cosmic garden.
- 🔔 **Generative Audio Chimes**: Web Audio API synthesizer playing crystalline pentatonic chords that harmonize with your gestures.
- 🎛️ **Interactive Manual Mode**: Interactive sliders and 3D mouse orbit controls so you can enjoy the full 3D experience even without a camera.
- 📸 **Snapshot Capture**: Save high-res PNG photos of your 3D blooming flowers.

---

## 🖐️ Gesture Controls Guide

| Gesture | Action | Description |
| :--- | :--- | :--- |
| **Left Hand Pinch 🤏** | **Bloom** | Pinch thumb & index together to close into a tight bud; spread them apart to bloom wide open. |
| **Right Hand Pinch 🤏** | **Growth** | Pinch thumb & index together to shrink stem; spread them apart to grow tall. |
| **Sway Hands ↔** | **3D Wind** | Move hands quickly left and right to kick up wind that bends the stem and scatters pollen. |
| **Tilt Palm ✋** | **3D Orientation** | Tilt and rotate your palm in 3D space to inspect the flower from different angles. |

---

## 🚀 Getting Started Locally

Because browser security blocks webcam access on `file://` URLs, serve the repository over localhost or HTTPS:

### Option 1: Python
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

### Option 2: Node / npx
```bash
npx serve .
```

---

## 🛠️ Built With

- **[Three.js (r128)](https://threejs.org/)** — 3D scene rendering, parametric curved petal geometries, dynamic lighting, and particle systems.
- **[@mediapipe/hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)** — Real-time 21-point 3D hand tracking and landmark estimation.
- **[@mediapipe/camera_utils](https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils)** — Webcam frame streaming and synchronization.
- **HTML5 Canvas 2D & Web Audio API** — Futuristic HUD calipers and generative crystalline sound synthesis.

---

Made with ❤️ by [Bhuwan Adhikari](https://github.com/Bhuwan077)

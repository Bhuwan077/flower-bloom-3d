/* ==========================================================================
   FLOWER BLOOM 3D — Real-Time Hand Gesture Botanical Controller
   Three.js WebGL 3D Procedural Engine + MediaPipe Hands Computer Vision
   ========================================================================== */

// =============================================================================
// 1. PROCEDURAL AUDIO SYNTHESIZER (Generative Crystalline Chimes & Ambient Wind)
// =============================================================================
class ProceduralAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.masterGain = null;
        this.windGain = null;
        this.windFilter = null;
        this.lastChimeTime = 0;
        
        // Pentatonic crystalline scale frequencies (Hz)
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.25;
            this.masterGain.connect(this.ctx.destination);

            // Ambient gentle pink-ish wind noise
            this.initWindDrone();
        } catch (e) {
            console.warn('Web Audio not supported or blocked:', e);
        }
    }

    toggle() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.enabled ? 0.28 : 0.0, this.ctx.currentTime, 0.1);
        }
        return this.enabled;
    }

    initWindDrone() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99 * b0 + white * 0.05;
            b1 = 0.96 * b1 + white * 0.08;
            b2 = 0.88 * b2 + white * 0.12;
            output[i] = (b0 + b1 + b2) * 0.3;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = 240;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.02;

        whiteNoise.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);
        whiteNoise.start();
    }

    updateWind(windSpeed) {
        if (!this.enabled || !this.windFilter || !this.windGain) return;
        const absWind = Math.min(1.5, Math.abs(windSpeed));
        const freq = 200 + absWind * 800;
        const vol = 0.02 + absWind * 0.08;
        const now = this.ctx.currentTime;
        this.windFilter.frequency.setTargetAtTime(freq, now, 0.1);
        this.windGain.gain.setTargetAtTime(vol, now, 0.1);
    }

    playChime(pitchIndex = 4, intensity = 0.5) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastChimeTime < 0.1) return; // limit density
        this.lastChimeTime = now;

        const freq = this.scale[pitchIndex % this.scale.length];
        
        // Dual FM / Harmonic bell synth
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 2.01, now); // subtle harmonic sparkle

        chimeGain.gain.setValueAtTime(0.001, now);
        chimeGain.gain.linearRampToValueAtTime(0.25 * intensity, now + 0.02);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc1.connect(chimeGain);
        osc2.connect(chimeGain);
        chimeGain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
    }
}

// =============================================================================
// 2. LAYERED ORGANIC NOISE ENGINE (Non-repetitive sinusoidal oscillations)
// =============================================================================
class OrganicNoise {
    constructor() {
        this.seeds = Array.from({ length: 12 }, () => Math.random() * 1000);
    }

    get(t, channel = 0) {
        const s = this.seeds[channel % this.seeds.length];
        return (
            Math.sin(t * 0.72 + s) * 0.42 +
            Math.sin(t * 1.35 + s * 1.6) * 0.28 +
            Math.sin(t * 2.21 + s * 0.35) * 0.18 +
            Math.sin(t * 3.84 + s * 2.1) * 0.12
        );
    }
}

// =============================================================================
// 3. THREE.JS 3D PROCEDURAL PETAL GEOMETRY GENERATOR
// =============================================================================
class PetalGeometryFactory {
    /**
     * Builds an organic 3D curved petal geometry using parametric Bézier & trigonometric profiles
     * @param {Object} options Configuration parameters for the petal type
     */
    static createCurvedPetalGeometry(options = {}) {
        const {
            width = 0.5,
            length = 1.0,
            curl = 0.4,
            cup = 0.3,
            tipShape = 1.0,      // 1.0 standard, >1 blunt/round, <1 pointed
            notch = 0.0,         // cherry blossom petal cleft
            segmentsU = 20,      // along length
            segmentsV = 16       // across width
        } = options;

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= segmentsU; i++) {
            const u = i / segmentsU; // 0 (base) to 1 (tip)
            
            // Width profile curve
            let w = Math.sin(Math.pow(u, tipShape) * Math.PI) * width;
            if (notch > 0 && u > 0.85) {
                // Heart-shaped notch indent at tip
                const notchU = (u - 0.85) / 0.15;
                w *= 1.0 - notch * Math.sin(notchU * Math.PI);
            }

            // Cup & curl profile in 3D
            const curlY = u * length;
            const curlZ = Math.pow(u, 2) * curl;

            for (let j = 0; j <= segmentsV; j++) {
                const v = (j / segmentsV) * 2 - 1; // -1 (left) to 1 (right)
                const x = v * (w * 0.5);
                
                // Transverse curvature (cup depth)
                const cupZ = (1.0 - v * v) * Math.sin(u * Math.PI) * cup;
                const z = curlZ + cupZ;
                const y = curlY;

                positions.push(x, y, z);
                uvs.push((v + 1) * 0.5, u);
            }
        }

        // Generate grid indices
        const stride = segmentsV + 1;
        for (let i = 0; i < segmentsU; i++) {
            for (let j = 0; j < segmentsV; j++) {
                const a = i * stride + j;
                const b = (i + 1) * stride + j;
                const c = (i + 1) * stride + (j + 1);
                const d = i * stride + (j + 1);

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();

        return geometry;
    }

    /**
     * Builds an organic 3D leaf geometry with midrib vein curve
     */
    static createCurvedLeafGeometry(length = 1.0, width = 0.35) {
        return PetalGeometryFactory.createCurvedPetalGeometry({
            width: width,
            length: length,
            curl: 0.25,
            cup: 0.18,
            tipShape: 0.7,
            segmentsU: 16,
            segmentsV: 12
        });
    }
}

// =============================================================================
// 4. 3D FLOWER SPECIES BUILDERS (Rose, Lotus, Tulip, Sakura, Cosmic Orchid, Sunflower)
// =============================================================================
class FlowerSpeciesRegistry {
    /**
     * Creates materials for the flower with glowing translucency and rich shading
     */
    static createPetalMaterial(baseColor, rimColor, emissiveColor = 0x000000, emissiveIntensity = 0.2) {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(baseColor),
            emissive: new THREE.Color(emissiveColor),
            emissiveIntensity: emissiveIntensity,
            roughness: 0.38,
            metalness: 0.08,
            side: THREE.DoubleSide,
            shadowSide: THREE.DoubleSide
        });
    }

    /**
     * 1. 3D BLOOMING ROSE
     * Concentric Fibonacci spiraling petals (4 tiers) that gracefully uncurl outward
     */
    static buildRose() {
        const root = new THREE.Group();
        root.name = 'flower-head';
        const petalNodes = [];

        // Layers configuration: [count, radius, length, width, curl, cup, basePitch, bloomPitch]
        const layers = [
            { count: 4, r: 0.06, l: 0.45, w: 0.30, curl: -0.10, cup: 0.28, baseP: 0.10, bloomP: 0.35, col: 0x990028 },
            { count: 5, r: 0.12, l: 0.60, w: 0.45, curl: 0.12,  cup: 0.35, baseP: 0.18, bloomP: 0.75, col: 0xc4003c },
            { count: 6, r: 0.20, l: 0.75, w: 0.58, curl: 0.28,  cup: 0.40, baseP: 0.25, bloomP: 1.15, col: 0xeb004e },
            { count: 8, r: 0.30, l: 0.90, w: 0.72, curl: 0.48,  cup: 0.45, baseP: 0.32, bloomP: 1.55, col: 0xff1a66 }
        ];

        layers.forEach((tier, tierIdx) => {
            const geom = PetalGeometryFactory.createCurvedPetalGeometry({
                width: tier.w,
                length: tier.l,
                curl: tier.curl,
                cup: tier.cup,
                tipShape: 1.15
            });

            const mat = FlowerSpeciesRegistry.createPetalMaterial(tier.col, 0xff88aa, tier.col, 0.15 + tierIdx * 0.05);

            for (let i = 0; i < tier.count; i++) {
                const petalPivot = new THREE.Group();
                const angle = (i / tier.count) * Math.PI * 2 + (tierIdx * 0.42); // spiraling spiral offset
                
                petalPivot.position.set(Math.cos(angle) * tier.r, 0, Math.sin(angle) * tier.r);
                petalPivot.rotation.y = -angle - Math.PI / 2;

                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                petalPivot.add(mesh);
                root.add(petalPivot);

                petalNodes.push({
                    pivot: petalPivot,
                    basePitch: tier.baseP,
                    bloomPitch: tier.bloomP,
                    tierIndex: tierIdx,
                    angle: angle
                });
            }
        });

        // Golden center core receptacle
        const coreGeom = new THREE.SphereGeometry(0.12, 16, 16);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.5, emissive: 0xff6600, emissiveIntensity: 0.3 });
        const coreMesh = new THREE.Mesh(coreGeom, coreMat);
        coreMesh.position.y = 0.08;
        root.add(coreMesh);

        return { root, petalNodes, baseScale: 1.1 };
    }

    /**
     * 2. 3D SACRED LOTUS
     * Radiant tiered pointed petals opening outward into a wide mandala with golden seed pod
     */
    static buildLotus() {
        const root = new THREE.Group();
        root.name = 'flower-head';
        const petalNodes = [];

        const layers = [
            { count: 6, r: 0.10, l: 0.65, w: 0.30, curl: 0.10, cup: 0.25, baseP: 0.15, bloomP: 0.65, col: 0xff88bb },
            { count: 8, r: 0.18, l: 0.90, w: 0.38, curl: 0.20, cup: 0.30, baseP: 0.22, bloomP: 1.10, col: 0xff99cc },
            { count: 10, r: 0.28, l: 1.15, w: 0.45, curl: 0.35, cup: 0.35, baseP: 0.30, bloomP: 1.50, col: 0xffb7dc }
        ];

        layers.forEach((tier, tierIdx) => {
            const geom = PetalGeometryFactory.createCurvedPetalGeometry({
                width: tier.w,
                length: tier.l,
                curl: tier.curl,
                cup: tier.cup,
                tipShape: 0.65 // pointed tip
            });

            const mat = FlowerSpeciesRegistry.createPetalMaterial(tier.col, 0xffffff, 0xff5599, 0.2);

            for (let i = 0; i < tier.count; i++) {
                const petalPivot = new THREE.Group();
                const angle = (i / tier.count) * Math.PI * 2 + (tierIdx * 0.3);
                
                petalPivot.position.set(Math.cos(angle) * tier.r, 0, Math.sin(angle) * tier.r);
                petalPivot.rotation.y = -angle - Math.PI / 2;

                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                petalPivot.add(mesh);
                root.add(petalPivot);

                petalNodes.push({
                    pivot: petalPivot,
                    basePitch: tier.baseP,
                    bloomPitch: tier.bloomP,
                    tierIndex: tierIdx,
                    angle: angle
                });
            }
        });

        // Golden Seed Receptacle Pod (Cylinder)
        const podGeom = new THREE.CylinderGeometry(0.22, 0.15, 0.18, 24);
        const podMat = new THREE.MeshStandardMaterial({ color: 0xffd000, roughness: 0.4, emissive: 0xff9900, emissiveIntensity: 0.35 });
        const podMesh = new THREE.Mesh(podGeom, podMat);
        podMesh.position.y = 0.12;
        root.add(podMesh);

        // Ring of golden stamens around pod
        const stamenCount = 18;
        const stamenGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8);
        const stamenMat = new THREE.MeshStandardMaterial({ color: 0xffeb66, emissive: 0xffaa00, emissiveIntensity: 0.5 });
        for (let i = 0; i < stamenCount; i++) {
            const sa = (i / stamenCount) * Math.PI * 2;
            const sm = new THREE.Mesh(stamenGeom, stamenMat);
            sm.position.set(Math.cos(sa) * 0.24, 0.14, Math.sin(sa) * 0.24);
            sm.rotation.x = 0.2;
            sm.rotation.y = -sa;
            root.add(sm);
        }

        return { root, petalNodes, baseScale: 1.05 };
    }

    /**
     * 3. 3D ROYAL TULIP
     * 6 overlapping regal cup petals (3 inner, 3 outer) that bloom into an elegant goblet
     */
    static buildTulip() {
        const root = new THREE.Group();
        root.name = 'flower-head';
        const petalNodes = [];

        const layers = [
            { count: 3, r: 0.08, l: 1.10, w: 0.65, curl: 0.15, cup: 0.50, baseP: 0.08, bloomP: 0.70, col: 0xff2a55 },
            { count: 3, r: 0.14, l: 1.18, w: 0.72, curl: 0.22, cup: 0.55, baseP: 0.12, bloomP: 0.95, col: 0xff4d33 }
        ];

        layers.forEach((tier, tierIdx) => {
            const geom = PetalGeometryFactory.createCurvedPetalGeometry({
                width: tier.w,
                length: tier.l,
                curl: tier.curl,
                cup: tier.cup,
                tipShape: 1.2
            });

            const mat = FlowerSpeciesRegistry.createPetalMaterial(tier.col, 0xffcc33, 0xff3300, 0.25);

            for (let i = 0; i < tier.count; i++) {
                const petalPivot = new THREE.Group();
                const angle = (i / tier.count) * Math.PI * 2 + (tierIdx * (Math.PI / 3));
                
                petalPivot.position.set(Math.cos(angle) * tier.r, 0, Math.sin(angle) * tier.r);
                petalPivot.rotation.y = -angle - Math.PI / 2;

                const mesh = new THREE.Mesh(geom, mat);
                mesh.castShadow = true;
                petalPivot.add(mesh);
                root.add(petalPivot);

                petalNodes.push({
                    pivot: petalPivot,
                    basePitch: tier.baseP,
                    bloomPitch: tier.bloomP,
                    tierIndex: tierIdx,
                    angle: angle
                });
            }
        });

        // Pistil + dark anther stamens
        const pistilGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.35, 12);
        const pistilMat = new THREE.MeshStandardMaterial({ color: 0x90db4e });
        const pistil = new THREE.Mesh(pistilGeom, pistilMat);
        pistil.position.y = 0.18;
        root.add(pistil);

        const antherCount = 6;
        const antherGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.30, 8);
        const antherMat = new THREE.MeshStandardMaterial({ color: 0x2b1020, roughness: 0.9 });
        for (let i = 0; i < antherCount; i++) {
            const aa = (i / antherCount) * Math.PI * 2;
            const am = new THREE.Mesh(antherGeom, antherMat);
            am.position.set(Math.cos(aa) * 0.10, 0.16, Math.sin(aa) * 0.10);
            root.add(am);
        }

        return { root, petalNodes, baseScale: 1.15 };
    }

    /**
     * 4. 3D SAKURA (CHERRY BLOSSOM)
     * 5 heart-shaped notched petals with delicate central indentations and long slender stamens
     */
    static buildSakura() {
        const root = new THREE.Group();
        root.name = 'flower-head';
        const petalNodes = [];

        const geom = PetalGeometryFactory.createCurvedPetalGeometry({
            width: 0.62,
            length: 0.85,
            curl: 0.22,
            cup: 0.20,
            tipShape: 1.1,
            notch: 0.25 // heart notch
        });

        const mat = FlowerSpeciesRegistry.createPetalMaterial(0xffb0c8, 0xffffff, 0xff6699, 0.3);

        for (let i = 0; i < 5; i++) {
            const petalPivot = new THREE.Group();
            const angle = (i / 5) * Math.PI * 2;
            
            petalPivot.position.set(Math.cos(angle) * 0.06, 0, Math.sin(angle) * 0.06);
            petalPivot.rotation.y = -angle - Math.PI / 2;

            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            petalPivot.add(mesh);
            root.add(petalPivot);

            petalNodes.push({
                pivot: petalPivot,
                basePitch: 0.10,
                bloomPitch: 1.45,
                tierIndex: 0,
                angle: angle
            });
        }

        // Filament and anther stamens
        const stamenCount = 15;
        const filamentGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6);
        const filamentMat = new THREE.MeshStandardMaterial({ color: 0xffd1dc, roughness: 0.6 });
        const antherHeadGeom = new THREE.SphereGeometry(0.024, 8, 8);
        const antherHeadMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xff8800, emissiveIntensity: 0.4 });

        for (let i = 0; i < stamenCount; i++) {
            const sa = (i / stamenCount) * Math.PI * 2;
            const r = 0.08 + (i % 3) * 0.03;
            const group = new THREE.Group();
            group.position.set(Math.cos(sa) * r, 0.08, Math.sin(sa) * r);
            group.rotation.z = (Math.random() - 0.5) * 0.3;
            group.rotation.x = (Math.random() - 0.5) * 0.3;

            const fil = new THREE.Mesh(filamentGeom, filamentMat);
            fil.position.y = 0.16;
            group.add(fil);

            const head = new THREE.Mesh(antherHeadGeom, antherHeadMat);
            head.position.y = 0.32;
            group.add(head);

            root.add(group);
        }

        return { root, petalNodes, baseScale: 1.25 };
    }

    /**
     * 5. 3D COSMIC BIOLUMINESCENT ORCHID
     * Alien botanical fantasy with tall dorsal sepal, undulating wavy lateral petals and glowing cyan/purple lip
     */
    static buildCosmicOrchid() {
        const root = new THREE.Group();
        root.name = 'flower-head';
        const petalNodes = [];

        // Specialized orchid parts: dorsal sepal, lateral petals, lower sepals, labellum
        const parts = [
            { angle: 0, l: 1.10, w: 0.42, curl: -0.15, cup: 0.20, col: 0x00f0ff, emissive: 0x0088ff, baseP: 0.05, bloomP: 0.85 }, // dorsal
            { angle: Math.PI * 0.6, l: 0.95, w: 0.55, curl: 0.30, cup: 0.35, col: 0x9900ff, emissive: 0x6600cc, baseP: 0.15, bloomP: 1.25 }, // lateral right
            { angle: -Math.PI * 0.6, l: 0.95, w: 0.55, curl: 0.30, cup: 0.35, col: 0x9900ff, emissive: 0x6600cc, baseP: 0.15, bloomP: 1.25 }, // lateral left
            { angle: Math.PI * 0.25, l: 0.85, w: 0.35, curl: 0.25, cup: 0.20, col: 0x00ffc8, emissive: 0x009966, baseP: 0.10, bloomP: 1.05 }, // lower sepal right
            { angle: -Math.PI * 0.25, l: 0.85, w: 0.35, curl: 0.25, cup: 0.20, col: 0x00ffc8, emissive: 0x009966, baseP: 0.10, bloomP: 1.05 } // lower sepal left
        ];

        parts.forEach((part, idx) => {
            const geom = PetalGeometryFactory.createCurvedPetalGeometry({
                width: part.w,
                length: part.l,
                curl: part.curl,
                cup: part.cup,
                tipShape: 0.85
            });

            const mat = FlowerSpeciesRegistry.createPetalMaterial(part.col, 0xffffff, part.emissive, 0.65);

            const petalPivot = new THREE.Group();
            petalPivot.position.set(Math.cos(part.angle) * 0.08, 0, Math.sin(part.angle) * 0.08);
            petalPivot.rotation.y = -part.angle - Math.PI / 2;

            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            petalPivot.add(mesh);
            root.add(petalPivot);

            petalNodes.push({
                pivot: petalPivot,
                basePitch: part.baseP,
                bloomPitch: part.bloomP,
                tierIndex: idx,
                angle: part.angle
            });
        });

        // Ornate glowing labellum lip (curved pouch in front)
        const lipGeom = PetalGeometryFactory.createCurvedPetalGeometry({
            width: 0.55,
            length: 0.75,
            curl: -0.45,
            cup: 0.65,
            tipShape: 1.4
        });
        const lipMat = FlowerSpeciesRegistry.createPetalMaterial(0xff0088, 0xffff00, 0xff0066, 0.8);
        const lipPivot = new THREE.Group();
        lipPivot.rotation.y = Math.PI; // forward
        const lipMesh = new THREE.Mesh(lipGeom, lipMat);
        lipPivot.add(lipMesh);
        root.add(lipPivot);

        petalNodes.push({
            pivot: lipPivot,
            basePitch: 0.1,
            bloomPitch: 0.95,
            tierIndex: 5,
            angle: Math.PI
        });

        // Glowing alien orb column
        const orbGeom = new THREE.SphereGeometry(0.14, 16, 16);
        const orbMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.2, roughness: 0.1 });
        const orbMesh = new THREE.Mesh(orbGeom, orbMat);
        orbMesh.position.set(0, 0.12, 0.05);
        root.add(orbMesh);

        return { root, petalNodes, baseScale: 1.2 };
    }

    /**
     * 6. 3D SUNFLOWER
     * Radiant golden ray petals with large central disc floret core
     */
    static buildSunflower() {
        const root = new THREE.Group();
        root.name = 'flower-head';
        const petalNodes = [];

        const petalCount = 20;
        const geom = PetalGeometryFactory.createCurvedPetalGeometry({
            width: 0.35,
            length: 1.15,
            curl: 0.20,
            cup: 0.25,
            tipShape: 0.8
        });

        const mat = FlowerSpeciesRegistry.createPetalMaterial(0xffb700, 0xfff066, 0xff7700, 0.25);

        for (let i = 0; i < petalCount; i++) {
            const petalPivot = new THREE.Group();
            const angle = (i / petalCount) * Math.PI * 2;
            
            petalPivot.position.set(Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35);
            petalPivot.rotation.y = -angle - Math.PI / 2;

            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            petalPivot.add(mesh);
            root.add(petalPivot);

            petalNodes.push({
                pivot: petalPivot,
                basePitch: 0.12,
                bloomPitch: 1.40,
                tierIndex: 0,
                angle: angle
            });
        }

        // Large dark chocolate brown center floret disc
        const discGeom = new THREE.CylinderGeometry(0.42, 0.38, 0.12, 32);
        const discMat = new THREE.MeshStandardMaterial({ color: 0x3d200e, roughness: 0.9, bumpScale: 0.05 });
        const disc = new THREE.Mesh(discGeom, discMat);
        disc.position.y = 0.06;
        root.add(disc);

        return { root, petalNodes, baseScale: 1.15 };
    }
}

// =============================================================================
// 5. 3D SWIRLING POLLEN PARTICLE SYSTEM
// =============================================================================
class ParticleSystem3D {
    constructor(scene, count = 180) {
        this.scene = scene;
        this.count = count;
        
        // Generate circular radial soft glow texture dynamically
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.3, 'rgba(255, 180, 220, 0.8)');
        grad.addColorStop(0.7, 'rgba(255, 100, 180, 0.25)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);

        this.geom = new THREE.BufferGeometry();
        this.positions = new Float32Array(count * 3);
        this.velocities = [];
        this.lifetimes = new Float32Array(count);
        this.phases = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            this.resetParticle(i, true);
        }

        this.geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        this.mat = new THREE.PointsMaterial({
            size: 0.16,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: false,
            color: new THREE.Color(0xff88cc)
        });

        this.points = new THREE.Points(this.geom, this.mat);
        this.scene.add(this.points);
    }

    resetParticle(i, initial = false) {
        const i3 = i * 3;
        this.positions[i3] = (Math.random() - 0.5) * 3.5;
        this.positions[i3 + 1] = initial ? (Math.random() - 0.5) * 4.0 : -2.8;
        this.positions[i3 + 2] = (Math.random() - 0.5) * 3.5;

        this.velocities[i] = {
            vx: (Math.random() - 0.5) * 0.015,
            vy: 0.012 + Math.random() * 0.025,
            vz: (Math.random() - 0.5) * 0.015
        };

        this.lifetimes[i] = Math.random() * 300 + 100;
        this.phases[i] = Math.random() * Math.PI * 2;
    }

    update(windX, dt) {
        const pos = this.positions;
        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const vel = this.velocities[i];

            pos[i3] += vel.vx + windX * 0.04;
            pos[i3 + 1] += vel.vy;
            pos[i3 + 2] += vel.vz + Math.sin(this.phases[i] += 0.02) * 0.005;

            this.lifetimes[i] -= dt;
            if (this.lifetimes[i] <= 0 || pos[i3 + 1] > 3.5 || Math.abs(pos[i3]) > 4.0) {
                this.resetParticle(i);
            }
        }
        this.geom.attributes.position.needsUpdate = true;
    }
}

// =============================================================================
// 6. MAIN CONTROLLER APPLICATION CLASS
// =============================================================================
class FlowerBloom3DApp {
    constructor() {
        // DOM Elements
        this.webglCanvas = document.getElementById('webgl-canvas');
        this.hudCanvas = document.getElementById('hud-canvas');
        this.hudCtx = this.hudCanvas.getContext('2d');
        this.video = document.getElementById('webcam');
        this.cosmicBg = document.getElementById('cosmic-bg');
        this.loadingOverlay = document.getElementById('loading');
        this.loadingMsg = document.getElementById('loading-msg');
        this.manualPanel = document.getElementById('manual-panel');
        this.instructionsToast = document.getElementById('instructions-toast');
        this.trackingStatus = document.getElementById('tracking-status');

        // Telemetry DOM
        this.valBloom = document.getElementById('val-bloom');
        this.valGrowth = document.getElementById('val-growth');
        this.valWind = document.getElementById('val-wind');
        this.valYaw = document.getElementById('val-yaw');
        this.valTilt = document.getElementById('val-tilt');
        this.valFps = document.getElementById('val-fps');
        this.barBloom = document.getElementById('bar-bloom');
        this.barGrowth = document.getElementById('bar-growth');
        this.barWind = document.getElementById('bar-wind');

        // State variables
        this.bloom = 0.65;
        this.growth = 0.85;
        this.windForce = 0.0;
        this.targetBloom = 0.65;
        this.targetGrowth = 0.85;
        this.targetWindForce = 0.0;
        
        this.flowerTiltX = 0;
        this.flowerYawY = 0;
        this.targetTiltX = 0;
        this.targetYawY = 0;

        this.currentSpecies = 'rose';
        this.isManualMode = false;
        this.autoBreathe = false;
        this.lastHandX = 0.5;

        // Timers & FPS
        this.clock = new THREE.Clock();
        this.time = 0;
        this.fpsCounter = 0;
        this.fpsLastUpdate = 0;

        // Hand landmark data
        this.landmarks = [];
        this.handedness = [];
        this.handsCount = 0;

        // Subsystems
        this.audio = new ProceduralAudioEngine();
        this.noise = new OrganicNoise();

        // Initialize 3D Engine & Systems
        this.initThree();
        this.initFlowerHead();
        this.initStemAndLeaves();
        this.particles = new ParticleSystem3D(this.scene, 180);
        this.initUI();
        this.initHandTracking();

        // Responsive resize
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Auto-hide instructions toast after 9 seconds
        setTimeout(() => {
            this.instructionsToast?.classList.add('hidden');
        }, 9000);

        // Start render loop
        requestAnimationFrame((ts) => this.animate(ts));
    }

    // -------------------------------------------------------------------------
    // 3D Scene Initialization
    // -------------------------------------------------------------------------
    initThree() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(0, 0.6, 7.2);

        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.webglCanvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // OrbitControls for manual navigation
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.webglCanvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxDistance = 14;
            this.controls.minDistance = 2.5;
            this.controls.target.set(0, 0.4, 0);
            this.controls.enabled = false; // enabled only during manual mode
        }

        // Lighting Architecture
        this.ambientLight = new THREE.AmbientLight(0xffddf0, 0.75);
        this.scene.add(this.ambientLight);

        // Directional Sun Light
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
        this.sunLight.position.set(4, 8, 6);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.scene.add(this.sunLight);

        // Soft Back / Rim Light
        this.rimLight = new THREE.DirectionalLight(0x77bbff, 0.9);
        this.rimLight.position.set(-5, 4, -4);
        this.scene.add(this.rimLight);

        // Inner Glowing Floral Light (situated right inside the flower receptacle)
        this.flowerCoreLight = new THREE.PointLight(0xff3377, 1.5, 6, 2);
        this.flowerCoreLight.position.set(0, 0.8, 0);
        this.scene.add(this.flowerCoreLight);

        // Root container for flower head (allows global orientation & tilt)
        this.flowerHeadContainer = new THREE.Group();
        this.scene.add(this.flowerHeadContainer);
    }

    // -------------------------------------------------------------------------
    // Procedural Flower Switching & Initialization
    // -------------------------------------------------------------------------
    initFlowerHead() {
        // Clear previous head
        while (this.flowerHeadContainer.children.length > 0) {
            const child = this.flowerHeadContainer.children[0];
            this.flowerHeadContainer.remove(child);
        }

        let buildResult;
        switch (this.currentSpecies) {
            case 'lotus':
                buildResult = FlowerSpeciesRegistry.buildLotus();
                this.flowerCoreLight.color.setHex(0xffaa22);
                break;
            case 'tulip':
                buildResult = FlowerSpeciesRegistry.buildTulip();
                this.flowerCoreLight.color.setHex(0xff4422);
                break;
            case 'sakura':
                buildResult = FlowerSpeciesRegistry.buildSakura();
                this.flowerCoreLight.color.setHex(0xff77aa);
                break;
            case 'orchid':
                buildResult = FlowerSpeciesRegistry.buildCosmicOrchid();
                this.flowerCoreLight.color.setHex(0x00f0ff);
                break;
            case 'sunflower':
                buildResult = FlowerSpeciesRegistry.buildSunflower();
                this.flowerCoreLight.color.setHex(0xffbb00);
                break;
            case 'rose':
            default:
                buildResult = FlowerSpeciesRegistry.buildRose();
                this.flowerCoreLight.color.setHex(0xff2266);
                break;
        }

        this.flowerHead = buildResult.root;
        this.petalNodes = buildResult.petalNodes;
        this.speciesBaseScale = buildResult.baseScale;
        this.flowerHeadContainer.add(this.flowerHead);
    }

    // -------------------------------------------------------------------------
    // 3D Stem & Leaves (Dynamic Catmull-Rom Extruded Tube)
    // -------------------------------------------------------------------------
    initStemAndLeaves() {
        this.stemSegments = 24;
        this.stemPoints = [];
        this.stemBaseY = -2.6;

        // Initialize 16 control points
        for (let i = 0; i <= this.stemSegments; i++) {
            this.stemPoints.push(new THREE.Vector3(0, this.stemBaseY + i * 0.15, 0));
        }

        this.stemCurve = new THREE.CatmullRomCurve3(this.stemPoints);
        this.stemGeom = new THREE.TubeGeometry(this.stemCurve, 36, 0.065, 12, false);

        this.stemMat = new THREE.MeshStandardMaterial({
            color: 0x2d8a35,
            roughness: 0.45,
            metalness: 0.1,
            emissive: 0x0f4015,
            emissiveIntensity: 0.2
        });

        this.stemMesh = new THREE.Mesh(this.stemGeom, this.stemMat);
        this.stemMesh.castShadow = true;
        this.scene.add(this.stemMesh);

        // 3D Leaves setup
        this.leavesGroup = new THREE.Group();
        this.scene.add(this.leavesGroup);

        this.leafNodes = [];
        const leafConfigs = [
            { ratio: 0.25, side: 1, angle: 0.6, len: 0.85, wid: 0.32 },
            { ratio: 0.45, side: -1, angle: -0.6, len: 0.95, wid: 0.36 },
            { ratio: 0.65, side: 1, angle: 0.7, len: 0.78, wid: 0.28 },
            { ratio: 0.80, side: -1, angle: -0.5, len: 0.65, wid: 0.24 }
        ];

        leafConfigs.forEach(cfg => {
            const leafGeom = PetalGeometryFactory.createCurvedLeafGeometry(cfg.len, cfg.wid);
            const leafMat = new THREE.MeshStandardMaterial({
                color: 0x389a42,
                roughness: 0.4,
                metalness: 0.05,
                side: THREE.DoubleSide
            });

            const pivot = new THREE.Group();
            const mesh = new THREE.Mesh(leafGeom, leafMat);
            mesh.castShadow = true;
            pivot.add(mesh);
            this.leavesGroup.add(pivot);

            this.leafNodes.push({
                pivot: pivot,
                config: cfg
            });
        });
    }

    updateStemAndLeaves(windAngle) {
        const totalHeight = 3.6 * this.growth;
        const pts = this.stemPoints;
        const count = pts.length;

        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const y = this.stemBaseY + t * totalHeight;
            
            // Quadratic bend towards tip + sinusoidal sway
            const windBendX = windAngle * Math.pow(t, 2) * 1.8;
            const windBendZ = Math.sin(windAngle * 0.8) * Math.pow(t, 2) * 0.4;
            const swayX = this.noise.get(this.time * 0.8 + i * 0.2, 0) * 0.18 * t;
            const swayZ = this.noise.get(this.time * 0.7 + i * 0.2, 1) * 0.14 * t;

            pts[i].set(windBendX + swayX, y, windBendZ + swayZ);
        }

        // Rebuild tube geometry
        this.stemCurve.points = pts;
        this.stemMesh.geometry.dispose();
        this.stemMesh.geometry = new THREE.TubeGeometry(this.stemCurve, 36, 0.065 * Math.max(0.4, this.growth), 10, false);

        // Position flower head right at the tip of the stem
        const tip = pts[count - 1];
        const prev = pts[count - 2];
        const tangent = new THREE.Vector3().subVectors(tip, prev).normalize();

        this.flowerHeadContainer.position.copy(tip);
        this.flowerCoreLight.position.set(tip.x, tip.y + 0.15, tip.z);

        // Align flower head with stem curvature + user hand tilt
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        const handRotation = new THREE.Euler(this.flowerTiltX, this.flowerYawY, 0, 'YXZ');
        const handQuat = new THREE.Quaternion().setFromEuler(handRotation);
        this.flowerHeadContainer.quaternion.copy(targetQuat).multiply(handQuat);

        // Update Leaves
        this.leafNodes.forEach(node => {
            const idx = Math.floor(node.config.ratio * (count - 1));
            const p = pts[idx];
            const pNext = pts[Math.min(count - 1, idx + 1)];
            const segTangent = new THREE.Vector3().subVectors(pNext, p).normalize();

            node.pivot.position.copy(p);
            
            const leafScale = Math.max(0.01, this.growth * 1.1);
            node.pivot.scale.set(leafScale, leafScale, leafScale);

            // Angle leaf outward from stem
            node.pivot.rotation.set(0, 0, 0);
            node.pivot.rotateOnAxis(new THREE.Vector3(0, 1, 0), node.config.angle);
            node.pivot.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0.8 * node.config.side);
        });
    }

    // -------------------------------------------------------------------------
    // Computer Vision & MediaPipe Hands Integration
    // -------------------------------------------------------------------------
    initHandTracking() {
        if (typeof Hands === 'undefined') {
            this.loadingMsg.textContent = 'MediaPipe loading offline. Starting Interactive Mode.';
            setTimeout(() => this.enableManualMode(), 1200);
            return;
        }

        try {
            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
            });

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.65,
                minTrackingConfidence: 0.55
            });

            hands.onResults((res) => this.onHandResults(res));

            const cam = new Camera(this.video, {
                onFrame: async () => {
                    await hands.send({ image: this.video });
                },
                width: 1280,
                height: 720
            });

            cam.start()
                .then(() => {
                    this.loadingMsg.textContent = 'Camera initialized! Tracking gestures...';
                    setTimeout(() => {
                        this.loadingOverlay?.classList.add('hidden');
                    }, 600);
                })
                .catch((err) => {
                    console.warn('Camera access error:', err);
                    this.loadingMsg.textContent = 'Camera blocked. Entering Interactive Mode!';
                    setTimeout(() => this.enableManualMode(), 1200);
                });
        } catch (e) {
            console.warn('Hand tracking initialization failure:', e);
            this.enableManualMode();
        }
    }

    onHandResults(results) {
        if (this.isManualMode) return;

        this.landmarks = results.multiHandLandmarks || [];
        this.handedness = results.multiHandedness || [];
        this.handsCount = this.landmarks.length;

        let leftPinch = 0;
        let rightPinch = 0;
        let foundLeft = false;
        let foundRight = false;

        if (this.handsCount > 0) {
            this.trackingStatus.textContent = `${this.handsCount} Hand${this.handsCount > 1 ? 's' : ''} Active`;
            this.trackingStatus.classList.add('ready');

            for (let i = 0; i < this.handsCount; i++) {
                const lm = this.landmarks[i];
                const info = this.handedness[i];
                const isLeft = info && info.label === 'Left';
                const pinch = this.calcNormalizedPinch(lm);

                if (isLeft) {
                    leftPinch = pinch;
                    foundLeft = true;
                    // Palm normal calculation for 3D orientation
                    const rot = this.calcHandOrientation(lm);
                    this.targetTiltX = rot.pitch * 0.8;
                    this.targetYawY = rot.yaw * 0.8;
                } else {
                    rightPinch = pinch;
                    foundRight = true;
                }

                // Wind from hand horizontal velocity
                const wrist = lm[0];
                const dx = wrist.x - this.lastHandX;
                this.targetWindForce = dx * 16.0;
                this.lastHandX = wrist.x;
            }

            // Map gestures to targets
            if (foundLeft) {
                this.targetBloom = leftPinch;
            }
            if (foundRight) {
                this.targetGrowth = rightPinch;
            }
        } else {
            this.trackingStatus.textContent = 'Searching Hands...';
            this.trackingStatus.classList.remove('ready');
            // Gracefully decay
            this.targetBloom = Math.max(0.2, this.targetBloom * 0.96);
            this.targetGrowth = Math.max(0.3, this.targetGrowth * 0.98);
            this.targetWindForce *= 0.88;
            this.targetTiltX *= 0.92;
            this.targetYawY *= 0.92;
        }
    }

    /**
     * Normalized Pinch Distance (distance-invariant)
     * Scales thumb-index distance by wrist-to-middle-MCP reference distance
     */
    calcNormalizedPinch(lm) {
        const thumbTip = lm[4];
        const indexTip = lm[8];
        const wrist = lm[0];
        const middleMcp = lm[9];

        // Reference distance (hand size in screen space)
        const refDist = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
        if (refDist < 0.02) return 0;

        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        
        // Map: touching (0.15 * ref) -> 0.0, wide spread (0.85 * ref) -> 1.0
        const normalized = (pinchDist / refDist - 0.15) * 1.65;
        return Math.min(1.0, Math.max(0.0, normalized));
    }

    /**
     * 3D Palm Orientation (Pitch and Yaw)
     */
    calcHandOrientation(lm) {
        const wrist = lm[0];
        const indexMcp = lm[5];
        const pinkyMcp = lm[17];

        const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: (indexMcp.z || 0) - (wrist.z || 0) };
        const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: (pinkyMcp.z || 0) - (wrist.z || 0) };

        // Cross product for normal
        const nx = v1.y * v2.z - v1.z * v2.y;
        const ny = v1.z * v2.x - v1.x * v2.z;
        const nz = v1.x * v2.y - v1.y * v2.x;

        const pitch = Math.atan2(ny, nz);
        const yaw = Math.atan2(nx, nz);

        return { pitch, yaw };
    }

    // -------------------------------------------------------------------------
    // Mirrored 2D HUD & Laser Calipers Canvas
    // -------------------------------------------------------------------------
    drawHUD() {
        const ctx = this.hudCtx;
        const cw = this.hudCanvas.width;
        const ch = this.hudCanvas.height;

        ctx.clearRect(0, 0, cw, ch);

        if (this.isManualMode || this.handsCount === 0) return;

        // Draw 3D-connected Calipers & Skeleton on each hand
        for (let i = 0; i < this.handsCount; i++) {
            const lm = this.landmarks[i];
            const info = this.handedness[i];
            const isLeft = info && info.label === 'Left';

            const thumbTip = lm[4];
            const indexTip = lm[8];
            if (!thumbTip || !indexTip) continue;

            // Note: Since webcam is flipped horizontally with CSS scaleX(-1),
            // we mirror coordinates here so HUD matches the flipped webcam view!
            const tx = (1.0 - thumbTip.x) * cw;
            const ty = thumbTip.y * ch;
            const ix = (1.0 - indexTip.x) * cw;
            const iy = indexTip.y * ch;

            const themeColor = isLeft ? '#ff3377' : '#10e080';
            const themeGlow = isLeft ? 'rgba(255, 51, 119, 0.85)' : 'rgba(16, 224, 128, 0.85)';
            const labelText = isLeft ? `✿ Bloom: ${Math.round(this.bloom * 100)}%` : `🌱 Growth: ${Math.round(this.growth * 100)}%`;

            // Caliper Line
            ctx.save();
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = themeColor;
            ctx.shadowBlur = 12;
            ctx.shadowColor = themeGlow;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ix, iy);
            ctx.stroke();
            ctx.restore();

            // Tip Glowing Markers
            ctx.save();
            ctx.fillStyle = themeColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = themeGlow;
            ctx.beginPath();
            ctx.arc(tx, ty, 7, 0, Math.PI * 2);
            ctx.arc(ix, iy, 7, 0, Math.PI * 2);
            ctx.fill();

            // Ripple ring around fingertips
            const pulse = (this.time * 4) % 1;
            ctx.strokeStyle = themeGlow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(tx, ty, 7 + pulse * 14, 0, Math.PI * 2);
            ctx.arc(ix, iy, 7 + pulse * 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Midpoint HUD Pill (Unmirrored text)
            const midX = (tx + ix) / 2;
            const midY = (ty + iy) / 2 - 28;

            ctx.save();
            ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
            const textWidth = ctx.measureText(labelText).width;
            const pillW = textWidth + 24;
            const pillH = 28;

            // Background glass pill
            ctx.fillStyle = 'rgba(15, 8, 25, 0.85)';
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 10;
            ctx.shadowColor = themeGlow;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 8);
            } else {
                ctx.rect(midX - pillW / 2, midY - pillH / 2, pillW, pillH);
            }
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, midX, midY);
            ctx.restore();
        }
    }

    // -------------------------------------------------------------------------
    // Interactive UI Controls
    // -------------------------------------------------------------------------
    initUI() {
        // Species selection buttons
        const speciesButtons = document.querySelectorAll('.species-pill');
        speciesButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                speciesButtons.forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.currentSpecies = target.dataset.species;
                this.initFlowerHead();
                this.audio.playChime(6, 0.6);
            });
        });

        // Background toggle (Webcam vs. Cosmic Void)
        const btnBg = document.getElementById('btn-bg-toggle');
        btnBg.addEventListener('click', () => {
            const isCosmic = this.cosmicBg.classList.toggle('active');
            if (isCosmic) {
                this.video.classList.add('hidden');
                btnBg.querySelector('.btn-icon').textContent = '🌌';
            } else {
                this.video.classList.remove('hidden');
                btnBg.querySelector('.btn-icon').textContent = '📷';
            }
            this.audio.playChime(3, 0.4);
        });

        // Audio toggle button
        const btnAudio = document.getElementById('btn-audio-toggle');
        const audioIcon = document.getElementById('audio-icon');
        btnAudio.addEventListener('click', () => {
            const isOn = this.audio.toggle();
            audioIcon.textContent = isOn ? '🔔' : '🔕';
            if (isOn) this.audio.playChime(5, 0.6);
        });

        // Manual / Demo Mode Drawer Toggle
        const btnDemo = document.getElementById('btn-demo-toggle');
        const btnCloseManual = document.getElementById('btn-close-manual');
        const toggleManual = () => {
            this.manualPanel.classList.toggle('hidden');
            this.isManualMode = !this.manualPanel.classList.contains('hidden');
            if (this.controls) this.controls.enabled = this.isManualMode;
            if (this.isManualMode) {
                this.trackingStatus.textContent = 'Manual Simulation';
                this.trackingStatus.classList.add('ready');
            }
        };
        btnDemo.addEventListener('click', toggleManual);
        btnCloseManual?.addEventListener('click', toggleManual);

        // Enter Interactive Mode button on loading screen
        document.getElementById('btn-start-manual')?.addEventListener('click', () => {
            this.loadingOverlay?.classList.add('hidden');
            this.enableManualMode();
        });

        // Sliders in manual panel
        const sBloom = document.getElementById('manual-bloom');
        const sGrowth = document.getElementById('manual-growth');
        const sWind = document.getElementById('manual-wind');
        const nBloom = document.getElementById('num-bloom');
        const nGrowth = document.getElementById('num-growth');
        const nWind = document.getElementById('num-wind');

        sBloom?.addEventListener('input', (e) => {
            this.targetBloom = parseFloat(e.target.value);
            nBloom.textContent = `${Math.round(this.targetBloom * 100)}%`;
            this.audio.playChime(Math.floor(this.targetBloom * 8), 0.35);
        });

        sGrowth?.addEventListener('input', (e) => {
            this.targetGrowth = parseFloat(e.target.value);
            nGrowth.textContent = `${Math.round(this.targetGrowth * 100)}%`;
            this.audio.playChime(Math.floor(this.targetGrowth * 6) + 2, 0.35);
        });

        sWind?.addEventListener('input', (e) => {
            this.targetWindForce = parseFloat(e.target.value);
            nWind.textContent = this.targetWindForce.toFixed(2);
        });

        // Auto Breathe Mode
        const btnBreathe = document.getElementById('btn-auto-breathe');
        btnBreathe?.addEventListener('click', () => {
            this.autoBreathe = !this.autoBreathe;
            btnBreathe.textContent = this.autoBreathe ? '✨ Auto Breathe Mode: ON' : '✨ Auto Breathe Mode: Off';
            btnBreathe.style.borderColor = this.autoBreathe ? '#ff5599' : '';
        });

        // Reset Camera
        document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
            if (this.controls) {
                this.controls.reset();
                this.camera.position.set(0, 0.6, 7.2);
            }
        });

        // Snapshot / Photo capture button
        document.getElementById('btn-snapshot')?.addEventListener('click', () => {
            this.captureSnapshot();
        });

        // Help button (toggle instructions toast)
        document.getElementById('btn-help-toggle')?.addEventListener('click', () => {
            this.instructionsToast?.classList.toggle('hidden');
        });
    }

    enableManualMode() {
        this.isManualMode = true;
        this.manualPanel?.classList.remove('hidden');
        this.trackingStatus.textContent = 'Manual Simulation';
        this.trackingStatus.classList.add('ready');
        if (this.controls) this.controls.enabled = true;
        this.loadingOverlay?.classList.add('hidden');
    }

    captureSnapshot() {
        // Render 3D canvas
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.webglCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `flower-bloom-3d-${this.currentSpecies}.png`;
        link.href = dataURL;
        link.click();
        this.audio.playChime(8, 0.7);
    }

    // -------------------------------------------------------------------------
    // Window Resize Handler
    // -------------------------------------------------------------------------
    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.hudCanvas.width = w;
        this.hudCanvas.height = h;
    }

    // -------------------------------------------------------------------------
    // Render & Animation Loop
    // -------------------------------------------------------------------------
    animate(timestamp) {
        requestAnimationFrame((ts) => this.animate(ts));

        const dt = Math.min(this.clock.getDelta(), 0.1);
        this.time += dt;

        // Auto-Breathe simulation
        if (this.autoBreathe) {
            this.targetBloom = 0.5 + Math.sin(this.time * 1.5) * 0.45;
            this.targetGrowth = 0.65 + Math.sin(this.time * 0.8) * 0.25;
            this.targetWindForce = Math.sin(this.time * 0.9) * 0.35;
        }

        // Smooth gesture values (exponential lerp)
        const lerpFactor = 1.0 - Math.exp(-6.5 * dt);
        this.bloom += (this.targetBloom - this.bloom) * lerpFactor;
        this.growth += (this.targetGrowth - this.growth) * (lerpFactor * 0.85);
        this.windForce += (this.targetWindForce - this.windForce) * (lerpFactor * 0.75);
        this.flowerTiltX += (this.targetTiltX - this.flowerTiltX) * lerpFactor;
        this.flowerYawY += (this.targetYawY - this.flowerYawY) * lerpFactor;

        // Audio chimes based on bloom activity
        this.audio.updateWind(this.windForce);

        // Natural continuous wind
        const naturalWind = this.noise.get(this.time * 0.65, 0) * 0.18;
        const totalWind = naturalWind + this.windForce * 0.25;

        // 1. Update 3D Stem & Leaves
        this.updateStemAndLeaves(totalWind);

        // 2. Animate 3D Flower Petals (Unfurling & Flutter)
        const scaleFactor = (1.0 + this.bloom * 0.35) * this.growth * this.speciesBaseScale;
        this.flowerHead.scale.set(scaleFactor, scaleFactor, scaleFactor);

        this.petalNodes.forEach((node, idx) => {
            const flutter = this.noise.get(this.time * 1.4 + idx * 0.6, 2) * 0.05 * (1.0 + this.bloom);
            const pitch = node.basePitch + this.bloom * node.bloomPitch + flutter;
            node.pivot.rotation.x = pitch;
        });

        // 3. Flower Core Inner Glowing Light
        this.flowerCoreLight.intensity = (0.5 + this.bloom * 2.8) * this.growth;

        // 4. Update 3D Pollen Particles
        this.particles.update(totalWind, dt);

        // 5. Update OrbitControls if enabled
        if (this.controls && this.controls.enabled) {
            this.controls.update();
        }

        // 6. Render 3D Scene
        this.renderer.render(this.scene, this.camera);

        // 7. Render 2D Mirrored Skeleton HUD
        this.drawHUD();

        // 8. Update Telemetry Card UI
        this.valBloom.textContent = `${Math.round(this.bloom * 100)}%`;
        this.valGrowth.textContent = `${Math.round(this.growth * 100)}%`;
        this.valWind.textContent = totalWind.toFixed(2);
        this.valYaw.textContent = `${Math.round(this.flowerYawY * (180 / Math.PI))}°`;
        this.valTilt.textContent = `${Math.round(this.flowerTiltX * (180 / Math.PI))}°`;

        this.barBloom.style.width = `${Math.min(100, Math.max(0, this.bloom * 100))}%`;
        this.barGrowth.style.width = `${Math.min(100, Math.max(0, this.growth * 100))}%`;
        this.barWind.style.width = `${Math.min(100, Math.max(0, Math.abs(totalWind) * 70))}%`;

        // FPS measurement
        this.fpsCounter++;
        if (timestamp - this.fpsLastUpdate > 500) {
            const currentFps = Math.round((this.fpsCounter * 1000) / (timestamp - this.fpsLastUpdate));
            this.valFps.textContent = currentFps;
            this.fpsCounter = 0;
            this.fpsLastUpdate = timestamp;
        }
    }
}

// =============================================================================
// 7. APPLICATION BOOTSTRAP
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
    window.flowerBloomApp = new FlowerBloom3DApp();
});

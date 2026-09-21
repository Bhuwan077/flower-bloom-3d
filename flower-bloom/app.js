/* ==========================================================================
   FLOWER BLOOM — Real-Time Hand Gesture Controller
   Dual Engine: Viral Instagram Reel Glow (2D) + Interactive 3D Studio (WebGL)
   MediaPipe Hands 21-Point Landmark Tracking
   ========================================================================== */

// =============================================================================
// 1. ORGANIC NOISE ENGINE (Layered Sine Waves)
// =============================================================================
class OrganicNoise {
    constructor() {
        this.seeds = Array.from({ length: 12 }, () => Math.random() * 1000);
    }

    get(t, channel = 0) {
        const s = this.seeds[channel % this.seeds.length];
        return (
            Math.sin(t * 0.7 + s) * 0.4 +
            Math.sin(t * 1.3 + s * 1.7) * 0.3 +
            Math.sin(t * 2.1 + s * 0.3) * 0.2 +
            Math.sin(t * 3.7 + s * 2.1) * 0.1
        );
    }
}

// =============================================================================
// 2. PROCEDURAL AUDIO SYNTHESIZER (Generative Chimes & Wind)
// =============================================================================
class ProceduralAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.masterGain = null;
        this.windGain = null;
        this.windFilter = null;
        this.lastChimeTime = 0;
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.22;
            this.masterGain.connect(this.ctx.destination);
            this.initWindDrone();
        } catch (e) {
            console.warn('Web Audio not supported:', e);
        }
    }

    toggle() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.enabled ? 0.25 : 0.0, this.ctx.currentTime, 0.1);
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
            output[i] = (b0 + b1 + b2) * 0.25;
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
        const freq = 180 + absWind * 750;
        const vol = 0.02 + absWind * 0.07;
        const now = this.ctx.currentTime;
        this.windFilter.frequency.setTargetAtTime(freq, now, 0.1);
        this.windGain.gain.setTargetAtTime(vol, now, 0.1);
    }

    playChime(pitchIndex = 4, intensity = 0.5) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastChimeTime < 0.12) return;
        this.lastChimeTime = now;

        const freq = this.scale[pitchIndex % this.scale.length];
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 2.01, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25 * intensity, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
    }
}

// =============================================================================
// 3. REEL GLOW POLLEN PARTICLE SYSTEM (Canvas 2D)
// =============================================================================
class PollenParticle2D {
    constructor(cw, ch) {
        this.cw = cw;
        this.ch = ch;
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * this.cw;
        this.y = initial ? Math.random() * this.ch : this.ch + Math.random() * 40;
        this.radius = Math.random() * 2.5 + 0.8;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = -(Math.random() * 0.7 + 0.2);
        this.life = Math.random() * 300 + 150;
        this.maxLife = this.life;
        this.hue = 330 + Math.random() * 40;
        this.brightness = 70 + Math.random() * 20;
        this.flickerPhase = Math.random() * Math.PI * 2;
    }

    update(windForce, dt) {
        this.x += this.vx + windForce * 2.2;
        this.y += this.vy;
        this.life -= dt;
        if (this.life <= 0 || this.y < -20 || this.x < -20 || this.x > this.cw + 20) {
            this.reset();
        }
    }

    draw(ctx) {
        const t = this.life / this.maxLife;
        const flicker = 0.5 + 0.5 * Math.sin(this.life * 0.08 + this.flickerPhase);
        const alpha = t * 0.85 * flicker;
        if (alpha < 0.02) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${this.hue}, 100%, ${this.brightness}%, 0.9)`;
        ctx.fillStyle = `hsla(${this.hue}, 95%, ${this.brightness}%, 1)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// =============================================================================
// 4. REEL GLOW RENDERER (Exact Viral Instagram Reel Multi-Branch Flower)
// =============================================================================
class ReelGlowRenderer {
    constructor(canvas, noise) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.noise = noise;
        this.particles = [];
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const count = 75;
        for (let i = 0; i < count; i++) {
            this.particles.push(new PollenParticle2D(this.canvas.width, this.canvas.height));
        }
    }

    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        for (const p of this.particles) {
            p.cw = w;
            p.ch = h;
        }
    }

    render(bloom, growth, totalWind, time, dt, species = 'tulip') {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        // Update & Draw Pollen Particles
        for (const p of this.particles) {
            p.update(totalWind, dt);
            p.draw(ctx);
        }

        if (growth <= 0.005) return;

        // Anchor at bottom-right corner as seen in the Instagram reel
        const stemBaseX = cw * 0.75;
        const stemBaseY = ch * 0.95;
        const stemH = ch * 0.46 * growth;
        const flowerScale = 1.35 * growth;

        // Species Color Schemes
        const colorSchemes = {
            tulip: { hue: 345, sat: 85, light: 55 },
            rose: { hue: 350, sat: 90, light: 45 },
            lotus: { hue: 320, sat: 75, light: 65 },
            sakura: { hue: 335, sat: 80, light: 75 },
            orchid: { hue: 190, sat: 95, light: 55 }
        };
        const theme = colorSchemes[species] || colorSchemes.tulip;

        // Draw Main Stem with Wind Bending
        const stemData = this.drawStem(stemBaseX, stemBaseY, stemH, totalWind, time, growth);
        const tip = stemData.tip;
        const pts = stemData.pts;

        // 4 Side Branches sprouting left and right with miniature blooms
        const branchConfigs = [
            { heightRatio: 0.30, direction: -1, lengthFactor: 0.16, scaleFactor: 0.42 },
            { heightRatio: 0.45, direction: 1,  lengthFactor: 0.14, scaleFactor: 0.45 },
            { heightRatio: 0.60, direction: -1, lengthFactor: 0.12, scaleFactor: 0.48 },
            { heightRatio: 0.75, direction: 1,  lengthFactor: 0.10, scaleFactor: 0.40 }
        ];

        for (const cfg of branchConfigs) {
            const idx = Math.floor(pts.length * cfg.heightRatio);
            if (idx > 0 && idx < pts.length) {
                const pt = pts[idx];
                const prevPt = pts[idx - 1] || pt;
                const tangent = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x);

                const branchAngle = tangent + (cfg.direction * 0.75);
                const branchLength = ch * cfg.lengthFactor * growth;

                const branchTip = this.drawBranch(pt.x, pt.y, branchAngle, branchLength, totalWind, growth, time);
                const subScale = flowerScale * cfg.scaleFactor;

                this.drawFlowerHead(branchTip.x, branchTip.y, bloom, totalWind, subScale, time, theme);
                this.drawPostGlow(branchTip.x, branchTip.y, bloom, theme.hue);
            }
        }

        // Main Flower Head
        this.drawFlowerHead(tip.x, tip.y, bloom, totalWind, flowerScale, time, theme);
        this.drawPostGlow(tip.x, tip.y, bloom, theme.hue);
    }

    drawStem(baseX, baseY, height, windAngle, time, growth) {
        const ctx = this.ctx;
        const segs = 24;
        const segH = height / segs;

        const pts = [{ x: baseX, y: baseY }];
        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const windBend = windAngle * t * t * 45;
            const sway = this.noise.get(time * 0.6 + i * 0.25, 0) * 12 * t;
            pts.push({
                x: baseX + windBend + sway,
                y: baseY - segH * i
            });
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer glow
        ctx.lineWidth = 7;
        ctx.strokeStyle = 'rgba(40, 140, 35, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(80, 200, 60, 0.4)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Core stem
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#389a30';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Leaves along the stem
        this.drawLeaves(pts, growth, time);

        ctx.restore();
        return { tip: pts[pts.length - 1], pts };
    }

    drawLeaves(stemPts, growth, time) {
        const ctx = this.ctx;
        const positions = [0.25, 0.45, 0.65];

        for (let li = 0; li < positions.length; li++) {
            const idx = Math.floor(positions[li] * (stemPts.length - 1));
            const pt = stemPts[idx];
            const side = li % 2 === 0 ? 1 : -1;
            const len = 24 + growth * 22;
            const angle = side * (0.45 + this.noise.get(time * 0.6 + li * 3, 2) * 0.2);

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(angle);

            const grad = ctx.createLinearGradient(0, 0, len, 0);
            grad.addColorStop(0, 'rgba(55, 150, 45, 0.85)');
            grad.addColorStop(1, 'rgba(75, 185, 60, 0.45)');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(80, 220, 60, 0.35)';

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(len * 0.5, -11, len, -1);
            ctx.quadraticCurveTo(len * 0.5, 11, 0, 0);
            ctx.fill();

            // Leaf vein
            ctx.strokeStyle = 'rgba(90, 200, 70, 0.4)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(len * 0.8, 0);
            ctx.stroke();

            ctx.restore();
        }
    }

    drawBranch(startX, startY, baseAngle, length, windAngle, growth, time) {
        const ctx = this.ctx;
        const segs = 12;
        const segL = length / segs;
        const pts = [{ x: startX, y: startY }];

        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const windBend = windAngle * t * t * 18;
            const sway = this.noise.get(time * 0.8 + i * 0.3, 5) * 4 * t;
            const angle = baseAngle + windBend * 0.02 + sway * 0.01;

            pts.push({
                x: pts[pts.length - 1].x + Math.cos(angle) * segL + windBend * 0.3,
                y: pts[pts.length - 1].y + Math.sin(angle) * segL
            });
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.lineWidth = 4.5 * growth;
        ctx.strokeStyle = 'rgba(40, 130, 35, 0.25)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(80, 200, 60, 0.3)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.lineWidth = 2.8 * growth;
        ctx.strokeStyle = '#389a30';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.restore();
        return pts[pts.length - 1];
    }

    drawFlowerHead(cx, cy, bloom, windAngle, scale, time, theme) {
        const ctx = this.ctx;
        const bloomScaleFactor = 1.0 + bloom * 0.20;
        const adjustedScale = scale * bloomScaleFactor;

        ctx.save();
        ctx.translate(cx, cy);

        // Ambient radial glow behind head
        const glowR = (70 + bloom * 130) * adjustedScale;
        if (bloom > 0.02) {
            const glow = ctx.createRadialGradient(0, -glowR * 0.4, 0, 0, -glowR * 0.4, glowR);
            glow.addColorStop(0, `hsla(${theme.hue}, 100%, 65%, ${0.45 * bloom})`);
            glow.addColorStop(0.5, `hsla(${theme.hue - 15}, 100%, 55%, ${0.2 * bloom})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, -glowR * 0.4, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        const maxPetalLen = 90 * adjustedScale;

        // Back Petal Layer
        const backPetals = [
            { angle: 0, lengthMul: 1.0, widthMul: 0.42, hueOffset: 0, lightOffset: -4 },
            { angle: -0.15 - bloom * 0.7, lengthMul: 0.96, widthMul: 0.40, hueOffset: 10, lightOffset: -2 },
            { angle: 0.15 + bloom * 0.7, lengthMul: 0.96, widthMul: 0.40, hueOffset: 10, lightOffset: -2 }
        ];

        for (const p of backPetals) {
            const flutter = this.noise.get(time * 1.2 + p.angle * 10, 3) * 0.04 * (1 + bloom);
            const finalAngle = p.angle + flutter + windAngle * 0.1;
            const len = maxPetalLen * p.lengthMul;
            const wid = maxPetalLen * p.widthMul * (0.6 + bloom * 0.82);

            this.drawPetal(ctx, finalAngle, len, wid, theme.hue + p.hueOffset, theme.sat, theme.light + p.lightOffset, bloom);
        }

        // Center Pistil and Stamens
        if (bloom > 0.15) {
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(180, 230, 90, ${bloom})`;
            ctx.beginPath();
            ctx.arc(0, -maxPetalLen * 0.2, 5.5 * adjustedScale, 0, Math.PI * 2);
            ctx.fill();

            const stamenCount = 4;
            for (let i = 0; i < stamenCount; i++) {
                const a = (i / stamenCount) * Math.PI * 2 + time * 0.5;
                const r = 9 * adjustedScale * bloom;
                const sx = Math.cos(a) * r;
                const sy = -maxPetalLen * 0.2 + Math.sin(a) * r;

                ctx.strokeStyle = `rgba(240, 210, 80, ${bloom * 0.8})`;
                ctx.lineWidth = 1.6 * adjustedScale;
                ctx.beginPath();
                ctx.moveTo(0, -maxPetalLen * 0.1);
                ctx.lineTo(sx, sy);
                ctx.stroke();

                ctx.fillStyle = `rgba(255, 240, 130, ${bloom})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 3 * adjustedScale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Front Petal Layer
        const frontPetals = [
            { angle: -0.05 - bloom * 0.55, lengthMul: 0.92, widthMul: 0.36, hueOffset: 5, lightOffset: 2 },
            { angle: 0.05 + bloom * 0.55, lengthMul: 0.92, widthMul: 0.36, hueOffset: 5, lightOffset: 2 },
            { angle: 0, lengthMul: 0.86, widthMul: 0.33, hueOffset: -5, lightOffset: 6 }
        ];

        for (const p of frontPetals) {
            const flutter = this.noise.get(time * 1.4 + p.angle * 10, 4) * 0.03 * (1 + bloom);
            const finalAngle = p.angle + flutter + windAngle * 0.05;
            const len = maxPetalLen * p.lengthMul;
            const wid = maxPetalLen * p.widthMul * (0.65 + bloom * 0.78);

            this.drawPetal(ctx, finalAngle, len, wid, theme.hue + p.hueOffset, theme.sat, theme.light + p.lightOffset, bloom);
        }

        ctx.restore();
    }

    drawPetal(ctx, angle, length, width, hue, sat, light, bloom) {
        ctx.save();
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(0, 0, 0, -length);
        grad.addColorStop(0, `hsla(${hue + 25}, ${sat}%, ${light - 8}%, 0.92)`);
        grad.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${light}%, 0.88)`);
        grad.addColorStop(0.85, `hsla(${hue - 10}, ${sat + 10}%, ${light + 10}%, 0.88)`);
        grad.addColorStop(1, `hsla(${hue - 20}, ${sat + 15}%, ${light + 18}%, 0.96)`);

        ctx.fillStyle = grad;
        ctx.shadowBlur = 14 + bloom * 22;
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, ${0.3 + bloom * 0.45})`;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-width * 1.1, -length * 0.3, -width * 0.9, -length * 0.85, 0, -length);
        ctx.bezierCurveTo(width * 0.9, -length * 0.85, width * 1.1, -length * 0.3, 0, 0);
        ctx.fill();

        // Subtle Petal Vein
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsla(${hue + 15}, ${sat}%, ${light + 15}%, 0.25)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -length * 0.85);
        ctx.stroke();

        ctx.restore();
    }

    drawPostGlow(cx, cy, bloom, hue) {
        if (bloom < 0.05) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const r = 130 + bloom * 170;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `hsla(${hue}, 100%, 65%, ${bloom * 0.22})`);
        g.addColorStop(0.5, `hsla(${hue - 20}, 100%, 55%, ${bloom * 0.09})`);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// =============================================================================
// 5. 3D STUDIO RENDERER (Three.js WebGL Engine)
// =============================================================================
class Studio3DRenderer {
    constructor(canvas, noise) {
        this.canvas = canvas;
        this.noise = noise;
        this.scene = new THREE.Scene();

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        this.camera.position.set(0, 0.6, 7.2);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;

        // Lights
        this.ambientLight = new THREE.AmbientLight(0xffddf0, 0.8);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(4, 8, 6);
        this.scene.add(this.sunLight);

        this.rimLight = new THREE.DirectionalLight(0x77bbff, 1.0);
        this.rimLight.position.set(-5, 4, -4);
        this.scene.add(this.rimLight);

        this.coreLight = new THREE.PointLight(0xff3377, 1.5, 6, 2);
        this.scene.add(this.coreLight);

        this.flowerHeadContainer = new THREE.Group();
        this.scene.add(this.flowerHeadContainer);

        this.initStem();
        this.buildSpecies('tulip');
    }

    initStem() {
        this.stemSegments = 24;
        this.stemPoints = [];
        this.stemBaseY = -2.6;
        for (let i = 0; i <= this.stemSegments; i++) {
            this.stemPoints.push(new THREE.Vector3(0, this.stemBaseY + i * 0.15, 0));
        }
        this.stemCurve = new THREE.CatmullRomCurve3(this.stemPoints);
        this.stemGeom = new THREE.TubeGeometry(this.stemCurve, 36, 0.065, 12, false);
        this.stemMat = new THREE.MeshStandardMaterial({
            color: 0x2d8a35,
            roughness: 0.4,
            emissive: 0x0f4015,
            emissiveIntensity: 0.2
        });
        this.stemMesh = new THREE.Mesh(this.stemGeom, this.stemMat);
        this.scene.add(this.stemMesh);
    }

    buildSpecies(species) {
        while (this.flowerHeadContainer.children.length > 0) {
            this.flowerHeadContainer.remove(this.flowerHeadContainer.children[0]);
        }

        const root = new THREE.Group();
        this.petalNodes = [];

        const colors = {
            tulip: 0xff3366,
            rose: 0xdd0033,
            lotus: 0xff88cc,
            sakura: 0xffb0c8,
            orchid: 0x00f0ff
        };
        const col = colors[species] || 0xff3366;
        this.coreLight.color.setHex(col);

        const geom = new THREE.CylinderGeometry(0.1, 0.45, 1.1, 16, 1, true);
        const mat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.35,
            emissive: col,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });

        const petalCount = 6;
        for (let i = 0; i < petalCount; i++) {
            const pivot = new THREE.Group();
            const angle = (i / petalCount) * Math.PI * 2;
            pivot.position.set(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
            pivot.rotation.y = -angle;

            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.y = 0.55;
            pivot.add(mesh);
            root.add(pivot);

            this.petalNodes.push({ pivot, basePitch: 0.1, bloomPitch: 1.1 });
        }

        // Golden core
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.4 })
        );
        core.position.y = 0.12;
        root.add(core);

        this.flowerHead = root;
        this.flowerHeadContainer.add(root);
    }

    resize(w, h) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render(bloom, growth, totalWind, time) {
        const totalHeight = 3.6 * growth;
        const pts = this.stemPoints;
        const count = pts.length;

        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const y = this.stemBaseY + t * totalHeight;
            const windBendX = totalWind * Math.pow(t, 2) * 1.8;
            const swayX = this.noise.get(time * 0.8 + i * 0.2, 0) * 0.18 * t;
            pts[i].set(windBendX + swayX, y, 0);
        }

        this.stemCurve.points = pts;
        this.stemMesh.geometry.dispose();
        this.stemMesh.geometry = new THREE.TubeGeometry(this.stemCurve, 36, 0.065 * Math.max(0.4, growth), 10, false);

        const tip = pts[count - 1];
        this.flowerHeadContainer.position.copy(tip);
        this.coreLight.position.set(tip.x, tip.y + 0.15, tip.z);
        this.coreLight.intensity = (0.5 + bloom * 2.8) * growth;

        const scale = (1.0 + bloom * 0.3) * growth * 1.2;
        this.flowerHead.scale.set(scale, scale, scale);

        this.petalNodes.forEach(node => {
            node.pivot.rotation.x = node.basePitch + bloom * node.bloomPitch;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// =============================================================================
// 6. MAIN APPLICATION ORCHESTRATOR
// =============================================================================
class FlowerBloomApp {
    constructor() {
        // DOM
        this.webcam = document.getElementById('webcam');
        this.cosmicBg = document.getElementById('cosmic-bg');
        this.canvas2D = document.getElementById('canvas-2d');
        this.webglCanvas = document.getElementById('webgl-canvas');
        this.hudCanvas = document.getElementById('hud-canvas');
        this.hudCtx = this.hudCanvas.getContext('2d');
        this.loadingOverlay = document.getElementById('loading');
        this.loadingMsg = document.getElementById('loading-msg');
        this.manualPanel = document.getElementById('manual-panel');
        this.trackingStatus = document.getElementById('tracking-status');
        this.recordingBadge = document.getElementById('recording-badge');
        this.recTimerEl = document.getElementById('rec-timer');

        // Telemetry
        this.valBloom = document.getElementById('val-bloom');
        this.valGrowth = document.getElementById('val-growth');
        this.valWind = document.getElementById('val-wind');
        this.valModeDisplay = document.getElementById('val-mode-display');
        this.valHandsCount = document.getElementById('val-hands-count');
        this.valFps = document.getElementById('val-fps');
        this.barBloom = document.getElementById('bar-bloom');
        this.barGrowth = document.getElementById('bar-growth');
        this.barWind = document.getElementById('bar-wind');

        // State
        this.renderMode = 'reel'; // 'reel' (exact Instagram 2D) or '3d'
        this.currentSpecies = 'tulip';
        this.isManualMode = false;
        this.autoBreathe = false;

        this.bloom = 0.65;
        this.growth = 0.85;
        this.windForce = 0.0;
        this.targetBloom = 0.65;
        this.targetGrowth = 0.85;
        this.targetWindForce = 0.0;

        this.lastHandX = 0.5;
        this.time = 0;
        this.lastTimestamp = 0;
        this.fpsCounter = 0;
        this.fpsLastUpdate = 0;

        this.landmarks = [];
        this.handedness = [];
        this.handsCount = 0;

        // Subsystems
        this.noise = new OrganicNoise();
        this.audio = new ProceduralAudioEngine();
        this.reelRenderer = new ReelGlowRenderer(this.canvas2D, this.noise);
        this.studio3D = new Studio3DRenderer(this.webglCanvas, this.noise);

        // MediaRecorder & Composite Recording Canvas (records camera + flower + HUD together)
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordCanvas = document.createElement('canvas');
        this.recordCtx = this.recordCanvas.getContext('2d');
        this.recordedBlob = null;

        // Cloud Storage Config (Option C - Cloudinary)
        this.cloudName = localStorage.getItem('fb_cloud_name') || 'ib67jqy4';
        this.uploadPreset = localStorage.getItem('fb_upload_preset') || 'flower bloom preset';

        // Modal Elements
        this.videoModal = document.getElementById('video-modal');
        this.previewVideo = document.getElementById('preview-video');
        this.btnSendCloud = document.getElementById('btn-send-cloud');
        this.btnSaveDisk = document.getElementById('btn-save-disk');
        this.btnCloseVideoModal = document.getElementById('btn-close-video-modal');
        this.cloudStatusBox = document.getElementById('cloud-status-box');
        this.cloudSpinner = document.getElementById('cloud-spinner');
        this.cloudStatusText = document.getElementById('cloud-status-text');
        this.cloudClipLink = document.getElementById('cloud-clip-link');

        this.cloudSettingsModal = document.getElementById('cloud-settings-modal');
        this.btnCloudConfig = document.getElementById('btn-cloud-config');
        this.btnCloseCloudModal = document.getElementById('btn-close-cloud-modal');
        this.btnSaveCloudSettings = document.getElementById('btn-save-cloud-settings');
        this.cfgCloudName = document.getElementById('cfg-cloud-name');
        this.cfgUploadPreset = document.getElementById('cfg-upload-preset');

        // Init
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initUI();
        this.initHandTracking();

        // Start render loop
        requestAnimationFrame((ts) => this.animate(ts));
    }

    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.reelRenderer.resize(w, h);
        this.studio3D.resize(w, h);
        this.hudCanvas.width = w;
        this.hudCanvas.height = h;
    }

    initUI() {
        // Mode Switcher (Reel Glow vs 3D Studio)
        const btnModeReel = document.getElementById('btn-mode-reel');
        const btnMode3D = document.getElementById('btn-mode-3d');

        btnModeReel.addEventListener('click', () => {
            this.renderMode = 'reel';
            btnModeReel.classList.add('active');
            btnMode3D.classList.remove('active');
            this.canvas2D.classList.remove('hidden');
            this.webglCanvas.classList.add('hidden');
            this.valModeDisplay.textContent = 'Reel';
            this.audio.playChime(4, 0.5);
        });

        btnMode3D.addEventListener('click', () => {
            this.renderMode = '3d';
            btnMode3D.classList.add('active');
            btnModeReel.classList.remove('active');
            this.webglCanvas.classList.remove('hidden');
            this.canvas2D.classList.add('hidden');
            this.valModeDisplay.textContent = '3D';
            this.audio.playChime(6, 0.5);
        });

        // Species buttons
        const speciesButtons = document.querySelectorAll('.species-pill');
        speciesButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                speciesButtons.forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.currentSpecies = target.dataset.species;
                this.studio3D.buildSpecies(this.currentSpecies);
                this.audio.playChime(5, 0.6);
            });
        });

        // Background toggle
        const btnBg = document.getElementById('btn-bg-toggle');
        btnBg.addEventListener('click', () => {
            const isCosmic = this.cosmicBg.classList.toggle('active');
            if (isCosmic) {
                this.webcam.classList.add('hidden');
                btnBg.querySelector('.btn-icon').textContent = '🌌';
            } else {
                this.webcam.classList.remove('hidden');
                btnBg.querySelector('.btn-icon').textContent = '📷';
            }
        });

        // Audio toggle
        const btnAudio = document.getElementById('btn-audio-toggle');
        const audioIcon = document.getElementById('audio-icon');
        btnAudio.addEventListener('click', () => {
            const isOn = this.audio.toggle();
            audioIcon.textContent = isOn ? '🔔' : '🔕';
            if (isOn) this.audio.playChime(5, 0.6);
        });

        // Manual mode toggle
        const btnDemo = document.getElementById('btn-demo-toggle');
        const btnCloseManual = document.getElementById('btn-close-manual');
        const toggleManual = () => {
            this.manualPanel.classList.toggle('hidden');
            this.isManualMode = !this.manualPanel.classList.contains('hidden');
            if (this.isManualMode) {
                this.trackingStatus.textContent = 'Manual Mode';
                this.trackingStatus.classList.add('ready');
            }
        };
        btnDemo.addEventListener('click', toggleManual);
        btnCloseManual?.addEventListener('click', toggleManual);

        // Sliders
        const sBloom = document.getElementById('manual-bloom');
        const sGrowth = document.getElementById('manual-growth');
        const sWind = document.getElementById('manual-wind');
        const nBloom = document.getElementById('num-bloom');
        const nGrowth = document.getElementById('num-growth');
        const nWind = document.getElementById('num-wind');

        sBloom?.addEventListener('input', (e) => {
            this.targetBloom = parseFloat(e.target.value);
            nBloom.textContent = `${Math.round(this.targetBloom * 100)}%`;
            this.audio.playChime(Math.floor(this.targetBloom * 8), 0.3);
        });

        sGrowth?.addEventListener('input', (e) => {
            this.targetGrowth = parseFloat(e.target.value);
            nGrowth.textContent = `${Math.round(this.targetGrowth * 100)}%`;
            this.audio.playChime(Math.floor(this.targetGrowth * 6) + 2, 0.3);
        });

        sWind?.addEventListener('input', (e) => {
            this.targetWindForce = parseFloat(e.target.value);
            nWind.textContent = this.targetWindForce.toFixed(2);
        });

        // Auto-breathe
        const btnBreathe = document.getElementById('btn-auto-breathe');
        btnBreathe?.addEventListener('click', () => {
            this.autoBreathe = !this.autoBreathe;
            btnBreathe.textContent = this.autoBreathe ? '✨ Auto Breathe Mode: ON' : '✨ Auto Breathe Mode: Off';
            btnBreathe.style.borderColor = this.autoBreathe ? '#ff5599' : '';
        });

        // Snapshot
        document.getElementById('btn-snapshot')?.addEventListener('click', () => {
            this.captureSnapshot();
        });

        // Record 10s Clip (Client-side, privacy-respecting export)
        document.getElementById('btn-record-clip')?.addEventListener('click', () => {
            this.startRecordingClip();
        });

        // Start without camera
        document.getElementById('btn-start-manual')?.addEventListener('click', () => {
            this.loadingOverlay?.classList.add('hidden');
            this.isManualMode = true;
            this.manualPanel.classList.remove('hidden');
        });

        // Cloud Settings Modal Toggle & Save
        this.btnCloudConfig?.addEventListener('click', () => {
            if (this.cfgCloudName) this.cfgCloudName.value = this.cloudName;
            if (this.cfgUploadPreset) this.cfgUploadPreset.value = this.uploadPreset;
            this.cloudSettingsModal?.classList.remove('hidden');
        });
        this.btnCloseCloudModal?.addEventListener('click', () => {
            this.cloudSettingsModal?.classList.add('hidden');
        });
        this.btnSaveCloudSettings?.addEventListener('click', () => {
            this.cloudName = (this.cfgCloudName?.value || '').trim();
            this.uploadPreset = (this.cfgUploadPreset?.value || '').trim();
            localStorage.setItem('fb_cloud_name', this.cloudName);
            localStorage.setItem('fb_upload_preset', this.uploadPreset);
            this.cloudSettingsModal?.classList.add('hidden');
            this.audio.playChime(6, 0.6);
            alert('Cloudinary settings saved! Clips will now upload to your cloud.');
        });

        // Video Preview Modal Event Listeners
        this.btnCloseVideoModal?.addEventListener('click', () => {
            this.videoModal?.classList.add('hidden');
            if (this.previewVideo) this.previewVideo.pause();
        });
        this.btnSaveDisk?.addEventListener('click', () => {
            if (!this.recordedBlob) return;
            const url = URL.createObjectURL(this.recordedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flower-bloom-${this.currentSpecies}-reaction.webm`;
            a.click();
            this.audio.playChime(7, 0.6);
        });
        this.btnSendCloud?.addEventListener('click', () => {
            this.uploadToCloudinary();
        });
    }

    // -------------------------------------------------------------------------
    // MediaPipe Hands Tracking
    // -------------------------------------------------------------------------
    initHandTracking() {
        if (typeof Hands === 'undefined') {
            this.loadingMsg.textContent = 'MediaPipe offline. Opening Interactive Mode.';
            setTimeout(() => this.enableManualMode(), 1200);
            return;
        }

        try {
            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
            });

            // Optimized for high frame-rate & easy detection in normal room lighting
            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0, // 0 is 3x faster, preventing frame drops on laptop webcams
                minDetectionConfidence: 0.48, // lower threshold allows easier pickup of hands & fingers
                minTrackingConfidence: 0.40
            });

            hands.onResults((res) => this.onHandResults(res));

            // Camera utils feed at 640x480 for smooth 60fps neural net inference
            const cam = new Camera(this.webcam, {
                onFrame: async () => {
                    await hands.send({ image: this.webcam });
                },
                width: 640,
                height: 480
            });

            cam.start()
                .then(() => {
                    this.loadingMsg.textContent = 'Hands tracked! Ready to bloom.';
                    setTimeout(() => {
                        this.loadingOverlay?.classList.add('hidden');
                    }, 500);
                })
                .catch((err) => {
                    console.warn('Camera blocked:', err);
                    this.loadingMsg.textContent = 'Camera blocked. Entering Interactive Mode!';
                    setTimeout(() => this.enableManualMode(), 1200);
                });
        } catch (e) {
            console.warn('Hand tracking init error:', e);
            this.enableManualMode();
        }
    }

    enableManualMode() {
        this.isManualMode = true;
        this.manualPanel?.classList.remove('hidden');
        this.trackingStatus.textContent = 'Manual Mode';
        this.trackingStatus.classList.add('ready');
        this.loadingOverlay?.classList.add('hidden');
    }

    onHandResults(results) {
        if (this.isManualMode) return;

        this.landmarks = results.multiHandLandmarks || [];
        this.handedness = results.multiHandedness || [];
        this.handsCount = this.landmarks.length;

        if (this.handsCount === 0) {
            this.trackingStatus.textContent = 'Searching Hands...';
            this.trackingStatus.classList.remove('ready');
            this.targetWindForce *= 0.88;
            return;
        }

        this.trackingStatus.textContent = `${this.handsCount} Hand${this.handsCount > 1 ? 's' : ''} Active`;
        this.trackingStatus.classList.add('ready');

        // Sort hands by screen horizontal position (mirrored: 1 - x)
        // Hand further to the left of the user's screen controls Bloom
        // Hand further to the right controls Growth
        const sortedHands = this.landmarks.map((lm, idx) => {
            const wrist = lm[0];
            const screenX = 1.0 - wrist.x; // mirrored screen-space X
            return { lm, screenX, idx };
        }).sort((a, b) => a.screenX - b.screenX);

        if (sortedHands.length >= 2) {
            // DUAL HAND MODE:
            // Left hand on screen -> Bloom
            // Right hand on screen -> Growth
            const leftHand = sortedHands[0].lm;
            const rightHand = sortedHands[1].lm;

            this.targetBloom = this.calcNormalizedPinch(leftHand);
            this.targetGrowth = this.calcNormalizedPinch(rightHand);

            // Wind from combined hand horizontal movement
            const avgWristX = (leftHand[0].x + rightHand[0].x) * 0.5;
            const dx = avgWristX - this.lastHandX;
            this.targetWindForce = dx * 16.0;
            this.lastHandX = avgWristX;
        } else if (sortedHands.length === 1) {
            // ADAPTIVE SINGLE HAND MODE:
            // One hand in frame controls Bloom via pinch, and Growth via vertical position!
            const hand = sortedHands[0].lm;
            const pinch = this.calcNormalizedPinch(hand);
            this.targetBloom = pinch;

            // Height on screen (moving hand up grows stem, moving down shrinks it)
            const wristY = hand[0].y;
            // Map wristY from [0.8 (bottom) -> 0.2 (top)] to [0.35 -> 1.0]
            const heightFactor = Math.min(1.0, Math.max(0.35, (0.85 - wristY) * 1.5));
            this.targetGrowth = heightFactor;

            // Wind from single hand velocity
            const dx = hand[0].x - this.lastHandX;
            this.targetWindForce = dx * 16.0;
            this.lastHandX = hand[0].x;
        }
    }

    calcNormalizedPinch(lm) {
        const thumbTip = lm[4];
        const indexTip = lm[8];
        const wrist = lm[0];
        const middleMcp = lm[9];

        const refDist = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
        if (refDist < 0.02) return 0;

        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        // Generous scaling so touching is 0 and natural hand opening reaches 100% easily
        const normalized = (pinchDist / refDist - 0.12) * 1.75;
        return Math.min(1.0, Math.max(0.0, normalized));
    }

    // -------------------------------------------------------------------------
    // HUD Caliper Overlay & Full 21-Joint Glowing Skeleton
    // -------------------------------------------------------------------------
    drawHUD() {
        const ctx = this.hudCtx;
        const cw = this.hudCanvas.width;
        const ch = this.hudCanvas.height;

        ctx.clearRect(0, 0, cw, ch);
        if (this.isManualMode || this.handsCount === 0) return;

        // Skeleton connections between 21 MediaPipe hand landmarks
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],       // Index
            [5, 9], [9, 10], [10, 11], [11, 12],   // Middle
            [9, 13], [13, 14], [14, 15], [15, 16], // Ring
            [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
            [0, 17]                               // Palm base
        ];

        for (let i = 0; i < this.handsCount; i++) {
            const lm = this.landmarks[i];
            if (!lm || lm.length < 21) continue;

            const wristScreenX = (1.0 - lm[0].x) * cw;
            const isLeftScreen = wristScreenX < cw * 0.5;

            // In single hand mode, show that this hand controls Bloom & Height
            let labelText;
            let themeColor;
            let themeGlow;

            if (this.handsCount === 1) {
                themeColor = '#ff44aa';
                themeGlow = 'rgba(255, 68, 170, 0.85)';
                labelText = `✿ Bloom: ${Math.round(this.bloom * 100)}% · ↕ Height: ${Math.round(this.growth * 100)}%`;
            } else {
                themeColor = isLeftScreen ? '#ff3377' : '#10e080';
                themeGlow = isLeftScreen ? 'rgba(255, 51, 119, 0.85)' : 'rgba(16, 224, 128, 0.85)';
                labelText = isLeftScreen ? `✿ Bloom: ${Math.round(this.bloom * 100)}%` : `🌱 Growth: ${Math.round(this.growth * 100)}%`;
            }

            // 1. Draw glowing hand bones (skeleton)
            ctx.save();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = themeGlow;
            ctx.shadowBlur = 8;
            ctx.shadowColor = themeGlow;
            ctx.beginPath();
            for (const [from, to] of connections) {
                const p1 = lm[from];
                const p2 = lm[to];
                if (p1 && p2) {
                    const x1 = (1.0 - p1.x) * cw;
                    const y1 = p1.y * ch;
                    const x2 = (1.0 - p2.x) * cw;
                    const y2 = p2.y * ch;
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
            }
            ctx.stroke();
            ctx.restore();

            // 2. Draw all 21 joint nodes
            ctx.save();
            ctx.fillStyle = themeColor;
            ctx.shadowBlur = 10;
            ctx.shadowColor = themeGlow;
            for (let j = 0; j < 21; j++) {
                const pt = lm[j];
                const px = (1.0 - pt.x) * cw;
                const py = pt.y * ch;
                const radius = (j === 4 || j === 8 || j === 12 || j === 16 || j === 20) ? 4.5 : 2.5;
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // 3. Draw Laser Caliper line between Thumb Tip (4) and Index Tip (8)
            const thumbTip = lm[4];
            const indexTip = lm[8];
            if (thumbTip && indexTip) {
                const tx = (1.0 - thumbTip.x) * cw;
                const ty = thumbTip.y * ch;
                const ix = (1.0 - indexTip.x) * cw;
                const iy = indexTip.y * ch;

                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#ffffff';
                ctx.shadowBlur = 14;
                ctx.shadowColor = themeGlow;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(ix, iy);
                ctx.stroke();
                ctx.restore();

                // Unmirrored Badge Pill
                const midX = (tx + ix) / 2;
                const midY = (ty + iy) / 2 - 28;

                ctx.save();
                ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
                const textWidth = ctx.measureText(labelText).width;
                const pillW = textWidth + 24;
                const pillH = 26;

                ctx.fillStyle = 'rgba(12, 6, 20, 0.88)';
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 1.2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = themeGlow;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 8);
                else ctx.rect(midX - pillW / 2, midY - pillH / 2, pillW, pillH);
                ctx.fill();
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labelText, midX, midY);
                ctx.restore();
            }
        }
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // User-Initiated Video Clip Recording (Full Composite: Camera + Flower + HUD)
    // -------------------------------------------------------------------------
    startRecordingClip() {
        if (this.isRecording) return;
        this.isRecording = true;
        this.recordedChunks = [];
        this.recordingBadge.classList.remove('hidden');

        // Set composite recording resolution
        const cw = this.canvas2D.width || window.innerWidth;
        const ch = this.canvas2D.height || window.innerHeight;
        this.recordCanvas.width = cw;
        this.recordCanvas.height = ch;

        const stream = this.recordCanvas.captureStream(30);

        try {
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        } catch (e) {
            this.mediaRecorder = new MediaRecorder(stream);
        }

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
            this.recordingBadge.classList.add('hidden');
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            this.recordedBlob = blob;
            const url = URL.createObjectURL(blob);
            if (this.previewVideo) {
                this.previewVideo.src = url;
                this.previewVideo.play().catch(() => {});
            }
            if (this.cloudStatusBox) this.cloudStatusBox.classList.add('hidden');
            if (this.cloudClipLink) this.cloudClipLink.classList.add('hidden');
            if (this.videoModal) this.videoModal.classList.remove('hidden');
            this.audio.playChime(7, 0.7);
        };

        this.mediaRecorder.start();

        // 10-second countdown
        let timeLeft = 10;
        this.recTimerEl.textContent = `${timeLeft}s`;
        const countdown = setInterval(() => {
            timeLeft--;
            this.recTimerEl.textContent = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(countdown);
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                }
            }
        }, 1000);
    }

    async uploadToCloudinary() {
        if (!this.recordedBlob) return;

        if (!this.cloudName || !this.uploadPreset) {
            alert('Please configure your Cloudinary Cloud Name and Upload Preset in Cloud Settings (☁️ icon) first!');
            this.cloudSettingsModal?.classList.remove('hidden');
            return;
        }

        this.cloudStatusBox?.classList.remove('hidden');
        this.cloudSpinner?.classList.remove('hidden');
        this.cloudClipLink?.classList.add('hidden');
        this.cloudStatusText.textContent = `Uploading reaction clip to Bhuwan's cloud... 🌸✨`;

        try {
            const formData = new FormData();
            formData.append('file', this.recordedBlob, `flower-bloom-${this.currentSpecies}-${Date.now()}.webm`);
            formData.append('upload_preset', this.uploadPreset);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/video/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Server responded with ${res.status}`);
            }

            const data = await res.json();
            this.cloudSpinner?.classList.add('hidden');
            this.cloudStatusText.textContent = '🎉 Sent! Bhuwan will receive your blooming flower clip! 💖';

            if (data.secure_url && this.cloudClipLink) {
                this.cloudClipLink.href = data.secure_url;
                this.cloudClipLink.textContent = 'Open Cloud Video Link ↗';
                this.cloudClipLink.classList.remove('hidden');
            }
            this.audio.playChime(8, 0.8);
        } catch (err) {
            console.error('Upload failed:', err);
            this.cloudSpinner?.classList.add('hidden');
            this.cloudStatusText.textContent = `Upload issue: ${err.message}. You can still click 'Save to My Device'!`;
        }
    }

    captureSnapshot() {
        const cw = this.canvas2D.width || window.innerWidth;
        const ch = this.canvas2D.height || window.innerHeight;
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = cw;
        snapCanvas.height = ch;
        const sCtx = snapCanvas.getContext('2d');

        if (!this.cosmicBg.classList.contains('active')) {
            sCtx.save();
            sCtx.translate(cw, 0);
            sCtx.scale(-1, 1);
            sCtx.drawImage(this.webcam, 0, 0, cw, ch);
            sCtx.restore();
        } else {
            sCtx.fillStyle = '#06020a';
            sCtx.fillRect(0, 0, cw, ch);
        }

        if (this.renderMode === 'reel') {
            sCtx.save();
            sCtx.translate(cw, 0);
            sCtx.scale(-1, 1);
            sCtx.drawImage(this.canvas2D, 0, 0, cw, ch);
            sCtx.restore();
        } else {
            sCtx.drawImage(this.webglCanvas, 0, 0, cw, ch);
        }

        sCtx.drawImage(this.hudCanvas, 0, 0, cw, ch);

        const dataURL = snapCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `flower-bloom-${this.currentSpecies}.png`;
        link.href = dataURL;
        link.click();
        this.audio.playChime(8, 0.7);
    }

    // -------------------------------------------------------------------------
    // Main Animation Loop
    // -------------------------------------------------------------------------
    animate(timestamp) {
        requestAnimationFrame((ts) => this.animate(ts));

        const dt = this.lastTimestamp ? Math.min((timestamp - this.lastTimestamp) / 16.67, 2.0) : 1.0;
        this.lastTimestamp = timestamp;
        this.time += 0.016 * dt;

        if (this.autoBreathe) {
            this.targetBloom = 0.5 + Math.sin(this.time * 1.5) * 0.45;
            this.targetGrowth = 0.65 + Math.sin(this.time * 0.8) * 0.25;
            this.targetWindForce = Math.sin(this.time * 0.9) * 0.35;
        }

        const lerpSpeed = 0.075 * dt;
        this.bloom += (this.targetBloom - this.bloom) * lerpSpeed;
        this.growth += (this.targetGrowth - this.growth) * 0.055 * dt;
        this.windForce += (this.targetWindForce - this.windForce) * 0.065 * dt;

        this.audio.updateWind(this.windForce);

        const naturalWind = this.noise.get(this.time * 0.7, 1) * 0.14;
        const totalWind = naturalWind + this.windForce * 0.22;

        // Render Active Engine
        if (this.renderMode === 'reel') {
            this.reelRenderer.render(this.bloom, this.growth, totalWind, this.time, dt, this.currentSpecies);
        } else {
            this.studio3D.render(this.bloom, this.growth, totalWind, this.time);
        }

        // Draw HUD Calipers
        this.drawHUD();

        // If recording, render full composite (webcam + flower + HUD) to recordCanvas
        if (this.isRecording) {
            const rCtx = this.recordCtx;
            const rcw = this.recordCanvas.width;
            const rch = this.recordCanvas.height;

            rCtx.clearRect(0, 0, rcw, rch);

            // 1. Mirrored Webcam Feed
            if (!this.cosmicBg.classList.contains('active')) {
                rCtx.save();
                rCtx.translate(rcw, 0);
                rCtx.scale(-1, 1);
                rCtx.drawImage(this.webcam, 0, 0, rcw, rch);
                rCtx.restore();
            } else {
                rCtx.fillStyle = '#06020a';
                rCtx.fillRect(0, 0, rcw, rch);
            }

            // 2. Active Flower Canvas
            if (this.renderMode === 'reel') {
                rCtx.save();
                rCtx.translate(rcw, 0);
                rCtx.scale(-1, 1);
                rCtx.drawImage(this.canvas2D, 0, 0, rcw, rch);
                rCtx.restore();
            } else {
                rCtx.drawImage(this.webglCanvas, 0, 0, rcw, rch);
            }

            // 3. HUD Overlay
            rCtx.drawImage(this.hudCanvas, 0, 0, rcw, rch);
        }

        // Update Telemetry
        this.valBloom.textContent = `${Math.round(this.bloom * 100)}%`;
        this.valGrowth.textContent = `${Math.round(this.growth * 100)}%`;
        this.valWind.textContent = totalWind.toFixed(2);
        this.valHandsCount.textContent = this.handsCount;

        this.barBloom.style.width = `${Math.min(100, Math.max(0, this.bloom * 100))}%`;
        this.barGrowth.style.width = `${Math.min(100, Math.max(0, this.growth * 100))}%`;
        this.barWind.style.width = `${Math.min(100, Math.max(0, Math.abs(totalWind) * 70))}%`;

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
// BOOTSTRAP
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
    window.flowerBloomApp = new FlowerBloomApp();
});

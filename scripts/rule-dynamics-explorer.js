(() => {
    const roots = Array.from(document.querySelectorAll("[data-rule-explorer]"));
    if (!roots.length) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tau = Math.PI * 2;

    const colors = {
        paper: [251, 248, 242],
        line: [213, 204, 192],
        text: [30, 23, 19],
        muted: [99, 88, 80],
        accent: [138, 70, 56],
        deep: [23, 20, 19],
        mid: [130, 88, 66],
        light: [244, 239, 231],
        stim: [213, 204, 192],
    };

    const presets = {
        high: {
            label: "High-frequency stripes",
            periodMs: 55,
            amplitude: 0.8,
            inhibition: 0,
            threshold: 0.8,
            smoothing: 50,
            response: "period doubled",
            responseMode: "period_doubled",
            family: "stripe",
            fieldCaption:
                "Period-doubled stripe field; the foreground and background exchange after one forcing cycle.",
            stripeMode: 0.92,
            hexMode: 0.18,
            waveCount: 4.8,
            angle: 0.12,
            patternStrength: 0.82,
        },
        low: {
            label: "Low-frequency hexagons",
            periodMs: 120,
            amplitude: 1.0,
            inhibition: 0,
            threshold: 0.8,
            smoothing: 50,
            response: "one to one",
            responseMode: "one_to_one",
            family: "hexagonal",
            fieldCaption:
                "One-to-one hexagonal field; the same mode family returns after each stimulus cycle.",
            stripeMode: 0.24,
            hexMode: 0.88,
            waveCount: 3.7,
            angle: 0,
            patternStrength: 0.78,
        },
    };

    const rasterBuffers = new WeakMap();

    function patternGain(base, amplitude, inhibition) {
        const baseAmplitude = base.amplitude || 1;
        const relativeAmplitude = amplitude / baseAmplitude;
        const balance = 1 + (amplitude - baseAmplitude) * 0.9 - inhibition * 0.75;
        return clamp(relativeAmplitude * balance, 0.06, 1.28);
    }

    function makeEffectivePreset(base, controls) {
        const amplitude = controls.amplitude;
        const inhibition = controls.inhibition;
        const gain = patternGain(base, amplitude, inhibition);
        const depth = clamp(base.patternStrength * gain, 0.04, 1.1);
        const modeScale = clamp(depth / base.patternStrength, 0.08, 1.18);
        return {
            ...base,
            amplitude,
            inhibition,
            patternStrength: depth,
            displayResponse: depth < 0.24 ? "weak / near homogeneous" : base.response,
            stripeMode: clamp(base.stripeMode * modeScale, 0.02, 1),
            hexMode: clamp(base.hexMode * modeScale, 0.02, 1),
        };
    }

    function sweepBaseForPeriod(periodMs) {
        if (periodMs >= 105) {
            return {
                ...presets.low,
                label: `${periodMs} ms low-frequency hexagons`,
                periodMs,
                patternStrength: periodMs > 130 ? 0.62 : 0.78,
                waveCount: periodMs > 130 ? 3.2 : 3.7,
                stripeMode: 0.2,
                hexMode: periodMs > 130 ? 0.72 : 0.88,
            };
        }
        if (periodMs >= 75) {
            return {
                label: `${periodMs} ms transition`,
                periodMs,
                amplitude: 0.9,
                inhibition: 0,
                threshold: 0.8,
                smoothing: 50,
                response: "mixed",
                responseMode: "mixed",
                family: "mixed",
                fieldCaption: "Intermediate periods mix stripe and hexagonal tendencies.",
                stripeMode: 0.52,
                hexMode: 0.55,
                waveCount: 4.1,
                angle: 0.08,
                patternStrength: 0.56,
            };
        }
        return {
            ...presets.high,
            label: `${periodMs} ms high-frequency stripes`,
            periodMs,
            patternStrength: periodMs <= 55 ? 0.82 : 0.68,
            waveCount: periodMs <= 55 ? 4.8 : 4.35,
            stripeMode: periodMs <= 55 ? 0.92 : 0.74,
            hexMode: periodMs <= 55 ? 0.18 : 0.28,
        };
    }

    function rasterBufferFor(canvas, resolution) {
        const existing = rasterBuffers.get(canvas);
        if (existing && existing.resolution === resolution) {
            return existing;
        }
        const work = document.createElement("canvas");
        work.width = resolution;
        work.height = resolution;
        const workCtx = work.getContext("2d", { alpha: false });
        const image = workCtx.createImageData(resolution, resolution);
        const buffer = { resolution, work, workCtx, image };
        rasterBuffers.set(canvas, buffer);
        return buffer;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function mix(a, b, t) {
        return [
            Math.round(lerp(a[0], b[0], t)),
            Math.round(lerp(a[1], b[1], t)),
            Math.round(lerp(a[2], b[2], t)),
        ];
    }

    function colorFor(value) {
        const x = clamp((Math.tanh(value * 1.25) + 1) / 2, 0, 1);
        if (x < 0.5) {
            return mix(colors.deep, colors.mid, x / 0.5);
        }
        return mix(colors.mid, colors.light, (x - 0.5) / 0.5);
    }

    function resizeCanvas(canvas, fallbackWidth, fallbackHeight) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const width = Math.max(1, Math.round((rect.width || fallbackWidth) * dpr));
        const ratio = fallbackHeight / fallbackWidth;
        const height = Math.max(1, Math.round((rect.height || (rect.width || fallbackWidth) * ratio) * dpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        return canvas.getContext("2d");
    }

    function stimulusAt(preset, t) {
        const phase = Math.sin((tau * t) / preset.periodMs);
        const x = (phase - preset.threshold) * preset.smoothing;
        if (x > 35) {
            return preset.amplitude;
        }
        if (x < -35) {
            return 0;
        }
        return preset.amplitude / (1 + Math.exp(-x));
    }

    function sigmoid(x) {
        return 1 / (1 + Math.exp(-clamp(x, -40, 40)));
    }

    function integrateStep(state, preset, t, dt) {
        const s = stimulusAt(preset, t);
        const inhibitoryDrive = preset.inhibition || 0;
        const driveE = 10.5 * state.e - 9.3 * state.i - 2.2 + (2.8 - 1.1 * inhibitoryDrive) * s;
        const driveI = 9.2 * state.e - 1.8 * state.i - 2.6 + (0.35 + 2.2 * inhibitoryDrive) * s;
        state.e += (dt / 8) * (-state.e + sigmoid(driveE));
        state.i += (dt / 16) * (-state.i + sigmoid(driveI));
        state.e = clamp(state.e, 0, 1);
        state.i = clamp(state.i, 0, 1);
    }

    function buildTrace(preset) {
        const duration = preset.periodMs * 4;
        const count = 720;
        const dt = duration / (count - 1);
        const state = { e: 0.08, i: 0.07 };
        for (let t = -duration * 1.5; t < 0; t += dt) {
            integrateStep(state, preset, t, dt);
        }

        const samples = [];
        for (let n = 0; n < count; n += 1) {
            const t = n * dt;
            integrateStep(state, preset, t, dt);
            samples.push({
                t,
                stimulus: stimulusAt(preset, t),
                e: state.e,
                i: state.i,
            });
        }
        return { duration, samples };
    }

    function sampleTrace(trace, t) {
        const wrapped = ((t % trace.duration) + trace.duration) % trace.duration;
        const position = (wrapped / trace.duration) * (trace.samples.length - 1);
        const low = Math.floor(position);
        const high = Math.min(trace.samples.length - 1, low + 1);
        const f = position - low;
        const a = trace.samples[low];
        const b = trace.samples[high];
        return {
            stimulus: lerp(a.stimulus, b.stimulus, f),
            e: lerp(a.e, b.e, f),
            i: lerp(a.i, b.i, f),
        };
    }

    function driveFromTrace(trace, t) {
        const s = sampleTrace(trace, t);
        return clamp(0.65 + (s.e - s.i) * 0.85, 0.35, 1.05);
    }

    function estimatePeak(preset, trace) {
        let peakDrive = 0;
        trace.samples.forEach((sample) => {
            peakDrive = Math.max(peakDrive, clamp(0.65 + (sample.e - sample.i) * 0.85, 0.35, 1.05));
        });
        return clamp(preset.patternStrength * peakDrive, 0, 1.15);
    }

    function corticalCoordinates(px, py, view) {
        const x = px * 2 - 1;
        const y = py * 2 - 1;
        if (view !== "retinal") {
            return [x * Math.PI, y * Math.PI];
        }

        const r = Math.hypot(x, y);
        if (r < 0.055 || r > 1) {
            return null;
        }
        const theta = Math.atan2(y, x);
        return [
            (Math.log(r + 0.035) + 2.62) * 2.25,
            theta * 1.2,
        ];
    }

    function fieldValue(preset, trace, t, x, y) {
        const drive = driveFromTrace(trace, t);
        if (preset.family === "stripe") {
            const axis = Math.cos(preset.angle) * x + Math.sin(preset.angle) * y;
            const flip = Math.cos((Math.PI * t) / preset.periodMs) >= 0 ? 1 : -1;
            const carrier = Math.cos(preset.waveCount * axis);
            const harmonic = 0.16 * Math.cos(preset.waveCount * 2 * axis + 0.5 * Math.sin((tau * t) / preset.periodMs));
            return preset.patternStrength * drive * flip * (carrier + harmonic);
        }

        if (preset.family === "mixed") {
            const axis = Math.cos(preset.angle) * x + Math.sin(preset.angle) * y;
            const stripe = Math.cos(preset.waveCount * axis);
            const k = preset.waveCount * 0.88;
            const a = Math.cos(k * x);
            const b = Math.cos(k * (-0.5 * x + 0.8660254 * y));
            const c = Math.cos(k * (-0.5 * x - 0.8660254 * y));
            const wobble = 0.12 * Math.sin((tau * t) / preset.periodMs);
            return preset.patternStrength * drive * (0.55 * stripe + 0.45 * ((a + b + c) / 1.8) + wobble);
        }

        const k = preset.waveCount;
        const phase = 0.22 * Math.sin((tau * t) / preset.periodMs);
        const a = Math.cos(k * x + phase);
        const b = Math.cos(k * (-0.5 * x + 0.8660254 * y) + phase);
        const c = Math.cos(k * (-0.5 * x - 0.8660254 * y) + phase);
        const pulse = 0.84 + 0.16 * Math.sin((tau * t) / preset.periodMs - 0.4);
        return preset.patternStrength * drive * pulse * ((a + b + c) / 1.75 + 0.12 * a * b * c);
    }

    function drawRaster(targetCanvas, preset, trace, t, view, resolution) {
        const ctx = resizeCanvas(targetCanvas, targetCanvas.width || 240, targetCanvas.height || 240);
        const { work, workCtx, image } = rasterBufferFor(targetCanvas, resolution);
        const data = image.data;
        for (let row = 0; row < resolution; row += 1) {
            for (let col = 0; col < resolution; col += 1) {
                const index = (row * resolution + col) * 4;
                const coords = corticalCoordinates((col + 0.5) / resolution, (row + 0.5) / resolution, view);
                if (!coords) {
                    data[index] = colors.deep[0];
                    data[index + 1] = colors.deep[1];
                    data[index + 2] = colors.deep[2];
                    data[index + 3] = 255;
                    continue;
                }
                const rgb = colorFor(fieldValue(preset, trace, t, coords[0], coords[1]));
                data[index] = rgb[0];
                data[index + 1] = rgb[1];
                data[index + 2] = rgb[2];
                data[index + 3] = 255;
            }
        }
        workCtx.putImageData(image, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(work, 0, 0, targetCanvas.width, targetCanvas.height);
    }

    function correlation(preset, trace, tA, tB, view) {
        const valuesA = [];
        const valuesB = [];
        const n = 32;
        for (let row = 0; row < n; row += 1) {
            for (let col = 0; col < n; col += 1) {
                const coords = corticalCoordinates((col + 0.5) / n, (row + 0.5) / n, view);
                if (!coords) {
                    continue;
                }
                valuesA.push(fieldValue(preset, trace, tA, coords[0], coords[1]));
                valuesB.push(fieldValue(preset, trace, tB, coords[0], coords[1]));
            }
        }
        const meanA = valuesA.reduce((sum, value) => sum + value, 0) / valuesA.length;
        const meanB = valuesB.reduce((sum, value) => sum + value, 0) / valuesB.length;
        let numerator = 0;
        let denomA = 0;
        let denomB = 0;
        for (let i = 0; i < valuesA.length; i += 1) {
            const a = valuesA[i] - meanA;
            const b = valuesB[i] - meanB;
            numerator += a * b;
            denomA += a * a;
            denomB += b * b;
        }
        if (!denomA || !denomB) {
            return 0;
        }
        return numerator / Math.sqrt(denomA * denomB);
    }

    function drawLine(ctx, points, color, width) {
        ctx.beginPath();
        points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point[0], point[1]);
            } else {
                ctx.lineTo(point[0], point[1]);
            }
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawTrace(canvas, preset, trace, t) {
        const ctx = resizeCanvas(canvas, 620, 210);
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = `rgb(${colors.paper.join(",")})`;
        ctx.fillRect(0, 0, w, h);

        const left = 44;
        const right = 12;
        const top = 16;
        const bottom = 30;
        const plotW = w - left - right;
        const plotH = h - top - bottom;
        const xFor = (time) => left + (time / trace.duration) * plotW;
        const yFor = (value) => top + (1 - clamp(value, 0, 1)) * plotH;

        ctx.strokeStyle = `rgba(${colors.line.join(",")},0.9)`;
        ctx.lineWidth = 1;
        for (let period = 0; period <= 4; period += 1) {
            const x = xFor(period * preset.periodMs);
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + plotH);
            ctx.stroke();
        }

        ctx.fillStyle = "rgba(138,70,56,0.08)";
        trace.samples.forEach((sample, index) => {
            if (index === 0 || sample.stimulus <= 0.01) {
                return;
            }
            const prev = trace.samples[index - 1];
            ctx.fillRect(xFor(prev.t), yFor(sample.stimulus / preset.amplitude), xFor(sample.t) - xFor(prev.t), top + plotH - yFor(sample.stimulus / preset.amplitude));
        });

        const ePoints = trace.samples.map((sample) => [xFor(sample.t), yFor(sample.e)]);
        const iPoints = trace.samples.map((sample) => [xFor(sample.t), yFor(sample.i)]);
        drawLine(ctx, ePoints, `rgb(${colors.text.join(",")})`, 2);
        drawLine(ctx, iPoints, `rgb(${colors.accent.join(",")})`, 2);

        const xCursor = xFor(((t % trace.duration) + trace.duration) % trace.duration);
        ctx.strokeStyle = `rgba(${colors.text.join(",")},0.78)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xCursor, top - 2);
        ctx.lineTo(xCursor, top + plotH + 2);
        ctx.stroke();

        ctx.fillStyle = `rgb(${colors.muted.join(",")})`;
        ctx.font = `${Math.round(12 * (window.devicePixelRatio || 1))}px Georgia`;
        ctx.fillText("0", 12, top + plotH);
        ctx.fillText("1", 12, top + 8);
        ctx.fillText("four forcing periods", left, h - 9);
    }

    function drawModes(canvas, preset) {
        const ctx = resizeCanvas(canvas, 620, 150);
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = `rgb(${colors.paper.join(",")})`;
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.34;
        ctx.strokeStyle = `rgba(${colors.line.join(",")},0.9)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, tau);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - radius * 1.25, cy);
        ctx.lineTo(cx + radius * 1.25, cy);
        ctx.moveTo(cx, cy - radius * 1.25);
        ctx.lineTo(cx, cy + radius * 1.25);
        ctx.stroke();

        const drawMode = (angle, width, alpha = 1) => {
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            ctx.strokeStyle = `rgba(${colors.accent.join(",")},${alpha})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(cx - dx, cy - dy);
            ctx.lineTo(cx + dx, cy + dy);
            ctx.stroke();
        };

        if (preset.family === "stripe") {
            drawMode(preset.angle, 3);
        } else if (preset.family === "mixed") {
            drawMode(preset.angle, 2.6);
            [0, tau / 3, (2 * tau) / 3].forEach((angle) => drawMode(angle, 1.9, 0.62));
        } else {
            [0, tau / 3, (2 * tau) / 3].forEach((angle) => drawMode(angle, 2.5));
        }

        ctx.fillStyle = `rgb(${colors.text.join(",")})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, tau);
        ctx.fill();
    }

    class RuleExplorer {
        constructor(root) {
            this.root = root;
            this.presetKey = "high";
            this.basePreset = presets.high;
            this.controls = {
                amplitude: this.basePreset.amplitude,
                inhibition: this.basePreset.inhibition || 0,
            };
            this.preset = makeEffectivePreset(this.basePreset, this.controls);
            this.trace = buildTrace(this.preset);
            this.time = 0;
            this.playing = !reduceMotion;
            this.last = 0;
            this.lastPaint = 0;
            this.needsPaint = true;
            this.view = "cortical";
            this.fieldCanvas = root.querySelector("[data-rule-field]");
            this.traceCanvas = root.querySelector("[data-rule-trace]");
            this.modeCanvas = root.querySelector("[data-rule-modes]");
            this.snapshots = Array.from(root.querySelectorAll("[data-rule-snapshot]"));
            this.timeInput = root.querySelector("[data-rule-time]");
            this.viewSelect = root.querySelector("[data-rule-view]");
            this.playButton = root.querySelector("[data-rule-play]");
            this.presetButtons = Array.from(root.querySelectorAll("[data-rule-preset]"));
            this.paramInputs = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-param]")).map((node) => [node.dataset.ruleParam, node]),
            );
            this.paramOutputs = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-param-output]")).map((node) => [node.dataset.ruleParamOutput, node]),
            );
            this.sweepCells = Array.from(root.querySelectorAll("[data-rule-sweep]")).map((node) => ({
                root: node,
                periodMs: Number(node.dataset.ruleSweep),
                canvas: node.querySelector("canvas"),
                regime: node.querySelector("[data-rule-sweep-field=\"regime\"]"),
                modes: node.querySelector("[data-rule-sweep-field=\"modes\"]"),
                peak: node.querySelector("[data-rule-sweep-field=\"peak\"]"),
            }));
            this.readouts = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-readout]")).map((node) => [node.dataset.ruleReadout, node]),
            );
            this.bars = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-bar]")).map((node) => [node.dataset.ruleBar, node]),
            );
            this.barValues = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-bar-value]")).map((node) => [node.dataset.ruleBarValue, node]),
            );
            this.bind();
            this.syncParamControls();
            this.updatePlayButton();
            this.paint();
            window.requestAnimationFrame((now) => this.tick(now));
        }

        bind() {
            this.presetButtons.forEach((button) => {
                button.addEventListener("click", () => this.setPreset(button.dataset.rulePreset));
            });
            this.playButton.addEventListener("click", () => {
                this.playing = !this.playing;
                this.updatePlayButton();
                this.needsPaint = true;
            });
            this.timeInput.addEventListener("input", () => {
                this.time = (Number(this.timeInput.value) / 1000) * this.trace.duration;
                this.needsPaint = true;
            });
            this.viewSelect.addEventListener("change", () => {
                this.view = this.viewSelect.value;
                this.needsPaint = true;
            });
            Object.entries(this.paramInputs).forEach(([name, input]) => {
                input.addEventListener("input", () => {
                    const phase = this.trace ? this.time / this.trace.duration : 0;
                    this.controls[name] = Number(input.value);
                    this.rebuildTrace(phase);
                    this.syncParamControls();
                    this.needsPaint = true;
                });
            });
            window.addEventListener("resize", () => {
                this.needsPaint = true;
            });
        }

        setPreset(key) {
            if (!presets[key] || key === this.presetKey) {
                return;
            }
            const phase = this.time / this.trace.duration;
            this.presetKey = key;
            this.basePreset = presets[key];
            this.controls.amplitude = this.basePreset.amplitude;
            this.controls.inhibition = this.basePreset.inhibition || 0;
            this.rebuildTrace(phase);
            this.syncParamControls();
            this.presetButtons.forEach((button) => {
                button.classList.toggle("is-active", button.dataset.rulePreset === key);
            });
            this.needsPaint = true;
        }

        rebuildTrace(phase = 0) {
            this.preset = makeEffectivePreset(this.basePreset, this.controls);
            this.trace = buildTrace(this.preset);
            this.time = clamp(phase, 0, 1) * this.trace.duration;
        }

        syncParamControls() {
            Object.entries(this.paramInputs).forEach(([name, input]) => {
                input.value = String(this.controls[name]);
            });
            Object.entries(this.paramOutputs).forEach(([name, output]) => {
                output.textContent = this.controls[name].toFixed(2);
            });
        }

        updatePlayButton() {
            this.playButton.textContent = this.playing ? "Pause" : "Play";
            this.playButton.setAttribute("aria-pressed", String(this.playing));
        }

        updateReadouts(corrT, corr2T) {
            const frequency = 1000 / this.preset.periodMs;
            this.readouts.preset.textContent = this.preset.label;
            this.readouts.response.textContent = this.preset.displayResponse || this.preset.response;
            this.readouts["field-caption"].textContent = this.preset.fieldCaption;
            this.readouts["corr-t"].textContent = corrT.toFixed(2);
            this.readouts["corr-2t"].textContent = corr2T.toFixed(2);
            this.readouts.period.textContent = `${this.preset.periodMs} ms (${frequency.toFixed(1)} Hz)`;
            this.readouts.depth.textContent = estimatePeak(this.preset, this.trace).toFixed(2);
        }

        updateBars() {
            const pulse = 0.04 * Math.sin((tau * this.time) / this.preset.periodMs);
            const stripe = clamp(this.preset.stripeMode + pulse, 0, 1);
            const hex = clamp(this.preset.hexMode - pulse * 0.5, 0, 1);
            this.bars.stripe.style.width = `${Math.round(stripe * 100)}%`;
            this.bars.hex.style.width = `${Math.round(hex * 100)}%`;
            this.barValues.stripe.textContent = stripe.toFixed(2);
            this.barValues.hex.textContent = hex.toFixed(2);
        }

        paintSweep() {
            const phase = this.trace ? this.time / this.trace.duration : 0;
            this.sweepCells.forEach((cell) => {
                const base = sweepBaseForPeriod(cell.periodMs);
                const preset = makeEffectivePreset(base, this.controls);
                const trace = buildTrace(preset);
                const t = phase * trace.duration;
                drawRaster(cell.canvas, preset, trace, t, "cortical", 58);
                const peak = estimatePeak(preset, trace);
                cell.regime.textContent = peak < 0.18 ? "suppressed" : preset.displayResponse || preset.response;
                cell.modes.textContent = peak < 0.18 ? "homogeneous" : preset.family;
                cell.peak.textContent = peak.toFixed(2);
            });
        }

        paint() {
            drawRaster(this.fieldCanvas, this.preset, this.trace, this.time, this.view, 150);
            drawTrace(this.traceCanvas, this.preset, this.trace, this.time);
            drawModes(this.modeCanvas, this.preset);
            this.snapshots.forEach((canvas, index) => {
                drawRaster(canvas, this.preset, this.trace, this.time + index * this.preset.periodMs, this.view, 68);
            });
            const corrT = correlation(this.preset, this.trace, this.time, this.time + this.preset.periodMs, this.view);
            const corr2T = correlation(this.preset, this.trace, this.time, this.time + 2 * this.preset.periodMs, this.view);
            this.updateReadouts(corrT, corr2T);
            this.updateBars();
            this.paintSweep();
            this.timeInput.value = String(Math.round((this.time / this.trace.duration) * 1000));
            this.needsPaint = false;
        }

        tick(now) {
            const delta = this.last ? now - this.last : 0;
            this.last = now;
            if (this.playing && delta > 0) {
                const cycleSeconds = 1.45;
                this.time = (this.time + (delta / 1000) * (this.preset.periodMs / cycleSeconds)) % this.trace.duration;
                this.needsPaint = true;
            }
            if (this.needsPaint && (!this.playing || now - this.lastPaint > 42)) {
                this.paint();
                this.lastPaint = now;
            }
            window.requestAnimationFrame((next) => this.tick(next));
        }
    }

    roots.forEach((root) => new RuleExplorer(root));
})();

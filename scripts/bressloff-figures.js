(function () {
    const canvases = Array.from(document.querySelectorAll(".bressloff-animation"));
    if (!canvases.length) {
        return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastFrameAt = 0;
    const palettes = {
        bg: [31, 23, 18],
        low: [62, 48, 39],
        mid: [139, 75, 58],
        high: [248, 239, 220],
        line: "rgba(251, 248, 242, 0.72)",
        lineShadow: "rgba(30, 23, 19, 0.55)",
    };

    function mix(a, b, t) {
        return a.map((value, index) => Math.round(value + (b[index] - value) * t));
    }

    function colorFor(value) {
        const t = Math.max(0, Math.min(1, value * 0.5 + 0.5));
        const color = t < 0.5
            ? mix(palettes.low, palettes.mid, t * 2)
            : mix(palettes.mid, palettes.high, (t - 0.5) * 2);
        return color;
    }

    function retinoCortical(x, y) {
        const r = Math.max(0.012, Math.hypot(x, y));
        const theta = Math.atan2(y, x);
        return {
            u: Math.log(r) * 0.92,
            v: theta * 0.68,
            theta,
        };
    }

    function wave(u, v, angle, phase, scale) {
        return Math.cos(scale * (u * Math.cos(angle) + v * Math.sin(angle)) + phase);
    }

    function patternValue(pattern, u, v, phase) {
        const k = 11.0;
        switch (pattern) {
            case "rings":
                return wave(u, v, 0, phase, k);
            case "rays":
                return wave(u, v, Math.PI / 2, phase, k);
            case "spiral":
                return wave(u, v, Math.PI / 5, phase, k);
            case "cobweb":
                return 0.72 * wave(u, v, 0, phase, k) + 0.42 * wave(u, v, Math.PI / 2, phase * 0.35, k);
            case "honeycomb":
                return (
                    wave(u, v, 0, phase, k) +
                    wave(u, v, (2 * Math.PI) / 3, phase * 0.8, k) +
                    wave(u, v, (-2 * Math.PI) / 3, -phase * 0.7, k)
                ) / 1.8;
            case "rhombic":
                return 0.78 * wave(u, v, 0, phase, k) + 0.62 * wave(u, v, Math.PI / 4, -phase * 0.45, k);
            default:
                return 0;
        }
    }

    function localOrientation(pattern, u, v, theta, phase) {
        if (pattern === "rings") {
            return theta + Math.PI / 2;
        }
        if (pattern === "rays") {
            return theta;
        }
        if (pattern === "spiral") {
            return theta + Math.PI / 5;
        }

        const dx = patternValue(pattern, u + 0.012, v, phase) - patternValue(pattern, u - 0.012, v, phase);
        const dy = patternValue(pattern, u, v + 0.012, phase) - patternValue(pattern, u, v - 0.012, phase);
        return Math.atan2(dy, dx) + Math.PI / 2 + theta * 0.15;
    }

    function drawGlyphs(ctx, size, pattern, phase) {
        const stride = Math.max(28, Math.floor(size / 8));
        const length = Math.max(7, size / 34);
        ctx.save();
        ctx.lineCap = "round";
        for (let y = stride / 2; y < size; y += stride) {
            for (let x = stride / 2; x < size; x += stride) {
                const nx = (x / size) * 2 - 1;
                const ny = (y / size) * 2 - 1;
                const radius = Math.hypot(nx, ny);
                if (radius > 0.98 || radius < 0.04) {
                    continue;
                }
                const mapped = retinoCortical(nx, ny);
                const value = patternValue(pattern, mapped.u, mapped.v, phase);
                if (Math.abs(value) < 0.48) {
                    continue;
                }
                const angle = localOrientation(pattern, mapped.u, mapped.v, mapped.theta, phase);
                const strength = Math.min(1, Math.abs(value));
                const dx = Math.cos(angle) * length * (0.7 + strength * 0.45);
                const dy = Math.sin(angle) * length * (0.7 + strength * 0.45);
                ctx.lineWidth = 3;
                ctx.strokeStyle = palettes.lineShadow;
                ctx.beginPath();
                ctx.moveTo(x - dx, y - dy);
                ctx.lineTo(x + dx, y + dy);
                ctx.stroke();
                ctx.lineWidth = 1.05;
                ctx.strokeStyle = palettes.line;
                ctx.beginPath();
                ctx.moveTo(x - dx, y - dy);
                ctx.lineTo(x + dx, y + dy);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function draw(canvas, time) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        const cssSize = Math.max(220, Math.round(Math.min(rect.width, rect.height || rect.width)));
        const size = Math.round(cssSize * dpr);
        if (canvas.width !== size || canvas.height !== size) {
            canvas.width = size;
            canvas.height = size;
        }

        const ctx = canvas.getContext("2d", { alpha: false });
        const image = ctx.createImageData(size, size);
        const data = image.data;
        const pattern = canvas.dataset.pattern || "cobweb";
        const phase = prefersReducedMotion ? 0.65 : time * 0.00034;

        for (let y = 0; y < size; y += 1) {
            const ny = (y / (size - 1)) * 2 - 1;
            for (let x = 0; x < size; x += 1) {
                const nx = (x / (size - 1)) * 2 - 1;
                const radius = Math.hypot(nx, ny);
                const index = (y * size + x) * 4;
                if (radius > 1) {
                    data[index] = palettes.bg[0];
                    data[index + 1] = palettes.bg[1];
                    data[index + 2] = palettes.bg[2];
                    data[index + 3] = 255;
                    continue;
                }
                const mapped = retinoCortical(nx, ny);
                const raw = patternValue(pattern, mapped.u, mapped.v, phase);
                const vignette = Math.max(0.18, 1 - radius * 0.52);
                const value = Math.tanh(raw * 1.45) * vignette;
                const color = colorFor(value);
                data[index] = color[0];
                data[index + 1] = color[1];
                data[index + 2] = color[2];
                data[index + 3] = 255;
            }
        }

        ctx.putImageData(image, 0, 0);
        drawGlyphs(ctx, size, pattern, phase);
    }

    function frame(time) {
        if (!prefersReducedMotion && time - lastFrameAt < 95) {
            window.requestAnimationFrame(frame);
            return;
        }
        lastFrameAt = time;
        canvases.forEach((canvas) => {
            if (canvas.dataset.visible !== "false") {
                draw(canvas, time);
            }
        });
        if (!prefersReducedMotion) {
            window.requestAnimationFrame(frame);
        }
    }

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                entry.target.dataset.visible = entry.isIntersecting ? "true" : "false";
            });
        }, { rootMargin: "220px" });
        canvases.forEach((canvas) => observer.observe(canvas));
    }

    window.requestAnimationFrame(frame);
    window.addEventListener("resize", () => frame(performance.now()));
}());

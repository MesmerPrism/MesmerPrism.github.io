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
        return colorForUnit(x);
    }

    function colorForUnit(value) {
        const x = clamp(value, 0, 1);
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

    function decodeBase64U8(value) {
        const binary = window.atob(value || "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function drawThumbnail(canvas, thumbnail) {
        if (!thumbnail || !thumbnail.data_base64) {
            return false;
        }
        const width = thumbnail.width || 1;
        const height = thumbnail.height || width;
        const resolution = Math.max(width, height);
        const { work, workCtx, image } = rasterBufferFor(canvas, resolution);
        if (!thumbnail.bytes) {
            thumbnail.bytes = decodeBase64U8(thumbnail.data_base64);
        }
        for (let i = 0; i < image.data.length; i += 4) {
            const pixel = i / 4;
            const row = Math.floor(pixel / resolution);
            const col = pixel % resolution;
            const source = row < height && col < width ? thumbnail.bytes[row * width + col] || 0 : 0;
            const rgb = colorForUnit(source / 255);
            image.data[i] = rgb[0];
            image.data[i + 1] = rgb[1];
            image.data[i + 2] = rgb[2];
            image.data[i + 3] = 255;
        }
        workCtx.putImageData(image, 0, 0);
        const ctx = resizeCanvas(canvas, 150, 150);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(work, 0, 0, canvas.width, canvas.height);
        return true;
    }

    function formatResponseMode(mode) {
        if (mode === "period_doubled") {
            return "period doubled";
        }
        if (mode === "one_to_one") {
            return "one to one";
        }
        return mode || "mixed";
    }

    function formatFloquetHint(report) {
        if (!report || !report.strongest_mode) {
            return "available after report load";
        }
        const mode = report.strongest_mode;
        const hint =
            mode.crossing_hint === "minus_period_doubling"
                ? "-1 period-doubling"
                : mode.crossing_hint === "plus_one_to_one"
                  ? "+1 one-to-one"
                  : mode.crossing_hint === "unstable_complex"
                    ? "complex unstable"
                    : "stable";
        return `${hint}; beta ${mode.beta_cycles.toFixed(1)}, |lambda| ${mode.max_abs_multiplier.toFixed(2)}`;
    }

    function pointRegime(point) {
        if (!point) {
            return "available after report load";
        }
        if (point.status_level === "suppressed") {
            return "weak / near homogeneous";
        }
        return formatResponseMode(point.response_mode);
    }

    function pointRegimeKey(point) {
        if (!point) {
            return "unavailable";
        }
        if (point.status_level === "suppressed") {
            return "suppressed";
        }
        if (point.response_mode === "period_doubled") {
            return "period-doubled";
        }
        if (point.response_mode === "one_to_one") {
            return "one-to-one";
        }
        return "mixed";
    }

    function pointSpatialLabel(point) {
        if (!point) {
            return "available after report load";
        }
        const spatial = point.spatial || {};
        const confidence = Number.isFinite(spatial.confidence) ? spatial.confidence.toFixed(2) : "0.00";
        const entropy = Number.isFinite(spatial.mode_entropy) ? spatial.mode_entropy.toFixed(2) : "0.00";
        return `${point.spatial_family}, ${point.dominant_cycles.toFixed(1)} cyc; confidence ${confidence}, entropy ${entropy}`;
    }

    function pointTemporalLabel(point) {
        if (!point || !point.temporal) {
            return "available after report load";
        }
        const t = point.temporal;
        return `C(T) ${t.corr_t.toFixed(2)}, C(2T) ${t.corr_2t.toFixed(2)}, C(3T) ${t.corr_3t.toFixed(2)}; confidence ${t.confidence.toFixed(2)}`;
    }

    function sortedUnique(values, descending = false) {
        const unique = Array.from(new Set(values.map((value) => Number(value).toFixed(6))));
        const sorted = unique.map(Number).sort((a, b) => a - b);
        return descending ? sorted.reverse() : sorted;
    }

    function medianStep(values) {
        const sorted = values.slice().sort((a, b) => a - b);
        const steps = sorted
            .slice(1)
            .map((value, index) => Math.abs(value - sorted[index]))
            .filter((value) => value > 1e-6)
            .sort((a, b) => a - b);
        if (!steps.length) {
            return 0;
        }
        return steps[Math.floor(steps.length / 2)];
    }

    function floquetBoundaryKey(kind) {
        if (kind === "minus_period_doubling") {
            return "minus";
        }
        if (kind === "plus_one_to_one") {
            return "plus";
        }
        if (kind === "unstable_complex") {
            return "complex";
        }
        return "unknown";
    }

    function floquetBoundaryShortLabel(kind) {
        if (kind === "minus_period_doubling") {
            return "-1";
        }
        if (kind === "plus_one_to_one") {
            return "+1";
        }
        if (kind === "unstable_complex") {
            return "cx";
        }
        return "?";
    }

    function floquetBoundaryLabel(candidate) {
        if (!candidate) {
            return "no nearby Floquet boundary hint";
        }
        const kind =
            candidate.kind === "minus_period_doubling"
                ? "-1 period-doubling"
                : candidate.kind === "plus_one_to_one"
                  ? "+1 one-to-one"
                  : candidate.kind === "unstable_complex"
                    ? "complex instability"
                    : "unknown";
        const axis = typeof candidate.axis === "string" ? candidate.axis : "grid";
        const evidence = candidate.evidence === "sign_change" ? `${axis} sign change` : "nearest margin";
        const margin = Number.isFinite(candidate.margin_from) ? candidate.margin_from.toFixed(2) : "n/a";
        return `${kind}; beta ${candidate.beta_cycles.toFixed(1)}, ${evidence}, margin ${margin}`;
    }

    function formatScientific(value) {
        if (!Number.isFinite(value)) {
            return "n/a";
        }
        if (Math.abs(value) < 0.001) {
            return value.toExponential(2);
        }
        return value.toFixed(4);
    }

    function ruleCurveColor(kind) {
        return kind === "minus_period_doubling" ? "142,73,58" : "70,88,56";
    }

    function ruleCurveLabel(kind) {
        return kind === "minus_period_doubling" ? "-1 period-doubling" : "+1 one-to-one";
    }

    function sourceFigureCurves(sourceReport) {
        if (!sourceReport || !Array.isArray(sourceReport.curves)) {
            return [];
        }
        return sourceReport.curves.filter(
            (curve) => curve.kind === "plus_one_to_one" || curve.kind === "minus_period_doubling",
        );
    }

    function generatedFigureCurves(report) {
        if (!report || !Array.isArray(report.boundary_curves)) {
            return [];
        }
        return report.boundary_curves.filter(
            (curve) => curve.kind === "plus_one_to_one" || curve.kind === "minus_period_doubling",
        );
    }

    function betaMapping(report) {
        const comparison = report && report.source_curve_comparison ? report.source_curve_comparison : {};
        const mapping =
            comparison.domain_beta_mapping ||
            comparison.scale_only_beta_mapping ||
            comparison.affine_beta_mapping ||
            comparison.raw_beta_mapping;
        const scale = Number(mapping && mapping.scale);
        const offset = Number(mapping && mapping.offset);
        return {
            model: mapping && mapping.model ? mapping.model : "identity",
            scale: Number.isFinite(scale) ? scale : 1,
            offset: Number.isFinite(offset) ? offset : 0,
            rms: Number(mapping && mapping.rms_error),
            rawRms: Number(comparison.raw_beta_mapping && comparison.raw_beta_mapping.rms_error),
        };
    }

    function mappedGeneratedBeta(point, mapping) {
        const beta = Number(point && point.beta_cycles);
        if (!Number.isFinite(beta)) {
            return null;
        }
        return mapping.scale * beta + mapping.offset;
    }

    function drawCurvePath(ctx, points, xFor, yFor, color, alpha, width, dash = []) {
        if (!points.length) {
            return;
        }
        ctx.save();
        ctx.strokeStyle = `rgba(${color},${alpha})`;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xFor(point.period);
            const y = yFor(point.beta);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.restore();
    }

    function sourceCurvePoints(curve) {
        return Array.isArray(curve.points)
            ? curve.points
                  .map((point) => ({
                      period: Number(point.period_ms),
                      beta: Number(point.wave_number_beta),
                  }))
                  .filter((point) => Number.isFinite(point.period) && Number.isFinite(point.beta))
                  .sort((a, b) => a.period - b.period)
            : [];
    }

    function averagePoints(points) {
        if (!points.length) {
            return null;
        }
        return {
            period: points.reduce((sum, point) => sum + point.period, 0) / points.length,
            beta: points.reduce((sum, point) => sum + point.beta, 0) / points.length,
        };
    }

    function closeEnoughEndpoints(points) {
        const periods = points.map((point) => point.period);
        const betas = points.map((point) => point.beta);
        return Math.max(...periods) - Math.min(...periods) <= 4 && Math.max(...betas) - Math.min(...betas) <= 0.08;
    }

    function drawDot(ctx, x, y, radius, fill) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, tau);
        ctx.fill();
    }

    function drawTriangle(ctx, x, y, size, fill) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(x + size * 0.95, y);
        ctx.lineTo(x - size * 0.65, y - size * 0.55);
        ctx.lineTo(x - size * 0.25, y + size * 0.9);
        ctx.closePath();
        ctx.fill();
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const head = 7;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - Math.cos(angle - 0.45) * head, toY - Math.sin(angle - 0.45) * head);
        ctx.lineTo(toX - Math.cos(angle + 0.45) * head, toY - Math.sin(angle + 0.45) * head);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function renderRuleCurvePlot(canvas, report, sourceReport) {
        if (!canvas || !report || !Array.isArray(report.boundary_curves)) {
            return;
        }
        const curves = generatedFigureCurves(report);
        const sourceCurves = sourceFigureCurves(sourceReport);
        const mapping = betaMapping(report);
        const sourcePoints = sourceCurves.flatMap((curve) =>
            Array.isArray(curve.points)
                ? curve.points
                      .map((point) => ({
                          period: Number(point.period_ms),
                          beta: Number(point.wave_number_beta),
                      }))
                      .filter((point) => Number.isFinite(point.period) && Number.isFinite(point.beta))
                : [],
        );
        const generatedPoints = curves.flatMap((curve) =>
            Array.isArray(curve.points)
                ? curve.points
                      .map((point) => ({
                          period: Number(point.period_ms),
                          beta: mappedGeneratedBeta(point, mapping),
                      }))
                      .filter((point) => Number.isFinite(point.period) && Number.isFinite(point.beta))
                : [],
        );
        const points = sourcePoints.length ? sourcePoints.concat(generatedPoints) : generatedPoints;
        const ctx = resizeCanvas(canvas, 760, 340);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = `rgb(${colors.paper.join(",")})`;
        ctx.fillRect(0, 0, w, h);
        if (!points.length) {
            ctx.fillStyle = `rgb(${colors.muted.join(",")})`;
            ctx.font = "13px Georgia";
            ctx.fillText("No Figure 8 curve points available.", 24, 42);
            return;
        }

        const compact = w < 520;
        const left = compact ? 62 : 66;
        const right = compact ? 18 : 24;
        const top = compact ? 46 : 18;
        const bottom = compact ? 62 : 54;
        const plotW = w - left - right;
        const plotH = h - top - bottom;
        const sourceAxes = sourceReport && sourceReport.source_axes ? sourceReport.source_axes : {};
        const xMin = Number.isFinite(Number(sourceAxes.x_min)) ? Number(sourceAxes.x_min) : Math.min(...points.map((point) => point.period));
        const xMax = Number.isFinite(Number(sourceAxes.x_max)) ? Number(sourceAxes.x_max) : Math.max(...points.map((point) => point.period));
        const yMinRaw = Math.min(...points.map((point) => point.beta));
        const yMaxRaw = Math.max(...points.map((point) => point.beta));
        const yMin = Number.isFinite(Number(sourceAxes.y_min)) ? Number(sourceAxes.y_min) : Math.max(0, yMinRaw - 0.05);
        const yMax = Number.isFinite(Number(sourceAxes.y_max)) ? Number(sourceAxes.y_max) : yMaxRaw + 0.05;
        const xFor = (period) => left + ((period - xMin) / Math.max(1e-9, xMax - xMin)) * plotW;
        const yFor = (wave) => top + (1 - (wave - yMin) / Math.max(1e-9, yMax - yMin)) * plotH;

        ctx.font = "11px Georgia";
        ctx.fillStyle = `rgb(${colors.muted.join(",")})`;
        const xTickCount = compact ? 3 : 4;
        for (let i = 0; i <= xTickCount; i += 1) {
            const t = i / xTickCount;
            const x = left + t * plotW;
            const period = xMin + t * (xMax - xMin);
            ctx.strokeStyle = `rgba(${colors.line.join(",")},0.45)`;
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + plotH);
            ctx.stroke();
            ctx.strokeStyle = `rgba(${colors.text.join(",")},0.55)`;
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + 5);
            ctx.moveTo(x, top + plotH);
            ctx.lineTo(x, top + plotH - 5);
            ctx.stroke();
            const label = `${period.toFixed(0)} ms`;
            ctx.textAlign = i === 0 ? "left" : i === xTickCount ? "right" : "center";
            ctx.fillText(label, x, top + plotH + 20);
        }
        ctx.textAlign = "left";
        for (let i = 0; i <= 4; i += 1) {
            const t = i / 4;
            const y = top + t * plotH;
            const wave = yMax - t * (yMax - yMin);
            ctx.strokeStyle = `rgba(${colors.line.join(",")},0.45)`;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + plotW, y);
            ctx.stroke();
            ctx.strokeStyle = `rgba(${colors.text.join(",")},0.55)`;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + 5, y);
            ctx.moveTo(left + plotW, y);
            ctx.lineTo(left + plotW - 5, y);
            ctx.stroke();
            ctx.textAlign = "right";
            ctx.fillText(wave.toFixed(2), left - 9, y + 4);
        }
        ctx.textAlign = "left";
        ctx.strokeStyle = `rgba(${colors.line.join(",")},0.95)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.rect(left, top, plotW, plotH);
        ctx.stroke();
        ctx.fillStyle = `rgb(${colors.text.join(",")})`;
        ctx.textAlign = "center";
        ctx.fillText("forcing period T", left + plotW / 2, h - 13);
        ctx.textAlign = "left";
        ctx.save();
        ctx.translate(compact ? 18 : 20, top + plotH * 0.5);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillText("source figure beta", 0, 0);
        ctx.restore();

        const sourceGroups = new Map();
        sourceCurves.forEach((curve) => {
            const curvePoints = sourceCurvePoints(curve);
            const group = sourceGroups.get(curve.kind) || [];
            group.push(curvePoints);
            sourceGroups.set(curve.kind, group);
            drawCurvePath(ctx, curvePoints, xFor, yFor, ruleCurveColor(curve.kind), 0.98, 2.4);
        });
        sourceGroups.forEach((group, kind) => {
            if (group.length < 2) {
                return;
            }
            const starts = group.map((pointsForCurve) => pointsForCurve[0]).filter(Boolean);
            const ends = group.map((pointsForCurve) => pointsForCurve[pointsForCurve.length - 1]).filter(Boolean);
            if (closeEnoughEndpoints(starts)) {
                const start = averagePoints(starts);
                drawDot(ctx, xFor(start.period), yFor(start.beta), compact ? 3.2 : 4.2, `rgb(${colors.deep.join(",")})`);
            } else {
                starts.forEach((point) => drawDot(ctx, xFor(point.period), yFor(point.beta), compact ? 3.2 : 4.2, `rgb(${colors.deep.join(",")})`));
            }
            if (closeEnoughEndpoints(ends)) {
                const end = averagePoints(ends);
                drawCurvePath(ctx, [ends[0], ends[1]], xFor, yFor, ruleCurveColor(kind), 0.98, 2.4);
                drawDot(ctx, xFor(end.period), yFor(end.beta), compact ? 3.2 : 4.2, `rgb(${colors.deep.join(",")})`);
                if (kind === "minus_period_doubling") {
                    drawTriangle(ctx, xFor(end.period) + (compact ? 10 : 14), yFor(end.beta) + (compact ? 3 : 5), compact ? 7 : 10, `rgb(${colors.deep.join(",")})`);
                }
            } else {
                ends.forEach((point) => drawDot(ctx, xFor(point.period), yFor(point.beta), compact ? 3.2 : 4.2, `rgb(${colors.deep.join(",")})`));
            }
        });

        curves.forEach((curve, index) => {
            const isMinus = curve.kind === "minus_period_doubling";
            const color = ruleCurveColor(curve.kind);
            const alpha = 0.6 - Math.min(index, 8) * 0.025;
            const curvePoints = Array.isArray(curve.points)
                ? curve.points
                      .map((point) => ({
                          period: Number(point.period_ms),
                          beta: mappedGeneratedBeta(point, mapping),
                      }))
                      .filter((point) => Number.isFinite(point.period) && Number.isFinite(point.beta))
                      .sort((a, b) => a.period - b.period)
                : [];
            curvePoints.forEach((point) => {
                ctx.fillStyle = `rgba(${color},${alpha})`;
                const x = xFor(point.period);
                const y = yFor(point.beta);
                if (isMinus) {
                    ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
                } else {
                    ctx.beginPath();
                    ctx.arc(x, y, 2.2, 0, tau);
                    ctx.fill();
                }
            });
        });

        ctx.fillStyle = `rgb(${colors.text.join(",")})`;
        ctx.font = `${compact ? 16 : 19}px Georgia`;
        ctx.fillText("-1", xFor(71), yFor(0.83));
        ctx.fillText("+1", xFor(118), yFor(0.37));
        ctx.font = `${compact ? 14 : 17}px Georgia`;
        ctx.fillText("\u03b2*", xFor(82), yFor(0.56));
        drawArrow(ctx, xFor(87), yFor(0.56), xFor(103), yFor(0.47), `rgb(${colors.deep.join(",")})`);

        const legend = [
            [ruleCurveLabel("minus_period_doubling"), "142,73,58", []],
            [ruleCurveLabel("plus_one_to_one"), "70,88,56", []],
            [`generated samples (${mapping.model})`, "99,88,80", "marker"],
        ];
        ctx.font = "10.5px Georgia";
        legend.forEach(([label, color, style], index) => {
            const x = compact ? left + 8 : left + index * 168;
            const y = compact ? 15 + index * 12 : top + 14;
            ctx.save();
            if (style === "marker") {
                ctx.fillStyle = `rgb(${color})`;
                ctx.fillRect(x, y - 10, 5, 5);
                ctx.beginPath();
                ctx.arc(x + 15, y - 7.5, 2.8, 0, tau);
                ctx.fill();
            } else {
                ctx.strokeStyle = `rgb(${color})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y - 7);
                ctx.lineTo(x + 20, y - 7);
                ctx.stroke();
            }
            ctx.restore();
            ctx.fillStyle = `rgb(${colors.text.join(",")})`;
            ctx.fillText(label, x + 26, y - 4);
        });
    }

    function updateRuleCurveSummary(fields, sourceNode, report, sourceReport) {
        if (!fields || !report || !Array.isArray(report.boundary_curves)) {
            return;
        }
        const curves = generatedFigureCurves(report);
        const sourceCurves = sourceFigureCurves(sourceReport);
        const pointCount = curves.reduce((sum, curve) => sum + (curve.point_count || 0), 0);
        const sourcePointCount = sourceCurves.reduce((sum, curve) => sum + (curve.point_count || 0), 0);
        const plus = curves.filter((curve) => curve.kind === "plus_one_to_one").length;
        const minus = curves.filter((curve) => curve.kind === "minus_period_doubling").length;
        const comparison = report.source_curve_comparison || {};
        const objective = comparison.fit_objective || {};
        const mapping = betaMapping(report);
        const meanContinuity = curves.length
            ? curves.reduce((sum, curve) => sum + (curve.continuity_score || 0), 0) / curves.length
            : 0;
        if (fields.parameter) {
            fields.parameter.textContent = report.parameter_set || "current defaults";
        }
        if (fields.curves) {
            fields.curves.textContent = `${sourceCurves.length || 0} source, ${minus + plus} generated`;
        }
        if (fields.points) {
            fields.points.textContent = `${sourcePointCount || 0} source, ${pointCount} generated`;
        }
        if (fields.residual) {
            fields.residual.textContent = Number.isFinite(mapping.rms)
                ? formatScientific(mapping.rms)
                : formatScientific(comparison.mean_rms_wave_number_error);
        }
        if (fields.continuity) {
            fields.continuity.textContent = Number.isFinite(objective.continuity_score)
                ? objective.continuity_score.toFixed(2)
                : meanContinuity.toFixed(2);
        }
        if (fields.axes) {
            fields.axes.textContent = `source beta = ${mapping.scale.toFixed(4)} x model beta${mapping.offset ? ` ${mapping.offset >= 0 ? "+" : "-"} ${Math.abs(mapping.offset).toFixed(4)}` : ""}`;
        }
        if (sourceNode) {
            const refinement = report.curve_refinement || {};
            const fitScore = Number.isFinite(objective.score) ? `, fit score ${formatScientific(objective.score)}` : "";
            const raw = Number.isFinite(mapping.rawRms) ? `, raw RMS ${formatScientific(mapping.rawRms)}` : "";
            sourceNode.textContent = `Source Figure 8C curves with generated samples on the domain-normalized beta axis: ${sourceCurves.length || 0} source branches, ${pointCount} generated points, tolerance ${formatScientific(refinement.tolerance)}${fitScore}${raw}.`;
        }
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
            this.sweepReport = null;
            this.mapReport = null;
            this.floquetBoundaryReport = null;
            this.sourceCurveReport = null;
            this.selectedMapPoint = null;
            this.sweepSource = root.querySelector("[data-rule-sweep-source]");
            this.mapSource = root.querySelector("[data-rule-map-source]");
            this.floquetSource = root.querySelector("[data-rule-floquet-source]");
            this.curveSource = root.querySelector("[data-rule-curve-source]");
            this.mapRoot = root.querySelector("[data-rule-map]");
            this.mapPreview = root.querySelector("[data-rule-map-preview]");
            this.curveCanvas = root.querySelector("[data-rule-curve-plot]");
            this.mapFields = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-map-field]")).map((node) => [
                    node.dataset.ruleMapField,
                    node,
                ]),
            );
            this.curveFields = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-curve-field]")).map((node) => [
                    node.dataset.ruleCurveField,
                    node,
                ]),
            );
            this.floquetFields = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-rule-floquet-field]")).map((node) => [
                    node.dataset.ruleFloquetField,
                    node,
                ]),
            );
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
                targetAmplitude: Number(node.dataset.ruleSweepAmplitude),
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
            this.loadSweepReport();
            this.loadMapReport();
            this.loadFloquetBoundaryReport();
            this.loadSourceCurveReport();
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
                this.renderCurvePlot();
            });
        }

        async loadSweepReport() {
            const source = this.root.dataset.ruleSweepSrc;
            if (!source) {
                if (this.sweepSource) {
                    this.sweepSource.textContent = "Using explanatory sweep projection.";
                }
                return;
            }
            try {
                const response = await window.fetch(source, { cache: "no-cache" });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const report = await response.json();
                if (report.model_family !== "rule_flicker_ei" || !Array.isArray(report.points)) {
                    throw new Error("Unexpected Rule sweep report shape");
                }
                this.sweepReport = report;
                if (this.sweepSource) {
                    const floquetCount = Array.isArray(report.floquet_reports) ? report.floquet_reports.length : 0;
                    this.sweepSource.textContent = `Simulator-backed Rule sweep: ${report.points.length} grid points, ${floquetCount} monodromy reports.`;
                }
                this.paintFloquet();
                this.needsPaint = true;
            } catch (error) {
                this.sweepReport = null;
                if (this.sweepSource) {
                    this.sweepSource.textContent = "Using explanatory sweep projection; simulator JSON was not available.";
                }
                this.paintFloquet();
            }
        }

        async loadMapReport() {
            const source = this.root.dataset.ruleMapSrc || this.root.dataset.ruleSweepSrc;
            if (!source || !this.mapRoot) {
                if (this.mapSource) {
                    this.mapSource.textContent = "Dense sweep map not configured.";
                }
                return;
            }
            try {
                const response = await window.fetch(source, { cache: "no-cache" });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const report = await response.json();
                if (report.model_family !== "rule_flicker_ei" || !Array.isArray(report.points)) {
                    throw new Error("Unexpected Rule map report shape");
                }
                this.mapReport = report;
                if (this.mapSource) {
                    const grid = report.grid || {};
                    this.mapSource.textContent = `Dense Rule sweep map: ${report.points.length} grid points, ${grid.period_steps || "?"} periods x ${grid.amplitude_steps || "?"} amplitudes.`;
                }
                this.renderMap();
            } catch (error) {
                this.mapReport = null;
                if (this.mapSource) {
                    this.mapSource.textContent = "Dense sweep map was not available.";
                }
                this.selectMapPoint(null);
            }
        }

        async loadFloquetBoundaryReport() {
            const source = this.root.dataset.ruleFloquetSrc;
            if (!source) {
                if (this.floquetSource) {
                    this.floquetSource.textContent = "Floquet boundary markers not configured.";
                }
                return;
            }
            try {
                const response = await window.fetch(source, { cache: "no-cache" });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const report = await response.json();
                if (report.model_family !== "rule_flicker_ei" || !Array.isArray(report.boundary_candidates)) {
                    throw new Error("Unexpected Rule Floquet report shape");
                }
                this.floquetBoundaryReport = report;
                if (this.floquetSource) {
                    const exact = report.boundary_candidates.filter((candidate) => candidate.evidence === "sign_change").length;
                    const nearest = report.boundary_candidates.length - exact;
                    const refined = Array.isArray(report.boundary_curves)
                        ? report.boundary_curves.reduce((sum, curve) => sum + (curve.point_count || 0), 0)
                        : 0;
                    const comparison = report.source_curve_comparison || {};
                    const objective = comparison.fit_objective || {};
                    const mapping =
                        comparison.domain_beta_mapping ||
                        comparison.scale_only_beta_mapping ||
                        comparison.affine_beta_mapping ||
                        {};
                    const fitText = Number.isFinite(objective.score) ? `, fit score ${formatScientific(objective.score)}` : "";
                    const betaText = Number.isFinite(mapping.rms_error) ? `, beta RMS ${formatScientific(mapping.rms_error)}` : "";
                    this.floquetSource.textContent = `First-pass Floquet markers: ${exact} sign-change crossings, ${refined} refined beta-curve points, ${nearest} nearest-threshold hints${fitText}${betaText}.`;
                }
                this.renderCurvePlot();
                if (this.mapReport) {
                    this.renderMap();
                }
            } catch (error) {
                this.floquetBoundaryReport = null;
                if (this.floquetSource) {
                    this.floquetSource.textContent = "Floquet boundary markers were not available.";
                }
                if (this.curveSource) {
                    this.curveSource.textContent = "Refined boundary curves were not available.";
                }
                if (this.selectedMapPoint) {
                    this.selectMapPoint(this.selectedMapPoint);
                }
            }
        }

        async loadSourceCurveReport() {
            const source = this.root.dataset.ruleSourceCurvesSrc;
            if (!source) {
                this.renderCurvePlot();
                return;
            }
            try {
                const response = await window.fetch(source, { cache: "no-cache" });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const report = await response.json();
                if (report.format !== "rule-2011-figure8-source-curves-v1" || !Array.isArray(report.curves)) {
                    throw new Error("Unexpected Rule source-curve report shape");
                }
                this.sourceCurveReport = report;
                this.renderCurvePlot();
            } catch (error) {
                this.sourceCurveReport = null;
                this.renderCurvePlot();
            }
        }

        renderCurvePlot() {
            renderRuleCurvePlot(this.curveCanvas, this.floquetBoundaryReport, this.sourceCurveReport);
            updateRuleCurveSummary(this.curveFields, this.curveSource, this.floquetBoundaryReport, this.sourceCurveReport);
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

        findSweepPoint(cell) {
            const points = this.sweepReport && Array.isArray(this.sweepReport.points) ? this.sweepReport.points : [];
            const candidates = points.filter((point) => Math.abs(point.period_ms - cell.periodMs) < 0.001);
            if (!candidates.length) {
                return null;
            }
            const targetAmplitude = Number.isFinite(cell.targetAmplitude) ? cell.targetAmplitude : this.controls.amplitude;
            const targetInhibition = this.controls.inhibition || 0;
            return candidates.reduce((best, point) => {
                const score =
                    Math.abs(point.amplitude - targetAmplitude) +
                    0.35 * Math.abs((point.stim_i_fraction || 0) - targetInhibition);
                if (!best || score < best.score) {
                    return { point, score };
                }
                return best;
            }, null).point;
        }

        paintFloquet() {
            const reports =
                this.sweepReport && Array.isArray(this.sweepReport.floquet_reports)
                    ? this.sweepReport.floquet_reports
                    : [];
            const closest = (periodMs) =>
                reports.reduce((best, report) => {
                    const distance = Math.abs(report.period_ms - periodMs);
                    if (!best || distance < best.distance) {
                        return { report, distance };
                    }
                    return best;
                }, null)?.report;
            if (this.floquetFields.low) {
                this.floquetFields.low.textContent = formatFloquetHint(closest(120));
            }
            if (this.floquetFields.mid) {
                this.floquetFields.mid.textContent = formatFloquetHint(closest(85));
            }
            if (this.floquetFields.high) {
                this.floquetFields.high.textContent = formatFloquetHint(closest(55));
            }
        }

        boundariesForPoint(point) {
            const candidates =
                this.floquetBoundaryReport && Array.isArray(this.floquetBoundaryReport.boundary_candidates)
                    ? this.floquetBoundaryReport.boundary_candidates
                    : [];
            if (!point || !candidates.length || !this.mapReport || !Array.isArray(this.mapReport.points)) {
                return [];
            }
            const periods = sortedUnique(this.mapReport.points.map((candidate) => candidate.period_ms));
            const amplitudes = sortedUnique(this.mapReport.points.map((candidate) => candidate.amplitude));
            const periodStep = medianStep(periods) || 10;
            const amplitudeStep = medianStep(amplitudes) || 0.2;
            return candidates
                .filter(
                    (candidate) =>
                        Math.abs(candidate.period_ms - point.period_ms) <= periodStep / 2 + 1e-6 &&
                        Math.abs(candidate.amplitude - point.amplitude) <= amplitudeStep / 2 + 1e-6 &&
                        Math.abs((candidate.stim_i_fraction || 0) - (point.stim_i_fraction || 0)) < 1e-6,
                )
                .sort((a, b) => {
                    const evidenceRank = (b.evidence === "sign_change") - (a.evidence === "sign_change");
                    if (evidenceRank) {
                        return evidenceRank;
                    }
                    return (b.confidence || 0) - (a.confidence || 0);
                });
        }

        renderMap() {
            if (!this.mapRoot || !this.mapReport || !Array.isArray(this.mapReport.points)) {
                return;
            }
            const points = this.mapReport.points;
            const periods = sortedUnique(points.map((point) => point.period_ms));
            const amplitudes = sortedUnique(points.map((point) => point.amplitude), true);
            this.mapRoot.textContent = "";
            this.mapRoot.style.gridTemplateColumns = `var(--rule-map-axis, 3.6rem) repeat(${periods.length}, minmax(var(--rule-map-cell, 1.7rem), 1fr))`;

            const corner = document.createElement("span");
            corner.className = "rule-explorer__map-axis";
            corner.textContent = "A / T";
            this.mapRoot.appendChild(corner);
            periods.forEach((period) => {
                const label = document.createElement("span");
                label.className = "rule-explorer__map-axis";
                label.textContent = `${period.toFixed(0)} ms`;
                this.mapRoot.appendChild(label);
            });

            amplitudes.forEach((amplitude) => {
                const label = document.createElement("span");
                label.className = "rule-explorer__map-axis";
                label.textContent = amplitude.toFixed(2);
                this.mapRoot.appendChild(label);
                periods.forEach((period) => {
                    const point = points.find(
                        (candidate) =>
                            Math.abs(candidate.period_ms - period) < 0.001 &&
                            Math.abs(candidate.amplitude - amplitude) < 0.001,
                    );
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "rule-explorer__map-cell";
                    button.dataset.regime = pointRegimeKey(point);
                    button.dataset.period = period.toFixed(6);
                    button.dataset.amplitude = amplitude.toFixed(6);
                    const boundary = point ? this.boundariesForPoint(point)[0] : null;
                    button.setAttribute(
                        "aria-label",
                        point
                            ? `${period.toFixed(0)} ms, amplitude ${amplitude.toFixed(2)}: ${pointRegime(point)}, ${point.spatial_family}${boundary ? `, Floquet ${floquetBoundaryLabel(boundary)}` : ""}`
                            : `${period.toFixed(0)} ms, amplitude ${amplitude.toFixed(2)}: no data`,
                    );
                    if (point) {
                        const intensity = clamp(point.pattern_strength * 90, 0.14, 1);
                        button.style.setProperty("--rule-map-weight", `${Math.round(intensity * 100)}%`);
                        if (boundary) {
                            const marker = document.createElement("span");
                            marker.className = "rule-explorer__map-marker";
                            marker.dataset.kind = floquetBoundaryKey(boundary.kind);
                            marker.dataset.evidence = boundary.evidence || "unknown";
                            marker.textContent = floquetBoundaryShortLabel(boundary.kind);
                            button.appendChild(marker);
                        }
                        button.addEventListener("click", () => this.selectMapPoint(point));
                    } else {
                        button.disabled = true;
                    }
                    this.mapRoot.appendChild(button);
                });
            });

            const defaultPoint =
                points.find((point) => Math.abs(point.period_ms - 120) < 0.001 && Math.abs(point.amplitude - 1) < 0.001) ||
                points.find((point) => point.status_level !== "suppressed") ||
                points[0] ||
                null;
            this.selectMapPoint(defaultPoint);
        }

        selectMapPoint(point) {
            this.selectedMapPoint = point;
            if (this.mapRoot) {
                Array.from(this.mapRoot.querySelectorAll(".rule-explorer__map-cell")).forEach((cell) => {
                    const isSelected =
                        point &&
                        Math.abs(Number(cell.dataset.period) - point.period_ms) < 0.001 &&
                        Math.abs(Number(cell.dataset.amplitude) - point.amplitude) < 0.001;
                    cell.classList.toggle("is-selected", Boolean(isSelected));
                });
            }
            if (this.mapPreview && point) {
                drawThumbnail(this.mapPreview, point.thumbnail);
            }
            if (this.mapFields.point) {
                this.mapFields.point.textContent = point
                    ? `${point.period_ms.toFixed(0)} ms, amplitude ${point.amplitude.toFixed(2)}`
                    : "available after report load";
            }
            if (this.mapFields.regime) {
                this.mapFields.regime.textContent = point ? `${pointRegime(point)}; ${point.status_level}` : "available after report load";
            }
            if (this.mapFields.spatial) {
                this.mapFields.spatial.textContent = pointSpatialLabel(point);
            }
            if (this.mapFields.temporal) {
                this.mapFields.temporal.textContent = pointTemporalLabel(point);
            }
            if (this.mapFields.floquet) {
                const boundaries = this.boundariesForPoint(point);
                this.mapFields.floquet.textContent = point
                    ? boundaries.length
                        ? boundaries.slice(0, 2).map(floquetBoundaryLabel).join("; ")
                        : "no nearby boundary hint"
                    : "available after report load";
            }
            if (this.mapFields.note) {
                this.mapFields.note.textContent = point ? point.classification_note : "available after report load";
            }
        }

        paintSweep() {
            const phase = this.trace ? this.time / this.trace.duration : 0;
            this.sweepCells.forEach((cell) => {
                const point = this.findSweepPoint(cell);
                if (point && drawThumbnail(cell.canvas, point.thumbnail)) {
                    cell.regime.textContent =
                        point.status_level === "suppressed" ? "weak / near homogeneous" : formatResponseMode(point.response_mode);
                    cell.modes.textContent =
                        point.spatial_family === "homogeneous"
                            ? "homogeneous"
                            : `${point.spatial_family}, ${point.dominant_cycles.toFixed(1)} cyc`;
                    cell.peak.textContent = point.peak_activity.toFixed(2);
                    return;
                }
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

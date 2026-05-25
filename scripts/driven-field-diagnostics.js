(function () {
    const roots = Array.from(document.querySelectorAll("[data-driven-diagnostics]"));
    if (!roots.length) {
        return;
    }

    const DEFAULT_SOURCES = {
        registry: "/assets/bressloff-v1/driven/driven-neural-fields-registry.json",
        mackay: "/assets/bressloff-v1/driven/mackay-localized-input.json",
        bolelli: "/assets/bressloff-v1/driven/bolelli-time-periodic-input.json",
        nicks: "/assets/bressloff-v1/driven/nicks-orthogonal-response.json",
    };

    function fieldMap(root) {
        return Object.fromEntries(
            Array.from(root.querySelectorAll("[data-driven-field]")).map((node) => [
                node.dataset.drivenField,
                node,
            ]),
        );
    }

    function sourceFor(root, key) {
        const attr = `driven${key.charAt(0).toUpperCase()}${key.slice(1)}Src`;
        return root.dataset[attr] || DEFAULT_SOURCES[key];
    }

    async function loadJson(source) {
        const response = await fetch(source, { cache: "no-cache" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }

    function setText(fields, key, value) {
        if (fields[key]) {
            fields[key].textContent = value;
        }
    }

    function number(value, digits) {
        if (!Number.isFinite(value)) {
            return "n/a";
        }
        return value.toFixed(digits);
    }

    function scientific(value) {
        if (!Number.isFinite(value)) {
            return "n/a";
        }
        return value.toExponential(2);
    }

    function nearestRow(rows, key, target) {
        return rows.reduce((best, row) => {
            const distance = Math.abs((row[key] || 0) - target);
            if (!best || distance < best.distance) {
                return { row, distance };
            }
            return best;
        }, null)?.row;
    }

    function decodeBase64(data) {
        const raw = atob(data || "");
        const bytes = new Uint8ClampedArray(raw.length);
        for (let index = 0; index < raw.length; index += 1) {
            bytes[index] = raw.charCodeAt(index);
        }
        return bytes;
    }

    function drawThumbnail(canvas, thumbnail) {
        if (!canvas || !thumbnail || !thumbnail.data_base64) {
            return;
        }
        const sourceWidth = Number(thumbnail.width) || 1;
        const sourceHeight = Number(thumbnail.height) || 1;
        const drawHeight = sourceHeight === 1 ? 40 : sourceHeight;
        const bytes = decodeBase64(thumbnail.data_base64);
        const ctx = canvas.getContext("2d");
        const image = ctx.createImageData(sourceWidth, drawHeight);
        for (let y = 0; y < drawHeight; y += 1) {
            const sourceY = sourceHeight === 1 ? 0 : Math.min(sourceHeight - 1, y);
            for (let x = 0; x < sourceWidth; x += 1) {
                const value = bytes[sourceY * sourceWidth + x] || 0;
                const index = (y * sourceWidth + x) * 4;
                image.data[index] = value;
                image.data[index + 1] = value;
                image.data[index + 2] = value;
                image.data[index + 3] = 255;
            }
        }
        canvas.width = sourceWidth;
        canvas.height = drawHeight;
        ctx.putImageData(image, 0, 0);
    }

    function updateReportSummary(root, reports) {
        const fields = fieldMap(root);
        const registryExamples = Array.isArray(reports.registry.examples)
            ? reports.registry.examples
            : [];
        const implementedCount =
            reports.registry.implemented_count ||
            registryExamples.filter((example) => example.implementation_status === "implemented").length;
        const partialCount = registryExamples.filter(
            (example) => example.implementation_status === "partial",
        ).length;
        const mackayExamples = Array.isArray(reports.mackay.examples) ? reports.mackay.examples : [];
        const bolelliRows = Array.isArray(reports.bolelli.frequency_sweep)
            ? reports.bolelli.frequency_sweep
            : [];
        const nicksRows = Array.isArray(reports.nicks.parameter_sweep)
            ? reports.nicks.parameter_sweep
            : [];
        const mackayFirst = mackayExamples[0] || {};
        const bolelliRepresentative = nearestRow(bolelliRows, "frequency_lambda", 20) || {};
        const bolelliTarget = bolelliRepresentative.source_target || {};
        const nicksOrthogonalRows = nicksRows.filter((row) =>
            String(row.metrics?.classification || "").includes("orthogonal"),
        );
        const bestNicks = nicksOrthogonalRows.reduce((best, row) => {
            const error = row.wavevectors?.orthogonality_error_degrees;
            if (!Number.isFinite(error)) {
                return best;
            }
            if (!best || error < best.error) {
                return { row, error };
            }
            return best;
        }, null)?.row;
        const sourceTargetCount =
            bolelliRows.filter((row) => row.source_target?.source_target_comparison).length +
            nicksRows.filter((row) => row.source_target?.source_target_comparison).length;

        setText(fields, "registryCount", String(registryExamples.length));
        setText(fields, "implementedCount", `${implementedCount} implemented`);
        setText(fields, "partialCount", `${partialCount} partial`);
        setText(fields, "reportCount", "3 generated reports");
        setText(fields, "claimLevel", `${sourceTargetCount} source-target diagnostics; calibrated=false`);
        setText(
            fields,
            "mackaySummary",
            `${mackayExamples.length} generated examples; residual ${scientific(mackayFirst.fixed_point?.residual_linf)}`,
        );
        setText(
            fields,
            "bolelliSummary",
            `${bolelliRows.filter((row) => row.metrics?.locked).length}/${bolelliRows.length} period-locked frequency rows`,
        );
        setText(
            fields,
            "bolelliDetail",
            `lambda ${number(bolelliRepresentative.frequency_lambda, 0)}, residual ${scientific(bolelliRepresentative.metrics?.periodic_residual_linf)}, generated width ${number(bolelliRepresentative.metrics?.stripe_width_half_max, 2)}, pole target ${number(bolelliTarget.target_width_principal_pole, 2)}`,
        );
        setText(
            fields,
            "nicksSummary",
            `${nicksOrthogonalRows.length}/${nicksRows.length} orthogonal-response sweep rows`,
        );
        setText(
            fields,
            "nicksDetail",
            bestNicks
                ? `detuning ${number(bestNicks.detuning_fraction, 2)}, target angle ${number(bestNicks.source_target?.target_response_angle_degrees, 1)} deg, angle error ${number(bestNicks.source_target?.angle_error_degrees, 1)} deg`
                : "orthogonal-response rows unavailable",
        );
        setText(
            fields,
            "reportFormats",
            [
                reports.registry.format,
                reports.mackay.format,
                reports.bolelli.format,
                reports.nicks.format,
            ]
                .filter(Boolean)
                .join("; "),
        );

        drawThumbnail(
            root.querySelector("[data-driven-canvas=\"mackay\"]"),
            mackayFirst.output_thumbnail,
        );
        drawThumbnail(
            root.querySelector("[data-driven-canvas=\"bolelli\"]"),
            reports.bolelli.examples?.[0]?.amplitude_thumbnail,
        );
        drawThumbnail(
            root.querySelector("[data-driven-canvas=\"nicks\"]"),
            reports.nicks.examples?.[2]?.retinal_response_thumbnail ||
                reports.nicks.examples?.[0]?.cortical_response_thumbnail,
        );
    }

    async function init(root) {
        const fields = fieldMap(root);
        try {
            const [registry, mackay, bolelli, nicks] = await Promise.all([
                loadJson(sourceFor(root, "registry")),
                loadJson(sourceFor(root, "mackay")),
                loadJson(sourceFor(root, "bolelli")),
                loadJson(sourceFor(root, "nicks")),
            ]);
            updateReportSummary(root, { registry, mackay, bolelli, nicks });
            setText(fields, "source", "Generated public report JSON loaded; PDFs and source figures remain private.");
        } catch (error) {
            setText(fields, "source", "Driven report JSON was not available.");
            root.dataset.loadError = String(error.message || error);
        }
    }

    roots.forEach(init);
})();

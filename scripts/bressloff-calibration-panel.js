(() => {
    const roots = Array.from(document.querySelectorAll("[data-bressloff-calibration]"));
    if (!roots.length) {
        return;
    }

    function formatNumber(value, digits = 3) {
        return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
    }

    function decodeFrame(image) {
        if (!image || image.encoding !== "base64" || !image.data_base64) {
            return null;
        }
        const raw = window.atob(image.data_base64);
        const values = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i += 1) {
            values[i] = raw.charCodeAt(i);
        }
        return values;
    }

    function drawStill(canvas, still) {
        const width = still.width || 1;
        const height = still.height || 1;
        const values = decodeFrame(still.image);
        if (!values || values.length < width * height) {
            return false;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        const data = ctx.createImageData(width, height);
        for (let i = 0; i < width * height; i += 1) {
            const value = values[i];
            const j = i * 4;
            data.data[j] = value;
            data.data[j + 1] = value;
            data.data[j + 2] = value;
            data.data[j + 3] = 255;
        }
        ctx.putImageData(data, 0, 0);
        return true;
    }

    function comparisonLabel(comparison) {
        if (!comparison || comparison.status !== "compared") {
            return "awaiting private numeric source profile";
        }
        const radial = formatNumber(comparison.radial_profile_error);
        const angular = formatNumber(comparison.angular_profile_error);
        const edge = formatNumber(comparison.edge_overlap);
        return `radial ${radial}, angular ${angular}, edge overlap ${edge}`;
    }

    function renderGrid(root, report) {
        const grid = root.querySelector("[data-bressloff-calibration-grid]");
        if (!grid) {
            return;
        }
        grid.textContent = "";
        const stills = Array.isArray(report.stills) ? report.stills : [];
        stills.slice(0, 16).forEach((still) => {
            const article = document.createElement("article");
            article.className = "bressloff-calibration-card";

            const canvas = document.createElement("canvas");
            canvas.setAttribute("aria-label", `${still.preset?.paper_figure || "Bressloff"} generated still`);
            drawStill(canvas, still);

            const title = document.createElement("h3");
            title.textContent = still.preset?.paper_figure || still.preset?.id || "Bressloff still";

            const subtitle = document.createElement("p");
            subtitle.textContent = still.preset?.label || still.rendered_pattern || "generated target";

            const dl = document.createElement("dl");
            [
                ["Pattern", still.rendered_pattern || "n/a"],
                ["Family", still.selected_family || "n/a"],
                ["Edge", formatNumber(still.metrics?.edge_density)],
                ["Active", formatNumber(still.metrics?.active_fraction)],
                ["Angle", `${formatNumber(still.metrics?.dominant_angle_degrees, 1)} deg`],
                ["Source", comparisonLabel(still.source_comparison)],
            ].forEach(([label, value]) => {
                const row = document.createElement("div");
                const dt = document.createElement("dt");
                const dd = document.createElement("dd");
                dt.textContent = label;
                dd.textContent = value;
                row.append(dt, dd);
                dl.appendChild(row);
            });

            article.append(canvas, title, subtitle, dl);
            grid.appendChild(article);
        });
    }

    function updateSummary(root, report) {
        const fields = Object.fromEntries(
            Array.from(root.querySelectorAll("[data-bressloff-calibration-field]")).map((node) => [
                node.dataset.bressloffCalibrationField,
                node,
            ]),
        );
        const stills = Array.isArray(report.stills) ? report.stills : [];
        const meanEdge = stills.length
            ? stills.reduce((sum, still) => sum + (still.metrics?.edge_density || 0), 0) / stills.length
            : 0;
        if (fields.format) {
            fields.format.textContent = report.format || "unknown";
        }
        if (fields.stills) {
            fields.stills.textContent = String(report.still_count || stills.length || 0);
        }
        if (fields.compared) {
            fields.compared.textContent = `${report.compared_still_count || 0} compared`;
        }
        if (fields.edge) {
            fields.edge.textContent = formatNumber(meanEdge);
        }
        if (fields.source) {
            fields.source.textContent = `${report.status || "loaded"}; source crops are excluded from this public page.`;
        }
    }

    async function load(root) {
        const source = root.dataset.bressloffGeometrySrc;
        if (!source) {
            return;
        }
        try {
            const response = await window.fetch(source, { cache: "no-cache" });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const report = await response.json();
            updateSummary(root, report);
            renderGrid(root, report);
        } catch (error) {
            const sourceField = root.querySelector("[data-bressloff-calibration-field=\"source\"]");
            if (sourceField) {
                sourceField.textContent = "Bressloff geometry report was not available.";
            }
        }
    }

    roots.forEach(load);
})();

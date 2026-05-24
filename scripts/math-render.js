document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderMathInElement !== "function") {
        return;
    }

    document.querySelectorAll("[data-math-render]").forEach((root) => {
        renderMathInElement(root, {
            delimiters: [
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
            ],
            throwOnError: false,
            strict: "warn",
        });
    });
});

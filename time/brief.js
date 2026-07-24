document.querySelectorAll("[data-details-toggle]").forEach((button) => {
    const scope = button.closest("main") || document;
    const details = Array.from(scope.querySelectorAll("details.tech-detail"));

    const refreshLabel = () => {
        const allOpen = details.length > 0 && details.every((item) => item.open);
        button.textContent = allOpen ? "Close all technical details" : "Open all technical details";
        button.setAttribute("aria-expanded", String(allOpen));
    };

    button.addEventListener("click", () => {
        const shouldOpen = details.some((item) => !item.open);
        details.forEach((item) => {
            item.open = shouldOpen;
        });
        refreshLabel();
    });

    details.forEach((item) => {
        item.addEventListener("toggle", refreshLabel);
    });

    refreshLabel();
});

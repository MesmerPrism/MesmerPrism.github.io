"use strict";

(() => {
  const grid = document.getElementById("product-grid");
  const status = document.getElementById("catalog-status");
  const knownOwners = new Set([
    "questionable-file-manager",
    "rusty-fleet",
    "rusty-kiosk",
    "rusty-quest-package-updater"
  ]);

  const element = (name, className, text) => {
    const node = document.createElement(name);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  };

  const requireCatalogShape = (catalog) => {
    if (!catalog ||
        catalog.schema !== "rusty.morphospace.public_distribution_catalog.v1" ||
        catalog.default_channel !== "stable" ||
        !Array.isArray(catalog.products) ||
        catalog.products.length !== 4) {
      throw new Error("Catalog shape is not supported.");
    }
    for (const product of catalog.products) {
      const repository = new URL(product.repository);
      const feedback = new URL(product.feedback.issue_url);
      if (!knownOwners.has(product.owner) ||
          repository.protocol !== "https:" ||
          repository.hostname !== "github.com" ||
          feedback.origin !== repository.origin ||
          feedback.pathname !== `${repository.pathname}/issues/new` ||
          !Array.isArray(product.channels) ||
          product.channels.length < 1 ||
          product.channels.some((entry) =>
            entry.channel !== "stable" && entry.channel !== "alpha")) {
        throw new Error("Catalog owner, feedback, or channel is invalid.");
      }
    }
    return catalog;
  };

  const addIdentity = (container, channel) => {
    const identity = channel.identity.installation_identity;
    if (identity === null) {
      container.append(
        element("p", null, "Exact installation identity: supplied only by owner release metadata.")
      );
      return;
    }
    const paragraph = element("p");
    paragraph.append("Installation identity: ");
    paragraph.append(element("code", null, identity));
    container.append(paragraph);
  };

  const addTransition = (container, channel) => {
    if (channel.identity.relationship_to_stable === "same-package-in-place") {
      const warning = element("div", "notice warning");
      warning.append(
        element("strong", null, "Not coinstallable and not directly reversible. ")
      );
      warning.append(
        "Installing alpha replaces the installed stable package in place. " +
        "Android will not accept a lower-version downgrade. Exit by installing " +
        "a later, same-signer stable release with a higher version code."
      );
      container.append(warning);
    } else if (channel.transition === "remove-alpha") {
      container.append(
        element(
          "p",
          null,
          "Removing alpha removes this product; no stable package is asserted."
        )
      );
    } else if (channel.channel === "alpha") {
      container.append(
        element(
          "p",
          null,
          "This separate alpha identity can be removed without changing stable."
        )
      );
    }
  };

  const addRelease = (container, product, channel) => {
    if (channel.availability === "unpublished") {
      container.append(element("p", "availability", "No cataloged release yet."));
      return;
    }
    const release = channel.release;
    const expected = `${product.repository}/releases/download/${release.tag}/${release.artifact_name}`;
    if (release.artifact_url !== expected ||
        (channel.identity.installation_identity !== null &&
         release.installation_identity !== channel.identity.installation_identity)) {
      throw new Error("Published release does not match its owner channel.");
    }
    const details = element("dl", "release-provenance");
    for (const [term, value] of [
      ["Version", release.version],
      ["Source revision", release.source_revision],
      ["Artifact SHA-256", release.artifact_sha256]
    ]) {
      details.append(element("dt", null, term));
      details.append(element("dd", null, value));
    }
    container.append(details);
    const download = element("a", "download-link", `Download ${release.artifact_name}`);
    download.href = release.artifact_url;
    download.rel = "noopener noreferrer";
    container.append(download);
  };

  const renderProduct = (product) => {
    const card = element("article", "product-card");
    const header = element("header");
    const platforms = [...new Set(product.channels.map(
      (channel) => channel.identity.platform === "windows" ? "Windows" : "Android / Quest"
    ))];
    header.append(element("p", "platform", platforms.join(" · ")));
    header.append(element("h3", null, product.name));
    card.append(header);

    if (!product.channels.some((channel) => channel.channel === "stable")) {
      card.append(
        element(
          "p",
          "availability",
          "Owner channel: alpha only. No stable package or identity is asserted."
        )
      );
    }

    for (const channel of product.channels) {
      const section = element("section", "channel-section");
      const label = channel.channel === "alpha" ? "Alpha · opt in" : "Stable · default";
      section.append(element("h4", `channel ${channel.channel}`, label));
      addIdentity(section, channel);
      addTransition(section, channel);
      addRelease(section, product, channel);
      card.append(section);
    }

    const feedback = element("a", "feedback-link", "Send owner feedback");
    feedback.href = product.feedback.issue_url;
    feedback.target = "_blank";
    feedback.rel = "noopener noreferrer";
    card.append(feedback);
    return card;
  };

  fetch("catalog.json", {
    credentials: "same-origin",
    cache: "no-store"
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Catalog could not be loaded.");
      }
      return response.json();
    })
    .then(requireCatalogShape)
    .then((catalog) => {
      const fragment = document.createDocumentFragment();
      for (const product of catalog.products) {
        fragment.append(renderProduct(product));
      }
      grid.replaceChildren(fragment);
      grid.setAttribute("aria-busy", "false");
    })
    .catch(() => {
      status.textContent =
        "Catalog metadata could not be validated. No release links are shown.";
      grid.setAttribute("aria-busy", "false");
    });
})();

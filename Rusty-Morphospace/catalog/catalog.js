"use strict";

(() => {
  const grid = document.getElementById("product-grid");
  const status = document.getElementById("catalog-status");
  const knownOwners = new Set([
    "questionable-file-manager",
    "rusty-fleet",
    "rusty-hostess",
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
        catalog.schema !== "rusty.morphospace.public_distribution_catalog.v2" ||
        catalog.default_product_channel !== "stable" ||
        !Array.isArray(catalog.products) ||
        catalog.products.length !== 5) {
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
          !Array.isArray(product.product_channels) ||
          product.product_channels.length < 1 ||
          product.product_channels.some((entry) =>
            (entry.product_channel !== "stable" && entry.product_channel !== "labs") ||
            !["alpha", "beta", "rc", "released"].includes(entry.maturity) ||
            !["github-release", "github-prerelease", "meta-store-app"].includes(entry.distribution_track))) {
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
        "Installing labs replaces the installed stable package in place. " +
        "Android will not accept a lower-version downgrade. Exit by installing " +
        "a later, same-signer stable release with a higher version code."
      );
      container.append(warning);
    } else if (channel.transition === "remove-labs" ||
               channel.transition === "remove-labs-without-changing-other-products") {
      container.append(
        element(
          "p",
          null,
          channel.transition === "remove-labs-without-changing-other-products"
            ? "Removing labs removes only this separate product identity and does not change other products."
            : "Removing labs removes this product; no stable package is asserted."
        )
      );
    } else if (channel.product_channel === "labs") {
      container.append(
        element(
          "p",
          null,
          "This separate labs identity can be removed without changing stable."
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
    const platforms = [...new Set(product.product_channels.map(
      (channel) => channel.identity.platform === "windows" ? "Windows" : "Android / Quest"
    ))];
    header.append(element("p", "platform", platforms.join(" · ")));
    header.append(element("h3", null, product.name));
    card.append(header);

    if (!product.product_channels.some((channel) => channel.product_channel === "stable")) {
      card.append(
        element(
          "p",
          "availability",
          "Owner channel: labs only. No stable package or identity is asserted."
        )
      );
    }
    if (product.distribution_notes) {
      const notes = element("section", "product-scope");
      notes.append(element("h4", null, "Complete-product scope"));
      notes.append(element(
        "p", null, `Included: ${product.distribution_notes.included.join("; ")}.`
      ));
      notes.append(element(
        "p", null, `External: ${product.distribution_notes.external.join("; ")}.`
      ));
      notes.append(element(
        "p", null,
        `Not claimed: ${product.distribution_notes.authority_exclusions.join("; ")}.`
      ));
      notes.append(element("p", null, product.distribution_notes.removal));
      card.append(notes);
    }

    for (const channel of product.product_channels) {
      const section = element("section", "channel-section");
      const label = channel.product_channel === "labs" ? "Labs · opt in" : "Stable · default";
      section.append(element("h4", `channel ${channel.product_channel}`, label));
      const axes = element("dl", "release-provenance");
      for (const [term, value] of [
        ["Product channel", channel.product_channel],
        ["Maturity", channel.maturity],
        ["Distribution track", channel.distribution_track]
      ]) {
        axes.append(element("dt", null, term));
        axes.append(element("dd", null, value));
      }
      section.append(axes);
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

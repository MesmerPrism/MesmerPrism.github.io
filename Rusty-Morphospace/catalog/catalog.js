"use strict";

(() => {
  const grid = document.getElementById("product-grid");
  const status = document.getElementById("catalog-status");
  const knownOwners = new Set([
    "questionable-file-manager",
    "rusty-fleet",
    "rusty-hostess",
    "rusty-kiosk",
    "rusty-quest-package-updater",
    "rusty-connection-hub"
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
        catalog.products.length !== 6) {
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
    const hub = catalog.products.find(
      (product) => product.owner === "rusty-connection-hub"
    );
    const notice = hub && hub.security_notice;
    const routes = hub && hub.companion_routes;
    if (!notice ||
        notice.transport_classification !== "trusted_lan_experimental" ||
        notice.confidentiality !== "none" ||
        notice.production_eligible !== false ||
        notice.pairing_authenticates_but_does_not_encrypt !== true ||
        notice.listener_default !== "stopped" ||
        notice.explicit_wearer_opt_in_required !== true ||
        !Array.isArray(routes) ||
        routes.length !== 2 ||
        routes[0].owner !== "questionable-file-manager" ||
        routes[0].product_channel !== "labs" ||
        routes[0].purpose !== "quest-installation" ||
        routes[0].relationship !== "distinct-product" ||
        routes[1].owner !== "rusty-hostess" ||
        routes[1].product_channel !== "labs" ||
        routes[1].purpose !== "windows-control-companion" ||
        routes[1].relationship !== "distinct-product" ||
        catalog.products.some((product) =>
          product.owner !== "rusty-connection-hub" &&
          (product.security_notice !== undefined ||
           product.companion_routes !== undefined))) {
      throw new Error("Connection Hub safety or companion contract is invalid.");
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
    card.id = `product-${product.owner}`;
    const header = element("header");
    const platforms = [...new Set(product.product_channels.map(
      (channel) => channel.identity.platform === "windows" ? "Windows" : "Android / Quest"
    ))];
    header.append(element("p", "platform", platforms.join(" · ")));
    header.append(element("h3", null, product.name));
    card.append(header);

    if (product.security_notice) {
      const warning = element("div", "notice warning");
      warning.append(
        element("strong", null, "Experimental plaintext trusted-LAN control. ")
      );
      warning.append(
        "This option has no confidentiality and is not production eligible. " +
        "Pairing authenticates a controller but does not encrypt the WebSocket. " +
        "The listener starts stopped and requires explicit wearer opt-in."
      );
      card.append(warning);
    }

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
    if (product.companion_routes) {
      const companionNames = {
        "questionable-file-manager": "QuestIonAble File Manager Labs",
        "rusty-hostess": "Rusty Hostess Labs"
      };
      const routes = element("section", "product-scope");
      routes.append(element("h4", null, "Distinct companion routes"));
      routes.append(element(
        "p",
        null,
        "Connection Hub has no standalone guided installer. These links open " +
        "separate owner product cards; they do not make either companion part " +
        "of the Hub package or release authority."
      ));
      for (const route of product.companion_routes) {
        const paragraph = element("p");
        const link = element("a", "companion-link", companionNames[route.owner]);
        link.href = `#product-${route.owner}`;
        paragraph.append(link);
        paragraph.append(
          route.purpose === "quest-installation"
            ? " — separate Quest installation route."
            : " — separate Windows control companion."
        );
        routes.append(paragraph);
      }
      card.append(routes);
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

const NAV_ITEMS = [
  {
    view: "home-overview",
    icon: "O",
    label: "Oggi"
  },
  {
    view: "security-detail",
    icon: "T",
    label: "Titoli"
  },
  {
    view: "peer-compare",
    icon: "P",
    label: "Peer"
  },
  {
    view: "congress-disclosures",
    icon: "C",
    label: "Congress"
  },
  {
    view: "data-quality-panel",
    icon: "Q",
    label: "Qualita"
  }
];

let currentView = "home-overview";

if (typeof window !== "undefined") {
  window.openIphoneTab = renderTabView;
  window.setCurrentView = renderTabView;
  window.setActiveView = renderTabView;
  window.navigateToView = renderTabView;

  window.addEventListener("hashchange", () => {
    const hashView = window.location.hash.replace("#", "");

    if (hashView) {
      renderTabView(hashView);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      currentView = normalizeView(window.location.hash.replace("#", ""));
      ensureIphoneTabbar();
      updateActiveTab(currentView);
    });
  } else {
    currentView = normalizeView(window.location.hash.replace("#", ""));
    ensureIphoneTabbar();
    updateActiveTab(currentView);
  }

  setTimeout(() => {
    ensureIphoneTabbar();
    updateActiveTab(currentView);
  }, 250);
}

async function renderTabView(view) {
  if (typeof document === "undefined") {
    return;
  }

  const normalizedView = normalizeView(view);
  const appRoot = document.querySelector("#app");

  if (!appRoot) {
    return;
  }

  try {
    currentView = normalizedView;
    appRoot.innerHTML = await renderPageHtml(normalizedView);
    ensureIphoneTabbar();
    updateActiveTab(normalizedView);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  } catch (error) {
    renderError(appRoot, error);
    ensureIphoneTabbar();
    updateActiveTab(normalizedView);
  }
}

async function renderPageHtml(view) {
  if (view === "home-overview") {
    const module = await import("./pages/home-overview.js");
    return module.renderHomeOverviewPage();
  }

  if (view === "security-detail") {
    const pageModule = await import("./pages/security-detail.js");
    const dataModule = await import("./data/mock-securities.js");

    const security =
      dataModule.mockSecurities && dataModule.mockSecurities.length
        ? dataModule.mockSecurities[0]
        : {
            symbol: "AAPL",
            ticker: "AAPL",
            name: "Apple Inc."
          };

    return pageModule.renderSecurityDetail(security);
  }

  if (view === "peer-compare") {
    const module = await import("./pages/peer-compare.js");
    return module.renderPeerComparePage();
  }

  if (view === "congress-disclosures") {
    const module = await import("./pages/congress-disclosures.js");
    return module.renderCongressDisclosuresPage();
  }

  if (view === "data-quality-panel") {
    const module = await import("./pages/data-quality-panel.js");
    return module.renderDataQualityPanelPage();
  }

  const fallbackModule = await import("./pages/home-overview.js");
  return fallbackModule.renderHomeOverviewPage();
}

function ensureIphoneTabbar() {
  if (typeof document === "undefined") {
    return;
  }

  let nav = document.querySelector(".iphone-tabbar");

  if (!nav) {
    nav = document.createElement("nav");
    nav.className = "iphone-tabbar";
    nav.setAttribute("aria-label", "Primary");
    document.body.appendChild(nav);
  }

  nav.replaceChildren();

  NAV_ITEMS.forEach((item) => {
    const button = document.createElement("button");
    button.className = "iphone-tabbar__item";
    button.type = "button";
    button.dataset.view = item.view;
    button.setAttribute("aria-label", item.label);

    const icon = document.createElement("span");
    icon.className = "iphone-tabbar__icon";
    icon.textContent = item.icon;

    const label = document.createElement("span");
    label.className = "iphone-tabbar__label";
    label.textContent = item.label;

    button.appendChild(icon);
    button.appendChild(label);

    button.addEventListener("click", () => {
      renderTabView(item.view);
      history.replaceState(null, "", "#" + item.view);
    });

    nav.appendChild(button);
  });

  updateActiveTab(currentView);
}

function updateActiveTab(view) {
  if (typeof document === "undefined") {
    return;
  }

  const normalizedView = normalizeView(view);

  document.querySelectorAll(".iphone-tabbar__item").forEach((button) => {
    const isActive = button.dataset.view === normalizedView;
    button.classList.toggle("iphone-tabbar__item--active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function normalizeView(view) {
  const value = String(view || "").replace(/^#/, "").trim();

  if (!value || value === "dashboard") {
    return "home-overview";
  }

  if (value === "quality") {
    return "data-quality-panel";
  }

  if (value === "congress") {
    return "congress-disclosures";
  }

  if (value === "titoli" || value === "symbols" || value === "ticker") {
    return "security-detail";
  }

  return value;
}

function renderError(appRoot, error) {
  appRoot.innerHTML = "";

  const section = document.createElement("section");
  section.className = "panel";

  const title = document.createElement("h1");
  title.textContent = "Errore schermata";

  const paragraph = document.createElement("p");
  paragraph.textContent = "Non e stato possibile aprire la sezione richiesta.";

  const audit = document.createElement("section");
  audit.className = "audit-box";

  const detail = document.createElement("p");
  detail.textContent = "Dettaglio: " + String(error && error.message ? error.message : error);

  audit.appendChild(detail);
  section.appendChild(title);
  section.appendChild(paragraph);
  section.appendChild(audit);
  appRoot.appendChild(section);
}

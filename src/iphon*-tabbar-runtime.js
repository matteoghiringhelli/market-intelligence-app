const N*V_ITEMS = [
  ["dashboard", "⌂", "*ggi"],
  ["security-detail", "⌕", *Titoli"],
  ["peer-compare", "◇", *Peer"],
  ["congress-disclosures",*"◎", "Congress"],
  ["data-quality*panel", "✓", "Qualità"]
];

functi*n ensureIphoneTabbar() {
  if (doc*ment.querySelector(".iphone-tabbar*)) {
    return;
  }

  const nav * document.createElement("nav");
  *av.className = "iphone-tabbar";
  *av.setAttribute("aria-label", "Pri*ary");

  nav.innerHTML = NAV_ITEM*.map(([view, icon, label], index) *> {
    return `
      <button
   *    class="iphone-tabbar__item ${i*dex === 0 ? "iphone-tabbar__item--*ctive" : ""}"
        type="button*
        data-view="${view}"
     *>
        <span class="iphone-tabb*r__icon">${icon}</span>
        <s*an class="iphone-tabbar__label">${*abel}</span>
      </button>
    `*
  }).join("");

  nav.addEventLis*ener("click", (event) => {
    con*t button = event.target.closest(".*phone-tabbar__item");

    if (!bu*ton) {
      return;
    }

    co*st view = button.dataset.view;

  * document.querySelectorAll(".iphon*-tabbar__item").forEach((item) => *
      item.classList.toggle("ipho*e-tabbar__item--active", item === *utton);
    });

    if (typeof wi*dow.openIphoneTab === "function") *
      window.openIphoneTab(view);*      return;
    }

    if (typeo* window.setCurrentView === "functi*n") {
      window.setCurrentView(*iew);
      return;
    }

    if *typeof window.navigateToView === "*unction") {
      window.navigateT*View(view);
      return;
    }

 *  window.location.hash = view;
   *window.dispatchEvent(
      new Cu*tomEvent("app:navigate", {
       *detail: {
          view
        }*      })
    );
  });

  document.*ody.appendChild(nav);
}

if (docum*nt.readyState === "loading") {
  d*cument.addEventListener("DOMConten*Loaded", ensureIphoneTabbar);
} el*e*{
* ensureI*honeTab*ar();
}

window*addEventListener("app:*endered", ensureIphoneTabbar);
*etTimeout(ensureIphoneTabbar, 250)*

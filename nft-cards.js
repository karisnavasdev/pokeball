(() => {
  "use strict";

  const STORAGE_KEY = "pokeball_nft_owned";
  const MISSION_COUNT = 15;

  const NFT_CATALOG = [
    { id: "1", mission: 1, name: "POKEBALL Girl #001", image: "/girls/1.jpg", rarity: "common" },
    { id: "2", mission: 2, name: "POKEBALL Girl #002", image: "/girls/2.jpg", rarity: "common" },
    { id: "3", mission: 3, name: "POKEBALL Girl #003", image: "/girls/3.jpg", rarity: "common" },
    { id: "4", mission: 4, name: "POKEBALL Girl #004", image: "/girls/4.jpg", rarity: "common" },
    { id: "5", mission: 5, name: "POKEBALL Girl #005", image: "/girls/5.jpg", rarity: "uncommon" },
    { id: "6", mission: 6, name: "POKEBALL Girl #006", image: "/girls/6.jpg", rarity: "uncommon" },
    { id: "7", mission: 7, name: "POKEBALL Girl #007", image: "/girls/7.jpg", rarity: "uncommon" },
    { id: "8", mission: 8, name: "POKEBALL Girl #008", image: "/girls/8.jpg", rarity: "uncommon" },
    { id: "9", mission: 9, name: "POKEBALL Girl #009", image: "/girls/9.jpg", rarity: "rare" },
    { id: "10", mission: 10, name: "POKEBALL Girl #010", image: "/girls/10.jpg", rarity: "rare" },
    { id: "11", mission: 11, name: "POKEBALL Girl #011", image: "/girls/11.jpg", rarity: "rare" },
    { id: "12", mission: 12, name: "POKEBALL Girl #012", image: "/girls/12.jpg", rarity: "epic" },
    { id: "13", mission: 13, name: "POKEBALL Girl #013", image: "/girls/13.jpg", rarity: "epic" },
    { id: "14", mission: 14, name: "POKEBALL Girl #014", image: "/girls/14.jpg", rarity: "legendary" },
    { id: "15", mission: 15, name: "POKEBALL Girl #015", image: "/girls/15.jpg", rarity: "legendary" },
  ];

  function getOwned() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  }

  function saveOwned(owned) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...owned]));
  }

  function getCard(id) {
    return NFT_CATALOG.find((c) => c.id === String(id)) || NFT_CATALOG[0];
  }

  function getCardByMission(mission) {
    return NFT_CATALOG.find((c) => c.mission === mission) || getCard(mission);
  }

  function unlockMission(mission) {
    const card = getCardByMission(mission);
    const owned = getOwned();
    const isNew = !owned.has(card.id);
    owned.add(card.id);
    saveOwned(owned);
    return { card, isNew, mission };
  }

  function isMissionUnlocked(mission) {
    return getOwned().has(String(mission));
  }

  function createCardElement(card, opts = {}) {
    const owned = opts.owned ?? getOwned().has(card.id);
    const locked = opts.locked ?? !owned;
    const reward = opts.reward ?? false;
    const roundLabel = `ROUND ${String(card.mission).padStart(2, "0")}`;

    const el = document.createElement("article");
    el.className = "nft-card" +
      (locked ? " nft-card--locked" : " nft-card--clickable") +
      (reward ? " nft-card--reward" : "") +
      (opts.view ? " nft-card--view" : "");
    el.dataset.id = card.id;
    el.dataset.mission = String(card.mission);

    el.innerHTML = `
      <div class="nft-card-shine"></div>
      <div class="nft-card-frame">
        <header class="nft-card-header">
          <span class="nft-mission">${roundLabel}</span>
          <span class="nft-rarity nft-rarity--${card.rarity}">${card.rarity}</span>
        </header>
        <div class="nft-card-art">
          <img src="${card.image}" alt="${card.name}" loading="lazy">
        </div>
        <footer class="nft-card-footer">
          <h3>${card.name}</h3>
          <span class="nft-id">NFT #${card.id.padStart(2, "0")}</span>
        </footer>
      </div>
      ${locked ? `<div class="nft-lock" aria-hidden="true"><span class="nft-lock-round">${roundLabel}</span><span class="nft-lock-icon">🔒</span></div>` : ""}
    `;
    return el;
  }

  function renderGallery(container, opts = {}) {
    if (!container) return;
    const owned = getOwned();
    container.innerHTML = "";
    const compact = opts.compact ? " nft-gallery--compact" : "";
    const large = opts.large ? " nft-gallery--game" : "";
    const side = opts.side === "left" || opts.side === "right" ? opts.side : null;
    const half = Math.ceil(NFT_CATALOG.length / 2);
    const list = side === "left"
      ? NFT_CATALOG.slice(0, half)
      : side === "right"
        ? NFT_CATALOG.slice(half)
        : NFT_CATALOG;
    const wrap = document.createElement("div");
    wrap.className = `nft-gallery${compact}${side ? " nft-gallery--side" : ""}${large}`;
    list.forEach((card) => {
      wrap.appendChild(createCardElement(card, {
        owned: owned.has(card.id),
        locked: !owned.has(card.id),
      }));
    });
    container.appendChild(wrap);
    bindGalleryClicks(container);
  }

  let viewModalEl = null;
  let viewModalHooks = {};

  function setViewModal(el, hooks = {}) {
    viewModalEl = el;
    viewModalHooks = hooks;
  }

  function bindGalleryClicks(container) {
    if (!container || !viewModalEl || container.dataset.nftClickBound) return;
    container.dataset.nftClickBound = "1";
    container.addEventListener("click", (e) => {
      const cardEl = e.target.closest(".nft-card.nft-card--clickable");
      if (!cardEl) return;
      const card = getCard(cardEl.dataset.id);
      showCardModal(viewModalEl, card, {
        title: card.name,
        subtitle: `NFT #${card.id.padStart(2, "0")} · ${card.rarity.toUpperCase()} · ROUND ${String(card.mission).padStart(2, "0")}`,
        btnText: "Close",
        view: true,
        onOpen: viewModalHooks.onOpen,
        onClose: viewModalHooks.onClose,
      });
    });
  }

  function updateCollectCount(el) {
    if (!el) return;
    const owned = getOwned();
    el.textContent = `${owned.size} / ${MISSION_COUNT} Missions`;
  }

  function showCardModal(modal, card, options = {}) {
    if (!modal) {
      options.onClose?.();
      return;
    }
    const title = options.title ?? "NFT Card";
    const subtitle = options.subtitle ?? "";
    const btnText = options.btnText ?? "Close";
    const view = options.view ?? false;
    const onClose = options.onClose;

    const titleEl = modal.querySelector(".nft-reward-title");
    const subEl = modal.querySelector(".nft-reward-sub");
    const slot = modal.querySelector(".nft-reward-slot");
    const claimBtn = modal.querySelector(".nft-reward-claim");
    const box = modal.querySelector(".nft-reward-box");

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (claimBtn) claimBtn.textContent = btnText;
    if (box) box.classList.toggle("nft-reward-box--view", view);
    if (slot) {
      slot.innerHTML = "";
      slot.appendChild(createCardElement(card, { owned: true, locked: false, reward: true, view }));
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    options.onOpen?.();

    const close = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      claimBtn?.removeEventListener("click", close);
      modal.removeEventListener("click", onBackdrop);
      window.removeEventListener("keydown", onEscape);
      onClose?.();
    };
    const onBackdrop = (e) => {
      if (e.target === modal) close();
    };
    const onEscape = (e) => {
      if (e.key === "Escape") close();
    };

    claimBtn?.addEventListener("click", close);
    modal.addEventListener("click", onBackdrop);
    window.addEventListener("keydown", onEscape);
  }

  function showRewardModal(modal, card, title, subtitle, onClose) {
    showCardModal(modal, card, {
      title,
      subtitle,
      btnText: "Claim Reward",
      view: true,
      onClose,
    });
  }

  window.PokeNft = {
    NFT_CATALOG,
    MISSION_COUNT,
    getOwned,
    unlockMission,
    isMissionUnlocked,
    getCard,
    getCardByMission,
    createCardElement,
    renderGallery,
    updateCollectCount,
    setViewModal,
    showCardModal,
    showRewardModal,
  };
})();

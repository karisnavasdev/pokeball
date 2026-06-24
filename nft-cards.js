(() => {
  "use strict";

  const STORAGE_KEY = "pokeball_nft_owned";

  const NFT_CATALOG = [
    { id: "1", name: "POKEBALL Girl #001", image: "/girls/1.jpg", rarity: "common" },
    { id: "2", name: "POKEBALL Girl #002", image: "/girls/2.jpg", rarity: "common" },
    { id: "3", name: "POKEBALL Girl #003", image: "/girls/3.jpg", rarity: "uncommon" },
    { id: "4", name: "POKEBALL Girl #004", image: "/girls/4.jpg", rarity: "uncommon" },
    { id: "5", name: "POKEBALL Girl #005", image: "/girls/5.jpg", rarity: "rare" },
    { id: "6", name: "POKEBALL Girl #006", image: "/girls/6.jpg", rarity: "epic" },
    { id: "7", name: "POKEBALL Girl #007", image: "/girls/7.jpg", rarity: "legendary" },
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
    return NFT_CATALOG.find((c) => c.id === id) || NFT_CATALOG[0];
  }

  function pickRewardCard() {
    const owned = getOwned();
    const unowned = NFT_CATALOG.filter((c) => !owned.has(c.id));
    const pool = unowned.length ? unowned : NFT_CATALOG;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function grantReward() {
    const card = pickRewardCard();
    const owned = getOwned();
    const isNew = !owned.has(card.id);
    owned.add(card.id);
    saveOwned(owned);
    return { card, isNew };
  }

  function createCardElement(card, opts = {}) {
    const owned = opts.owned ?? getOwned().has(card.id);
    const locked = opts.locked ?? !owned;
    const reward = opts.reward ?? false;

    const el = document.createElement("article");
    el.className = "nft-card" +
      (locked ? " nft-card--locked" : "") +
      (reward ? " nft-card--reward" : "");
    el.dataset.id = card.id;

    el.innerHTML = `
      <div class="nft-card-shine"></div>
      <div class="nft-card-frame">
        <header class="nft-card-header">
          <span class="nft-chain">Solana</span>
          <span class="nft-rarity nft-rarity--${card.rarity}">${card.rarity}</span>
        </header>
        <div class="nft-card-art">
          <img src="${card.image}" alt="${card.name}" loading="lazy">
        </div>
        <footer class="nft-card-footer">
          <h3>${card.name}</h3>
          <span class="nft-id">#${card.id.padStart(4, "0")}</span>
        </footer>
      </div>
      ${locked ? '<div class="nft-lock" aria-hidden="true">🔒</div>' : ""}
    `;
    return el;
  }

  function renderGallery(container, opts = {}) {
    if (!container) return;
    const owned = getOwned();
    container.innerHTML = "";
    const compact = opts.compact ? " nft-gallery--compact" : "";
    const wrap = document.createElement("div");
    wrap.className = `nft-gallery${compact}`;
    NFT_CATALOG.forEach((card) => {
      wrap.appendChild(createCardElement(card, {
        owned: owned.has(card.id),
        locked: !owned.has(card.id),
      }));
    });
    container.appendChild(wrap);
  }

  function updateCollectCount(el) {
    if (!el) return;
    const owned = getOwned();
    el.textContent = `${owned.size} / ${NFT_CATALOG.length} Collected`;
  }

  function showRewardModal(modal, card, title, subtitle, onClose) {
    if (!modal) {
      onClose?.();
      return;
    }
    const titleEl = modal.querySelector(".nft-reward-title");
    const subEl = modal.querySelector(".nft-reward-sub");
    const slot = modal.querySelector(".nft-reward-slot");
    const claimBtn = modal.querySelector(".nft-reward-claim");

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (slot) {
      slot.innerHTML = "";
      slot.appendChild(createCardElement(card, { owned: true, locked: false, reward: true }));
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    const close = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      claimBtn?.removeEventListener("click", close);
      onClose?.();
    };
    claimBtn?.addEventListener("click", close);
  }

  window.PokeNft = {
    NFT_CATALOG,
    getOwned,
    grantReward,
    getCard,
    createCardElement,
    renderGallery,
    updateCollectCount,
    showRewardModal,
  };
})();

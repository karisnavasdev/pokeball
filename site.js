const CA = "pokepump";

document.getElementById("copy-ca")?.addEventListener("click", async () => {
  const btn = document.getElementById("copy-ca");
  try {
    await navigator.clipboard.writeText(CA);
    const prev = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = prev; }, 1500);
  } catch {
    btn.textContent = "Copy failed";
  }
});

if (window.PokeNft) {
  PokeNft.renderGallery(document.getElementById("nft-gallery-home"));
  PokeNft.updateCollectCount(document.getElementById("nft-count"));
  const owned = PokeNft.getOwned().size;
  const total = PokeNft.NFT_CATALOG.length;
  const ownedEl = document.getElementById("stat-nft-owned");
  const totalEl = document.getElementById("stat-nft-total");
  if (ownedEl) ownedEl.textContent = String(owned);
  if (totalEl) totalEl.textContent = String(total);
}

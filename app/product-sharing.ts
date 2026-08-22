export function buildProductShareMessage(productName: string, productUrl: string) {
  return `شاهد هذا المنتج:\n${productName}\n${productUrl}`;
}

export function buildWhatsAppShareUrl(productName: string, productUrl: string) {
  return `https://wa.me/?text=${encodeURIComponent(buildProductShareMessage(productName, productUrl))}`;
}

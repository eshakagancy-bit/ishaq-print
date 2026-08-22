export function buildProductShareMessage(productName: string, productUrl: string, referenceNumber?: string) {
  const normalizedReference = referenceNumber?.trim();
  const referenceLine = normalizedReference
    ? `\nالرقم المرجعي: ${normalizedReference}`
    : "";
  return `شاهد هذا المنتج:\n${productName}${referenceLine}\nرابط المنتج:\n${productUrl}`;
}

export function buildWhatsAppShareUrl(productName: string, productUrl: string, referenceNumber?: string) {
  return `https://wa.me/?text=${encodeURIComponent(buildProductShareMessage(productName, productUrl, referenceNumber))}`;
}

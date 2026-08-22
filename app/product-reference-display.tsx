import { normalizeProductReferenceNumber } from "./product-reference";

export default function ProductReferenceDisplay({ value, compact = false }: { value?: string; compact?: boolean }) {
  const referenceNumber = normalizeProductReferenceNumber(value);
  if (!referenceNumber) return null;
  return <dl className={compact ? "product-reference-number compact" : "product-reference-number"}>
    <div><dt>الرقم المرجعي</dt><dd dir="auto">{referenceNumber}</dd></div>
  </dl>;
}

type MarqueeProduct = {
  id: number | string;
  name: string;
};

export default function ProductMarquee({ products }: { products: MarqueeProduct[] }) {
  const names = [...new Set(products.map((product) => product.name.trim()).filter(Boolean))];
  if (!names.length) return null;

  const group = (hidden: boolean) => <div className="product-marquee-group" aria-hidden={hidden || undefined}>
    {names.map((name) => <span dir="auto" key={`${hidden ? "duplicate" : "primary"}-${name}`}>{name}</span>)}
  </div>;

  return <div className="product-marquee" aria-label="أسماء المنتجات المتوفرة">
    <div className="product-marquee-track">{group(false)}{group(true)}</div>
  </div>;
}

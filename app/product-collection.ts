import type { StoredProduct } from "./site-defaults";

export function replaceProductById(products: StoredProduct[], updatedProduct: StoredProduct) {
  let found = false;
  const nextProducts = products.map((product) => {
    if (product.id !== updatedProduct.id) return product;
    found = true;
    return updatedProduct;
  });
  if (!found) throw new Error(`Product ${updatedProduct.id} was not found`);
  return nextProducts;
}

export function addProductToCollection(products: StoredProduct[], product: StoredProduct) {
  if (products.some((item) => item.id === product.id)) {
    throw new Error(`Product ${product.id} already exists`);
  }
  return [product, ...products];
}

export function removeProductById(products: StoredProduct[], id: number) {
  const nextProducts = products.filter((product) => product.id !== id);
  if (nextProducts.length === products.length) throw new Error(`Product ${id} was not found`);
  return nextProducts;
}

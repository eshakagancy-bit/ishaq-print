"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { buildProductCardCartAction } from "./order-cart";
import { CartIcon } from "./order-cart-ui";
import { useOrderCart } from "./order-cart-provider";

type ProductCardCartButtonProps = {
  category: "printers" | "papers" | "inks";
  productId: string;
  productName: string;
  productUrl: string;
  image: string;
  inkVariantCount?: number;
};

export default function ProductCardCartButton(props: ProductCardCartButtonProps) {
  const router = useRouter();
  const { addItem } = useOrderCart();
  const [feedback, setFeedback] = useState("");
  const action = buildProductCardCartAction(props);
  const requiresOptions = action.kind === "choose-options";

  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (action.kind === "choose-options") {
      router.push(action.href);
      return;
    }
    addItem(action.item);
    setFeedback("تمت الإضافة إلى سلة الطلبات");
  };

  return <>
    <button
      type="button"
      className="product-card-cart"
      onClick={activate}
      aria-label={requiresOptions ? `اختر لون أو متغير ${props.productName}` : `أضف ${props.productName} إلى سلة الطلبات`}
      title={requiresOptions ? "اختر اللون أو المتغير" : "أضف إلى سلة الطلبات"}
    ><CartIcon/></button>
    {feedback ? <span className="product-card-cart-feedback" role="status" aria-live="polite" onAnimationEnd={() => setFeedback("")}>{feedback}</span> : null}
  </>;
}

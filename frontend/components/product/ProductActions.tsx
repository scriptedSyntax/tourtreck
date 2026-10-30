"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/api";
import { productColourHex } from "@/lib/product-colours";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";

export default function ProductActions({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const colours = product.available_colours.split(",").map((value) => value.trim()).filter(Boolean);
  const [selectedColour, setSelectedColour] = useState(colours[0] ?? "");
  const mainImage = product.images.find((image) => image.is_main) ?? product.images[0];

  const addProduct = async () => {
    if (adding) return;
    setAdding(true);
    setError("");
    const success = await addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: mainImage?.image ?? "",
      quantity,
      selectedColour,
    });
    setAdded(success);
    if (!success) setError("This product could not be added to your cart.");
    setAdding(false);
  };

  return (
    <div className="space-y-4 border-t pt-6">
      {colours.length > 0 && <fieldset><legend className="mb-2 text-sm font-medium">Colour: {selectedColour}</legend><div className="flex flex-wrap gap-2">{colours.map((colour) => <button key={colour} type="button" onClick={() => setSelectedColour(colour)} aria-label={colour} aria-pressed={selectedColour === colour} title={colour} className={`h-9 w-9 rounded-full border-2 ${selectedColour === colour ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"}`} style={{ backgroundColor: productColourHex(colour) }} />)}</div></fieldset>}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          disabled={quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-10 text-center font-medium">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
          disabled={quantity >= product.stock}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Button className="w-full sm:w-auto" size="lg" onClick={addProduct} disabled={product.stock < 1 || adding}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        {product.stock < 1 ? "Out of stock" : adding ? "Adding..." : "Add to cart"}
      </Button>
      {added && <Button asChild variant="outline" size="lg" className="w-full sm:w-auto sm:ml-3"><a href="/cart">Proceed to checkout</a></Button>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

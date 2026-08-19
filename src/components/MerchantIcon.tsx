import { Store, ShoppingCart, Croissant, LucideProps } from "lucide-react";

interface MerchantIconProps extends LucideProps {
  name?: string;
}

export function MerchantIcon({ name, ...props }: MerchantIconProps) {
  if (!name) return <Store {...props} />;

  const lowerName = name.toLowerCase();

  if (lowerName.includes("padaria") || lowerName.includes("panificadora") || lowerName.includes("pães")) {
    return <Croissant {...props} />;
  }

  if (lowerName.includes("mercado") || lowerName.includes("supermercado") || lowerName.includes("mercearia") || lowerName.includes("empório")) {
    return <ShoppingCart {...props} />;
  }

  // Fallback icon
  return <Store {...props} />;
}

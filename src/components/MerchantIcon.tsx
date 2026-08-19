import { 
  Store, ShoppingCart, Croissant, Wrench, Car, Pill, Utensils, 
  Pizza, Beer, Stethoscope, Scissors, Shirt, Dumbbell, Laptop, 
  Smartphone, Hammer, Printer, BookOpen, Fuel, Coffee, ShoppingBag, 
  PawPrint, GraduationCap, Building2,
  LucideProps 
} from "lucide-react";

interface MerchantIconProps extends LucideProps {
  name?: string;
}

const SEGMENT_MAPPINGS = [
  {
    icon: Croissant,
    keywords: ["padaria", "panificadora", "pães", "pao", "confeitaria", "bolo", "doceria"]
  },
  {
    icon: ShoppingCart,
    keywords: ["mercado", "supermercado", "mercearia", "empório", "atacado", "varejo", "hortifruti", "sacolão"]
  },
  {
    icon: Wrench,
    keywords: ["oficina", "mecânica", "auto peças", "autopeças", "borracharia", "funilaria", "centro automotivo", "moto"]
  },
  {
    icon: Car,
    keywords: ["veículos", "estacionamento", "lava rápido", "locadora", "carro", "automóveis"]
  },
  {
    icon: Pill,
    keywords: ["farmácia", "drogaria", "manipulação", "farma"]
  },
  {
    icon: Utensils,
    keywords: ["restaurante", "lanchonete", "comida", "food", "grill", "churrascaria", "buffet", "marmitex", "espetinho"]
  },
  {
    icon: Pizza,
    keywords: ["pizza", "pizzaria"]
  },
  {
    icon: Beer,
    keywords: ["bar", "boteco", "adega", "bebidas", "chopp", "pub", "choperia"]
  },
  {
    icon: Coffee,
    keywords: ["café", "cafe", "cafeteria"]
  },
  {
    icon: Stethoscope,
    keywords: ["clínica", "consultório", "médico", "medicina", "odonto", "dentista", "hospital", "laboratório", "saúde"]
  },
  {
    icon: Scissors,
    keywords: ["salão", "barbearia", "barber", "estética", "beleza", "cabeleireiro", "unhas", "esmalteria", "spa"]
  },
  {
    icon: Shirt,
    keywords: ["roupas", "boutique", "moda", "vestuário", "confecções", "calçados"]
  },
  {
    icon: Dumbbell,
    keywords: ["academia", "fitness", "crossfit", "gym", "suplementos"]
  },
  {
    icon: Laptop,
    keywords: ["informática", "tecnologia", "computadores", "ti", "software", "assistência técnica"]
  },
  {
    icon: Smartphone,
    keywords: ["celular", "celulares", "capinhas", "acessórios"]
  },
  {
    icon: Hammer,
    keywords: ["construção", "ferragens", "tintas", "material de construção", "madeireira", "depósito"]
  },
  {
    icon: Printer,
    keywords: ["gráfica", "impressão", "copiadora", "comunicação visual"]
  },
  {
    icon: BookOpen,
    keywords: ["papelaria", "livraria", "revistaria"]
  },
  {
    icon: Fuel,
    keywords: ["posto", "combustível", "gasolina"]
  },
  {
    icon: ShoppingBag,
    keywords: ["loja", "variedades", "presentes", "artigos", "comércio"]
  },
  {
    icon: PawPrint,
    keywords: ["pet", "petshop", "veterinária", "agro", "ração", "animais", "banho e tosa"]
  },
  {
    icon: GraduationCap,
    keywords: ["escola", "colégio", "curso", "ensino", "treinamento", "educação"]
  },
  {
    icon: Building2,
    keywords: ["imobiliária", "condomínio", "construtora", "engenharia"]
  }
];

export function MerchantIcon({ name, ...props }: MerchantIconProps) {
  if (!name) return <Store {...props} />;

  const lowerName = name.toLowerCase();

  for (const mapping of SEGMENT_MAPPINGS) {
    if (mapping.keywords.some((kw) => lowerName.includes(kw))) {
      const IconComponent = mapping.icon;
      return <IconComponent {...props} />;
    }
  }

  // Fallback icon
  return <Store {...props} />;
}

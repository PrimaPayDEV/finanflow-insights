import { toast } from "sonner";

export interface ViaCepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export async function fetchCepData(cep: string): Promise<ViaCepData | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) {
      toast.error("CEP não encontrado");
      return null;
    }
    return data;
  } catch (error) {
    toast.error("Erro ao buscar CEP");
    return null;
  }
}

/**
 * Helper para lidar com preenchimento automático em formulários não controlados (usando name attributes).
 */
export async function handleCepBlurUncontrolled(
  e: React.FocusEvent<HTMLInputElement>,
  formRef: React.RefObject<HTMLFormElement> | HTMLFormElement,
  fieldMapping: { address: string, neighborhood: string, city: string, state: string, numberFocus?: string } = {
    address: "address",
    neighborhood: "neighborhood",
    city: "city",
    state: "state",
    numberFocus: "number"
  }
) {
  const cep = e.target.value;
  const data = await fetchCepData(cep);
  if (!data) return;

  const form = formRef instanceof HTMLFormElement ? formRef : formRef.current;
  if (!form) return;

  const setInputValue = (name: string, value: string) => {
    const input = form.elements.namedItem(name) as HTMLInputElement;
    if (input) {
      input.value = value;
      // Dispatch event para disparar re-render no React se for component controlado mas usando form reference (fallback)
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  if (data.logradouro) setInputValue(fieldMapping.address, data.logradouro);
  if (data.bairro) setInputValue(fieldMapping.neighborhood, data.bairro);
  if (data.localidade) setInputValue(fieldMapping.city, data.localidade);
  if (data.uf) setInputValue(fieldMapping.state, data.uf);
  
  if (fieldMapping.numberFocus) {
    const numberInput = form.elements.namedItem(fieldMapping.numberFocus) as HTMLInputElement;
    if (numberInput) {
      numberInput.focus();
    }
  }
}

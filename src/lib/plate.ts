/**
 * Utilitário de busca e autocompletar de dados de veículos através da placa (Padrão Mercosul / Nacional Antigo).
 */

export interface PlateLookupData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  fuel?: string;
  category: "carro" | "moto" | "pesado" | "utilitario";
  fipeValue: number;
  chassi?: string;
  renavam?: string;
}

// Formata placa para exibição padronizada
export function formatPlate(rawPlate: string): string {
  const clean = (rawPlate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

// Base de conhecimento rápida para placas conhecidas / de teste e amostras
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _KNOWN_PLATES: Record<string, Partial<PlateLookupData>> = {
  QCT1A80: { brand: "Toyota", model: "Corolla Altis 2.0 Flex", year: 2022, color: "Branco Perolizado", fuel: "Flex", category: "carro", fipeValue: 138000 },
  QCT1A8: { brand: "Toyota", model: "Corolla Altis 2.0 Flex", year: 2022, color: "Branco Perolizado", fuel: "Flex", category: "carro", fipeValue: 138000 },
  FAFS61A: { brand: "Jeep", model: "Compass Longitude 1.3 Turbo Flex", year: 2023, color: "Cinza Granite", fuel: "Flex", category: "carro", fipeValue: 154000 },
  OQG6A76: { brand: "Volkswagen", model: "Gol 1.0 MPI Flex", year: 2021, color: "Prata Sirius", fuel: "Flex", category: "carro", fipeValue: 48500 },
  LMA5B66: { brand: "Hyundai", model: "HB20 Vision 1.0 Flex", year: 2022, color: "Preto Onix", fuel: "Flex", category: "carro", fipeValue: 62000 },
  SRB3F45: { brand: "Fiat", model: "Strada Freedom 1.3 CS Flex", year: 2023, color: "Vermelho Montecarlo", fuel: "Flex", category: "utilitario", fipeValue: 92000 },
  BRA2E19: { brand: "Chevrolet", model: "Onix Plus Premier 1.0 Turbo", year: 2023, color: "Azul Seeker", fuel: "Flex", category: "carro", fipeValue: 96000 },
  RBC4H89: { brand: "Honda", model: "Civic Touring 1.5 Turbo", year: 2021, color: "Branco Topázio", fuel: "Gasolina", category: "carro", fipeValue: 142000 },
  KMN9021: { brand: "Honda", model: "CG 160 Titan Flex", year: 2022, color: "Vermelho", fuel: "Flex", category: "moto", fipeValue: 17500 },
  XYZ9876: { brand: "Scania", model: "R 450 6x2 Highline", year: 2020, color: "Azul", fuel: "Diesel", category: "pesado", fipeValue: 490000 },
  ABC1234: { brand: "Fiat", model: "Uno Mille Fire 1.0", year: 2013, color: "Prata", fuel: "Flex", category: "carro", fipeValue: 24500 },
  DFG2154: { brand: "Volkswagen", model: "Saveiro Cross 1.6 Flex", year: 2019, color: "Branco", fuel: "Flex", category: "utilitario", fipeValue: 71000 },
};

/**
 * Consulta dados do veículo a partir da placa.
 * Tenta:
 * 1. Base local / cache de veículos do sistema
 * 2. Lookup online público caso acessível
 * 3. Base de conhecimento heurística
 */
export async function lookupVehicleByPlate(rawPlate: string): Promise<PlateLookupData | null> {
  const clean = (rawPlate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length < 7) return null;

  // 2. Verificar no localStorage se o veículo já foi salvo antes
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`veh_plate_${clean}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch {
    // ignore
  }

  // Sem consulta oficial configurada: não inventar dados.
  return null;
}

/**
 * Utilitários, Tipos e Modelo de Dados do Ecossistema de Proteção Veicular
 * Cobre: Cotação, Associados, Veículos, Consultores, Cotas de Participação,
 * Produtos por Veículo, Lotes de Cobrança, Fechamento, Rateio de Sinistros, Eventos e Termos.
 */

export type VehicleType = "carro" | "moto" | "pesado" | "utilitario";

export interface CotacaoItem {
  id: string;
  companyId: string;
  createdAt: string;
  // Associado
  memberName: string;
  memberDocument: string;
  memberPhone: string;
  memberEmail?: string;
  memberCep?: string;
  memberAddress?: string;
  memberNumber?: string;
  memberComplement?: string;
  memberNeighborhood?: string;
  memberCity?: string;
  memberState?: string;
  preferredDueDay: number;
  consultantId?: string;
  consultantName?: string;
  // Veículo
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor?: string;
  vehicleChassi?: string;
  vehicleFipeValue: number;
  vehicleUsage: "particular" | "comercial" | "app";
  // Produtos e Coberturas Selecionadas
  selectedProducts: string[]; // IDs de ProdutoVeicular
  baseFee: number;
  productsFee: number;
  totalMonthlyFee: number;
  estimatedParticipationFee: number; // Cota de participação / Franquia
  // Status
  status: "rascunho" | "enviada" | "aprovada" | "efetivada" | "cancelada";
  notes?: string;
}

export interface CotaParticipacaoFaixa {
  id: string;
  vehicleType: VehicleType;
  minFipe: number;
  maxFipe: number;
  percentage: number; // ex: 6%
  minAmount: number; // ex: R$ 1.500,00
  description?: string;
}

export interface ProdutoVeicular {
  id: string;
  vehicleType: VehicleType | "todos";
  name: string;
  category: "cobertura" | "assistencia" | "rastreamento" | "adicional";
  monthlyFee: number;
  coverageLimit?: string;
  description: string;
  isRequired?: boolean;
  isActive: boolean;
}

export interface ImplementoItem {
  id: string;
  brand: string;
  model: string;
  year: string;
  chassi: string;
  commercialValue: number;
  monthlyFee: number;
}

export interface CustomCoverageItem {
  id: string;
  name: string;
  limit?: string;
  monthlyFee: number;
  isActive: boolean;
}

export interface MemberExtraData {
  rg?: string;
  birthDate?: string;
  maritalStatus?: string;
  profession?: string;
  secondaryPhone?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhExpiryDate?: string;
  cnhState?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  registeredAt?: string;
  updatedAt?: string;
}

export interface VehicleExtraData {
  chassi?: string;
  renavam?: string;
  yearFab?: number;
  yearModel?: number;
  color?: string;
  fuel?: string;
  mileage?: string;
  usage?: string;
  transmission?: string;
  engine?: string;
  fipeCode?: string;
  fipeValue?: number;
  trackerStatus?: string;
  trackerCode?: string;
  notes?: string;
  implementos?: ImplementoItem[];
  customCoverages?: CustomCoverageItem[];
  coverageActive?: boolean;
  coveragePlan?: string;
  coverageConfig?: any;
  registeredAt?: string;
}

export interface EventoServicoItem {
  id: string;
  description: string;
  provider?: string;
  category?: string;
  amount: number;
}

export interface EventoAnexoItem {
  id: string;
  name: string;
  type: "FOTO" | "ORCAMENTO" | "RECIBO" | "NOTA_FISCAL" | "BOLETIM_OCORRENCIA" | "LAUDO" | "OUTRO";
  fileType?: string;
  size?: number;
  dataUrl?: string;
  uploadedAt: string;
}

export interface EventoSinistro {
  id: string;
  companyId: string;
  date: string;
  createdAt: string;
  memberId?: string;
  memberName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  category:
    | "COLISAO"
    | "FURTO_ROUBO"
    | "TERCEIROS"
    | "ASSISTENCIA_REBOQUE"
    | "VIDROS"
    | "DESPESA_ADMINISTRATIVA"
    | "OUTROS";
  description: string;
  workshopProvider?: string;
  baseAmount?: number;
  amount: number;
  status: "ANALISE" | "APROVADO" | "EM_REPARO" | "CONCLUIDO" | "PAGO";
  notes?: string;
  services?: EventoServicoItem[];
  attachments?: EventoAnexoItem[];
}

export interface RateioConfig {
  periodMonth: string; // "YYYY-MM"
  totalEventsAmount: number;
  activeVehiclesCount: number;
  rateioType: "PERCENTUAL" | "VALOR_FIXO";
  rateioValue: number; // Ex: 4.5 (%) ou R$ 35,00
  isApplied: boolean;
  appliedAt?: string;
}

export interface LoteItem {
  memberId: string;
  memberName: string;
  memberDocument: string;
  memberPhone?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  dueDay: number;
  baseAmount: number;
  rateioAmount: number;
  totalAmount: number;
  consultantName?: string;
  selected: boolean;
  invoiceId?: string;
  status: "pendente" | "emitido" | "erro";
  errorDetails?: string;
}

export interface LoteCobranca {
  id: string;
  companyId: string;
  referenceMonth: string; // YYYY-MM
  dueDayFilter?: number; // 5, 10, 15, 20, 25 ou 0 (todos)
  targetDueDate: string; // YYYY-MM-DD
  createdAt: string;
  status: "DRAFT" | "CONFIRMADO" | "PROCESSANDO" | "EMITIDO";
  rateioPercentage: number;
  totalMembersCount: number;
  totalAmount: number;
  items: LoteItem[];
}

// -------------------------------------------------------------
// DADOS PADRÃO DE COTAS DE PARTICIPAÇÃO (Regulamento PPM PLANMAIS - Cap. IV)
// Art. 21º: Nacionais 7,5% (mín. R$ 2.700,00)
// Art. 22º: Importados 10% (mín. R$ 3.500,00)
// Art. 23º: Uso profissional/trabalho acresce +3% cumulativamente
// -------------------------------------------------------------
export const PPM_RATEIO_MAX_MENSAL = 25.00; // Art. 90º: limite mensal de R$ 25,00 por participante

export const DEFAULT_COTAS_PARTICIPACAO: CotaParticipacaoFaixa[] = [
  // Carros Nacionais e Importados (Cap. IV - Art. 21º e 22º)
  { id: "c-1", vehicleType: "carro", minFipe: 0, maxFipe: 60000, percentage: 7.5, minAmount: 2700, description: "Veículos Nacionais até R$ 60.000 (Art. 21º PPM: 7,5% / mín. R$ 2.700)" },
  { id: "c-2", vehicleType: "carro", minFipe: 60001, maxFipe: 120000, percentage: 7.5, minAmount: 2700, description: "Veículos Nacionais R$ 60.001 a R$ 120.000 (Art. 21º PPM: 7,5% / mín. R$ 2.700)" },
  { id: "c-3", vehicleType: "carro", minFipe: 120001, maxFipe: 999999, percentage: 10, minAmount: 3500, description: "Veículos Importados / Especial acima de R$ 120.000 (Art. 22º PPM: 10% / mín. R$ 3.500)" },
  
  // Motocicletas
  { id: "m-1", vehicleType: "moto", minFipe: 0, maxFipe: 35000, percentage: 7.5, minAmount: 2700, description: "Motos Nacionais (Art. 21º PPM: 7,5% / mín. R$ 2.700)" },
  { id: "m-2", vehicleType: "moto", minFipe: 35001, maxFipe: 999999, percentage: 10, minAmount: 3500, description: "Motos Importadas / Alta Cilindrada (Art. 22º PPM: 10% / mín. R$ 3.500)" },

  // Utilitários e Vans (com ou sem adicional profissional de +3% do Art. 23º)
  { id: "u-1", vehicleType: "utilitario", minFipe: 0, maxFipe: 120000, percentage: 7.5, minAmount: 2700, description: "Utilitários Nacionais (Art. 21º PPM: 7,5% / mín. R$ 2.700; +3% se uso profissional)" },
  { id: "u-2", vehicleType: "utilitario", minFipe: 120001, maxFipe: 999999, percentage: 10, minAmount: 3500, description: "Utilitários Importados (Art. 22º PPM: 10% / mín. R$ 3.500; +3% se uso profissional)" },

  // Caminhões e Pesados (Art. 21º + Art. 23º atividade profissional +3% = 10,5%)
  { id: "p-1", vehicleType: "pesado", minFipe: 0, maxFipe: 300000, percentage: 10.5, minAmount: 2700, description: "Pesados Nacionais Uso Profissional (Art. 21º + Art. 23º PPM: 7,5% + 3% = 10,5%)" },
  { id: "p-2", vehicleType: "pesado", minFipe: 300001, maxFipe: 999999, percentage: 13, minAmount: 3500, description: "Pesados Importados Uso Profissional (Art. 22º + Art. 23º PPM: 10% + 3% = 13%)" },
];

// -------------------------------------------------------------
// DADOS PADRÃO DE PRODUTOS E COBERTURAS
// -------------------------------------------------------------
export const DEFAULT_PRODUTOS_VEICULARES: ProdutoVeicular[] = [
  {
    id: "prod-base-roubo",
    vehicleType: "todos",
    name: "Proteção Patrimonial Mutualista (PPM - Danos Materiais ao Veículo)",
    category: "cobertura",
    monthlyFee: 119.90,
    coverageLimit: "Tabela FIPE (Cap. III PPM)",
    description: "Reparação de danos materiais ao veículo protegido conforme Regulamento PPM PLANMAIS.",
    isRequired: true,
    isActive: true,
  },
  {
    id: "prod-terceiros-50",
    vehicleType: "todos",
    name: "Danos Materiais Causados a Terceiros (Cap. X PPM) - R$ 50.000",
    category: "cobertura",
    monthlyFee: 34.90,
    coverageLimit: "R$ 50.000,00 (Danos Materiais)",
    description: "Reparação de danos materiais diretamente causados pelo veículo protegido a terceiros (Art. 72º a 81º).",
    isActive: true,
  },
  {
    id: "prod-terceiros-100",
    vehicleType: "todos",
    name: "Danos Materiais Causados a Terceiros (Cap. X PPM) - R$ 100.000",
    category: "cobertura",
    monthlyFee: 49.90,
    coverageLimit: "R$ 100.000,00 (Danos Materiais)",
    description: "Cobertura ampliada exclusivamente para danos materiais a terceiros (Art. 72º a 81º).",
    isActive: true,
  },
  {
    id: "prod-reboque-500",
    vehicleType: "todos",
    name: "Assistência 24h & Reboque 500km",
    category: "assistencia",
    monthlyFee: 24.90,
    coverageLimit: "500 km por evento",
    description: "Socorro mecânico, elétrico, chaveiro, pane seca e guincho em todo território nacional.",
    isActive: true,
  },
  {
    id: "prod-reboque-1000",
    vehicleType: "todos",
    name: "Assistência 24h & Reboque 1.000km",
    category: "assistencia",
    monthlyFee: 39.90,
    coverageLimit: "1.000 km por evento",
    description: "Ideal para viagens e rotas estaduais com reboque de longa distância.",
    isActive: true,
  },
  {
    id: "prod-rastreador",
    vehicleType: "todos",
    name: "Rastreador GPS com Telemetria e App Mobile",
    category: "rastreamento",
    monthlyFee: 49.90,
    coverageLimit: "Monitoramento 24h",
    description: "Localização em tempo real via celular, cerca virtual e bloqueio remoto emergencial.",
    isActive: true,
  },
  {
    id: "prod-vidros",
    vehicleType: "carro",
    name: "Proteção de Vidros, Faróis e Retrovisores (Art. 64º e 65º PPM)",
    category: "cobertura",
    monthlyFee: 29.90,
    coverageLimit: "Desconto de 60% sobre o valor da peça",
    description: "Substituição de vidros, faróis e retrovisores com 60% de desconto sobre o valor da peça (Art. 65º PPM).",
    isActive: true,
  },
  {
    id: "prod-carro-reserva-7",
    vehicleType: "carro",
    name: "Benefício Adicional - Veículo Reserva 7 Dias",
    category: "assistencia",
    monthlyFee: 22.90,
    coverageLimit: "7 diárias (se previsto no Termo de Adesão)",
    description: "Benefício adicional específico conforme inciso III do Art. 15º do Regulamento PPM.",
    isActive: true,
  },
  {
    id: "prod-carro-reserva-15",
    vehicleType: "carro",
    name: "Benefício Adicional - Veículo Reserva 15 Dias",
    category: "assistencia",
    monthlyFee: 35.90,
    coverageLimit: "15 diárias (se previsto no Termo de Adesão)",
    description: "Benefício adicional específico conforme inciso III do Art. 15º do Regulamento PPM.",
    isActive: true,
  },
];

// -------------------------------------------------------------
// HELPER PARA CÁLCULO DE COTA DE PARTICIPAÇÃO (CAPÍTULO IV PPM)
// -------------------------------------------------------------
export function calculateParticipationFee(
  vehicleType: VehicleType,
  fipeValue: number,
  cotas: CotaParticipacaoFaixa[] = DEFAULT_COTAS_PARTICIPACAO,
  options?: { isImported?: boolean; isProfessionalUsage?: boolean }
): { percentage: number; amount: number; description: string } {
  const extraProfessionalPct = options?.isProfessionalUsage ? 3 : 0; // Art. 23º: +3% uso profissional/trabalho

  if (options?.isImported !== undefined) {
    const basePct = options.isImported ? 10 : 7.5; // Art. 21º (7,5%) / Art. 22º (10%)
    const minAmt = options.isImported ? 3500 : 2700; // Art. 21º (R$ 2.700) / Art. 22º (R$ 3.500)
    const totalPct = basePct + extraProfessionalPct;
    const calculated = fipeValue * (totalPct / 100);
    const amount = Math.max(calculated, minAmt);
    return {
      percentage: totalPct,
      amount,
      description: `${options.isImported ? "Importado (10%)" : "Nacional (7,5%)"}${
        extraProfessionalPct > 0 ? " + 3% Uso Profissional" : ""
      } — Mín. R$ ${minAmt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    };
  }

  const match = cotas.find(
    (c) => c.vehicleType === vehicleType && fipeValue >= c.minFipe && fipeValue <= c.maxFipe
  );

  if (match) {
    const totalPct = match.percentage + extraProfessionalPct;
    const calculated = fipeValue * (totalPct / 100);
    const amount = Math.max(calculated, match.minAmount);
    return {
      percentage: totalPct,
      amount,
      description: match.description || `Mínimo de R$ ${match.minAmount.toFixed(2)} (${totalPct}%)`,
    };
  }

  // Fallback padrão Art. 21º PPM: 7,5% ou mínimo R$ 2.700,00
  const fallbackPct = 7.5 + extraProfessionalPct;
  const fallbackAmount = Math.max(fipeValue * (fallbackPct / 100), 2700);
  return {
    percentage: fallbackPct,
    amount: fallbackAmount,
    description: `Cota padrão PPM ${fallbackPct}% (mínimo R$ 2.700,00 - Art. 21º)`,
  };
}

// -------------------------------------------------------------
// HELPER PARA MENSALIDADE BASE ESTIMADA
// -------------------------------------------------------------
export function calculateBaseMonthlyFee(vehicleType: VehicleType, fipeValue: number): number {
  if (vehicleType === "moto") {
    if (fipeValue <= 15000) return 89.90;
    if (fipeValue <= 30000) return 129.90;
    return 169.90;
  }
  if (vehicleType === "pesado") {
    if (fipeValue <= 150000) return 399.90;
    if (fipeValue <= 300000) return 599.90;
    return 799.90;
  }
  if (vehicleType === "utilitario") {
    if (fipeValue <= 60000) return 179.90;
    if (fipeValue <= 120000) return 249.90;
    return 329.90;
  }
  // Carros
  if (fipeValue <= 35000) return 119.90;
  if (fipeValue <= 60000) return 159.90;
  if (fipeValue <= 90000) return 199.90;
  if (fipeValue <= 140000) return 259.90;
  return 329.90;
}

// -------------------------------------------------------------
// GERENCIADOR DE PERSISTÊNCIA LOCAL COM SINCRONIZAÇÃO
// -------------------------------------------------------------
const STORAGE_PREFIX = "planmais_veicular_";

function getStorageKey(companyId: string, subKey: string) {
  return `${STORAGE_PREFIX}${companyId || "default"}_${subKey}`;
}

export function loadLocalData<T>(companyId: string, subKey: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(getStorageKey(companyId, subKey));
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function saveLocalData<T>(companyId: string, subKey: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(companyId, subKey), JSON.stringify(value));
  } catch (e) {
    console.error("Erro ao salvar dados locais do ecossistema veicular:", e);
  }
}

// -------------------------------------------------------------
// HELPER PARA DIA DE VENCIMENTO DO BOLETO DO ASSOCIADO
// -------------------------------------------------------------
export function getMemberDueDay(companyId: string, memberId: string, fallback: number = 20): number {
  if (typeof window === "undefined") return fallback;
  const store = loadLocalData<Record<string, number>>(companyId, "member_due_days", {});
  return store[memberId] ?? fallback;
}

export function setMemberDueDay(companyId: string, memberId: string, dueDay: number): void {
  if (typeof window === "undefined") return;
  const store = loadLocalData<Record<string, number>>(companyId, "member_due_days", {});
  store[memberId] = dueDay;
  saveLocalData(companyId, "member_due_days", store);
}

export function getAllMemberDueDays(companyId: string): Record<string, number> {
  return loadLocalData<Record<string, number>>(companyId, "member_due_days", {});
}

// -------------------------------------------------------------
// HELPERS PARA DADOS COMPLEMENTARES DE ASSOCIADOS E VEÍCULOS
// -------------------------------------------------------------
export function categoryToVehicleType(category?: string): VehicleType {
  const c = (category || "").toLowerCase();
  if (c.includes("moto")) return "moto";
  if (c.includes("pesad") || c.includes("caminh") || c.includes("carreta")) return "pesado";
  if (c.includes("utilit") || c.includes("van") || c.includes("furg")) return "utilitario";
  return "carro";
}

export function calculateImplementoMonthlyFee(commercialValue: number, categoryOrType?: string): number {
  if (!commercialValue || commercialValue <= 0) return 0;
  const vType =
    categoryOrType === "carro" ||
    categoryOrType === "moto" ||
    categoryOrType === "pesado" ||
    categoryOrType === "utilitario"
      ? (categoryOrType as VehicleType)
      : categoryToVehicleType(categoryOrType);
  return calculateBaseMonthlyFee(vType, commercialValue);
}

export function getMemberExtraData(companyId: string, memberId: string): MemberExtraData {
  if (typeof window === "undefined" || !memberId) return {};
  const all = loadLocalData<Record<string, MemberExtraData>>(companyId, "members_extra", {});
  const legacyAddr = loadLocalData<any>(companyId, `address_${memberId}`, null);
  return {
    ...(legacyAddr || {}),
    ...(all[memberId] || {}),
  };
}

export function saveMemberExtraData(companyId: string, memberId: string, data: MemberExtraData): void {
  if (typeof window === "undefined" || !memberId) return;
  const all = loadLocalData<Record<string, MemberExtraData>>(companyId, "members_extra", {});
  all[memberId] = {
    ...(all[memberId] || {}),
    ...data,
  };
  saveLocalData(companyId, "members_extra", all);
  if (data.cep || data.address || data.city) {
    saveLocalData(companyId, `address_${memberId}`, {
      cep: data.cep,
      address: data.address,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
    });
  }
}

export function getAllMembersExtraData(companyId: string): Record<string, MemberExtraData> {
  return loadLocalData<Record<string, MemberExtraData>>(companyId, "members_extra", {});
}

export function getVehicleExtraData(companyId: string, vehicleIdOrPlate?: string, fallbackPlate?: string): VehicleExtraData {
  if (typeof window === "undefined") return {};
  const all = loadLocalData<Record<string, VehicleExtraData>>(companyId, "vehicles_extra", {});
  const byId = vehicleIdOrPlate ? all[vehicleIdOrPlate] : undefined;
  const cleanPlate = (fallbackPlate || vehicleIdOrPlate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const byPlate = cleanPlate ? all[`PLATE_${cleanPlate}`] : undefined;
  return {
    ...(byPlate || {}),
    ...(byId || {}),
  };
}

export function saveVehicleExtraData(
  companyId: string,
  vehicleId: string | undefined,
  plate: string | undefined,
  data: VehicleExtraData
): void {
  if (typeof window === "undefined") return;
  const all = loadLocalData<Record<string, VehicleExtraData>>(companyId, "vehicles_extra", {});
  const cleanPlate = (plate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const merged = {
    ...(cleanPlate ? all[`PLATE_${cleanPlate}`] || {} : {}),
    ...(vehicleId ? all[vehicleId] || {} : {}),
    ...data,
  };
  if (vehicleId) {
    all[vehicleId] = merged;
  }
  if (cleanPlate) {
    all[`PLATE_${cleanPlate}`] = merged;
  }
  saveLocalData(companyId, "vehicles_extra", all);
}

export function getAllVehiclesExtraData(companyId: string): Record<string, VehicleExtraData> {
  return loadLocalData<Record<string, VehicleExtraData>>(companyId, "vehicles_extra", {});
}

export function formatDateTimeBR(isoOrDate?: string): string {
  if (!isoOrDate) return "";
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return isoOrDate;
    const datePart = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} às ${timePart}`;
  } catch {
    return isoOrDate;
  }
}

// -------------------------------------------------------------
// HELPERS DE FORMATAÇÃO E WHATSAPP
// -------------------------------------------------------------
export function generateCotacaoWhatsAppMessage(cotacao: CotacaoItem, companyName: string = "Planmais Proteção Veicular"): string {
  const fipeStr = cotacao.vehicleFipeValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalStr = cotacao.totalMonthlyFee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const franquiaStr = cotacao.estimatedParticipationFee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    `🚗 *PROPOSTA DE PROTEÇÃO VEICULAR - ${companyName.toUpperCase()}*\n\n` +
    `Olá, *${cotacao.memberName}*! Preparamos a cotação sob medida para o seu veículo:\n\n` +
    `📋 *DADOS DO VEÍCULO:*\n` +
    `• Placa: *${cotacao.vehiclePlate || "A DEFINIR"}*\n` +
    `• Marca/Modelo: *${cotacao.vehicleBrand} ${cotacao.vehicleModel}* (${cotacao.vehicleYear})\n` +
    `• Valor FIPE Avaliado: *${fipeStr}*\n` +
    `• Categoria de Uso: *${cotacao.vehicleUsage.toUpperCase()}*\n\n` +
    `🛡️ *COBERTURAS & PRODUTOS INCLUSOS:*\n` +
    `• Roubo, Furto, Colisão, Incêndio e Fenômenos Naturais (100% FIPE)\n` +
    `• Guincho e Assistência 24h em todo o Brasil\n` +
    (cotacao.selectedProducts.length > 0 ? `• Benefícios adicionais selecionados ativos\n` : "") +
    `\n💰 *VALORES DA PROTEÇÃO:*\n` +
    `• Mensalidade: *${totalStr} / mês*\n` +
    `• Cota de Participação (Franquia): *${franquiaStr}*\n` +
    `• Vencimento Preferencial: *Todo dia ${cotacao.preferredDueDay}*\n\n` +
    `✅ Sem análise de perfil ou consulta ao SPC/Serasa!\n` +
    `Para confirmar sua ativação e receber o Termo de Adesão, basta responder esta mensagem. Estamos prontos para cuidar do seu patrimônio!`
  );
}

export function generateBoletoWhatsAppMessage(
  memberName: string,
  plate: string,
  amount: number,
  dueDate: string,
  boletoUrl: string,
  companyName: string = "Planmais Proteção Veicular"
): string {
  const amountStr = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dueFormatted = dueDate.split("T")[0].split("-").reverse().join("/");

  return (
    `🔔 *LEMBRETE DE MENSALIDADE - ${companyName.toUpperCase()}*\n\n` +
    `Olá, *${memberName}*! Sua fatura de proteção do veículo *${plate}* está disponível.\n\n` +
    `• Valor: *${amountStr}*\n` +
    `• Vencimento: *${dueFormatted}*\n\n` +
    `📄 *Acesse seu boleto / código PIX pelo link seguro:*\n` +
    `${boletoUrl}\n\n` +
    `⚠️ *Atenção:* Mantenha sua mensalidade em dia para garantir a cobertura ativa de socorro, guincho 24h e proteção contra sinistros.`
  );
}

export function generateTermoAceiteWhatsAppMessage(
  memberName: string,
  plate: string,
  model: string,
  companyName: string = "PLANMAIS PROTEÇÃO"
): string {
  return (
    `📋 *PROPOSTA DE FILIAÇÃO & CONTRATO DE ADESÃO – ${companyName.toUpperCase()}*\n\n` +
    `Olá, *${memberName}*! Sua proposta de filiação ao Programa de Auxílio Mútuo (PAM) / Proteção Patrimonial Mutualista (PPM) para o veículo *${model}* (Placa: *${plate}*) foi emitida.\n\n` +
    `*DECLARAÇÃO DE ADESÃO:*\n` +
    `Solicito através desta proposta minha filiação à PLANMAIS PROTEÇÃO, declarando estar ciente dos meus direitos e deveres, bem como sujeito aos termos do regulamento do associado – Programa de Auxílio Mútuo (PAM), estando ciente de que o veículo cadastrado estará protegido a partir das 0:00hs do dia posterior à realização da inspeção/vistoria e pagamento de adesão.\n\n` +
    `Por favor, revise os dados e responda a esta mensagem com *"CONCORDO"* para confirmar a assinatura digital do seu Contrato de Adesão.`
  );
}

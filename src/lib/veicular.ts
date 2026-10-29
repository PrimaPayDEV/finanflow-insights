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
// DADOS PADRÃO DE COTAS DE PARTICIPAÇÃO (Franquia de Mercado)
// -------------------------------------------------------------
export const DEFAULT_COTAS_PARTICIPACAO: CotaParticipacaoFaixa[] = [
  // Carros e Utilitários Leves
  { id: "c-1", vehicleType: "carro", minFipe: 0, maxFipe: 35000, percentage: 6, minAmount: 1400, description: "Carros populares até R$ 35.000" },
  { id: "c-2", vehicleType: "carro", minFipe: 35001, maxFipe: 60000, percentage: 6, minAmount: 1800, description: "Carros médios até R$ 60.000" },
  { id: "c-3", vehicleType: "carro", minFipe: 60001, maxFipe: 100000, percentage: 6.5, minAmount: 2400, description: "Sedans e SUVs até R$ 100.000" },
  { id: "c-4", vehicleType: "carro", minFipe: 100001, maxFipe: 180000, percentage: 7, minAmount: 3500, description: "SUVs e Pickups premium até R$ 180.000" },
  { id: "c-5", vehicleType: "carro", minFipe: 180001, maxFipe: 999999, percentage: 8, minAmount: 5000, description: "Veículos de alto padrão acima de R$ 180.000" },
  
  // Motocicletas
  { id: "m-1", vehicleType: "moto", minFipe: 0, maxFipe: 15000, percentage: 8, minAmount: 900, description: "Motos até 160cc" },
  { id: "m-2", vehicleType: "moto", minFipe: 15001, maxFipe: 35000, percentage: 9, minAmount: 1500, description: "Motos 250cc a 400cc" },
  { id: "m-3", vehicleType: "moto", minFipe: 35001, maxFipe: 999999, percentage: 10, minAmount: 2500, description: "Motos de alta cilindrada (acima de 500cc)" },

  // Utilitários e Vans
  { id: "u-1", vehicleType: "utilitario", minFipe: 0, maxFipe: 70000, percentage: 7, minAmount: 2200, description: "Furgões e Pickups pequenas" },
  { id: "u-2", vehicleType: "utilitario", minFipe: 70001, maxFipe: 160000, percentage: 7.5, minAmount: 3200, description: "Vans de passageiros e carga" },
  { id: "u-3", vehicleType: "utilitario", minFipe: 160001, maxFipe: 999999, percentage: 8, minAmount: 4500, description: "Micro-ônibus e utilitários pesados" },

  // Caminhões e Pesados
  { id: "p-1", vehicleType: "pesado", minFipe: 0, maxFipe: 150000, percentage: 8, minAmount: 4000, description: "Caminhões 3/4 e toco" },
  { id: "p-2", vehicleType: "pesado", minFipe: 150001, maxFipe: 300000, percentage: 8.5, minAmount: 6000, description: "Caminhões trucados e cavalos mecânicos" },
  { id: "p-3", vehicleType: "pesado", minFipe: 300001, maxFipe: 999999, percentage: 9, minAmount: 8500, description: "Cavalos mecânicos pesados e carretas" },
];

// -------------------------------------------------------------
// DADOS PADRÃO DE PRODUTOS E COBERTURAS
// -------------------------------------------------------------
export const DEFAULT_PRODUTOS_VEICULARES: ProdutoVeicular[] = [
  {
    id: "prod-base-roubo",
    vehicleType: "todos",
    name: "Proteção Integral (Roubo, Furto, Colisão, Incêndio)",
    category: "cobertura",
    monthlyFee: 119.90,
    coverageLimit: "100% Tabela FIPE",
    description: "Cobertura completa com indenização integral ou reparo em oficinas credenciadas.",
    isRequired: true,
    isActive: true,
  },
  {
    id: "prod-terceiros-50",
    vehicleType: "todos",
    name: "Proteção para Terceiros (RCF) - R$ 50.000",
    category: "cobertura",
    monthlyFee: 34.90,
    coverageLimit: "R$ 50.000,00",
    description: "Cobertura para danos materiais causados a veículos e patrimônio de terceiros.",
    isActive: true,
  },
  {
    id: "prod-terceiros-100",
    vehicleType: "todos",
    name: "Proteção para Terceiros (RCF) - R$ 100.000",
    category: "cobertura",
    monthlyFee: 49.90,
    coverageLimit: "R$ 100.000,00",
    description: "Cobertura ampliada para danos a terceiros com maior tranquilidade.",
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
    name: "Proteção de Vidros, Faróis, Lanternas e Retrovisores",
    category: "cobertura",
    monthlyFee: 29.90,
    coverageLimit: "Troca com coparticipação reduzida",
    description: "Reparo ou substituição de para-brisas, vidros laterais, traseiro e conjunto óptico.",
    isActive: true,
  },
  {
    id: "prod-carro-reserva-7",
    vehicleType: "carro",
    name: "Carro Reserva - 7 Dias",
    category: "assistencia",
    monthlyFee: 22.90,
    coverageLimit: "7 diárias em locadora",
    description: "Carro popular 1.0 com ar-condicionado liberado em caso de sinistro com perda parcial.",
    isActive: true,
  },
  {
    id: "prod-carro-reserva-15",
    vehicleType: "carro",
    name: "Carro Reserva - 15 Dias",
    category: "assistencia",
    monthlyFee: 35.90,
    coverageLimit: "15 diárias em locadora",
    description: "Período estendido de locação para manutenções mais longas.",
    isActive: true,
  },
  {
    id: "prod-app-passageiro",
    vehicleType: "todos",
    name: "Acidentes Pessoais a Passageiros (APP)",
    category: "adicional",
    monthlyFee: 19.90,
    coverageLimit: "R$ 20.000 por ocupante",
    description: "Indenização por morte ou invalidez permanente para os ocupantes do veículo protegido.",
    isActive: true,
  },
];

// -------------------------------------------------------------
// HELPER PARA CÁLCULO DE COTA DE PARTICIPAÇÃO
// -------------------------------------------------------------
export function calculateParticipationFee(
  vehicleType: VehicleType,
  fipeValue: number,
  cotas: CotaParticipacaoFaixa[] = DEFAULT_COTAS_PARTICIPACAO
): { percentage: number; amount: number; description: string } {
  const match = cotas.find(
    (c) => c.vehicleType === vehicleType && fipeValue >= c.minFipe && fipeValue <= c.maxFipe
  );

  if (match) {
    const calculated = fipeValue * (match.percentage / 100);
    const amount = Math.max(calculated, match.minAmount);
    return {
      percentage: match.percentage,
      amount,
      description: match.description || `Mínimo de R$ ${match.minAmount.toFixed(2)} (${match.percentage}%)`,
    };
  }

  // Fallback genérico de 6% ou R$ 1.500
  const fallbackAmount = Math.max(fipeValue * 0.06, 1500);
  return {
    percentage: 6,
    amount: fallbackAmount,
    description: "Cota padrão 6% (mínimo R$ 1.500,00)",
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
  companyName: string = "Planmais Proteção Veicular"
): string {
  return (
    `📋 *TERMO DE ADESÃO & VISTORIA - ${companyName.toUpperCase()}*\n\n` +
    `Olá, *${memberName}*! Parabéns pela adesão da proteção do seu veículo *${model}* (Placa: *${plate}*).\n\n` +
    `O seu Termo de Filiação e Regulamento Interno foi gerado com sucesso.\n\n` +
    `Por favor, revise os dados e responda a esta mensagem com *"CONCORDO"* para validação do seu cadastro e ativação imediata da proteção veicular.\n\n` +
    `Qualquer dúvida estamos à disposição!`
  );
}

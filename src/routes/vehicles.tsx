import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Car,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Phone,
  MessageCircle,
  FileText,
  Filter,
  DollarSign,
  Sparkles,
  User,
  Eye,
  QrCode,
  Award,
  Save,
  Check,
  Settings2,
  Receipt,
  CalendarDays,
  Send,
  History,
  Truck,
  Trash2,
  Gauge,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getVehicles, getMembers, addVehicle, linkVehicleToMember } from "@/lib/members.functions";
import { getPartners } from "@/lib/partner.functions";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import { VehicleCategorySelector, VehicleCategoryBadge } from "@/components/VehicleCategorySelector";
import { ImplementosManager } from "@/routes/members";
import {
  type ImplementoItem,
  type CustomCoverageItem,
  type ProdutoVeicular,
  DEFAULT_PRODUTOS_VEICULARES,
  loadLocalData,
  getVehicleExtraData,
  saveVehicleExtraData,
  getAllVehiclesExtraData,
  getMemberExtraData,
  calculateBaseMonthlyFee,
  categoryToVehicleType,
  formatDateTimeBR
} from "@/lib/veicular";

export const Route = createFileRoute("/vehicles")({
  head: () => ({
    meta: [{ title: "Central de Veículos | Planmais Proteção Veicular" }],
  }),
  component: VehiclesPage,
});

// Função utilitária para formatar placas no padrão nacional (ex: DFG2154 -> DFG-2154 ou BRA2E19)
export function formatPlate(rawPlate: string): string {
  const clean = (rawPlate || "BRA2E19").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

// Componente Visual de Placa Mercosul / Padrão Nacional
function MercosulPlate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" | "lg" }) {
  const formatted = formatPlate(plate);

  const sizeClasses = {
    sm: "w-24 h-6.5 text-[11px] border-[1.5px]",
    md: "w-28 h-7.5 text-xs border-[1.5px]",
    lg: "w-32 h-9 text-sm border-2",
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-between bg-white text-slate-900 rounded-md font-mono font-black border-slate-900 shadow-xs overflow-hidden select-none shrink-0 ${sizeClasses[size]}`}>
      {/* Tarja azul Mercosul */}
      <div className="w-full bg-[#003399] text-white flex items-center justify-between px-1.5 py-0.5 leading-none">
        <span className="text-[5px] tracking-wider uppercase font-sans font-bold">BRASIL</span>
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1 bg-[#009b3a] rounded-xs relative flex items-center justify-center">
            <div className="w-1 h-0.5 bg-[#fedf00] rotate-45 flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-[#002776] rounded-full" />
            </div>
          </div>
        </div>
      </div>
      {/* Texto da Placa */}
      <div className="flex-1 flex items-center justify-center tracking-wider font-extrabold text-slate-950 font-mono">
        {formatted}
      </div>
    </div>
  );
}

// Estimativa coerente da Tabela FIPE por categoria de veículo e ano de fabricação
export function estimateRealisticFipe(brand?: string, model?: string, year?: number): number {
  const y = year || 2020;
  const b = (brand || "").toLowerCase();
  const m = (model || "").toLowerCase();

  if (m.includes("escort")) {
    if (y <= 1995) return 9800;
    if (y <= 2000) return 15800;
    return 19500;
  }
  if (m.includes("gol") || m.includes("palio") || m.includes("uno") || m.includes("celta") || m.includes("corsa") || m.includes("clio") || m.includes("ka") || m.includes("fiesta") || m.includes("fusca") || m.includes("chevette") || m.includes("monza")) {
    if (y <= 1990) return 8500;
    if (y <= 1998) return 9800;
    if (y <= 2002) return 13800;
    if (y <= 2008) return 19500;
    if (y <= 2014) return 29800;
    if (y <= 2020) return 44500;
    return 56800;
  }

  const isLuxury = /bmw|mercedes|audi|porsche|land rover|volvo|jaguar|lexus/.test(b) || /sw4|hilux|ram|commander|ranger|amarok/.test(m);
  const isSuvOrMid = /corolla|civic|compass|creta|renegade|kicks|t-cross|tracker|duster|hr-v|cruze|focus/.test(m);

  if (y <= 1995) return isLuxury ? 28000 : 11000;
  if (y <= 2000) return isLuxury ? 38000 : 16500;
  if (y <= 2005) return isLuxury ? 49000 : 22000;
  if (y <= 2010) return isLuxury ? 65000 : (isSuvOrMid ? 42000 : 31000);
  if (y <= 2015) return isLuxury ? 95000 : (isSuvOrMid ? 64000 : 45000);
  if (y <= 2018) return isLuxury ? 139000 : (isSuvOrMid ? 82000 : 59000);
  if (y <= 2021) return isLuxury ? 189000 : (isSuvOrMid ? 112000 : 76000);
  if (y <= 2024) return isLuxury ? 245000 : (isSuvOrMid ? 142000 : 92000);
  return isLuxury ? 295000 : (isSuvOrMid ? 158000 : 108000);
}

// Configuração granular de coberturas do associado
export interface CoverageConfig {
  fipePercent: number; // 0 (Inativa), 100, 90, 80
  theft: boolean; // Roubo e Furto
  collision: boolean; // Colisão e Perda Total
  thirdPartyProperty: number; // Danos materiais a terceiros (0 = Inativa, 50000, 100000)
  thirdPartyPersonal: number; // Danos corporais a terceiros
  towKm: number; // Guincho (0 = Inativa, 200, 500, 1000, 9999)
  reserveCarDays: number; // Carro reserva (0 = Inativa, 7, 15, 30)
  glassProtection: boolean; // Vidros, Faróis e Lanternas
  assistance24h: boolean; // Chaveiro, troca de pneu, socorro
  tracker: boolean; // Rastreador / Telemetria
}

export interface VehicleItem {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  yearModel?: number;
  color?: string;
  category?: string;
  chassi?: string;
  renavam?: string;
  fipeCode?: string;
  fipeValue?: number;
  mileage?: string;
  usage?: string;
  transmission?: string;
  engine?: string;
  trackerStatus?: string;
  trackerCode?: string;
  notes?: string;
  registeredAt?: string;
  implementos?: ImplementoItem[];
  customCoverages?: CustomCoverageItem[];
  coverageActive?: boolean;
  status: "ACTIVE" | "PENDING_INSPECTION" | "PENDING_PAYMENT" | "INACTIVE";
  coveragePlan: string;
  monthlyFee: number;
  dueDay: number;
  fuel?: string;
  isDemo?: boolean;
  coverageConfig: CoverageConfig;
  member: {
    id: string;
    name: string;
    document: string;
    phone?: string;
    email?: string;
    city?: string;
    partnerName?: string;
  };
}

const DEFAULT_COVERAGE: CoverageConfig = {
  fipePercent: 100,
  theft: true,
  collision: true,
  thirdPartyProperty: 100000,
  thirdPartyPersonal: 50000,
  towKm: 1000,
  reserveCarDays: 15,
  glassProtection: true,
  assistance24h: true,
  tracker: false,
};

const DEMO_VEHICLES: VehicleItem[] = [
  {
    id: "demo-1",
    plate: "BRA2E19",
    brand: "Toyota",
    model: "Corolla Altis 2.0 Dynamic Force Flex",
    year: 2024,
    yearModel: 2024,
    color: "Branco Perolizado",
    category: "Leves e utilitários",
    chassi: "9BRBL3HE8P0192841",
    renavam: "01398274619",
    fipeValue: 154800,
    mileage: "18.400 km",
    usage: "Particular",
    transmission: "Automático CVT",
    engine: "2.0 16V 177cv",
    trackerStatus: "Instalado e Ativo",
    trackerCode: "TRK-99812",
    coverageActive: true,
    implementos: [],
    customCoverages: [],
    status: "ACTIVE",
    coveragePlan: "Plano Ouro 100% FIPE",
    monthlyFee: 189.90,
    dueDay: 10,
    fuel: "Flex (Álcool/Gasolina)",
    isDemo: false,
    coverageConfig: { ...DEFAULT_COVERAGE, towKm: 1000, reserveCarDays: 15 },
    member: {
      id: "mem-1",
      name: "Roberto Albuquerque Silveira",
      document: "284.912.847-19",
      phone: "(11) 98471-9283",
      email: "roberto.albuquerque@email.com",
      city: "São Paulo - SP",
      partnerName: "Consultor Carlos Henrique",
    },
  },
  {
    id: "demo-2",
    plate: "RBD7F88",
    brand: "Jeep",
    model: "Compass Longitude 1.3 T270 Turbo",
    year: 2023,
    yearModel: 2023,
    color: "Cinza Granite",
    category: "Leves e utilitários",
    chassi: "9886FB981N0284712",
    renavam: "01284719284",
    fipeValue: 158900,
    mileage: "32.100 km",
    usage: "Particular",
    transmission: "Automático",
    engine: "1.3 Turbo 185cv",
    trackerStatus: "Instalado e Ativo",
    coverageActive: true,
    implementos: [],
    customCoverages: [],
    status: "ACTIVE",
    coveragePlan: "Plano Ouro 100% FIPE + Terceiros R$ 100k",
    monthlyFee: 198.50,
    dueDay: 15,
    fuel: "Flex (Álcool/Gasolina)",
    isDemo: false,
    coverageConfig: { ...DEFAULT_COVERAGE, thirdPartyProperty: 100000, reserveCarDays: 15 },
    member: {
      id: "mem-2",
      name: "Juliana Mendonça Castro",
      document: "391.824.918-02",
      phone: "(11) 99182-3746",
      email: "juliana.mendonca@email.com",
      city: "Campinas - SP",
      partnerName: "Corretora Aliança",
    },
  },
  {
    id: "demo-3",
    plate: "PLM3A45",
    brand: "Fiat",
    model: "Toro Volcano 2.0 16V 4x4 Diesel Aut.",
    year: 2022,
    yearModel: 2022,
    color: "Vermelho Colorado",
    category: "Leves e utilitários",
    chassi: "9BD226392M0384719",
    renavam: "01192837465",
    fipeValue: 136400,
    mileage: "54.000 km",
    usage: "Comercial",
    transmission: "Automático 9M",
    engine: "2.0 Turbodiesel",
    trackerStatus: "Instalado e Ativo",
    coverageActive: true,
    implementos: [],
    customCoverages: [],
    status: "PENDING_INSPECTION",
    coveragePlan: "Plano Integral Utilitário + Rastreador",
    monthlyFee: 219.00,
    dueDay: 10,
    fuel: "Diesel",
    isDemo: false,
    coverageConfig: { ...DEFAULT_COVERAGE, tracker: true, towKm: 1000 },
    member: {
      id: "mem-3",
      name: "Marcos Vinícius Prado",
      document: "192.837.461-90",
      phone: "(19) 98172-4638",
      email: "marcos.prado@email.com",
      city: "Ribeirão Preto - SP",
      partnerName: "Consultor Lucas Mendes",
    },
  },
];

function getStatusBadge(status: VehicleItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 font-bold text-[11px] py-0.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Proteção Ativa
        </Badge>
      );
    case "PENDING_INSPECTION":
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 font-bold text-[11px] py-0.5">
          <Clock className="size-3" />
          Em Vistoria
        </Badge>
      );
    case "PENDING_PAYMENT":
      return (
        <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 gap-1 font-bold text-[11px] py-0.5">
          <AlertTriangle className="size-3" />
          Fatura Pendente
        </Badge>
      );
    case "INACTIVE":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px] py-0.5">
          Inativo
        </Badge>
      );
  }
}

function VehiclesPage() {
  const { companyId } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);

  // Estado local para persistir edições de coberturas, ficha técnica e mensalidades
  const [overrides, setOverrides] = useState<Record<string, Partial<VehicleItem>>>({});

  // Queries
  const fetchVehicles = useServerFn(getVehicles);
  const { data: dbVehicles = [] } = useQuery({
    queryKey: ["vehicles", companyId],
    queryFn: () => fetchVehicles({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const fetchMembers = useServerFn(getMembers);
  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const fetchPartners = useServerFn(getPartners);
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [vehicleToLink, setVehicleToLink] = useState<VehicleItem | null>(null);
  const [targetMemberId, setTargetMemberId] = useState("");

  const linkMutation = useMutation({
    mutationFn: useServerFn(linkVehicleToMember),
    onSuccess: () => {
      toast.success("Veículo vinculado ao associado com sucesso!");
      qc.invalidateQueries({ queryKey: ["vehicles", companyId] });
      qc.invalidateQueries({ queryKey: ["members", companyId] });
      setLinkModalOpen(false);
    },
    onError: (err: any) => toast.error("Erro ao vincular veículo: " + err.message),
  });

  // Mapeia veículos do banco enriquecidos com dados extras (chassi, renavam, implementos, coberturas)
  const mappedDbVehicles: VehicleItem[] = useMemo(() => {
    const extrasMap = getAllVehiclesExtraData(companyId || "default");
    return (dbVehicles || []).map((v: any) => {
      const cleanPlate = (v.plate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const extra = {
        ...(cleanPlate ? extrasMap[`PLATE_${cleanPlate}`] || {} : {}),
        ...(v.id ? extrasMap[v.id] || {} : {}),
      };
      const memberExtra = v.members?.id ? getMemberExtraData(companyId || "default", v.members.id) : {};

      return {
        id: v.id,
        plate: v.plate || "SEM-PLACA",
        brand: v.brand || "Não informada",
        model: v.model || "Modelo não informado",
        year: v.year || new Date().getFullYear(),
        yearModel: extra.yearModel || v.year || new Date().getFullYear(),
        color: v.color || extra.color || "Prata",
        category: v.category || "Leves e utilitários",
        chassi: extra.chassi || `9BW${(v.id || "").slice(0, 8).toUpperCase()}`,
        renavam: extra.renavam || `00${(v.id || "").replace(/\D/g, "").slice(0, 9)}`,
        fipeCode: extra.fipeCode,
        fipeValue: v.fipe_value || extra.fipeValue || estimateRealisticFipe(v.brand, v.model, v.year),
        mileage: extra.mileage || "Não informada",
        usage: extra.usage || "Particular",
        transmission: extra.transmission || "Manual / Aut.",
        engine: extra.engine || "Padrão",
        trackerStatus: extra.trackerStatus || "Ativo",
        trackerCode: extra.trackerCode || "",
        notes: extra.notes || "",
        registeredAt: extra.registeredAt || v.created_at,
        implementos: extra.implementos || [],
        customCoverages: extra.customCoverages || [],
        coverageActive: extra.coverageActive ?? true,
        status: "ACTIVE" as const,
        coveragePlan: extra.coveragePlan || "Plano Ouro 100% FIPE",
        monthlyFee: Number(v.monthly_fee) || 179.90,
        dueDay: 10,
        fuel: extra.fuel || (v.year && v.year <= 2002 ? "Gasolina" : "Flex"),
        isDemo: false,
        coverageConfig: { ...DEFAULT_COVERAGE, ...(extra.coverageConfig || {}) },
        member: {
          id:
            v.members?.document === "00000000000" || v.members?.name?.includes("Avulso")
              ? ""
              : v.members?.id || "",
          name:
            v.members?.document === "00000000000" || v.members?.name?.includes("Avulso")
              ? "Veículo Avulso (Não Vinculado)"
              : v.members?.name || "Associado não identificado",
          document:
            v.members?.document === "00000000000" || v.members?.name?.includes("Avulso")
              ? ""
              : v.members?.document || "",
          phone: v.members?.phone,
          email: v.members?.email,
          city: memberExtra.city ? `${memberExtra.city} - ${memberExtra.state || ""}` : "São Paulo - SP",
          partnerName: v.members?.partners?.name,
        },
      };
    });
  }, [dbVehicles, companyId, overrides]);

  // Lista unificada aplicando os overrides
  const allVehicles = useMemo(() => {
    const baseList = mappedDbVehicles.length > 0 ? mappedDbVehicles : DEMO_VEHICLES;

    return baseList.map((v) => {
      const ov = overrides[v.id];
      if (!ov) return v;
      return {
        ...v,
        ...ov,
        coverageConfig: {
          ...v.coverageConfig,
          ...(ov.coverageConfig || {}),
        },
      };
    });
  }, [mappedDbVehicles, overrides]);

  // Se o usuário clicou em um veículo existente na tela de Associados (?vehicleId=... ou ?plate=...), abre automaticamente o Dossiê
  useEffect(() => {
    if (typeof window !== "undefined" && allVehicles.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const qVehicleId = params.get("vehicleId");
      const qPlate = params.get("plate");
      if (qVehicleId || qPlate) {
        const match = allVehicles.find(
          (v) =>
            (qVehicleId && v.id === qVehicleId) ||
            (qPlate && v.plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase() === qPlate.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
        );
        if (match) {
          setSelectedVehicle(match);
          setDossierOpen(true);
          // Limpar query params sem recarregar para evitar reabrir ao fechar
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }
  }, [allVehicles]);

  // Filtros de busca
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((v) => {
      const q = search.toLowerCase();
      const matchSearch =
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.chassi || "").toLowerCase().includes(q) ||
        (v.renavam || "").toLowerCase().includes(q) ||
        v.member.name.toLowerCase().includes(q) ||
        v.member.document.includes(q);

      const matchStatus = statusFilter === "ALL" || v.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [allVehicles, search, statusFilter]);

  // Métricas
  const totalVehicles = allVehicles.length;
  const activeVehicles = allVehicles.filter((v) => v.status === "ACTIVE").length;
  const pendingInspection = allVehicles.filter((v) => v.status === "PENDING_INSPECTION").length;
  const totalFipeValue = allVehicles.reduce((acc, v) => acc + (v.fipeValue || 0), 0);

  const openDossier = (vehicle: VehicleItem) => {
    setSelectedVehicle(vehicle);
    setDossierOpen(true);
  };

  const handleUpdateVehicle = async (updated: VehicleItem) => {
    const previous = allVehicles.find((v) => v.id === updated.id);
    setOverrides((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));
    setSelectedVehicle(updated);

    // Salva todos os dados extras (chassi, renavam, implementos, coberturas customizadas, etc.) localmente
    saveVehicleExtraData(companyId || "default", updated.id, updated.plate, {
      chassi: updated.chassi,
      renavam: updated.renavam,
      yearModel: updated.yearModel,
      color: updated.color,
      fuel: updated.fuel,
      mileage: updated.mileage,
      usage: updated.usage,
      transmission: updated.transmission,
      engine: updated.engine,
      fipeValue: updated.fipeValue,
      trackerStatus: updated.trackerStatus,
      trackerCode: updated.trackerCode,
      notes: updated.notes,
      implementos: updated.implementos,
      customCoverages: updated.customCoverages,
      coverageActive: updated.coverageActive,
      coveragePlan: updated.coveragePlan,
      coverageConfig: updated.coverageConfig,
    });

    // Persiste alterações no banco para que a geração de faturas use o valor atualizado
    if (!updated.isDemo && companyId && previous) {
      const dbUpdate: any = {
        monthly_fee: updated.monthlyFee,
        fipe_value: updated.fipeValue,
        color: updated.color,
        brand: updated.brand,
        model: updated.model,
        year: updated.year,
        category: updated.category,
      };
      const { error } = await supabase
        .from("vehicles")
        .update(dbUpdate)
        .eq("id", updated.id)
        .eq("company_id", companyId);
      if (error) {
        // Fallback caso alguma coluna opcional não exista
        await supabase
          .from("vehicles")
          .update({ monthly_fee: updated.monthlyFee })
          .eq("id", updated.id)
          .eq("company_id", companyId);
      }
      qc.invalidateQueries({ queryKey: ["vehicles", companyId] });
      qc.invalidateQueries({ queryKey: ["members", companyId] });
    }
  };

  return (
    <AppLayout
      title="Central de Veículos"
      subtitle="Gestão completa da frota protegida, implementos, coberturas ativas/inativas e mensalidades"
      actions={<NewVehicleDialog members={members} partners={partners} />}
    >
      <div className="space-y-5">
        {/* KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total da Frota
                </span>
                <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Car className="size-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <p className="text-2xl font-extrabold text-foreground">{totalVehicles}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Veículos cadastrados no sistema</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Proteção Ativa
                </span>
                <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="size-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {activeVehicles}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {totalVehicles > 0 ? `${Math.round((activeVehicles / totalVehicles) * 100)}% de adimplência` : "0%"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Em Vistoria
                </span>
                <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="size-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {pendingInspection}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Novas adesões para homologar</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Patrimônio FIPE
                </span>
                <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <DollarSign className="size-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <p className="text-xl font-extrabold text-foreground truncate">
                  {BRL(totalFipeValue)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Patrimônio total protegido</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por placa, chassi, renavam, modelo, marca, associado ou CPF..."
                  className="pl-9 h-9 rounded-xl bg-background border-border/80 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[170px] rounded-xl bg-background border-border/80 text-xs font-medium">
                    <Filter className="size-3 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="ACTIVE">Proteção Ativa</SelectItem>
                    <SelectItem value="PENDING_INSPECTION">Em Vistoria</SelectItem>
                    <SelectItem value="PENDING_PAYMENT">Fatura Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listagem de Veículos em Tabela/Lista */}
        {filteredVehicles.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border p-10 text-center bg-card">
            <div className="size-12 rounded-2xl bg-muted/80 text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <Car className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Nenhum veículo encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Nenhum veículo corresponde aos filtros selecionados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-3 rounded-xl text-xs h-8"
            >
              Limpar Filtros
            </Button>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 sm:px-3.5">Veículo / Chassi</th>
                    <th className="px-3 py-3 sm:px-3.5">Categoria / Dados</th>
                    <th className="px-3 py-3 sm:px-3.5">Tabela FIPE / Imp.</th>
                    <th className="px-3 py-3 sm:px-3.5">Associado</th>
                    <th className="px-3 py-3 sm:px-3.5">Mensalidade</th>
                    <th className="px-3 py-3 sm:px-3.5 text-center">Status / Cobertura</th>
                    <th className="px-3 py-3 sm:px-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredVehicles.map((vehicle) => {
                    const impCount = vehicle.implementos?.length || 0;
                    const isCovActive = vehicle.coverageActive !== false;

                    return (
                      <tr
                        key={vehicle.id}
                        onClick={() => openDossier(vehicle)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        title="Clique para abrir Ficha Técnica, Coberturas (Ativa/Inativa) e Mensalidades"
                      >
                        {/* Veículo */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MercosulPlate plate={vehicle.plate} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                                  {vehicle.brand}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  • {vehicle.year}
                                </span>
                                {impCount > 0 && (
                                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold px-1.5 py-0">
                                    +{impCount} Impl.
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold text-xs text-foreground leading-tight truncate mt-0.5 max-w-[160px] sm:max-w-[200px] group-hover:text-primary transition-colors">
                                {vehicle.model}
                              </h4>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                                Chassi: {vehicle.chassi || "N/I"} • Ren: {vehicle.renavam || "N/I"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Categoria / Cor */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="space-y-0.5">
                            <VehicleCategoryBadge category={vehicle.category} size="sm" />
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                              {vehicle.color || "Prata"} {vehicle.fuel ? `• ${vehicle.fuel}` : ""}
                            </div>
                          </div>
                        </td>

                        {/* FIPE */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle whitespace-nowrap">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs block">
                            {BRL(vehicle.fipeValue || 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            FIPE {vehicle.coverageConfig.fipePercent}%
                          </span>
                        </td>

                        {/* Associado / Vínculo */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          {vehicle.member.name.includes("Avulso") || !vehicle.member.id ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/30 text-[10px] font-bold">
                                Avulso (Sem Associado)
                              </Badge>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVehicleToLink(vehicle);
                                  setTargetMemberId("");
                                  setLinkModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-primary hover:underline block text-left"
                              >
                                + Vincular a Associado
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5 max-w-[180px] sm:max-w-[200px]">
                              <div className="overflow-hidden min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate max-w-[120px] sm:max-w-[150px] lg:max-w-[180px]">
                                  {vehicle.member.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {formatCpfCnpj(vehicle.member.document)}
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVehicleToLink(vehicle);
                                    setTargetMemberId(vehicle.member.id);
                                    setLinkModalOpen(true);
                                  }}
                                  className="text-[9px] text-muted-foreground hover:text-primary hover:underline block mt-0.5 text-left"
                                >
                                  Alterar Vínculo
                                </button>
                              </div>
                              {vehicle.member.phone && (
                                <a
                                  href={`https://wa.me/55${vehicle.member.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Conversar no WhatsApp"
                                  className="size-6.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors shrink-0"
                                >
                                  <MessageCircle className="size-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Mensalidade */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle whitespace-nowrap">
                          <span className="font-bold text-foreground text-xs block font-mono">
                            {BRL(vehicle.monthlyFee || 179.9)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Venc. dia {vehicle.dueDay}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            {getStatusBadge(vehicle.status)}
                            <span
                              className={`text-[9px] font-bold ${
                                isCovActive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                              }`}
                            >
                              {isCovActive ? "Coberturas Ativas" : "Cobertura Inativa"}
                            </span>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => openDossier(vehicle)}
                            className="rounded-xl h-7.5 px-2.5 sm:px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-xs"
                            title="Abrir Dossiê, Coberturas e Mensalidade"
                          >
                            <Eye className="size-3.5 shrink-0" />
                            <span>Dossiê / Coberturas</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal do Dossiê Completo do Veículo (3 Abas: Ficha Técnica Completa, Coberturas Ativa/Inativa + Outras, e Mensalidades) */}
        {selectedVehicle && (
          <VehicleDossierDialog
            open={dossierOpen}
            onOpenChange={setDossierOpen}
            vehicle={selectedVehicle}
            onUpdate={handleUpdateVehicle}
            onOpenCertificate={() => {
              setDossierOpen(false);
              setCertificateOpen(true);
            }}
          />
        )}

        {selectedVehicle && (
          <CertificateDialog
            open={certificateOpen}
            onOpenChange={setCertificateOpen}
            vehicle={selectedVehicle}
          />
        )}

        {/* Modal de Vinculação Rápida de Veículo a Associado */}
        <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md sm:h-[310px] max-h-[90vh] flex flex-col justify-between rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-4 text-primary" /> Vincular Veículo a Associado
              </DialogTitle>
              <DialogDescription className="text-xs">
                Selecione o associado proprietário para a placa {vehicleToLink?.plate}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 sm:p-5 space-y-3 text-xs flex-1 flex flex-col justify-center">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Veículo Selecionado:</span>
                <span className="font-extrabold text-foreground text-sm block font-mono">
                  {vehicleToLink?.plate} • {vehicleToLink?.brand} {vehicleToLink?.model}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Associado Proprietário *</Label>
                <Select value={targetMemberId} onValueChange={setTargetMemberId}>
                  <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                    <SelectValue placeholder="Selecione o associado..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    <SelectItem value="avulso" className="text-amber-600 font-semibold">
                      ⚡ Desvincular (Manter como Veículo Avulso)
                    </SelectItem>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({formatCpfCnpj(m.document)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkModalOpen(false)} className="rounded-xl text-xs h-8">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!vehicleToLink) return;
                  linkMutation.mutate({
                    data: {
                      companyId: companyId!,
                      vehicleId: vehicleToLink.id,
                      memberId: targetMemberId,
                    },
                  });
                }}
                disabled={linkMutation.isPending}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-8 px-4"
              >
                {linkMutation.isPending ? "Salvando..." : "Confirmar Vínculo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Modal do Dossiê com 3 abas completas: Ficha Técnica (editável + implementos), Coberturas (Ativa/Inativa + Adicionar Outras Coberturas) e Mensalidades
function VehicleDossierDialog({
  open,
  onOpenChange,
  vehicle,
  onUpdate,
  onOpenCertificate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleItem;
  onUpdate: (updated: VehicleItem) => void;
  onOpenCertificate: () => void;
}) {
  const { companyId } = useAuth();

  // Estado para edição da Ficha Técnica e Implementos
  const [chassi, setChassi] = useState(vehicle.chassi || "");
  const [renavam, setRenavam] = useState(vehicle.renavam || "");
  const [color, setColor] = useState(vehicle.color || "Prata");
  const [fuel, setFuel] = useState(vehicle.fuel || "Flex");
  const [mileage, setMileage] = useState(vehicle.mileage || "");
  const [usage, setUsage] = useState(vehicle.usage || "Particular");
  const [transmission, setTransmission] = useState(vehicle.transmission || "Manual");
  const [engine, setEngine] = useState(vehicle.engine || "");
  const [trackerStatus, setTrackerStatus] = useState(vehicle.trackerStatus || "Instalado e Ativo");
  const [trackerCode, setTrackerCode] = useState(vehicle.trackerCode || "");
  const [fipeValueInput, setFipeValueInput] = useState(String(Math.round((vehicle.fipeValue || 50000) * 100)));
  const [notes, setNotes] = useState(vehicle.notes || "");
  const [implementos, setImplementos] = useState<ImplementoItem[]>(vehicle.implementos || []);

  // Estado local para edição de Coberturas (Ativa/Inativa + Outras Coberturas)
  const [coverageActive, setCoverageActive] = useState<boolean>(vehicle.coverageActive ?? true);
  const [coveragePlan, setCoveragePlan] = useState(vehicle.coveragePlan || "Plano Ouro 100% FIPE");
  const [coverage, setCoverage] = useState<CoverageConfig>({
    ...DEFAULT_COVERAGE,
    ...(vehicle.coverageConfig || {}),
  });
  const [customCoverages, setCustomCoverages] = useState<CustomCoverageItem[]>(vehicle.customCoverages || []);

  // Formulário para adicionar outra cobertura
  const [addingCoverage, setAddingCoverage] = useState(false);
  const [newCovName, setNewCovName] = useState("");
  const [newCovLimit, setNewCovLimit] = useState("");
  const [newCovFeeStr, setNewCovFeeStr] = useState("2990"); // R$ 29,90

  // Produtos cadastrados na associação para seleção rápida
  const catalogProducts = useMemo(() => {
    return loadLocalData<ProdutoVeicular[]>(companyId || "default", "produtos", DEFAULT_PRODUTOS_VEICULARES);
  }, [companyId]);

  // Estado local para edição da Mensalidade
  const [monthlyFeeInput, setMonthlyFeeInput] = useState((vehicle.monthlyFee || 179.9).toFixed(2).replace(".", ","));
  const [dueDay, setDueDay] = useState(vehicle.dueDay ? vehicle.dueDay.toString() : "10");
  const [protectionStatus, setProtectionStatus] = useState<VehicleItem["status"]>(vehicle.status || "ACTIVE");

  // Sincronizar estado caso o veículo selecionado mude
  useEffect(() => {
    setChassi(vehicle.chassi || "");
    setRenavam(vehicle.renavam || "");
    setColor(vehicle.color || "Prata");
    setFuel(vehicle.fuel || "Flex");
    setMileage(vehicle.mileage || "");
    setUsage(vehicle.usage || "Particular");
    setTransmission(vehicle.transmission || "Manual");
    setEngine(vehicle.engine || "");
    setTrackerStatus(vehicle.trackerStatus || "Instalado e Ativo");
    setTrackerCode(vehicle.trackerCode || "");
    setFipeValueInput(String(Math.round((vehicle.fipeValue || 50000) * 100)));
    setNotes(vehicle.notes || "");
    setImplementos(vehicle.implementos || []);

    setCoverageActive(vehicle.coverageActive ?? true);
    setCoveragePlan(vehicle.coveragePlan || "Plano Ouro 100% FIPE");
    setCoverage({
      ...DEFAULT_COVERAGE,
      ...(vehicle.coverageConfig || {}),
    });
    setCustomCoverages(vehicle.customCoverages || []);

    setMonthlyFeeInput((vehicle.monthlyFee || 179.9).toFixed(2).replace(".", ","));
    setDueDay(vehicle.dueDay ? vehicle.dueDay.toString() : "10");
    setProtectionStatus(vehicle.status || "ACTIVE");
  }, [vehicle]);

  // Cálculo automático de sugestão de mensalidade (Base + Implementos + Coberturas Extras Ativas)
  const parsedFipe = Number(fipeValueInput.replace(/\D/g, "")) / 100 || vehicle.fipeValue || 50000;
  const baseSuggestedFee = useMemo(
    () => calculateBaseMonthlyFee(categoryToVehicleType(vehicle.category), parsedFipe),
    [vehicle.category, parsedFipe]
  );
  const implementosTotalFee = useMemo(
    () => implementos.reduce((acc, i) => acc + (i.monthlyFee || 0), 0),
    [implementos]
  );
  const activeCustomCoveragesFee = useMemo(
    () => customCoverages.filter((c) => c.isActive).reduce((acc, c) => acc + (c.monthlyFee || 0), 0),
    [customCoverages]
  );

  // Salvar Ficha Técnica + Implementos
  const handleSaveTechnical = () => {
    const newSuggestedTotal = baseSuggestedFee + implementosTotalFee + activeCustomCoveragesFee;
    const updated: VehicleItem = {
      ...vehicle,
      chassi: chassi.trim().toUpperCase(),
      renavam: renavam.trim(),
      color,
      fuel,
      mileage,
      usage,
      transmission,
      engine,
      trackerStatus,
      trackerCode,
      fipeValue: parsedFipe,
      notes,
      implementos,
      monthlyFee: implementos.length > 0 ? newSuggestedTotal : vehicle.monthlyFee,
    };
    if (implementos.length > 0) {
      setMonthlyFeeInput(newSuggestedTotal.toFixed(2).replace(".", ","));
    }
    onUpdate(updated);
    toast.success("Ficha técnica e implementos do veículo atualizados!");
  };

  // Adicionar nova cobertura personalizada
  const handleAddCustomCoverage = () => {
    if (!newCovName.trim()) {
      toast.error("Informe o nome da cobertura adicional.");
      return;
    }
    const fee = Number(newCovFeeStr.replace(/\D/g, "")) / 100 || 0;
    const item: CustomCoverageItem = {
      id: "cov-" + Date.now(),
      name: newCovName.trim(),
      limit: newCovLimit.trim() || "Cobertura Contratada",
      monthlyFee: fee,
      isActive: true,
    };
    const nextList = [...customCoverages, item];
    setCustomCoverages(nextList);
    setNewCovName("");
    setNewCovLimit("");
    setNewCovFeeStr("2990");
    setAddingCoverage(false);
    toast.success(`Cobertura "${item.name}" adicionada!`);
  };

  // Salvar Coberturas
  const handleSaveCoverage = () => {
    const updated: VehicleItem = {
      ...vehicle,
      coverageActive,
      coveragePlan,
      coverageConfig: coverage,
      customCoverages,
      status: coverageActive ? (vehicle.status === "INACTIVE" ? "ACTIVE" : vehicle.status) : "INACTIVE",
    };
    onUpdate(updated);
    toast.success("Coberturas do veículo atualizadas com sucesso!");
  };

  // Salvar Mensalidade
  const handleSaveMonthly = () => {
    const fee = parseFloat(monthlyFeeInput.replace(/\./g, "").replace(",", ".")) || vehicle.monthlyFee;
    const updated: VehicleItem = {
      ...vehicle,
      monthlyFee: fee,
      dueDay: parseInt(dueDay, 10) || 10,
      status: protectionStatus,
      coverageActive: protectionStatus !== "INACTIVE",
    };
    onUpdate(updated);
    toast.success("Valor da proteção e vencimento atualizados!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-[940px] sm:max-w-5xl sm:h-[640px] max-h-[92vh] flex flex-col p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
        {/* Cabeçalho Compacto */}
        <div className="relative bg-gradient-to-r from-primary/15 via-primary/5 to-card pl-4 sm:pl-5 pr-12 sm:pr-14 py-3 border-b border-border/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <MercosulPlate plate={vehicle.plate} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                    {vehicle.brand} • {vehicle.year}
                  </span>
                  <VehicleCategoryBadge category={vehicle.category} size="sm" />
                  {implementos.length > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0">
                      {implementos.length} Implemento(s)
                    </Badge>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate" title={vehicle.model}>
                  {vehicle.model}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
              {getStatusBadge(vehicle.status)}
              <div className="text-right flex flex-col items-end justify-center bg-card/85 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-border/60 shadow-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                  FIPE Avaliada
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  {BRL(parsedFipe)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
          <div className="border-b border-border/60 px-4 sm:px-5 bg-muted/20 shrink-0">
            <TabsList className="bg-transparent h-9 p-0 gap-4 sm:gap-6 w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs px-1 h-9 transition-colors"
              >
                Ficha Técnica & Implementos
              </TabsTrigger>
              <TabsTrigger
                value="coverage"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs px-1 h-9 transition-colors"
              >
                Coberturas (Ativa/Inativa & Adicionais)
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs px-1 h-9 transition-colors"
              >
                Mensalidades
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 flex flex-col justify-start">
            {/* ABA 1: Ficha Técnica Completa + Implementos */}
            <TabsContent value="overview" className="m-0 p-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Lado Esquerdo: Informações Completas do Veículo (7 colunas) */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Car className="size-3.5" /> Informações Detalhadas do Veículo
                    </h3>
                    <Button
                      size="sm"
                      onClick={handleSaveTechnical}
                      className="h-7 rounded-xl text-[11px] font-bold gap-1 bg-primary text-primary-foreground px-3"
                    >
                      <Save className="size-3" />
                      Salvar Ficha Técnica
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Número do Chassi *</Label>
                      <Input
                        value={chassi}
                        onChange={(e) => setChassi(e.target.value.toUpperCase())}
                        placeholder="9BWZZZ377VT004251"
                        className="h-8 rounded-xl text-xs font-mono font-bold uppercase bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Número do Renavam *</Label>
                      <Input
                        value={renavam}
                        onChange={(e) => setRenavam(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        placeholder="00123456789"
                        className="h-8 rounded-xl text-xs font-mono font-bold bg-background"
                      />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Valor FIPE / Comercial</Label>
                      <Input
                        value={formatCurrencyInput(fipeValueInput)}
                        onChange={(e) => setFipeValueInput(e.target.value)}
                        className="h-8 rounded-xl text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Cor</Label>
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Combustível</Label>
                      <Select value={fuel} onValueChange={setFuel}>
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Flex">Flex</SelectItem>
                          <SelectItem value="Flex (Álcool/Gasolina)">Flex (Álcool/Gasolina)</SelectItem>
                          <SelectItem value="Gasolina">Gasolina</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="Etanol">Etanol</SelectItem>
                          <SelectItem value="GNV">GNV</SelectItem>
                          <SelectItem value="Híbrido/Elétrico">Híbrido / Elétrico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Hodômetro (KM)</Label>
                      <Input
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        placeholder="Ex: 42.000 km"
                        className="h-8 rounded-xl text-xs font-mono bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Finalidade de Uso</Label>
                      <Select value={usage} onValueChange={setUsage}>
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Particular">Passeio / Particular</SelectItem>
                          <SelectItem value="Comercial">Comercial / Trabalho</SelectItem>
                          <SelectItem value="Motorista App">Aplicativo (Uber/99)</SelectItem>
                          <SelectItem value="Frota / Carga">Transporte de Carga</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Câmbio</Label>
                      <Input
                        value={transmission}
                        onChange={(e) => setTransmission(e.target.value)}
                        placeholder="Manual, Automático..."
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Motorização</Label>
                      <Input
                        value={engine}
                        onChange={(e) => setEngine(e.target.value)}
                        placeholder="Ex: 2.0 16V, 1.0 Turbo"
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Status Rastreador GPS</Label>
                      <Select value={trackerStatus} onValueChange={setTrackerStatus}>
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Instalado e Ativo">Instalado e Ativo</SelectItem>
                          <SelectItem value="Aguardando Instalação">Aguardando Instalação</SelectItem>
                          <SelectItem value="Isento / Não Requerido">Isento / Não Requerido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">ID / IMEI Rastreador</Label>
                      <Input
                        value={trackerCode}
                        onChange={(e) => setTrackerCode(e.target.value)}
                        placeholder="Ex: IMEI-882910"
                        className="h-8 rounded-xl text-xs font-mono bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Observações / Vistoria</Label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Laudo, avarias..."
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Seção de Implementos dentro da Ficha Técnica */}
                  <ImplementosManager
                    implementos={implementos}
                    onChange={setImplementos}
                    category={vehicle.category}
                  />
                </div>

                {/* Lado Direito: Associado Titular & Resumo (5 colunas) */}
                <div className="md:col-span-5 space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" /> Associado Titular
                  </h3>
                  <div className="p-3.5 rounded-2xl bg-muted/25 border border-border/60 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        {vehicle.member.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-foreground text-xs leading-tight truncate">{vehicle.member.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          CPF: {formatCpfCnpj(vehicle.member.document)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-border/40">
                      <div>
                        <span className="text-[9px] text-muted-foreground block">Cidade / UF</span>
                        <span className="font-medium text-[11px] text-foreground truncate block">
                          {vehicle.member.city || "São Paulo - SP"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block">E-mail</span>
                        <span className="font-medium text-[11px] text-foreground truncate block">
                          {vehicle.member.email || "Sem e-mail"}
                        </span>
                      </div>
                    </div>
                    {vehicle.registeredAt && (
                      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 pt-1 border-t border-border/40">
                        <Clock className="size-3 text-primary" />
                        <span>Cadastrado em: {formatDateTimeBR(vehicle.registeredAt)}</span>
                      </div>
                    )}
                    {vehicle.member.partnerName && (
                      <div className="p-1.5 px-2 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground text-[10px]">Consultor:</span>
                        <span className="font-bold text-primary text-[11px] truncate">{vehicle.member.partnerName}</span>
                      </div>
                    )}
                    {vehicle.member.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full rounded-xl border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1.5 text-xs font-semibold h-7.5 justify-center"
                      >
                        <a
                          href={`https://wa.me/55${vehicle.member.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>WhatsApp: {formatPhone(vehicle.member.phone)}</span>
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Card de Composição de Preço */}
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Precificação pela Tabela de Veículos
                    </span>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Mensalidade Base Veículo:</span>
                      <span className="font-mono font-bold">{BRL(baseSuggestedFee)}</span>
                    </div>
                    {implementosTotalFee > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Implementos ({implementos.length}):</span>
                        <span className="font-mono font-bold text-primary">+ {BRL(implementosTotalFee)}</span>
                      </div>
                    )}
                    {activeCustomCoveragesFee > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Coberturas Extras Ativas:</span>
                        <span className="font-mono font-bold text-primary">+ {BRL(activeCustomCoveragesFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-emerald-500/20 font-bold text-xs">
                      <span>Mensalidade Atual do Veículo:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300">{BRL(vehicle.monthlyFee)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: Coberturas (Status Ativa/Inativa + Adicionar Outras Coberturas) */}
            <TabsContent value="coverage" className="space-y-3.5 m-0 p-0 flex-1 flex flex-col justify-start">
              {/* Barra Superior de Cobertura Geral Ativa/Inativa */}
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-xl border border-border/80">
                    <Switch
                      checked={coverageActive}
                      onCheckedChange={setCoverageActive}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <div>
                      <span
                        className={`text-xs font-extrabold block leading-none ${
                          coverageActive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        }`}
                      >
                        {coverageActive ? "COBERTURA ATIVA" : "COBERTURA INATIVA"}
                      </span>
                      <span className="text-[9px] text-muted-foreground">Status geral da cobertura do veículo</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
                    <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Plano:</Label>
                    <Input
                      value={coveragePlan}
                      onChange={(e) => setCoveragePlan(e.target.value)}
                      placeholder="Ex: Plano Ouro 100% FIPE"
                      className="h-8 rounded-xl text-xs bg-background border-border/80"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingCoverage(!addingCoverage)}
                    className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-1 font-bold text-xs h-8 px-3"
                  >
                    <Plus className="size-3.5" />
                    Adicionar Outra Cobertura
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveCoverage}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-bold text-xs h-8 px-3.5 shadow-xs"
                  >
                    <Save className="size-3.5" />
                    Salvar Coberturas
                  </Button>
                </div>
              </div>

              {/* Painel para Adicionar Outra Cobertura */}
              {addingCoverage && (
                <div className="p-3.5 rounded-2xl border border-primary/40 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <ShieldCheck className="size-4" /> Adicionar Nova Cobertura ao Veículo
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingCoverage(false)}
                      className="h-6 text-[10px] px-2"
                    >
                      Fechar
                    </Button>
                  </div>

                  {/* Atalhos do catálogo de produtos */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground block">
                      Sugestões rápidas do catálogo (clique para preencher):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogProducts.slice(0, 6).map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setNewCovName(prod.name);
                            setNewCovLimit(prod.coverageLimit || "Incluso");
                            setNewCovFeeStr(String(Math.round(prod.monthlyFee * 100)));
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-background hover:bg-primary hover:text-primary-foreground border border-border transition-colors font-medium"
                        >
                          + {prod.name} ({BRL(prod.monthlyFee)})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[11px] font-semibold">Nome da Cobertura / Benefício *</Label>
                      <Input
                        value={newCovName}
                        onChange={(e) => setNewCovName(e.target.value)}
                        placeholder="Ex: Cobertura de Implemento, Kit GNV, APP R$ 50 mil..."
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Limite / Condição</Label>
                      <Input
                        value={newCovLimit}
                        onChange={(e) => setNewCovLimit(e.target.value)}
                        placeholder="Ex: R$ 50.000,00 / 100%"
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Valor Mensal (R$)</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={formatCurrencyInput(newCovFeeStr)}
                          onChange={(e) => setNewCovFeeStr(e.target.value)}
                          className="h-8 rounded-xl text-xs font-mono font-bold bg-background"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddCustomCoverage}
                          className="h-8 rounded-xl text-xs font-bold px-3 shrink-0"
                        >
                          Incluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grade de Coberturas Padrão com Indicador Ativa / Inativa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {/* Tabela FIPE % */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Tabela FIPE</span>
                      <Badge
                        className={
                          coverage.fipePercent > 0 && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.fipePercent > 0 && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Indenização integral</span>
                  </div>
                  <Select
                    value={coverage.fipePercent.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, fipePercent: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-24 h-7 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="100">100% FIPE</SelectItem>
                      <SelectItem value="90">90% FIPE</SelectItem>
                      <SelectItem value="80">80% FIPE</SelectItem>
                      <SelectItem value="0">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Roubo e Furto */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Roubo e Furto</span>
                      <Badge
                        className={
                          coverage.theft && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.theft && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Proteção qualificada</span>
                  </div>
                  <Switch
                    checked={coverage.theft}
                    onCheckedChange={(c) => setCoverage({ ...coverage, theft: c })}
                  />
                </div>

                {/* Colisão e Perda Total */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Colisão & Perda Total</span>
                      <Badge
                        className={
                          coverage.collision && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.collision && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Reparo ou indenização</span>
                  </div>
                  <Switch
                    checked={coverage.collision}
                    onCheckedChange={(c) => setCoverage({ ...coverage, collision: c })}
                  />
                </div>

                {/* Danos Materiais a Terceiros */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Danos a Terceiros</span>
                      <Badge
                        className={
                          coverage.thirdPartyProperty > 0 && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.thirdPartyProperty > 0 && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Limite RCF material</span>
                  </div>
                  <Select
                    value={coverage.thirdPartyProperty.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, thirdPartyProperty: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-24 h-7 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">Inativa</SelectItem>
                      <SelectItem value="50000">R$ 50 mil</SelectItem>
                      <SelectItem value="100000">R$ 100 mil</SelectItem>
                      <SelectItem value="200000">R$ 200 mil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Guincho / Reboque */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Guincho 24h</span>
                      <Badge
                        className={
                          coverage.towKm > 0 && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.towKm > 0 && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Raio quilometragem</span>
                  </div>
                  <Select
                    value={coverage.towKm.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, towKm: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-24 h-7 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">Inativa</SelectItem>
                      <SelectItem value="200">200 km</SelectItem>
                      <SelectItem value="500">500 km</SelectItem>
                      <SelectItem value="1000">1.000 km</SelectItem>
                      <SelectItem value="9999">Ilimitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Carro Reserva */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Carro Reserva</span>
                      <Badge
                        className={
                          coverage.reserveCarDays > 0 && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.reserveCarDays > 0 && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Diárias sinistro</span>
                  </div>
                  <Select
                    value={coverage.reserveCarDays.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, reserveCarDays: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-24 h-7 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">Inativa</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vidros, Faróis e Lanternas */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Vidros & Lanternas</span>
                      <Badge
                        className={
                          coverage.glassProtection && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.glassProtection && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Franquia reduzida</span>
                  </div>
                  <Switch
                    checked={coverage.glassProtection}
                    onCheckedChange={(c) => setCoverage({ ...coverage, glassProtection: c })}
                  />
                </div>

                {/* Assistência 24h */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Assistência 24h</span>
                      <Badge
                        className={
                          coverage.assistance24h && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.assistance24h && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Chaveiro, pneu, socorro</span>
                  </div>
                  <Switch
                    checked={coverage.assistance24h}
                    onCheckedChange={(c) => setCoverage({ ...coverage, assistance24h: c })}
                  />
                </div>

                {/* Rastreador / Telemetria */}
                <div className="p-2.5 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs truncate">Rastreador GPS</span>
                      <Badge
                        className={
                          coverage.tracker && coverageActive
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0"
                            : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                        }
                      >
                        {coverage.tracker && coverageActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate block">Monitoramento 24h</span>
                  </div>
                  <Switch
                    checked={coverage.tracker}
                    onCheckedChange={(c) => setCoverage({ ...coverage, tracker: c })}
                  />
                </div>
              </div>

              {/* Lista de Coberturas Adicionais / Outras Coberturas do Veículo */}
              {customCoverages.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                    Outras Coberturas Adicionadas ({customCoverages.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customCoverages.map((cc) => (
                      <div
                        key={cc.id}
                        className="p-2.5 rounded-xl bg-primary/5 border border-primary/25 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground truncate">{cc.name}</span>
                            <Badge
                              className={
                                cc.isActive && coverageActive
                                  ? "bg-emerald-500 text-white text-[9px] px-1.5 py-0"
                                  : "bg-muted text-muted-foreground text-[9px] px-1.5 py-0"
                              }
                            >
                              {cc.isActive && coverageActive ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {cc.limit || "Padrão"} • + {BRL(cc.monthlyFee)}/mês
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch
                            checked={cc.isActive}
                            onCheckedChange={(checked) => {
                              setCustomCoverages((prev) =>
                                prev.map((item) => (item.id === cc.id ? { ...item, isActive: checked } : item))
                              );
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setCustomCoverages((prev) => prev.filter((item) => item.id !== cc.id))
                            }
                            className="size-7 rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA 3: Mensalidades */}
            <TabsContent value="financial" className="space-y-3 m-0 p-0 flex-1 flex flex-col justify-start">
              {/* Bloco de Edição do Valor da Proteção */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted/20 border border-primary/25 space-y-2.5 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Valor Mensal Total (R$) *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-primary">
                        R$
                      </span>
                      <Input
                        type="text"
                        value={monthlyFeeInput}
                        onChange={(e) => setMonthlyFeeInput(e.target.value)}
                        placeholder="179,90"
                        className="pl-8 h-8 rounded-xl text-xs font-bold bg-background text-foreground border-border/80 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Dia de Vencimento
                    </Label>
                    <Select value={dueDay} onValueChange={setDueDay}>
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="5">Todo dia 05</SelectItem>
                        <SelectItem value="10">Todo dia 10</SelectItem>
                        <SelectItem value="15">Todo dia 15</SelectItem>
                        <SelectItem value="20">Todo dia 20</SelectItem>
                        <SelectItem value="25">Todo dia 25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Status da Proteção
                    </Label>
                    <Select
                      value={protectionStatus}
                      onValueChange={(val: any) => setProtectionStatus(val)}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ACTIVE">Proteção Ativa</SelectItem>
                        <SelectItem value="PENDING_PAYMENT">Fatura Pendente</SelectItem>
                        <SelectItem value="PENDING_INSPECTION">Em Vistoria</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveMonthly}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-bold text-xs h-8 px-3.5 shadow-xs w-full"
                  >
                    <Save className="size-3.5" />
                    Salvar Valor
                  </Button>
                </div>

                {(implementosTotalFee > 0 || activeCustomCoveragesFee > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary/20 text-[11px]">
                    <span className="text-muted-foreground">
                      Sugestão da Tabela: Base ({BRL(baseSuggestedFee)}) + Implementos ({BRL(implementosTotalFee)}) + Coberturas Extras ({BRL(activeCustomCoveragesFee)}) ={" "}
                      <strong className="text-foreground font-mono">
                        {BRL(baseSuggestedFee + implementosTotalFee + activeCustomCoveragesFee)}
                      </strong>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const sum = baseSuggestedFee + implementosTotalFee + activeCustomCoveragesFee;
                        setMonthlyFeeInput(sum.toFixed(2).replace(".", ","));
                      }}
                      className="h-6 text-[10px] rounded-lg px-2 border-primary/40 text-primary"
                    >
                      Aplicar Valor Calculado
                    </Button>
                  </div>
                )}
              </div>

              {/* Histórico Recente de Mensalidades */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <History className="size-3.5 text-muted-foreground" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Lançamentos Recentes
                    </h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (vehicle.member.phone) {
                        const msg = encodeURIComponent(
                          `Olá ${vehicle.member.name}, segue o lembrete de pagamento da proteção veicular Planmais (Veículo placa ${formatPlate(vehicle.plate)}). Valor: ${BRL(vehicle.monthlyFee)}. Vencimento dia ${vehicle.dueDay}.\n\nAtenção: Por regras de proteção veicular, o pagamento deve ser feito impreterivelmente até o vencimento para garantir a cobertura e socorro do seu veículo.`
                        );
                        window.open(`https://wa.me/55${vehicle.member.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                      } else {
                        toast.info("Associado não possui telefone cadastrado.");
                      }
                    }}
                    className="rounded-lg h-6.5 text-[11px] font-semibold gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 px-2"
                  >
                    <Send className="size-3" />
                    Enviar Cobrança WhatsApp
                  </Button>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 divide-y divide-border/50 overflow-hidden shadow-xs">
                  {[
                    { month: "Outubro / 2026", due: `${vehicle.dueDay.toString().padStart(2, "0")}/10/2026`, status: "RECEIVED", value: vehicle.monthlyFee },
                    { month: "Setembro / 2026", due: `${vehicle.dueDay.toString().padStart(2, "0")}/09/2026`, status: "RECEIVED", value: vehicle.monthlyFee },
                    { month: "Agosto / 2026", due: `${vehicle.dueDay.toString().padStart(2, "0")}/08/2026`, status: "RECEIVED", value: vehicle.monthlyFee },
                  ].map((inv, i) => (
                    <div
                      key={i}
                      className="p-2 sm:px-3 flex items-center justify-between hover:bg-background/60 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-6 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-xs leading-none truncate">{inv.month}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">Vencimento em {inv.due}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-foreground text-xs font-mono">{BRL(inv.value)}</span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0 rounded-md">
                          Pago
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Rodapé */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
            <AsaasFormSeal />
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCertificate}
              className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-1.5 font-bold text-xs h-8"
            >
              <Award className="size-3.5" />
              <span>Certificado Digital</span>
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-8 font-semibold px-5 w-full sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal do Certificado Oficial de Proteção Veicular Digital
function CertificateDialog({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleItem;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg sm:h-[490px] max-h-[92vh] flex flex-col justify-between rounded-2xl sm:rounded-3xl p-4 bg-card border-border shadow-2xl overflow-hidden">
        <div className="border-2 border-primary/30 rounded-2xl p-4 bg-gradient-to-b from-primary/5 via-card to-card relative overflow-hidden flex-1 flex flex-col justify-between">
          <ShieldCheck className="absolute -right-8 -bottom-8 size-44 text-primary/5 pointer-events-none" />

          {/* Cabeçalho */}
          <div className="text-center pb-2.5 border-b border-border/60">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-1 shadow-xs">
              <ShieldCheck className="size-4.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              Certificado de Proteção Patrimonial Mutualista (PPM)
            </h2>
            <p className="text-[9px] text-muted-foreground">
              Planmais Associação de Benefícios Mútuos & Proteção Patrimonial
            </p>
          </div>

          {/* Dados */}
          <div className="py-2.5 space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-muted/40 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-[9px] text-muted-foreground block">Associado Titular</span>
                <span className="font-bold text-foreground text-xs truncate block">{vehicle.member.name}</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">{vehicle.member.document}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-[9px] text-muted-foreground block">Veículo Protegido</span>
                <span className="font-bold text-foreground text-xs truncate block">{vehicle.brand} {vehicle.model}</span>
                <span className="text-[9px] font-mono text-muted-foreground block">Chassi: {vehicle.chassi}</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-[9px] text-muted-foreground block">Placa / Renavam</span>
                <span className="font-mono font-bold text-xs text-foreground">{formatPlate(vehicle.plate)}</span>
                <span className="text-[9px] font-mono text-muted-foreground block">Renavam: {vehicle.renavam}</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
              <span className="text-[9px] text-muted-foreground block">Plano Contratado</span>
              <span className="font-bold text-foreground text-xs">{vehicle.coveragePlan}</span>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Cobertura {vehicle.coverageConfig.fipePercent}% FIPE ({BRL(vehicle.fipeValue || 0)}) com Assistência 24h em todo o Brasil.
              </p>
            </div>
          </div>

          {/* Rodapé com QR Code */}
          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">Certificado nº PLAN-{formatPlate(vehicle.plate)}-2026</p>
              <p className="truncate text-[9px]">Autenticação digital verificada pela Planmais</p>
            </div>
            <div className="size-9 bg-white rounded-lg p-0.5 border border-border flex items-center justify-center shrink-0">
              <QrCode className="size-8 text-slate-900" />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2.5 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl text-xs gap-1.5 h-8 w-full sm:w-auto"
          >
            <FileText className="size-3.5" />
            Imprimir Certificado
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold h-8 w-full sm:w-auto"
          >
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal de Cadastro Completo de Novo Veículo (+ Implementos)
function NewVehicleDialog({ members, partners = [] }: { members: any[]; partners?: any[] }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);

  const [memberId, setMemberId] = useState("avulso");
  const [consultantId, setConsultantId] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [yearModel, setYearModel] = useState(new Date().getFullYear().toString());
  const [color, setColor] = useState("");
  const [chassi, setChassi] = useState("");
  const [renavam, setRenavam] = useState("");
  const [fuel, setFuel] = useState("Flex");
  const [mileage, setMileage] = useState("");
  const [usage, setUsage] = useState("Particular");
  const [transmission, setTransmission] = useState("Manual");
  const [engine, setEngine] = useState("");
  const [trackerStatus, setTrackerStatus] = useState("Instalado e Ativo");
  const [trackerCode, setTrackerCode] = useState("");
  const [fipeValueStr, setFipeValueStr] = useState("6000000"); // R$ 60.000,00
  const [category, setCategory] = useState("Leves e utilitários");
  const [implementos, setImplementos] = useState<ImplementoItem[]>([]);
  const [monthlyFeeOverride, setMonthlyFeeOverride] = useState<string>("");

  const fipeValue = Number(fipeValueStr.replace(/\D/g, "")) / 100 || 60000;
  const baseTableFee = useMemo(
    () => calculateBaseMonthlyFee(categoryToVehicleType(category), fipeValue),
    [category, fipeValue]
  );
  const implementosFee = useMemo(
    () => implementos.reduce((acc, i) => acc + (i.monthlyFee || 0), 0),
    [implementos]
  );
  const calculatedTotalFee = baseTableFee + implementosFee;

  const finalMonthlyFee = useMemo(() => {
    if (monthlyFeeOverride.trim()) {
      const raw = monthlyFeeOverride.replace(/\D/g, "");
      if (raw) return Number(raw) / 100;
    }
    return calculatedTotalFee;
  }, [monthlyFeeOverride, calculatedTotalFee]);

  const createVeh = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada.");
      if (!plate || plate.trim().length < 7) throw new Error("Informe uma placa válida (7 caracteres).");
      if (!brand || !model) throw new Error("Informe a marca e modelo do veículo.");

      const nowIso = new Date().toISOString();

      await addVehicle({
        data: {
          companyId,
          memberId: memberId === "avulso" ? null : memberId,
          plate: plate.toUpperCase().trim(),
          brand,
          model,
          year: Number(year) || new Date().getFullYear(),
          color,
          category,
          monthly_fee: finalMonthlyFee,
          fipe_value: fipeValue,
          partner_id: consultantId === "none" ? null : consultantId || null,
        },
      });

      saveVehicleExtraData(companyId, undefined, plate, {
        chassi: chassi.trim().toUpperCase(),
        renavam: renavam.trim(),
        yearFab: Number(year) || new Date().getFullYear(),
        yearModel: Number(yearModel) || Number(year) || new Date().getFullYear(),
        color,
        fuel,
        mileage,
        usage,
        transmission,
        engine,
        fipeValue,
        trackerStatus,
        trackerCode,
        implementos,
        coverageActive: true,
        registeredAt: nowIso,
      });
    },
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso na frota!", {
        description: `Mensalidade total: ${BRL(finalMonthlyFee)}/mês.`,
      });
      qc.invalidateQueries({ queryKey: ["vehicles", companyId] });
      qc.invalidateQueries({ queryKey: ["members", companyId] });
      setOpen(false);
      setPlate("");
      setBrand("");
      setModel("");
      setColor("");
      setChassi("");
      setRenavam("");
      setMileage("");
      setEngine("");
      setTrackerCode("");
      setImplementos([]);
      setMonthlyFeeOverride("");
      setCategory("Leves e utilitários");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar veículo.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-primary text-primary-foreground gap-1.5 font-bold shadow-xs text-xs h-9">
          <Plus className="size-3.5" />
          <span>Cadastrar Veículo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] sm:w-[920px] sm:max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-card border-border p-0 gap-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Car className="size-4.5 text-primary" /> Cadastro Completo de Veículo & Implementos
          </DialogTitle>
          <DialogDescription className="text-xs">
            Informe Chassi, Renavam, dados técnicos, avaliação FIPE e adicione implementos com precificação automática.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createVeh.mutate();
          }}
          className="flex-1 flex flex-col justify-between overflow-hidden min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Coluna 1: Identificação Técnica do Veículo */}
              <div className="space-y-3 p-3.5 rounded-2xl border border-border/70 bg-muted/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 pb-1 border-b border-border/50">
                  <Car className="size-3.5" /> 1. Dados do Veículo (Chassi & Renavam)
                </h3>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Associado Proprietário</Label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger className="rounded-xl h-8.5 text-xs bg-background font-medium">
                      <SelectValue placeholder="Selecione o associado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-56">
                      <SelectItem value="avulso" className="text-amber-600 font-semibold">
                        ⚡ Cadastrar de forma avulsa (Vincular depois)
                      </SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({formatCpfCnpj(m.document)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Placa (Mercosul) *</Label>
                    <Input
                      placeholder="Ex: BRA2E19"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      maxLength={8}
                      className="rounded-xl uppercase font-mono font-bold text-xs h-8.5 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Ano Fab.</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="2023"
                      value={year}
                      onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="rounded-xl font-medium text-xs h-8.5 bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Ano Modelo</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="2024"
                      value={yearModel}
                      onChange={(e) => setYearModel(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="rounded-xl font-medium text-xs h-8.5 bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Marca *</Label>
                    <Input
                      placeholder="Ex: Toyota, Honda, Volvo"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cor</Label>
                    <Input
                      placeholder="Ex: Branco, Prata"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Modelo e Versão do Veículo *</Label>
                  <Input
                    placeholder="Ex: Corolla Altis 2.0 Dynamic Force Flex"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="rounded-xl text-xs h-8.5 bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-primary">Número do Chassi *</Label>
                    <Input
                      placeholder="Ex: 9BRBL3HE8P0192841"
                      value={chassi}
                      onChange={(e) => setChassi(e.target.value.toUpperCase())}
                      maxLength={20}
                      className="rounded-xl font-mono uppercase text-xs h-8.5 bg-background border-primary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-primary">Número do Renavam *</Label>
                    <Input
                      placeholder="Ex: 01398274619"
                      value={renavam}
                      onChange={(e) => setRenavam(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      maxLength={11}
                      className="rounded-xl font-mono text-xs h-8.5 bg-background border-primary/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Combustível</Label>
                    <Select value={fuel} onValueChange={setFuel}>
                      <SelectTrigger className="rounded-xl h-8.5 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Flex">Flex</SelectItem>
                        <SelectItem value="Gasolina">Gasolina</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Etanol">Etanol</SelectItem>
                        <SelectItem value="GNV">GNV</SelectItem>
                        <SelectItem value="Híbrido/Elétrico">Híbrido/Elétrico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Hodômetro (KM)</Label>
                    <Input
                      placeholder="Ex: 35.000 km"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      className="rounded-xl font-mono text-xs h-8.5 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Finalidade</Label>
                    <Select value={usage} onValueChange={setUsage}>
                      <SelectTrigger className="rounded-xl h-8.5 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Particular">Particular</SelectItem>
                        <SelectItem value="Comercial">Comercial</SelectItem>
                        <SelectItem value="Motorista App">App (Uber/99)</SelectItem>
                        <SelectItem value="Frota / Carga">Carga / Frota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Câmbio</Label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger className="rounded-xl h-8.5 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Automático">Automático</SelectItem>
                        <SelectItem value="Automático CVT">Automático CVT</SelectItem>
                        <SelectItem value="Automatizado">Automatizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Motorização / Potência</Label>
                    <Input
                      placeholder="Ex: 2.0 16V / 1.0 Turbo"
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Coluna 2: Avaliação FIPE, Categoria, Implementos e Mensalidade */}
              <div className="space-y-3 p-3.5 rounded-2xl border border-border/70 bg-muted/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 pb-1 border-b border-border/50">
                  <DollarSign className="size-3.5" /> 2. Avaliação, Implementos & Mensalidade
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Vincular a Consultor</Label>
                    <Select value={consultantId} onValueChange={setConsultantId}>
                      <SelectTrigger className="rounded-xl h-8.5 text-xs bg-background">
                        <SelectValue placeholder="Nenhum (Venda Direta)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">Nenhum (Venda Direta)</SelectItem>
                        {partners.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.split_percent ? `(${p.split_percent}%)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Valor FIPE / Comercial *</Label>
                    <Input
                      placeholder="R$ 60.000,00"
                      value={formatCurrencyInput(fipeValueStr)}
                      onChange={(e) => setFipeValueStr(e.target.value)}
                      className="rounded-xl font-bold text-xs h-8.5 bg-background font-mono text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <VehicleCategorySelector value={category} onChange={setCategory} compact />
                </div>

                {/* Seção Adicionar Implemento */}
                <ImplementosManager
                  implementos={implementos}
                  onChange={setImplementos}
                  category={category}
                />

                {/* Resumo da Mensalidade Calculada + Ajuste */}
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground block">
                        Mensalidade Pela Tabela de Preços:
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Veículo ({BRL(baseTableFee)})
                        {implementosFee > 0 ? ` + Implementos (${BRL(implementosFee)})` : ""}
                      </span>
                    </div>
                    <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                      {BRL(calculatedTotalFee)}/mês
                    </span>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-emerald-500/20">
                    <Label className="text-[11px] font-semibold">
                      Mensalidade Final a Cobrar (Opcional se desejar personalizar)
                    </Label>
                    <Input
                      placeholder={BRL(calculatedTotalFee)}
                      value={monthlyFeeOverride ? formatCurrencyInput(monthlyFeeOverride) : ""}
                      onChange={(e) => setMonthlyFeeOverride(e.target.value)}
                      className="rounded-xl font-bold text-xs h-8 bg-background font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
            <AsaasFormSeal />
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="rounded-xl text-xs h-8 font-medium"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createVeh.isPending}
                className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs h-8 px-4"
              >
                {createVeh.isPending ? "Cadastrando..." : "Salvar Veículo"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

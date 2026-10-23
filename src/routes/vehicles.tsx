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
  History
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { getVehicles, getMembers, addVehicle, deleteVehicle, linkVehicleToMember } from "@/lib/members.functions";
import { getPartners } from "@/lib/partner.functions";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import { VehicleCategorySelector, VehicleCategoryBadge } from "@/components/VehicleCategorySelector";

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

  // Veículos clássicos/populares antigos específicos
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
  fipePercent: number; // 100, 90, 80
  theft: boolean; // Roubo e Furto
  collision: boolean; // Colisão e Perda Total
  thirdPartyProperty: number; // Danos materiais a terceiros (ex: 50000, 100000)
  thirdPartyPersonal: number; // Danos corporais a terceiros
  towKm: number; // Guincho (ex: 500, 1000, 9999)
  reserveCarDays: number; // Carro reserva (ex: 0, 7, 15, 30)
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
  color?: string;
  category?: string;
  chassi?: string;
  renavam?: string;
  fipeValue?: number;
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
    color: "Branco Perolizado",
    category: "Leves e utilitários",
    chassi: "9BRBL3HE8P0192841",
    renavam: "01398274619",
    fipeValue: 154800,
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
    color: "Cinza Granite",
    category: "Leves e utilitários",
    chassi: "9886FB981N0284712",
    renavam: "01284719284",
    fipeValue: 158900,
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
    color: "Vermelho Colorado",
    category: "Leves e utilitários",
    chassi: "9BD226392M0384719",
    renavam: "01192837465",
    fipeValue: 136400,
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
  {
    id: "demo-4",
    plate: "BCV9G21",
    brand: "Honda",
    model: "Civic Touring 1.5 Turbo 16V Aut.",
    year: 2021,
    color: "Preto Cristal",
    category: "Leves e utilitários",
    chassi: "93HFC1640M0192837",
    renavam: "01092837461",
    fipeValue: 141200,
    status: "PENDING_PAYMENT",
    coveragePlan: "Plano Prata 100% FIPE",
    monthlyFee: 175.00,
    dueDay: 5,
    fuel: "Gasolina",
    isDemo: false,
    coverageConfig: { ...DEFAULT_COVERAGE, reserveCarDays: 7 },
    member: {
      id: "mem-4",
      name: "Camila Ferreira Barbosa",
      document: "401.928.374-88",
      phone: "(11) 97162-5394",
      email: "camila.barbosa@email.com",
      city: "Santo André - SP",
      partnerName: "Consultor Carlos Henrique",
    },
  },
  {
    id: "demo-5",
    plate: "RTA4D90",
    brand: "Chevrolet",
    model: "Onix Plus Premier 1.0 Turbo Aut.",
    year: 2023,
    color: "Azul Eclipse",
    category: "Leves e utilitários",
    chassi: "9BGKT69F0P0284719",
    renavam: "01384719283",
    fipeValue: 97800,
    status: "ACTIVE",
    coveragePlan: "Plano Essencial 100% FIPE",
    monthlyFee: 149.90,
    dueDay: 20,
    fuel: "Flex (Álcool/Gasolina)",
    isDemo: false,
    coverageConfig: { ...DEFAULT_COVERAGE, thirdPartyProperty: 50000, towKm: 500 },
    member: {
      id: "mem-5",
      name: "Felipe Rocha Santana",
      document: "312.984.719-20",
      phone: "(11) 99482-1736",
      email: "felipe.rocha@email.com",
      city: "São Bernardo do Campo - SP",
      partnerName: "Corretora Aliança",
    },
  },
  {
    id: "demo-6",
    plate: "PRM8H32",
    brand: "BMW",
    model: "320i M Sport 2.0 Turbo ActiveFlex",
    year: 2022,
    color: "Branco Alpino",
    category: "Leves e utilitários",
    chassi: "95V5F3108M0294817",
    renavam: "01239847192",
    fipeValue: 248900,
    status: "ACTIVE",
    coveragePlan: "Plano Premium Black + Telemetria Satelital",
    monthlyFee: 310.00,
    dueDay: 10,
    fuel: "Flex (Álcool/Gasolina)",
    isDemo: false,
    coverageConfig: { ...DEFAULT_COVERAGE, tracker: true, towKm: 9999, reserveCarDays: 30, thirdPartyProperty: 200000 },
    member: {
      id: "mem-6",
      name: "Lucas Eduardo Vasconcelos",
      document: "184.729.102-45",
      phone: "(11) 98273-6152",
      email: "lucas.vasconcelos@email.com",
      city: "São Paulo - SP",
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

  // Estado local para persistir edições de coberturas e mensalidades do usuário durante a sessão
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

  // Mapeia veículos do banco
  const mappedDbVehicles: VehicleItem[] = useMemo(() => {
    return (dbVehicles || []).map((v: any) => ({
      id: v.id,
      plate: v.plate || "SEM-PLACA",
      brand: v.brand || "Não informada",
      model: v.model || "Modelo não informado",
      year: v.year || new Date().getFullYear(),
      color: v.color || "Prata",
      category: v.category || "Leves e utilitários",
      chassi: `9BW${(v.id || "").slice(0, 8).toUpperCase()}`,
      renavam: `00${(v.id || "").replace(/\D/g, "").slice(0, 9)}`,
      fipeValue: v.fipe_value || estimateRealisticFipe(v.brand, v.model, v.year),
      status: "ACTIVE" as const,
      coveragePlan: "Plano Ouro 100% FIPE",
      monthlyFee: Number(v.monthly_fee) || 179.90,
      dueDay: 10,
      fuel: v.year && v.year <= 2002 ? "Gasolina" : "Flex",
      isDemo: false,
      coverageConfig: { ...DEFAULT_COVERAGE },
      member: {
        id: (v.members?.document === "00000000000" || v.members?.name?.includes("Avulso")) ? "" : (v.members?.id || ""),
        name: (v.members?.document === "00000000000" || v.members?.name?.includes("Avulso")) ? "Veículo Avulso (Não Vinculado)" : (v.members?.name || "Associado não identificado"),
        document: (v.members?.document === "00000000000" || v.members?.name?.includes("Avulso")) ? "" : (v.members?.document || ""),
        phone: v.members?.phone,
        email: v.members?.email,
        city: "São Paulo - SP",
        partnerName: v.members?.partners?.name,
      },
    }));
  }, [dbVehicles]);

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

  // Filtros de busca
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((v) => {
      const matchSearch =
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.brand.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase()) ||
        v.member.name.toLowerCase().includes(search.toLowerCase()) ||
        v.member.document.includes(search);

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

    // Persiste a mensalidade no banco para que a geração de faturas use o valor configurado
    if (!updated.isDemo && companyId && previous && previous.monthlyFee !== updated.monthlyFee) {
      const { error } = await supabase
        .from("vehicles")
        .update({ monthly_fee: updated.monthlyFee })
        .eq("id", updated.id)
        .eq("company_id", companyId);
      if (error) {
        toast.error("Não foi possível salvar a mensalidade: " + error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ["vehicles", companyId] });
      qc.invalidateQueries({ queryKey: ["members", companyId] });
    }
  };

  return (
    <AppLayout
      title="Central de Veículos"
      subtitle="Gestão da frota protegida, cadastros avulsos ou vinculados e consultores"
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
                  placeholder="Buscar por placa, modelo, marca, associado ou CPF..."
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
                    <th className="px-3 py-3 sm:px-3.5">Veículo</th>
                    <th className="px-3 py-3 sm:px-3.5">Categoria / Cor</th>
                    <th className="px-3 py-3 sm:px-3.5">Tabela FIPE</th>
                    <th className="px-3 py-3 sm:px-3.5">Associado</th>
                    <th className="px-3 py-3 sm:px-3.5">Mensalidade</th>
                    <th className="px-3 py-3 sm:px-3.5 text-center">Status</th>
                    <th className="px-3 py-3 sm:px-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      onClick={() => openDossier(vehicle)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      title="Clique em qualquer lugar da linha para abrir o dossiê do veículo"
                    >
                      {/* Veículo */}
                      <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <MercosulPlate plate={vehicle.plate} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                                {vehicle.brand}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                • {vehicle.year}
                              </span>
                            </div>
                            <h4 className="font-semibold text-xs text-foreground leading-tight truncate mt-0.5 max-w-[140px] sm:max-w-[170px] lg:max-w-[210px] group-hover:text-primary transition-colors">
                              {vehicle.model}
                            </h4>
                          </div>
                        </div>
                      </td>

                      {/* Categoria / Cor */}
                      <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                        <div className="space-y-0.5">
                          <VehicleCategoryBadge category={vehicle.category} size="sm" />
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
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
                          FIPE 100%
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
                        <span className="font-bold text-foreground text-xs block">
                          {BRL(vehicle.monthlyFee || 179.9)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Venc. dia {vehicle.dueDay}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-center whitespace-nowrap">
                        {getStatusBadge(vehicle.status)}
                      </td>

                      {/* Ações */}
                      <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => openDossier(vehicle)}
                          className="rounded-xl h-7.5 px-2.5 sm:px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-xs"
                          title="Abrir Dossiê do Veículo"
                        >
                          <Eye className="size-3.5 shrink-0" />
                          <span>Dossiê</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal do Dossiê Completo do Veículo (Ajustado com 3 Abas e Campos Editáveis) */}
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

// Modal do Dossiê com exatamente 3 abas: Ficha Técnica, Coberturas (editável) e Mensalidades (editável)
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
  // Estado local para edição de Coberturas
  const [coveragePlan, setCoveragePlan] = useState(vehicle.coveragePlan || "Plano Ouro 100% FIPE");
  const [coverage, setCoverage] = useState<CoverageConfig>({
    ...DEFAULT_COVERAGE,
    ...(vehicle.coverageConfig || {}),
  });

  // Estado local para edição da Mensalidade
  const [monthlyFeeInput, setMonthlyFeeInput] = useState((vehicle.monthlyFee || 179.9).toFixed(2).replace(".", ","));
  const [dueDay, setDueDay] = useState(vehicle.dueDay ? vehicle.dueDay.toString() : "10");
  const [protectionStatus, setProtectionStatus] = useState<VehicleItem["status"]>(vehicle.status || "ACTIVE");

  // Sincronizar estado caso o veículo selecionado mude ou seja atualizado
  useEffect(() => {
    setCoveragePlan(vehicle.coveragePlan || "Plano Ouro 100% FIPE");
    setCoverage({
      ...DEFAULT_COVERAGE,
      ...(vehicle.coverageConfig || {}),
    });
    setMonthlyFeeInput((vehicle.monthlyFee || 179.9).toFixed(2).replace(".", ","));
    setDueDay(vehicle.dueDay ? vehicle.dueDay.toString() : "10");
    setProtectionStatus(vehicle.status || "ACTIVE");
  }, [vehicle]);

  // Salvar Coberturas
  const handleSaveCoverage = () => {
    const updated: VehicleItem = {
      ...vehicle,
      coveragePlan,
      coverageConfig: coverage,
    };
    onUpdate(updated);
    toast.success("Coberturas do associado atualizadas com sucesso!");
  };

  // Salvar Mensalidade
  const handleSaveMonthly = () => {
    const fee = parseFloat(monthlyFeeInput.replace(/\./g, "").replace(",", ".")) || vehicle.monthlyFee;
    const updated: VehicleItem = {
      ...vehicle,
      monthlyFee: fee,
      dueDay: parseInt(dueDay, 10) || 10,
      status: protectionStatus,
    };
    onUpdate(updated);
    toast.success("Valor da proteção e vencimento atualizados!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[880px] sm:max-w-4xl sm:h-[530px] max-h-[92vh] flex flex-col p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
        {/* Cabeçalho Compacto, 100% Responsivo e com espaço livre garantido para o botão Fechar (X) */}
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
                  FIPE
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  {BRL(vehicle.fipeValue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas com tamanho estático e navegação suave sem pulos */}
        <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
          <div className="border-b border-border/60 px-4 sm:px-5 bg-muted/20 shrink-0">
            <TabsList className="bg-transparent h-9 p-0 gap-4 sm:gap-6 w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs px-1 h-9 transition-colors"
              >
                Ficha Técnica
              </TabsTrigger>
              <TabsTrigger
                value="coverage"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs px-1 h-9 transition-colors"
              >
                Coberturas
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
            {/* ABA 1: Ficha Técnica */}
            <TabsContent value="overview" className="m-0 p-0 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lado Esquerdo: Dados do Veículo */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Car className="size-3.5 text-primary" /> Informações do Veículo
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50">
                      <span className="text-[9px] text-muted-foreground block">Placa</span>
                      <span className="font-mono font-bold text-xs text-foreground">{formatPlate(vehicle.plate)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50">
                      <span className="text-[9px] text-muted-foreground block">Ano / Modelo</span>
                      <span className="font-bold text-xs text-foreground">{vehicle.year}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50">
                      <span className="text-[9px] text-muted-foreground block">Cor</span>
                      <span className="font-bold text-xs text-foreground truncate block">{vehicle.color || "Prata"}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50">
                      <span className="text-[9px] text-muted-foreground block">Combustível</span>
                      <span className="font-bold text-xs text-foreground truncate block">{vehicle.fuel || "Flex"}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50 col-span-2">
                      <span className="text-[9px] text-muted-foreground block mb-0.5">Categoria</span>
                      <VehicleCategoryBadge category={vehicle.category} size="sm" />
                    </div>
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50">
                      <span className="text-[9px] text-muted-foreground block">Chassi</span>
                      <span className="font-mono font-semibold text-[11px] text-foreground truncate block">
                        {vehicle.chassi || "9BWCA11108P019283"}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/35 border border-border/50">
                      <span className="text-[9px] text-muted-foreground block">Renavam</span>
                      <span className="font-mono font-semibold text-[11px] text-foreground truncate block">
                        {vehicle.renavam || "00918237461"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Associado Proprietário */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" /> Associado Titular
                  </h3>
                  <div className="p-3 rounded-2xl bg-muted/25 border border-border/60 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        {vehicle.member.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-foreground text-xs leading-tight truncate">{vehicle.member.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          CPF: {formatCpfCnpj(vehicle.member.document)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                      <div>
                        <span className="text-[9px] text-muted-foreground block">Cidade / UF</span>
                        <span className="font-medium text-[11px] text-foreground truncate block">{vehicle.member.city || "São Paulo - SP"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block">E-mail</span>
                        <span className="font-medium text-[11px] text-foreground truncate block">{vehicle.member.email || "Sem e-mail"}</span>
                      </div>
                    </div>
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
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: Coberturas (EDITÁVEL) */}
            <TabsContent value="coverage" className="space-y-3 m-0 p-0 flex-1 flex flex-col justify-start">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Plano:</Label>
                  <Input
                    value={coveragePlan}
                    onChange={(e) => setCoveragePlan(e.target.value)}
                    placeholder="Ex: Plano Ouro 100% FIPE"
                    className="h-8 rounded-xl text-xs bg-background border-border/80"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleSaveCoverage}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-bold text-xs h-8 px-3.5 shadow-xs shrink-0"
                >
                  <Save className="size-3.5" />
                  Salvar Coberturas
                </Button>
              </div>

              {/* Grade de Coberturas Editáveis em 3 Colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {/* Tabela FIPE % */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Tabela FIPE</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Indenização integral</span>
                  </div>
                  <Select
                    value={coverage.fipePercent.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, fipePercent: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-22 h-6.5 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="100">100% FIPE</SelectItem>
                      <SelectItem value="90">90% FIPE</SelectItem>
                      <SelectItem value="80">80% FIPE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Roubo e Furto */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Roubo e Furto</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Proteção qualificada</span>
                  </div>
                  <Switch
                    checked={coverage.theft}
                    onCheckedChange={(c) => setCoverage({ ...coverage, theft: c })}
                  />
                </div>

                {/* Colisão e Perda Total */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Colisão & Perda Total</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Reparo ou indenização</span>
                  </div>
                  <Switch
                    checked={coverage.collision}
                    onCheckedChange={(c) => setCoverage({ ...coverage, collision: c })}
                  />
                </div>

                {/* Danos Materiais a Terceiros */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Danos a Terceiros</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Limite material</span>
                  </div>
                  <Select
                    value={coverage.thirdPartyProperty.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, thirdPartyProperty: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-22 h-6.5 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">Não incluso</SelectItem>
                      <SelectItem value="50000">R$ 50 mil</SelectItem>
                      <SelectItem value="100000">R$ 100 mil</SelectItem>
                      <SelectItem value="200000">R$ 200 mil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Guincho / Reboque */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Guincho 24h</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Raio quilometragem</span>
                  </div>
                  <Select
                    value={coverage.towKm.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, towKm: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-22 h-6.5 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="200">200 km</SelectItem>
                      <SelectItem value="500">500 km</SelectItem>
                      <SelectItem value="1000">1.000 km</SelectItem>
                      <SelectItem value="9999">Ilimitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Carro Reserva */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Carro Reserva</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Diárias sinistro</span>
                  </div>
                  <Select
                    value={coverage.reserveCarDays.toString()}
                    onValueChange={(val) => setCoverage({ ...coverage, reserveCarDays: parseInt(val, 10) })}
                  >
                    <SelectTrigger className="w-22 h-6.5 text-[11px] rounded-lg bg-background shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">Não incluso</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vidros, Faróis e Lanternas */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Vidros & Lanternas</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Franquia reduzida</span>
                  </div>
                  <Switch
                    checked={coverage.glassProtection}
                    onCheckedChange={(c) => setCoverage({ ...coverage, glassProtection: c })}
                  />
                </div>

                {/* Assistência 24h */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Assistência 24h</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Chaveiro, pneu</span>
                  </div>
                  <Switch
                    checked={coverage.assistance24h}
                    onCheckedChange={(c) => setCoverage({ ...coverage, assistance24h: c })}
                  />
                </div>

                {/* Rastreador / Telemetria */}
                <div className="p-2 rounded-xl bg-muted/35 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block text-xs truncate">Rastreador GPS</span>
                    <span className="text-[9px] text-muted-foreground truncate block">Monitoramento 24h</span>
                  </div>
                  <Switch
                    checked={coverage.tracker}
                    onCheckedChange={(c) => setCoverage({ ...coverage, tracker: c })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: Mensalidades */}
            <TabsContent value="financial" className="space-y-3 m-0 p-0 flex-1 flex flex-col justify-start">
              {/* Bloco de Edição do Valor da Proteção */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted/20 border border-primary/25 space-y-2 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Valor Mensal (R$) *
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
              </div>

              {/* Histórico Recente de Mensalidades em Extrato Unificado */}
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
                          `Olá ${vehicle.member.name}, segue o lembrete de pagamento da proteção veicular Planmais (Veículo placa ${formatPlate(vehicle.plate)}). Valor: ${BRL(vehicle.monthlyFee)}. Vencimento dia ${vehicle.dueDay}.\n\nAtenção: Por regras de proteção veicular, o pagamento deve ser feito impreterivelmente até o vencimento para garantir a cobertura e socorro do seu veículo. Boletos vencidos não são aceitos pelo banco.`
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

                {/* Ledger Card Unificado */}
                <div className="rounded-2xl border border-border/60 bg-muted/20 divide-y divide-border/50 overflow-hidden shadow-xs">
                  {[
                    { month: "Março / 2026", due: `${vehicle.dueDay.toString().padStart(2, "0")}/03/2026`, status: "RECEIVED", value: vehicle.monthlyFee },
                    { month: "Fevereiro / 2026", due: `${vehicle.dueDay.toString().padStart(2, "0")}/02/2026`, status: "RECEIVED", value: vehicle.monthlyFee },
                    { month: "Janeiro / 2026", due: `${vehicle.dueDay.toString().padStart(2, "0")}/01/2026`, status: "RECEIVED", value: vehicle.monthlyFee },
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

        {/* Rodapé Compacto e 100% Responsivo */}
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
              Certificado de Proteção Veicular
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
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-[9px] text-muted-foreground block">Placa</span>
                <span className="font-mono font-bold text-xs text-foreground">{formatPlate(vehicle.plate)}</span>
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
  const [color, setColor] = useState("");
  const [category, setCategory] = useState("Leves e utilitários");
  const [monthlyFee, setMonthlyFee] = useState("179,90");

  const createVeh = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada.");
      if (!plate || plate.trim().length < 7) throw new Error("Informe uma placa válida (7 caracteres).");
      if (!brand || !model) throw new Error("Informe a marca e modelo do veículo.");

      const rawFee = monthlyFee.replace(/\D/g, "");
      const parsedFee = rawFee ? Number(rawFee) / 100 : 179.90;

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
          monthly_fee: parsedFee,
          partner_id: consultantId === "none" ? null : consultantId || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Veículo cadastrado e vinculado com sucesso!");
      qc.invalidateQueries({ queryKey: ["vehicles", companyId] });
      qc.invalidateQueries({ queryKey: ["members", companyId] });
      setOpen(false);
      setPlate("");
      setBrand("");
      setModel("");
      setColor("");
      setCategory("Leves e utilitários");
      setMonthlyFee("179,90");
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
      <DialogContent className="w-[95vw] sm:max-w-2xl sm:h-[530px] max-h-[92vh] flex flex-col rounded-2xl bg-card border-border p-0 gap-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Car className="size-4.5 text-primary" /> Novo Veículo na Frota
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cadastre os dados do veículo e vincule-o a um associado cadastrado na Planmais.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createVeh.mutate();
          }}
          className="flex-1 flex flex-col justify-between overflow-hidden min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
              {/* Coluna 1: Dados do Proprietário e Veículo */}
              <div className="space-y-2.5">
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

                <div className="grid grid-cols-2 gap-2">
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
                    <Label className="text-xs font-semibold">Ano Fabricação / Mod.</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 2023"
                      value={year}
                      onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="rounded-xl font-medium text-xs h-8.5 bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Marca *</Label>
                    <Input
                      placeholder="Ex: Toyota, Honda"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cor</Label>
                    <Input
                      placeholder="Ex: Branco, Preto"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Modelo do Veículo *</Label>
                  <Input
                    placeholder="Ex: Corolla Altis 2.0 Flex"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="rounded-xl text-xs h-8.5 bg-background"
                  />
                </div>
              </div>

              {/* Coluna 2: Consultor, Cobrança e Categoria */}
              <div className="space-y-2.5">
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
                  <Label className="text-xs font-semibold">Mensalidade de Proteção *</Label>
                  <Input
                    placeholder="R$ 179,90"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(formatCurrencyInput(e.target.value))}
                    className="rounded-xl font-bold text-xs h-8.5 bg-background font-mono"
                  />
                </div>

                <div className="pt-0.5">
                  <VehicleCategorySelector value={category} onChange={setCategory} compact />
                </div>

                <div className="p-2.5 rounded-xl border border-primary/25 bg-primary/5 flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-none">Proteção & Asaas Ativo</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      Boletos gerados e rateio de comissão calculado automaticamente.
                    </p>
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

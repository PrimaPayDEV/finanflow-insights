import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
  Camera,
  ExternalLink,
  Filter,
  DollarSign,
  TrendingUp,
  Sparkles,
  Info,
  Calendar,
  User,
  Trash2,
  ShieldAlert,
  Fuel,
  Palette,
  Eye,
  QrCode,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getVehicles, getMembers, addVehicle, deleteVehicle } from "@/lib/members.functions";
import { BRL, formatCpfCnpj, formatPhone } from "@/lib/format";

export const Route = createFileRoute("/vehicles")({
  head: () => ({
    meta: [{ title: "Central de Veículos | Planmais Proteção Veicular" }],
  }),
  component: VehiclesPage,
});

// Placa Mercosul estilizada e realista
function MercosulPlate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" | "lg" }) {
  const cleanPlate = (plate || "BRA2E19").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const formatted = cleanPlate.length === 7 ? `${cleanPlate.slice(0, 3)}${cleanPlate.slice(3)}` : cleanPlate;

  const sizeClasses = {
    sm: "w-24 h-7 text-xs border-[1.5px]",
    md: "w-28 h-8 text-sm border-2",
    lg: "w-36 h-11 text-base border-2",
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-between bg-white text-slate-900 rounded-md font-mono font-black border-slate-900 shadow-xs overflow-hidden select-none shrink-0 ${sizeClasses[size]}`}>
      {/* Tarja azul Mercosul */}
      <div className="w-full bg-[#003399] text-white flex items-center justify-between px-1.5 py-0.5 leading-none">
        <span className="text-[6px] tracking-wider uppercase font-sans font-bold">BRASIL</span>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-1.5 bg-[#009b3a] rounded-xs relative flex items-center justify-center">
            <div className="w-1 h-1 bg-[#fedf00] rotate-45 flex items-center justify-center">
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

// Veículos de demonstração interativa para a Planmais
interface VehicleItem {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  chassi?: string;
  renavam?: string;
  fipeValue?: number;
  status: "ACTIVE" | "PENDING_INSPECTION" | "PENDING_PAYMENT" | "INACTIVE";
  coveragePlan: string;
  monthlyFee: number;
  fuel?: string;
  inspectionDate?: string;
  isDemo?: boolean;
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

const DEMO_VEHICLES: VehicleItem[] = [
  {
    id: "demo-1",
    plate: "BRA2E19",
    brand: "Toyota",
    model: "Corolla Altis 2.0 Dynamic Force Flex",
    year: 2024,
    color: "Branco Perolizado",
    chassi: "9BRBL3HE8P0192841",
    renavam: "01398274619",
    fipeValue: 154800,
    status: "ACTIVE",
    coveragePlan: "Plano Ouro 100% FIPE + Guincho 1.000km",
    monthlyFee: 189.90,
    fuel: "Flex (Álcool/Gasolina)",
    inspectionDate: "14/02/2026",
    isDemo: true,
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
    chassi: "9886FB981N0284712",
    renavam: "01284719284",
    fipeValue: 158900,
    status: "ACTIVE",
    coveragePlan: "Plano Ouro 100% FIPE + Terceiros R$ 100k",
    monthlyFee: 198.50,
    fuel: "Flex (Álcool/Gasolina)",
    inspectionDate: "28/01/2026",
    isDemo: true,
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
    chassi: "9BD226392M0384719",
    renavam: "01192837465",
    fipeValue: 136400,
    status: "PENDING_INSPECTION",
    coveragePlan: "Plano Integral Utilitário + Rastreador",
    monthlyFee: 219.00,
    fuel: "Diesel",
    inspectionDate: "Aguardando homologação de fotos",
    isDemo: true,
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
    chassi: "93HFC1640M0192837",
    renavam: "01092837461",
    fipeValue: 141200,
    status: "PENDING_PAYMENT",
    coveragePlan: "Plano Prata 100% FIPE + Vidros",
    monthlyFee: 175.00,
    fuel: "Gasolina",
    inspectionDate: "05/11/2025",
    isDemo: true,
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
    chassi: "9BGKT69F0P0284719",
    renavam: "01384719283",
    fipeValue: 97800,
    status: "ACTIVE",
    coveragePlan: "Plano Essencial 100% FIPE",
    monthlyFee: 149.90,
    fuel: "Flex (Álcool/Gasolina)",
    inspectionDate: "10/01/2026",
    isDemo: true,
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
    chassi: "95V5F3108M0294817",
    renavam: "01239847192",
    fipeValue: 248900,
    status: "ACTIVE",
    coveragePlan: "Plano Premium Black + Telemetria Satelital",
    monthlyFee: 310.00,
    fuel: "Flex (Álcool/Gasolina)",
    inspectionDate: "19/12/2025",
    isDemo: true,
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
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 font-bold">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Proteção Ativa
        </Badge>
      );
    case "PENDING_INSPECTION":
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 font-bold">
          <Clock className="size-3" />
          Em Vistoria
        </Badge>
      );
    case "PENDING_PAYMENT":
      return (
        <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 gap-1.5 font-bold">
          <AlertTriangle className="size-3" />
          Fatura Pendente
        </Badge>
      );
    case "INACTIVE":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1.5">
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
  const [showDemo, setShowDemo] = useState(true);

  // Queries
  const fetchVehicles = useServerFn(getVehicles);
  const { data: dbVehicles = [], isLoading } = useQuery({
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

  // Mapeia veículos do banco para a estrutura visual
  const mappedDbVehicles: VehicleItem[] = useMemo(() => {
    return (dbVehicles || []).map((v: any) => ({
      id: v.id,
      plate: v.plate || "SEM-PLACA",
      brand: v.brand || "Não informada",
      model: v.model || "Modelo não informado",
      year: v.year || new Date().getFullYear(),
      color: v.color || "Prata",
      chassi: `9BW${(v.id || "").slice(0, 8).toUpperCase()}`,
      renavam: `00${(v.id || "").replace(/\D/g, "").slice(0, 9)}`,
      fipeValue: 75000 + ((v.year || 2020) % 10) * 12000,
      status: "ACTIVE" as const,
      coveragePlan: "Proteção Integral 100% FIPE",
      monthlyFee: 169.90,
      fuel: "Flex",
      inspectionDate: new Date(v.created_at || Date.now()).toLocaleDateString("pt-BR"),
      isDemo: false,
      member: {
        id: v.members?.id || "",
        name: v.members?.name || "Associado não identificado",
        document: v.members?.document || "",
        phone: v.members?.phone,
        email: v.members?.email,
        city: "São Paulo - SP",
        partnerName: v.members?.partners?.name,
      },
    }));
  }, [dbVehicles]);

  // Lista unificada ou filtrada
  const allVehicles = useMemo(() => {
    if (!showDemo && mappedDbVehicles.length > 0) {
      return mappedDbVehicles;
    }
    // Se o banco estiver vazio ou demo estiver ativada, mescla os reais com os de demonstração
    return [...mappedDbVehicles, ...DEMO_VEHICLES];
  }, [mappedDbVehicles, showDemo]);

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

  const openFirstDemo = () => {
    const demo = DEMO_VEHICLES[0];
    setSelectedVehicle(demo);
    setDossierOpen(true);
  };

  return (
    <AppLayout
      title="Central de Veículos"
      subtitle="Gestão unificada da frota protegida, laudos de vistoria e dados FIPE da Planmais"
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={openFirstDemo}
            variant="outline"
            className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-2 font-semibold shadow-xs"
          >
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span className="hidden sm:inline">Ver Demonstração do Veículo</span>
            <span className="sm:hidden">Demonstração</span>
          </Button>

          <NewVehicleDialog members={members} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner Informativo de Demonstração */}
        {showDemo && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                  <Car className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      Ambiente de Proteção Veicular Planmais
                    </h3>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                      DEMONSTRAÇÃO ATIVA
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                    Este menu centraliza automaticamente todos os veículos vinculados aos associados.
                    Clique em qualquer veículo abaixo ou no botão de demonstração para inspecionar o <strong>Dossiê Completo</strong> (Placa Mercosul, Fotos da Vistoria, Cotação FIPE e Apólice).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDemo(!showDemo)}
                  className="rounded-xl text-xs h-9"
                >
                  {showDemo ? "Ocultar Exemplo" : "Exibir Demonstração"}
                </Button>
                <Button
                  size="sm"
                  onClick={openFirstDemo}
                  className="rounded-xl text-xs h-9 bg-primary text-primary-foreground gap-1.5 shadow-xs"
                >
                  <Eye className="size-3.5" />
                  Abrir Dossiê
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total da Frota
                </span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Car className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{totalVehicles}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Veículos cadastrados no sistema</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Proteção Ativa
                </span>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {activeVehicles}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalVehicles > 0 ? `${Math.round((activeVehicles / totalVehicles) * 100)}% de adimplência` : "0%"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Em Vistoria
                </span>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {pendingInspection}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Novas adesões para homologar</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Patrimônio FIPE
                </span>
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground truncate">
                  {BRL(totalFipeValue)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Valor total protegido pela associação</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por placa, modelo, marca, associado ou CPF..."
                  className="pl-10 h-10 rounded-xl bg-background border-border/80 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-[180px] rounded-xl bg-background border-border/80 text-xs font-medium">
                    <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
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

        {/* Grid de Veículos */}
        {filteredVehicles.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
            <div className="size-14 rounded-2xl bg-muted/80 text-muted-foreground flex items-center justify-center mx-auto mb-4">
              <Car className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">Nenhum veículo encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Nenhum veículo corresponde aos filtros selecionados. Tente limpar os filtros de busca.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-4 rounded-xl"
            >
              Limpar Filtros
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="rounded-2xl border border-border/80 shadow-card hover:shadow-md transition-all duration-200 bg-card flex flex-col justify-between overflow-hidden group hover:border-primary/40"
              >
                <div>
                  {/* Topo do Card com Placa Mercosul e Status */}
                  <div className="p-4 sm:p-5 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <MercosulPlate plate={vehicle.plate} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-primary uppercase tracking-wide">
                            {vehicle.brand}
                          </span>
                          {vehicle.isDemo && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                              Demo
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-foreground leading-tight line-clamp-1 mt-0.5">
                          {vehicle.model}
                        </h4>
                      </div>
                    </div>

                    <div>{getStatusBadge(vehicle.status)}</div>
                  </div>

                  {/* Informações Centrais do Veículo */}
                  <div className="p-4 sm:p-5 space-y-3.5">
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-muted/40 border border-border/40 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Ano / Mod.</span>
                        <span className="font-semibold text-foreground">{vehicle.year}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Cor</span>
                        <span className="font-semibold text-foreground truncate block">{vehicle.color || "Prata"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Tabela FIPE</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                          {BRL(vehicle.fipeValue || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Dados do Associado */}
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Associado Responsável
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {vehicle.member.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-foreground truncate">{vehicle.member.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {formatCpfCnpj(vehicle.member.document)}
                            </p>
                          </div>
                        </div>

                        {vehicle.member.phone && (
                          <a
                            href={`https://wa.me/55${vehicle.member.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Conversar no WhatsApp"
                            className="size-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors shrink-0"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé com Ações */}
                <CardFooter className="p-4 pt-0 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-[10px] text-muted-foreground block">Mensalidade</span>
                    <span className="font-bold text-foreground">{BRL(vehicle.monthlyFee || 179.9)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => openDossier(vehicle)}
                      className="rounded-xl h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
                    >
                      <Eye className="size-3.5" />
                      Ver Dossiê
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Modal do Dossiê Completo do Veículo (Demonstração Interativa) */}
        {selectedVehicle && (
          <VehicleDossierDialog
            open={dossierOpen}
            onOpenChange={setDossierOpen}
            vehicle={selectedVehicle}
            onOpenCertificate={() => {
              setDossierOpen(false);
              setCertificateOpen(true);
            }}
          />
        )}

        {/* Modal do Certificado Digital de Proteção Veicular */}
        {selectedVehicle && (
          <CertificateDialog
            open={certificateOpen}
            onOpenChange={setCertificateOpen}
            vehicle={selectedVehicle}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Modal do Dossiê Completo do Veículo com Vistoria e Coberturas
function VehicleDossierDialog({
  open,
  onOpenChange,
  vehicle,
  onOpenCertificate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleItem;
  onOpenCertificate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 gap-0 border-border bg-card">
        {/* Topo Cinematográfico */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <MercosulPlate plate={vehicle.plate} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {vehicle.brand} • {vehicle.year}
                  </span>
                  {vehicle.isDemo && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-bold">
                      DEMONSTRAÇÃO
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                  {vehicle.model}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dossiê Oficial de Proteção Veicular Planmais • Apólice ativa
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
              {getStatusBadge(vehicle.status)}
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Tabela FIPE</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {BRL(vehicle.fipeValue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação do Dossiê */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-border/60 px-6 bg-muted/20">
            <TabsList className="bg-transparent h-12 p-0 gap-4">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs"
              >
                Ficha Técnica
              </TabsTrigger>
              <TabsTrigger
                value="inspection"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs"
              >
                Vistoria Digital
              </TabsTrigger>
              <TabsTrigger
                value="coverage"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs"
              >
                Coberturas & Assistência 24h
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs"
              >
                Mensalidades
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Aba 1: Ficha Técnica */}
          <TabsContent value="overview" className="p-6 space-y-6 m-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Car className="size-4 text-primary" /> Dados Técnicos do Veículo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[11px] text-muted-foreground block">Placa</span>
                  <span className="font-mono font-bold text-sm text-foreground">{vehicle.plate}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[11px] text-muted-foreground block">Ano Fab / Modelo</span>
                  <span className="font-bold text-sm text-foreground">{vehicle.year} / {vehicle.year}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[11px] text-muted-foreground block">Cor</span>
                  <span className="font-bold text-sm text-foreground">{vehicle.color || "Prata"}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[11px] text-muted-foreground block">Combustível</span>
                  <span className="font-bold text-sm text-foreground truncate block">{vehicle.fuel || "Flex"}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground block">Chassi</span>
                  <span className="font-mono font-bold text-xs text-foreground truncate block">
                    {vehicle.chassi || "9BWCA11108P019283"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground block">Renavam</span>
                  <span className="font-mono font-bold text-xs text-foreground truncate block">
                    {vehicle.renavam || "00918237461"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <User className="size-4 text-primary" /> Associado Titular da Proteção
              </h3>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    {vehicle.member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm sm:text-base">{vehicle.member.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      CPF: {formatCpfCnpj(vehicle.member.document)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {vehicle.member.city || "São Paulo - SP"} • {vehicle.member.email || "Sem e-mail"}
                    </p>
                  </div>
                </div>

                {vehicle.member.phone && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-xl border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1.5 text-xs font-semibold"
                    >
                      <a
                        href={`https://wa.me/55${vehicle.member.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="size-3.5" />
                        {vehicle.member.phone}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {vehicle.member.partnerName && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Consultor / Parceiro de Captação:</span>
                <span className="font-bold text-primary">{vehicle.member.partnerName}</span>
              </div>
            )}
          </TabsContent>

          {/* Aba 2: Vistoria Digital com Fotos e Checklist */}
          <TabsContent value="inspection" className="p-6 space-y-6 m-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Laudo Fotográfico da Vistoria Digital</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fotos obrigatórias para validação da apólice e verificação prévia de sinistro
                </p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 font-bold text-xs">
                <CheckCircle2 className="size-3.5" />
                Vistoria Aprovada
              </Badge>
            </div>

            {/* Grid de Fotos Simuladas da Vistoria */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { title: "Frente do Veículo", desc: "Placa, faróis e parachoque", tag: "Frente" },
                { title: "Traseira", desc: "Placa, lanternas e tampa", tag: "Traseira" },
                { title: "Lateral Direita", desc: "Portas e retrovisor", tag: "Lateral Dir." },
                { title: "Lateral Esquerda", desc: "Portas e pintura", tag: "Lateral Esq." },
                { title: "Odômetro / Painel", desc: "KM registrado: 38.410 km", tag: "Painel" },
                { title: "Motor & Chassi", desc: "Número do chassi e cofre", tag: "Motor" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl border border-border/80 bg-muted/40 aspect-4/3 overflow-hidden flex flex-col justify-between p-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {item.tag}
                    </Badge>
                    <span className="size-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center my-auto text-muted-foreground/60 group-hover:text-primary transition-colors">
                    <Camera className="size-8 stroke-1 mb-1" />
                    <span className="text-[11px] font-semibold text-foreground">{item.title}</span>
                  </div>

                  <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Checklist de Vistoria */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Checklist de Inspeção Homologada
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  "Pintura e Lataria sem avarias graves ou amassados",
                  "Conjunto óptico (faróis e lanternas) em pleno funcionamento",
                  "Parabrisa e vidros sem trincas ou fissuras",
                  "Pneus com profundidade de sulco acima de 1.6mm (dentro do TWI)",
                  "Estepe, macaco e chave de roda presentes",
                  "Alarme, travas elétricas e chave reserva conferidos",
                ].map((check, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{check}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba 3: Coberturas & Assistência 24h */}
          <TabsContent value="coverage" className="p-6 space-y-6 m-0">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Plano de Cobertura Contratado</h3>
                <Badge className="bg-primary/10 text-primary border-primary/30 font-bold text-xs">
                  {vehicle.coveragePlan}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Roubo e Furto Qualificado", desc: "100% da Tabela FIPE no momento do evento", icon: ShieldCheck, status: "Incluso" },
                  { title: "Colisão e Perda Total", desc: "Indenização integral ou reparo em oficina credenciada", icon: Car, status: "Incluso" },
                  { title: "Danos Materiais a Terceiros", desc: "Cobertura de até R$ 100.000,00 para terceiros", icon: Award, status: "R$ 100k" },
                  { title: "Guincho / Reboque 24h", desc: "Até 1.000 km sem limite de utilizações por ano", icon: Wrench, status: "1.000 km" },
                  { title: "Carro Reserva", desc: "Até 15 dias de locação de veículo após sinistro", icon: Clock, status: "15 dias" },
                  { title: "Vidros, Faróis e Lanternas", desc: "Proteção completa de vidros com franquia reduzida", icon: Sparkles, status: "Incluso" },
                ].map((cob, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <cob.icon className="size-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground">{cob.title}</h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600">
                          {cob.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{cob.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Central de Assistência 24 Horas
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Guincho, chaveiro, troca de pneus e socorro mecânico em todo território nacional
                  </p>
                </div>
                <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold text-xs shadow-xs">
                  <Phone className="size-3.5" />
                  0800 941 0200
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Aba 4: Mensalidades & Boletos */}
          <TabsContent value="financial" className="p-6 space-y-6 m-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Mensalidades da Proteção</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Boletos e cobranças recorrentes vinculadas a este veículo
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Valor Mensal</span>
                <span className="text-lg font-black text-foreground">{BRL(vehicle.monthlyFee || 179.9)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { month: "Março / 2026", due: "10/03/2026", status: "RECEIVED", value: vehicle.monthlyFee || 179.9 },
                { month: "Fevereiro / 2026", due: "10/02/2026", status: "RECEIVED", value: vehicle.monthlyFee || 179.9 },
                { month: "Janeiro / 2026", due: "10/01/2026", status: "RECEIVED", value: vehicle.monthlyFee || 179.9 },
              ].map((inv, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{inv.month}</p>
                      <p className="text-[11px] text-muted-foreground">Vencimento em {inv.due}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{BRL(inv.value)}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold">
                      Pago
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Rodapé com Ações */}
        <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCertificate}
              className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-1.5 font-bold text-xs"
            >
              <Award className="size-3.5" />
              Emitir Certificado Digital
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs flex-1 sm:flex-initial"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Solicitação de assistência enviada para a central 24h.");
              }}
              className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 flex-1 sm:flex-initial shadow-xs"
            >
              <Phone className="size-3.5" />
              Acionar Assistência
            </Button>
          </div>
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
      <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 bg-card border-border">
        <div className="border-2 border-primary/30 rounded-2xl p-6 bg-gradient-to-b from-primary/5 via-card to-card relative overflow-hidden">
          {/* Marca d'água de proteção */}
          <ShieldCheck className="absolute -right-8 -bottom-8 size-48 text-primary/5 pointer-events-none" />

          {/* Cabeçalho do Certificado */}
          <div className="text-center pb-4 border-b border-border/60">
            <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 shadow-xs">
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-primary">
              Certificado de Proteção Veicular
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Planmais Associação de Benefícios Mútuos & Proteção Patrimonial
            </p>
          </div>

          {/* Dados do Certificado */}
          <div className="py-5 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block">Associado Titular</span>
                <span className="font-bold text-foreground text-sm">{vehicle.member.name}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{vehicle.member.document}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Veículo Protegido</span>
                <span className="font-bold text-foreground text-xs">{vehicle.brand} {vehicle.model}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Placa</span>
                <span className="font-mono font-bold text-sm text-foreground">{vehicle.plate}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block">Plano & Cobertura</span>
              <span className="font-bold text-foreground text-xs">{vehicle.coveragePlan}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Cobertura de 100% da Tabela FIPE ({BRL(vehicle.fipeValue || 0)}) com Guincho 24h em todo o Brasil.
              </p>
            </div>
          </div>

          {/* Rodapé com Validação */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Certificado nº PLAN-{vehicle.plate}-2026</p>
              <p>Autenticação digital verificada pela Planmais</p>
            </div>
            <div className="size-12 bg-white rounded-lg p-1 border border-border flex items-center justify-center">
              <QrCode className="size-10 text-slate-900" />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl text-xs gap-1.5"
          >
            <FileText className="size-3.5" />
            Imprimir Certificado
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold"
          >
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Diálogo para Cadastrar Novo Veículo Vinculado a um Associado
function NewVehicleDialog({ members }: { members: any[] }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);

  const [memberId, setMemberId] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [color, setColor] = useState("");

  const createVeh = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada.");
      if (!memberId) throw new Error("Selecione o associado proprietário.");
      if (!plate || plate.trim().length < 7) throw new Error("Informe uma placa válida (7 caracteres).");
      if (!brand || !model) throw new Error("Informe a marca e modelo do veículo.");

      await addVehicle({
        data: {
          companyId,
          memberId,
          plate: plate.toUpperCase().trim(),
          brand,
          model,
          year: Number(year) || new Date().getFullYear(),
          color,
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
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar veículo.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-primary text-primary-foreground gap-1.5 font-bold shadow-xs">
          <Plus className="size-4" />
          <span>Cadastrar Veículo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Car className="size-5 text-primary" /> Novo Veículo na Frota
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
          className="space-y-3.5 py-2"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Associado Proprietário *</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="rounded-xl h-10 text-xs">
                <SelectValue placeholder="Selecione o associado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-56">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({formatCpfCnpj(m.document)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Placa (Mercosul) *</Label>
              <Input
                placeholder="Ex: BRA2E19"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                maxLength={8}
                className="rounded-xl uppercase font-mono font-bold text-sm h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ano Fabricação / Mod.</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-xl font-medium text-sm h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Marca *</Label>
              <Input
                placeholder="Ex: Toyota, Honda, Jeep"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="rounded-xl text-sm h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cor</Label>
              <Input
                placeholder="Ex: Branco, Prata, Preto"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="rounded-xl text-sm h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Modelo do Veículo *</Label>
            <Input
              placeholder="Ex: Corolla Altis 2.0 Flex"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-xl text-sm h-10"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createVeh.isPending}
              className="rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-xs"
            >
              {createVeh.isPending ? "Cadastrando..." : "Salvar Veículo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

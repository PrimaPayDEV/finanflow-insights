import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
  Wrench,
  Pencil,
  Trash2,
  ShieldAlert,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Upload,
  Eye,
  Receipt,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers } from "@/lib/members.functions";
import { BRL, formatCurrencyInput } from "@/lib/format";
import {
  type EventoSinistro,
  type EventoServicoItem,
  type EventoAnexoItem,
  loadLocalData,
  saveLocalData
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/eventos')({
  head: () => ({
    meta: [{ title: "Eventos & Sinistros | Planmais Proteção Veicular" }],
  }),
  component: EventosPage,
});

const ANEXO_TYPE_LABELS: Record<EventoAnexoItem["type"], string> = {
  FOTO: "Foto / Vistoria",
  ORCAMENTO: "Orçamento",
  RECIBO: "Recibo",
  NOTA_FISCAL: "Nota Fiscal (NF)",
  BOLETIM_OCORRENCIA: "Boletim de Ocorrência",
  LAUDO: "Laudo Técnico",
  OUTRO: "Outro Documento",
};

const DEFAULT_EVENTOS_EXEMPLO: EventoSinistro[] = [
  {
    id: "ev-1",
    companyId: "default",
    date: "2026-10-14",
    createdAt: new Date().toISOString(),
    memberName: "Marcos Vinicius da Silva",
    vehiclePlate: "BRA2E19",
    category: "COLISAO",
    description: "Colisão traseira no trevo da rodovia com reparo de parachoque e lanterna",
    workshopProvider: "Auto Mecânica & Funilaria Modelo",
    baseAmount: 2800.00,
    amount: 3450.00,
    status: "APROVADO",
    services: [
      {
        id: "srv-1",
        category: "Peças / Reposição",
        description: "Lanterna traseira original + suporte parachoque",
        provider: "Auto Peças Sul",
        amount: 650.00,
      },
    ],
    attachments: [
      {
        id: "anx-1",
        name: "orcamento_funilaria_bra2e19.pdf",
        type: "ORCAMENTO",
        uploadedAt: new Date().toISOString(),
      },
      {
        id: "anx-2",
        name: "foto_colisao_traseira.jpg",
        type: "FOTO",
        uploadedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "ev-2",
    companyId: "default",
    date: "2026-10-18",
    createdAt: new Date().toISOString(),
    memberName: "Renata Albuquerque",
    vehiclePlate: "RTX8J21",
    category: "ASSISTENCIA_REBOQUE",
    description: "Reboque emergencial 350km pane elétrica em via expressa",
    workshopProvider: "Guincho 24h Brasil Express",
    baseAmount: 680.00,
    amount: 680.00,
    status: "CONCLUIDO",
    services: [],
    attachments: [
      {
        id: "anx-3",
        name: "recibo_guincho_350km.pdf",
        type: "RECIBO",
        uploadedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "ev-3",
    companyId: "default",
    date: "2026-10-21",
    createdAt: new Date().toISOString(),
    memberName: "Geral da Associação",
    vehiclePlate: "FROTA",
    category: "DESPESA_ADMINISTRATIVA",
    description: "Manutenção do servidor de telemetria e chips M2M dos rastreadores",
    workshopProvider: "Telecom M2M Provedor",
    baseAmount: 1250.00,
    amount: 1250.00,
    status: "PAGO",
    services: [],
    attachments: [],
  },
];

function EventosPage() {
  const { companyId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchMembers = useServerFn(getMembers);
  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  // Estado dos eventos persistidos
  const [eventos, setEventos] = useState<EventoSinistro[]>(() => {
    return loadLocalData<EventoSinistro[]>(companyId || "default", "eventos", DEFAULT_EVENTOS_EXEMPLO);
  });

  // Filtros
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterCategory, setFilterCategory] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Novo / Editar Evento
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventoSinistro | null>(null);

  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [memberId, setMemberId] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [category, setCategory] = useState<EventoSinistro["category"]>("COLISAO");
  const [description, setDescription] = useState("");
  const [workshopProvider, setWorkshopProvider] = useState("");
  const [baseAmountStr, setBaseAmountStr] = useState("100000"); // R$ 1.000,00 padrão
  const [status, setStatus] = useState<EventoSinistro["status"]>("APROVADO");

  // Estado de Serviços (Outras despesas relacionadas)
  const [services, setServices] = useState<EventoServicoItem[]>([]);
  const [addingService, setAddingService] = useState(false);
  const [srvCategory, setSrvCategory] = useState("Peças / Reposição");
  const [srvDescription, setSrvDescription] = useState("");
  const [srvProvider, setSrvProvider] = useState("");
  const [srvAmountStr, setSrvAmountStr] = useState("25000"); // R$ 250,00

  // Estado de Anexos (Fotos, Recibos, Orçamentos, NFs e etc.)
  const [attachments, setAttachments] = useState<EventoAnexoItem[]>([]);
  const [selectedAnexoType, setSelectedAnexoType] = useState<EventoAnexoItem["type"]>("FOTO");
  const [previewAnexo, setPreviewAnexo] = useState<EventoAnexoItem | null>(null);

  // Veículos disponíveis para o associado selecionado
  const selectedMemberVehicles = useMemo(() => {
    if (!memberId || memberId === "geral") return [];
    const m: any = members.find((x: any) => x.id === memberId);
    return Array.isArray(m?.vehicles) ? m.vehicles : [];
  }, [members, memberId]);

  // Cálculos de valor base + serviços adicionais
  const baseAmount = Number(baseAmountStr.replace(/\D/g, "")) / 100 || 0;
  const servicesTotal = useMemo(
    () => services.reduce((acc, s) => acc + (s.amount || 0), 0),
    [services]
  );
  const totalEventAmount = baseAmount + servicesTotal;

  const handleOpenModal = (ev?: EventoSinistro) => {
    if (ev) {
      setEditingEvent(ev);
      setDate(ev.date);
      setMemberId(ev.memberId || "geral");
      setVehiclePlate(ev.vehiclePlate || "");
      setCategory(ev.category);
      setDescription(ev.description);
      setWorkshopProvider(ev.workshopProvider || "");
      const srvList = ev.services || [];
      const srvSum = srvList.reduce((acc, s) => acc + (s.amount || 0), 0);
      const bAmt = ev.baseAmount !== undefined ? ev.baseAmount : Math.max(0, ev.amount - srvSum);
      setBaseAmountStr(String(Math.round(bAmt * 100)));
      setStatus(ev.status);
      setServices(srvList);
      setAttachments(ev.attachments || []);
    } else {
      setEditingEvent(null);
      setDate(now.toISOString().split("T")[0]);
      setMemberId("geral");
      setVehiclePlate("");
      setCategory("COLISAO");
      setDescription("");
      setWorkshopProvider("");
      setBaseAmountStr("100000");
      setStatus("APROVADO");
      setServices([]);
      setAttachments([]);
    }
    setAddingService(false);
    setSrvDescription("");
    setSrvProvider("");
    setSrvAmountStr("25000");
    setModalOpen(true);
  };

  // Adicionar serviço relacionado
  const handleAddService = () => {
    if (!srvDescription.trim()) {
      toast.error("Informe a descrição do serviço ou despesa relacionada.");
      return;
    }
    const val = Number(srvAmountStr.replace(/\D/g, "")) / 100 || 0;
    if (val <= 0) {
      toast.error("Informe um valor válido para o serviço.");
      return;
    }

    const newSrv: EventoServicoItem = {
      id: "srv-" + Date.now(),
      category: srvCategory,
      description: srvDescription.trim(),
      provider: srvProvider.trim() || undefined,
      amount: val,
    };

    setServices((prev) => [...prev, newSrv]);
    setSrvDescription("");
    setSrvProvider("");
    setSrvAmountStr("25000");
    setAddingService(false);
    toast.success(`Serviço adicionado (+ ${BRL(val)})`);
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Upload de Anexos (Fotos, Recibos, Orçamentos, NFs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = typeof reader.result === "string" ? reader.result : undefined;
        // Armazena DataURL se for até ~600KB para manter localStorage ágil
        const safeDataUrl = file.size <= 650 * 1024 ? resultStr : undefined;

        const newAnexo: EventoAnexoItem = {
          id: "anx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          name: file.name,
          type: selectedAnexoType,
          fileType: file.type,
          size: file.size,
          dataUrl: safeDataUrl,
          uploadedAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAnexo]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${files.length} anexo(s) adicionado(s) ao evento!`);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveEvent = () => {
    if (!description.trim()) {
      toast.error("Por favor, preencha a descrição do evento.");
      return;
    }

    if (totalEventAmount <= 0) {
      toast.error("Informe um valor válido para o evento ou adicione serviços.");
      return;
    }

    let memberName = "Geral da Associação";
    if (memberId && memberId !== "geral") {
      const m: any = members.find((x: any) => x.id === memberId);
      if (m) memberName = m.name;
    }

    const newEv: EventoSinistro = {
      id: editingEvent ? editingEvent.id : "ev-" + Date.now(),
      companyId: companyId || "default",
      date,
      createdAt: editingEvent ? editingEvent.createdAt : new Date().toISOString(),
      memberId: memberId === "geral" ? undefined : memberId,
      memberName,
      vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase().trim() : undefined,
      category,
      description,
      workshopProvider,
      baseAmount,
      amount: totalEventAmount,
      status,
      services,
      attachments,
    };

    let updated: EventoSinistro[];
    if (editingEvent) {
      updated = eventos.map((e) => (e.id === editingEvent.id ? newEv : e));
    } else {
      updated = [newEv, ...eventos];
    }

    setEventos(updated);
    saveLocalData(companyId || "default", "eventos", updated);
    toast.success(editingEvent ? "Evento atualizado com sucesso!" : "Evento lançado com sucesso!", {
      description: `O rateio do mês ${date.slice(0, 7)} agora considera o valor total de ${BRL(totalEventAmount)}.`,
    });
    setModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento de evento?")) {
      const updated = eventos.filter((e) => e.id !== id);
      setEventos(updated);
      saveLocalData(companyId || "default", "eventos", updated);
      toast.success("Lançamento de evento removido.");
    }
  };

  // Filtragem dos eventos
  const filteredEventos = useMemo(() => {
    return eventos.filter((e) => {
      if (filterMonth && !e.date.startsWith(filterMonth)) return false;
      if (filterCategory !== "TODAS" && e.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const member = (e.memberName || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        const plate = (e.vehiclePlate || "").toLowerCase();
        const workshop = (e.workshopProvider || "").toLowerCase();
        return member.includes(q) || desc.includes(q) || plate.includes(q) || workshop.includes(q);
      }
      return true;
    });
  }, [eventos, filterMonth, filterCategory, searchQuery]);

  // Estatísticas do Mês Filtrado
  const totalAmountFiltered = useMemo(
    () => filteredEventos.reduce((acc, e) => acc + e.amount, 0),
    [filteredEventos]
  );
  const colisoesCount = useMemo(
    () => filteredEventos.filter((e) => e.category === "COLISAO").length,
    [filteredEventos]
  );
  const reboquesCount = useMemo(
    () => filteredEventos.filter((e) => e.category === "ASSISTENCIA_REBOQUE").length,
    [filteredEventos]
  );

  return (
    <AppLayout
      title="Eventos & Sinistros"
      subtitle="Lançamento de sinistros, serviços/despesas relacionadas e anexos (fotos, orçamentos, recibos e NFs)"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Total de Sinistros no Período</span>
            <div className="text-2xl font-black text-foreground font-mono mt-1">
              {BRL(totalAmountFiltered)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Inclui valor principal + serviços relacionados
            </span>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Eventos Registrados</span>
            <div className="text-2xl font-black text-primary font-mono mt-1">
              {filteredEventos.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {colisoesCount} colisões / {reboquesCount} reboques
            </span>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Custo Médio por Sinistro</span>
            <div className="text-2xl font-black text-foreground font-mono mt-1">
              {filteredEventos.length > 0 ? BRL(totalAmountFiltered / filteredEventos.length) : "R$ 0,00"}
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Sincronização com Rateio</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                Alimenta Lotes Automaticamente
              </span>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="rounded-xl font-bold text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 mt-2"
            >
              <Plus className="size-3.5" />
              <span>Lançar Novo Evento</span>
            </Button>
          </Card>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-2xl border border-border/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar associado, placa, oficina..."
                className="pl-8 rounded-xl text-xs h-9 bg-background"
              />
            </div>

            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-40 rounded-xl text-xs h-9 font-mono bg-background"
            />

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44 rounded-xl text-xs h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="TODAS">Todas as Categorias</SelectItem>
                <SelectItem value="COLISAO">Colisão / Batida</SelectItem>
                <SelectItem value="FURTO_ROUBO">Furto / Roubo</SelectItem>
                <SelectItem value="TERCEIROS">Danos a Terceiros</SelectItem>
                <SelectItem value="ASSISTENCIA_REBOQUE">Reboque / Assistência</SelectItem>
                <SelectItem value="VIDROS">Vidros & Faróis</SelectItem>
                <SelectItem value="DESPESA_ADMINISTRATIVA">Despesa Administrativa</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => handleOpenModal()}
            className="rounded-xl font-bold text-xs h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            <span>Novo Evento</span>
          </Button>
        </div>

        {/* Tabela de Eventos */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {filteredEventos.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm space-y-2">
                <ShieldAlert className="size-10 mx-auto text-muted-foreground/60" />
                <p>Nenhum evento ou sinistro registrado para os filtros selecionados.</p>
                <Button size="sm" variant="outline" onClick={() => handleOpenModal()} className="rounded-xl text-xs">
                  Registrar Primeiro Sinistro
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Data</th>
                      <th className="p-3.5">Categoria</th>
                      <th className="p-3.5">Associado / Veículo</th>
                      <th className="p-3.5">Descrição & Serviços</th>
                      <th className="p-3.5">Oficina / Anexos</th>
                      <th className="p-3.5 text-right">Valor Total (R$)</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredEventos.map((e) => {
                      const srvCount = e.services?.length || 0;
                      const anxCount = e.attachments?.length || 0;

                      return (
                        <tr
                          key={e.id}
                          onClick={() => handleOpenModal(e)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <td className="p-3.5 font-mono font-semibold text-foreground whitespace-nowrap">
                            {e.date ? e.date.split("-").reverse().join("/") : "-"}
                          </td>
                          <td className="p-3.5">
                            <Badge
                              className={
                                e.category === "COLISAO"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]"
                                  : e.category === "FURTO_ROUBO"
                                  ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-[10px]"
                                  : e.category === "ASSISTENCIA_REBOQUE"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px]"
                                  : "bg-muted text-muted-foreground text-[10px]"
                              }
                            >
                              {e.category.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-foreground text-sm">{e.memberName}</div>
                            {e.vehiclePlate && (
                              <span className="text-[10px] text-muted-foreground font-mono font-bold">
                                Placa: {e.vehiclePlate}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-muted-foreground max-w-sm">
                            <p className="line-clamp-2 leading-relaxed text-foreground/90">{e.description}</p>
                            {srvCount > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 gap-1">
                                  <Wrench className="size-2.5" />
                                  +{srvCount} serviço(s) relacionado(s)
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-muted-foreground font-medium">
                            <div>{e.workshopProvider || "-"}</div>
                            {anxCount > 0 && (
                              <Badge variant="secondary" className="text-[9px] gap-1 mt-1">
                                <Paperclip className="size-2.5 text-primary" />
                                {anxCount} anexo(s)
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono font-extrabold text-foreground text-sm whitespace-nowrap">
                            {BRL(e.amount)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge
                              className={
                                e.status === "PAGO" || e.status === "CONCLUIDO"
                                  ? "bg-emerald-500 text-white text-[10px]"
                                  : e.status === "APROVADO"
                                  ? "bg-blue-500 text-white text-[10px]"
                                  : "bg-amber-500 text-white text-[10px]"
                              }
                            >
                              {e.status}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(e)}
                                className="size-8 rounded-lg"
                                title="Editar Evento, Serviços e Anexos"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEvent(e.id)}
                                className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                                title="Excluir Evento"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MODAL: NOVO / EDITAR EVENTO (COM SERVIÇOS E ANEXOS) */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="w-[96vw] sm:w-[860px] sm:max-w-4xl max-h-[92vh] flex flex-col justify-between rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Wrench className="size-4.5 text-primary" />
                {editingEvent ? "Editar Evento, Serviços e Anexos" : "Lançar Novo Evento / Sinistro"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registre o sinistro, adicione outros serviços/despesas relacionadas e anexe fotos, orçamentos, recibos e NFs
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto min-h-0 space-y-4">
              {/* BLOCO 1: Dados Principais do Sinistro */}
              <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 pb-1 border-b border-border/50">
                  <FileText className="size-3.5" /> 1. Dados Principais do Evento / Sinistro
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data do Evento *</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="rounded-xl text-xs font-mono h-8.5 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Categoria do Evento</Label>
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                      <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="COLISAO">Colisão / Batida</SelectItem>
                        <SelectItem value="FURTO_ROUBO">Furto / Roubo</SelectItem>
                        <SelectItem value="TERCEIROS">Danos a Terceiros (RCF)</SelectItem>
                        <SelectItem value="ASSISTENCIA_REBOQUE">Reboque / Assistência 24h</SelectItem>
                        <SelectItem value="VIDROS">Vidros & Faróis</SelectItem>
                        <SelectItem value="DESPESA_ADMINISTRATIVA">Despesa Administrativa</SelectItem>
                        <SelectItem value="OUTROS">Outros Sinistros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Status do Sinistro</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ANALISE">Em Análise Técnica</SelectItem>
                        <SelectItem value="APROVADO">Aprovado para Reparo</SelectItem>
                        <SelectItem value="EM_REPARO">Em Reparo na Oficina</SelectItem>
                        <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                        <SelectItem value="PAGO">Pago / Liquidado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Associado Envolvido</Label>
                    <Select value={memberId} onValueChange={setMemberId}>
                      <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                        <SelectValue placeholder="Selecione o associado..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-56">
                        <SelectItem value="geral">Geral da Associação / Frota</SelectItem>
                        {members.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Placa do Veículo</Label>
                    {selectedMemberVehicles.length > 0 ? (
                      <Select value={vehiclePlate} onValueChange={setVehiclePlate}>
                        <SelectTrigger className="rounded-xl text-xs font-mono font-bold h-8.5 bg-background">
                          <SelectValue placeholder="Selecione o veículo..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {selectedMemberVehicles.map((v: any) => (
                            <SelectItem key={v.id} value={v.plate}>
                              {v.plate} - {v.brand} {v.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                        placeholder="Ex: ABC-1234"
                        className="rounded-xl text-xs font-mono uppercase h-8.5 bg-background"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Oficina / Fornecedor Principal</Label>
                    <Input
                      value={workshopProvider}
                      onChange={(e) => setWorkshopProvider(e.target.value)}
                      placeholder="Nome da oficina mecânica"
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Valor Principal do Sinistro *</Label>
                    <Input
                      value={formatCurrencyInput(baseAmountStr)}
                      onChange={(e) => setBaseAmountStr(e.target.value)}
                      placeholder="R$ 0,00"
                      className="rounded-xl text-xs font-mono font-bold text-foreground h-8.5 bg-background"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Descrição do Ocorrido / Sinistro *</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detalhes do ocorrido, avarias, peças principais..."
                      className="rounded-xl text-xs h-8.5 bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: Adicionar Serviços (Outras Despesas Relacionadas) */}
              <div className="p-3.5 rounded-2xl border border-primary/25 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Wrench className="size-3.5" /> 2. Serviços & Outras Despesas Relacionadas ({services.length})
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Adicione peças extras, guincho, carro reserva, perícia, vistoria ou serviços de terceiros
                    </p>
                  </div>
                  {!addingService && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingService(true)}
                      className="h-7.5 rounded-xl text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Plus className="size-3.5" />
                      Adicionar Serviço
                    </Button>
                  )}
                </div>

                {/* Lista de serviços adicionados */}
                {services.length > 0 && (
                  <div className="space-y-1.5">
                    {services.map((srv) => (
                      <div
                        key={srv.id}
                        className="p-2.5 rounded-xl bg-background border border-border/70 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary px-1.5 py-0">
                              {srv.category || "Serviço"}
                            </Badge>
                            <span className="font-bold text-foreground truncate">{srv.description}</span>
                          </div>
                          {srv.provider && (
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              Fornecedor / Prestador: {srv.provider}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-foreground">+ {BRL(srv.amount)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveService(srv.id)}
                            className="size-7 rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulário para incluir novo serviço */}
                {addingService && (
                  <div className="p-3 rounded-xl bg-background border border-primary/40 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Tipo de Despesa</Label>
                        <Select value={srvCategory} onValueChange={setSrvCategory}>
                          <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Peças / Reposição">Peças / Reposição</SelectItem>
                            <SelectItem value="Mão de Obra / Funilaria">Mão de Obra / Funilaria</SelectItem>
                            <SelectItem value="Guincho / Reboque">Guincho / Reboque</SelectItem>
                            <SelectItem value="Carro Reserva / Locação">Carro Reserva / Locação</SelectItem>
                            <SelectItem value="Vistoria / Perícia">Vistoria / Perícia</SelectItem>
                            <SelectItem value="Terceiros">Despesa c/ Terceiros</SelectItem>
                            <SelectItem value="Outras Despesas">Outras Despesas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[11px] font-semibold">Descrição do Serviço / Despesa *</Label>
                        <Input
                          value={srvDescription}
                          onChange={(e) => setSrvDescription(e.target.value)}
                          placeholder="Ex: Pintura lateral, Troca de radiador, Diárias locadora..."
                          className="h-8 rounded-xl text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Valor (R$) *</Label>
                        <Input
                          value={formatCurrencyInput(srvAmountStr)}
                          onChange={(e) => setSrvAmountStr(e.target.value)}
                          className="h-8 rounded-xl text-xs font-mono font-bold bg-background"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <Input
                        value={srvProvider}
                        onChange={(e) => setSrvProvider(e.target.value)}
                        placeholder="Fornecedor / Prestador deste serviço (opcional)"
                        className="h-8 rounded-xl text-xs bg-background sm:max-w-xs"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingService(false)}
                          className="h-7.5 text-xs rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddService}
                          className="h-7.5 text-xs font-bold rounded-xl gap-1"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Incluir Serviço
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo Financeiro do Evento */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary/20 text-xs">
                  <span className="text-muted-foreground">
                    Valor Principal ({BRL(baseAmount)}) + Serviços Relacionados ({BRL(servicesTotal)})
                  </span>
                  <span className="font-mono font-black text-sm text-foreground">
                    Total do Evento: {BRL(totalEventAmount)}
                  </span>
                </div>
              </div>

              {/* BLOCO 3: Anexos (Fotos, Recibos, Orçamentos, NFs e etc.) */}
              <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Paperclip className="size-3.5" /> 3. Anexos do Evento — Fotos, Recibos, Orçamentos, NFs ({attachments.length})
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Anexe fotos da colisão/vistoria, orçamentos de oficinas, recibos, Notas Fiscais (NFs) e Boletim de Ocorrência
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={selectedAnexoType}
                      onValueChange={(v: any) => setSelectedAnexoType(v)}
                    >
                      <SelectTrigger className="h-8 w-44 rounded-xl text-xs bg-background font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-xs">
                        <SelectItem value="FOTO">Foto do Sinistro / Vistoria</SelectItem>
                        <SelectItem value="ORCAMENTO">Orçamento de Reparo</SelectItem>
                        <SelectItem value="RECIBO">Recibo de Pagamento</SelectItem>
                        <SelectItem value="NOTA_FISCAL">Nota Fiscal (NF)</SelectItem>
                        <SelectItem value="BOLETIM_OCORRENCIA">Boletim de Ocorrência (B.O.)</SelectItem>
                        <SelectItem value="LAUDO">Laudo / Perícia</SelectItem>
                        <SelectItem value="OUTRO">Outro Documento</SelectItem>
                      </SelectContent>
                    </Select>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 rounded-xl text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Upload className="size-3.5" />
                      Anexar Arquivo(s)
                    </Button>
                  </div>
                </div>

                {attachments.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 hover:bg-background text-center cursor-pointer transition-colors space-y-1"
                  >
                    <Upload className="size-5 mx-auto text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">
                      Clique aqui para anexar Fotos, Orçamentos, Recibos ou Notas Fiscais
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Aceita imagens (JPG, PNG, WEBP), PDFs e planilhas
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((anx) => {
                      const isImg = anx.dataUrl?.startsWith("data:image") || /\.(jpg|jpeg|png|webp|gif)$/i.test(anx.name);
                      return (
                        <div
                          key={anx.id}
                          className="p-2.5 rounded-xl bg-background border border-border/70 flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {anx.dataUrl && isImg ? (
                              <img
                                src={anx.dataUrl}
                                alt={anx.name}
                                className="size-10 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                {isImg ? <ImageIcon className="size-4.5" /> : <FileText className="size-4.5" />}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mb-0.5">
                                {ANEXO_TYPE_LABELS[anx.type] || anx.type}
                              </Badge>
                              <p className="font-bold text-foreground truncate text-xs" title={anx.name}>
                                {anx.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {anx.dataUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewAnexo(anx)}
                                className="size-7 rounded-lg text-primary hover:bg-primary/10"
                                title="Visualizar anexo"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAttachment(anx.id)}
                              className="size-7 rounded-lg text-destructive hover:bg-destructive/10"
                              title="Remover anexo"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold text-foreground">
                Valor Total do Lançamento: <span className="text-primary">{BRL(totalEventAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="rounded-xl text-xs h-8">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEvent} className="rounded-xl text-xs font-bold h-8 px-4">
                  Salvar Lançamento
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização de Anexo */}
        <Dialog open={!!previewAnexo} onOpenChange={(op) => !op && setPreviewAnexo(null)}>
          <DialogContent className="w-[95vw] sm:max-w-xl rounded-2xl p-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Paperclip className="size-4 text-primary" />
                {previewAnexo?.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Categoria: {previewAnexo ? ANEXO_TYPE_LABELS[previewAnexo.type] : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 flex flex-col items-center justify-center max-h-[70vh] overflow-auto">
              {previewAnexo?.dataUrl?.startsWith("data:image") ? (
                <img
                  src={previewAnexo.dataUrl}
                  alt={previewAnexo.name}
                  className="max-h-[60vh] rounded-xl border border-border object-contain"
                />
              ) : previewAnexo?.dataUrl ? (
                <iframe
                  src={previewAnexo.dataUrl}
                  title={previewAnexo.name}
                  className="w-full h-[55vh] rounded-xl border border-border"
                />
              ) : (
                <p className="text-xs text-muted-foreground py-8">Arquivo anexado ({previewAnexo?.name}).</p>
              )}
            </div>
            <DialogFooter>
              {previewAnexo?.dataUrl && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
                  <a href={previewAnexo.dataUrl} download={previewAnexo.name}>
                    Baixar Arquivo
                  </a>
                </Button>
              )}
              <Button size="sm" onClick={() => setPreviewAnexo(null)} className="rounded-xl text-xs">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

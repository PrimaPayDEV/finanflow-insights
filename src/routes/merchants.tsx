import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Smartphone,
  Users,
  Save,
  Percent,
  Trash2,
  Settings2,
  Edit2,
  Store,
  Key,
  Copy,
  Check,
  Phone,
  Mail,
  Layers,
  Sparkles,
  CreditCard,
  Building2,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Target,
  TrendingUp,
  BarChart3,
  Trophy,
} from "lucide-react";
import { MerchantIcon } from "@/components/MerchantIcon";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasModalSeal } from "@/components/AsaasBaasSeal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { createAsaasSubaccount } from "@/lib/asaas.functions";
import {
  feePlansQuery,
  merchantsQuery,
  splitRulesQuery,
  terminalsQuery,
  transactionsQuery,
  type Merchant,
} from "@/lib/db";
import { PCT, formatCpfCnpj, formatPhone, formatCurrencyInput, BRL, monthLabel, currentMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPartners } from "@/lib/partner.functions";
import { useServerFn } from "@tanstack/react-start";
import { translateError } from "@/lib/translateError";
import { useAuth } from "@/contexts/AuthContext";
import { createMerchantAccess } from "@/lib/merchant.functions";
import { fetchCepData } from "@/lib/cep";
import { calculateTerminalBilling, TERMINAL_PRICE, TERMINAL_FIRST_TIER, TERMINAL_STEP_TIER } from "@/lib/closure";

export const Route = createFileRoute("/merchants")({
  head: () => ({
    meta: [
      { title: "Estabelecimentos e Planos | Gestão de ECs" },
      {
        name: "description",
        content:
          "Cadastre estabelecimentos, vincule maquininhas por número serial e configure taxas operacionais, taxas por modalidade e split de parceiros.",
      },
      { property: "og:title", content: "Estabelecimentos e Planos | Gestão de ECs" },
      {
        property: "og:description",
        content: "Cadastro de ECs, terminais POS, planos de taxas e regras de split.",
      },
    ],
  }),
  component: MerchantsPage,
});

const emptyMerchant = { name: "", document_cnpj: "", phone_whatsapp: "", email: "" };

/* =========================================================================
   DIÁLOGO: GERAR ACESSO WEB
   ========================================================================= */
function WebAccessDialog({ merchant }: { merchant: Merchant }) {
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(merchant.email || "");
  const [password, setPassword] = useState("");

  const accessMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("companyId is required");
      return createMerchantAccess({ data: { companyId, merchantId: merchant.id, email, password } });
    },
    onSuccess: () => {
      toast.success("Acesso web gerado com sucesso! O EC já pode fazer login.");
      setOpen(false);
      setPassword("");
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 shadow-2xs font-medium"
        >
          <Key className="size-3.5" />
          <span>Acesso Web</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Key className="size-4" />
            </div>
            <DialogTitle>Gerar Acesso Web</DialogTitle>
          </div>
          <DialogDescription>
            Crie um login blindado para <strong>{merchant.name}</strong> acessar o painel de recebíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail de Acesso</Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="estabelecimento@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
              <Mail className="size-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Senha Temporária</Label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                Gerar senha forte
              </button>
            </div>
            <div className="relative">
              <Input
                type="text"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 font-mono"
              />
              <Key className="size-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => accessMutation.mutate()}
            disabled={accessMutation.isPending || !email || password.length < 6}
          >
            {accessMutation.isPending ? "Gerando..." : "Criar Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIÁLOGO: EDITAR ESTABELECIMENTO
   ========================================================================= */
function EditMerchantDialog({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: merchant.name,
    document_cnpj: merchant.document_cnpj || "",
    phone_whatsapp: merchant.phone_whatsapp || "",
    email: merchant.email || "",
  });

  useEffect(() => {
    setForm({
      name: merchant.name,
      document_cnpj: merchant.document_cnpj || "",
      phone_whatsapp: merchant.phone_whatsapp || "",
      email: merchant.email || "",
    });
  }, [merchant]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("merchants")
        .update(form)
        .eq("id", merchant.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estabelecimento atualizado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["merchants"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs font-medium">
          <Edit2 className="size-3.5" />
          <span>Editar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Store className="size-4" />
            </div>
            <DialogTitle>Editar Estabelecimento</DialogTitle>
          </div>
          <DialogDescription>
            Atualize os dados cadastrais e canais de contato de {merchant.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Razão Social / Nome Fantasia *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={200}
              placeholder="Nome da empresa"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">CNPJ / CPF</Label>
              <Input
                value={form.document_cnpj}
                onChange={(e) => setForm({ ...form, document_cnpj: formatCpfCnpj(e.target.value) })}
                maxLength={18}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">WhatsApp</Label>
              <Input
                value={form.phone_whatsapp}
                onChange={(e) => setForm({ ...form, phone_whatsapp: formatPhone(e.target.value) })}
                maxLength={15}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={200}
              placeholder="contato@empresa.com"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   PAINEL AVANÇADO (ZONA DE PERIGO)
   ========================================================================= */
function AdvancedPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const clearData = useMutation({
    mutationFn: async () => {
      const { data: ledgers } = await supabase
        .from("receivables_ledgers")
        .select("id, transaction_id")
        .eq("merchant_id", merchant.id);

      if (!ledgers || ledgers.length === 0) return { count: 0 };

      await supabase.from("receivables_requests").delete().eq("merchant_id", merchant.id);
      await supabase.from("receivables_ledgers").delete().eq("merchant_id", merchant.id);

      const txIds = ledgers.map((l: any) => l.transaction_id).filter(Boolean);
      if (txIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < txIds.length; i += 100) chunks.push(txIds.slice(i, i + 100));
        for (const c of chunks) {
          await supabase.from("receivables_transactions").delete().in("id", c);
        }
      }
      return { count: ledgers.length };
    },
    onSuccess: (data) => {
      toast.success(`Foram apagadas ${data.count} movimentações deste EC.`);
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Card className="border border-destructive/20 shadow-none bg-destructive/5 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="size-5" />
          <CardTitle className="text-base font-bold">Zona de Perigo</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Ações irreversíveis para limpeza e redefinição de histórico deste estabelecimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-background/60">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">Apagar Histórico de Recebíveis</h4>
            <p className="text-xs text-muted-foreground max-w-xl">
              Isso apagará permanentemente todos os relatórios importados, transações e lançamentos deste EC.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={clearData.isPending} className="shrink-0">
                {clearData.isPending ? "Apagando..." : "Apagar Histórico"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2">
                  <ShieldAlert className="size-5" /> Confirmar exclusão irreversível?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é <strong>permanente e irreversível</strong>. Todo o histórico de relatórios,
                  lançamentos e saldos vinculados a <strong>{merchant.name}</strong> será apagado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearData.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, apagar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================================
   PÁGINA PRINCIPAL DE ESTABELECIMENTOS
   ========================================================================= */
function MerchantsPage() {
  const qc = useQueryClient();
  const merchants = useQuery(merchantsQuery);
  const terminals = useQuery(terminalsQuery);
  const splits = useQuery(splitRulesQuery);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyMerchant);
  const [selected, setSelected] = useState<string | null>(null);

  // Filtros da carteira de ECs
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["merchants"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("merchants").insert(form);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estabelecimento cadastrado com sucesso");
      setForm(emptyMerchant);
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("merchants").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estabelecimento removido com sucesso");
      setSelected(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      const { error } = await supabase.from("merchants").update({ status: newStatus }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      toast.success(`Estabelecimento marcado como ${vars.newStatus === "active" ? "Ativo" : "Inativo"}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const list = merchants.data ?? [];

  // Filtragem da lista com normalização de acentos e correção da busca por dígitos
  const filteredList = useMemo(() => {
    const rawQuery = searchTerm.trim();
    const queryLower = rawQuery.toLowerCase();
    const queryNormalized = queryLower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const queryDigits = rawQuery.replace(/\D/g, "");

    return list.filter((m) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.status === "active") ||
        (statusFilter === "inactive" && m.status !== "active");

      if (!matchesStatus) return false;
      if (!rawQuery) return true;

      const merchantName = (m.name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const merchantEmail = (m.email || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const rawCnpj = m.document_cnpj?.replace(/\D/g, "") || "";
      const rawPhone = m.phone_whatsapp?.replace(/\D/g, "") || "";

      // Busca por nome ou e-mail (sem acentos e case-insensitive)
      const matchesName = merchantName.includes(queryNormalized);
      const matchesEmail = merchantEmail.includes(queryNormalized);

      // Busca por CNPJ e Telefone apenas se houver dígitos digitados
      const matchesCnpj = queryDigits.length > 0 && rawCnpj.includes(queryDigits);
      const matchesPhone = queryDigits.length > 0 && rawPhone.includes(queryDigits);

      return matchesName || matchesEmail || matchesCnpj || matchesPhone;
    });
  }, [list, searchTerm, statusFilter]);

  // Auto-selecionar o primeiro EC na primeira carga ou atualizar seleção caso o EC selecionado saia do filtro
  useEffect(() => {
    if (filteredList.length > 0) {
      const isSelectedInFiltered = filteredList.some((m) => m.id === selected);
      if (!isSelectedInFiltered) {
        setSelected(filteredList[0].id);
      }
    }
  }, [filteredList, selected]);

  const active = list.find((m) => m.id === selected) ?? null;

  // Contagens para badges das abas
  const activeTerminalsCount = (terminals.data ?? []).filter((t) => t.merchant_id === active?.id).length;
  const activeSplitsCount = (splits.data ?? []).filter((s) => s.merchant_id === active?.id).length;

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  return (
    <AppLayout
      title="Estabelecimentos (ECs)"
      subtitle="Cadastro, terminais POS, planos de taxas e regras de split"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-xs">
              <Plus className="size-4" />
              <span>Novo EC</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Store className="size-5" />
                </div>
                <DialogTitle>Novo Estabelecimento</DialogTitle>
              </div>
              <DialogDescription>
                Cadastre um novo estabelecimento credenciado para emitir faturas e gerenciar maquininhas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Razão Social / Nome Fantasia *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={200}
                  placeholder="Ex: Padaria Bela Vista Ltda."
                  autoFocus
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">CNPJ / CPF</Label>
                  <Input
                    value={form.document_cnpj}
                    onChange={(e) => setForm({ ...form, document_cnpj: formatCpfCnpj(e.target.value) })}
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">WhatsApp</Label>
                  <Input
                    value={form.phone_whatsapp}
                    onChange={(e) => setForm({ ...form, phone_whatsapp: formatPhone(e.target.value) })}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={200}
                  placeholder="financeiro@empresa.com"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={() => save.mutate()}
                disabled={!form.name.trim() || save.isPending}
              >
                {save.isPending ? "Cadastrando..." : "Cadastrar EC"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] items-start">
        {/* =========================================================================
            COLUNA DA ESQUERDA: CARTEIRA DE ECs COM BUSCA E FILTROS
            ========================================================================= */}
        <Card className="border border-border/80 shadow-card rounded-2xl overflow-hidden bg-card flex flex-col h-[480px] sm:h-[540px] lg:h-[calc(100vh-105px)] lg:sticky lg:top-4">
          <CardHeader className="p-4 pb-3 space-y-3 border-b border-border/60 shrink-0 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <CardTitle className="text-base font-bold">Carteira de ECs</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5">
                {filteredList.length} {filteredList.length === 1 ? "EC" : "ECs"}
              </Badge>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-9 text-xs bg-muted/30 focus-visible:bg-background transition-colors"
              />
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Pílulas de Filtro de Status */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Todos ({list.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Ativos ({list.filter((m) => m.status === "active").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                  statusFilter === "inactive"
                    ? "bg-muted-foreground/30 text-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Inativos ({list.filter((m) => m.status !== "active").length})
              </button>
            </div>
          </CardHeader>

          {/* Lista de Estabelecimentos */}
          <CardContent className="p-2 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
                  <Store className="size-8 opacity-30" />
                  <p className="text-xs font-medium">Nenhum estabelecimento encontrado.</p>
                  {searchTerm && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="h-7 text-xs">
                      Limpar busca
                    </Button>
                  )}
                </div>
              ) : (
                filteredList.map((m) => {
                  const isSelected = selected === m.id;
                  const isActive = m.status === "active";
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setSelected(m.id)}
                      className={`w-full rounded-xl p-3 text-left transition-all duration-150 flex items-center gap-3 relative cursor-pointer border ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                          : "border-transparent hover:border-border/80 hover:bg-muted/40"
                      }`}
                    >
                      {/* Marcador vertical quando selecionado */}
                      {isSelected && (
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full" />
                      )}

                      <div
                        className={`size-10 rounded-xl shrink-0 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <MerchantIcon name={m.name} className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`truncate text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {m.name}
                          </p>
                          <span
                            className={`size-2 rounded-full shrink-0 ${
                              isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                            }`}
                            title={isActive ? "Ativo" : "Inativo"}
                          />
                        </div>
                        <p className="truncate text-xs text-muted-foreground font-mono">
                          {m.document_cnpj || "Sem CNPJ"}
                        </p>
                      </div>

                      <ChevronRight
                        className={`size-4 shrink-0 transition-transform ${
                          isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* =========================================================================
            COLUNA DA DIREITA: DETALHES DO EC SELECIONADO & ABAS
            ========================================================================= */}
        {active ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            key={active.id}
            className="space-y-5"
          >
            {/* Banner de Perfil do Estabelecimento */}
            <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Informações Principais */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="size-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
                    <MerchantIcon name={active.name} className="size-7" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate max-w-xl">
                        {active.name}
                      </h2>
                      {/* Badge Interativa de Status */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleStatus.mutate({
                            id: active.id,
                            newStatus: active.status === "active" ? "inactive" : "active",
                          })
                        }
                        title="Clique para alternar status"
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                          active.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            active.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {active.status === "active" ? "Ativo" : "Inativo"}
                      </button>
                    </div>

                    {/* Chips de Contato e Documento */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {active.document_cnpj ? (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(active.document_cnpj, "CNPJ copiado!")}
                          className="flex items-center gap-1 font-mono hover:text-foreground transition-colors cursor-pointer group"
                          title="Clique para copiar CNPJ"
                        >
                          <Building2 className="size-3.5 text-muted-foreground/70" />
                          <span>{active.document_cnpj}</span>
                          <Copy className="size-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Sem CNPJ cadastrado</span>
                      )}

                      {active.phone_whatsapp && (
                        <a
                          href={`https://wa.me/55${active.phone_whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                          title="Abrir WhatsApp"
                        >
                          <Phone className="size-3.5 text-emerald-600" />
                          <span>{active.phone_whatsapp}</span>
                        </a>
                      )}

                      {active.email && (
                        <a
                          href={`mailto:${active.email}`}
                          className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-xs"
                          title="Enviar e-mail"
                        >
                          <Mail className="size-3.5 text-muted-foreground/70" />
                          <span className="truncate">{active.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toolbar de Ações Rápidas */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                  <WebAccessDialog merchant={active} />
                  <EditMerchantDialog merchant={active} />

                  {/* Confirmação Segura para Excluir */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Remover EC"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <Trash2 className="size-5" /> Excluir estabelecimento?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza de que deseja remover <strong>{active.name}</strong>?
                          Esta ação excluirá o cadastro do estabelecimento e seus vínculos associados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remove.mutate(active.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>

            {/* Abas de Configuração */}
            <Tabs defaultValue="plan" className="space-y-4">
              <TabsList className="h-11 p-1 bg-muted/40 rounded-xl border border-border/60">
                <TabsTrigger
                  value="plan"
                  className="rounded-lg text-xs sm:text-sm font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                >
                  <Percent className="size-4 text-primary" />
                  <span>Plano financeiro</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pos"
                  className="rounded-lg text-xs sm:text-sm font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                >
                  <Smartphone className="size-4 text-blue-500" />
                  <span>Terminais</span>
                  {activeTerminalsCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
                      {activeTerminalsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="split"
                  className="rounded-lg text-xs sm:text-sm font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                >
                  <Users className="size-4 text-violet-500" />
                  <span>Split Asaas</span>
                  {activeSplitsCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
                      {activeSplitsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="rounded-lg text-xs sm:text-sm font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                >
                  <Target className="size-4 text-emerald-500" />
                  <span>Faturamento</span>
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="rounded-lg text-xs sm:text-sm font-semibold gap-2 text-destructive data-[state=active]:text-destructive data-[state=active]:bg-background data-[state=active]:shadow-2xs ml-auto"
                >
                  <Settings2 className="size-4" />
                  <span>Avançado</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plan" className="m-0 focus-visible:outline-none">
                <FeePlanForm merchant={active} />
              </TabsContent>

              <TabsContent value="pos" className="m-0 focus-visible:outline-none">
                <TerminalsPanel merchant={active} />
              </TabsContent>

              <TabsContent value="split" className="m-0 focus-visible:outline-none">
                <SplitPanel merchant={active} />
              </TabsContent>

              <TabsContent value="billing" className="m-0 focus-visible:outline-none">
                <BillingPanel merchant={active} />
              </TabsContent>

              <TabsContent value="advanced" className="m-0 focus-visible:outline-none">
                <AdvancedPanel merchant={active} />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          /* Estado Vazio Quando Nenhum Estabelecimento Está Selecionado */
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
            <Card className="border border-dashed border-border/80 shadow-none rounded-2xl h-full flex items-center justify-center min-h-[460px] bg-muted/10">
              <CardContent className="p-10 text-center flex flex-col items-center justify-center space-y-4 max-w-md">
                <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Store className="size-8 opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">Nenhum estabelecimento selecionado</h3>
                  <p className="text-xs text-muted-foreground">
                    Selecione um estabelecimento na carteira ao lado para configurar taxas, vincular terminais e regras de split, ou cadastre um novo estabelecimento.
                  </p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="size-4" /> Cadastrar Novo EC
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

/* =========================================================================
   FORMULÁRIO DE PLANO FINANCEIRO REFINADO
   ========================================================================= */
const planFields = [
  { key: "fixed_rate_percent", label: "Taxa operacional variável (%)" },
  { key: "pix_rate", label: "Pix (%)" },
  { key: "debit_rate", label: "Débito (%)" },
  { key: "credit_vista_rate", label: "Crédito à vista (%)" },
  { key: "credit_installment_rate", label: "Crédito parcelado (%)" },
] as const;

const DEFAULT_CPAG_INSTALLMENTS: Record<number, number> = {
  1: 3.47,
  2: 5.08,
  3: 5.84,
  4: 6.6,
  5: 7.26,
  6: 8.11,
  7: 9.16,
  8: 9.91,
  9: 10.67,
  10: 11.43,
  11: 12.18,
  12: 12.94,
  13: 13.7,
  14: 14.45,
  15: 15.21,
  16: 15.97,
  17: 16.73,
  18: 17.48,
};

function FeePlanForm({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const plans = useQuery(feePlansQuery);
  const plan = (plans.data ?? []).find((p) => p.merchant_id === merchant.id);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState(false);
  const [installmentRates, setInstallmentRates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (plan && (plan as any).installment_rates && typeof (plan as any).installment_rates === "object") {
      const parsed: Record<string, string> = {};
      Object.entries((plan as any).installment_rates).forEach(([k, v]) => {
        if (!isNaN(Number(k))) {
          parsed[k] = String(v ?? 0);
        }
      });
      setInstallmentRates(parsed);
    } else {
      setInstallmentRates({});
    }
  }, [plan]);

  const values =
    draft ??
    Object.fromEntries(
      planFields.map((f) => [
        f.key,
        String(plan ? ((plan as unknown as Record<string, number>)[f.key] ?? 0) : 0),
      ]),
    );

  const sortedInstallments = useMemo(() => {
    return Object.entries(installmentRates).sort(([a], [b]) => Number(a) - Number(b));
  }, [installmentRates]);

  const installedCount = sortedInstallments.length;

  const addNextInstallment = () => {
    const existingNums = Object.keys(installmentRates).map(Number);
    let nextNum = 1;
    while (existingNums.includes(nextNum)) {
      nextNum++;
    }
    const def = DEFAULT_CPAG_INSTALLMENTS[nextNum] ? String(DEFAULT_CPAG_INSTALLMENTS[nextNum]) : "0";
    setInstallmentRates((prev) => ({ ...prev, [nextNum]: def }));
  };

  const populatePreset = (count: number) => {
    setInstallmentRates((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= count; i++) {
        if (next[i] === undefined) {
          next[i] = String(DEFAULT_CPAG_INSTALLMENTS[i] || 0);
        }
      }
      return next;
    });
  };

  const useCPAGDefaults = () => {
    const next: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      next[i] = String(DEFAULT_CPAG_INSTALLMENTS[i] || 0);
    }
    setInstallmentRates(next);
  };

  const removeInstallment = (num: string) => {
    setInstallmentRates((prev) => {
      const copy = { ...prev };
      delete copy[num];
      return copy;
    });
  };

  const updateInstallment = (num: string, val: string) => {
    setInstallmentRates((prev) => ({ ...prev, [num]: val }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const fixedRate = Number(values.fixed_rate_percent || 0);
      if (fixedRate <= 0) {
        throw new Error("A Taxa Operacional Variável é obrigatória e não pode ficar zerada. Preencha um valor válido (ex: 2%).");
      }

      const currentTargetRevenue = (plan as any)?.installment_rates?.target_revenue;
      const payload = {
        merchant_id: merchant.id,
        fixed_rate_percent: fixedRate,
        pix_rate: Number(values.pix_rate || 0),
        debit_rate: Number(values.debit_rate || 0),
        credit_vista_rate: Number(values.credit_vista_rate || 0),
        credit_installment_rate: Number(values.credit_installment_rate || 0),
        cash_rate: 0,
        installment_rates: {
          ...Object.fromEntries(
            Object.entries(installmentRates).map(([k, v]) => [k, Number(v || 0)]),
          ),
          ...(currentTargetRevenue !== undefined ? { target_revenue: currentTargetRevenue } : {}),
        },
        ...(merchant.company_id ? { company_id: merchant.company_id } : {}),
      };
      const { error } = await supabase.from("fee_plans").upsert(payload, { onConflict: "merchant_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Plano financeiro salvo com sucesso");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["fee_plans"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <>
      <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Percent className="size-5 text-primary" />
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Configuração do Plano Financeiro
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Defina a taxa operacional da plataforma e as taxas por modalidade e parcelamento para {merchant.name}.
              </CardDescription>
            </div>
            {installedCount > 0 && (
              <Badge
                variant="secondary"
                className="font-medium text-xs bg-primary/10 text-primary border-primary/20 shrink-0 self-start sm:self-auto gap-1"
              >
                <Layers className="size-3" />
                <span>{installedCount} {installedCount === 1 ? "parcela customizada" : "parcelas customizadas"}</span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* =========================================================================
              SEÇÃO 1: TAXA OPERACIONAL VARIÁVEL DA PLATAFORMA (DESTAQUE)
              ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-xl">
              <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Percent className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">Taxa Operacional Variável</h4>
                  <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30">
                    Obrigatório
                  </Badge>
                </div>
              </div>
            </div>

            <div className="w-full md:w-48 shrink-0">
              <div className="relative flex items-center">
                <Input
                  id="fixed_rate_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={values.fixed_rate_percent}
                  onChange={(e) => setDraft({ ...values, fixed_rate_percent: e.target.value })}
                  className="h-11 pr-8 font-mono font-bold text-base bg-background shadow-2xs text-right"
                />
                <span className="absolute right-3 text-sm font-bold text-muted-foreground pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SEÇÃO 2: TAXAS POR MODALIDADE DE PAGAMENTO
              ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Taxas por Modalidade de Venda
                </h4>
              </div>
              <span className="text-xs text-muted-foreground">Valores aplicados nas vendas do EC</span>
            </div>

            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* PIX */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-2 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-500" />
                    <Label htmlFor="pix_rate" className="text-xs font-bold text-foreground cursor-pointer">
                      Pix
                    </Label>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Instantâneo</span>
                </div>
                <div className="relative">
                  <Input
                    id="pix_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={values.pix_rate}
                    onChange={(e) => setDraft({ ...values, pix_rate: e.target.value })}
                    className="h-10 pr-7 font-mono font-semibold text-sm bg-background"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* DÉBITO */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-2 hover:border-blue-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-blue-500" />
                    <Label htmlFor="debit_rate" className="text-xs font-bold text-foreground cursor-pointer">
                      Débito
                    </Label>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Cartão à vista</span>
                </div>
                <div className="relative">
                  <Input
                    id="debit_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={values.debit_rate}
                    onChange={(e) => setDraft({ ...values, debit_rate: e.target.value })}
                    className="h-10 pr-7 font-mono font-semibold text-sm bg-background"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* CRÉDITO À VISTA */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-2 hover:border-violet-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-violet-500" />
                    <Label htmlFor="credit_vista_rate" className="text-xs font-bold text-foreground cursor-pointer">
                      Crédito à vista
                    </Label>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">1x</span>
                </div>
                <div className="relative">
                  <Input
                    id="credit_vista_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={values.credit_vista_rate}
                    onChange={(e) => setDraft({ ...values, credit_vista_rate: e.target.value })}
                    className="h-10 pr-7 font-mono font-semibold text-sm bg-background"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* CRÉDITO PARCELADO COM BOTÃO + PARCELAS ACOPLADO */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    <Label htmlFor="credit_installment_rate" className="text-xs font-bold text-foreground cursor-pointer">
                      Crédito parcelado
                    </Label>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Taxa base</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      id="credit_installment_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={values.credit_installment_rate}
                      onChange={(e) => setDraft({ ...values, credit_installment_rate: e.target.value })}
                      className="h-10 pr-7 font-mono font-semibold text-sm bg-background"
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-2.5 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-all shrink-0 flex items-center gap-1 font-semibold text-xs shadow-2xs"
                    onClick={() => setIsInstallmentsModalOpen(true)}
                    title="Adicionar e gerenciar parcelas (1x, 2x, 3x...)"
                  >
                    <Plus className="size-4" />
                    <span>Parcelas</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SEÇÃO 3: PARCELAMENTO PERSONALIZADO (GRID DE CHIPS OU CONVITE)
              ========================================================================= */}
          {installedCount > 0 ? (
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Taxas personalizadas por parcela ({installedCount} definidas):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 font-medium px-2.5"
                    onClick={() => setIsInstallmentsModalOpen(true)}
                  >
                    <Edit2 className="size-3 mr-1" /> Gerenciar Parcelas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium px-2"
                    onClick={() => setInstallmentRates({})}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Grid de Chips de Parcelas */}
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {sortedInstallments.map(([num, rate]) => (
                  <Badge
                    key={num}
                    variant="outline"
                    className="px-2.5 py-1 text-xs font-mono bg-background border flex items-center gap-2 shadow-2xs rounded-lg hover:border-primary/40 transition-colors"
                  >
                    <span className="font-bold text-primary">{num}x:</span>
                    <span className="font-semibold text-foreground">{Number(rate).toFixed(2)}%</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 cursor-pointer p-0.5"
                      onClick={() => removeInstallment(num)}
                      title={`Remover ${num}x`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-border/90 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Deseja taxas diferentes por número de parcelas?</p>
                <p className="text-xs text-muted-foreground">
                  Atualmente todas as parcelas utilizam a taxa base de Crédito Parcelado ({values.credit_installment_rate || "0"}%).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shrink-0 self-start sm:self-auto font-medium text-xs"
                onClick={() => setIsInstallmentsModalOpen(true)}
              >
                <Plus className="size-3.5" />
                Configurar parcelas (1x a 18x)
              </Button>
            </div>
          )}

          {/* =========================================================================
              RODAPÉ DE AÇÕES DO PLANO
              ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="text-xs text-muted-foreground">
              {draft !== null && (
                <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Alterações não salvas
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {draft !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft(null)}
                  disabled={save.isPending}
                  className="text-xs text-muted-foreground"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Descartar
                </Button>
              )}
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="gap-2 shadow-xs px-5"
              >
                <Save className="size-4" />
                <span>{save.isPending ? "Salvando plano..." : "Salvar Plano Financeiro"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          MODAL DE GERENCIAMENTO DE PARCELAS (1x, 2x, 3x...)
          ========================================================================= */}
      <Dialog open={isInstallmentsModalOpen} onOpenChange={setIsInstallmentsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Percent className="size-5" />
              </div>
              <DialogTitle className="text-lg">Configurar Taxas por Parcela (Crédito)</DialogTitle>
            </div>
            <DialogDescription>
              Insira a taxa negociada para cada número de parcelas (1x, 2x, 3x...) de <strong>{merchant.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Barra de Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2 py-2.5 border-b border-border/60 bg-muted/20 px-4 -mx-6 rounded-none">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Ações rápidas:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={addNextInstallment}
            >
              <Plus className="size-3 mr-1 text-primary" /> Adicionar Parcela
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={() => populatePreset(12)}
            >
              Preencher 1x a 12x
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={() => populatePreset(18)}
            >
              Preencher 1x a 18x
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-medium text-primary hover:bg-primary/10"
              onClick={useCPAGDefaults}
              title="Preencher com taxas de referência do modelo padrão CPAG"
            >
              Sugerir padrão
            </Button>
            {installedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium text-destructive hover:bg-destructive/10 ml-auto"
                onClick={() => setInstallmentRates({})}
              >
                Limpar todas
              </Button>
            )}
          </div>

          {/* Grid de parcelas rolável */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-thin">
            {installedCount === 0 ? (
              <div className="p-10 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10 space-y-2">
                <p className="text-sm font-semibold text-foreground">Nenhuma parcela personalizada adicionada ainda.</p>
                <p className="text-xs text-muted-foreground">
                  Clique em <strong>+ Adicionar Parcela</strong> ou <strong>Preencher 1x a 12x</strong> para começar.
                </p>
                <div className="pt-2">
                  <Button size="sm" onClick={() => populatePreset(12)} className="text-xs gap-1.5">
                    <Plus className="size-3.5" /> Começar com 1x a 12x
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sortedInstallments.map(([num, rate]) => (
                  <div
                    key={num}
                    className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="px-2 py-0.5 text-xs font-bold text-primary bg-primary/10 border-none"
                      >
                        {num}x
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeInstallment(num)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-sm transition-colors cursor-pointer"
                        title={`Remover ${num}x`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={rate}
                        onChange={(e) => updateInstallment(num, e.target.value)}
                        className="h-8 text-sm pr-6 font-mono font-medium text-right"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-semibold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 flex flex-row items-center justify-between sm:justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {installedCount} {installedCount === 1 ? "parcela definida" : "parcelas definidas"}
            </span>
            <Button type="button" onClick={() => setIsInstallmentsModalOpen(false)}>
              Confirmar e Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* =========================================================================
   PAINEL DE TERMINAIS (POS) REFINADO
   ========================================================================= */
function TerminalsPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const terminals = useQuery(terminalsQuery);
  const [serial, setSerial] = useState("");
  const [model, setModel] = useState("");

  const list = (terminals.data ?? []).filter((t) => t.merchant_id === merchant.id);

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pos_terminals")
        .insert({ merchant_id: merchant.id, serial_number: serial.trim(), model: model.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Terminal vinculado com sucesso");
      setSerial("");
      setModel("");
      qc.invalidateQueries({ queryKey: ["pos_terminals"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_terminals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Terminal desvinculado");
      qc.invalidateQueries({ queryKey: ["pos_terminals"] });
    },
  });

  return (
    <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Smartphone className="size-5 text-blue-500" />
              <CardTitle className="text-base sm:text-lg font-bold">Maquininhas Vinculadas</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Vincule equipamentos POS por número serial para conciliação automática das vendas.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {list.length} {list.length === 1 ? "maquininha" : "maquininhas"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Banner Informativo sobre a Regra de Isenção por Faturamento */}
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2.5">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sparkles className="size-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Regra de Isenção de Maquininhas por Faturamento
            </h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cada maquininha cadastrada tem o valor fixo de <strong className="text-foreground font-semibold">R$ 100,00/mês</strong>.
            Ao atingir as metas de faturamento mensal do estabelecimento, o cliente conquista isenção automática:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-border/60">
              <Badge variant="outline" className="font-mono text-[10px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10 shrink-0">
                1ª Máquina
              </Badge>
              <span className="text-muted-foreground">
                Isenção total a partir de <strong className="text-foreground">R$ 50.000,00</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-border/60">
              <Badge variant="outline" className="font-mono text-[10px] font-bold border-blue-500/30 text-blue-600 bg-blue-500/10 shrink-0">
                +1 Máquina
              </Badge>
              <span className="text-muted-foreground">
                A cada <strong className="text-foreground">+R$ 30.000,00</strong> adicionais faturados
              </span>
            </div>
          </div>
        </div>

        {/* Formulário de Adição de Terminal */}
        <div className="p-4 rounded-xl border border-border/80 bg-muted/15 space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Vincular Novo Terminal POS
          </h4>
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número Serial *</Label>
              <Input
                placeholder="Ex: 9876543210"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                maxLength={60}
                className="font-mono bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Modelo (Opcional)</Label>
              <Input
                placeholder="Ex: PAX D195 / Sunmi V2"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                maxLength={60}
                className="bg-background"
              />
            </div>
            <Button
              onClick={() => add.mutate()}
              disabled={!serial.trim() || add.isPending}
              className="gap-1.5 shadow-2xs"
            >
              <Plus className="size-4" />
              <span>{add.isPending ? "Vinculando..." : "Vincular"}</span>
            </Button>
          </div>
        </div>

        {/* Lista de Terminais */}
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10 space-y-2">
              <Smartphone className="size-8 mx-auto opacity-30 text-blue-500" />
              <p className="text-sm font-semibold text-foreground">Nenhuma maquininha vinculada a este EC.</p>
              <p className="text-xs text-muted-foreground">
                Informe o número de série da máquina POS acima para vincular.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-background">
              {list.map((t, idx) => {
                const requiredGross = TERMINAL_FIRST_TIER + idx * TERMINAL_STEP_TIER;
                return (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-muted/30 transition-colors gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Smartphone className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono font-bold text-sm text-foreground">{t.serial_number}</p>
                          <Badge variant="secondary" className="font-mono text-[10px] font-semibold text-primary bg-primary/10">
                            {idx === 0 ? "1ª Máquina" : `${idx + 1}ª Máquina`}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                            Isenção em {BRL(requiredGross)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.model ? `Modelo: ${t.model}` : "Modelo não especificado"} • Custo: R$ 100,00/mês
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-auto"
                          title="Desvincular terminal"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desvincular Terminal?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja desvincular a maquininha serial <strong>{t.serial_number}</strong> deste estabelecimento?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove.mutate(t.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sim, desvincular
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================================
   PAINEL DE FATURAMENTO & METAS DO EC (ABA DEDICADA)
   ========================================================================= */
function BillingPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const txQuery = useQuery(transactionsQuery);
  const plans = useQuery(feePlansQuery);

  const plan = (plans.data ?? []).find((p) => p.merchant_id === merchant.id);

  // Transações vinculadas a este estabelecimento
  const merchantTxs = useMemo(() => {
    return (txQuery.data ?? []).filter((t) => t.merchant_id === merchant.id);
  }, [txQuery.data, merchant.id]);

  // Meses com movimentação deste EC
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    merchantTxs.forEach((t) => {
      if (t.transaction_date) {
        set.add(t.transaction_date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [merchantTxs]);

  const curMonth = currentMonth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("auto");

  const effectivePeriod = useMemo(() => {
    if (selectedPeriod !== "auto") return selectedPeriod;
    if (availableMonths.includes(curMonth)) return curMonth;
    if (availableMonths.length > 0) return availableMonths[0];
    return curMonth;
  }, [selectedPeriod, availableMonths, curMonth]);

  const filteredTxs = useMemo(() => {
    if (effectivePeriod === "all") return merchantTxs;
    return merchantTxs.filter((t) => (t.transaction_date || "").slice(0, 7) === effectivePeriod);
  }, [merchantTxs, effectivePeriod]);

  // Faturamento atingido bruto
  const actualRevenue = useMemo(() => {
    return filteredTxs.reduce((sum, t) => sum + (Number(t.gross_amount) || 0), 0);
  }, [filteredTxs]);

  // Meta de Faturamento do EC (salva em fee_plans.installment_rates.target_revenue e em localStorage)
  const savedTargetRevenue = useMemo(() => {
    if (plan && (plan as any).installment_rates && typeof (plan as any).installment_rates === "object") {
      const val = (plan as any).installment_rates.target_revenue;
      if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) {
        return Number(val);
      }
    }
    if (typeof window !== "undefined") {
      const local = localStorage.getItem(`merchant_target_revenue_${merchant.id}`);
      if (local && !isNaN(Number(local)) && Number(local) > 0) {
        return Number(local);
      }
    }
    return 0;
  }, [plan, merchant.id]);

  const [targetInput, setTargetInput] = useState<string>("");

  useEffect(() => {
    if (savedTargetRevenue > 0) {
      setTargetInput(formatCurrencyInput(String(Math.round(savedTargetRevenue * 100))));
    } else {
      setTargetInput("");
    }
  }, [savedTargetRevenue]);

  const saveTarget = useMutation({
    mutationFn: async (numericTarget: number) => {
      const existingRates =
        plan?.installment_rates && typeof plan.installment_rates === "object"
          ? { ...(plan.installment_rates as Record<string, any>) }
          : {};

      existingRates.target_revenue = numericTarget;

      const payload = {
        merchant_id: merchant.id,
        fixed_rate_percent: plan?.fixed_rate_percent ?? 2.0,
        pix_rate: plan?.pix_rate ?? 0,
        debit_rate: plan?.debit_rate ?? 0,
        credit_vista_rate: plan?.credit_vista_rate ?? 0,
        credit_installment_rate: plan?.credit_installment_rate ?? 0,
        cash_rate: 0,
        installment_rates: existingRates,
        ...(merchant.company_id ? { company_id: merchant.company_id } : {}),
      };

      const { error } = await supabase.from("fee_plans").upsert(payload, { onConflict: "merchant_id" });
      if (error) throw new Error(error.message);

      if (typeof window !== "undefined") {
        localStorage.setItem(`merchant_target_revenue_${merchant.id}`, String(numericTarget));
      }
    },
    onSuccess: () => {
      toast.success("Meta de faturamento do EC atualizada com sucesso!");
      qc.invalidateQueries({ queryKey: ["fee_plans"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar meta: " + translateError(e.message)),
  });

  const progress = savedTargetRevenue > 0 ? (actualRevenue / savedTargetRevenue) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isGoalReached = savedTargetRevenue > 0 && actualRevenue >= savedTargetRevenue;
  const diffRemaining = savedTargetRevenue > actualRevenue ? savedTargetRevenue - actualRevenue : 0;
  const diffSurplus = actualRevenue > savedTargetRevenue ? actualRevenue - savedTargetRevenue : 0;

  return (
    <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Target className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Faturamento & Meta de Vendas
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Acompanhe o faturamento realizado e configure a meta de faturamento mensal de {merchant.name}.
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Seletor de Período para o Faturamento */}
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs font-semibold text-muted-foreground">Período:</Label>
            <select
              value={effectivePeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value={curMonth}>Mês Atual ({monthLabel(curMonth)})</option>
              {availableMonths
                .filter((m) => m !== curMonth)
                .map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              <option value="all">Total Acumulado (Todas as vendas)</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Faturamento Atingido */}
          <div className="p-4 rounded-xl border border-border/70 bg-gradient-to-br from-emerald-500/[0.04] to-transparent relative overflow-hidden space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Faturamento Atingido
              </span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">
                {BRL(actualRevenue)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {filteredTxs.length} {filteredTxs.length === 1 ? "venda registrada" : "vendas registradas"} no período
              </p>
            </div>
          </div>

          {/* Card 2: Meta Estabelecida */}
          <div className="p-4 rounded-xl border border-border/70 bg-gradient-to-br from-blue-500/[0.04] to-transparent relative overflow-hidden space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Meta Estabelecida
              </span>
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Target className="size-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">
                {savedTargetRevenue > 0 ? BRL(savedTargetRevenue) : "Não definida"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {savedTargetRevenue > 0 ? "Objetivo de faturamento mensal" : "Defina a meta no formulário abaixo"}
              </p>
            </div>
          </div>

          {/* Card 3: Saldo / Desempenho */}
          <div className="p-4 rounded-xl border border-border/70 bg-gradient-to-br from-violet-500/[0.04] to-transparent relative overflow-hidden space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isGoalReached ? "Meta Superada" : "Saldo Restante"}
              </span>
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center",
                  isGoalReached
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                )}
              >
                {isGoalReached ? <Trophy className="size-4" /> : <BarChart3 className="size-4" />}
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">
                {savedTargetRevenue > 0
                  ? isGoalReached
                    ? `+${BRL(diffSurplus)}`
                    : BRL(diffRemaining)
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {savedTargetRevenue > 0
                  ? isGoalReached
                    ? "Objetivo atingido com sucesso! 🏆"
                    : `Faltam ${(100 - progress).toFixed(1)}% para bater a meta`
                  : "Aguardando definição da meta"}
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO VISUAL PREMIUM */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/80 bg-muted/20 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-foreground font-mono">
                  {progress.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground font-medium">da meta atingida</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {savedTargetRevenue > 0
                  ? `${BRL(actualRevenue)} de ${BRL(savedTargetRevenue)}`
                  : "Configure a meta para visualizar a proporção atingida."}
              </p>
            </div>

            {savedTargetRevenue > 0 ? (
              isGoalReached ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3 py-1 text-xs shadow-xs font-bold">
                  <Trophy className="size-3.5" />
                  <span>Meta Batida! (+{BRL(diffSurplus)})</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-semibold px-2.5 py-1"
                >
                  Faltam {BRL(diffRemaining)} ({(100 - progress).toFixed(1)}%)
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground border-border bg-background">
                Meta não configurada
              </Badge>
            )}
          </div>

          {/* Barra de Progresso com Cores Sólidas */}
          <div className="relative w-full h-4 bg-muted/80 dark:bg-muted/50 rounded-full border border-border/80 overflow-hidden">
            {/* Linhas de Marcação discretas em 25%, 50%, 75% */}
            <div className="absolute inset-0 pointer-events-none z-10 flex">
              <div className="absolute left-1/4 top-0 bottom-0 w-px bg-border/60" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60" />
              <div className="absolute left-3/4 top-0 bottom-0 w-px bg-border/60" />
            </div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full transition-all",
                isGoalReached
                  ? "bg-emerald-500"
                  : "bg-primary",
              )}
            />
          </div>

          {/* Legenda de Escala da Barra */}
          <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono px-0.5">
            <span>R$ 0,00 (0%)</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span className="font-bold text-foreground">
              {savedTargetRevenue > 0 ? BRL(savedTargetRevenue) : "Meta"} (100%)
            </span>
          </div>
        </div>

        {/* FORMULÁRIO DE CONFIGURAÇÃO DA META */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/80 bg-muted/15 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="size-3.5 text-blue-500" />
                Configurar Meta de Faturamento do EC
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina o objetivo financeiro de vendas deste estabelecimento para cálculo da barra de progresso.
              </p>
            </div>
            {savedTargetRevenue > 0 && (
              <Badge
                variant="outline"
                className="w-fit text-[11px] font-mono border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10"
              >
                Meta Ativa: {BRL(savedTargetRevenue)}
              </Badge>
            )}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor da Meta (R$) *</Label>
              <Input
                placeholder="R$ 50.000,00"
                value={targetInput}
                onChange={(e) => setTargetInput(formatCurrencyInput(e.target.value))}
                maxLength={20}
                className="font-mono text-base font-bold bg-background"
              />
            </div>
            <Button
              onClick={() => {
                const num = Number(targetInput.replace(/\D/g, "")) / 100;
                if (num <= 0) {
                  toast.error("Informe um valor de meta maior que R$ 0,00.");
                  return;
                }
                saveTarget.mutate(num);
              }}
              disabled={saveTarget.isPending}
              className="gap-2 shadow-2xs h-10 px-5"
            >
              <Save className="size-4" />
              <span>{saveTarget.isPending ? "Salvando..." : "Salvar Meta"}</span>
            </Button>
          </div>

          {/* Presets Rápidos de 1 Clique */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground font-medium">
              Atalhos de valores rápidos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[20000, 50000, 100000, 200000, 500000].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTargetInput(formatCurrencyInput(String(preset * 100)))}
                  className="h-7 text-xs font-mono font-semibold px-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                >
                  {BRL(preset)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <span className="flex items-center gap-1.5">
            <Target className="size-3.5 text-primary" />
            <span>
              Acompanhamento de vendas e meta mensal calculado a partir das transações deste EC
            </span>
          </span>
          <span className="font-mono text-[11px]">
            {filteredTxs.length} {filteredTxs.length === 1 ? "venda registrada" : "vendas registradas"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================================
   PAINEL DE SPLIT ASAAS (PARCEIROS) REFINADO
   ========================================================================= */
function SplitPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const splits = useQuery(splitRulesQuery);
  const fetchPartners = useServerFn(getPartners);
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [partnerId, setPartnerId] = useState("");
  const [percentage, setPercentage] = useState("");

  const list = (splits.data ?? []).filter((s) => s.merchant_id === merchant.id);

  const totalPercentage = list.reduce((acc, s) => acc + Number(s.percentage || 0), 0);

  const add = useMutation({
    mutationFn: async () => {
      const selectedPartner = partners.find((p) => p.id === partnerId);
      if (!selectedPartner) throw new Error("Selecione um parceiro");

      const { error } = await supabase.from("split_rules").insert({
        merchant_id: merchant.id,
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        partner_asaas_wallet_id: selectedPartner.asaas_wallet_id,
        percentage: Number(percentage || 0),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Regra de split criada com sucesso");
      setPartnerId("");
      setPercentage("");
      qc.invalidateQueries({ queryKey: ["split_rules"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("split_rules").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Regra de split removida");
      qc.invalidateQueries({ queryKey: ["split_rules"] });
    },
  });

  return (
    <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-violet-500" />
              <CardTitle className="text-base sm:text-lg font-bold">Split de Pagamento (Parceiros)</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Configure comissões automáticas para parceiros cadastrados via conta Asaas.
            </CardDescription>
          </div>
          {list.length > 0 && (
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                totalPercentage > 100
                  ? "border-destructive text-destructive"
                  : "border-violet-500/30 text-violet-600 bg-violet-500/10"
              }`}
            >
              Total: {totalPercentage.toFixed(2)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Formulário de Adição de Regra */}
        <div className="p-4 rounded-xl border border-border/80 bg-muted/15 space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Adicionar Regra de Split
          </h4>
          <div className="grid sm:grid-cols-[1fr_120px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Parceiro Cadastrado *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
              >
                <option value="">Selecione um parceiro...</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.asaas_wallet_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Comissão (%) *</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0,00"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="pr-6 font-mono bg-background"
                />
                <span className="absolute right-2 top-2 text-xs font-bold text-muted-foreground">%</span>
              </div>
            </div>
            <Button
              onClick={() => add.mutate()}
              disabled={!partnerId || !percentage || add.isPending}
              className="gap-1.5 shadow-2xs"
            >
              <Plus className="size-4" />
              <span>{add.isPending ? "Adicionando..." : "Adicionar"}</span>
            </Button>
          </div>
        </div>

        {/* Lista de Parceiros Configurados */}
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10 space-y-2">
              <Users className="size-8 mx-auto opacity-30 text-violet-500" />
              <p className="text-sm font-semibold text-foreground">Nenhuma regra de split configurada para este EC.</p>
              <p className="text-xs text-muted-foreground">
                Selecione um parceiro cadastrado acima para definir o percentual de comissionamento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-background">
              {list.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{s.partner_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        Wallet Asaas: {s.partner_asaas_wallet_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono font-semibold text-xs px-2.5 py-1">
                      {PCT(Number(s.percentage))}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remover regra de split"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Regra de Split?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja remover a comissão de <strong>{s.percentage}%</strong> para{" "}
                            <strong>{s.partner_name}</strong>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove.mutate(s.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sim, remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================================
   DIÁLOGO DE CRIAÇÃO DE SUBCONTA ASAAS
   ========================================================================= */
function CreateAsaasSubaccountDialog({ onCreated }: { onCreated: (walletId: string) => void }) {
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    cpfCnpj: "",
    companyType: "LIMITED",
    mobilePhone: "",
    incomeValue: "",
    address: "",
    addressNumber: "",
    province: "",
    postalCode: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const parsedIncome = Number(form.incomeValue.replace(/\D/g, "")) / 100;
      const res = await createAsaasSubaccount({
        data: { ...form, companyId: companyId!, incomeValue: parsedIncome },
      });
      if (!res.ok) throw new Error(res.error);
      return res.walletId;
    },
    onSuccess: (walletId) => {
      toast.success("Subconta criada no Asaas com sucesso!");
      onCreated(walletId);
      setOpen(false);
      setForm({
        name: "",
        email: "",
        cpfCnpj: "",
        companyType: "LIMITED",
        mobilePhone: "",
        incomeValue: "",
        address: "",
        addressNumber: "",
        province: "",
        postalCode: "",
      });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button" className="h-6 px-2 text-xs">
          Criar nova
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Criar Subconta Asaas (BaaS)</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Abertura de conta de pagamento regulada operada pelo Asaas Gestão Financeira IP S.A.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Nome / Razão Social</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">CPF / CNPJ</Label>
              <Input
                value={form.cpfCnpj}
                onChange={(e) => setForm({ ...form, cpfCnpj: formatCpfCnpj(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Tipo de Empresa</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.companyType}
                onChange={(e) => setForm({ ...form, companyType: e.target.value })}
              >
                <option value="MEI">MEI</option>
                <option value="LIMITED">Limitada (LTDA)</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ASSOCIATION">Associação</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">E-mail (Login e Comunicação)</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Celular</Label>
              <Input
                value={form.mobilePhone}
                onChange={(e) => setForm({ ...form, mobilePhone: formatPhone(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Faturamento Mensal</Label>
              <Input
                type="text"
                value={form.incomeValue}
                onChange={(e) => setForm({ ...form, incomeValue: formatCurrencyInput(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">CEP</Label>
              <Input
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                onBlur={async () => {
                  const data = await fetchCepData(form.postalCode);
                  if (data) {
                    setForm((prev) => ({
                      ...prev,
                      address: data.logradouro || prev.address,
                      province: data.bairro || prev.province,
                    }));
                  }
                }}
                maxLength={9}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Endereço (Rua, Av)</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Número</Label>
              <Input
                value={form.addressNumber}
                onChange={(e) => setForm({ ...form, addressNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Bairro</Label>
              <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3 pt-3 border-t border-border/60">
          <AsaasModalSeal variant="auto" />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.cpfCnpj}>
              {create.isPending ? "Criando..." : "Criar Subconta"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

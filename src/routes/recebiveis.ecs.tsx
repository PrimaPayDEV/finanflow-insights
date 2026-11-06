import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Plus,
  Search,
  KeyRound,
  CreditCard,
  DollarSign,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRL } from "@/lib/format";
import { toast } from "sonner";
import { translateError } from "@/lib/translateError";
import { createMerchantAccess } from "@/lib/merchant.functions";

export const Route = createFileRoute("/recebiveis/ecs")({
  head: () => ({
    meta: [{ title: "Carteira de ECs | Gestor de Recebíveis" }],
  }),
  component: RecebiveisEcsPage,
});

function RecebiveisEcsPage() {
  const { companyId, user, role, companyName } = useAuth();
  const qc = useQueryClient();

  const isAdmin = Boolean(
    user?.email?.toLowerCase() === "financeiro@primapay.com.br" ||
    user?.email?.toLowerCase() === "contato@primapay.com.br" ||
    role === "admin" ||
    companyName === "Prima Hub" ||
    companyName === "PrimaPay"
  );

  const [searchTerm, setSearchTerm] = useState("");

  // Modais
  const [newEcOpen, setNewEcOpen] = useState(false);
  const [linkPosOpen, setLinkPosOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);

  // Form Novo EC
  const [ecName, setEcName] = useState("");
  const [ecDocument, setEcDocument] = useState("");
  const [ecEmail, setEcEmail] = useState("");
  const [ecPhone, setEcPhone] = useState("");

  // Form Vincular POS
  const [posSerial, setPosSerial] = useState("");
  const [posModel, setPosModel] = useState("Pax D195");

  // Form Acesso Web
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");

  // 1. Busca estabelecimentos
  const merchantsQuery = useQuery({
    queryKey: ["merchants_recebiveis_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("in_recebiveis", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Busca terminais POS
  const terminalsQuery = useQuery({
    queryKey: ["pos_terminals_recebiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_terminals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Busca Ledgers para calcular saldo de cada EC
  const ledgersQuery = useQuery({
    queryKey: ["receivables_ledgers_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables_ledgers")
        .select("merchant_id, type, amount, status");
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Busca solicitações para deduzir pendentes
  const requestsQuery = useQuery({
    queryKey: ["receivables_requests_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables_requests")
        .select("merchant_id, amount, status");
      if (error) throw error;
      return data || [];
    },
  });

  // Mapa de Terminais por EC
  const terminalsByMerchant = useMemo(() => {
    const map = new Map<string, any[]>();
    (terminalsQuery.data || []).forEach((t) => {
      const arr = map.get(t.merchant_id) || [];
      arr.push(t);
      map.set(t.merchant_id, arr);
    });
    return map;
  }, [terminalsQuery.data]);

  // Mapa de Saldo Disponível por EC
  const balancesByMerchant = useMemo(() => {
    const creditsMap = new Map<string, number>();
    const debitsMap = new Map<string, number>();
    const pendingMap = new Map<string, number>();

    (ledgersQuery.data || []).forEach((l) => {
      if (l.type === "CREDIT" && l.status === "LIQUIDATED") {
        creditsMap.set(l.merchant_id, (creditsMap.get(l.merchant_id) || 0) + Number(l.amount));
      } else if ((l.type === "DEBIT" || l.type === "EXPENSE") && l.status === "LIQUIDATED") {
        debitsMap.set(l.merchant_id, (debitsMap.get(l.merchant_id) || 0) + Number(l.amount));
      }
    });

    (requestsQuery.data || []).forEach((r) => {
      if (r.status === "PENDING" || r.status === "REQUESTED") {
        pendingMap.set(r.merchant_id, (pendingMap.get(r.merchant_id) || 0) + Number(r.amount));
      }
    });

    const resultMap = new Map<string, { available: number; totalCredits: number; totalDebits: number; pending: number }>();

    (merchantsQuery.data || []).forEach((m) => {
      const cr = creditsMap.get(m.id) || 0;
      const db = debitsMap.get(m.id) || 0;
      const pd = pendingMap.get(m.id) || 0;
      const net = cr - db;
      resultMap.set(m.id, {
        available: Math.max(0, net - pd),
        totalCredits: cr,
        totalDebits: db,
        pending: pd,
      });
    });

    return resultMap;
  }, [ledgersQuery.data, requestsQuery.data, merchantsQuery.data]);

  // Filtro de Busca
  const filteredMerchants = useMemo(() => {
    const list = merchantsQuery.data || [];
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const doc = (m.document_cnpj || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const phone = (m.phone_whatsapp || "").toLowerCase();

      // Busca também pelo serial das POS vinculadas
      const terminals = terminalsByMerchant.get(m.id) || [];
      const hasSerial = terminals.some((t) => (t.serial_number || "").toLowerCase().includes(q));

      return name.includes(q) || doc.includes(q) || email.includes(q) || phone.includes(q) || hasSerial;
    });
  }, [merchantsQuery.data, searchTerm, terminalsByMerchant]);

  // 1. Mutação: Cadastrar Novo EC
  const createEcMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não selecionada.");
      if (!ecName.trim()) throw new Error("Nome do EC é obrigatório.");

      const payload = {
        company_id: companyId,
        name: ecName.trim(),
        document_cnpj: ecDocument.trim(),
        email: ecEmail.trim(),
        phone_whatsapp: ecPhone.trim(),
        status: "active" as const,
        in_recebiveis: true,
      };

      const { data, error } = await supabase.from("merchants").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Estabelecimento Comercial cadastrado com sucesso!");
      setNewEcOpen(false);
      setEcName("");
      setEcDocument("");
      setEcEmail("");
      setEcPhone("");
      qc.invalidateQueries({ queryKey: ["merchants_recebiveis_list"] });
    },
    onError: (err: any) => toast.error(translateError(err.message)),
  });

  // 2. Mutação: Vincular POS ao EC
  const linkPosMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMerchant) throw new Error("EC não selecionado.");
      if (!posSerial.trim()) throw new Error("Número de Série (Serial) é obrigatório.");

      // Limpar serial
      const cleanSerial = posSerial.trim();

      const { data, error } = await supabase
        .from("pos_terminals")
        .insert({
          merchant_id: selectedMerchant.id,
          serial_number: cleanSerial,
          model: posModel.trim() || "POS",
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Maquininha POS vinculada com sucesso! As vendas importadas com este serial serão creditadas para este EC.");
      setLinkPosOpen(false);
      setPosSerial("");
      setSelectedMerchant(null);
      qc.invalidateQueries({ queryKey: ["pos_terminals_recebiveis"] });
    },
    onError: (err: any) => toast.error(translateError(err.message)),
  });

  // 3. Mutação: Gerar Acesso Web para o EC
  const createAccessMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedMerchant) throw new Error("Dados inválidos.");
      if (!accessEmail.trim() || !accessPassword.trim()) throw new Error("E-mail e senha são obrigatórios.");

      return await createMerchantAccess({
        data: {
          companyId,
          merchantId: selectedMerchant.id,
          email: accessEmail.trim(),
          password: accessPassword.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success(`Acesso gerado com sucesso para ${selectedMerchant?.name}! O EC pode entrar em /recebiveis.`);
      setAccessModalOpen(false);
      setAccessEmail("");
      setAccessPassword("");
      setSelectedMerchant(null);
    },
    onError: (err: any) => toast.error(translateError(err.message)),
  });

  return (
    <AppLayout
      title="Carteira de Estabelecimentos (ECs)"
      subtitle="Gerencie os ECs ativos provisoriamente, maquininhas vinculadas e acessos ao portal de recebíveis"
      actions={
        <Button
          onClick={() => setNewEcOpen(true)}
          className="rounded-xl font-bold text-xs gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-500/20"
        >
          <Plus className="size-4" />
          <span>Novo Estabelecimento</span>
        </Button>
      }
    >
      {/* Busca */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card mb-6">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do EC, CNPJ, e-mail, telefone ou serial da maquininha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-background"
            />
          </div>
          <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {filteredMerchants.length} EC(s) encontrado(s)
          </div>
        </CardContent>
      </Card>

      {/* Tabela de ECs */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                  Estabelecimento
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                  Contato
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                  Maquininhas (Seriais)
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5 text-right">
                  Saldo Disponível
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5 text-right">
                  Ações Gerenciais
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Store className="size-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground text-sm">Nenhum EC cadastrado</p>
                      <p className="text-xs text-muted-foreground">
                        Clique em "Novo Estabelecimento" para cadastrar um EC e vincular a maquininha.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMerchants.map((m) => {
                  const terminals = terminalsByMerchant.get(m.id) || [];
                  const balance = balancesByMerchant.get(m.id) || { available: 0 };

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-medium">
                        <div className="font-bold text-foreground text-sm">{m.name}</div>
                        {m.document_cnpj && (
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {m.document_cnpj}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <div>{m.email || "—"}</div>
                        <div className="text-[11px]">{m.phone_whatsapp || "—"}</div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {terminals.length === 0 ? (
                          <span className="text-muted-foreground text-[11px] italic">Nenhuma POS vinculada</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {terminals.map((t) => (
                              <Badge
                                key={t.id}
                                variant="outline"
                                className="font-mono text-[10px] gap-1 bg-muted/40 border-border/80"
                                title={`Modelo: ${t.model || "POS"}`}
                              >
                                <Smartphone className="size-2.5 text-blue-600" />
                                <span>{t.serial_number}</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-black font-mono text-right whitespace-nowrap text-blue-600 dark:text-blue-400">
                        {BRL(balance.available)}
                      </TableCell>

                      <TableCell className="text-xs text-center whitespace-nowrap">
                        <Badge
                          className={
                            m.status === "active"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {m.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl font-semibold text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                            onClick={() => {
                              setSelectedMerchant(m);
                              setPosSerial("");
                              setLinkPosOpen(true);
                            }}
                            title="Vincular serial de maquininha a este EC"
                          >
                            <Smartphone className="size-3.5" />
                            <span>Vincular POS</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl font-semibold text-xs gap-1 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
                            onClick={() => {
                              setSelectedMerchant(m);
                              setAccessEmail(m.email || "");
                              setAccessPassword("");
                              setAccessModalOpen(true);
                            }}
                            title="Criar ou alterar usuário e senha de acesso web do EC"
                          >
                            <KeyRound className="size-3.5" />
                            <span>Acesso Web</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal 1: Novo EC */}
      <Dialog open={newEcOpen} onOpenChange={setNewEcOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Store className="size-5 text-blue-600" />
              <span>Cadastrar Estabelecimento Comercial</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre o EC que utilizará provisoriamente a maquininha ativa durante a análise.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="ecName" className="text-xs font-semibold">
                Razão Social / Nome Fantasia *
              </Label>
              <Input
                id="ecName"
                placeholder="Ex: Restaurante e Padaria Central LTDA"
                value={ecName}
                onChange={(e) => setEcName(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ecDoc" className="text-xs font-semibold">
                CNPJ ou CPF
              </Label>
              <Input
                id="ecDoc"
                placeholder="00.000.000/0001-00"
                value={ecDocument}
                onChange={(e) => setEcDocument(e.target.value)}
                className="h-10 rounded-xl font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="ecEmail" className="text-xs font-semibold">
                  E-mail de Contato
                </Label>
                <Input
                  id="ecEmail"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={ecEmail}
                  onChange={(e) => setEcEmail(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ecPhone" className="text-xs font-semibold">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="ecPhone"
                  placeholder="(00) 00000-0000"
                  value={ecPhone}
                  onChange={(e) => setEcPhone(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewEcOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => createEcMutation.mutate()}
              disabled={createEcMutation.isPending}
              className="rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md hover:from-blue-500 hover:to-cyan-500"
            >
              {createEcMutation.isPending ? "Cadastrando..." : "Salvar EC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Vincular Maquininha POS */}
      <Dialog open={linkPosOpen} onOpenChange={setLinkPosOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Smartphone className="size-5 text-blue-600" />
              <span>Vincular Maquininha POS ao EC</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Vincule o número de série da maquininha entregue ao EC{" "}
              <strong className="text-foreground">{selectedMerchant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="posSerial" className="text-xs font-semibold">
                Número de Série (Serial / SN Equipamento) *
              </Label>
              <Input
                id="posSerial"
                placeholder="Ex: 18400039201"
                value={posSerial}
                onChange={(e) => setPosSerial(e.target.value)}
                className="h-10 rounded-xl font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Este serial deve coincidir com a coluna da planilha de vendas do POS para o crédito automático.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="posModel" className="text-xs font-semibold">
                Modelo da Maquininha
              </Label>
              <Input
                id="posModel"
                placeholder="Ex: Pax D195, Smart POS, Sunmi..."
                value={posModel}
                onChange={(e) => setPosModel(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkPosOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => linkPosMutation.mutate()}
              disabled={linkPosMutation.isPending}
              className="rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md"
            >
              {linkPosMutation.isPending ? "Vinculando..." : "Vincular Maquininha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Gerar Acesso Web */}
      <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="size-5 text-purple-600" />
              <span>Gerar Acesso ao Portal para o EC</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina as credenciais para o EC{" "}
              <strong className="text-foreground">{selectedMerchant?.name}</strong> acessar o ambiente Gestor de Recebíveis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="accessEmail" className="text-xs font-semibold">
                E-mail de Login *
              </Label>
              <Input
                id="accessEmail"
                type="email"
                placeholder="email@empresa.com.br"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accessPassword" className="text-xs font-semibold">
                Senha de Acesso *
              </Label>
              <Input
                id="accessPassword"
                type="password"
                placeholder="Mínimo 6 caracteres..."
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] leading-relaxed">
              O cliente acessará pelo endereço do Hub clicando em <strong>Gestor de Recebíveis</strong> ou diretamente por <strong>/recebiveis</strong>.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccessModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => createAccessMutation.mutate()}
              disabled={createAccessMutation.isPending}
              className="rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-md"
            >
              {createAccessMutation.isPending ? "Gerando..." : "Salvar e Liberar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


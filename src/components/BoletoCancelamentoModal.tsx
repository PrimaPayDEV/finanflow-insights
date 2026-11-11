import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileX,
  Users,
  UserPlus,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Calendar,
  DollarSign,
  User,
  Car,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { BRL, formatCpfCnpj, formatPhone } from "@/lib/format";
import { generateCancellationBoleto } from "@/lib/asaas.functions";

interface BoletoCancelamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  members: any[];
  onSuccess?: () => void;
}

export function BoletoCancelamentoModal({
  open,
  onOpenChange,
  companyId,
  members,
  onSuccess,
}: BoletoCancelamentoModalProps) {
  const qc = useQueryClient();
  const generateFn = useServerFn(generateCancellationBoleto);

  const [activeTab, setActiveTab] = useState<"cadastrado" | "novo">("cadastrado");

  // Busca e seleção do associado cadastrado
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Dados do formulário
  const [customerName, setCustomerName] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [amountRaw, setAmountRaw] = useState("150,00");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3); // D+3 padrão
    return d.toISOString().split("T")[0];
  });
  const [description, setDescription] = useState("Boleto de Cancelamento - Proteção Veicular");

  // Estado de Sucesso com dados retornados pelo Asaas
  const [resultData, setResultData] = useState<{
    paymentId: string;
    bankSlipUrl: string | null;
    invoiceUrl: string | null;
    identificationField: string | null;
    barCode: string | null;
    pixPayload: string | null;
    dueDate: string;
    amount: number;
    customerName: string;
    customerPhone?: string;
  } | null>(null);

  // Filtragem dos associados da base
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!memberSearch.trim()) return members.slice(0, 15);
    const q = memberSearch.toLowerCase().replace(/\D/g, "");
    const qText = memberSearch.toLowerCase().trim();

    return members.filter((m: any) => {
      const name = (m.name || "").toLowerCase();
      const doc = (m.document || "").replace(/\D/g, "");
      const plate = (m.vehicles?.[0]?.plate || "").toLowerCase();
      return name.includes(qText) || (q && doc.includes(q)) || plate.includes(qText);
    }).slice(0, 15);
  }, [members, memberSearch]);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m: any) => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  // Atualizar dados ao selecionar um associado cadastrado
  useEffect(() => {
    if (activeTab === "cadastrado" && selectedMember) {
      setCustomerName(selectedMember.name || "");
      setCustomerDocument(selectedMember.document || "");
      setCustomerEmail(selectedMember.email || "");
      setCustomerPhone(selectedMember.phone || "");

      const primaryVehicle = selectedMember.vehicles?.[0];
      const plate = primaryVehicle?.plate || "";
      const model = primaryVehicle?.model ? `${primaryVehicle.brand || ""} ${primaryVehicle.model}`.trim() : "";
      setVehiclePlate(plate);
      setVehicleModel(model);

      // Descrição automática com dados do associado e placa
      setDescription(
        `Boleto de Cancelamento - Proteção Veicular (Associado: ${selectedMember.name}${plate ? ` - Placa: ${plate}` : ""})`
      );

      // Sugere valor da mensalidade como base se disponível
      if (selectedMember.monthly_fee && Number(selectedMember.monthly_fee) > 0) {
        setAmountRaw(Number(selectedMember.monthly_fee).toFixed(2).replace(".", ","));
      }
    }
  }, [activeTab, selectedMember]);

  // Limpar ao alternar para aba "novo"
  const handleTabChange = (tab: "cadastrado" | "novo") => {
    setActiveTab(tab);
    setResultData(null);
    if (tab === "novo") {
      setSelectedMemberId("");
      setCustomerName("");
      setCustomerDocument("");
      setCustomerEmail("");
      setCustomerPhone("");
      setVehiclePlate("");
      setVehicleModel("");
      setDescription("Boleto de Cancelamento - Proteção Veicular");
    }
  };

  // Mutação para emissão do boleto
  const emitMutation = useMutation({
    mutationFn: generateFn,
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success("Boleto de cancelamento emitido com sucesso!");
        setResultData({
          paymentId: res.paymentId,
          bankSlipUrl: res.bankSlipUrl,
          invoiceUrl: res.invoiceUrl,
          identificationField: res.identificationField,
          barCode: res.barCode,
          pixPayload: res.pixPayload,
          dueDate: res.dueDate,
          amount: res.amount,
          customerName: res.customerName,
          customerPhone: res.customerPhone,
        });
        qc.invalidateQueries({ queryKey: ["billing_metrics"] });
        onSuccess?.();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar boleto no Asaas");
    },
  });

  const handleEmitir = () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (activeTab === "cadastrado" && !selectedMemberId) {
      toast.error("Selecione um associado da base.");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Informe o nome do associado.");
      return;
    }

    const cleanDoc = customerDocument.replace(/\D/g, "");
    if (!cleanDoc || (cleanDoc.length !== 11 && cleanDoc.length !== 14)) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
      return;
    }

    const parsedAmount = Number(amountRaw.replace(/\./g, "").replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido para o boleto de cancelamento.");
      return;
    }

    if (!dueDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    emitMutation.mutate({
      data: {
        companyId,
        memberId: activeTab === "cadastrado" ? selectedMemberId : undefined,
        isRegistered: activeTab === "cadastrado",
        customerName: customerName.trim(),
        customerDocument: cleanDoc,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.replace(/\D/g, "") || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
        amount: parsedAmount,
        dueDate,
        description: description.trim(),
      },
    });
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Linha digitável copiada para a área de transferência!");
  };

  const handleWhatsApp = () => {
    if (!resultData) return;
    const phone = (resultData.customerPhone || "").replace(/\D/g, "");
    const cleanPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const boletoLink = resultData.bankSlipUrl || resultData.invoiceUrl || "";

    const msg = `Olá, *${resultData.customerName}*!\n\nSegue o seu *Boleto de Cancelamento* referente à sua proteção veicular:\n\n` +
      `💰 *Valor:* ${BRL(resultData.amount)}\n` +
      `📅 *Vencimento:* ${resultData.dueDate.split("-").reverse().join("/")}\n` +
      (resultData.identificationField ? `📄 *Linha Digitável:* \`${resultData.identificationField}\`\n\n` : "") +
      (boletoLink ? `🔗 *Visualizar / Imprimir Boleto:* ${boletoLink}\n\n` : "") +
      `Caso tenha dúvidas, estamos à disposição!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleReset = () => {
    setResultData(null);
    setSelectedMemberId("");
    setMemberSearch("");
    setCustomerName("");
    setCustomerDocument("");
    setCustomerEmail("");
    setCustomerPhone("");
    setVehiclePlate("");
    setVehicleModel("");
    setDescription("Boleto de Cancelamento - Proteção Veicular");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-border/80 shadow-2xl bg-card">
        {/* Cabeçalho */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
              <FileX className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Gerar Boleto de Cancelamento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Emissão avulsa de cobrança bancária para associados da base ou novos clientes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================= */}
        {/* TELA DE SUCESSO: EXIBIÇÃO DO BOLETO GERADO                 */}
        {/* ========================================================= */}
        {resultData ? (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <div className="inline-flex size-12 rounded-full bg-emerald-500 text-white items-center justify-center shadow-md">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Boleto Emitido com Sucesso!</h3>
              <p className="text-xs text-muted-foreground">
                A cobrança de cancelamento foi registrada no Asaas e já está disponível para pagamento.
              </p>
            </div>

            {/* Resumo dos dados */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Associado</span>
                <p className="font-bold text-foreground truncate">{resultData.customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Valor Total</span>
                <p className="font-extrabold text-foreground text-sm font-mono">{BRL(resultData.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Vencimento</span>
                <p className="font-bold text-foreground font-mono">
                  {resultData.dueDate.split("-").reverse().join("/")}
                </p>
              </div>
            </div>

            {/* Linha Digitável para Cópia */}
            {resultData.identificationField && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Linha Digitável (Código de Barras)</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-xl bg-background border border-border/80 font-mono text-xs text-foreground truncate select-all">
                    {resultData.identificationField}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyCode(resultData.identificationField!)}
                    className="rounded-xl h-10 px-3.5 gap-1.5 shrink-0"
                  >
                    <Copy className="size-3.5" />
                    <span>Copiar</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {(resultData.bankSlipUrl || resultData.invoiceUrl) && (
                <Button
                  asChild
                  className="flex-1 rounded-xl h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <a
                    href={resultData.bankSlipUrl || resultData.invoiceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    <span>Visualizar / Imprimir Boleto</span>
                  </a>
                </Button>
              )}

              {resultData.customerPhone && (
                <Button
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="rounded-xl h-11 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-2"
                >
                  <MessageCircle className="size-4" />
                  <span>Enviar no WhatsApp</span>
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={handleReset}
                className="rounded-xl h-11 text-xs text-muted-foreground hover:text-foreground"
              >
                Emitir Outro
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* FORMULÁRIO DE EMISSÃO                                     */
          /* ========================================================= */
          <div className="p-6 space-y-5">
            {/* Abas: Associado Cadastrado vs Associado Novo */}
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl h-11">
                <TabsTrigger
                  value="cadastrado"
                  className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
                >
                  <Users className="size-4" />
                  <span>Associado da Base</span>
                </TabsTrigger>
                <TabsTrigger
                  value="novo"
                  className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
                >
                  <UserPlus className="size-4" />
                  <span>Novo / Não Cadastrado</span>
                </TabsTrigger>
              </TabsList>

              {/* ------------------------------------------------------------- */}
              {/* ABA 1: ASSOCIADO CADASTRADO                                   */}
              {/* ------------------------------------------------------------- */}
              <TabsContent value="cadastrado" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Buscar Associado na Plataforma
                  </Label>
                  <div className="relative">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Busque por nome, CPF ou placa do veículo..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-background border-border/80"
                    />
                  </div>

                  {/* Lista de Associados Encontrados */}
                  <div className="border border-border/70 rounded-xl divide-y divide-border/60 max-h-48 overflow-y-auto bg-background/50">
                    {filteredMembers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Nenhum associado encontrado para "{memberSearch}".
                      </div>
                    ) : (
                      filteredMembers.map((m: any) => {
                        const isSelected = selectedMemberId === m.id;
                        const plate = m.vehicles?.[0]?.plate;
                        const model = m.vehicles?.[0]?.model;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? "bg-primary/10 text-primary font-bold"
                                : "hover:bg-muted/60 text-foreground"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">{m.name}</span>
                                {plate && (
                                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                    {plate}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground font-normal truncate mt-0.5">
                                CPF: {formatCpfCnpj(m.document || "")} {model ? `• ${model}` : ""}
                              </p>
                            </div>
                            {isSelected && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">
                                Selecionado
                              </Badge>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Card de Detalhes do Associado Selecionado */}
                {selectedMember && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" />
                        {selectedMember.name}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Dia {selectedMember.due_day || 20}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                      <div>CPF: <strong className="text-foreground">{formatCpfCnpj(selectedMember.document || "")}</strong></div>
                      <div>WhatsApp: <strong className="text-foreground">{formatPhone(selectedMember.phone || "") || "Não inf."}</strong></div>
                      <div>Veículo: <strong className="text-foreground">{vehicleModel || "N/A"}</strong></div>
                      <div>Placa: <strong className="font-mono text-foreground">{vehiclePlate || "N/A"}</strong></div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ------------------------------------------------------------- */}
              {/* ABA 2: NOVO ASSOCIADO / NÃO CADASTRADO                       */}
              {/* ------------------------------------------------------------- */}
              <TabsContent value="novo" className="space-y-3.5 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome Completo *</Label>
                    <Input
                      placeholder="Nome do cliente/associado"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-background border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">CPF ou CNPJ *</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={customerDocument}
                      onChange={(e) => setCustomerDocument(e.target.value)}
                      className="h-10 rounded-xl text-xs font-mono bg-background border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                    <Input
                      placeholder="(31) 90000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-background border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-background border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Placa do Veículo (Opcional)</Label>
                    <Input
                      placeholder="ABC-1234"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="h-10 rounded-xl text-xs font-mono uppercase bg-background border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Modelo do Veículo (Opcional)</Label>
                    <Input
                      placeholder="Ex: Fiat Palio 1.0"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-background border-border/80"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* ------------------------------------------------------------- */}
            {/* CAMPOS COMUNS DO BOLETO                                       */}
            {/* ------------------------------------------------------------- */}
            <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-primary" />
                  Valor do Boleto de Cancelamento (R$) *
                </Label>
                <Input
                  value={amountRaw}
                  onChange={(e) => setAmountRaw(e.target.value)}
                  placeholder="150,00"
                  className="h-10 rounded-xl text-xs font-mono font-bold bg-background border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  Data de Vencimento *
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 rounded-xl text-xs font-mono bg-background border-border/80"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Descrição do Boleto (Aparecerá na cobrança)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Boleto de Cancelamento - Proteção Veicular"
                  className="h-10 rounded-xl text-xs bg-background border-border/80"
                />
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-10 px-4 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEmitir}
                disabled={emitMutation.isPending || (activeTab === "cadastrado" && !selectedMemberId)}
                className="rounded-xl h-10 px-5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 shadow-xs"
              >
                {emitMutation.isPending ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Gerando no Asaas...</span>
                  </>
                ) : (
                  <>
                    <FileX className="size-4" />
                    <span>Emitir Boleto de Cancelamento</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


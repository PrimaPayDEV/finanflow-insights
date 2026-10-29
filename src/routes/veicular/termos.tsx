import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  MessageCircle,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers } from "@/lib/members.functions";
import { BRL, formatCpfCnpj, formatPhone } from "@/lib/format";
import {
  generateTermoAceiteWhatsAppMessage,
  loadLocalData,
  saveLocalData,
  getMemberExtraData,
  getVehicleExtraData,
  getMemberDueDay,
  formatDateTimeBR
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/termos')({
  head: () => ({
    meta: [{ title: "Termos & Regulamento PPM | Planmais Proteção Veicular" }],
  }),
  component: TermosPage,
});

type TermoType = "PPM" | "ADESAO" | "VISTORIA" | "ACORDO" | "CANCELAMENTO";

function TermosPage() {
  const { companyId, companyName } = useAuth();

  const fetchMembers = useServerFn(getMembers);
  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [termoType, setTermoType] = useState<TermoType>("PPM");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Termos aceitos salvos localmente
  const [termosAceitos, setTermosAceitos] = useState<Record<string, string>>(() => {
    return loadLocalData<Record<string, string>>(companyId || "default", "termos_aceitos", {});
  });

  // Dados do associado e veículo selecionado
  const selectedMember = useMemo(() => {
    return members.find((m: any) => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  const memberExtra = useMemo(() => {
    if (!selectedMemberId) return {};
    return getMemberExtraData(companyId || "default", selectedMemberId);
  }, [companyId, selectedMemberId]);

  const memberDueDay = useMemo(() => {
    if (!selectedMemberId) return 20;
    return getMemberDueDay(companyId || "default", selectedMemberId, Number((selectedMember as any)?.due_day || 20));
  }, [companyId, selectedMemberId, selectedMember]);

  const memberVehicles = useMemo(() => {
    if (!selectedMember) return [];
    return Array.isArray((selectedMember as any).vehicles) ? (selectedMember as any).vehicles : [];
  }, [selectedMember]);

  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId) {
      return memberVehicles.find((v: any) => v.id === selectedVehicleId);
    }
    return memberVehicles[0];
  }, [memberVehicles, selectedVehicleId]);

  const vehicleExtra = useMemo(() => {
    if (!selectedVehicle) return {};
    return getVehicleExtraData(companyId || "default", selectedVehicle.id, selectedVehicle.plate);
  }, [companyId, selectedVehicle]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  const associationName = companyName || "Planmais Proteção Veicular";

  // Verificar se já foi aceito
  const termoKey = `${selectedMemberId}_${termoType}_${selectedVehicle?.id || "geral"}`;
  const aceitoEm = termosAceitos[termoKey];

  const handleMarcarAceite = () => {
    if (!selectedMember) {
      toast.error("Selecione um associado para validar o termo.");
      return;
    }
    const updated = {
      ...termosAceitos,
      [termoKey]: new Date().toISOString(),
    };
    setTermosAceitos(updated);
    saveLocalData(companyId || "default", "termos_aceitos", updated);
    toast.success("Aceite registrado com sucesso no sistema!");
  };

  const handleSendWhatsApp = () => {
    if (!selectedMember) {
      toast.error("Selecione um associado primeiro.");
      return;
    }

    const memberName = selectedMember.name;
    const plate = selectedVehicle?.plate || "A DEFINIR";
    const model = selectedVehicle ? `${selectedVehicle.brand || ""} ${selectedVehicle.model || ""}`.trim() : "Veículo";
    const baseMsg = generateTermoAceiteWhatsAppMessage(memberName, plate, model, associationName);
    const msg =
      termoType === "PPM"
        ? `📜 *REGULAMENTO PPM (PROTEÇÃO PATRIMONIAL MUTUALISTA) - ${associationName.toUpperCase()}*\n\n` +
          `Olá, *${memberName}*! Segue para ciência e validação o nosso Regulamento de Proteção Patrimonial Mutualista (PPM) referente ao veículo *${model}* (Placa: *${plate}*).\n\n` +
          `Por favor, revise as normas do programa mutualista e responda *"CONCORDO"* para confirmar o aceite eletrônico do Regulamento PPM.`
        : baseMsg;

    const cleanPhone = (selectedMember.phone || "").replace(/\D/g, "");

    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyText = () => {
    const el = document.getElementById("documento-termo");
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      toast.success("Texto do termo/regulamento copiado para a área de transferência!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout
      title="Usuário, Termos & Regulamento PPM"
      subtitle="Emissão do Regulamento PPM (Proteção Patrimonial Mutualista) e termos preenchidos com dados do associado"
    >
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:m-0">
        {/* Painel de Configuração do Termo (Oculto na Impressão) */}
        <Card className="rounded-2xl border border-border/80 shadow-sm print:hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4.5 text-primary" />
              <span>Gerador de Regulamento PPM & Documentos Oficiais</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Escolha o Regulamento PPM (Proteção Patrimonial Mutualista) ou termo desejado e selecione o associado
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo do Documento / Regulamento</Label>
                <Select value={termoType} onValueChange={(v: any) => setTermoType(v)}>
                  <SelectTrigger className="rounded-xl text-xs font-bold text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="PPM" className="font-bold text-primary">
                      Termo PPM (Proteção Patrimonial Mutualista) — Regulamento
                    </SelectItem>
                    <SelectItem value="ADESAO">Termo de Adesão & Filiação</SelectItem>
                    <SelectItem value="VISTORIA">Termo de Vistoria Prévia</SelectItem>
                    <SelectItem value="ACORDO">Autorização de Reparo de Sinistro</SelectItem>
                    <SelectItem value="CANCELAMENTO">Termo de Desfiliação / Cancelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Associado</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Selecione o associado..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({formatCpfCnpj(m.document)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Veículo Protegido</Label>
                <Select
                  value={selectedVehicleId || (selectedVehicle?.id || "")}
                  onValueChange={setSelectedVehicleId}
                  disabled={memberVehicles.length === 0}
                >
                  <SelectTrigger className="rounded-xl text-xs font-mono font-bold">
                    <SelectValue
                      placeholder={memberVehicles.length === 0 ? "Nenhum veículo vinculado" : "Selecione o veículo..."}
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {memberVehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} - {v.brand} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ações do Termo */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-border/60">
              <div className="flex items-center gap-2">
                {aceitoEm ? (
                  <Badge className="bg-emerald-500 text-white text-xs gap-1.5 py-1 px-3">
                    <CheckCircle2 className="size-3.5" />
                    <span>Aceite Confirmado em {formatDateTimeBR(aceitoEm)}</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3">
                    <Calendar className="size-3.5" />
                    <span>Aguardando Aceite / Assinatura</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Copy className="size-3.5" />
                  <span>Copiar Texto</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Printer className="size-3.5" />
                  <span>Imprimir / PDF</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendWhatsApp}
                  disabled={!selectedMember}
                  className="rounded-xl font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <MessageCircle className="size-3.5" />
                  <span>Enviar para Aceite no WhatsApp</span>
                </Button>

                {!aceitoEm && (
                  <Button
                    size="sm"
                    onClick={handleMarcarAceite}
                    disabled={!selectedMember}
                    className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Registrar Aceite</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DOCUMENTO FORMATADO (Estilo Timbrado Oficial) */}
        <div
          id="documento-termo"
          className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-md p-8 sm:p-12 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
        >
          {/* Cabeçalho Oficial */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-sans">
                {associationName}
              </h1>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Associação de Benefícios e Proteção Patrimonial Mutualista (PPM)
              </p>
              <p className="text-[11px] text-slate-500">
                Regulamento Oficial de Socorro Mútuo e Rateio Cooperativo de Veículos Automotores
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Documento Oficial</span>
              <span className="text-xs font-mono font-bold text-slate-900 block">
                REF: {termoType}-{selectedVehicle?.plate || "GERAL"}-{new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* Título do Termo */}
          <div className="text-center py-2">
            <h2 className="text-lg font-black uppercase text-slate-900 tracking-wide underline decoration-slate-400 underline-offset-4">
              {termoType === "PPM" && "TERMO & REGULAMENTO DE PROTEÇÃO PATRIMONIAL MUTUALISTA (PPM)"}
              {termoType === "ADESAO" && "TERMO DE ADESÃO, FILIAÇÃO E PROTEÇÃO VEICULAR (PPM)"}
              {termoType === "VISTORIA" && "LAUDO DE VISTORIA PRÉVIA & CONDIÇÕES DO VEÍCULO"}
              {termoType === "ACORDO" && "TERMO DE AUTORIZAÇÃO DE REPARO E LIQUIDAÇÃO DE SINISTRO"}
              {termoType === "CANCELAMENTO" && "TERMO DE DESFILIAÇÃO E CANCELAMENTO DE BENEFÍCIOS"}
            </h2>
          </div>

          {/* Quadro 1: Dados do Associado */}
          <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300">
              1. Qualificação do Associado Participante
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Nome Completo:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedMember?.name || "NÃO SELECIONADO"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">CPF / CNPJ:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedMember ? formatCpfCnpj(selectedMember.document) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">CNH & Validade:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {memberExtra.cnhNumber ? `Nº ${memberExtra.cnhNumber}` : "Conforme prontuário"}
                  {memberExtra.cnhExpiryDate
                    ? ` (Val: ${memberExtra.cnhExpiryDate.split("-").reverse().join("/")})`
                    : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Telefone / WhatsApp:</span>
                <span className="font-mono text-slate-900">
                  {selectedMember?.phone ? formatPhone(selectedMember.phone) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">E-mail:</span>
                <span className="text-slate-900">{selectedMember?.email || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Data e Hora do Cadastro:</span>
                <span className="font-mono text-slate-900">
                  {memberExtra.registeredAt || (selectedMember as any)?.created_at
                    ? formatDateTimeBR(memberExtra.registeredAt || (selectedMember as any)?.created_at)
                    : todayStr}
                </span>
              </div>
            </div>
          </div>

          {/* Quadro 2: Dados do Veículo Protegido */}
          <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300">
              2. Identificação do Patrimônio / Veículo & Implementos Cadastrados
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Placa:</span>
                <span className="font-mono font-black text-slate-950 text-sm">
                  {selectedVehicle?.plate || "SEM VEÍCULO"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Marca / Modelo:</span>
                <span className="font-bold text-slate-900">
                  {selectedVehicle ? `${selectedVehicle.brand || ""} ${selectedVehicle.model || ""}` : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Chassi:</span>
                <span className="font-mono font-bold text-slate-900">
                  {vehicleExtra.chassi || "Conforme CRLV"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Renavam:</span>
                <span className="font-mono font-bold text-slate-900">
                  {vehicleExtra.renavam || "Conforme CRLV"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ano Fab./Modelo:</span>
                <span className="font-mono text-slate-900">{selectedVehicle?.year || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Valor FIPE Avaliado:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {selectedVehicle?.fipe_value || vehicleExtra.fipeValue
                    ? BRL(selectedVehicle?.fipe_value || vehicleExtra.fipeValue || 0)
                    : "100% Tabela FIPE"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Mensalidade Estimada:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedVehicle?.monthly_fee ? BRL(selectedVehicle.monthly_fee) : "R$ 179,90"} (Venc. Dia {memberDueDay})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Implementos:</span>
                <span className="font-bold text-slate-900">
                  {vehicleExtra.implementos && vehicleExtra.implementos.length > 0
                    ? `${vehicleExtra.implementos.length} cadastrado(s)`
                    : "Nenhum implemento"}
                </span>
              </div>
            </div>
          </div>

          {/* Cláusulas Contratuais e Regulamento PPM */}
          <div className="space-y-3 text-justify text-xs text-slate-700 leading-relaxed">
            <h3 className="font-bold text-slate-900 text-xs uppercase border-b border-slate-200 pb-1">
              3. {termoType === "PPM" ? "Do Regulamento de Proteção Patrimonial Mutualista (PPM)" : "Das Cláusulas e Condições Gerais"}
            </h3>

            {termoType === "PPM" && (
              <div className="space-y-2.5">
                <p>
                  <strong>ARTIGO 1º – DA NATUREZA E FINALIDADE DO PPM (PROTEÇÃO PATRIMONIAL MUTUALISTA):</strong> A{" "}
                  <strong>{associationName}</strong> é uma associação civil sem fins lucrativos que opera sob o regime de{" "}
                  <strong>Proteção Patrimonial Mutualista (PPM)</strong>, fundamentado no princípio constitucional do associativismo e da ajuda mútua. O programa tem por objetivo amparar e repartir, por meio de rateio cooperativo entre os associados participantes, os prejuízos materiais sofridos nos veículos e implementos regularmente cadastrados.
                </p>
                <p>
                  <strong>ARTIGO 2º – DO INGRESSO, CADASTRO E VISTORIA PRÉVIA:</strong> Para usufruir dos benefícios da Proteção Patrimonial Mutualista (PPM), o associado deve apresentar documentação idônea (CPF/CNPJ, CNH dentro do prazo de validade e CRLV contendo Chassi e Renavam) e submeter o veículo e eventuais implementos rodoviários à vistoria prévia obrigatória, ficando registradas eventuais avarias preexistentes.
                </p>
                <p>
                  <strong>ARTIGO 3º – DOS EVENTOS COBERTOS PELO PROGRAMA PPM:</strong> Respeitadas as coberturas ativas contratadas na ficha técnica do veículo, o programa PPM abrange: (I) Colisão, abalroamento e capotamento; (II) Incêndio acidental; (III) Roubo ou furto qualificado com indenização baseada na Tabela FIPE vigente; (IV) Fenômenos da natureza (granizo, queda de árvore e alagamento de água doce); (V) Proteção a veículos de terceiros (RCF) até o limite contratado; (VI) Proteção de implementos cadastrados conforme valor comercial avaliado; e (VII) Assistência emergencial e reboque 24 horas.
                </p>
                <p>
                  <strong>ARTIGO 4º – DO SISTEMA DE RATEIO E CONTRIBUIÇÃO MENSAL:</strong> A contribuição mensal do associado é composta pela taxa de administração associativa, pelos benefícios/coberturas selecionados (incluindo implementos precificados conforme tabela vigente) e pela quota-parte do rateio mensal de sinistros/eventos apurados no período. O pagamento deve ser efetuado impreterivelmente até a data de vencimento escolhida (todo dia {memberDueDay}).
                </p>
                <p>
                  <strong>ARTIGO 5º – DA INADIMPLÊNCIA E SUSPENSÃO DE COBERTURA:</strong> O não pagamento do boleto até a data de vencimento acarreta a suspensão automática e imediata de todas as coberturas do Regulamento PPM e da assistência 24 horas, não sendo a associação responsável por quaisquer eventos ocorridos durante o período de inadimplência. Para reativação da proteção após atraso, poderá ser exigida nova vistoria do veículo.
                </p>
                <p>
                  <strong>ARTIGO 6º – DA COTA DE PARTICIPAÇÃO (COPARTICIPAÇÃO MÚTUA):</strong> Em qualquer acionamento para reparo de danos parciais do veículo protegido ou de seus implementos, o associado participará dos custos mediante o pagamento direto da respectiva <strong>Cota de Participação</strong> estabelecida na tabela de cotas da associação vigente na data do evento.
                </p>
                <p>
                  <strong>ARTIGO 7º – DA LIQUIDAÇÃO DE EVENTOS E DOCUMENTAÇÃO:</strong> Em caso de evento, o associado deverá comunicar imediatamente a central de assistência, registrar Boletim de Ocorrência policial quando aplicável e encaminhar fotos, orçamentos, recibos e Notas Fiscais (NFs) para análise técnica. Os reparos serão realizados em oficinas credenciadas. Nos casos de perda total ou roubo/furto sem recuperação, o ressarcimento integral observará o prazo regulamentar após a entrega completa da documentação livre de ônus.
                </p>
                <p>
                  <strong>ARTIGO 8º – DOS DEVERES DO ASSOCIADO E EXCLUSÕES:</strong> Não estarão amparados pelo PPM os eventos decorrentes de condução por pessoa inabilitada ou com CNH vencida/suspensa, embriaguez, participação em competições, dolo, fraude, agravamento intencional de risco, desgaste natural de peças mecânicas ou elétricas e lucros cessantes não contratados.
                </p>
                <p>
                  <strong>ARTIGO 9º – DO ACEITE AO REGULAMENTO PPM:</strong> O ASSOCIADO declara ter lido, compreendido e aceitado integralmente todas as normas deste <strong>Regulamento de Proteção Patrimonial Mutualista (PPM)</strong>, reconhecendo que a confirmação eletrônica via sistema ou resposta "CONCORDO" via WhatsApp possui plena eficácia jurídica entre as partes.
                </p>
              </div>
            )}

            {termoType === "ADESAO" && (
              <>
                <p>
                  <strong>CLÁUSULA PRIMEIRA – DO OBJETO E ADESÃO AO PPM:</strong> Pelo presente instrumento, o ASSOCIADO adere voluntariamente ao quadro social da {associationName} e ao seu <strong>Regulamento de Proteção Patrimonial Mutualista (PPM)</strong>, passando a usufruir do Programa de Socorro Mútuo para o veículo e implementos acima identificados.
                </p>
                <p>
                  <strong>CLÁUSULA SEGUNDA – DA MENSALIDADE E VENCIMENTO:</strong> O ASSOCIADO se compromete a honrar com a contribuição associativa mensal e rateio impreterivelmente até a data de vencimento especificada. O atraso no pagamento suspenderá imediatamente o direito ao atendimento de socorro mecânico, reboque e coberturas de sinistros.
                </p>
                <p>
                  <strong>CLÁUSULA TERCEIRA – DA COTA DE PARTICIPAÇÃO (FRANQUIA):</strong> Em caso de sinistro com perda parcial que demande conserto em oficinas parceiras ou indenização a terceiros, caberá ao associado o custeio da respectiva Cota de Participação pactuada no Regulamento PPM.
                </p>
                <p>
                  <strong>CLÁUSULA QUARTA – DO ACEITE ELETRÔNICO:</strong> O envio desta manifestação via sistema ou resposta afirmativa via WhatsApp com a palavra "CONCORDO" possui plena validade jurídica e probatória entre as partes para todos os efeitos de direito.
                </p>
              </>
            )}

            {termoType === "VISTORIA" && (
              <>
                <p>
                  <strong>CLÁUSULA PRIMEIRA:</strong> O veículo e eventuais implementos acima descritos passaram pelo processo de vistoria prévia e inspeção cadastral, declarando o associado que o patrimônio encontra-se em regular estado de conservação mecânica, estrutural e estética, inexistindo avarias preexistentes não declaradas.
                </p>
                <p>
                  <strong>CLÁUSULA SEGUNDA:</strong> A associação reserva-se o direito de solicitar novas fotos e comprovação de chassi, renavam, hodômetro e estado de conservação a qualquer momento durante a vigência da filiação ao programa PPM.
                </p>
              </>
            )}

            {termoType === "ACORDO" && (
              <>
                <p>
                  <strong>CLÁUSULA PRIMEIRA – DA AUTORIZAÇÃO DE REPARO:</strong> Pelo presente termo, fica autorizado o reparo do veículo acima identificado nos termos do Regulamento de Proteção Patrimonial Mutualista (PPM), conforme orçamentos, serviços relacionados e notas fiscais aprovados pela auditoria técnica da associação.
                </p>
                <p>
                  <strong>CLÁUSULA SEGUNDA – DA QUITAÇÃO E COPARTICIPAÇÃO:</strong> Mediante o recolhimento da respectiva Cota de Participação pelo associado e a conclusão dos serviços pela oficina credenciada, as partes conferem recíproca quitação quanto ao evento registrado.
                </p>
              </>
            )}

            {termoType === "CANCELAMENTO" && (
              <>
                <p>
                  <strong>CLÁUSULA ÚNICA:</strong> A pedido formal do associado, fica revogada a filiação associativa ao Programa de Proteção Patrimonial Mutualista (PPM) e cessada toda e qualquer cobertura de socorro mútuo e assistência ao veículo e implementos acima a partir desta data, permanecendo o associado responsável apenas pelo rateio proporcional de eventos ocorridos durante sua vigência ativa.
                </p>
              </>
            )}
          </div>

          {/* Local e Data */}
          <div className="pt-4 text-right text-xs text-slate-600 font-medium">
            Local e data: Brasil, {todayStr}.
          </div>

          {/* Campo de Assinaturas */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">
                {selectedMember?.name || "Assinatura do Associado"}
              </div>
              <span className="text-[10px] text-slate-500 block">
                CPF: {selectedMember ? formatCpfCnpj(selectedMember.document) : "___.___.___-__"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">
                {associationName}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Diretoria de Operações & Proteção Patrimonial Mutualista (PPM)
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

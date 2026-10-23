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
  Car,
  User,
  ShieldCheck,
  Calendar,
  Share2,
  ExternalLink
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
  saveLocalData
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/termos')({
  head: () => ({
    meta: [{ title: "Termos & Documentos | Planmais Proteção Veicular" }],
  }),
  component: TermosPage,
});

type TermoType = "ADESAO" | "VISTORIA" | "ACORDO" | "CANCELAMENTO";

function TermosPage() {
  const { companyId, companyName } = useAuth();

  const fetchMembers = useServerFn(getMembers);
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [termoType, setTermoType] = useState<TermoType>("ADESAO");
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
    const msg = generateTermoAceiteWhatsAppMessage(memberName, plate, model, associationName);
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
      toast.success("Texto do termo copiado para a área de transferência!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout
      title="Usuário & Termos de Adesão"
      subtitle="Emissão de termos preenchidos automaticamente com dados do associado e veículo para aceite"
    >
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:m-0">
        {/* Painel de Configuração do Termo (Oculto na Impressão) */}
        <Card className="rounded-2xl border border-border/80 shadow-sm print:hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>Gerador de Termos & Documentos Oficiais</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Escolha o modelo de termo e o associado para preenchimento automático das cláusulas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo do Documento / Termo</Label>
                <Select value={termoType} onValueChange={(v: any) => setTermoType(v)}>
                  <SelectTrigger className="rounded-xl text-xs font-bold text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
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
                    <span>Aceite Confirmado em {new Date(aceitoEm).toLocaleDateString("pt-BR")}</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3">
                    <Calendar className="size-3.5" />
                    <span>Aguardando Aceite / Assinatura</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                Associação de Benefícios e Mútua Assistência Veicular
              </p>
              <p className="text-[11px] text-slate-500">
                Programa de Proteção e Socorro Mútuo de Veículos Automotores
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
              {termoType === "ADESAO" && "TERMO DE ADESÃO, FILIAÇÃO E PROTEÇÃO VEICULAR"}
              {termoType === "VISTORIA" && "LAUDO DE VISTORIA PRÉVIA & CONDIÇÕES DO VEÍCULO"}
              {termoType === "ACORDO" && "TERMO DE AUTORIZAÇÃO DE REPARO E LIQUIDAÇÃO DE SINISTRO"}
              {termoType === "CANCELAMENTO" && "TERMO DE DESFILIAÇÃO E CANCELAMENTO DE BENEFÍCIOS"}
            </h2>
          </div>

          {/* Quadro 1: Dados do Associado */}
          <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300">
              1. Qualificação do Associado Proponente
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Telefone / WhatsApp:</span>
                <span className="font-mono text-slate-900">
                  {selectedMember?.phone ? formatPhone(selectedMember.phone) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">E-mail:</span>
                <span className="text-slate-900">{selectedMember?.email || "Não informado"}</span>
              </div>
            </div>
          </div>

          {/* Quadro 2: Dados do Veículo Protegido */}
          <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300">
              2. Identificação do Veículo Cadastrado
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
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ano Fabricação/Modelo:</span>
                <span className="font-mono text-slate-900">{selectedVehicle?.year || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Valor FIPE Avaliado:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {selectedVehicle?.fipe_value ? BRL(selectedVehicle.fipe_value) : "Conforme Tabela"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Cor:</span>
                <span className="text-slate-900">{selectedVehicle?.color || "Padrão"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Mensalidade da Proteção:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedVehicle?.monthly_fee ? BRL(selectedVehicle.monthly_fee) : "R$ 179,90"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Vencimento Padrão:</span>
                <span className="font-bold text-slate-900">
                  Todo dia {(selectedMember as any)?.due_day || 20}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Status de Cobertura:</span>
                <span className="font-bold text-emerald-700">ATIVO / REGULAR</span>
              </div>
            </div>
          </div>

          {/* Cláusulas Contratuais */}
          <div className="space-y-3 text-justify text-xs text-slate-700 leading-relaxed">
            <h3 className="font-bold text-slate-900 text-xs uppercase">
              3. Das Cláusulas e Condições Gerais
            </h3>

            {termoType === "ADESAO" && (
              <>
                <p>
                  <strong>CLÁUSULA PRIMEIRA – DO OBJETO:</strong> Pelo presente instrumento, o ASSOCIADO adere voluntariamente ao quadro social da {associationName}, passando a usufruir do Programa de Socorro Mútuo e Proteção Veicular para o veículo acima identificado, abrangendo eventos de colisão, furto, roubo, incêndio e assistência emergencial 24 horas.
                </p>
                <p>
                  <strong>CLÁUSULA SEGUNDA – DA MENSALIDADE E VENCIMENTO:</strong> O ASSOCIADO se compromete a honrar com a contribuição associativa mensal impreterivelmente até a data de vencimento especificada. O atraso no pagamento suspenderá imediatamente o direito ao atendimento de socorro mecânico, reboque e coberturas de sinistros.
                </p>
                <p>
                  <strong>CLÁUSULA TERCEIRA – DA COTA DE PARTICIPAÇÃO (FRANQUIA):</strong> Em caso de sinistro com perda parcial que demande conserto em oficinas parceiras ou indenização a terceiros, caberá ao associado o custeio da respectiva Cota de Participação pactuada no regulamento interno.
                </p>
                <p>
                  <strong>CLÁUSULA QUARTA – DO ACEITE ELETRÔNICO:</strong> O envio desta manifestação via sistema ou resposta afirmativa via WhatsApp com a palavra "CONCORDO" possui plena validade jurídica e probatória entre as partes para todos os efeitos de direito.
                </p>
              </>
            )}

            {termoType === "VISTORIA" && (
              <>
                <p>
                  <strong>CLÁUSULA PRIMEIRA:</strong> O veículo acima descrito passou pelo processo de vistoria prévia e inspeção cadastral, declarando o associado que o automóvel encontra-se em regular estado de conservação mecânica e estética, inexistindo avarias preexistentes não declaradas.
                </p>
                <p>
                  <strong>CLÁUSULA SEGUNDA:</strong> A associação reserva-se o direito de solicitar novas fotos e comprovação de hodômetro e estado de conservação a qualquer momento durante a vigência da filiação.
                </p>
              </>
            )}

            {termoType === "CANCELAMENTO" && (
              <>
                <p>
                  <strong>CLÁUSULA ÚNICA:</strong> A pedido formal do associado, fica revogada a filiação associativa e cessada toda e qualquer cobertura de socorro mútuo e assistência ao veículo acima a partir desta data, dando as partes plena quitação entre si quanto a eventos futuros.
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
                Diretoria de Operações & Proteção Veicular
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

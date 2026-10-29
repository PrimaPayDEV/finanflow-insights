import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Car,
  Trash2,
  ShieldCheck,
  User,
  Pencil,
  Phone,
  Mail,
  MessageCircle,
  Search,
  Filter,
  Users,
  Calendar,
  MapPin,
  Loader2,
  Link2,
  CheckCircle2,
  Sparkles,
  UserX,
  CreditCard,
  Clock,
  ExternalLink,
  Truck,
  FileText,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { getMembers, upsertMember, addVehicle, deleteMember, getVehicles, linkVehicleToMember, updateMemberStatus } from "@/lib/members.functions";
import { getPartners } from "@/lib/partner.functions";
import { translateError } from "@/lib/translateError";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import { VehicleCategorySelector, VehicleCategoryBadge } from "@/components/VehicleCategorySelector";
import { fetchCepData } from "@/lib/cep";
import {
  type ImplementoItem,
  getMemberDueDay,
  setMemberDueDay,
  getAllMemberDueDays,
  getMemberExtraData,
  saveMemberExtraData,
  getAllMembersExtraData,
  getVehicleExtraData,
  saveVehicleExtraData,
  calculateBaseMonthlyFee,
  calculateImplementoMonthlyFee,
  categoryToVehicleType,
  formatDateTimeBR
} from "@/lib/veicular";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [{ title: "Associados | Gestão de Proteção" }],
  }),
  component: MembersPage,
});

// Componente reutilizável para gerenciamento de Implementos no cadastro de veículo
export function ImplementosManager({
  implementos,
  onChange,
  category,
}: {
  implementos: ImplementoItem[];
  onChange: (items: ImplementoItem[]) => void;
  category?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [chassi, setChassi] = useState("");
  const [rawValue, setRawValue] = useState("2500000"); // R$ 25.000,00 padrão

  const commercialValue = Number(rawValue.replace(/\D/g, "")) / 100 || 0;
  const calculatedFee = useMemo(
    () => calculateImplementoMonthlyFee(commercialValue, category),
    [commercialValue, category]
  );

  // Recalcular mensalidade se a categoria do veículo mudar
  useEffect(() => {
    if (implementos.length > 0) {
      const updated = implementos.map((imp) => ({
        ...imp,
        monthlyFee: calculateImplementoMonthlyFee(imp.commercialValue, category),
      }));
      onChange(updated);
    }
  }, [category]);

  const handleAdd = () => {
    if (!model.trim() && !brand.trim()) {
      toast.error("Informe pelo menos a marca ou modelo do implemento.");
      return;
    }
    if (commercialValue <= 0) {
      toast.error("Informe o valor comercial do implemento para precificação.");
      return;
    }

    const newItem: ImplementoItem = {
      id: "imp-" + Date.now(),
      brand: brand.trim() || "Padrão",
      model: model.trim() || "Implemento",
      year: year.trim() || String(new Date().getFullYear()),
      chassi: chassi.trim().toUpperCase(),
      commercialValue,
      monthlyFee: calculatedFee,
    };

    onChange([...implementos, newItem]);
    setBrand("");
    setModel("");
    setChassi("");
    setRawValue("2500000");
    setAdding(false);
    toast.success(`Implemento adicionado (+ ${BRL(calculatedFee)}/mês pela tabela de preços).`);
  };

  const handleRemove = (id: string) => {
    onChange(implementos.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-2.5 pt-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Truck className="size-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">
            Implementos Rodoviários / Equipamentos ({implementos.length})
          </span>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="h-7 rounded-xl text-[11px] font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Plus className="size-3" />
            Adicionar Implemento
          </Button>
        )}
      </div>

      {/* Lista de implementos adicionados */}
      {implementos.length > 0 && (
        <div className="space-y-1.5">
          {implementos.map((imp) => (
            <div
              key={imp.id}
              className="p-2.5 rounded-xl bg-primary/5 border border-primary/25 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold px-1.5 py-0">
                    IMPLEMENTO
                  </Badge>
                  <span className="font-bold text-foreground truncate">
                    {imp.brand} {imp.model} ({imp.year})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono mt-0.5 flex-wrap">
                  <span>Chassi: {imp.chassi || "N/I"}</span>
                  <span>• Valor Comercial: {BRL(imp.commercialValue)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    • Mensalidade Tabela: + {BRL(imp.monthlyFee)}/mês
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(imp.id)}
                className="size-7 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                title="Remover implemento"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário para adicionar novo implemento */}
      {adding && (
        <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Novo Implemento (Precificado pela Tabela de Veículos)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
              className="h-6 text-[10px] px-2 rounded-lg"
            >
              Cancelar
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Marca *</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Randon, Guerra, Facchini"
                className="h-8 rounded-xl text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Modelo / Tipo *</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Baú Alumínio, Sider, Carreta"
                className="h-8 rounded-xl text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Ano</Label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2023"
                maxLength={4}
                className="h-8 rounded-xl text-xs font-mono bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Número do Chassi / Série *</Label>
              <Input
                value={chassi}
                onChange={(e) => setChassi(e.target.value.toUpperCase())}
                placeholder="Ex: 9ADG12430P0019283"
                maxLength={20}
                className="h-8 rounded-xl text-xs font-mono uppercase bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Valor Comercial (R$) *</Label>
              <Input
                value={formatCurrencyInput(rawValue)}
                onChange={(e) => setRawValue(e.target.value)}
                placeholder="R$ 25.000,00"
                className="h-8 rounded-xl text-xs font-mono font-bold bg-background"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-primary/20">
            <div className="text-[11px] text-muted-foreground">
              Mensalidade calculada pela tabela:{" "}
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                + {BRL(calculatedFee)} / mês
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              className="h-7.5 rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground"
            >
              <CheckCircle2 className="size-3.5" />
              Confirmar Implemento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberDialog({
  member,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onNavigateToVehicle,
}: {
  member?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigateToVehicle?: (vehicleId: string, plate?: string) => void;
}) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  // Dados Pessoais do Associado
  const [name, setName] = useState(member?.name || "");
  const [document, setDocument] = useState(member?.document || "");
  const [rg, setRg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Solteiro(a)");
  const [profession, setProfession] = useState("");
  const [email, setEmail] = useState(member?.email || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [partnerId, setPartnerId] = useState(member?.partner_id || "");
  const [dueDay, setDueDay] = useState<number>(20);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [registeredAt, setRegisteredAt] = useState<string>("");

  // Dados da CNH
  const [cnhNumber, setCnhNumber] = useState("");
  const [cnhCategory, setCnhCategory] = useState("B");
  const [cnhExpiryDate, setCnhExpiryDate] = useState("");
  const [cnhState, setCnhState] = useState("SP");

  // Endereço state (com preenchimento automático por CEP e manual)
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Modo de Veículo: "new" (cadastrar novo), "existing" (vincular da frota/avulso), "none" (associado avulso sem veículo)
  const [vehicleMode, setVehicleMode] = useState<"new" | "existing" | "none">("new");
  const [selectedExistingVehicleId, setSelectedExistingVehicleId] = useState<string>("");

  // Veículo fields (mais robustos)
  const firstVehicle = member?.vehicles?.[0];
  const [vehicleId, setVehicleId] = useState(firstVehicle?.id || "");
  const [plate, setPlate] = useState(firstVehicle?.plate || "");
  const [brandName, setBrandName] = useState(firstVehicle?.brand || "");
  const [modelName, setModelName] = useState(firstVehicle?.model || "");
  const [year, setYear] = useState(firstVehicle?.year?.toString() || "");
  const [color, setColor] = useState(firstVehicle?.color || "");
  const [chassi, setChassi] = useState("");
  const [renavam, setRenavam] = useState("");
  const [fuel, setFuel] = useState("Flex");
  const [mileage, setMileage] = useState("");
  const [usage, setUsage] = useState("Particular");
  const [fipeValueStr, setFipeValueStr] = useState("5000000"); // R$ 50.000,00
  const [category, setCategory] = useState<string>(firstVehicle?.category || "Leves e utilitários");
  const [implementos, setImplementos] = useState<ImplementoItem[]>([]);
  const [brandCode, setBrandCode] = useState("");

  const fetchPartners = useServerFn(getPartners);
  const { data: partners } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId && open,
  });

  const fetchVehiclesList = useServerFn(getVehicles);
  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ["vehicles", companyId],
    queryFn: () => fetchVehiclesList({ data: { companyId: companyId! } }),
    enabled: !!companyId && open,
  });

  // FIPE API integration
  const { data: fipeBrands } = useQuery({
    queryKey: ["fipe-brands"],
    queryFn: async () => {
      const res = await fetch("https://parallelum.com.br/fipe/api/v1/carros/marcas");
      return (await res.json()) as Array<{ codigo: string; nome: string }>;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setDocument(member.document || "");
      setEmail(member.email || "");
      setPhone(member.phone || "");
      setPartnerId(member.partner_id || "");
      setStatus(member.status === "inactive" ? "inactive" : "active");

      const savedDue = getMemberDueDay(companyId || "default", member.id, Number((member as any).due_day || 20));
      setDueDay(savedDue);

      const extra = getMemberExtraData(companyId || "default", member.id);
      setRg(extra.rg || "");
      setBirthDate(extra.birthDate || "");
      setMaritalStatus(extra.maritalStatus || "Solteiro(a)");
      setProfession(extra.profession || "");
      setSecondaryPhone(extra.secondaryPhone || "");
      setCnhNumber(extra.cnhNumber || "");
      setCnhCategory(extra.cnhCategory || "B");
      setCnhExpiryDate(extra.cnhExpiryDate || "");
      setCnhState(extra.cnhState || "SP");
      setCep(extra.cep || "");
      setAddress(extra.address || "");
      setNumber(extra.number || "");
      setComplement(extra.complement || "");
      setNeighborhood(extra.neighborhood || "");
      setCity(extra.city || "");
      setState(extra.state || "");
      setNotes(extra.notes || "");
      setRegisteredAt(extra.registeredAt || member.created_at || "");

      const fv = member.vehicles?.[0];
      if (fv) {
        const vExtra = getVehicleExtraData(companyId || "default", fv.id, fv.plate);
        setVehicleMode("new");
        setVehicleId(fv.id || "");
        setPlate(fv.plate || "");
        setBrandName(fv.brand || "");
        setModelName(fv.model || "");
        setYear(fv.year?.toString() || "");
        setColor(fv.color || vExtra.color || "");
        setChassi(vExtra.chassi || "");
        setRenavam(vExtra.renavam || "");
        setFuel(vExtra.fuel || "Flex");
        setMileage(vExtra.mileage || "");
        setUsage(vExtra.usage || "Particular");
        const fVal = fv.fipe_value || vExtra.fipeValue || 50000;
        setFipeValueStr(String(Math.round(fVal * 100)));
        setCategory(fv.category || "Leves e utilitários");
        setImplementos(vExtra.implementos || []);
      } else {
        setVehicleMode("none");
        setVehicleId("");
        setPlate("");
        setBrandName("");
        setModelName("");
        setYear("");
        setColor("");
        setChassi("");
        setRenavam("");
        setFuel("Flex");
        setMileage("");
        setUsage("Particular");
        setFipeValueStr("5000000");
        setCategory("Leves e utilitários");
        setImplementos([]);
      }
    } else {
      setName("");
      setDocument("");
      setRg("");
      setBirthDate("");
      setMaritalStatus("Solteiro(a)");
      setProfession("");
      setEmail("");
      setPhone("");
      setSecondaryPhone("");
      setPartnerId("");
      setDueDay(20);
      setStatus("active");
      setNotes("");
      setRegisteredAt("");
      setCnhNumber("");
      setCnhCategory("B");
      setCnhExpiryDate("");
      setCnhState("SP");
      setCep("");
      setAddress("");
      setNumber("");
      setComplement("");
      setNeighborhood("");
      setCity("");
      setState("");
      setVehicleMode("new");
      setVehicleId("");
      setPlate("");
      setBrandName("");
      setModelName("");
      setYear("");
      setColor("");
      setChassi("");
      setRenavam("");
      setFuel("Flex");
      setMileage("");
      setUsage("Particular");
      setFipeValueStr("5000000");
      setBrandCode("");
      setCategory("Leves e utilitários");
      setImplementos([]);
      setSelectedExistingVehicleId("");
    }
  }, [member, open, companyId]);

  useEffect(() => {
    if (fipeBrands && brandName && !brandCode) {
      const b = fipeBrands.find((x) => x.nome === brandName);
      if (b) setBrandCode(b.codigo);
    }
  }, [fipeBrands, brandName, brandCode]);

  const { data: fipeModels } = useQuery({
    queryKey: ["fipe-models", brandCode],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos`);
      const data = await res.json();
      return data.modelos as Array<{ codigo: string; nome: string }>;
    },
    enabled: !!brandCode,
    staleTime: Infinity,
  });

  const handleCepSearch = async (cepInput: string) => {
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }
    setIsSearchingCep(true);
    try {
      const data = await fetchCepData(clean);
      if (data) {
        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
        toast.success("Endereço localizado com sucesso!");
      }
    } catch {
      toast.error("Erro ao buscar dados do CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Cálculo da mensalidade do veículo + implementos pela tabela de preços
  const parsedFipeValue = Number(fipeValueStr.replace(/\D/g, "")) / 100 || 50000;
  const baseVehicleMonthlyFee = useMemo(() => {
    return calculateBaseMonthlyFee(categoryToVehicleType(category), parsedFipeValue);
  }, [category, parsedFipeValue]);

  const implementosMonthlyFee = useMemo(() => {
    return implementos.reduce((acc, imp) => acc + (imp.monthlyFee || 0), 0);
  }, [implementos]);

  const totalCalculatedMonthlyFee = baseVehicleMonthlyFee + implementosMonthlyFee;

  // Verificar validade da CNH
  const isCnhExpired = useMemo(() => {
    if (!cnhExpiryDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return cnhExpiryDate < today;
  }, [cnhExpiryDate]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (!name.trim()) throw new Error("Informe o nome do associado");
      if (!document.trim()) throw new Error("Informe o CPF ou CNPJ");

      const nowIso = new Date().toISOString();
      const finalRegisteredAt = registeredAt || nowIso;

      const res = await upsertMember({
        data: {
          id: member?.id,
          companyId,
          name,
          document,
          email,
          phone,
          partner_id: partnerId && partnerId !== "none" ? partnerId : undefined,
          status,
          vehicle:
            vehicleMode === "new" && (plate || brandName || modelName)
              ? {
                  id: vehicleId || undefined,
                  plate: plate ? plate.toUpperCase() : undefined,
                  brand: brandName,
                  model: modelName,
                  year: year ? parseInt(year) : undefined,
                  category,
                  monthly_fee: totalCalculatedMonthlyFee,
                  fipe_value: parsedFipeValue,
                }
              : undefined,
        },
      });

      if (!res.ok) throw new Error("Erro ao salvar associado.");

      const targetMemberId = member?.id || res.id;
      if (targetMemberId) {
        // Persistir dia de vencimento
        setMemberDueDay(companyId, targetMemberId, dueDay);

        // Persistir dados complementares completos do associado (incluindo CNH e data/hora do cadastro)
        saveMemberExtraData(companyId, targetMemberId, {
          rg,
          birthDate,
          maritalStatus,
          profession,
          secondaryPhone,
          cnhNumber,
          cnhCategory,
          cnhExpiryDate,
          cnhState,
          cep,
          address,
          number,
          complement,
          neighborhood,
          city,
          state,
          notes,
          registeredAt: finalRegisteredAt,
          updatedAt: nowIso,
        });

        // Se cadastrou/editou veículo, persistir dados extras do veículo e implementos
        if (vehicleMode === "new" && (plate || brandName || modelName)) {
          saveVehicleExtraData(companyId, vehicleId || undefined, plate, {
            chassi: chassi.trim().toUpperCase(),
            renavam: renavam.trim(),
            color,
            fuel,
            mileage,
            usage,
            fipeValue: parsedFipeValue,
            implementos,
            registeredAt: finalRegisteredAt,
          });
        }

        // Vincular a veículo avulso existente caso selecionado
        if (vehicleMode === "existing" && selectedExistingVehicleId) {
          await linkVehicleToMember({
            data: {
              companyId,
              memberId: targetMemberId,
              vehicleId: selectedExistingVehicleId,
            },
          });
        }
      }

      return { registeredAt: finalRegisteredAt };
    },
    onSuccess: (data) => {
      const formattedStamp = formatDateTimeBR(data?.registeredAt || new Date().toISOString());
      toast.success(member ? "Cadastro do associado atualizado!" : "Associado cadastrado com sucesso!", {
        description: `Registro concluído em ${formattedStamp}.`,
      });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[96vw] sm:w-[980px] sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-8">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-4.5 text-primary" />
                {member ? "Ficha Cadastral do Associado" : "Novo Cadastro de Associado & Veículo"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Formulário completo com dados pessoais, validade da CNH, endereço, veículo e implementos.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-primary/5 border-primary/25 text-primary gap-1 py-1 px-2.5"
              >
                <Clock className="size-3" />
                {registeredAt
                  ? `Cadastrado em: ${formatDateTimeBR(registeredAt)}`
                  : `Data/Hora atual: ${formatDateTimeBR(new Date().toISOString())}`}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 min-h-0">
          <div className="grid md:grid-cols-2 gap-5 items-start">
            {/* COLUNA ESQUERDA: Dados Pessoais, CNH e Cobrança */}
            <div className="space-y-4">
              {/* Bloco 1: Identificação Pessoal */}
              <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <User className="size-3.5" /> 1. Dados Pessoais & Identificação
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold ${
                        status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {status === "active" ? "Associado Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={status === "active"}
                      onCheckedChange={(c) => setStatus(c ? "active" : "inactive")}
                      className="scale-75 data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome Completo / Razão Social *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo do associado"
                    className="h-8.5 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">CPF / CNPJ *</Label>
                    <Input
                      value={document}
                      onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={18}
                      className="h-8.5 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">RG / Órgão Emissor</Label>
                    <Input
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      placeholder="Ex: 12.345.678-9 SSP"
                      className="h-8.5 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-semibold">Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-8.5 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Estado Civil</Label>
                    <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                      <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="União Estável">União Estável</SelectItem>
                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Profissão / Ocupação</Label>
                    <Input
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="Ex: Autônomo, Empresário..."
                      className="h-8.5 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Celular / WhatsApp Principal *</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="h-8.5 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Telefone Secundário / Recado</Label>
                    <Input
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="h-8.5 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="h-8.5 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Consultor Responsável</Label>
                    <Select value={partnerId} onValueChange={setPartnerId}>
                      <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                        <SelectValue placeholder="Direto / Sem Consultor" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">Direto / Sem Consultor</SelectItem>
                        {partners?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Dados da CNH (Habilitação) */}
              <div className="p-3.5 rounded-2xl border border-primary/25 bg-primary/5 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-primary/15">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CreditCard className="size-3.5" /> 2. Carteira Nacional de Habilitação (CNH)
                  </h3>
                  {cnhExpiryDate && (
                    <Badge
                      className={
                        isCnhExpired
                          ? "bg-destructive text-destructive-foreground text-[9px] font-bold"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold"
                      }
                    >
                      {isCnhExpired ? "CNH Vencida!" : "CNH Regular"}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-[11px] font-semibold">Nº Registro CNH</Label>
                    <Input
                      value={cnhNumber}
                      onChange={(e) => setCnhNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="00000000000"
                      maxLength={11}
                      className="h-8.5 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Categoria</Label>
                    <Select value={cnhCategory} onValueChange={setCnhCategory}>
                      <SelectTrigger className="h-8.5 rounded-xl text-xs font-bold bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="A">Cat. A (Moto)</SelectItem>
                        <SelectItem value="B">Cat. B (Carro)</SelectItem>
                        <SelectItem value="AB">Cat. AB</SelectItem>
                        <SelectItem value="C">Cat. C</SelectItem>
                        <SelectItem value="D">Cat. D</SelectItem>
                        <SelectItem value="E">Cat. E</SelectItem>
                        <SelectItem value="AD">Cat. AD</SelectItem>
                        <SelectItem value="AE">Cat. AE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-[11px] font-bold text-primary">Validade da CNH *</Label>
                    <Input
                      type="date"
                      value={cnhExpiryDate}
                      onChange={(e) => setCnhExpiryDate(e.target.value)}
                      className="h-8.5 rounded-xl text-xs font-mono bg-background border-primary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">UF Emissão</Label>
                    <Input
                      value={cnhState}
                      onChange={(e) => setCnhState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      maxLength={2}
                      className="h-8.5 rounded-xl text-xs font-mono uppercase bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Vencimento e Observações */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-amber-600" /> Vencimento do Boleto no Lote *
                  </Label>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                    Lote Financeiro
                  </Badge>
                </div>
                <Select value={String(dueDay)} onValueChange={(v) => setDueDay(Number(v))}>
                  <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background font-bold">
                    <SelectValue placeholder="Selecione o dia de vencimento" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="5">Dia 05 de cada mês</SelectItem>
                    <SelectItem value="10">Dia 10 de cada mês</SelectItem>
                    <SelectItem value="15">Dia 15 de cada mês</SelectItem>
                    <SelectItem value="20">Dia 20 de cada mês (Padrão)</SelectItem>
                    <SelectItem value="25">Dia 25 de cada mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* COLUNA DIREITA: Endereço & Veículo + Implemento */}
            <div className="space-y-4">
              {/* Endereço Residencial */}
              <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/10 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> 3. Endereço Residencial
                  </span>
                  <span className="text-[10px] text-muted-foreground">Autocompletar por CEP</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-1">
                    <Label className="text-[11px] font-semibold">CEP</Label>
                    <div className="relative">
                      <Input
                        value={cep}
                        onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        onBlur={(e) => handleCepSearch(e.target.value)}
                        placeholder="00000-000"
                        className="h-8 rounded-xl text-xs font-mono bg-background pr-6"
                      />
                      {isSearchingCep && (
                        <Loader2 className="size-3 animate-spin absolute right-2 top-2.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[11px] font-semibold">Logradouro / Rua</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, Avenida, Alameda..."
                      className="h-8 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-1">
                    <Label className="text-[11px] font-semibold">Número</Label>
                    <Input
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Nº ou S/N"
                      className="h-8 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[11px] font-semibold">Complemento / Bairro</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Apto / Bloco"
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                      <Input
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="h-8 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[11px] font-semibold">Cidade</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="h-8 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <Label className="text-[11px] font-semibold">UF</Label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF"
                      maxLength={2}
                      className="h-8 rounded-xl text-xs font-mono uppercase bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 4: Veículo do Associado + Implementos */}
              <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Car className="size-3.5" /> 4. Veículo & Implementos
                  </h3>
                  {member?.vehicles?.length > 0 && onNavigateToVehicle && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        onNavigateToVehicle(member.vehicles[0].id, member.vehicles[0].plate);
                      }}
                      className="h-6.5 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1 px-2 rounded-lg"
                    >
                      <ExternalLink className="size-3" />
                      Ver Coberturas & Mensalidade
                    </Button>
                  )}
                </div>

                {/* Veículos já vinculados ao associado (clique direto para aba Veículos) */}
                {member?.vehicles?.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Veículos vinculados a este associado (clique para abrir Ficha, Coberturas e Mensalidade):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {member.vehicles.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            if (onNavigateToVehicle) {
                              setOpen(false);
                              onNavigateToVehicle(v.id, v.plate);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background hover:bg-primary hover:text-primary-foreground border border-primary/30 text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <Car className="size-3" />
                          <span className="font-mono font-bold">{v.plate}</span>
                          <span className="text-[11px] opacity-85">
                            {v.brand} {v.model}
                          </span>
                          <ExternalLink className="size-3 opacity-75" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seletor de Modo de Veículo */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50 border border-border/60">
                  <Button
                    type="button"
                    variant={vehicleMode === "new" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVehicleMode("new")}
                    className="rounded-lg h-7 text-[11px] font-bold"
                  >
                    {vehicleId ? "Editar Veículo" : "Novo Veículo"}
                  </Button>
                  <Button
                    type="button"
                    variant={vehicleMode === "existing" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVehicleMode("existing")}
                    className="rounded-lg h-7 text-[11px] font-bold"
                  >
                    Vincular Frota
                  </Button>
                  <Button
                    type="button"
                    variant={vehicleMode === "none" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVehicleMode("none")}
                    className="rounded-lg h-7 text-[11px] font-bold"
                  >
                    Sem Veículo
                  </Button>
                </div>

                {/* MODO 1: Cadastrar / Editar Veículo Completo */}
                {vehicleMode === "new" && (
                  <div className="space-y-2.5 p-3 rounded-xl border border-border/60 bg-background/60">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Placa (Mercosul) *</Label>
                        <Input
                          value={plate}
                          onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                          placeholder="ABC1234"
                          maxLength={7}
                          className="h-8 rounded-xl text-xs font-mono font-bold uppercase bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Ano Fab./Mod.</Label>
                        <Input
                          value={year}
                          onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="2023"
                          maxLength={4}
                          className="h-8 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Cor</Label>
                        <Input
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          placeholder="Branco, Prata..."
                          className="h-8 rounded-xl text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Marca *</Label>
                        <Input
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="Ex: Toyota, Fiat, VW..."
                          list="fipe-brands-list"
                          className="h-8 rounded-xl text-xs bg-background"
                        />
                        <datalist id="fipe-brands-list">
                          {fipeBrands?.map((b) => (
                            <option key={b.codigo} value={b.nome} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Modelo *</Label>
                        <Input
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="Ex: Corolla XEi 2.0 Flex"
                          list="fipe-models-list"
                          className="h-8 rounded-xl text-xs bg-background"
                        />
                        <datalist id="fipe-models-list">
                          {fipeModels?.map((m) => (
                            <option key={m.codigo} value={m.nome} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Número do Chassi *</Label>
                        <Input
                          value={chassi}
                          onChange={(e) => setChassi(e.target.value.toUpperCase())}
                          placeholder="9BWZZZ377VT004251"
                          maxLength={20}
                          className="h-8 rounded-xl text-xs font-mono uppercase bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Número do Renavam *</Label>
                        <Input
                          value={renavam}
                          onChange={(e) => setRenavam(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          placeholder="00123456789"
                          maxLength={11}
                          className="h-8 rounded-xl text-xs font-mono bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Combustível</Label>
                        <Select value={fuel} onValueChange={setFuel}>
                          <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
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
                        <Label className="text-[11px] font-semibold">Hodômetro (KM)</Label>
                        <Input
                          value={mileage}
                          onChange={(e) => setMileage(e.target.value)}
                          placeholder="Ex: 45.000 km"
                          className="h-8 rounded-xl text-xs font-mono bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Valor FIPE / Comercial</Label>
                        <Input
                          value={formatCurrencyInput(fipeValueStr)}
                          onChange={(e) => setFipeValueStr(e.target.value)}
                          placeholder="R$ 50.000,00"
                          className="h-8 rounded-xl text-xs font-mono font-bold bg-background"
                        />
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <VehicleCategorySelector value={category} onChange={setCategory} compact />
                    </div>

                    {/* Gerenciador de Implementos */}
                    <ImplementosManager
                      implementos={implementos}
                      onChange={setImplementos}
                      category={category}
                    />

                    {/* Resumo de Precificação Automática */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                          Mensalidade Estimada (Tabela):
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Veículo ({BRL(baseVehicleMonthlyFee)})
                          {implementosMonthlyFee > 0 ? ` + Implementos (${BRL(implementosMonthlyFee)})` : ""}
                        </span>
                      </div>
                      <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                        {BRL(totalCalculatedMonthlyFee)}/mês
                      </span>
                    </div>
                  </div>
                )}

                {/* MODO 2: Vincular Veículo Existente da Base / Avulso */}
                {vehicleMode === "existing" && (
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="size-3.5 text-primary" />
                        <Label className="text-xs font-bold text-foreground">Selecionar Veículo Existente</Label>
                      </div>
                      {selectedExistingVehicleId && onNavigateToVehicle && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const v = fleetVehicles.find((x: any) => x.id === selectedExistingVehicleId);
                            setOpen(false);
                            onNavigateToVehicle(selectedExistingVehicleId, v?.plate);
                          }}
                          className="h-7 rounded-lg text-[11px] font-bold gap-1 border-primary/40 text-primary"
                        >
                          <ExternalLink className="size-3" />
                          Abrir em Veículos (Coberturas & Mensalidade)
                        </Button>
                      )}
                    </div>
                    <Select value={selectedExistingVehicleId} onValueChange={setSelectedExistingVehicleId}>
                      <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background font-semibold">
                        <SelectValue placeholder="Escolha um veículo cadastrado..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-60">
                        {fleetVehicles.map((v: any) => {
                          const isAvulso =
                            !v.members || v.members.document === "00000000000" || v.members.name?.includes("Avulso");
                          return (
                            <SelectItem key={v.id} value={v.id}>
                              <span className="font-mono font-bold">{v.plate}</span> — {v.brand} {v.model} (
                              {v.year || "S/A"})
                              {isAvulso ? " [AVULSO DISPONÍVEL]" : ` [Atual: ${v.members?.name}]`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Ao salvar, o veículo selecionado será vinculado a este associado. Você também pode clicar em
                      &ldquo;Abrir em Veículos&rdquo; para gerenciar coberturas (ativas/inativas) e mensalidades.
                    </p>
                  </div>
                )}

                {/* MODO 3: Associado Sem Veículo no Momento */}
                {vehicleMode === "none" && (
                  <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-1">
                    <div className="size-7 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                      <Car className="size-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Associado Avulso (Sem Veículo)</h4>
                    <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-tight">
                      O associado será cadastrado sem veículo inicial. Você poderá vincular veículos depois.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <AsaasFormSeal />
            <span className="text-[10px] text-muted-foreground hidden sm:inline-flex items-center gap-1">
              <Clock className="size-3 text-primary" />
              Ao concluir, data e horário do cadastro são registrados automaticamente.
            </span>
          </div>
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="rounded-xl h-8 text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="rounded-xl h-8 text-xs font-semibold px-4 bg-primary text-primary-foreground shadow-xs"
            >
              {submit.isPending ? "Salvando..." : member ? "Salvar Alterações" : "Concluir Cadastro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VehicleDialog({ memberId, memberName }: { memberId: string; memberName: string }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [color, setColor] = useState("");
  const [chassi, setChassi] = useState("");
  const [renavam, setRenavam] = useState("");
  const [fuel, setFuel] = useState("Flex");
  const [mileage, setMileage] = useState("");
  const [usage, setUsage] = useState("Particular");
  const [fipeValueStr, setFipeValueStr] = useState("5000000"); // R$ 50.000,00
  const [category, setCategory] = useState("Leves e utilitários");
  const [implementos, setImplementos] = useState<ImplementoItem[]>([]);

  const fipeValue = Number(fipeValueStr.replace(/\D/g, "")) / 100 || 50000;
  const baseFee = useMemo(
    () => calculateBaseMonthlyFee(categoryToVehicleType(category), fipeValue),
    [category, fipeValue]
  );
  const implementosFee = useMemo(
    () => implementos.reduce((acc, i) => acc + (i.monthlyFee || 0), 0),
    [implementos]
  );
  const totalMonthlyFee = baseFee + implementosFee;

  const submit = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (!plate || plate.length < 7) throw new Error("Informe uma placa válida.");
      if (!brand || !model) throw new Error("Informe a marca e o modelo do veículo.");

      await addVehicle({
        data: {
          companyId,
          memberId,
          plate: plate.toUpperCase().trim(),
          brand,
          model,
          year: parseInt(year) || new Date().getFullYear(),
          color,
          category,
          monthly_fee: totalMonthlyFee,
          fipe_value: fipeValue,
        },
      });

      saveVehicleExtraData(companyId, undefined, plate, {
        chassi: chassi.trim().toUpperCase(),
        renavam: renavam.trim(),
        color,
        fuel,
        mileage,
        usage,
        fipeValue,
        implementos,
        registeredAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!", {
        description: `Mensalidade total calculada: ${BRL(totalMonthlyFee)}/mês.`,
      });
      setOpen(false);
      setPlate("");
      setBrand("");
      setModel("");
      setColor("");
      setChassi("");
      setRenavam("");
      setMileage("");
      setImplementos([]);
      setCategory("Leves e utilitários");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-6.5 text-[11px] rounded-lg border-border/80 text-foreground">
          <Car className="size-3 text-primary" /> + Cadastrar Veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] flex flex-col justify-between rounded-2xl border-border bg-card shadow-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Car className="size-4.5 text-primary" />
            Cadastrar Veículo — {memberName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Preencha os dados completos do veículo (Chassi, Renavam, FIPE) e adicione implementos se houver
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto min-h-0 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Placa (Mercosul) *</Label>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                placeholder="ABC1234"
                maxLength={7}
                className="h-8.5 rounded-xl text-xs font-mono font-bold uppercase bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ano Fab./Mod. *</Label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2023"
                maxLength={4}
                className="h-8.5 rounded-xl text-xs bg-background font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cor</Label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Branco, Prata"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Marca *</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Chevrolet, Toyota, Volvo"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modelo *</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Onix Plus 1.0 Turbo"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Número do Chassi *</Label>
              <Input
                value={chassi}
                onChange={(e) => setChassi(e.target.value.toUpperCase())}
                placeholder="Ex: 9BGKT69F0P0284719"
                maxLength={20}
                className="h-8.5 rounded-xl text-xs font-mono uppercase bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Número do Renavam *</Label>
              <Input
                value={renavam}
                onChange={(e) => setRenavam(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="Ex: 01384719283"
                maxLength={11}
                className="h-8.5 rounded-xl text-xs font-mono bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Combustível</Label>
              <Select value={fuel} onValueChange={setFuel}>
                <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Flex">Flex</SelectItem>
                  <SelectItem value="Gasolina">Gasolina</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Etanol">Etanol</SelectItem>
                  <SelectItem value="GNV">GNV</SelectItem>
                  <SelectItem value="Elétrico/Híbrido">Elétrico / Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Finalidade de Uso</Label>
              <Select value={usage} onValueChange={setUsage}>
                <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
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
              <Label className="text-xs font-semibold">Valor FIPE / Comercial *</Label>
              <Input
                value={formatCurrencyInput(fipeValueStr)}
                onChange={(e) => setFipeValueStr(e.target.value)}
                placeholder="R$ 50.000,00"
                className="h-8.5 rounded-xl text-xs font-mono font-bold bg-background"
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

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-foreground block">
                Mensalidade Total Calculada (Tabela de Preços):
              </span>
              <span className="text-[10px] text-muted-foreground">
                Veículo: {BRL(baseFee)}
                {implementosFee > 0 ? ` + Implementos: ${BRL(implementosFee)}` : ""}
              </span>
            </div>
            <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
              {BRL(totalMonthlyFee)}/mês
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
          <AsaasFormSeal />
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl h-8 text-xs font-medium">
              Cancelar
            </Button>
            <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending} className="rounded-xl h-8 text-xs font-semibold px-4 bg-primary text-primary-foreground shadow-xs">
              {submit.isPending ? "Salvando..." : "Salvar Veículo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMemberButton({ memberId }: { memberId: string }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  
  const remove = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const res = await deleteMember({ data: { id: memberId, companyId } });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      toast.success("Associado excluído.");
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Associado</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este associado? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => remove.mutate()} 
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MembersPage() {
  const { companyId } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dueDayFilter, setDueDayFilter] = useState("ALL");
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [newMemberOpen, setNewMemberOpen] = useState(false);

  const fetchMembers = useServerFn(getMembers);
  const { data: members, isLoading } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const memberList = members || [];

  // Mapear dias de vencimento e dados complementares (CNH, data/hora de cadastro)
  const memberDueDays = useMemo(() => {
    return getAllMemberDueDays(companyId || "default");
  }, [companyId, members]);

  const membersExtraMap = useMemo(() => {
    return getAllMembersExtraData(companyId || "default");
  }, [companyId, members, editingMember, newMemberOpen]);

  const handleOpenVehicleInMenu = (vehicleId: string, plate?: string) => {
    const params = new URLSearchParams();
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (plate) params.set("plate", plate);
    window.location.href = `/vehicles?${params.toString()}`;
  };

  const filteredMembers = memberList.filter((m: any) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.document?.includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.vehicles?.some(
        (v: any) =>
          v.plate?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q) ||
          v.brand?.toLowerCase().includes(q)
      );

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && m.status === "active") ||
      (statusFilter === "INACTIVE" && m.status !== "active");

    const memberDue = memberDueDays[m.id] ?? Number((m as any).due_day || (m as any).preferred_due_day || 20);
    const matchesDueDay = dueDayFilter === "ALL" || String(memberDue) === dueDayFilter;

    return matchesSearch && matchesStatus && matchesDueDay;
  });

  const totalMembers = memberList.length;
  const activeMembers = memberList.filter((m: any) => m.status === "active").length;
  const inactiveMembers = memberList.filter((m: any) => m.status !== "active").length;
  const totalVehicles = memberList.reduce((acc: number, m: any) => acc + (m.vehicles?.length || 0), 0);

  const qc = useQueryClient();
  const updateStatusFn = useServerFn(updateMemberStatus);
  const toggleStatusMutation = useMutation({
    mutationFn: (vars: { data: { id: string; companyId: string; status: "active" | "inactive" } }) =>
      updateStatusFn(vars),
    onSuccess: (_, vars) => {
      toast.success(
        vars.data.status === "active"
          ? "Associado ativado com sucesso! Ele participará dos próximos lotes de fechamento."
          : "Associado desativado. Ele foi desconsiderado dos lotes de fechamento."
      );
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: any) => toast.error("Erro ao alterar status: " + err.message),
  });

  return (
    <AppLayout
      title="Gestão de Associados"
      subtitle="Cadastre seus clientes com dados completos (CNH, data/hora), gerencie veículos e implementos"
      actions={
        <Button
          onClick={() => setNewMemberOpen(true)}
          className="rounded-xl bg-primary text-primary-foreground gap-2 font-bold shadow-xs text-xs h-9"
        >
          <Plus className="size-4" /> Novo Associado
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPIs Resumidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total de Associados
                </span>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalMembers}</p>
              </div>
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="size-4.5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Associados Ativos
                </span>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activeMembers}
                </p>
              </div>
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="size-4.5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Desativados / Inativos
                </span>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {inactiveMembers}
                </p>
              </div>
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <UserX className="size-4.5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Veículos Vinculados
                </span>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalVehicles}</p>
              </div>
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Car className="size-4.5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar associado por nome, CPF, telefone ou placa..."
                  className="pl-9 h-9 rounded-xl bg-background border-border/80 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Select value={dueDayFilter} onValueChange={setDueDayFilter}>
                  <SelectTrigger className="h-9 w-[165px] rounded-xl bg-background border-border/80 text-xs font-medium">
                    <Calendar className="size-3 mr-1.5 text-amber-600" />
                    <SelectValue placeholder="Vencimento" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos Vencimentos</SelectItem>
                    <SelectItem value="5">Vence Dia 05</SelectItem>
                    <SelectItem value="10">Vence Dia 10</SelectItem>
                    <SelectItem value="15">Vence Dia 15</SelectItem>
                    <SelectItem value="20">Vence Dia 20</SelectItem>
                    <SelectItem value="25">Vence Dia 25</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[145px] rounded-xl bg-background border-border/80 text-xs font-medium">
                    <Filter className="size-3 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="INACTIVE">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listagem de Associados em Tabela/Lista */}
        {isLoading ? (
          <div className="flex justify-center p-8 text-xs text-muted-foreground">Carregando associados...</div>
        ) : memberList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-2xl border border-dashed border-border/80 bg-card">
            <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <User className="size-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Nenhum associado cadastrado</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Comece cadastrando seu primeiro associado para gerenciar a proteção veicular.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap justify-center pt-1">
              <Button
                onClick={() => setNewMemberOpen(true)}
                className="rounded-xl bg-primary text-primary-foreground gap-2 font-bold shadow-xs text-xs h-9"
              >
                <Plus className="size-4" /> Cadastrar Associado
              </Button>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border p-10 text-center bg-card">
            <User className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">Nenhum associado encontrado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tente alterar os termos de busca ou filtros.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setDueDayFilter("ALL");
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
                    <th className="px-3 py-3 sm:px-3.5">Associado / Registro</th>
                    <th className="px-3 py-3 sm:px-3.5 whitespace-nowrap">CNH / Validade</th>
                    <th className="px-3 py-3 sm:px-3.5 whitespace-nowrap">Vencimento</th>
                    <th className="px-3 py-3 sm:px-3.5">Contatos</th>
                    <th className="px-3 py-3 sm:px-3.5">Veículos (Clique p/ Coberturas)</th>
                    <th className="px-3 py-3 sm:px-3.5 whitespace-nowrap">Consultor</th>
                    <th className="px-3 py-3 sm:px-3.5 text-center">Status</th>
                    <th className="px-3 py-3 sm:px-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredMembers.map((m: any) => {
                    const partner = Array.isArray(m.partners) ? m.partners[0] : m.partners;
                    const vehiclesList = m.vehicles || [];
                    const due = memberDueDays[m.id] ?? Number((m as any).due_day || (m as any).preferred_due_day || 20);
                    const extra = membersExtraMap[m.id] || {};
                    const regStamp = extra.registeredAt || m.created_at;

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setEditingMember(m)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        title="Clique em qualquer lugar da linha para editar este associado"
                      >
                        {/* Associado + Data/Hora do Cadastro */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-7.5 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {m.name?.charAt(0)?.toUpperCase() || "A"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-xs leading-tight truncate max-w-[140px] sm:max-w-[180px] group-hover:text-primary transition-colors">
                                {m.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                CPF: {formatCpfCnpj(m.document)}
                              </p>
                              {regStamp && (
                                <p className="text-[9px] text-primary/80 font-mono flex items-center gap-1 mt-0.5">
                                  <Clock className="size-2.5" />
                                  {formatDateTimeBR(regStamp)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CNH / Validade */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle whitespace-nowrap">
                          {extra.cnhExpiryDate ? (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-primary/30 text-foreground px-2 py-0"
                              >
                                Val: {extra.cnhExpiryDate.split("-").reverse().join("/")}
                              </Badge>
                              {extra.cnhCategory && (
                                <span className="text-[9px] text-muted-foreground block font-semibold">
                                  Cat. {extra.cnhCategory} {extra.cnhNumber ? `• ${extra.cnhNumber}` : ""}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Não informada</span>
                          )}
                        </td>

                        {/* Vencimento do Boleto */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-mono font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1"
                          >
                            <Calendar className="size-3 text-amber-600 dark:text-amber-400" />
                            Dia {due}
                          </Badge>
                        </td>

                        {/* Contatos */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="space-y-1 min-w-0">
                            {m.phone ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground">
                                  <Phone className="size-3 text-primary shrink-0" />
                                  {formatPhone(m.phone)}
                                </span>
                                <a
                                  href={`https://wa.me/55${m.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="WhatsApp"
                                  className="size-5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors"
                                >
                                  <MessageCircle className="size-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                            {m.email && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[180px]">
                                <Mail className="size-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{m.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Veículos Protegidos (Clicável para direcionar na aba Veículos com Coberturas e Mensalidade) */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5 min-w-[180px] sm:min-w-[210px]">
                            {vehiclesList.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic block">
                                Nenhum veículo vinculado
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {vehiclesList.map((v: any) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleOpenVehicleInMenu(v.id, v.plate)}
                                    title="Clique para abrir este veículo na aba Veículos (Ficha, Coberturas e Mensalidade)"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 hover:bg-primary hover:text-primary-foreground border border-primary/30 text-[11px] transition-all cursor-pointer group/veh shadow-2xs"
                                  >
                                    <span className="font-mono font-bold text-foreground group-hover/veh:text-primary-foreground">
                                      {v.plate}
                                    </span>
                                    <span className="text-muted-foreground group-hover/veh:text-primary-foreground/90 truncate max-w-[110px]">
                                      {v.brand} {v.model}
                                    </span>
                                    <ExternalLink className="size-3 text-primary group-hover/veh:text-primary-foreground shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                            <div>
                              <VehicleDialog memberId={m.id} memberName={m.name} />
                            </div>
                          </div>
                        </td>

                        {/* Consultor / Parceiro */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle whitespace-nowrap">
                          {partner?.name ? (
                            <Badge
                              variant="outline"
                              className="text-[9.5px] sm:text-[10px] border-primary/30 text-primary font-semibold whitespace-nowrap px-2.5 py-0.5 rounded-full inline-flex items-center leading-none"
                            >
                              {partner.name}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Direto</span>
                          )}
                        </td>

                        {/* Status com Toggle Interativo (Ativar / Desativar) */}
                        <td
                          className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5 bg-muted/40 hover:bg-muted/60 transition-colors px-2 py-1 rounded-xl border border-border/60">
                            <Switch
                              checked={m.status === "active"}
                              onCheckedChange={(checked) => {
                                const newStatus = checked ? "active" : "inactive";
                                toggleStatusMutation.mutate({
                                  data: {
                                    id: m.id,
                                    companyId: companyId!,
                                    status: newStatus,
                                  },
                                });
                              }}
                              disabled={
                                toggleStatusMutation.isPending &&
                                (toggleStatusMutation.variables as any)?.data?.id === m.id
                              }
                              className="scale-75 data-[state=checked]:bg-emerald-600"
                            />
                            <span
                              className={`text-[10px] font-bold ${
                                m.status === "active"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {m.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                              onClick={() => setEditingMember(m)}
                              title="Editar Associado"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <DeleteMemberButton memberId={m.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modais de Cadastro e Edição de Associado */}
        <MemberDialog
          open={newMemberOpen}
          onOpenChange={setNewMemberOpen}
          onNavigateToVehicle={handleOpenVehicleInMenu}
        />
        {editingMember && (
          <MemberDialog
            open={!!editingMember}
            onOpenChange={(op) => !op && setEditingMember(null)}
            member={editingMember}
            onNavigateToVehicle={handleOpenVehicleInMenu}
          />
        )}
      </div>
    </AppLayout>
  );
}

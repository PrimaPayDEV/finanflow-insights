import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Users, Plus, Settings, UserPlus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getPartners, upsertPartner, createPartnerUser, deletePartner } from "@/lib/partner.functions";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/partners")({
  component: PartnersPage,
});

function PartnersPage() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const fetchPartners = useServerFn(getPartners);
  
  const { data: partners, isLoading } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <AppLayout 
      title="Parceiros" 
      subtitle="Gerencie parceiros, wallets e acessos ao sistema"
      actions={<PartnerDialog />}
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {partners?.map((partner) => (
          <Card key={partner.id} className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <Users className="size-4" />
                </div>
                <span className="truncate">{partner.name}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate">{partner.email || "Sem e-mail"}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2 bg-muted/20 p-3 rounded-xl border border-border/60">
                <div className="flex items-center gap-2 text-xs">
                  <KeyRound className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Wallet Asaas:</span>
                  <span className="font-mono font-bold truncate max-w-[150px] text-foreground">
                    {partner.asaas_wallet_id}
                  </span>
                </div>
                {(partner.split_percent ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Repasse Fixo:</span>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                      {partner.split_percent}%
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <PartnerDialog partner={partner} />
                <PartnerUserDialog partner={partner} />
              </div>
              <div className="flex gap-2 pt-2 border-t border-border/60">
                <PartnerActions partner={partner} />
              </div>
            </CardContent>
          </Card>
        ))}
        {partners?.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
            Nenhum parceiro cadastrado.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function PartnerDialog({ partner }: { partner?: any }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const saveAction = useServerFn(upsertPartner);
  const { companyId } = useAuth();
  
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await saveAction({
        data: {
          id: partner?.id,
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          asaas_wallet_id: fd.get("asaas_wallet_id") as string,
          split_percent: fd.get("split_percent") ? Number(fd.get("split_percent")) : undefined,
          companyId: companyId!,
        },
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    },
    onSuccess: () => {
      toast.success(partner ? "Parceiro atualizado" : "Parceiro criado");
      qc.invalidateQueries({ queryKey: ["partners"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={partner ? "secondary" : "default"} size={partner ? "sm" : "default"}>
          {partner ? <Settings className="size-4 mr-1" /> : <Plus className="size-4 mr-2" />}
          {partner ? "Configurar" : "Novo Parceiro"}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
          <DialogTitle className="text-base font-bold">{partner ? `Configurar ${partner.name}` : "Cadastrar Novo Parceiro"}</DialogTitle>
          <DialogDescription className="text-xs">Configure os dados do parceiro e carteira Asaas para split</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="p-4 sm:p-5 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Parceiro *</Label>
              <Input name="name" defaultValue={partner?.name} required className="rounded-xl text-xs h-8.5 bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-mail (Opcional)</Label>
              <Input name="email" type="email" defaultValue={partner?.email} className="rounded-xl text-xs h-8.5 bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Wallet ID Asaas *</Label>
                <Input name="asaas_wallet_id" defaultValue={partner?.asaas_wallet_id} required className="rounded-xl text-xs font-mono h-8.5 bg-background" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Repasse (%)</Label>
                <Input name="split_percent" type="number" step="0.01" defaultValue={partner?.split_percent} placeholder="Ex: 10" className="rounded-xl text-xs font-mono font-bold h-8.5 bg-background" />
              </div>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
            <AsaasFormSeal />
            <Button type="submit" disabled={save.isPending} size="sm" className="rounded-xl text-xs font-bold h-8 px-4 w-full sm:w-auto">
              Salvar Parceiro
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PartnerUserDialog({ partner }: { partner: any }) {
  const [open, setOpen] = useState(false);
  const createUser = useServerFn(createPartnerUser);
  const { companyId } = useAuth();
  
  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await createUser({
        data: {
          partnerId: partner.id,
          companyId: companyId!,
          email: fd.get("email") as string,
          password: fd.get("password") as string,
        },
      });
      if (!res.ok) throw new Error("Erro ao criar usuário");
    },
    onSuccess: () => {
      toast.success("Acesso do parceiro criado com sucesso!");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <UserPlus className="size-4 mr-1" /> Acesso (Login)
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
          <DialogTitle className="text-base font-bold">Criar Acesso para {partner.name}</DialogTitle>
          <DialogDescription className="text-xs">Defina o login e senha de acesso ao portal do parceiro</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }}>
          <div className="p-4 sm:p-5 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-mail (Login) *</Label>
              <Input name="email" type="email" required placeholder="parceiro@email.com" defaultValue={partner.email} className="rounded-xl text-xs h-8.5 bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Senha Temporária *</Label>
              <Input name="password" required placeholder="Mínimo 6 caracteres" minLength={6} className="rounded-xl text-xs h-8.5 bg-background" />
            </div>
          </div>
          <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl text-xs h-8">
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending} size="sm" className="rounded-xl text-xs font-bold h-8 px-4">
              Criar Usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PartnerActions({ partner }: { partner: any }) {
  const qc = useQueryClient();
  const deleteActionFn = useServerFn(deletePartner);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteActionFn({ data: { id: partner.id } });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => {
      toast.success("Parceiro excluído permanentemente");
      qc.invalidateQueries({ queryKey: ["partners"] });
    }
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="flex-1">
          <Trash2 className="size-4 mr-1" /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Excluir Parceiro
          </AlertDialogTitle>
          <AlertDialogDescription>
            Deseja excluir o parceiro {partner.name}? Isso também apagará as regras de split e os acessos vinculados a ele.
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => deleteMutation.mutate()} 
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

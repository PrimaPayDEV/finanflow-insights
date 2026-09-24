import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Users, Plus, Settings, UserPlus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {partners?.map((partner) => (
          <Card key={partner.id} className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                {partner.name}
              </CardTitle>
              <CardDescription>{partner.email || "Sem e-mail"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Wallet ID:</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">
                    {partner.asaas_wallet_id}
                  </span>
                </div>
                {(partner.split_percent ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Repasse Fixo:</span>
                    <span className="font-semibold text-xs text-green-600">
                      {partner.split_percent}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <PartnerDialog partner={partner} />
                <PartnerUserDialog partner={partner} />
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t">
                <PartnerActions partner={partner} />
              </div>
            </CardContent>
          </Card>
        ))}
        {partners?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{partner ? `Configurar ${partner.name}` : "Cadastrar Novo Parceiro"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Parceiro</Label>
            <Input name="name" defaultValue={partner?.name} required />
          </div>
          <div className="space-y-2">
            <Label>E-mail (Opcional)</Label>
            <Input name="email" type="email" defaultValue={partner?.email} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Wallet ID do Asaas</Label>
              <Input name="asaas_wallet_id" defaultValue={partner?.asaas_wallet_id} required />
            </div>
            <div className="space-y-2">
              <Label>Repasse (%)</Label>
              <Input name="split_percent" type="number" step="0.01" defaultValue={partner?.split_percent} placeholder="Ex: 10" />
            </div>
          </div>
          <Button type="submit" disabled={save.isPending} className="w-full">
            Salvar Parceiro
          </Button>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Acesso para {partner.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail (Login)</Label>
            <Input name="email" type="email" required placeholder="parceiro@email.com" defaultValue={partner.email} />
          </div>
          <div className="space-y-2">
            <Label>Senha Temporária</Label>
            <Input name="password" required placeholder="Mínimo 6 caracteres" minLength={6} />
          </div>
          <Button type="submit" disabled={create.isPending} className="w-full">
            Criar Usuário
          </Button>
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

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Plus, Settings, UserPlus, KeyRound, ShieldAlert, Lock, Unlock, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getCompanies, upsertCompany, createCompanyAdmin, deleteCompany, toggleCompanyStatus } from "@/lib/admin.functions";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompaniesPage,
});

function AdminCompaniesPage() {
  const { companyName } = useAuth();
  
  if (companyName !== "Prima Hub") {
    return (
      <AppLayout title="Acesso Negado">
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
          <ShieldAlert className="size-16 text-destructive" />
          <h2 className="text-2xl font-bold">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Esta página é exclusiva para administradores da Prima Hub.
          </p>
        </div>
      </AppLayout>
    );
  }

  const qc = useQueryClient();
  const fetchCompanies = useServerFn(getCompanies);
  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin_companies"],
    queryFn: () => fetchCompanies(),
  });

  return (
    <AppLayout 
      title="Gestão de Empresas" 
      subtitle="Painel exclusivo Prima Hub para criar e gerenciar as empresas clientes (Multi-Tenant)"
      actions={<CompanyDialog />}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies?.map((company) => (
          <Card key={company.id} className="relative overflow-hidden">
            {company.name === "Prima Hub" && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                Sua Empresa
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                {company.name}
              </CardTitle>
              <CardDescription>CNPJ: {company.document_cnpj || "Não informado"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Chave Asaas:</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">
                    {company.asaas_api_key ? "Configurada" : "Pendente"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium text-xs ${company.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {company.is_active ? "Ativa" : "Bloqueada"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <CompanyDialog company={company} />
                <AdminUserDialog companyId={company.id} companyName={company.name} />
              </div>
              {company.name !== "Prima Hub" && (
                <div className="flex gap-2 mt-2 pt-2 border-t">
                  <CompanyActions company={company} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}

function CompanyDialog({ company }: { company?: any }) {
  const [open, setOpen] = useState(false);
  const [appMode, setAppMode] = useState<string>(company?.app_mode ?? 'full');
  const qc = useQueryClient();
  const saveAction = useServerFn(upsertCompany);
  
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await saveAction({
        data: {
          id: company?.id,
          name: fd.get("name") as string,
          document_cnpj: fd.get("document_cnpj") as string,
          asaas_api_key: fd.get("asaas_api_key") as string,
          segment: fd.get("segment") as string,
          app_mode: fd.get("app_mode") as any,
        },
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    },
    onSuccess: () => {
      toast.success(company ? "Empresa atualizada" : "Empresa criada");
      qc.invalidateQueries({ queryKey: ["admin_companies"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={company ? "outline" : "default"} size={company ? "sm" : "default"}>
          {company ? <Settings className="size-4 mr-1" /> : <Plus className="size-4 mr-2" />}
          {company ? "Configurar" : "Nova Empresa"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company ? `Configurar ${company.name}` : "Cadastrar Nova Empresa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa (Fantasia)</Label>
            <Input name="name" defaultValue={company?.name} required />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input name="document_cnpj" defaultValue={company?.document_cnpj} />
          </div>
          <div className="space-y-2">
            <Label>Segmento (Ramo de Atividade)</Label>
            <Input name="segment" defaultValue={company?.segment} placeholder="Ex: Proteção Veicular, Imobiliária, etc" />
          </div>
          <div className="space-y-2">
            <Label>Finalidade / Uso da Plataforma</Label>
            <input type="hidden" name="app_mode" value={appMode} />
            <Select value={appMode} onValueChange={setAppMode}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Completo (Split, Taxas, Máquinas, Economia)</SelectItem>
                <SelectItem value="billing">Apenas Cobranças (Boletos, Faturas, Carnês)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chave de API do Asaas</Label>
            <Input name="asaas_api_key" type="password" defaultValue={company?.asaas_api_key} />
            <p className="text-xs text-muted-foreground">
              Deixe em branco se a empresa ainda não tiver a chave.
            </p>
          </div>
          <Button type="submit" disabled={save.isPending} className="w-full">
            Salvar Empresa
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminUserDialog({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [open, setOpen] = useState(false);
  const createUser = useServerFn(createCompanyAdmin);
  
  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await createUser({
        data: {
          companyId,
          email: fd.get("email") as string,
          password: fd.get("password") as string,
        },
      });
      if (!res.ok) throw new Error("Erro ao criar usuário");
    },
    onSuccess: () => {
      toast.success("Usuário administrador criado!");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <UserPlus className="size-4 mr-1" /> Usuário Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Acesso para {companyName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail (Login)</Label>
            <Input name="email" type="email" required placeholder="admin@empresa.com" />
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

function CompanyActions({ company }: { company: any }) {
  const qc = useQueryClient();
  const toggleAction = useServerFn(toggleCompanyStatus);
  const deleteActionFn = useServerFn(deleteCompany);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await toggleAction({ data: { companyId: company.id, isActive: !company.is_active } });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => {
      toast.success(`Empresa ${company.is_active ? 'bloqueada' : 'desbloqueada'}`);
      qc.invalidateQueries({ queryKey: ["admin_companies"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteActionFn({ data: { companyId: company.id } });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => {
      toast.success("Empresa excluída permanentemente");
      qc.invalidateQueries({ queryKey: ["admin_companies"] });
    }
  });

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant={company.is_active ? "secondary" : "default"} size="sm" className="flex-1">
            {company.is_active ? <Lock className="size-4 mr-1" /> : <Unlock className="size-4 mr-1" />}
            {company.is_active ? "Bloquear" : "Desbloquear"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {company.is_active ? "Bloquear Empresa" : "Desbloquear Empresa"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {company.is_active 
                ? `Tem certeza que deseja bloquear o acesso da empresa ${company.name}? Os usuários desta empresa perderão acesso ao sistema e verão uma tela de bloqueio.`
                : `Deseja restaurar o acesso da empresa ${company.name}? O painel voltará a funcionar normalmente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleMutation.mutate()}>
              {company.is_active ? "Sim, bloquear" : "Sim, desbloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="flex-1">
            <Trash2 className="size-4 mr-1" /> Excluir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="size-5" />
              Atenção: Exclusão Permanente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente <strong>excluir definitivamente</strong> a empresa {company.name} e 
              <strong> TODOS os seus dados</strong> (Lojistas, Extratos, Fechamentos, Usuários)?
              <br/><br/>
              Esta ação <strong>não pode ser desfeita</strong> de forma alguma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

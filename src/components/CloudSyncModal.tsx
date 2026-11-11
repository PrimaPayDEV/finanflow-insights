import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  Copy,
  FileDown,
  FileUp,
  Sparkles,
  AlertCircle,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { pushCloudSyncData, pullCloudSyncData } from "@/lib/cloud-sync.functions";
import { loadLocalData, saveLocalData } from "@/lib/veicular";

interface CloudSyncModalProps {
  companyId?: string;
  trigger?: React.ReactNode;
}

const SYNC_KEYS = [
  "member_due_days",
  "members_extra",
  "vehicles_extra",
  "cotacoes",
  "produtos",
  "cotas",
  "eventos",
  "termos_aceitos",
];

export function CloudSyncModal({ companyId, trigger }: CloudSyncModalProps) {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState("");
  const [showImportBox, setShowImportBox] = useState(false);

  const pushFn = useServerFn(pushCloudSyncData);
  const pullFn = useServerFn(pullCloudSyncData);
  const qc = useQueryClient();

  const cId = companyId || "default";

  // Coleta dados locais deste computador
  const collectLocalPayload = () => {
    const payload: Record<string, any> = {};
    SYNC_KEYS.forEach((key) => {
      const data = loadLocalData(cId, key, null);
      if (data && (typeof data !== "object" || Object.keys(data).length > 0)) {
        payload[key] = data;
      }
    });
    return payload;
  };

  // Aplica dados no localStorage deste computador
  const applyPayloadToLocal = (dataMap: Record<string, any>) => {
    let count = 0;
    Object.entries(dataMap).forEach(([key, val]) => {
      if (val != null) {
        saveLocalData(cId, key, val);
        count++;
      }
    });
    return count;
  };

  // Subir dados deste computador para a nuvem
  const handlePush = async () => {
    setSyncing(true);
    try {
      const payload = collectLocalPayload();
      const res = await pushFn({ data: { companyId: cId, data: payload } });
      if (res?.ok) {
        toast.success("Dados deste computador enviados para a nuvem com sucesso!");
        setLastSync(new Date().toLocaleTimeString());
        qc.invalidateQueries({ queryKey: ["members"] });
        qc.invalidateQueries({ queryKey: ["vehicles"] });
      } else {
        toast.error("Erro ao enviar dados para a nuvem.");
      }
    } catch (err: any) {
      toast.error("Falha no envio: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Baixar dados da nuvem para este computador
  const handlePull = async () => {
    setSyncing(true);
    try {
      const res = await pullFn({ data: { companyId: cId } });
      if (res?.ok && res.data) {
        const count = applyPayloadToLocal(res.data);
        toast.success(`Dados baixados da nuvem e sincronizados (${count} coleções atualizadas)!`);
        setLastSync(new Date().toLocaleTimeString());
        qc.invalidateQueries({ queryKey: ["members"] });
        qc.invalidateQueries({ queryKey: ["vehicles"] });
      } else {
        toast.info("Nenhum dado adicional encontrado na nuvem.");
      }
    } catch (err: any) {
      toast.error("Falha ao baixar dados: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Exportar arquivo JSON com todos os dados locais
  const handleExportJson = () => {
    const payload = collectLocalPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planmais_dados_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo de backup gerado com sucesso!");
  };

  // Importar JSON diretamente
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const count = applyPayloadToLocal(parsed);
      // Também envia para a nuvem para que fique salvo em definitivo
      pushFn({ data: { companyId: cId, data: parsed } }).catch(() => {});
      toast.success(`${count} coleções de dados importadas com sucesso!`);
      setImportJsonText("");
      setShowImportBox(false);
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
    } catch {
      toast.error("Texto JSON inválido. Verifique o formato e tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium px-2.5 transition-all"
            title="Sincronizar dados entre computadores"
          >
            <Cloud className="size-3.5" />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Laptop className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Sincronização entre Computadores</DialogTitle>
              <DialogDescription className="text-xs">
                Compartilhe e unifique cadastros de associados, veículos e mensalidades com outros computadores ativos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-foreground">Sincronização em Nuvem Ativa</span>
            </div>
            {lastSync && (
              <span className="text-[10px] text-muted-foreground font-mono">Última sinc.: {lastSync}</span>
            )}
          </div>

          {/* Ações Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card transition-all space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CloudUpload className="size-4 text-primary shrink-0" />
                <span>Enviar Deste Computador</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Envie todos os dados salvos neste computador para a nuvem central.
              </p>
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs h-8 gap-1.5"
                disabled={syncing}
                onClick={handlePush}
              >
                {syncing ? <RefreshCw className="size-3 animate-spin" /> : <CloudUpload className="size-3" />}
                Subir para Nuvem
              </Button>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card transition-all space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CloudDownload className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Baixar do Outro Computador</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Puxe os cadastros de veículos e mensalidades enviados pelo outro computador.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                disabled={syncing}
                onClick={handlePull}
              >
                {syncing ? <RefreshCw className="size-3 animate-spin" /> : <CloudDownload className="size-3" />}
                Baixar da Nuvem
              </Button>
            </div>
          </div>

          {/* Backup Direto por Arquivo */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                Clonagem Instantânea (Arquivo de Backup)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Você também pode exportar um arquivo direto no computador com os dados e carregá-lo no outro para garantir 100% de paridade instantânea.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs h-8 gap-1.5"
                onClick={handleExportJson}
              >
                <FileDown className="size-3" />
                Exportar Arquivo
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs h-8 gap-1.5"
                onClick={() => setShowImportBox(!showImportBox)}
              >
                <FileUp className="size-3" />
                Importar Arquivo
              </Button>
            </div>

            {showImportBox && (
              <div className="pt-2 space-y-2">
                <textarea
                  className="w-full h-24 p-2 text-[10px] font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Cole aqui o conteúdo do arquivo JSON de backup..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5"
                  disabled={!importJsonText.trim()}
                  onClick={handleImportJson}
                >
                  <CheckCircle2 className="size-3" />
                  Aplicar Dados Importados
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


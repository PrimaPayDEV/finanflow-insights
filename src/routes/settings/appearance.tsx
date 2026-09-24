import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Palette, Image as ImageIcon, PaintBucket, Store } from "lucide-react";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/settings/appearance")({
  head: () => ({
    meta: [{ title: "Personalizar Ambiente | PrimaHub" }],
  }),
  component: AppearancePage,
});

function AppearancePage() {
  const { companyId, logoUrl, primaryColor, role, companyName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(primaryColor || "#4f46e5");
  const [name, setName] = useState(companyName || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (role !== "admin") {
    return (
      <AppLayout title="Acesso Negado">
        <div className="p-6 text-center">Você não tem permissão para acessar esta página.</div>
      </AppLayout>
    );
  }

  const handleColorChange = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ primary_color: color })
        .eq("id", companyId);

      if (error) throw error;
      
      document.documentElement.style.setProperty("--primary", color);
      document.documentElement.style.setProperty("--sidebar-primary", color);
      
      toast.success("Cor atualizada com sucesso!");
    } catch (e: any) {
      toast.error(translateError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = async () => {
    if (!companyId) return;
    if (!name.trim()) return toast.error("O nome não pode ser vazio.");
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ name: name.trim() })
        .eq("id", companyId);

      if (error) throw error;
      
      toast.success("Nome atualizado com sucesso! Recarregue a página para ver a mudança.", { duration: 5000 });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(translateError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !companyId) return;
    const file = e.target.files[0];
    
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", companyId);

      if (updateError) throw updateError;
      
      toast.success("Logo atualizada com sucesso! Recarregue a página para ver a mudança.", { duration: 5000 });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(translateError(e.message));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetLogo = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", companyId);

      if (error) throw error;
      
      toast.success("Logo removida com sucesso!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(translateError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout 
      title="Personalizar Ambiente"
      subtitle="Altere as cores e a logo para deixar com a cara da sua empresa."
    >
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="size-5 text-primary" />
              Nome da Empresa
            </CardTitle>
            <CardDescription>
              O nome que será exibido no menu lateral e em outras áreas da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>Nome de Exibição</Label>
                <Input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Planmais - Proteção Veicular"
                />
              </div>
            </div>
            <Button onClick={handleNameChange} disabled={loading || name === companyName}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Nome
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="size-5 text-primary" />
              Logo da Empresa
            </CardTitle>
            <CardDescription>
              Faça upload da logo que aparecerá no menu lateral.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-24 w-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden relative">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo da empresa" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <div className="text-center text-muted-foreground flex flex-col items-center">
                    <ImageIcon className="size-6 mb-1 opacity-50" />
                    <span className="text-xs">Sem Logo</span>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1 w-full">
                <Input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <Palette className="mr-2 size-4" />
                  Upload Nova Logo
                </Button>
                {logoUrl && (
                  <Button 
                    variant="destructive" 
                    onClick={resetLogo} 
                    disabled={loading}
                    className="w-full sm:w-auto sm:ml-2"
                  >
                    Remover
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Recomendado: Imagem retangular (ex: 300x100px) com fundo transparente (PNG).</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PaintBucket className="size-5 text-primary" />
              Cor Primária
            </CardTitle>
            <CardDescription>
              A cor principal do sistema (botões, menus e links).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>Cor (Hexadecimal)</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    type="text" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 font-mono uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleColorChange} disabled={loading || color === primaryColor}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Cor Primária
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

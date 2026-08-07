import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, KeyRound, UserCircle, Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRef } from "react";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Meu Perfil | PrimaHub" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 150;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const base64Avatar = await resizeImage(file);
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: base64Avatar },
      });

      if (error) throw error;
      toast.success("Foto de perfil atualizada!");
      // Forçar atualização do context se necessário, mas o onAuthStateChange já deve capturar
    } catch (error: any) {
      toast.error(translateError(error.message));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(translateError(error.message));
        console.error(error);
        return;
      }

      toast.success("Senha atualizada com sucesso!");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Meu Perfil" subtitle="Gerencie as informações da sua conta">
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                Informações da Conta
              </CardTitle>
              <CardDescription>
                Detalhes do administrador conectado no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Endereço de E-mail</Label>
                <div className="font-medium text-foreground text-base">
                  {user?.email || "Email não encontrado"}
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Status da Conta</Label>
                <div>
                  <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                    Ativa
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Crie uma nova senha para acessar a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Digite a senha novamente"
                  />
                </div>
                
                <Button type="submit" disabled={loading || !password || !confirmPassword}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    "Salvar Nova Senha"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="bg-sidebar">
            <CardContent className="p-6 text-center">
              <div className="relative mx-auto mb-4 h-24 w-24 group">
                <Avatar className="h-24 w-24 ring-4 ring-background">
                  <AvatarImage src={user?.user_metadata?.avatar_url} style={{ objectFit: 'cover' }} />
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {user?.email?.substring(0, 2).toUpperCase() || "AD"}
                  </AvatarFallback>
                </Avatar>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  title="Alterar foto"
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleAvatarChange}
                />
              </div>
              <h3 className="font-semibold text-lg text-sidebar-foreground">Administrador</h3>
              <p className="text-sm text-sidebar-foreground/70 mt-1">Nível de Acesso Total</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}


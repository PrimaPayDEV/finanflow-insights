export function translateError(errorMsg: string | undefined | null): string {
  if (!errorMsg) return "Ocorreu um erro desconhecido.";

  const msg = errorMsg.toLowerCase();

  // Supabase Auth Errors
  if (msg.includes("email not confirmed")) {
    return "E-mail não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.";
  }
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("user already registered")) {
    return "Este e-mail já está cadastrado.";
  }
  if (msg.includes("password should be at least")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (msg.includes("new password should be different")) {
    return "A nova senha deve ser diferente da antiga.";
  }
  if (msg.includes("token has expired or is invalid")) {
    return "O link expirou ou é inválido. Solicite um novo.";
  }
  if (msg.includes("rate limit exceeded")) {
    return "Muitas tentativas. Tente novamente mais tarde.";
  }
  if (msg.includes("user not found")) {
    return "Usuário não encontrado.";
  }
  
  // Database / Network errors
  if (msg.includes("failed to fetch")) {
    return "Erro de conexão. Verifique sua internet.";
  }
  if (msg.includes("violates row-level security policy") || msg.includes("row-level security")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (msg.includes("duplicate key value violates unique constraint")) {
    return "Este registro já existe no sistema.";
  }

  // Fallback, return original but translated prefix if it had one
  return errorMsg;
}

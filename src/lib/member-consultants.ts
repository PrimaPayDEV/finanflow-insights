export type Consultant = {
  id: string;
  name: string;
  asaas_wallet_id: string | null;
  split_percent: number | null;
};

export function memberConsultantIds(member: {
  partner_ids?: string[] | null;
  partner_id?: string | null;
}): string[] {
  return [...new Set(member.partner_ids?.length
    ? member.partner_ids
    : member.partner_id ? [member.partner_id] : [])];
}

export function toggleConsultant(ids: string[], id: string, checked: boolean): string[] {
  return checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id);
}

export function buildConsultantSplits(ids: string[], consultants: Consultant[]) {
  const wallets = new Map<string, number>();
  for (const id of new Set(ids)) {
    const consultant = consultants.find((item) => item.id === id);
    if (!consultant) throw new Error("Consultor vinculado não encontrado neste ambiente. Revise o cadastro do associado.");
    const walletId = consultant.asaas_wallet_id?.trim();
    const percent = Number(consultant.split_percent);
    if (!walletId || !Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error(`Configure a carteira Asaas e um percentual válido para ${consultant.name} antes de gerar o boleto.`);
    }
    const cents = Math.round(percent * 100);
    if (cents <= 0) throw new Error(`O percentual de ${consultant.name} deve ser de pelo menos 0,01%.`);
    wallets.set(walletId, (wallets.get(walletId) ?? 0) + cents);
  }
  const total = [...wallets.values()].reduce((sum, value) => sum + value, 0);
  if (total > 10000) throw new Error("A soma dos percentuais dos consultores não pode ultrapassar 100%.");
  return [...wallets].map(([walletId, cents]) => ({ walletId, percentualValue: cents / 100 }));
}
# Atualizar segredo de webhook

## Contexto
O valor fornecido (`whsec_4sbx2PRKtnQhOQisl7I9YYMjTzeMLmVlvAK-573Vb8U`) tem o formato de um segredo de webhook do Stripe (`whsec_...`), não do Asaas. O usuário também mencionou que o webhook em uso era da "API de teste", o que indica atualização de um segredo existente.

## Ação
1. Atualizar o segredo `STRIPE_WEBHOOK_SECRET` com o novo valor fornecido, usando o formulário seguro do `secrets--update_secret`.

## Observação
Se o objetivo real for cadastrar um token de webhook do Asaas (formato geralmente alfanumérico, sem prefixo `whsec_`), será necessário um valor específico do Asaas e o segredo a ser criado/atualizado será `ASAAS_WEBHOOK_SECRET`.

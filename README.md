# FinanFlow Insights

Você é um desenvolvedor Full Stack Sênior especializado em sistemas Fintech e SaaS de gestão financeira.

Crie uma plataforma completa de Gestão de Estabelecimentos Comerciais (ECs), Fechamento de Faturamento e Cobrança Automática. O visual deve ser no estilo Dashboard Fintech moderno, limpo, responsivo, utilizando Tailwind CSS, Shadcn/UI e Lucide Icons.

Toda a persistência de dados e regras de negócio serão gerenciadas de forma nativa pela base de dados e estado do Lovable.

---

### 1. ESTRUTURA DE DADOS (DATABASE NATIVO LOVABLE)

Crie as tabelas/estruturas de dados com as seguintes entidades e relacionamentos:

1. `merchants` (Estabelecimentos Comerciais - ECs)

   - id (uuid)

   - name (text)

   - document_cnpj (text)

   - phone_whatsapp (text)

   - email (text)

   - status ('active' | 'inactive')

2. `pos_terminals` (Maquininhas/Terminais)

   - id (uuid)

   - merchant_id (foreign key)

   - serial_number (text)

   - model (text)

   - status ('active' | 'inactive')

3. `fee_plans` (Planos e Taxas Operacionais por EC)

   - id (uuid)

   - merchant_id (foreign key)

   - fixed_rate_percent (number) -> Taxa Operacional Fixa/Geral em Porcentagem (%)

   - pix_rate (number) -> % cobrado sobre Pix

   - debit_rate (number) -> % cobrado sobre Débito

   - credit_vista_rate (number) -> % cobrado sobre Crédito à Vista

   - credit_installment_rate (number) -> % cobrado sobre Crédito Parcelado

   - cash_rate (number) -> % cobrado sobre Dinheiro

   - traditional_fee_avg (number) -> % médio da tabela tradicional (para cálculo do comparativo de economia)

4. `statements_imports` (Upload de Extratos Confrapag)

   - id (uuid)

   - merchant_id (foreign key)

   - file_name (text)

   - reference_month (text) -> ex: "2026-07"

   - status ('processing' | 'completed' | 'error')

5. `transactions` (Faturamento Extraído ou Lançado)

   - id (uuid)

   - merchant_id (foreign key)

   - pos_serial (text)

   - modality ('pix' | 'debit' | 'credit_vista' | 'credit_installment' | 'cash')

   - gross_amount (number)

   - transaction_date (timestamp)

   - import_id (foreign key)

6. `expenses_adjustments` (Despesas e Lançamentos Extras)

   - id (uuid)

   - merchant_id (foreign key)

   - description (text)

   - amount (number) -> despesas/débitos reduzem o valor da fatura final

   - reference_month (text)

7. `closures` (Fechamentos Mensais do EC)

   - id (uuid)

   - merchant_id (foreign key)

   - reference_month (text)

   - total_gross_volume (number) -> Faturamento Bruto do mês

   - total_op_fee_amount (number) -> Valor total calculado da taxa operacional (%)

   - total_expenses (number) -> Total de despesas lançadas

   - net_invoice_amount (number) -> Valor final a cobrar (Taxa Op - Despesas)

   - traditional_cost_estimate (number) -> Quanto pagaria no modelo antigo

   - savings_amount (number) -> Economia gerada (Traditional Cost - Net Invoice Amount)

   - status ('draft' | 'closed' | 'invoice_generated' | 'paid')

   - asaas_payment_id (text)

   - asaas_invoice_url (text)

8. `split_rules` (Regras de Split para Parceiros)

   - id (uuid)

   - merchant_id (foreign key)

   - partner_name (text)

   - partner_asaas_wallet_id (text)

   - percentage (number) -> % de comissão do parceiro sobre a cobrança

---

### 2. MÓDULOS E TELAS DA INTERFACE

#### 1. Navegação & Dashboard Principal

- Sidebar: Dashboard, Estabelecimentos (ECs), Importar Confrapag, Despesas/Ajustes, Fechamentos & Cobrança, Configuração Asaas.

- Cards de KPI: Total Faturado Global, Taxa Operacional a Receber, Economia Total Gerada para Clientes, Status das Cobranças.

- Gráficos por modalidade (Pix, Débito, Crédito).

#### 2. Gestão de ECs e Planos (`/merchants`)

- Cadastro e Edição de EC (CNPJ, Razão Social, WhatsApp, E-mail).

- Vínculo de Terminais POS pelo número serial.

- **Configuração do Plano Financeiro:**

  - **Campo de Taxa Operacional Fixa (%):** preenchido em percentual.

  - **Campos de Taxas por Modalidade (%):** Pix, Débito, Crédito à vista e parcelado.

  - **Taxa Média Tradicional (%):** para base do comparativo de economia.

- **Configuração de Split Asaas:** Wallet ID e % do parceiro.

#### 3. Importador do Extrato Confrapag (`/import`)

- Upload de arquivos de extrato (CSV/XLSX/PDF).

- Leitura/Simulador de parser agrupando por modalidade (Pix, Débito, Crédito) e identificação do EC via Serial do POS ou seleção manual.

- Tabela de prévia e confirmação de importação.

#### 4. Gestão de Despesas e Lançamentos (`/expenses`)

- Form simples para lançar débitos/créditos extras para o EC no mês (ex: "Bobinas", "Desconto de indicação").

#### 5. Fechamento e Comparativo de Economia (`/closures`)

- Seleção de Mês e EC para gerar o fechamento.

- **Card de Ancoragem e Economia Visual:**

  - Modelo Tradicional: R$ X.XXX,XX

  - Nosso Modelo: R$ Y.YYY,YY

  - **SUA ECONOMIA: R$ Z.ZZZ,ZZ!**

- Detalhamento: Faturamento Bruto x Taxas (%), Despesas Abatidas = Valor Final.

- Botão: **"Aprovar Fechamento e Gerar Boleto Asaas"**.

#### 6. Integração com API do Asaas (`/settings/asaas`)

- Tela de configurações para inserir a API Key do Asaas.

- Serviço para disparar a criação da cobrança (`POST /v3/payments`) com suporte a **Split de Pagamento** e **Boleto/Pix Híbrido** nativo.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/02b004b4-7d81-4e9d-9d28-361e1778abef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

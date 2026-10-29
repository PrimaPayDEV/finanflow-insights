import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Printer,
  MessageCircle,
  Copy,
  CheckCircle2,
  Calendar,
  BookOpen,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers } from "@/lib/members.functions";
import { BRL, formatCpfCnpj, formatPhone } from "@/lib/format";
import {
  generateTermoAceiteWhatsAppMessage,
  loadLocalData,
  saveLocalData,
  getMemberExtraData,
  getVehicleExtraData,
  getMemberDueDay,
  formatDateTimeBR
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/termos')({
  head: () => ({
    meta: [{ title: "Termos & Regulamento PPM | Planmais Proteção Veicular" }],
  }),
  component: TermosPage,
});

type TermoType = "PPM" | "ADESAO" | "VISTORIA" | "ACORDO" | "CANCELAMENTO";

interface RegulamentoChapter {
  chapter: string;
  title: string;
  articles: string[];
}

const REGULAMENTO_PPM_CHAPTERS: RegulamentoChapter[] = [
  {
    chapter: "CAPÍTULO I",
    title: "DAS DISPOSIÇÕES GERAIS",
    articles: [
      "Art. 1º O presente Regulamento estabelece as condições, direitos, obrigações, benefícios, limitações, exclusões e procedimentos aplicáveis aos participantes do Programa de Proteção Patrimonial Mutualista – PPM vinculado à PLANMAIS, observadas a legislação e a regulamentação aplicáveis.",
      "Art. 2º O PPM tem por finalidade proporcionar aos participantes proteção patrimonial em relação aos riscos expressamente previstos neste Regulamento, mediante sistema de mutualismo e rateio das despesas entre os participantes.",
      "Art. 3º A participação no PPM será formalizada mediante adesão do interessado, observadas as condições cadastrais, documentais, financeiras e de vistoria estabelecidas neste Regulamento.",
      "Art. 4º A proteção será limitada aos eventos, condições, valores, participações e demais critérios expressamente previstos neste Regulamento.",
      "Art. 5º Não haverá direito a benefício em situações que estejam expressamente excluídas, ainda que o evento possua características semelhantes às situações protegidas.",
      "Art. 6º A proteção será vinculada ao veículo cadastrado e às informações declaradas pelo participante, devendo qualquer alteração relevante ser comunicada à PLANMAIS."
    ]
  },
  {
    chapter: "CAPÍTULO II",
    title: "DA ADESÃO, CADASTRO E VISTORIA",
    articles: [
      "Art. 7º A adesão ao PPM dependerá do preenchimento das informações cadastrais, apresentação dos documentos exigidos e cumprimento das condições estabelecidas pela PLANMAIS.",
      "Art. 8º O participante deverá fornecer informações verdadeiras, completas e atualizadas relativas ao veículo, sua utilização, condutores e demais informações relevantes para a proteção.",
      "Art. 9º A inclusão do veículo poderá estar condicionada à realização de vistoria prévia.",
      "Art. 10º A vistoria terá como finalidade verificar as características, condições e eventuais danos preexistentes do veículo no momento de sua inclusão.",
      "Art. 11º Danos, avarias ou irregularidades constatados antes do início da proteção serão considerados preexistentes, não sendo abrangidos por eventos posteriores, salvo quando comprovadamente decorrentes de novo evento protegido.",
      "Art. 12º A PLANMAIS poderá solicitar nova vistoria sempre que houver necessidade de verificar as condições do veículo, inclusive para fins de reativação após período de inadimplência ou suspensão.",
      "Art. 13º A alteração de características, utilização ou condições relevantes do veículo deverá ser comunicada pelo participante.\nParágrafo único. A omissão de informação relevante poderá resultar na aplicação das consequências previstas neste Regulamento, especialmente quando houver relação entre a informação omitida e o evento."
    ]
  },
  {
    chapter: "CAPÍTULO III",
    title: "DAS COBERTURAS E BENEFÍCIOS",
    articles: [
      "Art. 14º O PPM poderá proporcionar benefícios relacionados a danos materiais decorrentes dos eventos expressamente previstos neste Regulamento.",
      "Art. 15º Os benefícios poderão abranger, conforme as condições específicas do participante:\nI – reparação de danos materiais ao veículo protegido;\nII – reparação de danos materiais causados a terceiros;\nIII – demais benefícios expressamente previstos no termo de adesão e neste Regulamento.",
      "Art. 16º A proteção será limitada ao dano material diretamente relacionado ao evento reconhecido.",
      "Art. 17º Não haverá benefício para danos morais, pessoais, corporais, estéticos, lucros cessantes, perda de faturamento, perda de renda, perda de oportunidade, perda de uso, veículo substituto ou quaisquer outros danos indiretos ou reflexos, seja em relação ao veículo do participante ou a terceiros.",
      "Art. 18º O benefício será concedido de acordo com as condições existentes na data da ocorrência do evento.",
      "Art. 19º A existência de determinado evento ou dano não implica automaticamente o reconhecimento do direito ao benefício, devendo ser realizada a análise correspondente."
    ]
  },
  {
    chapter: "CAPÍTULO IV",
    title: "DA COTA DE PARTICIPAÇÃO",
    articles: [
      "Art. 20º A utilização dos benefícios do PPM estará sujeita ao pagamento da respectiva cota de participação pelo participante, conforme as condições estabelecidas neste Regulamento.",
      "Art. 21º Para veículos nacionais, a cota de participação será de 7,5% (sete vírgula cinco por cento), observada a base de cálculo estabelecida para o evento, respeitado o valor mínimo de R$ 2.700,00 (dois mil e setecentos reais).",
      "Art. 22º Para veículos importados, a cota de participação será de 10% (dez por cento), observada a base de cálculo estabelecida para o evento, respeitado o valor mínimo de R$ 3.500,00 (três mil e quinhentos reais).",
      "Art. 23º Quando o veículo for utilizado para atividade profissional ou trabalho, será acrescida à respectiva cota de participação uma parcela adicional de 3% (três por cento).\nParágrafo único. O adicional de 3% será aplicado cumulativamente à cota correspondente à categoria do veículo.",
      "Art. 24º As cotas de participação previstas neste Capítulo serão calculadas sobre o valor de referência estabelecido para o veículo, conforme os critérios definidos no cadastro e nas condições de participação, utilizando-se a Tabela FIPE, quando aplicável.",
      "Art. 25º A cota de participação será devida pelo participante para cada evento protegido que resulte em benefício.",
      "Art. 26º Nos eventos envolvendo terceiros, serão aplicados os mesmos percentuais e valores mínimos correspondentes ao veículo protegido do participante.",
      "Art. 27º Quando houver mais de um terceiro com dano material reconhecido no mesmo evento, será devida uma cota de participação para cada terceiro.",
      "Art. 28º Na hipótese de reincidência de evento envolvendo terceiros dentro do período de 12 (doze) meses, a cota de participação aplicável será dobrada.\nParágrafo único. Havendo mais de um terceiro, a cota dobrada será aplicada individualmente para cada terceiro."
    ]
  },
  {
    chapter: "CAPÍTULO V",
    title: "DO PAGAMENTO, INADIMPLÊNCIA E SUSPENSÃO DA PROTEÇÃO",
    articles: [
      "Art. 29º O participante deverá manter em dia todas as contribuições e demais valores devidos ao PPM.",
      "Art. 30º O inadimplemento poderá resultar na suspensão da proteção, conforme as condições estabelecidas neste Regulamento.",
      "Art. 31º Durante o período de suspensão, não haverá direito a benefício decorrente de evento ocorrido durante o período em que a proteção estiver suspensa.",
      "Art. 32º O pagamento de boleto ou contribuição após o vencimento não restabelece automaticamente a proteção.",
      "Art. 33º A regularização financeira de valores vencidos constitui apenas uma das condições necessárias para eventual reativação da proteção.",
      "Art. 34º Após o pagamento de valores vencidos, poderá ser exigida nova vistoria do veículo para verificar seu estado de conservação e identificar eventuais danos existentes antes da reativação.",
      "Art. 35º A proteção somente será considerada reativada após:\nI – regularização dos valores pendentes;\nII – realização da revistoria, quando exigida;\nIII – aprovação da vistoria; e\nIV – confirmação da efetiva reativação pela PLANMAIS.",
      "Art. 36º O simples pagamento do boleto vencido, a solicitação de segunda via, a compensação bancária ou a realização da revistoria não significam, isoladamente, a retomada da proteção.",
      "Art. 37º Evento ocorrido antes da efetiva reativação permanecerá sem proteção, ainda que o participante posteriormente regularize suas obrigações.",
      "Art. 38º O pagamento realizado após a ocorrência do evento não poderá produzir efeito retroativo para gerar direito ao benefício."
    ]
  },
  {
    chapter: "CAPÍTULO VI",
    title: "DA PERDA DO DIREITO AO BENEFÍCIO",
    articles: [
      "Art. 39º O participante perderá o direito ao benefício quando agir com dolo, fraude, má-fé ou prestar informação falsa ou omitir informação relevante com a finalidade de obter benefício indevido ou dificultar a análise do evento.",
      "Art. 40º A perda do direito também poderá ocorrer quando ficar comprovado que o participante ou condutor:\nI – praticou deliberadamente ato destinado a provocar o evento;\nII – agravou intencionalmente as consequências do evento;\nIII – apresentou documentação falsa ou adulterada;\nIV – simulou ou participou de simulação de evento;\nV – prestou declaração falsa sobre a dinâmica do evento;\nVI – ocultou informação relevante para a apuração.",
      "Art. 41º A inobservância da legislação de trânsito ou a prática de falta grave poderá resultar na perda do direito ao benefício quando ficar comprovado que a conduta teve relação causal direta com a ocorrência ou agravamento do evento.",
      "Art. 42º Enquadram-se, entre outras condutas que poderão caracterizar a hipótese prevista no artigo anterior:\nI – condução na contramão de direção;\nII – realização de conversão ou manobra em local proibido quando diretamente relacionada ao evento;\nIII – condução temerária ou deliberadamente perigosa;\nIV – participação em competição ou disputa automobilística não autorizada;\nV – demais condutas graves de trânsito que tenham contribuído diretamente para a ocorrência ou agravamento do evento.",
      "Art. 43º A simples existência de infração de trânsito, desacompanhada de relação causal com o evento, não implicará automaticamente perda do direito.",
      "Art. 44º A perda do direito deverá estar fundamentada nas circunstâncias concretas verificadas durante a análise do evento."
    ]
  },
  {
    chapter: "CAPÍTULO VII",
    title: "DAS EXCLUSÕES ESPECÍFICAS",
    articles: [
      "Art. 45º Não serão abrangidos pelo PPM os eventos decorrentes de:\nI – participação em competição, corrida ou disputa automobilística não autorizada;\nII – utilização do veículo para finalidade não declarada quando houver agravamento relevante do risco e relação direta com o evento;\nIII – fraude ou simulação;\nIV – danos preexistentes;\nV – eventos provocados intencionalmente;\nVI – demais hipóteses expressamente previstas neste Regulamento.",
      "Art. 46º Não serão abrangidos eventos ocorridos entre parentes até o 3º grau, bem como entre pessoas residentes no mesmo domicílio ou dependentes, conforme os critérios estabelecidos pela PLANMAIS.",
      "Art. 47º Não haverá benefício relativo a danos morais, pessoais, corporais, estéticos, lucros cessantes, perda de faturamento, perda de renda ou demais prejuízos indiretos.",
      "Art. 48º O incêndio somente será abrangido quando diretamente decorrente de colisão protegida.\nParágrafo único. Incêndios decorrentes de vandalismo, atos de terceiros, ação criminosa, causas externas não relacionadas à colisão ou outras causas não expressamente previstas não serão abrangidos.",
      "Art. 49º O vandalismo poderá ser abrangido quando ocorrer após uma colisão protegida e estiver diretamente relacionado ao evento.\nParágrafo único. Vandalismo independente de colisão, ainda que ocorrido em período próximo, não será abrangido."
    ]
  },
  {
    chapter: "CAPÍTULO VIII",
    title: "DA COMUNICAÇÃO E REGULAÇÃO DOS EVENTOS",
    articles: [
      "Art. 50º O participante deverá comunicar o evento à PLANMAIS tão logo seja possível, fornecendo todas as informações necessárias à sua análise.",
      "Art. 51º A comunicação deverá conter, sempre que possível:\nI – data, horário e local;\nII – descrição detalhada da ocorrência;\nIII – identificação do condutor;\nIV – identificação de terceiros envolvidos;\nV – documentos pertinentes;\nVI – fotografias e demais elementos disponíveis.",
      "Art. 52º A PLANMAIS poderá solicitar documentos complementares, realizar vistorias, perícias, entrevistas e demais diligências necessárias à apuração.",
      "Art. 53º O participante deverá colaborar com a investigação e fornecer informações verdadeiras e completas.",
      "Art. 54º A PLANMAIS poderá utilizar profissionais, peritos, reguladores, oficinas e empresas especializadas para auxiliar na análise do evento.",
      "Art. 55º A análise deverá observar os documentos, circunstâncias, dinâmica, danos e demais elementos relacionados ao evento.",
      "Art. 56º O prazo para regulação e liquidação observará os limites estabelecidos pela legislação e regulamentação aplicáveis.",
      "Art. 57º A contagem do prazo regulamentar ficará condicionada à comunicação do evento e à apresentação da documentação necessária à sua análise, nos termos da regulamentação aplicável."
    ]
  },
  {
    chapter: "CAPÍTULO IX",
    title: "DA REPARAÇÃO E PAGAMENTO DOS BENEFÍCIOS",
    articles: [
      "Art. 58º Reconhecido o direito ao benefício, a PLANMAIS poderá providenciar a reparação do veículo, o pagamento do valor reconhecido ou outra forma de composição prevista neste Regulamento.",
      "Art. 59º A reparação ficará limitada aos danos materiais diretamente decorrentes do evento protegido.",
      "Art. 60º A PLANMAIS poderá utilizar oficinas integrantes de sua rede conveniada, observadas as condições estabelecidas para o participante.",
      "Art. 61º Quando admitida a livre escolha de oficina, serão observados os critérios, limites e procedimentos estabelecidos para a reparação.",
      "Art. 62º Os valores de reparação serão apurados com base nos danos efetivamente constatados e reconhecidos.",
      "Art. 63º A PLANMAIS poderá realizar pagamento diretamente ao prestador, ao participante ou a terceiro legitimado, conforme a natureza do benefício.",
      "Art. 64º A substituição de vidros, faróis e retrovisores estará sujeita às respectivas regras e à participação aplicável.",
      "Art. 65º Nos eventos relativos a vidros, faróis e retrovisores, o participante terá desconto de 60% sobre o valor da peça, observadas as condições, limites e procedimentos definidos pela PLANMAIS.",
      "Art. 66º A aplicação do benefício previsto neste Capítulo não afasta a necessidade de participação financeira quando estabelecida para o respectivo item ou evento.",
      "Art. 67º Quando houver circunstância excepcional que dificulte a regularização financeira imediata de benefício reconhecido, poderá ser formalizado acordo específico entre as partes, inclusive com cronograma de pagamento ou regularização de até 12 (doze) meses, observadas as circunstâncias concretas e a legislação aplicável.",
      "Art. 68º O acordo excepcional previsto no artigo anterior poderá estabelecer atualização monetária e demais condições necessárias à preservação do equilíbrio econômico da obrigação.\nParágrafo único. O prazo excepcional previsto neste Capítulo não constitui prazo ordinário para regulação ou liquidação de eventos.",
      "Art. 69º Em situações excepcionais, a PLANMAIS poderá, observada a disponibilidade financeira e as condições do grupo, conceder auxílio parcial ou integral por meio de Caixa Emergencial, destinado a mitigar prejuízos decorrentes de situações que não estejam ordinariamente abrangidas pelo PPM.",
      "Art. 70º A concessão de auxílio pelo Caixa Emergencial será discricionária, não constituindo direito adquirido nem obrigação de pagamento futuro em situações semelhantes.",
      "Art. 71º A concessão de auxílio emergencial não implicará reconhecimento de cobertura ou alteração das exclusões previstas neste Regulamento."
    ]
  },
  {
    chapter: "CAPÍTULO X",
    title: "DOS DANOS MATERIAIS CAUSADOS A TERCEIROS",
    articles: [
      "Art. 72º O PPM poderá conceder benefício para reparação de danos materiais diretamente causados pelo veículo protegido a terceiros, desde que o evento esteja abrangido pelas condições deste Regulamento.",
      "Art. 73º A proteção a terceiros limita-se exclusivamente aos danos materiais diretamente relacionados ao evento.",
      "Art. 74º Não serão abrangidos em nenhuma hipótese:\nI – danos morais;\nII – danos pessoais ou corporais;\nIII – danos estéticos;\nIV – lucros cessantes;\nV – perda de faturamento;\nVI – perda de renda;\nVII – perda de oportunidade;\nVIII – despesas com veículo substituto;\nIX – perda de uso;\nX – danos indiretos ou reflexos.",
      "Art. 75º Os danos materiais deverão ser comprovados mediante documentos, fotografias, orçamentos, laudos ou outros elementos necessários à análise.",
      "Art. 76º O participante não poderá reconhecer responsabilidade, assumir valores ou celebrar acordo em nome da PLANMAIS sem prévia autorização.",
      "Art. 77º A composição ou acordo com terceiro deverá observar os procedimentos de análise e autorização aplicáveis.",
      "Art. 78º A participação financeira relativa a terceiros observará os mesmos percentuais e valores mínimos previstos para o veículo protegido do participante.",
      "Art. 79º A participação será devida individualmente por terceiro.\nParágrafo único. Se três terceiros tiverem danos materiais reconhecidos, serão devidas três participações.",
      "Art. 80º Na hipótese de reincidência dentro de 12 meses, a participação será dobrada para cada terceiro envolvido.",
      "Art. 81º O pagamento ou reparação do dano material reconhecido não implica reconhecimento de responsabilidade da PLANMAIS por quaisquer danos não abrangidos pelo PPM."
    ]
  },
  {
    chapter: "CAPÍTULO XI",
    title: "DOS DIREITOS E OBRIGAÇÕES DO PARTICIPANTE E DA PLANMAIS",
    articles: [
      "Art. 82º São direitos do participante:\nI – ter acesso às condições de proteção;\nII – comunicar eventos;\nIII – acompanhar a análise;\nIV – receber informações sobre o processo;\nV – receber o benefício quando preenchidos os requisitos;\nVI – solicitar esclarecimentos e revisão administrativa.",
      "Art. 83º São obrigações do participante:\nI – manter os pagamentos em dia;\nII – prestar informações verdadeiras;\nIII – comunicar alterações relevantes;\nIV – comunicar eventos;\nV – fornecer documentos;\nVI – colaborar com vistorias e perícias;\nVII – preservar elementos relacionados ao evento;\nVIII – cumprir as normas de trânsito;\nIX – manter o veículo em condições adequadas;\nX – não praticar atos que dificultem a análise;\nXI – não reconhecer responsabilidade em nome da PLANMAIS sem autorização.",
      "Art. 84º São atribuições da PLANMAIS, na qualidade de associação vinculada ao PPM:\nI – representar os interesses coletivos dos participantes, nos limites de suas atribuições legais e estatutárias;\nII – prestar suporte e orientação aos participantes;\nIII – receber e encaminhar comunicações, solicitações e documentos relacionados aos eventos;\nIV – colaborar, quando cabível, com os procedimentos relacionados à análise, regulação, reparação e demais atividades do PPM;\nV – promover a observância deste Regulamento e das demais normas aplicáveis à relação associativa;\nVI – exercer as demais atribuições que lhe sejam legalmente conferidas ou previstas em seu Estatuto Social e nos instrumentos que regem o PPM.",
      "Art. 85º O participante será responsável pelas informações prestadas sobre o veículo e sua utilização.",
      "Art. 86º A utilização do veículo por terceiro autorizado pelo participante não afasta a aplicação das condições, exclusões e regras deste Regulamento."
    ]
  },
  {
    chapter: "CAPÍTULO XII",
    title: "DO RATEIO MUTUALISTA E DO EQUILÍBRIO DO PPM",
    articles: [
      "Art. 87º O PPM será baseado no princípio do mutualismo, mediante repartição entre os participantes das despesas decorrentes dos eventos reconhecidos e demais despesas relacionadas à operação, conforme as regras estabelecidas neste Regulamento.",
      "Art. 88º Após o levantamento das despesas referentes ao mês anterior, o montante apurado será considerado para fins de rateio entre os participantes.",
      "Art. 89º O valor será dividido proporcionalmente às cotas de participação de cada participante, observados os critérios estabelecidos pela PLANMAIS.",
      "Art. 90º A contribuição mensal ordinária destinada ao rateio ficará limitada a R$ 25,00 (vinte e cinco reais) por participante.",
      "Art. 91º Quando o valor arrecadado no rateio mensal for insuficiente para cobrir integralmente as despesas apuradas, o saldo remanescente poderá ser incluído nos rateios dos meses subsequentes.",
      "Art. 92º O saldo remanescente será considerado nas apurações futuras até sua integral regularização, sempre observando o limite mensal estabelecido no artigo anterior.",
      "Art. 93º O rateio poderá considerar despesas relacionadas a:\nI – benefícios concedidos;\nII – reparação de veículos;\nIII – danos materiais a terceiros;\nIV – custos de regulação;\nV – perícias e vistorias;\nVI – serviços necessários à operação;\nVII – demais despesas relacionadas ao funcionamento do PPM.",
      "Art. 94º A PLANMAIS poderá, no âmbito de suas atribuições e observados este Regulamento, seu Estatuto Social e a legislação aplicável, adotar ou propor medidas destinadas à preservação do equilíbrio econômico e financeiro do grupo mutualista.",
      "Art. 95º A prevenção e combate a fraudes constituem mecanismos de proteção do patrimônio coletivo dos participantes."
    ]
  },
  {
    chapter: "CAPÍTULO XIII",
    title: "DA VIGÊNCIA, SUSPENSÃO, CANCELAMENTO E DESLIGAMENTO",
    articles: [
      "Art. 96º A proteção terá início conforme as condições estabelecidas no termo de adesão e após o cumprimento dos requisitos necessários à sua efetivação.",
      "Art. 97º A proteção permanecerá vigente enquanto o participante cumprir as condições estabelecidas neste Regulamento.",
      "Art. 98º A suspensão decorrente de inadimplência produzirá os efeitos previstos no Capítulo V.",
      "Art. 99º O participante poderá solicitar seu desligamento, observadas as obrigações existentes até a data efetiva do desligamento.",
      "Art. 100º A PLANMAIS poderá promover o desligamento quando houver:\nI – fraude;\nII – tentativa de fraude;\nIII – informações falsas relevantes;\nIV – utilização indevida dos benefícios;\nV – descumprimento grave das obrigações;\nVI – inadimplência nas condições previstas;\nVII – demais hipóteses previstas neste Regulamento.",
      "Art. 101º O desligamento não prejudicará a análise de evento regularmente comunicado durante período em que a proteção estava vigente.",
      "Art. 102º As alterações posteriores deste Regulamento não produzirão efeitos retroativos sobre eventos ocorridos anteriormente, ressalvadas as hipóteses legalmente admitidas."
    ]
  },
  {
    chapter: "CAPÍTULO XIV",
    title: "DAS DISPOSIÇÕES GERAIS E SOLUÇÃO DE CONTROVÉRSIAS",
    articles: [
      "Art. 103º Este Regulamento deverá ser interpretado em conjunto com o termo de adesão e demais documentos integrantes da participação.",
      "Art. 104º As comunicações poderão ser realizadas por meios físicos ou eletrônicos oficialmente disponibilizados.",
      "Art. 105º O participante deverá manter seus dados cadastrais atualizados.",
      "Art. 106º O participante poderá apresentar reclamações, dúvidas e pedidos de revisão pelos canais oficiais.",
      "Art. 107º A solicitação de revisão administrativa deverá ser acompanhada, sempre que possível, dos documentos e fundamentos pertinentes.",
      "Art. 108º A PLANMAIS poderá realizar nova análise quando apresentados elementos relevantes que não tenham sido considerados anteriormente.",
      "Art. 109º O tratamento de dados pessoais observará a legislação aplicável, inclusive a legislação de proteção de dados.",
      "Art. 110º Os dados poderão ser utilizados para cadastro, administração do PPM, análise de eventos, prevenção a fraudes, cumprimento de obrigações legais e exercício regular de direitos.",
      "Art. 111º A PLANMAIS poderá compartilhar informações com prestadores, peritos, oficinas, autoridades e demais terceiros quando necessário às atividades do PPM, respeitada a legislação aplicável.",
      "Art. 112º A eventual nulidade de determinada disposição não prejudicará, por si só, a validade das demais disposições deste Regulamento.",
      "Art. 113º A tolerância eventual quanto ao descumprimento de determinada obrigação não constituirá renúncia ou alteração permanente das regras.",
      "Art. 114º Os casos omissos serão analisados conforme este Regulamento, o termo de adesão, o Estatuto Social e a legislação aplicável.",
      "Art. 115º As controvérsias que não forem solucionadas administrativamente poderão ser submetidas às medidas judiciais cabíveis, observadas as regras legais de competência."
    ]
  },
  {
    chapter: "CAPÍTULO XV",
    title: "DAS DISPOSIÇÕES FINAIS",
    articles: [
      "Art. 116º Este Regulamento, juntamente com o termo de adesão e demais documentos aplicáveis, estabelece as condições de participação no PPM.",
      "Art. 117º A adesão pressupõe que o participante tenha tido acesso às regras aplicáveis antes de sua participação.",
      "Art. 118º Este Regulamento poderá ser atualizado para adequação às alterações legais, regulatórias, administrativas e operacionais aplicáveis.",
      "Art. 119º As condições aplicáveis ao evento serão aquelas vigentes na data de sua ocorrência.",
      "Art. 120º A PLANMAIS poderá, no âmbito de suas atribuições legais e estatutárias, adotar ou promover as medidas administrativas e judiciais cabíveis destinadas à prevenção e ao combate de fraude, simulação, falsidade documental, omissão relevante e obtenção indevida de benefícios.",
      "Art. 121º O participante responderá pelos prejuízos comprovadamente causados ao PPM em razão de fraude, má-fé, falsidade ou utilização indevida dos benefícios.",
      "Art. 122º Nenhuma disposição deste Regulamento será interpretada de forma a afastar direito ou obrigação imposto por norma legal ou regulatória de aplicação obrigatória.",
      "Art. 123º Este Regulamento entrará em vigor na data de sua aprovação pelos órgãos competentes da PLANMAIS.",
      "Art. 124º A entrada em vigor deste Regulamento substituirá as disposições anteriores que tratem das mesmas matérias, ressalvados os direitos e obrigações constituídos sob as regras anteriormente vigentes.",
      "Art. 125º Os casos eventualmente não previstos serão solucionados pela administração da PLANMAIS, observados o Estatuto Social, a finalidade do PPM e a legislação aplicável.",
      "Art. 126º O presente Regulamento constitui instrumento destinado a estabelecer as condições de participação, benefícios, obrigações, limitações, exclusões e procedimentos aplicáveis à Proteção Patrimonial Mutualista – PPM da PLANMAIS."
    ]
  }
];

function TermosPage() {
  const { companyId, companyName } = useAuth();

  const fetchMembers = useServerFn(getMembers);
  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [termoType, setTermoType] = useState<TermoType>("PPM");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Termos aceitos salvos localmente
  const [termosAceitos, setTermosAceitos] = useState<Record<string, string>>(() => {
    return loadLocalData<Record<string, string>>(companyId || "default", "termos_aceitos", {});
  });

  // Dados do associado e veículo selecionado
  const selectedMember = useMemo(() => {
    return members.find((m: any) => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  const memberExtra = useMemo(() => {
    if (!selectedMemberId) return {};
    return getMemberExtraData(companyId || "default", selectedMemberId);
  }, [companyId, selectedMemberId]);

  const memberDueDay = useMemo(() => {
    if (!selectedMemberId) return 20;
    return getMemberDueDay(companyId || "default", selectedMemberId, Number((selectedMember as any)?.due_day || 20));
  }, [companyId, selectedMemberId, selectedMember]);

  const memberVehicles = useMemo(() => {
    if (!selectedMember) return [];
    return Array.isArray((selectedMember as any).vehicles) ? (selectedMember as any).vehicles : [];
  }, [selectedMember]);

  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId) {
      return memberVehicles.find((v: any) => v.id === selectedVehicleId);
    }
    return memberVehicles[0];
  }, [memberVehicles, selectedVehicleId]);

  const vehicleExtra = useMemo(() => {
    if (!selectedVehicle) return {};
    return getVehicleExtraData(companyId || "default", selectedVehicle.id, selectedVehicle.plate);
  }, [companyId, selectedVehicle]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  const associationName = companyName || "PLANMAIS";

  // Verificar se já foi aceito
  const termoKey = `${selectedMemberId}_${termoType}_${selectedVehicle?.id || "geral"}`;
  const aceitoEm = termosAceitos[termoKey];

  const handleMarcarAceite = () => {
    if (!selectedMember) {
      toast.error("Selecione um associado para validar o termo.");
      return;
    }
    const updated = {
      ...termosAceitos,
      [termoKey]: new Date().toISOString(),
    };
    setTermosAceitos(updated);
    saveLocalData(companyId || "default", "termos_aceitos", updated);
    toast.success("Aceite registrado com sucesso no sistema!");
  };

  const handleSendWhatsApp = () => {
    if (!selectedMember) {
      toast.error("Selecione um associado primeiro.");
      return;
    }

    const memberName = selectedMember.name;
    const plate = selectedVehicle?.plate || "A DEFINIR";
    const model = selectedVehicle ? `${selectedVehicle.brand || ""} ${selectedVehicle.model || ""}`.trim() : "Veículo";
    const baseMsg = generateTermoAceiteWhatsAppMessage(memberName, plate, model, associationName);
    const msg =
      termoType === "PPM"
        ? `📜 *REGULAMENTO DO PROGRAMA DE PROTEÇÃO PATRIMONIAL MUTUALISTA – PPM (PLANMAIS)*\n\n` +
          `Olá, *${memberName}*! Segue para ciência e validação o nosso Regulamento de Proteção Patrimonial Mutualista – PPM (Capítulos I a XV, Art. 1º ao Art. 126º) referente ao veículo *${model}* (Placa: *${plate}*).\n\n` +
          `*DECLARAÇÃO DE CIÊNCIA DO PARTICIPANTE:*\n` +
          `Declaro que recebi, li e compreendi o presente Regulamento de Proteção Patrimonial Mutualista – PPM, estando ciente de suas condições, benefícios, exclusões, cotas de participação, regras de rateio, hipóteses de suspensão e perda do direito ao benefício.\n` +
          `Declaro, ainda, estar ciente de que a Proteção Patrimonial Mutualista não corresponde a uma operação de seguro, sendo baseada no sistema mutualista e nas regras de rateio estabelecidas neste Regulamento.\n\n` +
          `Responda *"CONCORDO"* para confirmar o aceite eletrônico do Regulamento PPM.`
        : baseMsg;

    const cleanPhone = (selectedMember.phone || "").replace(/\D/g, "");

    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyText = () => {
    const el = document.getElementById("documento-termo");
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      toast.success("Texto do Regulamento PPM copiado para a área de transferência!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout
      title="Usuário, Termos & Regulamento PPM"
      subtitle="Emissão do Regulamento do Programa de Proteção Patrimonial Mutualista – PPM (PLANMAIS) e termos do associado"
    >
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:m-0">
        {/* Painel de Configuração do Termo (Oculto na Impressão) */}
        <Card className="rounded-2xl border border-border/80 shadow-sm print:hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4.5 text-primary" />
              <span>Gerador de Regulamento PPM (PLANMAIS) & Documentos Oficiais</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Escolha o Regulamento PPM (Proteção Patrimonial Mutualista — Art. 1º ao 126º) ou termo desejado e selecione o participante
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo do Documento / Regulamento</Label>
                <Select value={termoType} onValueChange={(v: any) => setTermoType(v)}>
                  <SelectTrigger className="rounded-xl text-xs font-bold text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="PPM" className="font-bold text-primary">
                      Regulamento PPM (Proteção Patrimonial Mutualista) — PLANMAIS
                    </SelectItem>
                    <SelectItem value="ADESAO">Termo de Adesão & Filiação</SelectItem>
                    <SelectItem value="VISTORIA">Termo de Vistoria Prévia</SelectItem>
                    <SelectItem value="ACORDO">Autorização de Reparo de Sinistro</SelectItem>
                    <SelectItem value="CANCELAMENTO">Termo de Desfiliação / Cancelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Associado / Participante</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Selecione o associado..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({formatCpfCnpj(m.document)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Veículo Protegido</Label>
                <Select
                  value={selectedVehicleId || (selectedVehicle?.id || "")}
                  onValueChange={setSelectedVehicleId}
                  disabled={memberVehicles.length === 0}
                >
                  <SelectTrigger className="rounded-xl text-xs font-mono font-bold">
                    <SelectValue
                      placeholder={memberVehicles.length === 0 ? "Nenhum veículo vinculado" : "Selecione o veículo..."}
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {memberVehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} - {v.brand} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ações do Termo */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-border/60">
              <div className="flex items-center gap-2">
                {aceitoEm ? (
                  <Badge className="bg-emerald-500 text-white text-xs gap-1.5 py-1 px-3">
                    <CheckCircle2 className="size-3.5" />
                    <span>Aceite Confirmado em {formatDateTimeBR(aceitoEm)}</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3">
                    <Calendar className="size-3.5" />
                    <span>Aguardando Ciência / Assinatura</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Copy className="size-3.5" />
                  <span>Copiar Texto</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Printer className="size-3.5" />
                  <span>Imprimir / PDF</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendWhatsApp}
                  disabled={!selectedMember}
                  className="rounded-xl font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <MessageCircle className="size-3.5" />
                  <span>Enviar para Aceite no WhatsApp</span>
                </Button>

                {!aceitoEm && (
                  <Button
                    size="sm"
                    onClick={handleMarcarAceite}
                    disabled={!selectedMember}
                    className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Registrar Aceite</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DOCUMENTO FORMATADO (Estilo Timbrado Oficial) */}
        <div
          id="documento-termo"
          className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-md p-8 sm:p-12 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
        >
          {/* Cabeçalho Oficial */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-sans">
                PLANMAIS
              </h1>
              <p className="text-xs text-slate-700 font-bold uppercase tracking-wider">
                PROGRAMA DE PROTEÇÃO PATRIMONIAL MUTUALISTA – PPM
              </p>
              <p className="text-[11px] text-slate-500">
                {associationName !== "PLANMAIS" ? `${associationName} • ` : ""}
                Operação de Proteção Patrimonial Baseada no Mutualismo e Rateio Cooperativo
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Documento Oficial</span>
              <span className="text-xs font-mono font-bold text-slate-900 block">
                REF: {termoType}-{selectedVehicle?.plate || "GERAL"}-{new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* Título do Termo */}
          <div className="text-center py-2 space-y-1">
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide underline decoration-slate-400 underline-offset-4">
              {termoType === "PPM" && "REGULAMENTO DO PROGRAMA DE PROTEÇÃO PATRIMONIAL MUTUALISTA – PPM"}
              {termoType === "ADESAO" && "TERMO DE ADESÃO, FILIAÇÃO E PROTEÇÃO VEICULAR (PPM)"}
              {termoType === "VISTORIA" && "LAUDO DE VISTORIA PRÉVIA & CONDIÇÕES DO VEÍCULO"}
              {termoType === "ACORDO" && "TERMO DE AUTORIZAÇÃO DE REPARO E LIQUIDAÇÃO DE SINISTRO"}
              {termoType === "CANCELAMENTO" && "TERMO DE DESFILIAÇÃO E CANCELAMENTO DE BENEFÍCIOS"}
            </h2>
            {termoType === "PPM" && (
              <p className="text-xs font-black uppercase tracking-widest text-slate-700">PLANMAIS</p>
            )}
          </div>

          {/* Quadro 1: Dados do Associado */}
          <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300">
              1. Qualificação do Participante
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Nome Completo:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedMember?.name || "NÃO SELECIONADO"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">CPF / CNPJ:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedMember ? formatCpfCnpj(selectedMember.document) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">CNH & Validade:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {memberExtra.cnhNumber ? `Nº ${memberExtra.cnhNumber}` : "Conforme prontuário"}
                  {memberExtra.cnhExpiryDate
                    ? ` (Val: ${memberExtra.cnhExpiryDate.split("-").reverse().join("/")})`
                    : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Telefone / WhatsApp:</span>
                <span className="font-mono text-slate-900">
                  {selectedMember?.phone ? formatPhone(selectedMember.phone) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">E-mail:</span>
                <span className="text-slate-900">{selectedMember?.email || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Data e Hora do Cadastro:</span>
                <span className="font-mono text-slate-900">
                  {memberExtra.registeredAt || (selectedMember as any)?.created_at
                    ? formatDateTimeBR(memberExtra.registeredAt || (selectedMember as any)?.created_at)
                    : todayStr}
                </span>
              </div>
            </div>
          </div>

          {/* Quadro 2: Dados do Veículo Protegido */}
          <div className="rounded-xl border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300">
              2. Identificação do Patrimônio / Veículo & Implementos Cadastrados
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Placa:</span>
                <span className="font-mono font-black text-slate-950 text-sm">
                  {selectedVehicle?.plate || "SEM VEÍCULO"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Marca / Modelo:</span>
                <span className="font-bold text-slate-900">
                  {selectedVehicle ? `${selectedVehicle.brand || ""} ${selectedVehicle.model || ""}` : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Chassi:</span>
                <span className="font-mono font-bold text-slate-900">
                  {vehicleExtra.chassi || "Conforme CRLV"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Renavam:</span>
                <span className="font-mono font-bold text-slate-900">
                  {vehicleExtra.renavam || "Conforme CRLV"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ano Fab./Modelo:</span>
                <span className="font-mono text-slate-900">{selectedVehicle?.year || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Valor de Referência (FIPE):</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {selectedVehicle?.fipe_value || vehicleExtra.fipeValue
                    ? BRL(selectedVehicle?.fipe_value || vehicleExtra.fipeValue || 0)
                    : "Tabela FIPE"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Contribuição Estimada:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedVehicle?.monthly_fee ? BRL(selectedVehicle.monthly_fee) : "R$ 179,90"} (Venc. Dia {memberDueDay})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Implementos:</span>
                <span className="font-bold text-slate-900">
                  {vehicleExtra.implementos && vehicleExtra.implementos.length > 0
                    ? `${vehicleExtra.implementos.length} cadastrado(s)`
                    : "Nenhum implemento"}
                </span>
              </div>
            </div>
          </div>

          {/* REGULAMENTO COMPLETO PPM OU DEMAIS TERMOS */}
          {termoType === "PPM" ? (
            <div className="space-y-6 text-justify text-xs text-slate-800 leading-relaxed">
              {/* ADVERTÊNCIA IMPORTANTE */}
              <div className="rounded-xl border-2 border-amber-500/80 bg-amber-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-950 uppercase tracking-wide text-xs">
                  <AlertTriangle className="size-4 text-amber-700 shrink-0" />
                  <span>ADVERTÊNCIA IMPORTANTE</span>
                </div>
                <p className="text-amber-950 font-medium">
                  A Proteção Patrimonial Mutualista – PPM consiste em operação de proteção patrimonial baseada no mutualismo, mediante repartição dos custos dos eventos entre os participantes, conforme as regras estabelecidas neste Regulamento.
                </p>
                <p className="text-amber-950 font-bold">
                  As operações de proteção patrimonial mutualista não correspondem a operações de seguros.
                </p>
                <p className="text-amber-950 font-medium">
                  A participação no PPM não representa contratação de seguro, não havendo transferência integral do risco para uma seguradora. Os custos dos eventos são suportados pelo grupo mutualista, mediante os mecanismos de rateio estabelecidos neste Regulamento.
                </p>
              </div>

              {/* CAPÍTULOS I A XV (ART. 1º AO ART. 126º) */}
              <div className="space-y-5">
                {REGULAMENTO_PPM_CHAPTERS.map((chap) => (
                  <div key={chap.chapter} className="space-y-2">
                    <div className="border-b border-slate-300 pb-1 pt-1">
                      <h3 className="font-black text-slate-950 text-xs uppercase tracking-wider">
                        {chap.chapter} — {chap.title}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {chap.articles.map((article, idx) => (
                        <p key={idx} className="whitespace-pre-line text-slate-800">
                          {article}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* DECLARAÇÃO DE CIÊNCIA DO PARTICIPANTE */}
              <div className="rounded-xl border-2 border-slate-900 bg-slate-50 p-4 space-y-2 mt-6">
                <h3 className="font-black text-slate-950 text-xs uppercase tracking-wider">
                  DECLARAÇÃO DE CIÊNCIA DO PARTICIPANTE
                </h3>
                <p className="text-slate-900 font-medium">
                  Declaro que recebi, li e compreendi o presente Regulamento de Proteção Patrimonial Mutualista – PPM, estando ciente de suas condições, benefícios, exclusões, cotas de participação, regras de rateio, hipóteses de suspensão e perda do direito ao benefício.
                </p>
                <p className="text-slate-900 font-semibold">
                  Declaro, ainda, estar ciente de que a Proteção Patrimonial Mutualista não corresponde a uma operação de seguro, sendo baseada no sistema mutualista e nas regras de rateio estabelecidas neste Regulamento.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-justify text-xs text-slate-700 leading-relaxed">
              <h3 className="font-bold text-slate-900 text-xs uppercase border-b border-slate-200 pb-1">
                3. Das Cláusulas e Condições Gerais
              </h3>

              {termoType === "ADESAO" && (
                <>
                  <p>
                    <strong>CLÁUSULA PRIMEIRA – DO OBJETO E ADESÃO AO PPM:</strong> Pelo presente instrumento, o PARTICIPANTE adere voluntariamente ao Programa de Proteção Patrimonial Mutualista – PPM vinculado à PLANMAIS ({associationName}) e ao seu respectivo Regulamento (Art. 1º ao Art. 126º), passando a integrar o grupo mutualista para o veículo e implementos acima identificados.
                  </p>
                  <p>
                    <strong>CLÁUSULA SEGUNDA – DAS CONTRIBUIÇÕES, RATEIO E INADIMPLÊNCIA:</strong> O PARTICIPANTE se compromete a manter em dia todas as contribuições e valores devidos ao PPM, observada a contribuição mensal ordinária destinada ao rateio limitada a R$ 25,00 (vinte e cinco reais) por participante (Art. 90º). O inadimplemento resultará na suspensão da proteção nos termos do Capítulo V do Regulamento PPM, não restabelecendo o simples pagamento após o vencimento a proteção sem o cumprimento dos requisitos do Art. 35º.
                  </p>
                  <p>
                    <strong>CLÁUSULA TERCEIRA – DA COTA DE PARTICIPAÇÃO:</strong> A utilização dos benefícios do PPM estará sujeita ao pagamento da respectiva cota de participação (Capítulo IV): 7,5% (mínimo de R$ 2.700,00) para veículos nacionais; 10% (mínimo de R$ 3.500,00) para veículos importados; e adicional cumulativo de 3% quando utilizado para atividade profissional ou trabalho.
                  </p>
                  <p>
                    <strong>CLÁUSULA QUARTA – DECLARAÇÃO DE CIÊNCIA:</strong> O PARTICIPANTE declara que recebeu, leu e compreendeu o Regulamento de Proteção Patrimonial Mutualista – PPM, estando ciente de que a Proteção Patrimonial Mutualista não corresponde a uma operação de seguro, sendo baseada no sistema mutualista e nas regras de rateio estabelecidas no Regulamento.
                  </p>
                </>
              )}

              {termoType === "VISTORIA" && (
                <>
                  <p>
                    <strong>CLÁUSULA PRIMEIRA (CAPÍTULO II DO REGULAMENTO PPM):</strong> O veículo e eventuais implementos acima descritos passaram pelo processo de vistoria prévia (Art. 9º e Art. 10º) com a finalidade de verificar as características, condições e eventuais danos preexistentes do veículo no momento de sua inclusão ou reativação.
                  </p>
                  <p>
                    <strong>CLÁUSULA SEGUNDA:</strong> Nos termos do Art. 11º e Art. 12º do Regulamento PPM, danos, avarias ou irregularidades constatados antes do início da proteção são considerados preexistentes, e a PLANMAIS poderá solicitar nova vistoria sempre que houver necessidade de verificar as condições do veículo, inclusive para fins de reativação após período de inadimplência ou suspensão.
                  </p>
                </>
              )}

              {termoType === "ACORDO" && (
                <>
                  <p>
                    <strong>CLÁUSULA PRIMEIRA – DA REPARAÇÃO E PAGAMENTO DOS BENEFÍCIOS (CAPÍTULO IX DO REGULAMENTO PPM):</strong> Pelo presente termo, fica autorizada a reparação dos danos materiais diretamente decorrentes do evento protegido para o veículo acima identificado, conforme orçamentos, serviços relacionados e notas fiscais aprovados na regulação do evento.
                  </p>
                  <p>
                    <strong>CLÁUSULA SEGUNDA – DA COTA DE PARTICIPAÇÃO E QUITAÇÃO:</strong> Mediante o pagamento da respectiva Cota de Participação prevista no Capítulo IV do Regulamento PPM pelo participante e a execução dos reparos ou composição reconhecida, as partes conferem quitação quanto aos danos materiais apurados no referido evento.
                  </p>
                </>
              )}

              {termoType === "CANCELAMENTO" && (
                <>
                  <p>
                    <strong>CLÁUSULA ÚNICA (CAPÍTULO XIII DO REGULAMENTO PPM):</strong> Nos termos do Art. 99º do Regulamento do Programa de Proteção Patrimonial Mutualista – PPM da PLANMAIS, fica formalizado o desligamento do participante e o cancelamento da proteção vinculada ao veículo e implementos acima descritos a partir desta data, observadas as obrigações financeiras e de rateio existentes até a data efetiva do desligamento.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Local e Data */}
          <div className="pt-4 text-right text-xs text-slate-600 font-medium">
            Local e data: Brasil, {todayStr}.
          </div>

          {/* Campo de Assinaturas */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">
                {selectedMember?.name || "Assinatura do Participante"}
              </div>
              <span className="text-[10px] text-slate-500 block">
                CPF/CNPJ: {selectedMember ? formatCpfCnpj(selectedMember.document) : "___.___.___-__"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">
                PLANMAIS — {associationName}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Programa de Proteção Patrimonial Mutualista – PPM
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

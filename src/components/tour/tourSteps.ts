export type TourStep = {
  id: string;
  /** CSS selector do alvo. Se null, modal centralizado (sem spotlight). */
  selector: string | null;
  title: string;
  body: string;
  /** Preferência de posição do card em relação ao alvo. */
  placement?: "top" | "bottom" | "auto";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    selector: null,
    title: "Bem-vindo ao Freelaki ⚡",
    body: "Em 1 minuto te mostramos o essencial pra você começar a receber jobs.",
  },
  {
    id: "online",
    selector: '[data-tour="online-toggle"]',
    title: "Fique online",
    body: "Toque aqui pra começar a receber oportunidades em tempo real.",
    placement: "bottom",
  },
  {
    id: "notifications",
    selector: '[data-tour="notifications"]',
    title: "Notificações",
    body: "Novas oportunidades, mensagens e atualizações de contrato chegam aqui.",
    placement: "bottom",
  },
  {
    id: "balance",
    selector: '[data-tour="balance"]',
    title: "Seu saldo",
    body: "Acompanhe quanto está disponível pra saque e quanto está reservado em contratos ativos.",
    placement: "bottom",
  },
  {
    id: "actions",
    selector: '[data-tour="quick-actions"]',
    title: "Atalhos rápidos",
    body: "Saque por PIX, veja jobs no mapa e converse com clientes em 1 toque.",
    placement: "bottom",
  },
  {
    id: "contracts",
    selector: '[data-tour="nav-contratos"]',
    title: "Contratos",
    body: "Acompanhe seus jobs aceitos, assinaturas e andamentos por aqui.",
    placement: "top",
  },
  {
    id: "messages",
    selector: '[data-tour="nav-mensagens"]',
    title: "Mensagens",
    body: "Converse com os clientes em tempo real.",
    placement: "top",
  },
  {
    id: "menu",
    selector: '[data-tour="nav-menu"]',
    title: "Menu e perfil",
    body: "Complete seu perfil, documentos e dados bancários pra receber seus pagamentos.",
    placement: "top",
  },
];

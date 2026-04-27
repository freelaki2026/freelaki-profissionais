import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-7">
    <h2 className="mb-2 text-[17px] font-bold text-foreground">{title}</h2>
    <div className="space-y-2 text-[14px] leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const PrivacidadePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-5 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-primary" fill="currentColor" />
          <h1 className="text-[16px] font-bold text-foreground">Política de Privacidade</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
        <p className="mb-6 text-[12px] uppercase tracking-[2px] text-muted-foreground">
          Última atualização: 27/04/2026
        </p>

        <p className="mb-7 text-[14px] leading-relaxed text-foreground">
          O Freelaki ("nós", "aplicativo") respeita sua privacidade e está comprometido em proteger
          seus dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)
          e os requisitos da Apple App Store. Esta política descreve quais dados coletamos, por que
          coletamos e como você pode exercer seus direitos.
        </p>

        <Section title="1. Quem somos">
          <p>
            Freelaki é uma plataforma que conecta profissionais autônomos a oportunidades de
            trabalho. Operamos exclusivamente no Brasil. Para questões de privacidade, entre em
            contato pelo email: <strong>privacidade@freelaki.app</strong>.
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p><strong>Dados de cadastro:</strong> nome completo, CPF, data de nascimento, email, telefone, senha (criptografada).</p>
          <p><strong>Documentos:</strong> RG, CNH ou passaporte e selfie para verificação de identidade (KYC).</p>
          <p><strong>Endereço:</strong> CEP, rua, número, complemento, bairro, cidade e estado.</p>
          <p><strong>Dados bancários:</strong> chave Pix e dados da conta para repasse de pagamentos via Asaas.</p>
          <p><strong>Dados profissionais:</strong> categorias de serviço, fotos de portfólio, redes sociais, equipamentos, preços.</p>
          <p><strong>Localização:</strong> sua localização aproximada e em tempo real (apenas quando o app está aberto) para exibir oportunidades próximas.</p>
          <p><strong>Dados de uso:</strong> logs de acesso, dispositivo, sistema operacional, endereço IP e interações no app.</p>
          <p><strong>Comunicações:</strong> mensagens trocadas com clientes pelo chat interno.</p>
        </Section>

        <Section title="3. Por que coletamos">
          <p>• Criar e manter sua conta de profissional;</p>
          <p>• Verificar sua identidade e idade mínima de 18 anos (exigência legal e contratual);</p>
          <p>• Exibir oportunidades compatíveis com seu perfil e localização;</p>
          <p>• Processar pagamentos e repasses financeiros;</p>
          <p>• Cumprir obrigações legais, fiscais e regulatórias;</p>
          <p>• Prevenir fraudes e garantir a segurança da plataforma;</p>
          <p>• Comunicar atualizações, oportunidades e suporte.</p>
        </Section>

        <Section title="4. Base legal (LGPD)">
          <p>Tratamos seus dados com base em: (i) execução de contrato; (ii) cumprimento de obrigação legal; (iii) consentimento (para localização em tempo real e marketing); (iv) legítimo interesse (para prevenção de fraudes e melhoria do serviço).</p>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p>Compartilhamos dados estritamente necessários com:</p>
          <p>• <strong>Asaas</strong> — processamento de pagamentos e repasses Pix;</p>
          <p>• <strong>Supabase</strong> — armazenamento seguro de dados (servidores em conformidade com LGPD);</p>
          <p>• <strong>Clientes contratantes</strong> — apenas nome, foto, avaliação e categorias profissionais são exibidos publicamente;</p>
          <p>• <strong>Autoridades públicas</strong> — quando exigido por lei, ordem judicial ou regulamentação.</p>
          <p>Nunca vendemos seus dados pessoais a terceiros.</p>
        </Section>

        <Section title="6. Permissões do dispositivo (iOS)">
          <p>• <strong>Localização:</strong> usada para exibir oportunidades próximas. Você pode revogar a qualquer momento nas configurações do iOS.</p>
          <p>• <strong>Câmera:</strong> usada para tirar selfie de verificação e fotografar documentos.</p>
          <p>• <strong>Galeria de fotos:</strong> usada para envio de documentos e foto de perfil.</p>
          <p>• <strong>Notificações:</strong> usadas para alertar sobre novas oportunidades e mensagens.</p>
        </Section>

        <Section title="7. Retenção de dados">
          <p>Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, conservamos dados financeiros e fiscais pelo prazo legal (mínimo 5 anos) e excluímos os demais em até 90 dias.</p>
        </Section>

        <Section title="8. Seus direitos (LGPD)">
          <p>Você tem direito a: confirmação e acesso aos dados, correção, anonimização, portabilidade, exclusão, informação sobre compartilhamento e revogação do consentimento. Para exercer, envie email para <strong>privacidade@freelaki.app</strong>.</p>
        </Section>

        <Section title="9. Exclusão de conta">
          <p>Você pode solicitar a exclusão completa da sua conta diretamente no app, em <strong>Menu → Ajuda → Excluir conta</strong>, ou por email a <strong>privacidade@freelaki.app</strong>. A exclusão é processada em até 30 dias, ressalvados os dados que devemos reter por obrigação legal.</p>
        </Section>

        <Section title="10. Segurança">
          <p>Adotamos criptografia em trânsito (HTTPS/TLS) e em repouso, autenticação segura, controles de acesso e monitoramento contínuo. Ainda assim, nenhum sistema é 100% seguro — comunique imediatamente qualquer incidente suspeito.</p>
        </Section>

        <Section title="11. Crianças e adolescentes">
          <p>O Freelaki é destinado exclusivamente a maiores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos um cadastro de menor de idade, a conta será removida imediatamente.</p>
        </Section>

        <Section title="12. Alterações nesta política">
          <p>Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas pelo app ou email com pelo menos 15 dias de antecedência.</p>
        </Section>

        <Section title="13. Encarregado de Dados (DPO)">
          <p>Encarregado pelo Tratamento de Dados Pessoais: <strong>Thiago Kenned Cordeiro da Silva</strong>.<br />Contato: <strong>privacidade@freelaki.app</strong></p>
        </Section>

        <p className="mt-10 text-center text-[12px] text-muted-foreground">
          © 2026 Freelaki — Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
};

export default PrivacidadePage;

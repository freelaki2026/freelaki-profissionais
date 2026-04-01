const Placeholder = ({ name }: { name: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="text-lg text-muted-foreground">{name}</p>
  </div>
);

export const Login = () => <Placeholder name="Login" />;
export const Cadastro = () => <Placeholder name="Cadastro" />;
export const Termos = () => <Placeholder name="Termos e Condições" />;
export const Categorias = () => <Placeholder name="Seleção de Categorias" />;
export const Dashboard = () => <Placeholder name="Dashboard" />;
export const Perfil = () => <Placeholder name="Perfil" />;
export const Documentos = () => <Placeholder name="Documentos" />;
export const Endereco = () => <Placeholder name="Endereço" />;
export const DadosPessoais = () => <Placeholder name="Dados Pessoais" />;
export const DadosBancarios = () => <Placeholder name="Dados Bancários" />;
export const Ajuda = () => <Placeholder name="Ajuda" />;
export const Contratos = () => <Placeholder name="Contratos" />;
export const Suporte = () => <Placeholder name="Suporte" />;
export const OportunidadeDetalhe = () => <Placeholder name="Detalhe da Oportunidade" />;

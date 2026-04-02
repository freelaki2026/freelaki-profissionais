export const AUTH_ERRORS: Record<string, { message: string; code: string; hint?: string }> = {
  'User already registered': {
    code: 'AUTH-001',
    message: 'Este email já está cadastrado.',
    hint: 'Faça login ou recupere sua senha.'
  },
  'Invalid login credentials': {
    code: 'AUTH-002',
    message: 'Email ou senha incorretos.',
    hint: 'Verifique seus dados e tente novamente.'
  },
  'Email not confirmed': {
    code: 'AUTH-003',
    message: 'Email não confirmado.',
    hint: 'Verifique sua caixa de entrada e clique no link.'
  },
  'Password should be at least 6 characters': {
    code: 'AUTH-004',
    message: 'Senha muito curta.',
    hint: 'Use no mínimo 8 caracteres.'
  },
  'Unable to validate email address: invalid format': {
    code: 'AUTH-005',
    message: 'Formato de email inválido.',
    hint: 'Verifique o email informado.'
  },
  'Email rate limit exceeded': {
    code: 'AUTH-006',
    message: 'Muitas tentativas de envio de email.',
    hint: 'Aguarde alguns minutos antes de tentar novamente.'
  },
  'Token has expired or is invalid': {
    code: 'AUTH-007',
    message: 'Link expirado ou inválido.',
    hint: 'Solicite um novo link de confirmação.'
  },
  'User not found': {
    code: 'AUTH-008',
    message: 'Usuário não encontrado.',
    hint: 'Verifique o email ou crie uma nova conta.'
  },
  'profiles_cpf_cnpj_unique': {
    code: 'CAD-001',
    message: 'CPF/CNPJ já cadastrado em outra conta.',
    hint: 'Se acredita ser um erro, contate o suporte.'
  },
  'profiles_email_unique': {
    code: 'CAD-002',
    message: 'Email já cadastrado em outra conta.',
    hint: 'Faça login ou recupere sua senha.'
  },
  'new row violates row-level security': {
    code: 'DB-001',
    message: 'Erro de permissão no banco de dados.',
    hint: 'Tente novamente. Se persistir, contate o suporte.'
  },
  'JWT expired': {
    code: 'AUTH-009',
    message: 'Sessão expirada.',
    hint: 'Faça login novamente.'
  },
  'Network request failed': {
    code: 'NET-001',
    message: 'Sem conexão com a internet.',
    hint: 'Verifique sua conexão e tente novamente.'
  },
  'Failed to fetch': {
    code: 'NET-002',
    message: 'Erro de conexão.',
    hint: 'Verifique sua internet ou tente novamente em instantes.'
  },
  'timeout': {
    code: 'NET-003',
    message: 'Tempo de conexão esgotado.',
    hint: 'Sua internet pode estar lenta. Tente novamente.'
  },
  'DEFAULT': {
    code: 'ERR-000',
    message: 'Erro inesperado.',
    hint: 'Tente novamente. Se persistir, contate suporte@freelaqui.com.br'
  }
};

export function parseError(error: unknown): { code: string; message: string; hint?: string } {
  const msg = error instanceof Error ? error.message :
    typeof error === 'string' ? error :
    (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) :
    JSON.stringify(error);

  const match = Object.entries(AUTH_ERRORS).find(([key]) =>
    key !== 'DEFAULT' && msg.includes(key)
  );

  return match ? match[1] : AUTH_ERRORS['DEFAULT'];
}

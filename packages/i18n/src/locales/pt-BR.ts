export const ptBR = {
	common: {
		appName: 'poc-vpn',
		loading: 'Carregando…',
		wait: 'Aguarde…',
		back: 'Voltar',
		errorCode: 'Código',
		language: 'Idioma',
		languageName: 'Português (Brasil)',
		theme: 'Tema',
		themeDark: 'Escuro',
		themeLight: 'Claro',
		skipToContent: 'Ir para o conteúdo',
		retryInMinutes: 'Muitas tentativas. Tente de novo em {{minutes}} min.',
	},

	auth: {
		login: {
			title: 'Entrar',
			email: 'E-mail',
			password: 'Senha',
			submit: 'Entrar',
			forgot: 'Esqueci minha senha',
			signupLink: 'Criar conta',
		},
		signup: {
			title: 'Criar conta',
			email: 'E-mail',
			password: 'Senha',
			passwordHint: 'Mínimo de 12 caracteres. Uma frase longa é melhor que símbolos.',
			submit: 'Criar conta',
			haveAccount: 'Já tem conta?',
			loginLink: 'Entrar',
			checkInboxTitle: 'Confira seu e-mail',
			checkInboxBody: 'Se {{email}} puder ser cadastrado, enviamos um link de confirmação.',
			checkInboxExpiry: 'O link expira em 24 horas.',
		},
		verifyEmail: {
			pendingTitle: 'Confirme seu e-mail',
			pendingBody: 'Enviamos um link de confirmação. Abra-o para ativar sua conta.',
			verifying: 'Confirmando…',
			successTitle: 'E-mail confirmado',
			successBody: 'Sua conta está ativa.',
			failureTitle: 'Não foi possível confirmar',
			email: 'E-mail',
			resend: 'Reenviar link',
			resendIn: 'Reenviar em {{seconds}}s',
		},
		forgotPassword: {
			title: 'Esqueci minha senha',
			email: 'E-mail',
			submit: 'Enviar link',
			sentTitle: 'Verifique seu e-mail',
			sentBody: 'Se houver uma conta com esse endereço, enviamos um link de redefinição.',
			sentExpiry: 'O link expira em 1 hora e só pode ser usado uma vez.',
		},
		resetPassword: {
			title: 'Nova senha',
			password: 'Nova senha',
			submit: 'Redefinir senha',
			warning: 'Ao redefinir, todas as sessões ativas nesta conta serão encerradas.',
			invalidLinkTitle: 'Link inválido',
			invalidLinkBody: 'Este endereço não contém um código de redefinição.',
			requestNew: 'Solicitar um novo link',
		},
		logout: 'Sair',
	},

	billing: {
		accountTitle: 'Sua conta',
		subscriptionTitle: 'Assinatura',
		renewsOn: 'renova em {{date}}',
		cancelScheduled: 'O cancelamento foi agendado. O acesso continua até o fim do período pago.',
		periodEndUnknown: 'o fim do período vigente',
		subscribeMonthly: 'Assinar mensal',
		subscribeYearly: 'Assinar anual',
		intendedMonthly: 'Você escolheu o plano mensal antes de criar a conta.',
		intendedYearly: 'Você escolheu o plano anual antes de criar a conta.',
		cancel: 'Cancelar assinatura',
		cancelConfirmTitle: 'Cancelar sua assinatura?',
		cancelConfirmBody: 'O acesso continua até {{date}}. Depois disso a conta perde o plano Pro.',
		cancelConfirmAccept: 'Sim, cancelar',
		cancelConfirmDismiss: 'Manter assinatura',
		resume: 'Retomar assinatura',
		planTitle: 'O plano inclui',
		seats: '{{count}} usuários',
		devicesPerUser: '{{count}} dispositivos por usuário',
		monthlyTrafficGb: '{{count}} GB de tráfego por mês',
		status: {
			none: 'Sem assinatura',
			active: 'Ativa',
			trialing: 'Em teste',
			past_due: 'Pagamento pendente',
			canceled: 'Cancelada',
			incomplete: 'Aguardando confirmação do pagamento',
		},
		tier: {
			pro: 'Pro',
		},
		backToAccount: 'Voltar para sua conta',
		invoices: {
			title: 'Faturas',
			link: 'Faturas',
			intro: 'O que já foi cobrado desta empresa, do mais recente para o mais antigo.',
			empty: 'Nenhuma cobrança ainda. A primeira aparece aqui depois que a assinatura começar.',
			issuedAt: 'Emitida em {{date}}',
			number: 'Fatura {{number}}',
			statusPaid: 'Paga',
			statusFailed: 'Não paga',
			download: 'Baixar PDF',
			archiving: 'Preparando o PDF…',
		},
		checkoutSuccess: {
			receivedTitle: 'Pagamento recebido',
			activating: 'Estamos ativando sua assinatura.',
			stillProcessing:
				'A ativação ainda está sendo processada. Isso costuma levar alguns segundos.',
			checkAgain: 'Verificar de novo',
			activeTitle: 'Assinatura ativa',
			activeBody: 'Sua conta está no plano {{tier}}.',
		},
		checkoutCancel: {
			title: 'Nada foi cobrado',
			body: 'Você saiu do checkout antes de concluir. Sua assinatura não mudou.',
		},
	},

	marketing: {
		hero: {
			title: 'Um túnel WireGuard que a sua empresa opera',
			body: 'Gere uma chave no navegador, entregue o arquivo a quem precisa e veja todos os dispositivos da empresa numa lista só.',
			cta: 'Criar conta',
			eyebrow: 'Infraestrutura de VPN gerenciada',
			secondaryCta: 'Ver preços',
		},
		nav: {
			product: 'Produto',
			pricing: 'Preços',
		},
		value: {
			keysTitle: 'A chave privada nunca sai do navegador',
			keysBody:
				'As chaves são geradas na máquina que vai usá-las. Guardamos apenas a metade pública, e uma configuração perdida é substituída, não recuperada.',
			companyTitle: 'Uma empresa, várias pessoas',
			companyBody:
				'Usuários, dispositivos e faturas pertencem à empresa que paga. O papel define o padrão, e as exceções por pessoa resolvem o resto.',
			regionsTitle: 'Escolha por onde seu tráfego sai',
			regionsBody:
				'Escolha a região ao criar uma chave. Qual máquina atende é problema nosso, e trocá-la não mexe na sua configuração.',
		},
		pricing: {
			title: 'Um plano',
			subtitle: 'Todo mundo, todo dispositivo, um preço só. Cancele quando quiser.',
			monthlyLabel: 'Mensal',
			yearlyLabel: 'Anual',
			bestValue: 'Melhor valor',
			monthsFree: '{{count}} meses grátis',
			perMonth: '{{price}}/mês',
			perYear: '{{price}}/ano',
			yearlyNote: 'Cobrado uma vez por ano.',
			startMonthly: 'Começar mensal',
			startYearly: 'Começar anual',
		},
		footer: {
			rights: '© {{year}} {{name}}',
		},
	},

	keys: {
		title: 'Dispositivos e chaves',
		link: 'Dispositivos e chaves',
		intro:
			'A chave privada é gerada aqui no seu navegador e nunca é enviada para nós. Guardamos apenas a chave pública.',
		empty: 'Nenhum dispositivo ainda. Gere uma chave para conectar o primeiro.',
		nameLabel: 'Nome do dispositivo',
		namePlaceholder: 'Notebook do trabalho',
		ownerLabel: 'Dono da chave',
		ownerSelf: 'Eu',
		ownerHelp:
			'A chave privada é gerada neste navegador e baixada aqui. Se você escolher outra pessoa, entregue o arquivo a ela.',
		generate: 'Gerar chave e baixar configuração',
		downloadWarning:
			'Este arquivo contém a chave privada e só pode ser baixado agora. Se você perdê-lo, gere uma chave nova — a antiga deixa de valer.',
		downloaded: 'Configuração baixada. Importe o arquivo no cliente WireGuard.',
		pending: 'Liberando o acesso no servidor…',
		pendingHelp: 'O túnel começa a responder assim que isso terminar.',
		active: 'Ativo',
		createdAt: 'Criado em {{date}}',
		address: 'Endereço no túnel',
		ownedBy: 'De {{email}}',
		revoke: 'Revogar',
		revokeConfirmTitle: 'Revogar este dispositivo?',
		revokeConfirmBody:
			'A configuração de {{name}} para de conectar em instantes. Não dá para desfazer — seria preciso gerar uma chave nova.',
		revokeClientWarning:
			'O WireGuard no computador continua marcando o túnel como ativo depois disso, e descarta tudo em silêncio. Apague o túnel no aplicativo — ele não some sozinho.',
		revokeConfirmAccept: 'Sim, revogar',
		revokeConfirmDismiss: 'Manter dispositivo',
		revoked: 'Dispositivo revogado.',
		regionLabel: 'Região',
		regionHelp: 'Escolha por onde o seu tráfego sai.',
		regionEmpty: 'Nenhuma região disponível no momento. Tente de novo em alguns minutos.',
		regionUnavailable: 'Nenhum servidor desta região está respondendo agora. Escolha outra.',
		unsupported:
			'Este navegador não sabe gerar chaves X25519. Atualize-o ou use outro para criar um dispositivo.',
	},

	users: {
		title: 'Usuários',
		link: 'Usuários',
		intro: 'Quem tem acesso a esta empresa.',
		empty: 'Nenhum usuário além de você ainda.',
		emailLabel: 'E-mail',
		roleLabel: 'Função',
		roleOwner: 'Dono',
		roleAdmin: 'Administrador',
		roleMember: 'Membro',
		you: 'Você',
		createdAt: 'Criado em {{date}}',
		liveDevices: 'Dispositivos ativos: {{count}}',
		create: 'Criar usuário',
		createTitle: 'Novo usuário',
		created: 'Usuário criado.',
		emailTaken: 'Já existe um usuário com este e-mail nesta empresa.',
		passwordTitle: 'Senha temporária de {{email}}',
		passwordBody:
			'Esta senha aparece uma única vez. Copie agora e entregue à pessoa — depois de fechar não dá para vê-la de novo, só gerar outra por "esqueci minha senha".',
		passwordCopy: 'Copiar senha',
		passwordCopied: 'Senha copiada.',
		passwordDone: 'Já copiei',
		roleOf: 'Função de {{email}}',
		roleChanged: 'Função alterada. As sessões dessa pessoa foram encerradas.',
		remove: 'Remover',
		removeConfirmTitle: 'Remover {{email}}?',
		removeConfirmBody: 'A pessoa perde o acesso na hora, e isso não pode ser desfeito.',
		removeConfirmAccept: 'Sim, remover',
		removeConfirmDismiss: 'Manter usuário',
		removed: 'Usuário removido.',
		removeBlocked: 'Revogue os dispositivos desta pessoa antes de removê-la.',
		selfForbidden: 'Você não pode mudar a própria função nem remover a si mesmo.',
		ownerForbidden: 'O dono da empresa não pode ser alterado nem removido.',
	},
	permissions: {
		title: 'Permissões',
		link: 'Permissões',
		intro:
			'O que cada função pode fazer nesta empresa. O padrão vem do produto; o que você mudar aqui vale só para esta empresa.',
		byRole: 'Por função',
		byPerson: 'Por pessoa',
		byPersonIntro:
			'Exceções para uma pessoa específica, por cima da função dela. Use quando alguém precisa de mais — ou de menos — que os colegas.',
		byPersonEmpty: 'Ninguém tem exceção. Todos seguem a função.',
		changed: 'Padrão alterado.',
		reset: 'Voltar ao padrão',
		resetAll: 'Voltar tudo ao padrão',
		modified: 'Diferente do padrão',
		name: {
			billing: { manage: 'Gerir a assinatura' },
			users: {
				read: 'Ver os usuários',
				create: 'Criar usuários',
				update: 'Mudar a função de alguém',
				delete: 'Remover usuários',
			},
			devices: {
				create: 'Gerar a própria chave',
				assign: 'Gerar chave para outra pessoa',
				readAll: 'Ver as chaves de todo mundo',
				revokeAll: 'Revogar a chave de qualquer pessoa',
			},
			permissions: { manage: 'Gerir permissões' },
		},
		hint: {
			billing: { manage: 'Assinar, cancelar e retomar. Mexe no dinheiro da empresa.' },
			users: {
				read: 'Abrir a página de usuários e ver quem tem acesso.',
				create: 'Convidar alguém novo, com a senha temporária.',
				update: 'Promover ou rebaixar um colega.',
				delete: 'Tirar o acesso de alguém na hora.',
			},
			devices: {
				create: 'Gerar chave e baixar a configuração do WireGuard.',
				assign:
					'Escolher o dono ao gerar. Quem gera fica com a chave privada, então dê isto a quem faz suporte.',
				readAll: 'Enxergar o inventário inteiro em vez de só as próprias chaves.',
				revokeAll: 'Derrubar o túnel de qualquer pessoa da empresa na hora.',
			},
			permissions: { manage: 'Editar esta página.' },
		},
	},
	email: {
		verify_email: {
			subject: 'Confirme seu e-mail',
			body: 'Bem-vindo ao poc-vpn.\n\nConfirme seu e-mail acessando:\n{{url}}\n\nO link expira em {{expiresInHours}} horas.',
		},
		reset_password: {
			subject: 'Redefinição de senha',
			body: 'Recebemos um pedido para redefinir sua senha.\n\nAcesse:\n{{url}}\n\nO link expira em {{expiresInHours}} hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail.',
		},
		password_changed: {
			subject: 'Sua senha foi alterada',
			body: 'Sua senha foi alterada e todas as sessões ativas foram encerradas.\n\nSe não foi você, redefina sua senha imediatamente.',
		},
		welcome: {
			subject: 'Sua conta está ativa',
			body: 'Seu e-mail foi confirmado e sua conta está ativa.',
		},
		payment_failed: {
			subject: 'Não conseguimos processar seu pagamento',
			body: 'A cobrança da sua assinatura falhou.\n\nAtualize seu meio de pagamento em:\n{{url}}',
		},
		subscription_activated: {
			subject: 'Sua assinatura está ativa',
			body: 'Sua assinatura foi ativada e o acesso já está liberado.\n\nOs detalhes estão em:\n{{url}}',
		},
		subscription_cancel_scheduled: {
			subject: 'Seu cancelamento foi agendado',
			body: 'Sua assinatura foi cancelada e o acesso continua até {{endsAt}}.\n\nMudou de ideia? Retome em:\n{{url}}',
		},
		subscription_resumed: {
			subject: 'Sua assinatura continua ativa',
			body: 'O cancelamento foi desfeito e sua assinatura volta a renovar normalmente.\n\nOs detalhes estão em:\n{{url}}',
		},
		subscription_canceled: {
			subject: 'Assinatura cancelada',
			body: 'Sua assinatura foi cancelada e o acesso ao plano terminou.\n\nPara voltar, assine de novo em:\n{{url}}',
		},
		access_revoked: {
			subject: 'Seu acesso foi suspenso',
			body: 'Não conseguimos manter sua assinatura em dia, e o acesso ao plano foi suspenso.\n\nRegularize o pagamento para recuperá-lo em:\n{{url}}',
		},
	},

	sms: {
		verify_phone: 'Seu código de verificação poc-vpn é {{code}}.',
		login_code: 'Seu código de acesso poc-vpn é {{code}}.',
	},

	validation: {
		email: {
			invalid: 'Informe um e-mail válido.',
			tooLong: 'E-mail longo demais.',
		},
		password: {
			tooShort: 'A senha precisa ter ao menos 12 caracteres.',
			tooLong: 'A senha pode ter no máximo 200 caracteres.',
			required: 'Informe sua senha.',
		},
		slug: {
			invalid: 'Identificador de empresa inválido.',
		},
		token: {
			invalid: 'Código inválido.',
		},
		locale: {
			unsupported: 'Idioma não suportado.',
		},
		publicKey: {
			invalid: 'Esta não é uma chave pública WireGuard válida.',
		},
		role: {
			invalid: 'Função inválida.',
		},
		region: {
			required: 'Escolha uma região.',
		},
		exitNodeEndpoint: {
			invalid: 'Informe endereço e porta, como 203.0.113.10:51820.',
		},
		deviceName: {
			required: 'Dê um nome a este dispositivo.',
			tooLong: 'O nome pode ter no máximo 60 caracteres.',
		},
	},

	errors: {
		VALIDATION_FAILED: 'Confira os campos destacados.',
		INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
		EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de entrar.',
		TOKEN_INVALID: 'Este link não é válido ou já foi utilizado.',
		TOKEN_EXPIRED: 'Este link expirou. Solicite um novo.',
		SESSION_REUSE_DETECTED: 'Sua sessão foi encerrada por segurança. Entre novamente.',
		RATE_LIMITED: 'Muitas tentativas. Tente de novo mais tarde.',
		UNAUTHENTICATED: 'Entre para continuar.',
		FORBIDDEN: 'Você não tem acesso a este recurso.',
		NOT_FOUND: 'Não encontramos o que você procura.',
		CONFLICT: 'Esta operação conflita com o estado atual.',
		PAYMENT_REQUIRED: 'É necessário ter uma assinatura ativa.',
		QUOTA_EXCEEDED: 'Seu plano já está no limite. Revogue algo antes de criar outro.',
		INTERNAL: 'Algo deu errado do nosso lado. Tente novamente.',
		_NETWORK_ERROR: 'Não foi possível conectar. Verifique sua internet.',
		_PARSE_ERROR: 'Recebemos uma resposta inesperada do servidor.',
		_UNKNOWN_ERROR: 'Algo deu errado. Tente novamente.',
	},
} as const;

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export type LocaleMessages = Shape<typeof ptBR>;

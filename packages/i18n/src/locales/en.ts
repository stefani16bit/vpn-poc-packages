import type { LocaleMessages } from './pt-BR.js';

export const en: LocaleMessages = {
	common: {
		appName: 'poc-vpn',
		loading: 'Loading…',
		wait: 'Please wait…',
		back: 'Back',
		errorCode: 'Reference',
		language: 'Language',
		languageName: 'English',
		theme: 'Theme',
		themeDark: 'Dark',
		themeLight: 'Light',
		skipToContent: 'Skip to content',
	},

	auth: {
		login: {
			title: 'Sign in',
			email: 'E-mail',
			password: 'Password',
			submit: 'Sign in',
			forgot: 'Forgot my password',
			signupLink: 'Create an account',
		},
		signup: {
			title: 'Create an account',
			email: 'E-mail',
			password: 'Password',
			passwordHint: 'At least 12 characters. A long phrase beats symbols.',
			submit: 'Create account',
			haveAccount: 'Already have an account?',
			loginLink: 'Sign in',
			checkInboxTitle: 'Check your e-mail',
			checkInboxBody: 'If {{email}} can be registered, we have sent a confirmation link.',
			checkInboxExpiry: 'The link expires in 24 hours.',
		},
		verifyEmail: {
			pendingTitle: 'Confirm your e-mail',
			pendingBody: 'We sent you a confirmation link. Open it to activate your account.',
			verifying: 'Confirming…',
			successTitle: 'E-mail confirmed',
			successBody: 'Your account is active.',
			failureTitle: 'We could not confirm it',
			email: 'E-mail',
			resend: 'Resend link',
			resendIn: 'Resend in {{seconds}}s',
		},
		forgotPassword: {
			title: 'Forgot my password',
			email: 'E-mail',
			submit: 'Send link',
			sentTitle: 'Check your e-mail',
			sentBody: 'If an account exists for that address, we have sent a reset link.',
			sentExpiry: 'The link expires in 1 hour and can only be used once.',
		},
		resetPassword: {
			title: 'New password',
			password: 'New password',
			submit: 'Reset password',
			warning: 'Resetting will end every active session on this account.',
			invalidLinkTitle: 'Invalid link',
			invalidLinkBody: 'This address does not carry a reset code.',
			requestNew: 'Request a new link',
		},
		logout: 'Sign out',
	},

	billing: {
		accountTitle: 'Your account',
		subscriptionTitle: 'Subscription',
		renewsOn: 'renews on {{date}}',
		cancelScheduled:
			'Cancellation is scheduled. Access continues until the end of the paid period.',
		periodEndUnknown: 'the end of the current period',
		subscribeMonthly: 'Subscribe monthly',
		subscribeYearly: 'Subscribe yearly',
		cancel: 'Cancel subscription',
		planTitle: 'The plan includes',
		seats: '{{count}} users',
		devicesPerUser: '{{count}} devices per user',
		monthlyTrafficGb: '{{count}} GB of traffic per month',
		regions: 'Regions: {{regions}}',
		status: {
			none: 'No subscription',
			active: 'Active',
			trialing: 'Trialing',
			past_due: 'Payment pending',
			canceled: 'Canceled',
			incomplete: 'Awaiting payment confirmation',
		},
	},

	email: {
		verify_email: {
			subject: 'Confirm your e-mail',
			body: 'Welcome to poc-vpn.\n\nConfirm your e-mail at:\n{{url}}\n\nThe link expires in {{expiresInHours}} hours.',
		},
		reset_password: {
			subject: 'Password reset',
			body: 'We received a request to reset your password.\n\nGo to:\n{{url}}\n\nThe link expires in {{expiresInHours}} hour and can only be used once. If this was not you, ignore this e-mail.',
		},
		password_changed: {
			subject: 'Your password was changed',
			body: 'Your password was changed and every active session was ended.\n\nIf this was not you, reset your password immediately.',
		},
		welcome: {
			subject: 'Your account is active',
			body: 'Your e-mail was confirmed and your account is active.',
		},
		payment_failed: {
			subject: 'We could not process your payment',
			body: 'The charge for your subscription failed.\n\nUpdate your payment method at:\n{{url}}',
		},
		subscription_canceled: {
			subject: 'Subscription canceled',
			body: 'Your subscription was canceled and access continues until {{endsAt}}.',
		},
	},

	sms: {
		verify_phone: 'Your poc-vpn verification code is {{code}}.',
		login_code: 'Your poc-vpn sign-in code is {{code}}.',
	},

	validation: {
		email: {
			invalid: 'Enter a valid e-mail address.',
			tooLong: 'E-mail address is too long.',
		},
		password: {
			tooShort: 'Password must be at least 12 characters.',
			tooLong: 'Password must be at most 200 characters.',
			required: 'Enter your password.',
		},
		slug: {
			invalid: 'That company identifier is not valid.',
		},
		token: {
			invalid: 'Invalid code.',
		},
		locale: {
			unsupported: 'Unsupported language.',
		},
	},

	errors: {
		VALIDATION_FAILED: 'Check the highlighted fields.',
		INVALID_CREDENTIALS: 'E-mail or password is incorrect.',
		EMAIL_NOT_VERIFIED: 'Confirm your e-mail before signing in.',
		TOKEN_INVALID: 'This link is not valid or has already been used.',
		TOKEN_EXPIRED: 'This link has expired. Request a new one.',
		SESSION_REUSE_DETECTED: 'Your session was ended for security. Sign in again.',
		RATE_LIMITED: 'Too many attempts. Try again in a few minutes.',
		UNAUTHENTICATED: 'Sign in to continue.',
		FORBIDDEN: 'You do not have access to this resource.',
		NOT_FOUND: 'We could not find what you are looking for.',
		CONFLICT: 'This operation conflicts with the current state.',
		PAYMENT_REQUIRED: 'An active subscription is required.',
		INTERNAL: 'Something went wrong on our side. Try again.',
		_NETWORK_ERROR: 'Could not connect. Check your internet.',
		_PARSE_ERROR: 'We received an unexpected response from the server.',
		_UNKNOWN_ERROR: 'Something went wrong. Try again.',
	},
};

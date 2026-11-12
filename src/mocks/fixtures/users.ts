import type { Wallet } from '@/types/api'

/**
 * Usuários fictícios. As senhas NÃO são armazenadas em claro:
 * guardamos apenas `sha256(salt + ":" + senha)`.
 * Credenciais de demonstração (documentadas no README):
 *   ana@kurio.dev   / Kurio@2026
 *   bruno@kurio.dev / Kurio@2026
 */
export interface UserRecord {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
  ensName: string
  ensSuffix: '.eth' | '.kurio.eth'
  walletNickname: string
  salt: string
  passwordHash: string
  updatedAt: string
}

export function buildUserFixtures(): UserRecord[] {
  return [
    {
      id: 'usr_ana',
      username: 'ana.kurio',
      email: 'ana@kurio.dev',
      displayName: 'Ana Colecionadora',
      avatarUrl: null,
      ensName: 'ana',
      ensSuffix: '.eth',
      walletNickname: 'Principal',
      salt: 's4lt-ana',
      passwordHash: 'c3be53475363a80642d9ce621228ed3613b7e4812e5b7f6e9b16e8fbfb1d6af7',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 'usr_bruno',
      username: 'bruno.nft',
      email: 'bruno@kurio.dev',
      displayName: 'Bruno Nakamoto',
      avatarUrl: null,
      ensName: 'bruno',
      ensSuffix: '.eth',
      walletNickname: 'Cofre',
      salt: 's4lt-bruno',
      passwordHash: 'd9f17f4f8981be222854e79ed72424a9e163a105bf5b8c4b7a06406629c13d00',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
  ]
}

export function buildWalletFixtures(): Record<string, Wallet[]> {
  return {
    usr_ana: [
      {
        id: 'wal_ana_primary',
        role: 'primary',
        displayName: 'Ana Colecionadora',
        nickname: 'Principal',
        profileName: 'ana.kurio',
        network: 'ethereum',
        address: '0xA91F3c2b7D5e4F1a9B8c6D2e0F7a3B5c4D90E82C',
        secondaryAddress: null,
        provider: 'metamask',
        referralCode: 'KURIO-ANA',
        email: 'ana@kurio.dev',
        ensName: 'ana',
        ensSuffix: '.eth',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
      {
        id: 'wal_ana_secondary',
        role: 'secondary',
        displayName: 'Ana Colecionadora',
        nickname: 'Reserva',
        profileName: 'ana.kurio',
        network: 'polygon',
        address: '0x5B2e8C1d4F7a9E3b6D0c2A8f1E5b7C9d3A6f41D7',
        secondaryAddress: 'nova.kurio.eth',
        provider: 'coinbase',
        referralCode: 'KURIO-ANA',
        email: 'ana@kurio.dev',
        ensName: 'nova',
        ensSuffix: '.kurio.eth',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    ],
    // Bruno não tem carteiras: exercita o fluxo de cadastro de carteira antes do pagamento.
    usr_bruno: [],
  }
}

export interface CouponRule {
  code: string
  kind: 'percent' | 'fixed'
  value: string
  minSubtotal: string
  expiresAt: string
  description: string
}

export const COUPONS: CouponRule[] = [
  { code: 'KURIO10', kind: 'percent', value: '10', minSubtotal: '0', expiresAt: '2099-12-31T23:59:59.000Z', description: '10% de desconto no lançamento' },
  { code: 'GENESIS', kind: 'fixed', value: '0.5', minSubtotal: '2', expiresAt: '2099-12-31T23:59:59.000Z', description: '0.5 ETH de desconto acima de 2 ETH' },
  { code: 'EXPIRADO', kind: 'percent', value: '20', minSubtotal: '0', expiresAt: '2025-01-01T00:00:00.000Z', description: 'Cupom de campanha encerrada' },
]

export const NETWORK_FEES = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
} as const

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../src/services/api'
import { changeMyPassword, closeMyAccount, updateMyProfile } from '../src/services/user.service'

describe('user.service', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('updateMyProfile hace PATCH /api/users/me y devuelve el usuario', async () => {
    const user = { id: 'u1', full_name: 'Ana', email: 'ana@nexpay.com', status: 'active', created_at: '2026-03-05T10:00:00Z' }
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: user } })

    const result = await updateMyProfile({ full_name: 'Ana' })

    expect(patch).toHaveBeenCalledWith('/api/users/me', { full_name: 'Ana' })
    expect(result).toEqual(user)
  })

  it('closeMyAccount hace DELETE /api/users/me enviando la contraseña en el body', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ status: 204 })

    await closeMyAccount('Secreta123')

    expect(del).toHaveBeenCalledWith('/api/users/me', { data: { password: 'Secreta123' } })
  })

  it('changeMyPassword hace PATCH /api/users/me/password con la actual y la nueva', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ status: 204 })

    await changeMyPassword('Secreta123', 'NuevaSecreta456')

    expect(patch).toHaveBeenCalledWith('/api/users/me/password', {
      current_password: 'Secreta123',
      new_password: 'NuevaSecreta456',
    })
  })
})

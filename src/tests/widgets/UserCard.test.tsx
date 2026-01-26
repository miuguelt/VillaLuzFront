import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { UserCard } from '@/widgets/dashboard/UserCard'

describe('UserCard', () => {
  const baseUser = {
    id: 1,
    username: 'juan',
    email: 'juan@example.com',
    role: 'Administrador',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    lastLogin: '2025-01-10T00:00:00.000Z',
  }

  it('renderiza el botón "Ver Perfil" y lo mantiene al fondo del card', () => {
    const onView = jest.fn()
    render(<UserCard user={baseUser as any} onView={onView} />)

    const viewBtn = screen.getByRole('button', { name: /ver perfil/i })
    expect(viewBtn).toBeInTheDocument()

    const footer = viewBtn.closest('div')
    expect(footer).toHaveClass('mt-auto')
  })

  it('invoca onView al hacer clic en "Ver Perfil"', async () => {
    const user = userEvent.setup()
    const onView = jest.fn()

    render(<UserCard user={baseUser as any} onView={onView} />)

    await user.click(screen.getByRole('button', { name: /ver perfil/i }))
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('permite ver detalles desde el menú de opciones', async () => {
    const user = userEvent.setup()
    const onView = jest.fn()

    render(<UserCard user={baseUser as any} onView={onView} />)

    await user.click(screen.getByRole('button', { name: /más opciones/i }))
    await user.click(screen.getByRole('menuitem', { name: /ver detalles/i }))

    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })
})


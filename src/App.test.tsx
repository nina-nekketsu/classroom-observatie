import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('live classroom grid', () => {
  it('selects a student, records an action, and can undo it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: /Goed antwoord/i }))

    expect(screen.getByTestId('noah-score')).toHaveTextContent('+1')
    expect(screen.getByTestId('pending-sync')).toHaveTextContent('1 wachtend')

    await user.click(screen.getByRole('button', { name: /Ongedaan maken/i }))
    expect(screen.getByTestId('noah-score')).toHaveTextContent('0')
  })
})

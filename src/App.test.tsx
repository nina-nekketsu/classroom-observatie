import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

beforeEach(() => localStorage.clear())
afterEach(() => cleanup())

describe('live classroom workflow', () => {
  it('starts with attendance, then frees the grid for live observations', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Aanwezigheid' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /afwezig melden/i })).toHaveLength(32)

    await user.click(screen.getByRole('button', { name: 'Noah B. afwezig melden' }))
    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))

    expect(screen.getByRole('heading', { name: 'Kies eerst een leerling' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sara K. afwezig melden' })).not.toBeInTheDocument()
    expect(screen.getByText('31/32')).toBeInTheDocument()
  })

  it('can restore an absent student and mark them late from the student panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Noah B. afwezig melden' }))
    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Aanwezig en te laat' }))

    expect(screen.getByText('Te laat')).toBeInTheDocument()
    expect(screen.getByText('32/32')).toBeInTheDocument()
  })

  it('records an action, a lesson note, and exposes dated note history', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: /Goed antwoord/i }))

    expect(screen.getByTestId('noah-answer-points')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.type(screen.getByRole('textbox', { name: 'Lesnotitie' }), 'Had extra uitleg nodig.')
    await user.click(screen.getByRole('button', { name: 'Notitie bewaren' }))
    await user.click(screen.getByRole('button', { name: 'Notities van Noah B.' }))

    expect(screen.getByText('Had extra uitleg nodig.')).toBeInTheDocument()
  })

  it('shows how many warnings were logged so follow-up can be assessed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    for (let count = 0; count < 2; count += 1) {
      await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
      await user.click(screen.getByRole('button', { name: 'Waarschuwing gegeven' }))
    }
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))

    expect(screen.getByRole('button', { name: 'Waarschuwing gegeven' })).toHaveTextContent('2×')
  })

  it('checks homework and materials from a dedicated compact tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Huiswerk & spullen' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. huiswerk niet in orde' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. spullen in orde' }))

    expect(screen.getByTestId('noah-preparation')).toHaveTextContent('Huiswerk mist')
    expect(screen.getByTestId('noah-preparation')).toHaveTextContent('Spullen oké')
  })
})

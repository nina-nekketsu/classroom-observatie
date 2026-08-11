import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

beforeEach(() => localStorage.clear())
afterEach(() => cleanup())

describe('live classroom workflow', () => {
  it('starts with attendance, offers alphabetical navigation, then hides absent students from live observations', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Aanwezigheid' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /afwezig melden/i })).toHaveLength(32)
    expect(screen.getByRole('link', { name: 'N' })).toHaveAttribute('href', '#attendance-N')
    expect(document.getElementById('attendance-N')).toHaveTextContent('Noah B.')

    await user.click(screen.getByRole('button', { name: 'Noah B. afwezig melden' }))
    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))

    expect(screen.getByRole('heading', { name: 'Kies eerst een leerling' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Noah B. selecteren' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /selecteren/i })).toHaveLength(31)
    expect(screen.getByText('31/32')).toBeInTheDocument()
  })

  it('restores an absent student as late from the attendance tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Noah B. afwezig melden' }))
    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    expect(screen.queryByRole('button', { name: 'Noah B. selecteren' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Aanwezigheid' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. te laat melden' }))
    await user.click(screen.getByRole('tab', { name: 'Live observaties' }))

    expect(screen.getByText('Te laat')).toBeInTheDocument()
    expect(screen.getByText('32/32')).toBeInTheDocument()
  })

  it('offers only goed, fout, bijna goed, and geen antwoord in the answer controls', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    fireEvent.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))

    expect(screen.getByRole('button', { name: 'Goed antwoord' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fout antwoord' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bijna goed antwoord' })).toHaveTextContent('Bijna goed')
    expect(screen.getByRole('button', { name: 'Niet beantwoord' })).toBeInTheDocument()
    expect(screen.queryByText(/neutraal/i)).not.toBeInTheDocument()
  }, 15_000)

  it('records an action, a lesson note, and exposes dated note history', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Goed antwoord' }))

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

  it('marks a note as important, highlights the student, and shows the class-wide important overview', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.type(screen.getByRole('textbox', { name: 'Lesnotitie' }), 'Volgende les direct controleren.')
    await user.click(screen.getByRole('checkbox', { name: 'Belangrijke notitie' }))
    await user.click(screen.getByRole('button', { name: 'Notitie bewaren' }))
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))

    expect(screen.getByRole('button', { name: 'Notities van Noah B.' })).toHaveClass('important')
    await user.click(screen.getByRole('button', { name: /Belangrijke notities/i }))

    expect(screen.getByLabelText('Belangrijke notities van de klas')).toHaveTextContent('Noah B.')
    expect(screen.getByLabelText('Belangrijke notities van de klas')).toHaveTextContent('Volgende les direct controleren.')
  })

  it('does not carry an unsaved important-note draft to another student', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.type(screen.getByRole('textbox', { name: 'Lesnotitie' }), 'Alleen voor Noah')
    await user.click(screen.getByRole('checkbox', { name: 'Belangrijke notitie' }))
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    await user.click(screen.getByRole('button', { name: 'Sara K. selecteren' }))

    expect(screen.getByRole('textbox', { name: 'Lesnotitie' })).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Belangrijke notitie' })).not.toBeChecked()
  })

  it('checks homework and materials from a dedicated compact tab with alphabetical navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Huiswerk & spullen' }))
    expect(screen.getByRole('link', { name: 'N' })).toHaveAttribute('href', '#preparation-N')
    expect(document.getElementById('preparation-N')).toHaveTextContent('Noah B.')
    await user.click(screen.getByRole('button', { name: 'Noah B. huiswerk niet in orde' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. spullen in orde' }))

    expect(screen.getByTestId('noah-preparation')).toHaveTextContent('Huiswerk mist')
    expect(screen.getByTestId('noah-preparation')).toHaveTextContent('Spullen oké')
  })
})

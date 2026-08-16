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


describe('post-live navigation and roster management', () => {
  it('navigates between Live, Klassen, and Overzicht and creates/selects a second class', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('navigation', { name: 'Hoofdnavigatie' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Live' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: 'Klassen' }))
    expect(screen.getByRole('heading', { name: 'Klassen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '✦ Kies leerling' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Klasnaam'), '4H1 · Scheikunde')
    await user.type(screen.getByLabelText('Schooljaar'), '2026-2027')
    await user.click(screen.getByRole('button', { name: 'Klas toevoegen' }))
    await user.click(screen.getByRole('button', { name: '4H1 · Scheikunde selecteren' }))

    expect(screen.getByRole('heading', { name: '4H1 · Scheikunde' })).toBeInTheDocument()
    expect(screen.getByText(/2026-2027 · 0 leerlingen/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overzicht' }))
    expect(screen.getByRole('heading', { name: 'Leerlingoverzicht' })).toBeInTheDocument()
    expect(screen.getByText(/kies een leerling om aantallen/i)).toBeInTheDocument()
  })

  it('starts and ends a lesson session and records observations in the current session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Live' }))
    expect(screen.getByText(/Actieve sessie/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Les beëindigen' }))
    expect(screen.getByText(/Geen actieve sessie/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nieuwe les starten' }))
    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Goed antwoord' }))

    expect(screen.getByLabelText('Lessessie')).toHaveTextContent('1observatie in deze sessie')
  })

  it('cannot undo an observation after the lesson has ended', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Goed antwoord' }))
    expect(screen.getByRole('button', { name: '↶ Ongedaan maken' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Les beëindigen' }))

    expect(screen.getByRole('button', { name: '↶ Ongedaan maken' })).toBeDisabled()
    expect(screen.getByLabelText('Lessessie')).toHaveTextContent('0observaties in deze sessie')
  })

  it('previews only confirmed fictitious imports and imports valid rows after confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Klassen' }))
    await user.click(screen.getByRole('button', { name: /Import voorbeeld/i }))
    expect(screen.getByText(/Bevestig dat dit fictieve testdata is/i)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /Ik gebruik alleen fictieve testdata/i }))
    await user.click(screen.getByRole('button', { name: /Import voorbeeld/i }))
    expect(screen.getByText('Test Leerling 1')).toBeInTheDocument()
    expect(screen.getByText('Dubbele leerlingnaam.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import bevestigen' })).toBeDisabled()

    await user.clear(screen.getByLabelText('Importgegevens'))
    await user.type(screen.getByLabelText('Importgegevens'), 'naam\nTest Leerling 1\nDemo Student 2')
    await user.click(screen.getByRole('button', { name: /Import voorbeeld/i }))
    await user.click(screen.getByRole('button', { name: 'Import bevestigen' }))

    expect(screen.getByLabelText('Klassenlijst')).toHaveTextContent('2026-2027 · 34 leerlingen')
    await user.click(screen.getByRole('button', { name: 'Live' }))
    await user.click(screen.getByRole('tab', { name: 'Aanwezigheid' }))
    expect(screen.getByText('Test Leerling 1')).toBeInTheDocument()
  })

  it('loads a fictitious CSV file into the import preview', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Klassen' }))
    const file = new File(['naam\nTest Leerling 9'], 'testklas.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('CSV of TSV kiezen'), file)

    expect(screen.getByLabelText('Importgegevens')).toHaveValue('naam\nTest Leerling 9')
    expect(screen.getByText(/sla het werkblad eerst op als CSV/i)).toBeInTheDocument()
  })

  it('keeps important notes, latest actions, badges, and undo inside the active class session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Goed antwoord' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.type(screen.getByRole('textbox', { name: 'Lesnotitie' }), 'Alleen in de eerste klas.')
    await user.click(screen.getByRole('checkbox', { name: 'Belangrijke notitie' }))
    await user.click(screen.getByRole('button', { name: 'Notitie bewaren' }))
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))

    await user.click(screen.getByRole('button', { name: 'Klassen' }))
    await user.type(screen.getByLabelText('Klasnaam'), 'Testklas')
    await user.click(screen.getByRole('button', { name: 'Klas toevoegen' }))
    await user.click(screen.getByRole('button', { name: 'Testklas selecteren' }))
    await user.click(screen.getByRole('checkbox', { name: /Ik gebruik alleen fictieve testdata/i }))
    await user.clear(screen.getByLabelText('Importgegevens'))
    await user.type(screen.getByLabelText('Importgegevens'), 'naam\nTest Noah')
    await user.click(screen.getByRole('button', { name: /Import voorbeeld/i }))
    await user.click(screen.getByRole('button', { name: 'Import bevestigen' }))
    await user.click(screen.getByRole('button', { name: 'Live' }))
    await user.click(screen.getByRole('button', { name: 'Nieuwe les starten' }))

    expect(screen.getByRole('button', { name: /Belangrijke notities/i })).not.toHaveTextContent('(1)')
    expect(screen.queryByText(/Laatste/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↶ Ongedaan maken' })).toBeDisabled()
  })

  it('shows a student overview with transparent answer counts and a lesson filter', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Aanwezigheid afronden' }))
    for (const action of ['Goed antwoord', 'Fout antwoord', 'Bijna goed antwoord']) {
      await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
      await user.click(screen.getByRole('button', { name: action }))
    }
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.type(screen.getByRole('textbox', { name: 'Lesnotitie' }), 'Eerste sessie.')
    await user.click(screen.getByRole('button', { name: 'Notitie bewaren' }))
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    await user.click(screen.getByRole('button', { name: 'Les beëindigen' }))
    await user.click(screen.getByRole('button', { name: 'Nieuwe les starten' }))
    await user.click(screen.getByRole('button', { name: 'Noah B. selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Goed antwoord' }))

    await user.click(screen.getByRole('button', { name: 'Overzicht' }))

    expect(screen.getByRole('heading', { name: 'Leerlingoverzicht' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Leerling'), 'noah')
    expect(screen.getByTestId('overview-turns')).toHaveTextContent('4')
    expect(screen.getByTestId('overview-correct')).toHaveTextContent('2')
    expect(screen.getByTestId('overview-incorrect')).toHaveTextContent('1')
    expect(screen.getByTestId('overview-almost-correct')).toHaveTextContent('1')
    expect(screen.getByTestId('overview-unanswered')).toHaveTextContent('0')
    expect(screen.getByText('Eerste sessie.')).toBeInTheDocument()

    const firstSessionId = screen.getAllByRole('option', { name: /Les van/ })[0].getAttribute('value')
    await user.selectOptions(screen.getByLabelText('Lessessie'), firstSessionId ?? '')
    expect(screen.getByTestId('overview-turns')).toHaveTextContent('3')
    expect(screen.getByTestId('overview-correct')).toHaveTextContent('1')
  })

  it('clears stale student and lesson filters after switching classes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Overzicht' }))
    await user.selectOptions(screen.getByLabelText('Leerling'), 'noah')
    const firstSessionId = screen.getAllByRole('option', { name: /Les van/ })[0].getAttribute('value')
    await user.selectOptions(screen.getByLabelText('Lessessie'), firstSessionId ?? '')

    await user.click(screen.getByRole('button', { name: 'Klassen' }))
    await user.type(screen.getByLabelText('Klasnaam'), 'Testklas')
    await user.click(screen.getByRole('button', { name: 'Klas toevoegen' }))
    await user.click(screen.getByRole('button', { name: 'Testklas selecteren' }))
    await user.click(screen.getByRole('button', { name: '3M2 · NaSk 2 selecteren' }))
    await user.click(screen.getByRole('button', { name: 'Overzicht' }))

    expect(screen.getByLabelText('Leerling')).toHaveValue('')
    expect(screen.getByLabelText('Lessessie')).toHaveValue('all')
    expect(screen.getByText(/kies een leerling om aantallen/i)).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PredictionColumn } from '@/components/predictions/PredictionColumn'

describe('PredictionColumn', () => {
  it('shows pick and pct when stars >= 2', () => {
    render(
      <PredictionColumn
        label="Moneyline"
        stars={4}
        pick="LAL"
        pct={62.3}
        lineRef={null}
      />
    )
    expect(screen.getByText('Moneyline')).toBeInTheDocument()
    expect(screen.getByText('LAL')).toBeInTheDocument()
    expect(screen.getByText('62.3%')).toBeInTheDocument()
    expect(screen.queryByText('PASS')).toBeNull()
  })

  it('shows PASS and lineRef when stars === 1', () => {
    render(
      <PredictionColumn
        label="O/U"
        stars={1}
        pick="O 218.5"
        pct={51}
        lineRef="218.5"
      />
    )
    expect(screen.getByText('PASS')).toBeInTheDocument()
    expect(screen.getByText('218.5')).toBeInTheDocument()
    expect(screen.queryByText('O 218.5')).toBeNull()
    expect(screen.queryByText('51%')).toBeNull()
  })

  it('shows PASS without lineRef when lineRef is null', () => {
    render(
      <PredictionColumn
        label="Moneyline"
        stars={1}
        pick="LAL"
        pct={52}
        lineRef={null}
      />
    )
    expect(screen.getByText('PASS')).toBeInTheDocument()
    expect(screen.queryByText('52%')).toBeNull()
  })
})

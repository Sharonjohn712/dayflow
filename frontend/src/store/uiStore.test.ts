// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from './uiStore'

beforeEach(() => {
  localStorage.clear()
  useUIStore.setState({ activeView: 'overview', taskFilter: 'all', taskSort: 'added', userName: '' })
})

describe('useUIStore', () => {
  it('starts on the overview with no filters', () => {
    const s = useUIStore.getState()
    expect([s.activeView, s.taskFilter, s.taskSort, s.userName]).toEqual(['overview', 'all', 'added', ''])
  })

  it('updates view, filter, sort and name', () => {
    const s = useUIStore.getState()
    s.setView('planner')
    s.setTaskFilter('WORK')
    s.setTaskSort('time')
    s.setUserName('Sam')
    expect(useUIStore.getState()).toMatchObject({
      activeView: 'planner', taskFilter: 'WORK', taskSort: 'time', userName: 'Sam',
    })
  })

  it('persists only the user name', () => {
    useUIStore.getState().setUserName('Sam')
    useUIStore.getState().setView('journal')
    const saved = JSON.parse(localStorage.getItem('dayflow-ui') ?? '{}')
    expect(saved.state).toEqual({ userName: 'Sam' })
  })
})

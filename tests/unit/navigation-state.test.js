import { describe, expect, it } from 'vitest';
import { createNavigationState } from '../../src/app/navigation-state.js';

describe('estado de navegación', () => {
  it('mantiene separados el sidebar y el menú móvil', () => {
    const state = createNavigationState(true);
    expect(state.collapsed).toBe(true);
    expect(state.toggleSidebar()).toBe(false);
    expect(state.setMenuOpen(true)).toBe(true);
    expect(state.collapsed).toBe(false);
  });
});

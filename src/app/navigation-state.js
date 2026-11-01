export function createNavigationState(initialCollapsed = false) {
  let collapsed = initialCollapsed;
  let menuOpen = false;
  return {
    get collapsed() {
      return collapsed;
    },
    get menuOpen() {
      return menuOpen;
    },
    toggleSidebar() {
      collapsed = !collapsed;
      return collapsed;
    },
    setMenuOpen(value) {
      menuOpen = Boolean(value);
      return menuOpen;
    },
  };
}

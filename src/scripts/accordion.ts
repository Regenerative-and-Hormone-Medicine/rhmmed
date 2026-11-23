// Shared accordion behaviour for Accordion.astro and treatment/Faq.astro (both can be on one page: /men, /women,
// /telehealth). One module = bound once; previously each component bound every group, so a click opened and
// immediately closed the item. One open item per [data-accordion] group. Closed panels are `inert` so keyboard
// focus can't land on links inside a hidden answer.
function set(item: HTMLElement, open: boolean) {
  item.toggleAttribute('data-open', open);
  item.querySelector('button')?.setAttribute('aria-expanded', String(open));
  const panel = item.querySelector<HTMLElement>('.acc-panel');
  if (panel) panel.inert = !open;
}

document.querySelectorAll<HTMLElement>('[data-accordion]').forEach((group, g) => {
  if (group.dataset.bound) return;
  group.dataset.bound = '1';
  const items = [...group.querySelectorAll<HTMLElement>('[data-acc]')];
  items.forEach((item, i) => {
    const panel = item.querySelector<HTMLElement>('.acc-panel');
    const button = item.querySelector('button');
    if (panel && button) {
      panel.id ||= `acc-${g}-${i}`;
      button.setAttribute('aria-controls', panel.id);
    }
    set(item, item.hasAttribute('data-open'));
    item.addEventListener('click', () => {
      const open = !item.hasAttribute('data-open');
      items.forEach((o) => set(o, false));
      if (open) set(item, true);
    });
  });
});

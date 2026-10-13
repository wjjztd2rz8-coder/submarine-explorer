/** Create plain DOM nodes without interpreting labels as markup. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Required-class factories assign even an empty class attribute. */
export function elWithClass<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = el(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

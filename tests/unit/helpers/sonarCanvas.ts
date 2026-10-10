/** Records the real sonar renderer's pixels and overlays without a browser. */
export function recordSonarCanvas() {
  const rasters: ImageData[] = [];
  const paths: Array<{ points: number[][]; style: string; width: number }> = [];
  const labels: Array<{ text: string; x: number; y: number }> = [];
  const draws: unknown[][] = [];
  const canvases: HTMLCanvasElement[] = [];
  let path: number[][] = [];
  const context = {
    strokeStyle: '',
    lineWidth: 1,
    createImageData: (width: number, height: number) =>
      ({ width, height, data: new Uint8ClampedArray(width * height * 4) }) as ImageData,
    putImageData: (image: ImageData) => rasters.push(image),
    scale: () => {},
    clearRect: () => {},
    drawImage: (...args: unknown[]) => draws.push(args),
    beginPath: () => {
      path = [];
    },
    moveTo: (x: number, y: number) => path.push([x, y]),
    lineTo: (x: number, y: number) => path.push([x, y]),
    stroke: () =>
      paths.push({ points: path, style: context.strokeStyle, width: context.lineWidth }),
    measureText: (text: string) => ({ width: text.length * 5 }),
    fillText: (text: string, x: number, y: number) => labels.push({ text, x, y }),
    fillRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    closePath: () => {},
    fill: () => {},
    arc: () => {},
  };
  const document = {
    createElement: (tag: string) => {
      const classes = new Set<string>();
      const element = {
        style: {},
        dataset: {},
        children: [] as unknown[],
        width: 0,
        height: 0,
        textContent: '',
        classList: {
          contains: (name: string) => classes.has(name),
          toggle: (name: string) => {
            if (classes.has(name)) {
              classes.delete(name);
              return false;
            }
            classes.add(name);
            return true;
          },
        },
        append(...items: unknown[]) {
          this.children.push(...items);
        },
        appendChild(item: unknown) {
          this.children.push(item);
        },
        setAttribute: () => {},
        addEventListener: () => {},
        getContext: () => context,
      };
      if (tag === 'canvas') canvases.push(element as unknown as HTMLCanvasElement);
      return element;
    },
    body: { append: () => {} },
  } as unknown as Document;
  return { document, rasters, paths, labels, draws, canvases };
}

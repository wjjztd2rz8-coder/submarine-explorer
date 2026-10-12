import '../styles/explore.css';
/** A brief reveal caption; hidden whenever a modal covers the dive. */
export class ExploreNotice {
  readonly root = document.createElement('div');
  private leftS = 0;
  constructor(parent: HTMLElement = document.body) {
    this.root.className = 'explore-caption';
    this.root.style.whiteSpace = 'pre-line';
    this.root.style.width = 'max-content';
    this.root.style.maxWidth = 'min(82vw, 640px)';
    this.root.hidden = true;
    this.root.setAttribute('role', 'status');
    parent.append(this.root);
  }
  show(text: string, durationS = 5): void {
    this.root.textContent = text;
    this.leftS = durationS;
  }
  /** Keep guidance live without restarting the caption's lifetime every frame. */
  event(text: string, needsCloser: boolean, logged: boolean): void {
    const cue = needsCloser ? 'Get closer to log it' : logged ? 'Sighting logged in Journal' : '';
    const value = cue ? `${text}\n${cue}` : text;
    if (this.root.textContent === value) return;
    this.root.textContent = value;
  }
  update(dt: number, blocked: boolean): void {
    this.leftS = Math.max(0, this.leftS - dt);
    this.root.hidden = blocked || this.leftS <= 0;
  }
  clear(): void {
    this.leftS = 0;
    this.root.hidden = true;
  }
  dispose(): void {
    this.root.remove();
  }
}

import { expect, it } from 'vitest';
import doc from '../../data/landmarks/titanic/guide.json';
import { parseGuide } from '../../src/game/Guide.js';

const guide = parseGuide(doc, 'titanic')!;
const entry = (id: string) => guide.entries.find((e) => e.id === id)!;
const text = (id: string) => entry(id).paragraphs.join('\n');

it('1210: Titanic retains the documented voyage and sinking interval', () => {
  expect(text('overview')).toMatch(/Southampton.*New York/);
  expect(text('overview')).toMatch(/two hours and forty minutes/);
  expect(text('overview')).toMatch(/2,200/);
  expect(entry('overview').sources.map((s) => s.url)).toContain(
    'https://www.titanicinquiry.org/BOTInq/BOTReport/botRepMessages.php',
  );
});

it('1210: the boiler discovery keeps Argo and WHOI’s recorded time', () => {
  expect(text('overview')).toContain('Argo');
  expect(text('boilers')).toMatch(/just after 1 a\.m\./i);
  expect(entry('boilers').sources.map((s) => s.url)).toContain(
    'https://www.whoi.edu/ocean-learning-hub/ocean-topics/ocean-human-lives/underwater-archaeology/rms-titanic/1985-discovery-of-rms-titanic/',
  );
});

it('1210: the memorial retains the 1986 Act alongside the agreement', () => {
  expect(text('memorial')).toMatch(/Maritime Memorial Act of 1986/);
  expect(text('memorial')).toContain('18 November 2019');
  expect(entry('memorial').sources.map((s) => s.url)).toContain(
    'https://www.noaa.gov/office-of-general-counsel/gc-international-section/rms-titanic-frequently-asked-questions',
  );
});

it('1210: the recovered Chunk is distinguished from its two conserved sections', () => {
  expect(text('big-piece')).toMatch(/17-ton/);
  expect(text('big-piece')).toMatch(/15-ton.*Big Piece.*Las Vegas/);
  expect(text('big-piece')).toMatch(/2-ton.*Little Piece.*Orlando/);
});

it('1210: each Titanic entry presents each source link only once', () => {
  for (const e of guide.entries) {
    const urls = e.sources.map((s) => s.url).filter(Boolean);
    expect(new Set(urls).size, e.id).toBe(urls.length);
  }
});

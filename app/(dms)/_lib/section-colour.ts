/**
 * Section kind → colour, as LITERAL class strings.
 *
 * ⚠ THE STRINGS MUST BE WRITTEN OUT IN FULL. Tailwind scans source text for
 * class names, so a computed `bg-${colour}-500` is invisible to it and the
 * class is simply never generated — the badge renders with no background and
 * nothing fails. That is this file's whole reason for existing: a lookup of
 * complete strings rather than composition.
 *
 * The kinds themselves are estate-wide semantics from the kss-edit-page table
 * and are not ours to extend. Two are used here:
 *
 *   blue  — row 2, "Base info (flat fields)".
 *   amber — kind 13, "Financial", assigned by Amanda 2026-09-08. Green was the
 *           instinct and was rejected: it sits beside emerald and the two are
 *           confusable at badge size, which defeats the point of the palette.
 *
 * COLOUR FOLLOWS THE KIND, NOT THE SCREEN. That is why the amounts sections of
 * both projects and subprojects take amber — the same sort of data has to look
 * the same wherever it appears, or the palette stops carrying information.
 */

export type SectionColour = 'blue' | 'amber';

interface SectionColourClasses {
  /** The numbered badge in the card title. */
  badge: string;
  /** The doubled-class border wrapper that beats the glass tint. */
  border: string;
}

export const SECTION_COLOUR: Readonly<Record<SectionColour, SectionColourClasses>> = {
  blue: {
    badge:
      'w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold',
    border:
      '[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!',
  },
  amber: {
    badge:
      'w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold',
    border:
      '[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!',
  },
};

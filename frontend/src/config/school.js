// ============================================================
// SCHOOL CONFIGURATION — the one file to edit for a new school
// ============================================================
// Every other file in this project imports its school name,
// address, contact details, and logo from here. To turn this
// codebase into a portal for a DIFFERENT school:
//
//   1. Edit every value below.
//   2. Replace /public/logo.png with the new school's crest
//      (keep the same filename, "logo.png").
//   3. If the new school wants different colors, edit
//      frontend/tailwind.config.js (the "maroon" and "gold"
//      color values) — everything on the site reads its color
//      from those two names, so changing the hex codes there
//      re-colors the whole site automatically.
//
// Nothing else in the codebase should need touching for a
// straightforward rebrand.

const school = {
  // Full legal name, shown on the homepage, login page, every
  // dashboard header, and printed student lists.
  fullName: 'Higher Ground College of Health and Management Sciences Takum',

  // Short name / initials, used in compact spaces (browser tab
  // title, the crest banner text, etc.)
  shortName: 'HIGCHEMS',

  // Shown under the school name wherever the full address fits.
  address: 'No 8 High Level, Opposite Army Barracks Takum',

  phones: ['0806 419 4677', '0803 818 0217', '0906 029 6881'],
  email: 'higchemstakum@gmai.com',
  website: 'www.higchems.com',
  websiteUrl: 'https://www.higchems.com',

  // Shown in the browser tab.
  browserTitle: 'HIGCHEMS Result Portal | Higher Ground College Takum',

  // The hero heading on the public homepage. Use "\n" for a line
  // break — components that support multi-line render it as such.
  heroHeadingLines: ['Higher Ground College of', 'Health and Management Sciences Takum'],

  // Footer copyright line (year is added automatically).
  copyrightName: 'Higher Ground College of Health and Management Sciences Takum',
};

export default school;

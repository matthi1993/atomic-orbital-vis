export type ElementCategory =
  | 'nonmetal'
  | 'noble-gas'
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition'
  | 'metalloid'
  | 'halogen'
  | 'lanthanide'
  | 'actinide';

export interface ElementData {
  Z: number;
  symbol: string;
  name: string;
  category: ElementCategory;
  row: number;   // grid row  (1-7 main, 9 lanthanides, 10 actinides)
  col: number;   // grid col  (1-18)
}

/**
 * All 118 elements with standard periodic-table grid positions.
 * Lanthanides (57-71) → row 9, Actinides (89-103) → row 10.
 */
export const ELEMENTS: ElementData[] = [
  // ── Period 1 ──────────────────────────────────────────────
  { Z: 1,   symbol: 'H',  name: 'Hydrogen',      category: 'nonmetal',         row: 1, col: 1  },
  { Z: 2,   symbol: 'He', name: 'Helium',         category: 'noble-gas',        row: 1, col: 18 },

  // ── Period 2 ──────────────────────────────────────────────
  { Z: 3,   symbol: 'Li', name: 'Lithium',        category: 'alkali-metal',     row: 2, col: 1  },
  { Z: 4,   symbol: 'Be', name: 'Beryllium',      category: 'alkaline-earth',   row: 2, col: 2  },
  { Z: 5,   symbol: 'B',  name: 'Boron',          category: 'metalloid',        row: 2, col: 13 },
  { Z: 6,   symbol: 'C',  name: 'Carbon',         category: 'nonmetal',         row: 2, col: 14 },
  { Z: 7,   symbol: 'N',  name: 'Nitrogen',       category: 'nonmetal',         row: 2, col: 15 },
  { Z: 8,   symbol: 'O',  name: 'Oxygen',         category: 'nonmetal',         row: 2, col: 16 },
  { Z: 9,   symbol: 'F',  name: 'Fluorine',       category: 'halogen',          row: 2, col: 17 },
  { Z: 10,  symbol: 'Ne', name: 'Neon',           category: 'noble-gas',        row: 2, col: 18 },

  // ── Period 3 ──────────────────────────────────────────────
  { Z: 11,  symbol: 'Na', name: 'Sodium',         category: 'alkali-metal',     row: 3, col: 1  },
  { Z: 12,  symbol: 'Mg', name: 'Magnesium',      category: 'alkaline-earth',   row: 3, col: 2  },
  { Z: 13,  symbol: 'Al', name: 'Aluminium',      category: 'post-transition',  row: 3, col: 13 },
  { Z: 14,  symbol: 'Si', name: 'Silicon',        category: 'metalloid',        row: 3, col: 14 },
  { Z: 15,  symbol: 'P',  name: 'Phosphorus',     category: 'nonmetal',         row: 3, col: 15 },
  { Z: 16,  symbol: 'S',  name: 'Sulfur',         category: 'nonmetal',         row: 3, col: 16 },
  { Z: 17,  symbol: 'Cl', name: 'Chlorine',       category: 'halogen',          row: 3, col: 17 },
  { Z: 18,  symbol: 'Ar', name: 'Argon',          category: 'noble-gas',        row: 3, col: 18 },

  // ── Period 4 ──────────────────────────────────────────────
  { Z: 19,  symbol: 'K',  name: 'Potassium',      category: 'alkali-metal',     row: 4, col: 1  },
  { Z: 20,  symbol: 'Ca', name: 'Calcium',        category: 'alkaline-earth',   row: 4, col: 2  },
  { Z: 21,  symbol: 'Sc', name: 'Scandium',       category: 'transition-metal', row: 4, col: 3  },
  { Z: 22,  symbol: 'Ti', name: 'Titanium',       category: 'transition-metal', row: 4, col: 4  },
  { Z: 23,  symbol: 'V',  name: 'Vanadium',       category: 'transition-metal', row: 4, col: 5  },
  { Z: 24,  symbol: 'Cr', name: 'Chromium',       category: 'transition-metal', row: 4, col: 6  },
  { Z: 25,  symbol: 'Mn', name: 'Manganese',      category: 'transition-metal', row: 4, col: 7  },
  { Z: 26,  symbol: 'Fe', name: 'Iron',           category: 'transition-metal', row: 4, col: 8  },
  { Z: 27,  symbol: 'Co', name: 'Cobalt',         category: 'transition-metal', row: 4, col: 9  },
  { Z: 28,  symbol: 'Ni', name: 'Nickel',         category: 'transition-metal', row: 4, col: 10 },
  { Z: 29,  symbol: 'Cu', name: 'Copper',         category: 'transition-metal', row: 4, col: 11 },
  { Z: 30,  symbol: 'Zn', name: 'Zinc',           category: 'transition-metal', row: 4, col: 12 },
  { Z: 31,  symbol: 'Ga', name: 'Gallium',        category: 'post-transition',  row: 4, col: 13 },
  { Z: 32,  symbol: 'Ge', name: 'Germanium',      category: 'metalloid',        row: 4, col: 14 },
  { Z: 33,  symbol: 'As', name: 'Arsenic',        category: 'metalloid',        row: 4, col: 15 },
  { Z: 34,  symbol: 'Se', name: 'Selenium',       category: 'nonmetal',         row: 4, col: 16 },
  { Z: 35,  symbol: 'Br', name: 'Bromine',        category: 'halogen',          row: 4, col: 17 },
  { Z: 36,  symbol: 'Kr', name: 'Krypton',        category: 'noble-gas',        row: 4, col: 18 },

  // ── Period 5 ──────────────────────────────────────────────
  { Z: 37,  symbol: 'Rb', name: 'Rubidium',       category: 'alkali-metal',     row: 5, col: 1  },
  { Z: 38,  symbol: 'Sr', name: 'Strontium',      category: 'alkaline-earth',   row: 5, col: 2  },
  { Z: 39,  symbol: 'Y',  name: 'Yttrium',        category: 'transition-metal', row: 5, col: 3  },
  { Z: 40,  symbol: 'Zr', name: 'Zirconium',      category: 'transition-metal', row: 5, col: 4  },
  { Z: 41,  symbol: 'Nb', name: 'Niobium',        category: 'transition-metal', row: 5, col: 5  },
  { Z: 42,  symbol: 'Mo', name: 'Molybdenum',     category: 'transition-metal', row: 5, col: 6  },
  { Z: 43,  symbol: 'Tc', name: 'Technetium',     category: 'transition-metal', row: 5, col: 7  },
  { Z: 44,  symbol: 'Ru', name: 'Ruthenium',      category: 'transition-metal', row: 5, col: 8  },
  { Z: 45,  symbol: 'Rh', name: 'Rhodium',        category: 'transition-metal', row: 5, col: 9  },
  { Z: 46,  symbol: 'Pd', name: 'Palladium',      category: 'transition-metal', row: 5, col: 10 },
  { Z: 47,  symbol: 'Ag', name: 'Silver',         category: 'transition-metal', row: 5, col: 11 },
  { Z: 48,  symbol: 'Cd', name: 'Cadmium',        category: 'transition-metal', row: 5, col: 12 },
  { Z: 49,  symbol: 'In', name: 'Indium',         category: 'post-transition',  row: 5, col: 13 },
  { Z: 50,  symbol: 'Sn', name: 'Tin',            category: 'post-transition',  row: 5, col: 14 },
  { Z: 51,  symbol: 'Sb', name: 'Antimony',       category: 'metalloid',        row: 5, col: 15 },
  { Z: 52,  symbol: 'Te', name: 'Tellurium',      category: 'metalloid',        row: 5, col: 16 },
  { Z: 53,  symbol: 'I',  name: 'Iodine',         category: 'halogen',          row: 5, col: 17 },
  { Z: 54,  symbol: 'Xe', name: 'Xenon',          category: 'noble-gas',        row: 5, col: 18 },

  // ── Period 6 ──────────────────────────────────────────────
  { Z: 55,  symbol: 'Cs', name: 'Caesium',        category: 'alkali-metal',     row: 6, col: 1  },
  { Z: 56,  symbol: 'Ba', name: 'Barium',         category: 'alkaline-earth',   row: 6, col: 2  },
  // Lanthanides (57-71) → separate row 9
  { Z: 57,  symbol: 'La', name: 'Lanthanum',      category: 'lanthanide',       row: 9,  col: 3  },
  { Z: 58,  symbol: 'Ce', name: 'Cerium',         category: 'lanthanide',       row: 9,  col: 4  },
  { Z: 59,  symbol: 'Pr', name: 'Praseodymium',   category: 'lanthanide',       row: 9,  col: 5  },
  { Z: 60,  symbol: 'Nd', name: 'Neodymium',      category: 'lanthanide',       row: 9,  col: 6  },
  { Z: 61,  symbol: 'Pm', name: 'Promethium',     category: 'lanthanide',       row: 9,  col: 7  },
  { Z: 62,  symbol: 'Sm', name: 'Samarium',       category: 'lanthanide',       row: 9,  col: 8  },
  { Z: 63,  symbol: 'Eu', name: 'Europium',       category: 'lanthanide',       row: 9,  col: 9  },
  { Z: 64,  symbol: 'Gd', name: 'Gadolinium',     category: 'lanthanide',       row: 9,  col: 10 },
  { Z: 65,  symbol: 'Tb', name: 'Terbium',        category: 'lanthanide',       row: 9,  col: 11 },
  { Z: 66,  symbol: 'Dy', name: 'Dysprosium',     category: 'lanthanide',       row: 9,  col: 12 },
  { Z: 67,  symbol: 'Ho', name: 'Holmium',        category: 'lanthanide',       row: 9,  col: 13 },
  { Z: 68,  symbol: 'Er', name: 'Erbium',         category: 'lanthanide',       row: 9,  col: 14 },
  { Z: 69,  symbol: 'Tm', name: 'Thulium',        category: 'lanthanide',       row: 9,  col: 15 },
  { Z: 70,  symbol: 'Yb', name: 'Ytterbium',      category: 'lanthanide',       row: 9,  col: 16 },
  { Z: 71,  symbol: 'Lu', name: 'Lutetium',       category: 'lanthanide',       row: 9,  col: 17 },
  { Z: 72,  symbol: 'Hf', name: 'Hafnium',        category: 'transition-metal', row: 6, col: 4  },
  { Z: 73,  symbol: 'Ta', name: 'Tantalum',       category: 'transition-metal', row: 6, col: 5  },
  { Z: 74,  symbol: 'W',  name: 'Tungsten',       category: 'transition-metal', row: 6, col: 6  },
  { Z: 75,  symbol: 'Re', name: 'Rhenium',        category: 'transition-metal', row: 6, col: 7  },
  { Z: 76,  symbol: 'Os', name: 'Osmium',         category: 'transition-metal', row: 6, col: 8  },
  { Z: 77,  symbol: 'Ir', name: 'Iridium',        category: 'transition-metal', row: 6, col: 9  },
  { Z: 78,  symbol: 'Pt', name: 'Platinum',       category: 'transition-metal', row: 6, col: 10 },
  { Z: 79,  symbol: 'Au', name: 'Gold',           category: 'transition-metal', row: 6, col: 11 },
  { Z: 80,  symbol: 'Hg', name: 'Mercury',        category: 'transition-metal', row: 6, col: 12 },
  { Z: 81,  symbol: 'Tl', name: 'Thallium',       category: 'post-transition',  row: 6, col: 13 },
  { Z: 82,  symbol: 'Pb', name: 'Lead',           category: 'post-transition',  row: 6, col: 14 },
  { Z: 83,  symbol: 'Bi', name: 'Bismuth',        category: 'post-transition',  row: 6, col: 15 },
  { Z: 84,  symbol: 'Po', name: 'Polonium',       category: 'post-transition',  row: 6, col: 16 },
  { Z: 85,  symbol: 'At', name: 'Astatine',       category: 'halogen',          row: 6, col: 17 },
  { Z: 86,  symbol: 'Rn', name: 'Radon',          category: 'noble-gas',        row: 6, col: 18 },

  // ── Period 7 ──────────────────────────────────────────────
  { Z: 87,  symbol: 'Fr', name: 'Francium',       category: 'alkali-metal',     row: 7, col: 1  },
  { Z: 88,  symbol: 'Ra', name: 'Radium',         category: 'alkaline-earth',   row: 7, col: 2  },
  // Actinides (89-103) → separate row 10
  { Z: 89,  symbol: 'Ac', name: 'Actinium',       category: 'actinide',         row: 10, col: 3  },
  { Z: 90,  symbol: 'Th', name: 'Thorium',        category: 'actinide',         row: 10, col: 4  },
  { Z: 91,  symbol: 'Pa', name: 'Protactinium',   category: 'actinide',         row: 10, col: 5  },
  { Z: 92,  symbol: 'U',  name: 'Uranium',        category: 'actinide',         row: 10, col: 6  },
  { Z: 93,  symbol: 'Np', name: 'Neptunium',      category: 'actinide',         row: 10, col: 7  },
  { Z: 94,  symbol: 'Pu', name: 'Plutonium',      category: 'actinide',         row: 10, col: 8  },
  { Z: 95,  symbol: 'Am', name: 'Americium',      category: 'actinide',         row: 10, col: 9  },
  { Z: 96,  symbol: 'Cm', name: 'Curium',         category: 'actinide',         row: 10, col: 10 },
  { Z: 97,  symbol: 'Bk', name: 'Berkelium',      category: 'actinide',         row: 10, col: 11 },
  { Z: 98,  symbol: 'Cf', name: 'Californium',    category: 'actinide',         row: 10, col: 12 },
  { Z: 99,  symbol: 'Es', name: 'Einsteinium',    category: 'actinide',         row: 10, col: 13 },
  { Z: 100, symbol: 'Fm', name: 'Fermium',        category: 'actinide',         row: 10, col: 14 },
  { Z: 101, symbol: 'Md', name: 'Mendelevium',    category: 'actinide',         row: 10, col: 15 },
  { Z: 102, symbol: 'No', name: 'Nobelium',       category: 'actinide',         row: 10, col: 16 },
  { Z: 103, symbol: 'Lr', name: 'Lawrencium',     category: 'actinide',         row: 10, col: 17 },
  { Z: 104, symbol: 'Rf', name: 'Rutherfordium',  category: 'transition-metal', row: 7, col: 4  },
  { Z: 105, symbol: 'Db', name: 'Dubnium',        category: 'transition-metal', row: 7, col: 5  },
  { Z: 106, symbol: 'Sg', name: 'Seaborgium',     category: 'transition-metal', row: 7, col: 6  },
  { Z: 107, symbol: 'Bh', name: 'Bohrium',        category: 'transition-metal', row: 7, col: 7  },
  { Z: 108, symbol: 'Hs', name: 'Hassium',        category: 'transition-metal', row: 7, col: 8  },
  { Z: 109, symbol: 'Mt', name: 'Meitnerium',     category: 'transition-metal', row: 7, col: 9  },
  { Z: 110, symbol: 'Ds', name: 'Darmstadtium',   category: 'transition-metal', row: 7, col: 10 },
  { Z: 111, symbol: 'Rg', name: 'Roentgenium',    category: 'transition-metal', row: 7, col: 11 },
  { Z: 112, symbol: 'Cn', name: 'Copernicium',    category: 'transition-metal', row: 7, col: 12 },
  { Z: 113, symbol: 'Nh', name: 'Nihonium',       category: 'post-transition',  row: 7, col: 13 },
  { Z: 114, symbol: 'Fl', name: 'Flerovium',      category: 'post-transition',  row: 7, col: 14 },
  { Z: 115, symbol: 'Mc', name: 'Moscovium',      category: 'post-transition',  row: 7, col: 15 },
  { Z: 116, symbol: 'Lv', name: 'Livermorium',    category: 'post-transition',  row: 7, col: 16 },
  { Z: 117, symbol: 'Ts', name: 'Tennessine',     category: 'halogen',          row: 7, col: 17 },
  { Z: 118, symbol: 'Og', name: 'Oganesson',      category: 'noble-gas',        row: 7, col: 18 },
];

/** Look up an element by atomic number. */
export function getElement(Z: number): ElementData | undefined {
  return ELEMENTS.find(e => e.Z === Z);
}

/** Category display colours (CSS) – tuned for dark backgrounds. */
export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  'nonmetal':         'rgba( 76, 175,  80, 0.55)',
  'noble-gas':        'rgba(171,  71, 188, 0.55)',
  'alkali-metal':     'rgba(239,  83,  80, 0.55)',
  'alkaline-earth':   'rgba(255, 152,   0, 0.55)',
  'transition-metal': 'rgba(253, 216,  53, 0.40)',
  'post-transition':  'rgba(102, 187, 106, 0.50)',
  'metalloid':        'rgba( 38, 166, 154, 0.55)',
  'halogen':          'rgba( 66, 165, 245, 0.55)',
  'lanthanide':       'rgba(236,  64, 122, 0.50)',
  'actinide':         'rgba(255, 112,  67, 0.50)',
};

/** Human-readable labels for each element category. */
export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  'nonmetal':         'Nonmetal',
  'noble-gas':        'Noble gas',
  'alkali-metal':     'Alkali metal',
  'alkaline-earth':   'Alkaline earth',
  'transition-metal': 'Transition metal',
  'post-transition':  'Post-transition',
  'metalloid':        'Metalloid',
  'halogen':          'Halogen',
  'lanthanide':       'Lanthanide',
  'actinide':         'Actinide',
};

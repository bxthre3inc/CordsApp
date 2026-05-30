export const WOOD_TYPE_GROUPS = [
  {
    region: 'North America',
    types: [
      'Oak', 'Maple', 'White Ash', 'Black Cherry', 'Hickory', 'Beech',
      'Black Walnut', 'Birch', 'Pecan', 'Douglas Fir', 'Western Red Cedar',
      'Hemlock', 'White Pine', 'Lodgepole Pine', 'Ponderosa Pine', 'Mesquite',
      'Cottonwood', 'Sweetgum', 'Hackberry', 'Tupelo',
    ],
  },
  {
    region: 'Europe',
    types: [
      'Beech', 'Sessile Oak', 'English Oak', 'Ash', 'Hornbeam', 'Birch',
      'Alder', 'Sweet Chestnut', 'Norway Spruce', 'Scots Pine', 'Silver Fir',
      'Larch', 'Poplar', 'Willow', 'Olive', 'Holm Oak', 'Robinia (Black Locust)',
    ],
  },
  {
    region: 'Australia & New Zealand',
    types: [
      'Red Gum', 'Ironbark', 'Grey Box', 'Redbox', 'Stringybark',
      'Blackbutt', 'Spotted Gum', 'Blue Gum', 'Black Wattle', 'Manuka',
    ],
  },
  {
    region: 'Africa',
    types: [
      'Acacia', 'Casuarina', 'Eucalyptus', 'Mopane', 'Marula',
      'Neem', 'African Olive', 'Yellowwood',
    ],
  },
  {
    region: 'Asia',
    types: [
      'Teak', 'Rubber Tree', 'Sal', 'Bamboo (Compressed)', 'Cryptomeria (Sugi)',
      'Hinoki Cypress', 'Japanese Pine', 'Mulberry', 'Ironwood (Casuarina)',
    ],
  },
  {
    region: 'South America',
    types: [
      'Quebracho', 'Algarrobo', 'Urunday', 'Eucalyptus (Brazil)', 'Pine (Brazil)',
      'Guava Wood', 'Jacaranda',
    ],
  },
];

export const ALL_WOOD_TYPES = WOOD_TYPE_GROUPS.flatMap(g => g.types);

export const UNITS = [
  { value: 'cord',        label: 'Cord (128 ft³)',        region: 'North America' },
  { value: 'half_cord',   label: 'Half Cord (64 ft³)',     region: 'North America' },
  { value: 'face_cord',   label: 'Face Cord (~42 ft³)',    region: 'North America' },
  { value: 'board_foot',  label: 'Board Foot',             region: 'North America' },
  { value: 'ton',         label: 'Ton (US)',               region: 'North America' },
  { value: 'metric_ton',  label: 'Metric Ton',             region: 'Metric' },
  { value: 'cubic_meter', label: 'Cubic Meter (m³)',       region: 'Metric' },
  { value: 'stere',       label: 'Stère (1 m³ stacked)',   region: 'Europe' },
  { value: 'kg',          label: 'Kilogram (kg)',           region: 'Metric' },
  { value: 'lb',          label: 'Pound (lb)',              region: 'North America' },
];

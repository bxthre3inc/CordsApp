// Global wood type taxonomy grouped by region.
// Flat ALL_WOOD_TYPES list is used for validation; WOOD_TYPE_GROUPS for UI rendering.

const WOOD_TYPE_GROUPS = [
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

const ALL_WOOD_TYPES = WOOD_TYPE_GROUPS.flatMap(g => g.types);

module.exports = { WOOD_TYPE_GROUPS, ALL_WOOD_TYPES };

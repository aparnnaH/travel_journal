'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LngLatBoundsLike, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import type { Country, CountryCity } from '@/types';
import { Button } from '@/components/ui';
import { findCountryStamp } from '@/lib/stamps/matching';
import { useMapStore } from '@/store/mapStore';

interface CityExplorerProps {
  country: Country | null;
  onClose: () => void;
}

type Coordinates = [number, number];

interface CityPreviewPoint {
  id: string;
  name: string;
  region: string;
  visited: boolean;
  coordinates: Coordinates;
}

interface CityOption {
  id: string;
  name: string;
  region: string;
  coordinates?: Coordinates;
}

const cityCoordinateLookup: Record<string, Coordinates> = {
  nyc: [-74.006, 40.7128],
  sf: [-122.4194, 37.7749],
  nash: [-86.7816, 36.1627],
  par: [2.3522, 48.8566],
  nic: [7.262, 43.7102],
  tok: [139.6503, 35.6762],
  kyoto: [135.7681, 35.0116],
  rio: [-43.1729, -22.9068],
  sao: [-46.6333, -23.5505],
  rom: [12.4964, 41.9028],
  ven: [12.3155, 45.4408],
  syd: [151.2093, -33.8688],
  mel: [144.9631, -37.8136],
};

const cityNameCoordinateLookup: Record<string, Coordinates> = {
  'new york': [-74.006, 40.7128],
  'san francisco': [-122.4194, 37.7749],
  'nashville': [-86.7816, 36.1627],
  'los angeles': [-118.2437, 34.0522],
  'chicago': [-87.6298, 41.8781],
  'seattle': [-122.3321, 47.6062],
  'miami': [-80.1918, 25.7617],
  'washington dc': [-77.0369, 38.9072],
  'boston': [-71.0589, 42.3601],
  'new orleans': [-90.0715, 29.9511],
  'paris': [2.3522, 48.8566],
  'nice': [7.262, 43.7102],
  'lyon': [4.8357, 45.764],
  'marseille': [5.3698, 43.2965],
  'bordeaux': [-0.5792, 44.8378],
  'strasbourg': [7.7521, 48.5734],
  'toulouse': [1.4442, 43.6047],
  'tokyo': [139.6503, 35.6762],
  'kyoto': [135.7681, 35.0116],
  'osaka': [135.5023, 34.6937],
  'hiroshima': [132.4553, 34.3853],
  'sapporo': [141.3545, 43.0618],
  'nara': [135.8048, 34.6851],
  'yokohama': [139.638, 35.4437],
  'rio de janeiro': [-43.1729, -22.9068],
  'sao paulo': [-46.6333, -23.5505],
  'salvador': [-38.5014, -12.9777],
  'brasilia': [-47.8825, -15.7942],
  'manaus': [-60.0217, -3.119],
  'recife': [-34.877, -8.0476],
  'rome': [12.4964, 41.9028],
  'venice': [12.3155, 45.4408],
  'florence': [11.2558, 43.7696],
  'milan': [9.19, 45.4642],
  'naples': [14.2681, 40.8518],
  'bologna': [11.3426, 44.4949],
  'sydney': [151.2093, -33.8688],
  'melbourne': [144.9631, -37.8136],
  'brisbane': [153.0251, -27.4698],
  'perth': [115.8575, -31.9505],
  'adelaide': [138.6007, -34.9285],
  'hobart': [147.3272, -42.8821],
  'toronto': [-79.3832, 43.6532],
  'vancouver': [-123.1207, 49.2827],
  'montreal': [-73.5673, 45.5017],
  'quebec city': [-71.208, 46.8139],
  'calgary': [-114.0719, 51.0447],
  'ottawa': [-75.6972, 45.4215],
  'mexico city': [-99.1332, 19.4326],
  'cancun': [-86.8515, 21.1619],
  'guadalajara': [-103.3496, 20.6597],
  'oaxaca': [-96.7216, 17.0732],
  'merida': [-89.5926, 20.9674],
  'cairo': [31.2357, 30.0444],
  'alexandria': [29.9187, 31.2001],
  'luxor': [32.6396, 25.6872],
  'aswan': [32.8998, 24.0889],
  'bangkok': [100.5018, 13.7563],
  'chiang mai': [98.9853, 18.7883],
  'phuket': [98.3923, 7.8804],
  'ayutthaya': [100.5689, 14.3532],
  'athens': [23.7275, 37.9838],
  'santorini': [25.4615, 36.3932],
  'thessaloniki': [22.9444, 40.6401],
  'heraklion': [25.1442, 35.3387],
  'reykjavik': [-21.9426, 64.1466],
  'akureyri': [-18.0878, 65.6885],
  'vik': [-19.006, 63.419],
  'seoul': [126.978, 37.5665],
  'busan': [129.0756, 35.1796],
  'suwon': [127.0286, 37.2636],
  'jeju city': [126.5312, 33.4996],
  'london': [-0.1276, 51.5072],
  'edinburgh': [-3.1883, 55.9533],
  'manchester': [-2.2426, 53.4808],
  'bath': [-2.359, 51.381],
  'liverpool': [-2.9916, 53.4084],
  'madrid': [-3.7038, 40.4168],
  'barcelona': [2.1734, 41.3851],
  'seville': [-5.9845, 37.3891],
  'valencia': [-0.3763, 39.4699],
  'granada': [-3.5986, 37.1773],
  'berlin': [13.405, 52.52],
  'munich': [11.582, 48.1351],
  'hamburg': [9.9937, 53.5511],
  'cologne': [6.9603, 50.9375],
  'frankfurt': [8.6821, 50.1109],
  'lisbon': [-9.1393, 38.7223],
  'porto': [-8.6291, 41.1579],
  'faro': [-7.9304, 37.0194],
  'coimbra': [-8.4196, 40.2033],
  'amsterdam': [4.9041, 52.3676],
  'rotterdam': [4.4777, 51.9244],
  'utrecht': [5.1214, 52.0907],
  'the hague': [4.3007, 52.0705],
  'delhi': [77.209, 28.6139],
  'mumbai': [72.8777, 19.076],
  'jaipur': [75.7873, 26.9124],
  'bengaluru': [77.5946, 12.9716],
  'varanasi': [82.9739, 25.3176],
  'beijing': [116.4074, 39.9042],
  'shanghai': [121.4737, 31.2304],
  "xi'an": [108.9398, 34.3416],
  'chengdu': [104.0665, 30.5728],
  'hong kong': [114.1694, 22.3193],
  'jakarta': [106.8456, -6.2088],
  'denpasar': [115.2126, -8.6705],
  'yogyakarta': [110.3671, -7.7956],
  'ubud': [115.2625, -8.5069],
  'istanbul': [28.9784, 41.0082],
  'ankara': [32.8597, 39.9334],
  'goreme': [34.8297, 38.6431],
  'izmir': [27.1428, 38.4237],
  'antalya': [30.7133, 36.8969],
  'marrakech': [-7.9811, 31.6295],
  'fes': [-5.0078, 34.0181],
  'casablanca': [-7.5898, 33.5731],
  'rabat': [-6.8498, 34.0209],
  'dubai': [55.2708, 25.2048],
  'abu dhabi': [54.3773, 24.4539],
  'sharjah': [55.4033, 25.3463],
  'cape town': [18.4241, -33.9249],
  'johannesburg': [28.0473, -26.2041],
  'durban': [31.0218, -29.8587],
  'pretoria': [28.2293, -25.7479],
  'buenos aires': [-58.3816, -34.6037],
  'mendoza': [-68.8272, -32.8895],
  'cordoba': [-64.1888, -31.4201],
  'ushuaia': [-68.303, -54.8019],
  'santiago': [-70.6693, -33.4489],
  'valparaiso': [-71.6127, -33.0472],
  'punta arenas': [-70.9171, -53.1638],
  'san pedro de atacama': [-68.1997, -22.9087],
  'lima': [-77.0428, -12.0464],
  'cusco': [-71.9675, -13.532],
  'arequipa': [-71.5375, -16.409],
  'bogota': [-74.0721, 4.711],
  'medellin': [-75.5636, 6.2442],
  'cartagena': [-75.4794, 10.391],
  'auckland': [174.7633, -36.8485],
  'wellington': [174.7762, -41.2865],
  'queenstown': [168.6626, -45.0312],
  'christchurch': [172.6362, -43.5321],
};

function cityOption(id: string, name: string, region: string): CityOption {
  return {
    id,
    name,
    region,
    coordinates: cityNameCoordinateLookup[normalizeCityName(name)],
  };
}

const unitedStatesCityOptions = [
  cityOption('us-new-york', 'New York', 'New York'),
  cityOption('us-san-francisco', 'San Francisco', 'California'),
  cityOption('us-nashville', 'Nashville', 'Tennessee'),
  cityOption('us-los-angeles', 'Los Angeles', 'California'),
  cityOption('us-chicago', 'Chicago', 'Illinois'),
  cityOption('us-seattle', 'Seattle', 'Washington'),
  cityOption('us-miami', 'Miami', 'Florida'),
  cityOption('us-washington-dc', 'Washington DC', 'District of Columbia'),
  cityOption('us-boston', 'Boston', 'Massachusetts'),
  cityOption('us-new-orleans', 'New Orleans', 'Louisiana'),
];

const franceCityOptions = [
  cityOption('fr-paris', 'Paris', 'Ile-de-France'),
  cityOption('fr-nice', 'Nice', 'French Riviera'),
  cityOption('fr-lyon', 'Lyon', 'Auvergne-Rhone-Alpes'),
  cityOption('fr-marseille', 'Marseille', 'Provence-Alpes-Cote d Azur'),
  cityOption('fr-bordeaux', 'Bordeaux', 'Nouvelle-Aquitaine'),
  cityOption('fr-strasbourg', 'Strasbourg', 'Grand Est'),
  cityOption('fr-toulouse', 'Toulouse', 'Occitanie'),
];

const japanCityOptions = [
  cityOption('jp-tokyo', 'Tokyo', 'Kanto'),
  cityOption('jp-kyoto', 'Kyoto', 'Kansai'),
  cityOption('jp-osaka', 'Osaka', 'Kansai'),
  cityOption('jp-hiroshima', 'Hiroshima', 'Chugoku'),
  cityOption('jp-sapporo', 'Sapporo', 'Hokkaido'),
  cityOption('jp-nara', 'Nara', 'Kansai'),
  cityOption('jp-yokohama', 'Yokohama', 'Kanto'),
];

const brazilCityOptions = [
  cityOption('br-rio-de-janeiro', 'Rio de Janeiro', 'Southeast'),
  cityOption('br-sao-paulo', 'Sao Paulo', 'Southeast'),
  cityOption('br-salvador', 'Salvador', 'Northeast'),
  cityOption('br-brasilia', 'Brasilia', 'Central-West'),
  cityOption('br-manaus', 'Manaus', 'North'),
  cityOption('br-recife', 'Recife', 'Northeast'),
];

const italyCityOptions = [
  cityOption('it-rome', 'Rome', 'Lazio'),
  cityOption('it-venice', 'Venice', 'Veneto'),
  cityOption('it-florence', 'Florence', 'Tuscany'),
  cityOption('it-milan', 'Milan', 'Lombardy'),
  cityOption('it-naples', 'Naples', 'Campania'),
  cityOption('it-bologna', 'Bologna', 'Emilia-Romagna'),
];

const australiaCityOptions = [
  cityOption('au-sydney', 'Sydney', 'New South Wales'),
  cityOption('au-melbourne', 'Melbourne', 'Victoria'),
  cityOption('au-brisbane', 'Brisbane', 'Queensland'),
  cityOption('au-perth', 'Perth', 'Western Australia'),
  cityOption('au-adelaide', 'Adelaide', 'South Australia'),
  cityOption('au-hobart', 'Hobart', 'Tasmania'),
];

const canadaCityOptions = [
  cityOption('ca-toronto', 'Toronto', 'Ontario'),
  cityOption('ca-vancouver', 'Vancouver', 'British Columbia'),
  cityOption('ca-montreal', 'Montreal', 'Quebec'),
  cityOption('ca-quebec-city', 'Quebec City', 'Quebec'),
  cityOption('ca-calgary', 'Calgary', 'Alberta'),
  cityOption('ca-ottawa', 'Ottawa', 'Ontario'),
];

const mexicoCityOptions = [
  cityOption('mx-mexico-city', 'Mexico City', 'Central Mexico'),
  cityOption('mx-cancun', 'Cancun', 'Quintana Roo'),
  cityOption('mx-guadalajara', 'Guadalajara', 'Jalisco'),
  cityOption('mx-oaxaca', 'Oaxaca', 'Oaxaca'),
  cityOption('mx-merida', 'Merida', 'Yucatan'),
];

const egyptCityOptions = [
  cityOption('eg-cairo', 'Cairo', 'Cairo Governorate'),
  cityOption('eg-alexandria', 'Alexandria', 'Mediterranean Coast'),
  cityOption('eg-luxor', 'Luxor', 'Upper Egypt'),
  cityOption('eg-aswan', 'Aswan', 'Upper Egypt'),
];

const thailandCityOptions = [
  cityOption('th-bangkok', 'Bangkok', 'Central Thailand'),
  cityOption('th-chiang-mai', 'Chiang Mai', 'Northern Thailand'),
  cityOption('th-phuket', 'Phuket', 'Southern Thailand'),
  cityOption('th-ayutthaya', 'Ayutthaya', 'Central Thailand'),
];

const greeceCityOptions = [
  cityOption('gr-athens', 'Athens', 'Attica'),
  cityOption('gr-santorini', 'Santorini', 'Cyclades'),
  cityOption('gr-thessaloniki', 'Thessaloniki', 'Central Macedonia'),
  cityOption('gr-heraklion', 'Heraklion', 'Crete'),
];

const icelandCityOptions = [
  cityOption('is-reykjavik', 'Reykjavik', 'Capital Region'),
  cityOption('is-akureyri', 'Akureyri', 'North Iceland'),
  cityOption('is-vik', 'Vik', 'South Iceland'),
];

const southKoreaCityOptions = [
  cityOption('kr-seoul', 'Seoul', 'Capital Area'),
  cityOption('kr-busan', 'Busan', 'Yeongnam'),
  cityOption('kr-suwon', 'Suwon', 'Gyeonggi'),
  cityOption('kr-jeju-city', 'Jeju City', 'Jeju'),
];

const unitedKingdomCityOptions = [
  cityOption('gb-london', 'London', 'England'),
  cityOption('gb-edinburgh', 'Edinburgh', 'Scotland'),
  cityOption('gb-manchester', 'Manchester', 'England'),
  cityOption('gb-bath', 'Bath', 'England'),
  cityOption('gb-liverpool', 'Liverpool', 'England'),
];

const spainCityOptions = [
  cityOption('es-madrid', 'Madrid', 'Community of Madrid'),
  cityOption('es-barcelona', 'Barcelona', 'Catalonia'),
  cityOption('es-seville', 'Seville', 'Andalusia'),
  cityOption('es-valencia', 'Valencia', 'Valencian Community'),
  cityOption('es-granada', 'Granada', 'Andalusia'),
];

const germanyCityOptions = [
  cityOption('de-berlin', 'Berlin', 'Berlin'),
  cityOption('de-munich', 'Munich', 'Bavaria'),
  cityOption('de-hamburg', 'Hamburg', 'Hamburg'),
  cityOption('de-cologne', 'Cologne', 'North Rhine-Westphalia'),
  cityOption('de-frankfurt', 'Frankfurt', 'Hesse'),
];

const portugalCityOptions = [
  cityOption('pt-lisbon', 'Lisbon', 'Lisbon'),
  cityOption('pt-porto', 'Porto', 'Norte'),
  cityOption('pt-faro', 'Faro', 'Algarve'),
  cityOption('pt-coimbra', 'Coimbra', 'Centro'),
];

const netherlandsCityOptions = [
  cityOption('nl-amsterdam', 'Amsterdam', 'North Holland'),
  cityOption('nl-rotterdam', 'Rotterdam', 'South Holland'),
  cityOption('nl-utrecht', 'Utrecht', 'Utrecht'),
  cityOption('nl-the-hague', 'The Hague', 'South Holland'),
];

const indiaCityOptions = [
  cityOption('in-delhi', 'Delhi', 'National Capital Territory'),
  cityOption('in-mumbai', 'Mumbai', 'Maharashtra'),
  cityOption('in-jaipur', 'Jaipur', 'Rajasthan'),
  cityOption('in-bengaluru', 'Bengaluru', 'Karnataka'),
  cityOption('in-varanasi', 'Varanasi', 'Uttar Pradesh'),
];

const chinaCityOptions = [
  cityOption('cn-beijing', 'Beijing', 'Beijing'),
  cityOption('cn-shanghai', 'Shanghai', 'Shanghai'),
  cityOption('cn-xian', "Xi'an", 'Shaanxi'),
  cityOption('cn-chengdu', 'Chengdu', 'Sichuan'),
  cityOption('cn-hong-kong', 'Hong Kong', 'Hong Kong'),
];

const indonesiaCityOptions = [
  cityOption('id-jakarta', 'Jakarta', 'Java'),
  cityOption('id-denpasar', 'Denpasar', 'Bali'),
  cityOption('id-yogyakarta', 'Yogyakarta', 'Java'),
  cityOption('id-ubud', 'Ubud', 'Bali'),
];

const turkeyCityOptions = [
  cityOption('tr-istanbul', 'Istanbul', 'Marmara'),
  cityOption('tr-ankara', 'Ankara', 'Central Anatolia'),
  cityOption('tr-goreme', 'Goreme', 'Cappadocia'),
  cityOption('tr-izmir', 'Izmir', 'Aegean'),
  cityOption('tr-antalya', 'Antalya', 'Mediterranean'),
];

const moroccoCityOptions = [
  cityOption('ma-marrakech', 'Marrakech', 'Marrakesh-Safi'),
  cityOption('ma-fes', 'Fes', 'Fes-Meknes'),
  cityOption('ma-casablanca', 'Casablanca', 'Casablanca-Settat'),
  cityOption('ma-rabat', 'Rabat', 'Rabat-Sale-Kenitra'),
];

const unitedArabEmiratesCityOptions = [
  cityOption('ae-dubai', 'Dubai', 'Dubai'),
  cityOption('ae-abu-dhabi', 'Abu Dhabi', 'Abu Dhabi'),
  cityOption('ae-sharjah', 'Sharjah', 'Sharjah'),
];

const southAfricaCityOptions = [
  cityOption('za-cape-town', 'Cape Town', 'Western Cape'),
  cityOption('za-johannesburg', 'Johannesburg', 'Gauteng'),
  cityOption('za-durban', 'Durban', 'KwaZulu-Natal'),
  cityOption('za-pretoria', 'Pretoria', 'Gauteng'),
];

const argentinaCityOptions = [
  cityOption('ar-buenos-aires', 'Buenos Aires', 'Buenos Aires'),
  cityOption('ar-mendoza', 'Mendoza', 'Mendoza'),
  cityOption('ar-cordoba', 'Cordoba', 'Cordoba'),
  cityOption('ar-ushuaia', 'Ushuaia', 'Tierra del Fuego'),
];

const chileCityOptions = [
  cityOption('cl-santiago', 'Santiago', 'Santiago Metropolitan'),
  cityOption('cl-valparaiso', 'Valparaiso', 'Valparaiso'),
  cityOption('cl-punta-arenas', 'Punta Arenas', 'Magallanes'),
  cityOption('cl-san-pedro-de-atacama', 'San Pedro de Atacama', 'Antofagasta'),
];

const peruCityOptions = [
  cityOption('pe-lima', 'Lima', 'Lima'),
  cityOption('pe-cusco', 'Cusco', 'Cusco'),
  cityOption('pe-arequipa', 'Arequipa', 'Arequipa'),
];

const colombiaCityOptions = [
  cityOption('co-bogota', 'Bogota', 'Andean Region'),
  cityOption('co-medellin', 'Medellin', 'Antioquia'),
  cityOption('co-cartagena', 'Cartagena', 'Caribbean Region'),
];

const newZealandCityOptions = [
  cityOption('nz-auckland', 'Auckland', 'North Island'),
  cityOption('nz-wellington', 'Wellington', 'North Island'),
  cityOption('nz-queenstown', 'Queenstown', 'South Island'),
  cityOption('nz-christchurch', 'Christchurch', 'South Island'),
];

const countryCityOptionsLookup: Record<string, CityOption[]> = {
  '036': australiaCityOptions,
  '076': brazilCityOptions,
  '124': canadaCityOptions,
  '152': chileCityOptions,
  '156': chinaCityOptions,
  '170': colombiaCityOptions,
  '250': franceCityOptions,
  '276': germanyCityOptions,
  '300': greeceCityOptions,
  '352': icelandCityOptions,
  '356': indiaCityOptions,
  '360': indonesiaCityOptions,
  '380': italyCityOptions,
  '392': japanCityOptions,
  '410': southKoreaCityOptions,
  '484': mexicoCityOptions,
  '504': moroccoCityOptions,
  '528': netherlandsCityOptions,
  '554': newZealandCityOptions,
  '604': peruCityOptions,
  '620': portugalCityOptions,
  '710': southAfricaCityOptions,
  '724': spainCityOptions,
  '764': thailandCityOptions,
  '784': unitedArabEmiratesCityOptions,
  '792': turkeyCityOptions,
  '818': egyptCityOptions,
  '826': unitedKingdomCityOptions,
  '840': unitedStatesCityOptions,
  ar: argentinaCityOptions,
  argentina: argentinaCityOptions,
  au: australiaCityOptions,
  australia: australiaCityOptions,
  br: brazilCityOptions,
  brazil: brazilCityOptions,
  ca: canadaCityOptions,
  canada: canadaCityOptions,
  cl: chileCityOptions,
  chile: chileCityOptions,
  cn: chinaCityOptions,
  china: chinaCityOptions,
  co: colombiaCityOptions,
  colombia: colombiaCityOptions,
  de: germanyCityOptions,
  germany: germanyCityOptions,
  eg: egyptCityOptions,
  egypt: egyptCityOptions,
  es: spainCityOptions,
  spain: spainCityOptions,
  fr: franceCityOptions,
  france: franceCityOptions,
  gb: unitedKingdomCityOptions,
  uk: unitedKingdomCityOptions,
  'united kingdom': unitedKingdomCityOptions,
  'great britain': unitedKingdomCityOptions,
  gr: greeceCityOptions,
  greece: greeceCityOptions,
  iceland: icelandCityOptions,
  id: indonesiaCityOptions,
  indonesia: indonesiaCityOptions,
  in: indiaCityOptions,
  india: indiaCityOptions,
  is: icelandCityOptions,
  it: italyCityOptions,
  italy: italyCityOptions,
  jp: japanCityOptions,
  japan: japanCityOptions,
  kr: southKoreaCityOptions,
  'south korea': southKoreaCityOptions,
  korea: southKoreaCityOptions,
  ma: moroccoCityOptions,
  morocco: moroccoCityOptions,
  mx: mexicoCityOptions,
  mexico: mexicoCityOptions,
  nl: netherlandsCityOptions,
  netherlands: netherlandsCityOptions,
  nz: newZealandCityOptions,
  'new zealand': newZealandCityOptions,
  pe: peruCityOptions,
  peru: peruCityOptions,
  pt: portugalCityOptions,
  portugal: portugalCityOptions,
  th: thailandCityOptions,
  thailand: thailandCityOptions,
  tr: turkeyCityOptions,
  turkey: turkeyCityOptions,
  ae: unitedArabEmiratesCityOptions,
  'united arab emirates': unitedArabEmiratesCityOptions,
  uae: unitedArabEmiratesCityOptions,
  us: unitedStatesCityOptions,
  usa: unitedStatesCityOptions,
  'united states': unitedStatesCityOptions,
  'united states of america': unitedStatesCityOptions,
  za: southAfricaCityOptions,
  'south africa': southAfricaCityOptions,
};

const cityMapStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'city-preview-background',
      type: 'background',
      paint: {
        'background-color': '#10242F',
      },
    },
  ],
};

function getFallbackCityCoordinates(country: Country, cityIndex: number, cityCount: number): Coordinates {
  const [countryLongitude, countryLatitude] = country.coordinates ?? [0, 20];
  const centeredIndex = cityIndex - (cityCount - 1) / 2;
  const arcDirection = cityIndex % 2 === 0 ? 1 : -1;

  return [
    countryLongitude + centeredIndex * 2.2,
    countryLatitude + arcDirection * (1.2 + cityIndex * 0.35),
  ];
}

function normalizeCityName(cityName: string) {
  return cityName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function createCityId(cityName: string) {
  const slug = normalizeCityName(cityName).replace(/\s+/g, '-');
  return `city-${slug || 'saved'}-${Date.now().toString(36)}`;
}

function getKnownCityCoordinates(city: CountryCity) {
  return (
    city.coordinates ??
    cityCoordinateLookup[city.id] ??
    cityNameCoordinateLookup[normalizeCityName(city.name)]
  );
}

function mergeCityOptions(cityOptionGroups: CityOption[][]) {
  const mergedOptions = new Map<string, CityOption>();

  cityOptionGroups.flat().forEach((option) => {
    const optionKey = normalizeCityName(option.name);

    if (!mergedOptions.has(optionKey)) {
      mergedOptions.set(optionKey, {
        ...option,
        coordinates: option.coordinates ?? cityNameCoordinateLookup[optionKey],
      });
    }
  });

  return Array.from(mergedOptions.values()).sort((firstOption, secondOption) =>
    firstOption.name.localeCompare(secondOption.name, undefined, { sensitivity: 'base' })
  );
}

function getCountryCityOptionKeys(country: Country) {
  return Array.from(
    new Set(
      [country.id, country.code, country.name]
        .filter(Boolean)
        .map((countryKey) => normalizeCityName(countryKey))
    )
  );
}

function getCityOptionsForCountry(country: Country) {
  const sampleCityOptions =
    country.cities?.map((city) => ({
      id: city.id,
      name: city.name,
      region: city.region,
      coordinates: getKnownCityCoordinates(city),
    })) ?? [];
  const presetCityOptions = getCountryCityOptionKeys(country).flatMap(
    (countryKey) => countryCityOptionsLookup[countryKey] ?? []
  );

  return mergeCityOptions([sampleCityOptions, presetCityOptions]);
}

function mergeCountryCities(sampleCities: CountryCity[], savedCities: CountryCity[]) {
  const mergedCities = new Map<string, CountryCity>();

  sampleCities.forEach((city) => {
    mergedCities.set(`${normalizeCityName(city.name)}-${normalizeCityName(city.region)}`, city);
  });

  savedCities.forEach((city) => {
    mergedCities.set(`${normalizeCityName(city.name)}-${normalizeCityName(city.region)}`, city);
  });

  return Array.from(mergedCities.values());
}

function buildCityPreviewPoints(country: Country, cities: CountryCity[]): CityPreviewPoint[] {
  if (cities.length === 0) {
    return [
      {
        id: `${country.id}-focus`,
        name: country.name,
        region: 'Country preview',
        visited: country.visited,
        coordinates: country.coordinates ?? [0, 20],
      },
    ];
  }

  return cities.map((city, index) => ({
    id: city.id,
    name: city.name,
    region: city.region,
    visited: city.visited,
    coordinates: getKnownCityCoordinates(city) ?? getFallbackCityCoordinates(country, index, cities.length),
  }));
}

function getPreviewCenter(points: CityPreviewPoint[]): Coordinates {
  const longitude = points.reduce((sum, point) => sum + point.coordinates[0], 0) / points.length;
  const latitude = points.reduce((sum, point) => sum + point.coordinates[1], 0) / points.length;

  return [longitude, latitude];
}

function getPreviewBounds(points: CityPreviewPoint[]): LngLatBoundsLike | null {
  if (points.length < 2) return null;

  const longitudes = points.map((point) => point.coordinates[0]);
  const latitudes = points.map((point) => point.coordinates[1]);

  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

function CityMapPreview({ country, points }: { country: Country; points: CityPreviewPoint[] }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const previewCenter = useMemo(() => getPreviewCenter(points), [points]);
  const previewBounds = useMemo(() => getPreviewBounds(points), [points]);
  const previewKey = useMemo(
    () => `${country.id}-${points.map((point) => point.id).join('-')}`,
    [country.id, points]
  );

  useEffect(() => {
    let isMounted = true;
    let map: MapLibreMap | null = null;

    async function loadMapPreview() {
      if (!mapContainerRef.current) return;

      setMapStatus('loading');

      try {
        const maplibregl = await import('maplibre-gl');
        if (!isMounted || !mapContainerRef.current) return;

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: cityMapStyle,
          center: previewCenter,
          zoom: points.length > 1 ? 4 : 3,
          minZoom: 2,
          maxZoom: 12,
          pitch: 42,
          bearing: points.length > 1 ? -10 : 0,
          attributionControl: false,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          if (!map) return;
          const currentMap = map;

          const cityPointData = {
            type: 'FeatureCollection' as const,
            features: points.map((point) => ({
              type: 'Feature' as const,
              properties: {
                name: point.name,
                visited: point.visited,
              },
              geometry: {
                type: 'Point' as const,
                coordinates: point.coordinates,
              },
            })),
          };

          map.addSource('city-points', {
            type: 'geojson',
            data: cityPointData,
          });

          if (points.length > 1) {
            map.addSource('city-route', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: points.map((point) => point.coordinates),
                    },
                  },
                ],
              },
            });

            map.addLayer({
              id: 'city-route-shadow',
              type: 'line',
              source: 'city-route',
              paint: {
                'line-color': '#000000',
                'line-opacity': 0.35,
                'line-width': 8,
                'line-blur': 4,
              },
            });

            map.addLayer({
              id: 'city-route',
              type: 'line',
              source: 'city-route',
              paint: {
                'line-color': '#FFD166',
                'line-opacity': 0.9,
                'line-width': 3,
                'line-dasharray': [1.4, 1],
              },
            });
          }

          map.addLayer({
            id: 'city-points-glow',
            type: 'circle',
            source: 'city-points',
            paint: {
              'circle-color': '#FFD166',
              'circle-radius': 15,
              'circle-opacity': 0.18,
              'circle-blur': 0.35,
            },
          });

          map.addLayer({
            id: 'city-points',
            type: 'circle',
            source: 'city-points',
            paint: {
              'circle-color': ['case', ['get', 'visited'], '#59D98E', '#FFD166'],
              'circle-radius': 6,
              'circle-stroke-color': '#FFF7DF',
              'circle-stroke-width': 2,
            },
          });

          points.forEach((point) => {
            const markerElement = document.createElement('div');
            markerElement.style.display = 'flex';
            markerElement.style.flexDirection = 'column';
            markerElement.style.alignItems = 'center';
            markerElement.style.gap = '6px';
            markerElement.style.pointerEvents = 'none';

            const markerDot = document.createElement('div');
            markerDot.style.width = '14px';
            markerDot.style.height = '14px';
            markerDot.style.borderRadius = '999px';
            markerDot.style.background = point.visited ? '#59D98E' : '#FFD166';
            markerDot.style.border = '2px solid #FFF7DF';
            markerDot.style.boxShadow = '0 0 0 8px rgba(255, 209, 102, 0.16), 0 8px 20px rgba(0, 0, 0, 0.35)';

            const markerLabel = document.createElement('div');
            markerLabel.textContent = point.name;
            markerLabel.style.maxWidth = '120px';
            markerLabel.style.border = '1px solid rgba(255, 255, 255, 0.14)';
            markerLabel.style.borderRadius = '999px';
            markerLabel.style.background = 'rgba(7, 13, 17, 0.74)';
            markerLabel.style.padding = '4px 9px';
            markerLabel.style.color = '#FFF7DF';
            markerLabel.style.fontSize = '12px';
            markerLabel.style.fontWeight = '700';
            markerLabel.style.lineHeight = '1';
            markerLabel.style.textAlign = 'center';
            markerLabel.style.whiteSpace = 'nowrap';
            markerLabel.style.overflow = 'hidden';
            markerLabel.style.textOverflow = 'ellipsis';
            markerLabel.style.backdropFilter = 'blur(8px)';
            markerLabel.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.28)';

            markerElement.append(markerDot, markerLabel);

            new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
              .setLngLat(point.coordinates)
              .addTo(currentMap);
          });

          if (previewBounds) {
            currentMap.fitBounds(previewBounds, { padding: 72, maxZoom: 7, duration: 900 });
          }

          window.requestAnimationFrame(() => currentMap.resize());
          setMapStatus('ready');
        });
      } catch {
        if (isMounted) setMapStatus('error');
      }
    }

    loadMapPreview();

    return () => {
      isMounted = false;
      map?.remove();
    };
  }, [points, previewBounds, previewCenter, previewKey]);

  return (
    <div className="relative h-[320px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0B1115]">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(78,207,255,0.18),transparent_24%),radial-gradient(circle_at_76%_18%,rgba(255,209,102,0.16),transparent_26%),radial-gradient(circle_at_48%_82%,rgba(89,217,142,0.14),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
        viewBox="0 0 640 320"
        preserveAspectRatio="none"
      >
        <path d="M-40 230 C120 130 230 300 390 190 C510 110 600 170 690 90" fill="none" stroke="#FFD166" strokeWidth="1.4" strokeDasharray="8 10" />
        <path d="M-30 90 C100 45 210 110 320 75 C470 28 560 95 690 46" fill="none" stroke="#4ECFFF" strokeWidth="1" strokeDasharray="5 12" />
        <path d="M40 360 C170 250 260 260 360 230 C500 190 580 260 670 210" fill="none" stroke="#59D98E" strokeWidth="1" strokeDasharray="4 11" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/50" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-white shadow-soft backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Live preview</p>
        <p className="mt-1 text-lg font-semibold">{country.name}</p>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm text-white/85 shadow-soft backdrop-blur">
          {points.length > 1 ? `${points.length} city pins` : 'Country-level preview'}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/65 shadow-soft backdrop-blur">
          Interactive route preview
        </div>
      </div>
      {mapStatus !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B1115]/80 text-sm text-white/70">
          {mapStatus === 'error' ? 'Map preview unavailable.' : 'Loading map preview...'}
        </div>
      )}
    </div>
  );
}

export default function CityExplorer({ country, onClose }: CityExplorerProps) {
  const router = useRouter();
  const countryCities = useMapStore((state) => state.countryCities ?? {});
  const addCountryCity = useMapStore((state) => state.addCountryCity);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [selectedCityOptionId, setSelectedCityOptionId] = useState('');
  const [newCityRegion, setNewCityRegion] = useState('');
  const [cityFormError, setCityFormError] = useState('');

  const savedCountryCities = useMemo(() => {
    if (!country) return [];

    const citySourceIds = Array.from(new Set([country.id, country.code].filter(Boolean)));
    const savedCities = citySourceIds.flatMap((countryId) => countryCities[countryId] ?? []);
    const savedCityMap = new Map(savedCities.map((city) => [city.id, city]));

    return Array.from(savedCityMap.values());
  }, [country, countryCities]);

  const cityList = useMemo(() => {
    if (!country) return [];

    return mergeCountryCities(country.cities ?? [], savedCountryCities);
  }, [country, savedCountryCities]);

  const cityOptions = useMemo(() => {
    if (!country) return [];

    return getCityOptionsForCountry(country);
  }, [country]);

  const availableCityOptions = useMemo(() => {
    const addedCityNames = new Set(cityList.map((city) => normalizeCityName(city.name)));

    return cityOptions.filter((option) => !addedCityNames.has(normalizeCityName(option.name)));
  }, [cityList, cityOptions]);

  if (!country) {
    return null;
  }

  const highlights = country.highlights ?? [];
  const passportStamp = findCountryStamp(country.id, country.name, country.code);
  const cityPreviewPoints = buildCityPreviewPoints(country, cityList);

  const handleShowPassportStamp = () => {
    if (!passportStamp) return;

    router.push(`/passport?stamp=${encodeURIComponent(passportStamp.id)}`);
  };

  const handleClose = () => {
    setIsAddingCity(false);
    setSelectedCityOptionId('');
    setNewCityRegion('');
    setCityFormError('');
    onClose();
  };

  const handleAddCity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedCityOption = availableCityOptions.find((option) => option.id === selectedCityOptionId);

    if (!selectedCityOption) {
      setCityFormError('Choose a city from the dropdown first.');
      return;
    }

    const cityName = selectedCityOption.name;
    const cityRegion = newCityRegion.trim() || selectedCityOption.region || 'Saved city';
    const cityAlreadyExists = cityList.some(
      (city) => normalizeCityName(city.name) === normalizeCityName(cityName)
    );

    if (cityAlreadyExists) {
      setCityFormError(`${cityName} is already in this explorer.`);
      return;
    }

    const savedCity: CountryCity = {
      id: createCityId(cityName),
      name: cityName,
      region: cityRegion,
      visited: true,
      coordinates: selectedCityOption.coordinates ?? cityNameCoordinateLookup[normalizeCityName(cityName)],
      createdAt: new Date().toISOString(),
    };

    addCountryCity(country.id, savedCity);
    setSelectedCityOptionId('');
    setNewCityRegion('');
    setCityFormError('');
    setIsAddingCity(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-6 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-cream shadow-2xl ring-1 ring-black/10">
        <div className="flex flex-col gap-4 border-b border-ink/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-ink/60">Country Explorer</p>
            <h2 className="text-3xl font-semibold text-ink">{country.name}</h2>
            <p className="text-sm text-ink/70">A first look at city-level travel, memories, and local routes.</p>
          </div>
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-5 rounded-[1.5rem] bg-[#151515] p-6 text-white shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">City Explorer</h3>
                <p className="text-sm text-white/70">Zoom into your favorite places and pinned routes.</p>
              </div>
              <span className="rounded-full bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-gold">
                beta
              </span>
            </div>

            <div className="rounded-3xl bg-[#0d0d0d] p-4">
              <div className="mb-3 text-sm uppercase tracking-[0.26em] text-white/50">Immersive map preview</div>
              <CityMapPreview country={country} points={cityPreviewPoints} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-[#111111] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.26em] text-white/50">Visited cities</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 py-1 text-xs text-white hover:bg-white/10"
                    onClick={() => {
                      setIsAddingCity((currentValue) => {
                        if (currentValue) {
                          setSelectedCityOptionId('');
                          setNewCityRegion('');
                        }

                        return !currentValue;
                      });
                      setCityFormError('');
                    }}
                  >
                    {isAddingCity ? 'Cancel' : 'Add city'}
                  </Button>
                </div>
                {isAddingCity && (
                  <form
                    onSubmit={handleAddCity}
                    className="mt-4 space-y-3 rounded-3xl border border-gold/20 bg-[#0d0d0d] p-3"
                  >
                    <div className="grid gap-2">
                      <label htmlFor="city-name" className="sr-only">
                        City name
                      </label>
                      <select
                        id="city-name"
                        value={selectedCityOptionId}
                        disabled={availableCityOptions.length === 0}
                        onChange={(event) => {
                          setSelectedCityOptionId(event.target.value);
                          setCityFormError('');
                        }}
                        className="h-10 rounded-xl border border-white/10 bg-white/95 px-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="">
                          {availableCityOptions.length > 0 ? 'Choose a city' : 'No city options left'}
                        </option>
                        {availableCityOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="city-region" className="sr-only">
                        City region or note
                      </label>
                      <input
                        id="city-region"
                        value={newCityRegion}
                        onChange={(event) => setNewCityRegion(event.target.value)}
                        placeholder="Region or note (optional)"
                        className="h-10 rounded-xl border border-white/10 bg-white/95 px-3 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-gold focus:ring-2 focus:ring-gold/30"
                      />
                    </div>
                    {cityOptions.length === 0 && (
                      <p className="text-xs text-white/55">No preset cities are available for this country yet.</p>
                    )}
                    {cityFormError && <p className="text-sm text-[#FFB4B4]">{cityFormError}</p>}
                    <Button size="sm" type="submit" className="w-full" disabled={availableCityOptions.length === 0}>
                      Save visited city
                    </Button>
                  </form>
                )}
                <ul className="mt-3 space-y-3 text-sm text-white/80">
                  {cityList.length > 0 ? (
                    cityList.map((city) => (
                      <li key={city.id} className="rounded-3xl border border-white/10 bg-[#0d0d0d] px-4 py-3">
                        <p className="font-medium">{city.name}</p>
                        <p className="text-xs text-white/60">{city.region}</p>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/60">No cities added yet.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-3xl bg-[#111111] p-4">
                <p className="text-sm uppercase tracking-[0.26em] text-white/50">Scrapbook highlights</p>
                <ul className="mt-3 space-y-3 text-sm text-white/80">
                  {highlights.length > 0 ? (
                    highlights.map((detail: string, index: number) => (
                      <li key={index} className="rounded-3xl border border-white/10 bg-[#0d0d0d] px-4 py-3">
                        {detail}
                      </li>
                    ))
                  ) : (
                    <li className="text-white/60">No highlights available.</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <aside className="space-y-6 rounded-[1.5rem] bg-white/95 p-6 shadow-soft">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ink">Memory board</h3>
              <p className="text-sm text-ink/75">Saved journal entries, photos, and pinned locations will appear here.</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-ink/10 bg-cream p-4">
              <div className="text-sm font-medium text-ink">Country</div>
              <div className="text-2xl font-semibold text-ink">{country.name}</div>
            </div>
            <div className="space-y-3 rounded-3xl border border-gold/25 bg-cream p-4">
              <div>
                <div className="text-sm font-medium text-ink">Passport stamp</div>
                <p className="mt-1 text-sm text-ink/70">
                  {passportStamp
                    ? `${passportStamp.visual.edition_name} in your ${passportStamp.region} folio.`
                    : 'No passport stamp is available for this country yet.'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleShowPassportStamp} disabled={!passportStamp}>
                View stamp
              </Button>
            </div>
            <div className="space-y-4 rounded-3xl border border-ink/10 bg-cream p-4">
              <div className="text-sm font-medium text-ink">Next step</div>
              <p className="text-sm text-ink/75">Add travel photos, journal entries, and marker clusters for neighborhoods.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

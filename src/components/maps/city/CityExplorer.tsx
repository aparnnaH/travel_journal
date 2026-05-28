'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  kind: 'city' | 'country';
  isApproximate: boolean;
}

interface CityOption {
  id: string;
  name: string;
  region: string;
  coordinates?: Coordinates;
}

interface TileViewport {
  width: number;
  height: number;
}

interface MapTile {
  key: string;
  url: string;
  left: number;
  top: number;
}

interface MapPin extends CityPreviewPoint {
  left: number;
  top: number;
}

interface CountryViewportConfig {
  center: Coordinates;
  zoom: number;
}

type CityOptionSeed = readonly [slug: string, name: string, region: string];

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

const cityRegionCoordinateLookup: Record<string, Coordinates> = {
  'aalborg|north jutland': [9.9187, 57.048],
  'aarhus|central denmark': [10.2108, 56.1567],
  'abu dhabi|abu dhabi': [54.397, 24.4512],
  'abuja|federal capital territory': [7.4951, 9.0579],
  'accra|greater accra': [-0.1969, 5.556],
  'addis ababa|addis ababa': [38.7469, 9.025],
  'adelaide|south australia': [138.5986, -34.9287],
  'agadir|souss massa': [-9.5982, 30.4202],
  'agra|uttar pradesh': [78.0167, 27.1833],
  'akureyri|north iceland': [-18.0878, 65.6835],
  'al khor|al khor': [51.5058, 25.6839],
  'al wakrah|al wakrah': [51.6034, 25.1715],
  'alesund|more og romsdal': [6.1549, 62.4723],
  'alexandria|mediterranean coast': [29.9158, 31.2018],
  'algiers|algiers province': [3.0875, 36.7323],
  'alice springs|northern territory': [133.8836, -23.6975],
  'almaty|almaty': [76.9115, 43.2525],
  'alula|medina province': [37.9232, 26.6085],
  'amalfi|campania': [14.6024, 40.6349],
  'amman|amman governorate': [35.945, 31.9552],
  'amsterdam|north holland': [4.8897, 52.374],
  'ankara|central anatolia': [32.8543, 39.9199],
  'annecy|auvergne rhone alpes': [6.1257, 45.9088],
  'antalya|mediterranean': [30.6956, 36.9081],
  'antananarivo|analamanga': [47.5361, -18.9137],
  'antigua|sacatepequez': [-90.7332, 14.5564],
  'antwerp|antwerp': [4.4003, 51.2205],
  'aqaba|aqaba governorate': [35.0078, 29.5267],
  'arequipa|arequipa': [-71.5375, -16.399],
  'arusha|northern tanzania': [36.6833, -3.3667],
  'astana|akmola': [71.446, 51.1801],
  'asuncion|asuncion': [-57.647, -25.2865],
  'aswan|upper egypt': [32.8994, 24.0908],
  'athens|attica': [23.7278, 37.9838],
  'auckland|north island': [174.7635, -36.8485],
  'austin|texas': [-97.7431, 30.2672],
  'avignon|provence': [4.8089, 43.9483],
  'axum|tigray': [38.7234, 14.1211],
  'ayia napa|famagusta district': [34.0018, 34.9821],
  'ayutthaya|central thailand': [100.5774, 14.3517],
  'baalbek|baalbek hermel': [36.2181, 34.0058],
  'bagan|mandalay region': [94.8585, 21.1717],
  'bahir dar|amhara': [37.3908, 11.5936],
  'baku|absheron': [49.892, 40.3777],
  'bandung|java': [107.6069, -6.9222],
  'banff|alberta': [-115.5698, 51.1762],
  'bangkok|central thailand': [100.5014, 13.754],
  'banja luka|republika srpska': [17.2063, 44.7788],
  'banos|tungurahua': [-78.4229, -1.397],
  'barcelona|catalonia': [2.159, 41.3888],
  'bariloche|patagonia': [-71.3082, -41.1456],
  'bath|england': [-2.3617, 51.3751],
  'battambang|battambang': [103.1982, 13.1027],
  'batumi|adjara': [41.6306, 41.6408],
  'beijing|beijing': [116.3972, 39.9075],
  'beirut|beirut governorate': [35.5016, 33.8933],
  'belem|north': [-48.5044, -1.4558],
  'belfast|northern ireland': [-5.9254, 54.5968],
  'belgrade|belgrade': [20.4651, 44.804],
  'belize city|belize district': [-88.1976, 17.4995],
  'bengaluru|karnataka': [77.5937, 12.9719],
  'berat|berat county': [19.9522, 40.7058],
  'bergen|vestland': [5.3242, 60.393],
  'berlin|berlin': [13.4105, 52.5244],
  'bern|bern': [7.4474, 46.9481],
  'bhaktapur|bagmati': [85.43, 27.673],
  'bilbao|basque country': [-2.9253, 43.2627],
  'bitola|pelagonia': [21.3355, 41.0323],
  'bled|upper carniola': [14.1165, 46.3686],
  'bocas del toro|bocas del toro': [-82.242, 9.3403],
  'bodrum|aegean': [27.4292, 37.0383],
  'bogota|andean region': [-74.0817, 4.6097],
  'bohol|central visayas': [124.1435, 9.8499],
  'bologna|emilia romagna': [11.3387, 44.4938],
  'boquete|chiriqui': [-82.4414, 8.7802],
  'boracay|western visayas': [121.9248, 11.9674],
  'bordeaux|nouvelle aquitaine': [-0.5805, 44.8412],
  'boston|massachusetts': [-71.0598, 42.3584],
  'braga|norte': [-8.4231, 41.5514],
  'brasilia|central west': [-47.9297, -15.7797],
  'brasov|transylvania': [25.6061, 45.6486],
  'brighton|england': [-0.1395, 50.8284],
  'brisbane|queensland': [153.0281, -27.4679],
  'brno|south moravia': [16.608, 49.1952],
  'bruges|west flanders': [3.2242, 51.2089],
  'brussels|brussels': [4.3488, 50.8505],
  'bucharest|bucharest': [26.1063, 44.4323],
  'budapest|central hungary': [19.0404, 47.4984],
  'budva|adriatic coast': [18.8392, 42.2872],
  'buenos aires|buenos aires': [-58.3772, -34.6131],
  'bukhara|bukhara': [64.4307, 39.7703],
  'bulawayo|bulawayo': [28.5833, -20.15],
  'burgas|black sea coast': [27.4689, 42.5065],
  'bursa|marmara': [29.0601, 40.1956],
  'busan|yeongnam': [129.03, 35.1017],
  'byblos|mount lebanon': [35.6481, 34.1211],
  'byron bay|new south wales': [153.6125, -28.6499],
  'cairns|queensland': [145.7661, -16.9237],
  'cairo|cairo governorate': [31.2497, 30.0626],
  'calabar|cross river': [8.327, 4.9589],
  'calgary|alberta': [-114.0853, 51.0501],
  'cali|valle del cauca': [-76.5199, 3.4305],
  'cambridge|england': [0.1167, 52.2],
  'canberra|australian capital territory': [149.1281, -35.2835],
  'cancun|quintana roo': [-86.8466, 21.1743],
  'canggu|bali': [115.1385, -8.6478],
  'cannes|french riviera': [7.0127, 43.5513],
  'cape coast|central region': [-1.2466, 5.1053],
  'cape town|western cape': [18.4232, -33.9258],
  'cardiff|wales': [-3.18, 51.48],
  'cartagena|caribbean region': [-75.4933, 10.3982],
  'casablanca|casablanca settat': [-7.6114, 33.5883],
  'cascais|lisbon district': [-9.4215, 38.6968],
  'caye caulker|belize district': [-88.0276, 17.7366],
  'cebu city|central visayas': [123.8907, 10.3167],
  'cesky krumlov|south bohemia': [14.3152, 48.8109],
  'cetinje|old royal capital': [18.9142, 42.3906],
  'chamonix|auvergne rhone alpes': [6.8693, 45.9237],
  'chania|crete': [24.0292, 35.5112],
  'charleston|south carolina': [-79.9327, 32.7763],
  'chefchaouen|tangier tetouan al hoceima': [-5.2636, 35.1688],
  'chengdu|sichuan': [104.0667, 30.6667],
  'chennai|tamil nadu': [80.2785, 13.0878],
  'chernivtsi|bukovina': [25.9324, 48.2904],
  'chiang mai|northern thailand': [98.9847, 18.7904],
  'chiang rai|northern thailand': [99.8325, 19.9086],
  'chicago|illinois': [-87.65, 41.85],
  'chittagong|chittagong division': [91.8317, 22.3384],
  'chitwan|bagmati': [84.3542, 27.5291],
  'christchurch|south island': [172.6333, -43.5333],
  'cinque terre|liguria': [9.7083, 44.1461],
  'ciudad del este|alto parana': [-54.6507, -25.5036],
  'cluj napoca|transylvania': [23.6, 46.7667],
  'coimbra|centro': [-8.42, 40.2069],
  'cologne|north rhine westphalia': [6.95, 50.9333],
  'colombo|western province': [79.8487, 6.9355],
  'colonia del sacramento|colonia': [-57.8398, -34.4626],
  'constantine|constantine province': [6.6147, 36.365],
  'copacabana|lake titicaca': [-69.0792, -16.1699],
  'copenhagen|capital region': [12.5655, 55.6759],
  'cordoba|andalusia': [-4.7728, 37.8916],
  'cordoba|cordoba': [-64.1885, -31.4065],
  'corfu|ionian islands': [19.9202, 39.6244],
  'cork|munster': [-8.4706, 51.898],
  'coron|palawan': [120.2043, 11.9986],
  'cox s bazar|chittagong division': [92.0096, 21.4397],
  'cuenca|azuay': [-78.9963, -2.8953],
  'culebra|culebra': [-65.301, 18.303],
  'curitiba|south': [-49.2731, -25.4278],
  'cusco|cusco': [-71.967, -13.5319],
  'da nang|central vietnam': [108.2208, 16.0678],
  'daegu|yeongnam': [128.5911, 35.8703],
  'dahab|south sinai': [34.495, 28.4821],
  'dakar|dakar region': [-17.4441, 14.6937],
  'dar es salaam|coast': [39.2695, -6.8235],
  'darwin|northern territory': [130.8418, -12.4611],
  'dead sea|jordan valley': [35.5, 31.559],
  'debrecen|northern great plain': [21.6244, 47.5317],
  'delft|south holland': [4.3556, 52.0067],
  'delhi|national capital territory': [77.2315, 28.6519],
  'delphi|central greece': [22.4936, 38.4794],
  'denarau|viti levu': [177.367, -17.772],
  'denpasar|bali': [115.2167, -8.65],
  'denver|colorado': [-104.9847, 39.7392],
  'dhaka|dhaka division': [90.4074, 23.7104],
  'diani beach|coast': [39.5927, -4.2793],
  'dilijan|tavush': [44.8634, 40.7404],
  'dinant|wallonia': [4.9117, 50.2581],
  'djerba|medenine': [10.8575, 33.8758],
  'doha|doha': [51.531, 25.2855],
  'dresden|saxony': [13.7383, 51.0509],
  'dubai|dubai': [55.3093, 25.0772],
  'dublin|leinster': [-6.2489, 53.3331],
  'dubrovnik|dalmatia': [18.1091, 42.6412],
  'dunedin|south island': [170.5036, -45.8742],
  'durban|kwazulu natal': [31.0292, -29.8579],
  'dusseldorf|north rhine westphalia': [6.7793, 51.2232],
  'easter island|valparaiso': [-109.3497, -27.1127],
  'edinburgh|scotland': [-3.1965, 55.9521],
  'eger|northern hungary': [20.3733, 47.9027],
  'eilat|southern district': [34.9482, 29.5581],
  'el calafate|patagonia': [-72.2768, -50.3407],
  'el nido|palawan': [119.3956, 11.1858],
  'ella|uva province': [81.0463, 6.8756],
  'encarnacion|itapua': [-55.8666, -27.3318],
  'entebbe|central region': [32.4795, 0.0562],
  'ephesus|aegean': [27.3685, 37.9514],
  'essaouira|marrakesh safi': [-9.77, 31.5125],
  'etosha|oshikoto': [16.3322, -18.8556],
  'evora|alentejo': [-7.904, 38.5659],
  'exuma|out islands': [-75.833, 23.533],
  'faro|algarve': [-7.9272, 37.0187],
  'fes|fes meknes': [-5.0003, 34.0331],
  'fethiye|mediterranean': [29.1276, 36.6404],
  'florence|tuscany': [11.2463, 43.7792],
  'flores|peten': [-89.8994, 16.9226],
  'florianopolis|south': [-48.5492, -27.5967],
  'fort portal|western region': [30.2748, 0.6617],
  'fortaleza|northeast': [-38.5431, -3.7172],
  'foz do iguacu|south': [-54.5881, -25.5478],
  'francistown|north east district': [27.5078, -21.17],
  'frankfurt|hesse': [8.6842, 50.1155],
  'freeport|grand bahama': [-78.7, 26.5333],
  'fukuoka|kyushu': [130.4167, 33.6],
  'funchal|madeira': [-16.9255, 32.6657],
  'gabala|gabala': [47.8458, 40.9814],
  'gaborone|south east district': [25.9086, -24.6545],
  'galapagos|galapagos islands': [-90.9656, -0.9538],
  'galle|southern province': [80.2103, 6.0461],
  'galway|connacht': [-9.051, 53.2724],
  'ganja|ganja': [46.3613, 40.6816],
  'gdansk|pomeranian': [18.6491, 54.3523],
  'geneva|geneva': [6.1457, 46.2022],
  'ghent|east flanders': [3.7167, 51.05],
  'gisenyi|western province': [29.2564, -1.7028],
  'giza|giza governorate': [31.2086, 30.0094],
  'gjirokaster|gjirokaster county': [20.1389, 40.0758],
  'glasgow|scotland': [-4.2576, 55.8651],
  'goa|goa': [73.8149, 15.3891],
  'gold coast|queensland': [153.4309, -28.0003],
  'gondar|amhara': [37.4667, 12.6],
  'goreme|cappadocia': [34.8289, 38.6428],
  'gorkhi terelj|tuv': [107.473, 47.9706],
  'gothenburg|vastra gotaland': [11.9668, 57.7072],
  'granada|andalusia': [-3.6067, 37.1882],
  'graz|styria': [15.442, 47.0673],
  'great zimbabwe|masvingo': [30.9338, -20.2675],
  'groningen|groningen': [6.5667, 53.2192],
  'guadalajara|jalisco': [-103.3475, 20.6774],
  'guangzhou|guangdong': [113.25, 23.1167],
  'guatemala city|guatemala department': [-90.5133, 14.6407],
  'guayaquil|guayas': [-79.8862, -2.1962],
  'guilin|guangxi': [110.2964, 25.2802],
  'gyeongju|north gyeongsang': [129.2117, 35.8428],
  'gyumri|shirak': [43.8464, 40.7931],
  'haarlem|north holland': [4.6368, 52.3808],
  'haifa|haifa district': [34.9993, 32.813],
  'halifax|nova scotia': [-63.5769, 44.6427],
  'hallstatt|upper austria': [13.6493, 47.5622],
  'hamburg|hamburg': [9.993, 53.5507],
  'hammamet|nabeul': [10.6167, 36.4],
  'hangzhou|zhejiang': [120.1614, 30.2936],
  'hanoi|northern vietnam': [105.8412, 21.0245],
  'harare|harare': [31.0534, -17.8277],
  'harbour island|eleuthera': [-76.6363, 25.5022],
  'havana|la habana': [-82.383, 23.133],
  'heidelberg|baden wurttemberg': [8.6908, 49.4077],
  'helsinki|uusimaa': [24.9354, 60.1695],
  'heraklion|crete': [25.1434, 35.3279],
  'hermanus|western cape': [19.2345, -34.4187],
  'hiroshima|chugoku': [132.45, 34.4],
  'ho chi minh city|southern vietnam': [106.6296, 10.823],
  'hobart|tasmania': [147.3294, -42.8794],
  'hoi an|central vietnam': [108.335, 15.8794],
  'hong kong|hong kong': [114.1694, 22.3193],
  'honolulu|hawaii': [-157.8583, 21.3069],
  'houston|texas': [-95.3633, 29.7633],
  'hualien|eastern taiwan': [121.6044, 23.9769],
  'huaraz|ancash': [-77.5287, -9.5261],
  'hue|central vietnam': [107.5955, 16.4619],
  'hunza|gilgit baltistan': [74.6614, 36.3269],
  'hurghada|red sea': [33.8129, 27.2574],
  'hvar|dalmatia': [16.4428, 43.1725],
  'ibiza|balearic islands': [1.433, 38.9088],
  'ilha de mozambique|nampula': [40.7358, -15.0342],
  'incheon|capital area': [126.7052, 37.4565],
  'inle lake|shan state': [96.9102, 20.5863],
  'innsbruck|tyrol': [11.3945, 47.2627],
  'interlaken|bernese oberland': [7.8664, 46.6839],
  'inverness|scotland': [-4.224, 57.4791],
  'iquitos|amazonas': [-73.2529, -3.7481],
  'isfahan|isfahan': [51.6746, 32.6525],
  'islamabad|islamabad capital territory': [73.0433, 33.7215],
  'istanbul|marmara': [28.9497, 41.0138],
  'izmir|aegean': [27.1384, 38.4127],
  'jaipur|rajasthan': [75.7878, 26.9196],
  'jajce|central bosnia': [17.2706, 44.342],
  'jakarta|java': [106.8451, -6.2146],
  'jasper|alberta': [-118.0804, 52.8795],
  'jeddah|makkah province': [39.1862, 21.4901],
  'jeju city|jeju': [126.5219, 33.5097],
  'jeonju|north jeolla': [127.1489, 35.8219],
  'jerash|jerash governorate': [35.8993, 32.2808],
  'jerusalem|jerusalem district': [35.2163, 31.769],
  'jinja|eastern region': [33.2032, 0.439],
  'jodhpur|rajasthan': [73.0059, 26.2684],
  'johannesburg|gauteng': [28.0436, -26.2023],
  'kairouan|kairouan governorate': [10.0963, 35.6781],
  'kampala|central region': [32.5822, 0.3163],
  'kampot|southern cambodia': [104.1814, 10.6104],
  'kanazawa|chubu': [136.6167, 36.6],
  'kandy|central province': [80.6336, 7.2906],
  'kano|kano state': [8.5167, 12.0001],
  'kaohsiung|southern taiwan': [120.3133, 22.6163],
  'karachi|sindh': [67.0104, 24.8608],
  'karlovy vary|karlovy vary': [12.8712, 50.2327],
  'kasane|chobe district': [25.1602, -17.8016],
  'kashan|isfahan': [62.7102, 27.6029],
  'kathmandu|bagmati': [85.3206, 27.7017],
  'kazan|tatarstan': [49.1221, 55.7887],
  'kazbegi|mtskheta mtianeti': [44.6431, 42.6569],
  'kharkhorin|orkhon valley': [102.8135, 47.1925],
  'kharkiv|eastern ukraine': [36.2548, 49.9818],
  'khiva|khorezm': [60.3641, 41.3856],
  'kigali|kigali': [30.0588, -1.95],
  'kilkenny|leinster': [-7.2522, 52.6542],
  'killarney|county kerry': [-9.5086, 52.0598],
  'kingston|kingston': [-76.7936, 17.997],
  'kiruna|lapland': [20.2251, 67.8557],
  'knysna|western cape': [23.0471, -34.0363],
  'kobe|kansai': [135.183, 34.6913],
  'kochi|kerala': [76.2602, 9.9399],
  'koh samui|southern thailand': [99.9357, 9.5357],
  'kokopo|east new britain': [152.2687, -4.3432],
  'kolkata|west bengal': [88.363, 22.5626],
  'konya|central anatolia': [32.4846, 37.8713],
  'kota kinabalu|sabah': [116.0724, 5.9749],
  'kotor|bay of kotor': [18.7682, 42.4207],
  'krabi|southern thailand': [98.9105, 8.0726],
  'krakow|lesser poland': [19.9366, 50.0614],
  'kruger national park|mpumalanga': [31.5547, -23.9884],
  'kuala lumpur|federal territory': [101.6865, 3.1412],
  'kuching|sarawak': [110.3333, 1.55],
  'kumasi|ashanti': [-1.6244, 6.6885],
  'kutaisi|imereti': [42.6946, 42.2679],
  'kutna hora|central bohemia': [15.2682, 49.9484],
  'kyiv|kyiv': [30.5238, 50.4547],
  'kyoto|kansai': [135.7538, 35.0211],
  'la fortuna|alajuela': [-84.6453, 10.4709],
  'la paz|la paz': [-68.15, -16.5],
  'la serena|coquimbo': [-71.2501, -29.9059],
  'labuan bajo|east nusa tenggara': [119.8877, -8.4964],
  'lae|morobe': [146.9961, -6.7233],
  'lagos|algarve': [-8.6742, 37.102],
  'lagos|lagos state': [3.3947, 6.4541],
  'lahore|punjab': [74.3507, 31.558],
  'lake atitlan|solola': [-91.2025, 14.6907],
  'lake balaton|transdanubia': [17.734, 46.8303],
  'lalibela|amhara': [39.0476, 12.0322],
  'lamu|coast': [40.902, -2.2717],
  'langkawi|kedah': [99.8432, 6.3265],
  'larnaca|larnaca district': [33.6279, 34.9221],
  'las vegas|nevada': [-115.1372, 36.175],
  'lausanne|vaud': [6.6328, 46.516],
  'leiden|south holland': [4.4931, 52.1583],
  'leipzig|saxony': [12.3713, 51.3396],
  'leuven|flemish brabant': [4.7009, 50.8796],
  'lhasa|tibet': [91.1, 29.65],
  'lima|lima': [-77.0282, -12.0432],
  'limassol|limassol district': [33.0379, 34.6841],
  'limerick|munster': [-8.6231, 52.6647],
  'linz|upper austria': [14.2861, 48.3064],
  'lisbon|lisbon': [-9.1498, 38.7251],
  'liverpool|england': [-2.9779, 53.4106],
  'livingstone|southern province': [25.8543, -17.8419],
  'ljubljana|central slovenia': [14.5051, 46.0511],
  'lombok|west nusa tenggara': [116.351, -8.65],
  'london|england': [-0.1257, 51.5085],
  'los angeles|california': [-118.2437, 34.0522],
  'luang prabang|northern laos': [102.1525, 19.8933],
  'lucerne|central switzerland': [8.3064, 47.0505],
  'lusaka|lusaka province': [28.2871, -15.4067],
  'luxor|upper egypt': [32.6421, 25.6989],
  'lviv|western ukraine': [24.0232, 49.8383],
  'lyon|auvergne rhone alpes': [4.8479, 45.7491],
  'maastricht|limburg': [5.6889, 50.8483],
  'macau|macau': [113.5439, 22.1987],
  'machu picchu|cusco': [-72.5242, -13.1555],
  'madrid|community of madrid': [-3.7026, 40.4165],
  'makkah|makkah province': [39.8256, 21.4266],
  'malacca|malacca': [102.2405, 2.196],
  'malaga|andalusia': [-4.4203, 36.7202],
  'malmo|skane': [13.0007, 55.6059],
  'manaus|north': [-60.025, -3.1019],
  'manchester|england': [-2.2374, 53.4809],
  'mandalay|mandalay region': [96.0836, 21.9747],
  'manila|metro manila': [120.9822, 14.6042],
  'manuel antonio|puntarenas': [-84.155, 9.3923],
  'maputo|maputo province': [32.5832, -25.9655],
  'mar del plata|buenos aires province': [-57.5562, -38.0004],
  'maribor|styria': [15.6459, 46.5558],
  'marrakech|marrakesh safi': [-7.9999, 31.6342],
  'marseille|provence alpes cote d azur': [5.3811, 43.297],
  'maun|north west district': [23.4167, -19.9833],
  'medellin|antioquia': [-75.5715, 6.245],
  'medina|medina province': [39.6142, 24.4686],
  'meknes|fes meknes': [-5.5473, 33.8935],
  'melbourne|victoria': [144.9633, -37.814],
  'mendoza|mendoza': [-68.8458, -32.8895],
  'merida|yucatan': [-89.6232, 20.967],
  'meteora|thessaly': [21.6273, 39.7217],
  'mexico city|central mexico': [-99.1277, 19.4285],
  'miami|florida': [-80.1937, 25.7743],
  'milan|lombardy': [9.1895, 45.4643],
  'mombasa|coast': [39.6636, -4.0547],
  'montego bay|st james': [-77.9188, 18.4712],
  'monteverde|puntarenas': [-84.8255, 10.3009],
  'montevideo|montevideo': [-56.1882, -34.9033],
  'montpellier|occitanie': [3.8763, 43.6109],
  'montreal|quebec': [-73.5878, 45.5088],
  'morondava|menabe': [44.3178, -20.2887],
  'moscow|central russia': [37.6178, 55.752],
  'moshi|kilimanjaro': [37.3333, -3.35],
  'mostar|herzegovina': [17.8081, 43.3433],
  'mount hagen|western highlands': [144.2306, -5.8575],
  'mumbai|maharashtra': [72.8826, 19.0728],
  'munich|bavaria': [11.5755, 48.1374],
  'musanze|northern province': [29.635, -1.4998],
  'muscat|muscat governorate': [58.4078, 23.5841],
  'mykonos|cyclades': [25.3287, 37.4453],
  'nadi|viti levu': [177.4162, -17.8031],
  'nagoya|chubu': [136.9064, 35.1815],
  'naha|okinawa': [127.6785, 26.213],
  'nairobi|nairobi county': [36.8167, -1.2833],
  'nakuru|rift valley': [36.0722, -0.3072],
  'nantes|pays de la loire': [-1.5534, 47.2172],
  'naples|campania': [14.2681, 40.8522],
  'nara|kansai': [135.8048, 34.685],
  'nashville|tennessee': [-86.7844, 36.1659],
  'nassau|new providence': [-77.3431, 25.0582],
  'naxos|cyclades': [25.3764, 37.1056],
  'naypyidaw|naypyidaw union territory': [96.1297, 19.745],
  'nazareth|northern district': [35.2972, 32.7009],
  'negril|westmoreland': [-78.3481, 18.2684],
  'nelson|south island': [173.284, -41.2708],
  'new orleans|louisiana': [-90.0751, 29.9547],
  'new york|new york': [-74.006, 40.7143],
  'nha trang|south central coast': [109.1943, 12.2451],
  'niagara falls|ontario': [-79.0663, 43.1001],
  'nice|french riviera': [7.2661, 43.7031],
  'nicosia|nicosia district': [33.354, 35.1728],
  'nis|southern serbia': [21.9033, 43.3247],
  'nizwa|ad dakhiliyah': [57.5333, 22.9333],
  'nosy be|diana': [48.2667, -13.3333],
  'novi sad|vojvodina': [19.8369, 45.2517],
  'nuremberg|bavaria': [11.0775, 49.4542],
  'nuwara eliya|central province': [80.7829, 6.9708],
  'oaxaca|oaxaca': [-96.7254, 17.0602],
  'ocho rios|st ann': [-77.1031, 18.4076],
  'odense|funen': [10.3883, 55.3959],
  'odesa|black sea coast': [30.7438, 46.4857],
  'ohrid|southwestern region': [20.8017, 41.117],
  'okinawa|ryukyu islands': [127.8014, 26.3358],
  'oran|oran province': [-0.6359, 35.6991],
  'orlando|florida': [-81.3792, 28.5383],
  'osaka|kansai': [135.5011, 34.6938],
  'oslo|oslo': [10.7461, 59.9127],
  'ottawa|ontario': [-75.6981, 45.4112],
  'oxford|england': [-1.256, 51.7522],
  'pakse|champasak': [105.799, 15.1202],
  'palermo|sicily': [13.3636, 38.1166],
  'palma de mallorca|balearic islands': [2.6502, 39.5694],
  'pamukkale|aegean': [29.1173, 37.9164],
  'panama city|panama province': [-79.5197, 8.9936],
  'paphos|paphos district': [32.4245, 34.7768],
  'paracas|ica': [-76.2667, -13.8667],
  'paris|ile de france': [2.3488, 48.8534],
  'paro|paro': [89.4133, 27.4305],
  'patan|bagmati': [85.3142, 27.6766],
  'pattaya|eastern thailand': [100.8833, 12.9333],
  'pecs|southern transdanubia': [18.2281, 46.0762],
  'penang|penang': [100.3354, 5.4112],
  'perth|western australia': [115.8614, -31.9522],
  'peshawar|khyber pakhtunkhwa': [71.5785, 34.008],
  'petra|ma an governorate': [35.4789, 30.321],
  'philadelphia|pennsylvania': [-75.1636, 39.9524],
  'phnom penh|phnom penh': [104.916, 11.5625],
  'phuket|southern thailand': [98.3981, 7.8906],
  'piran|slovenian istria': [13.5706, 45.5278],
  'pisa|tuscany': [10.4036, 43.7085],
  'placencia|stann creek': [-88.3665, 16.5142],
  'playa del carmen|quintana roo': [-87.0799, 20.6274],
  'plovdiv|thrace': [24.75, 42.1539],
  'podgorica|central montenegro': [19.2631, 42.4412],
  'pokhara|gandaki': [83.9685, 28.2669],
  'ponce|ponce': [-66.624, 18.0103],
  'port antonio|portland': [-76.4522, 18.1789],
  'port elizabeth|eastern cape': [25.6149, -33.9611],
  'port moresby|national capital district': [147.1509, -9.4772],
  'portland|oregon': [-122.6762, 45.5234],
  'porto|norte': [-8.611, 41.1485],
  'porvoo|uusimaa': [25.6651, 60.3923],
  'postojna|karst': [14.2153, 45.7743],
  'poznan|greater poland': [16.9299, 52.4069],
  'prague|prague': [14.4208, 50.088],
  'pretoria|gauteng': [28.1878, -25.7449],
  'puebla|puebla': [-98.2072, 19.0478],
  'puerto iguazu|misiones': [-54.5735, -25.5991],
  'puerto plata|puerto plata': [-70.6884, 19.7934],
  'puerto vallarta|jalisco': [-105.2302, 20.617],
  'puerto varas|los lagos': [-72.9854, -41.3195],
  'pula|istria': [13.8481, 44.8683],
  'punakha|punakha': [89.8774, 27.5914],
  'puno|lake titicaca': [-70.022, -15.84],
  'punta arenas|magallanes': [-70.9092, -53.1628],
  'punta cana|la altagracia': [-68.4043, 18.5818],
  'punta del este|maldonado': [-54.9338, -34.9475],
  'quebec city|quebec': [-71.2145, 46.8123],
  'queenstown|south island': [168.6627, -45.0302],
  'quito|pichincha': [-78.525, -0.2298],
  'rabat|rabat sale kenitra': [-6.8326, 34.0132],
  'recife|northeast': [-34.8811, -8.0539],
  'reykjavik|capital region': [-21.8954, 64.1355],
  'rhodes|dodecanese': [28.222, 36.4356],
  'rincon|western puerto rico': [-67.2499, 18.3402],
  'rio de janeiro|southeast': [-43.1822, -22.9064],
  'rishikesh|uttarakhand': [78.2926, 30.1078],
  'riyadh|riyadh province': [46.7219, 24.6877],
  'rome|lazio': [12.5113, 41.8919],
  'roskilde|zealand': [12.0803, 55.6415],
  'rotorua|north island': [176.2452, -38.1387],
  'rotterdam|south holland': [4.4792, 51.9225],
  'rovaniemi|lapland': [25.6887, 66.499],
  'rovinj|istria': [13.6346, 45.0827],
  'saint louis|saint louis region': [-16.4896, 16.0179],
  'saint petersburg|northwestern russia': [30.3141, 59.9386],
  'salalah|dhofar': [54.0924, 17.015],
  'salento|coffee region': [-75.5703, 4.6375],
  'salta|northwest argentina': [-65.42, -24.8065],
  'salvador|northeast': [-38.491, -12.9756],
  'saly|thies region': [-17.0194, 14.4411],
  'salzburg|salzburg': [13.044, 47.7994],
  'samana|samana': [-69.3341, 19.204],
  'samarkand|samarkand': [66.9644, 39.6546],
  'san andres|caribbean region': [-81.6997, 12.5786],
  'san blas|guna yala': [-78.82, 9.57],
  'san diego|california': [-117.1647, 32.7157],
  'san francisco|california': [-122.4194, 37.7749],
  'san jose|central valley': [-84.0849, 9.9339],
  'san juan|san juan': [-66.1057, 18.4663],
  'san miguel de allende|guanajuato': [-100.7439, 20.9153],
  'san pedro de atacama|antofagasta': [-68.2011, -22.9111],
  'san pedro|ambergris caye': [-87.9659, 17.916],
  'san sebastian|basque country': [-1.975, 43.3128],
  'santa cruz|santa cruz': [-63.1812, -17.7863],
  'santa marta|caribbean region': [-74.1943, 11.2386],
  'santiago de cuba|santiago de cuba': [-75.8217, 20.0229],
  'santiago|santiago metropolitan': [-70.6483, -33.4569],
  'santo domingo|distrito nacional': [-69.8923, 18.4719],
  'santorini|cyclades': [25.4615, 36.3932],
  'sao paulo|southeast': [-46.6361, -23.5475],
  'sapa|northern vietnam': [103.8441, 22.3402],
  'sapporo|hokkaido': [141.35, 43.0667],
  'sarajevo|sarajevo canton': [18.3564, 43.8486],
  'saranda|albanian riviera': [20.0048, 39.8753],
  'savannah|georgia': [-81.0998, 32.0835],
  'savusavu|vanua levu': [179.3356, -16.7794],
  'seattle|washington': [-122.3321, 47.6062],
  'seminyak|bali': [115.1682, -8.6913],
  'seoul|capital area': [126.9784, 37.566],
  'sevan|gegharkunik': [44.9531, 40.548],
  'seville|andalusia': [-5.9732, 37.3828],
  'shanghai|shanghai': [121.4581, 31.2222],
  'sharjah|sharjah': [55.4122, 25.3342],
  'sharm el sheikh|south sinai': [34.3299, 27.9158],
  'sheki|sheki zagatala': [47.1706, 41.1919],
  'shenzhen|guangdong': [114.0683, 22.5455],
  'shiraz|fars': [52.5311, 29.6103],
  'shkoder|shkoder county': [19.5126, 42.0683],
  'shymkent|southern kazakhstan': [69.6004, 42.3099],
  'sibiu|transylvania': [24.15, 45.8],
  'siem reap|northwestern cambodia': [103.8606, 13.3618],
  'siena|tuscany': [11.3306, 43.3182],
  'sighisoara|transylvania': [24.7928, 46.2214],
  'sighnaghi|kakheti': [45.9223, 41.6192],
  'sigiriya|central province': [80.7504, 7.9495],
  'sihanoukville|coast': [103.5296, 10.6093],
  'sintra|lisbon district': [-9.3783, 38.801],
  'siwa oasis|western desert': [25.5196, 29.2032],
  'skopje|skopje region': [21.4314, 41.9965],
  'sochi|black sea coast': [39.7248, 43.597],
  'sofia|sofia': [23.3241, 42.6975],
  'sokcho|gangwon': [128.5918, 38.207],
  'sorrento|campania': [14.3777, 40.6268],
  'sossusvlei|namib desert': [15.29, -24.75],
  'sousse|sousse governorate': [10.637, 35.8254],
  'south luangwa|eastern province': [31.75, -13.1],
  'split|dalmatia': [16.4392, 43.5089],
  'stavanger|rogaland': [5.7333, 58.9701],
  'stellenbosch|western cape': [18.8668, -33.9346],
  'stockholm|stockholm': [18.0687, 59.3294],
  'stone town|zanzibar': [39.1921, -6.1622],
  'strasbourg|grand est': [7.7455, 48.5839],
  'stuttgart|baden wurttemberg': [9.177, 48.7823],
  'subotica|vojvodina': [19.6667, 46.1],
  'sucre|chuquisaca': [-65.2627, -19.0333],
  'sukhothai|northern thailand': [99.823, 17.0078],
  'sur|ash sharqiyah': [59.5289, 22.5667],
  'surabaya|java': [112.7508, -7.2492],
  'suva|viti levu': [178.4253, -18.1368],
  'suwon|gyeonggi': [127.0089, 37.2911],
  'suzhou|jiangsu': [120.5954, 31.3041],
  'swakopmund|erongo': [14.5266, -22.6784],
  'sydney|new south wales': [151.2073, -33.8678],
  'sylhet|sylhet division': [91.872, 24.899],
  'szentendre|pest county': [19.0756, 47.6694],
  'taichung|central taiwan': [120.6839, 24.1469],
  'tainan|southern taiwan': [120.2133, 22.9908],
  'taipei|northern taiwan': [121.5264, 25.0531],
  'tamale|northern region': [-0.8393, 9.4008],
  'tamarindo|guanacaste': [-85.8411, 10.2991],
  'tampere|pirkanmaa': [23.7871, 61.4991],
  'tangier|tangier tetouan al hoceima': [-5.7998, 35.7673],
  'tashkent|tashkent': [69.2163, 41.2647],
  'taupo|north island': [176.0833, -38.6833],
  'tbilisi|tbilisi': [44.8341, 41.6914],
  'tehran|tehran': [51.4215, 35.6944],
  'tel aviv|tel aviv district': [34.7806, 32.0809],
  'the hague|south holland': [4.2986, 52.0767],
  'thessaloniki|central macedonia': [22.9349, 40.6407],
  'thimphu|thimphu': [89.6419, 27.4661],
  'tikal|peten': [-89.6237, 17.222],
  'tirana|tirana county': [19.8187, 41.3274],
  'tlemcen|tlemcen province': [-1.315, 34.8783],
  'toamasina|atsinanana': [49.4023, -18.1492],
  'tofo|inhambane': [35.5481, -23.8538],
  'tokyo|kanto': [139.6917, 35.6895],
  'toledo|castile la mancha': [-4.0226, 39.8581],
  'toronto|ontario': [-79.3986, 43.7064],
  'torres del paine|magallanes': [-72.985, -50.9423],
  'toulouse|occitanie': [1.4437, 43.6043],
  'trinidad|sancti spiritus': [-79.9847, 21.8022],
  'tripoli|north governorate': [35.8441, 34.4335],
  'tromso|northern norway': [18.9551, 69.6489],
  'trondheim|trondelag': [10.3951, 63.4305],
  'tulum|quintana roo': [-87.4633, 20.2117],
  'tunis|tunis governorate': [10.1658, 36.819],
  'turin|piedmont': [7.6868, 45.0705],
  'turkistan|turkistan region': [68.2569, 43.2946],
  'turku|southwest finland': [22.2687, 60.4515],
  'tyre|south governorate': [35.1939, 33.2733],
  'ubud|bali': [115.2654, -8.5098],
  'udaipur|rajasthan': [73.7135, 24.5858],
  'ulaanbaatar|ulaanbaatar': [106.8832, 47.9077],
  'uppsala|uppsala': [17.6389, 59.8588],
  'ushuaia|tierra del fuego': [-68.3159, -54.8108],
  'utrecht|utrecht': [5.1222, 52.0908],
  'uyuni|potosi': [-66.825, -20.4597],
  'valencia|valencian community': [-0.3797, 39.4739],
  'valparaiso|valparaiso': [-71.6296, -33.036],
  'vancouver|british columbia': [-123.1193, 49.2497],
  'vang vieng|vientiane province': [102.4478, 18.9235],
  'varadero|matanzas': [-81.2444, 23.1568],
  'varanasi|uttar pradesh': [83.0104, 25.3167],
  'varna|black sea coast': [27.9102, 43.2191],
  'veliko tarnovo|northern bulgaria': [25.629, 43.0812],
  'venice|veneto': [12.3326, 45.4371],
  'verona|veneto': [10.9938, 45.4385],
  'victoria falls|matabeleland north': [25.8307, -17.9328],
  'victoria|british columbia': [-123.3516, 48.4359],
  'vienna|vienna': [16.3721, 48.2085],
  'vientiane|vientiane prefecture': [102.6, 17.9667],
  'vieques|vieques': [-65.4427, 18.1491],
  'vik|south iceland': [-19.006, 63.419],
  'vilanculos|inhambane': [35.3167, -22],
  'villa de leyva|boyaca': [-73.5244, 5.6341],
  'vinales|pinar del rio': [-83.7069, 22.6189],
  'visby|gotland': [18.296, 57.6409],
  'vladivostok|russian far east': [131.8735, 43.1056],
  'wadi rum|aqaba governorate': [35.4194, 29.5743],
  'walvis bay|erongo': [14.5053, -22.9575],
  'wanaka|south island': [169.15, -44.7],
  'warsaw|masovian': [21.0118, 52.2298],
  'washington dc|district of columbia': [-77.0364, 38.8951],
  'wellington|north island': [174.7756, -41.2866],
  'whistler|british columbia': [-122.954, 50.1182],
  'windhoek|khomas': [17.0832, -22.5594],
  'wroclaw|lower silesian': [17.0301, 51.1029],
  'xi an|shaanxi': [108.9286, 34.2583],
  'yangon|yangon region': [96.1561, 16.8053],
  'yazd|yazd': [54.3675, 31.8972],
  'yerevan|yerevan': [44.5126, 40.1776],
  'yogyakarta|java': [110.3647, -7.8014],
  'yokohama|kanto': [139.65, 35.4333],
  'york|england': [-1.0827, 53.9576],
  'zabljak|durmitor': [19.1232, 43.1542],
  'zadar|dalmatia': [15.2251, 44.1158],
  'zagreb|zagreb': [15.978, 45.8144],
  'zakopane|lesser poland': [19.9489, 49.299],
  'zanzibar city|zanzibar': [39.1979, -6.1639],
  'zermatt|valais': [7.7486, 46.02],
  'ziguinchor|casamance': [-16.2733, 12.568],
  'zurich|zurich': [8.55, 47.3667],
};

function cityOption(id: string, name: string, region: string): CityOption {
  return {
    id,
    name,
    region,
    coordinates: getCityCoordinates(id, name, region),
  };
}

function cityOptions(prefix: string, cities: CityOptionSeed[]) {
  return cities.map(([slug, name, region]) => cityOption(`${prefix}-${slug}`, name, region));
}

function countryCityOptionEntries(prefix: string, countryKeys: string[], cities: CityOptionSeed[]) {
  const options = cityOptions(prefix, cities);

  return countryKeys.map((countryKey): [string, CityOption[]] => [normalizeCityName(countryKey), options]);
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

const popularCountryCityOptionsLookup: Record<string, CityOption[]> = Object.fromEntries([
  ...countryCityOptionEntries('us-plus', ['840', 'US', 'USA', 'United States', 'United States of America'], [
    ['orlando', 'Orlando', 'Florida'],
    ['las-vegas', 'Las Vegas', 'Nevada'],
    ['honolulu', 'Honolulu', 'Hawaii'],
    ['san-diego', 'San Diego', 'California'],
    ['austin', 'Austin', 'Texas'],
    ['houston', 'Houston', 'Texas'],
    ['philadelphia', 'Philadelphia', 'Pennsylvania'],
    ['charleston', 'Charleston', 'South Carolina'],
    ['savannah', 'Savannah', 'Georgia'],
    ['denver', 'Denver', 'Colorado'],
    ['portland', 'Portland', 'Oregon'],
  ]),
  ...countryCityOptionEntries('fr-plus', ['250', 'FR', 'France'], [
    ['cannes', 'Cannes', 'French Riviera'],
    ['montpellier', 'Montpellier', 'Occitanie'],
    ['avignon', 'Avignon', 'Provence'],
    ['annecy', 'Annecy', 'Auvergne-Rhone-Alpes'],
    ['chamonix', 'Chamonix', 'Auvergne-Rhone-Alpes'],
    ['nantes', 'Nantes', 'Pays de la Loire'],
  ]),
  ...countryCityOptionEntries('jp-plus', ['392', 'JP', 'Japan'], [
    ['fukuoka', 'Fukuoka', 'Kyushu'],
    ['kanazawa', 'Kanazawa', 'Chubu'],
    ['okinawa', 'Okinawa', 'Ryukyu Islands'],
    ['kobe', 'Kobe', 'Kansai'],
    ['nagoya', 'Nagoya', 'Chubu'],
    ['naha', 'Naha', 'Okinawa'],
  ]),
  ...countryCityOptionEntries('br-plus', ['076', 'BR', 'Brazil'], [
    ['florianopolis', 'Florianopolis', 'South'],
    ['foz-do-iguacu', 'Foz do Iguacu', 'South'],
    ['fortaleza', 'Fortaleza', 'Northeast'],
    ['belem', 'Belem', 'North'],
    ['curitiba', 'Curitiba', 'South'],
  ]),
  ...countryCityOptionEntries('it-plus', ['380', 'IT', 'Italy'], [
    ['verona', 'Verona', 'Veneto'],
    ['pisa', 'Pisa', 'Tuscany'],
    ['siena', 'Siena', 'Tuscany'],
    ['amalfi', 'Amalfi', 'Campania'],
    ['palermo', 'Palermo', 'Sicily'],
    ['cinque-terre', 'Cinque Terre', 'Liguria'],
    ['turin', 'Turin', 'Piedmont'],
    ['sorrento', 'Sorrento', 'Campania'],
  ]),
  ...countryCityOptionEntries('au-plus', ['036', 'AU', 'Australia'], [
    ['gold-coast', 'Gold Coast', 'Queensland'],
    ['cairns', 'Cairns', 'Queensland'],
    ['darwin', 'Darwin', 'Northern Territory'],
    ['canberra', 'Canberra', 'Australian Capital Territory'],
    ['byron-bay', 'Byron Bay', 'New South Wales'],
    ['alice-springs', 'Alice Springs', 'Northern Territory'],
  ]),
  ...countryCityOptionEntries('ca-plus', ['124', 'CA', 'Canada'], [
    ['banff', 'Banff', 'Alberta'],
    ['victoria', 'Victoria', 'British Columbia'],
    ['niagara-falls', 'Niagara Falls', 'Ontario'],
    ['halifax', 'Halifax', 'Nova Scotia'],
    ['whistler', 'Whistler', 'British Columbia'],
    ['jasper', 'Jasper', 'Alberta'],
  ]),
  ...countryCityOptionEntries('mx-plus', ['484', 'MX', 'Mexico'], [
    ['tulum', 'Tulum', 'Quintana Roo'],
    ['playa-del-carmen', 'Playa del Carmen', 'Quintana Roo'],
    ['puerto-vallarta', 'Puerto Vallarta', 'Jalisco'],
    ['san-miguel-de-allende', 'San Miguel de Allende', 'Guanajuato'],
    ['puebla', 'Puebla', 'Puebla'],
  ]),
  ...countryCityOptionEntries('th-plus', ['764', 'TH', 'Thailand'], [
    ['krabi', 'Krabi', 'Southern Thailand'],
    ['koh-samui', 'Koh Samui', 'Southern Thailand'],
    ['pattaya', 'Pattaya', 'Eastern Thailand'],
    ['chiang-rai', 'Chiang Rai', 'Northern Thailand'],
    ['sukhothai', 'Sukhothai', 'Northern Thailand'],
  ]),
  ...countryCityOptionEntries('gb-plus', ['826', 'GB', 'UK', 'United Kingdom', 'Great Britain'], [
    ['york', 'York', 'England'],
    ['cambridge', 'Cambridge', 'England'],
    ['oxford', 'Oxford', 'England'],
    ['glasgow', 'Glasgow', 'Scotland'],
    ['belfast', 'Belfast', 'Northern Ireland'],
    ['cardiff', 'Cardiff', 'Wales'],
    ['brighton', 'Brighton', 'England'],
    ['inverness', 'Inverness', 'Scotland'],
  ]),
  ...countryCityOptionEntries('es-plus', ['724', 'ES', 'Spain'], [
    ['malaga', 'Malaga', 'Andalusia'],
    ['bilbao', 'Bilbao', 'Basque Country'],
    ['san-sebastian', 'San Sebastian', 'Basque Country'],
    ['cordoba', 'Cordoba', 'Andalusia'],
    ['toledo', 'Toledo', 'Castile-La Mancha'],
    ['ibiza', 'Ibiza', 'Balearic Islands'],
    ['palma-de-mallorca', 'Palma de Mallorca', 'Balearic Islands'],
  ]),
  ...countryCityOptionEntries('de-plus', ['276', 'DE', 'Germany'], [
    ['heidelberg', 'Heidelberg', 'Baden-Wurttemberg'],
    ['dresden', 'Dresden', 'Saxony'],
    ['nuremberg', 'Nuremberg', 'Bavaria'],
    ['leipzig', 'Leipzig', 'Saxony'],
    ['dusseldorf', 'Dusseldorf', 'North Rhine-Westphalia'],
    ['stuttgart', 'Stuttgart', 'Baden-Wurttemberg'],
  ]),
  ...countryCityOptionEntries('cn-plus', ['156', 'CN', 'China'], [
    ['guangzhou', 'Guangzhou', 'Guangdong'],
    ['shenzhen', 'Shenzhen', 'Guangdong'],
    ['hangzhou', 'Hangzhou', 'Zhejiang'],
    ['guilin', 'Guilin', 'Guangxi'],
    ['suzhou', 'Suzhou', 'Jiangsu'],
    ['lhasa', 'Lhasa', 'Tibet'],
    ['macau', 'Macau', 'Macau'],
  ]),
  ...countryCityOptionEntries('in-plus', ['356', 'IN', 'India'], [
    ['agra', 'Agra', 'Uttar Pradesh'],
    ['goa', 'Goa', 'Goa'],
    ['udaipur', 'Udaipur', 'Rajasthan'],
    ['jodhpur', 'Jodhpur', 'Rajasthan'],
    ['kolkata', 'Kolkata', 'West Bengal'],
    ['chennai', 'Chennai', 'Tamil Nadu'],
    ['kochi', 'Kochi', 'Kerala'],
    ['rishikesh', 'Rishikesh', 'Uttarakhand'],
  ]),
  ...countryCityOptionEntries('id-plus', ['360', 'ID', 'Indonesia'], [
    ['bandung', 'Bandung', 'Java'],
    ['surabaya', 'Surabaya', 'Java'],
    ['lombok', 'Lombok', 'West Nusa Tenggara'],
    ['labuan-bajo', 'Labuan Bajo', 'East Nusa Tenggara'],
    ['seminyak', 'Seminyak', 'Bali'],
    ['canggu', 'Canggu', 'Bali'],
  ]),
  ...countryCityOptionEntries('tr-plus', ['792', 'TR', 'Turkey', 'Turkiye'], [
    ['pamukkale', 'Pamukkale', 'Aegean'],
    ['bodrum', 'Bodrum', 'Aegean'],
    ['bursa', 'Bursa', 'Marmara'],
    ['konya', 'Konya', 'Central Anatolia'],
    ['fethiye', 'Fethiye', 'Mediterranean'],
    ['ephesus', 'Ephesus', 'Aegean'],
  ]),
  ...countryCityOptionEntries('ma-plus', ['504', 'MA', 'Morocco'], [
    ['chefchaouen', 'Chefchaouen', 'Tangier-Tetouan-Al Hoceima'],
    ['essaouira', 'Essaouira', 'Marrakesh-Safi'],
    ['tangier', 'Tangier', 'Tangier-Tetouan-Al Hoceima'],
    ['agadir', 'Agadir', 'Souss-Massa'],
    ['meknes', 'Meknes', 'Fes-Meknes'],
  ]),
  ...countryCityOptionEntries('za-plus', ['710', 'ZA', 'South Africa'], [
    ['stellenbosch', 'Stellenbosch', 'Western Cape'],
    ['kruger', 'Kruger National Park', 'Mpumalanga'],
    ['port-elizabeth', 'Port Elizabeth', 'Eastern Cape'],
    ['knysna', 'Knysna', 'Western Cape'],
    ['hermanus', 'Hermanus', 'Western Cape'],
  ]),
  ...countryCityOptionEntries('ar-plus', ['032', 'AR', 'Argentina'], [
    ['bariloche', 'Bariloche', 'Patagonia'],
    ['el-calafate', 'El Calafate', 'Patagonia'],
    ['salta', 'Salta', 'Northwest Argentina'],
    ['puerto-iguazu', 'Puerto Iguazu', 'Misiones'],
    ['mar-del-plata', 'Mar del Plata', 'Buenos Aires Province'],
  ]),
  ...countryCityOptionEntries('cl-plus', ['152', 'CL', 'Chile'], [
    ['puerto-varas', 'Puerto Varas', 'Los Lagos'],
    ['easter-island', 'Easter Island', 'Valparaiso'],
    ['torres-del-paine', 'Torres del Paine', 'Magallanes'],
    ['la-serena', 'La Serena', 'Coquimbo'],
  ]),
  ...countryCityOptionEntries('pe-plus', ['604', 'PE', 'Peru'], [
    ['puno', 'Puno', 'Lake Titicaca'],
    ['iquitos', 'Iquitos', 'Amazonas'],
    ['paracas', 'Paracas', 'Ica'],
    ['huaraz', 'Huaraz', 'Ancash'],
    ['machu-picchu', 'Machu Picchu', 'Cusco'],
  ]),
  ...countryCityOptionEntries('co-plus', ['170', 'CO', 'Colombia'], [
    ['santa-marta', 'Santa Marta', 'Caribbean Region'],
    ['cali', 'Cali', 'Valle del Cauca'],
    ['salento', 'Salento', 'Coffee Region'],
    ['san-andres', 'San Andres', 'Caribbean Region'],
    ['villa-de-leyva', 'Villa de Leyva', 'Boyaca'],
  ]),
  ...countryCityOptionEntries('nz-plus', ['554', 'NZ', 'New Zealand'], [
    ['rotorua', 'Rotorua', 'North Island'],
    ['taupo', 'Taupo', 'North Island'],
    ['wanaka', 'Wanaka', 'South Island'],
    ['dunedin', 'Dunedin', 'South Island'],
    ['nelson', 'Nelson', 'South Island'],
  ]),
  ...countryCityOptionEntries('eg-plus', ['818', 'EG', 'Egypt'], [
    ['giza', 'Giza', 'Giza Governorate'],
    ['hurghada', 'Hurghada', 'Red Sea'],
    ['sharm-el-sheikh', 'Sharm el Sheikh', 'South Sinai'],
    ['dahab', 'Dahab', 'South Sinai'],
    ['siwa-oasis', 'Siwa Oasis', 'Western Desert'],
  ]),
  ...countryCityOptionEntries('gr-plus', ['300', 'GR', 'Greece'], [
    ['mykonos', 'Mykonos', 'Cyclades'],
    ['rhodes', 'Rhodes', 'Dodecanese'],
    ['chania', 'Chania', 'Crete'],
    ['delphi', 'Delphi', 'Central Greece'],
    ['meteora', 'Meteora', 'Thessaly'],
    ['corfu', 'Corfu', 'Ionian Islands'],
    ['naxos', 'Naxos', 'Cyclades'],
  ]),
  ...countryCityOptionEntries('pt-plus', ['620', 'PT', 'Portugal'], [
    ['lagos', 'Lagos', 'Algarve'],
    ['sintra', 'Sintra', 'Lisbon District'],
    ['braga', 'Braga', 'Norte'],
    ['funchal', 'Funchal', 'Madeira'],
    ['evora', 'Evora', 'Alentejo'],
    ['cascais', 'Cascais', 'Lisbon District'],
  ]),
  ...countryCityOptionEntries('nl-plus', ['528', 'NL', 'Netherlands'], [
    ['haarlem', 'Haarlem', 'North Holland'],
    ['maastricht', 'Maastricht', 'Limburg'],
    ['delft', 'Delft', 'South Holland'],
    ['leiden', 'Leiden', 'South Holland'],
    ['groningen', 'Groningen', 'Groningen'],
  ]),
  ...countryCityOptionEntries('kr-plus', ['410', 'KR', 'South Korea', 'Korea'], [
    ['gyeongju', 'Gyeongju', 'North Gyeongsang'],
    ['incheon', 'Incheon', 'Capital Area'],
    ['daegu', 'Daegu', 'Yeongnam'],
    ['jeonju', 'Jeonju', 'North Jeolla'],
    ['sokcho', 'Sokcho', 'Gangwon'],
  ]),
  ...countryCityOptionEntries('at', ['040', 'AT', 'Austria'], [
    ['vienna', 'Vienna', 'Vienna'],
    ['salzburg', 'Salzburg', 'Salzburg'],
    ['innsbruck', 'Innsbruck', 'Tyrol'],
    ['graz', 'Graz', 'Styria'],
    ['hallstatt', 'Hallstatt', 'Upper Austria'],
    ['linz', 'Linz', 'Upper Austria'],
  ]),
  ...countryCityOptionEntries('be', ['056', 'BE', 'Belgium'], [
    ['brussels', 'Brussels', 'Brussels'],
    ['bruges', 'Bruges', 'West Flanders'],
    ['ghent', 'Ghent', 'East Flanders'],
    ['antwerp', 'Antwerp', 'Antwerp'],
    ['leuven', 'Leuven', 'Flemish Brabant'],
    ['dinant', 'Dinant', 'Wallonia'],
  ]),
  ...countryCityOptionEntries('ch', ['756', 'CH', 'Switzerland'], [
    ['zurich', 'Zurich', 'Zurich'],
    ['geneva', 'Geneva', 'Geneva'],
    ['lucerne', 'Lucerne', 'Central Switzerland'],
    ['interlaken', 'Interlaken', 'Bernese Oberland'],
    ['bern', 'Bern', 'Bern'],
    ['zermatt', 'Zermatt', 'Valais'],
    ['lausanne', 'Lausanne', 'Vaud'],
  ]),
  ...countryCityOptionEntries('dk', ['208', 'DK', 'Denmark'], [
    ['copenhagen', 'Copenhagen', 'Capital Region'],
    ['aarhus', 'Aarhus', 'Central Denmark'],
    ['odense', 'Odense', 'Funen'],
    ['aalborg', 'Aalborg', 'North Jutland'],
    ['roskilde', 'Roskilde', 'Zealand'],
  ]),
  ...countryCityOptionEntries('cz', ['203', 'CZ', 'Czechia', 'Czech Republic'], [
    ['prague', 'Prague', 'Prague'],
    ['cesky-krumlov', 'Cesky Krumlov', 'South Bohemia'],
    ['karlovy-vary', 'Karlovy Vary', 'Karlovy Vary'],
    ['brno', 'Brno', 'South Moravia'],
    ['kutna-hora', 'Kutna Hora', 'Central Bohemia'],
  ]),
  ...countryCityOptionEntries('pl', ['616', 'PL', 'Poland'], [
    ['warsaw', 'Warsaw', 'Masovian'],
    ['krakow', 'Krakow', 'Lesser Poland'],
    ['gdansk', 'Gdansk', 'Pomeranian'],
    ['wroclaw', 'Wroclaw', 'Lower Silesian'],
    ['zakopane', 'Zakopane', 'Lesser Poland'],
    ['poznan', 'Poznan', 'Greater Poland'],
  ]),
  ...countryCityOptionEntries('se', ['752', 'SE', 'Sweden'], [
    ['stockholm', 'Stockholm', 'Stockholm'],
    ['gothenburg', 'Gothenburg', 'Vastra Gotaland'],
    ['malmo', 'Malmo', 'Skane'],
    ['uppsala', 'Uppsala', 'Uppsala'],
    ['kiruna', 'Kiruna', 'Lapland'],
    ['visby', 'Visby', 'Gotland'],
  ]),
  ...countryCityOptionEntries('no', ['578', 'NO', 'Norway'], [
    ['oslo', 'Oslo', 'Oslo'],
    ['bergen', 'Bergen', 'Vestland'],
    ['tromso', 'Tromso', 'Northern Norway'],
    ['trondheim', 'Trondheim', 'Trondelag'],
    ['stavanger', 'Stavanger', 'Rogaland'],
    ['alesund', 'Alesund', 'More og Romsdal'],
  ]),
  ...countryCityOptionEntries('fi', ['246', 'FI', 'Finland'], [
    ['helsinki', 'Helsinki', 'Uusimaa'],
    ['rovaniemi', 'Rovaniemi', 'Lapland'],
    ['turku', 'Turku', 'Southwest Finland'],
    ['tampere', 'Tampere', 'Pirkanmaa'],
    ['porvoo', 'Porvoo', 'Uusimaa'],
  ]),
  ...countryCityOptionEntries('ie', ['372', 'IE', 'Ireland'], [
    ['dublin', 'Dublin', 'Leinster'],
    ['galway', 'Galway', 'Connacht'],
    ['cork', 'Cork', 'Munster'],
    ['killarney', 'Killarney', 'County Kerry'],
    ['limerick', 'Limerick', 'Munster'],
    ['kilkenny', 'Kilkenny', 'Leinster'],
  ]),
  ...countryCityOptionEntries('hr', ['191', 'HR', 'Croatia'], [
    ['dubrovnik', 'Dubrovnik', 'Dalmatia'],
    ['split', 'Split', 'Dalmatia'],
    ['zagreb', 'Zagreb', 'Zagreb'],
    ['zadar', 'Zadar', 'Dalmatia'],
    ['hvar', 'Hvar', 'Dalmatia'],
    ['rovinj', 'Rovinj', 'Istria'],
    ['pula', 'Pula', 'Istria'],
  ]),
  ...countryCityOptionEntries('hu', ['348', 'HU', 'Hungary'], [
    ['budapest', 'Budapest', 'Central Hungary'],
    ['eger', 'Eger', 'Northern Hungary'],
    ['debrecen', 'Debrecen', 'Northern Great Plain'],
    ['pecs', 'Pecs', 'Southern Transdanubia'],
    ['szentendre', 'Szentendre', 'Pest County'],
    ['lake-balaton', 'Lake Balaton', 'Transdanubia'],
  ]),
  ...countryCityOptionEntries('ro', ['642', 'RO', 'Romania'], [
    ['bucharest', 'Bucharest', 'Bucharest'],
    ['brasov', 'Brasov', 'Transylvania'],
    ['sibiu', 'Sibiu', 'Transylvania'],
    ['cluj-napoca', 'Cluj-Napoca', 'Transylvania'],
    ['sighisoara', 'Sighisoara', 'Transylvania'],
  ]),
  ...countryCityOptionEntries('bg', ['100', 'BG', 'Bulgaria'], [
    ['sofia', 'Sofia', 'Sofia'],
    ['plovdiv', 'Plovdiv', 'Thrace'],
    ['varna', 'Varna', 'Black Sea Coast'],
    ['burgas', 'Burgas', 'Black Sea Coast'],
    ['veliko-tarnovo', 'Veliko Tarnovo', 'Northern Bulgaria'],
  ]),
  ...countryCityOptionEntries('rs', ['688', 'RS', 'Serbia'], [
    ['belgrade', 'Belgrade', 'Belgrade'],
    ['novi-sad', 'Novi Sad', 'Vojvodina'],
    ['nis', 'Nis', 'Southern Serbia'],
    ['subotica', 'Subotica', 'Vojvodina'],
  ]),
  ...countryCityOptionEntries('me', ['499', 'ME', 'Montenegro'], [
    ['kotor', 'Kotor', 'Bay of Kotor'],
    ['budva', 'Budva', 'Adriatic Coast'],
    ['podgorica', 'Podgorica', 'Central Montenegro'],
    ['zabljak', 'Zabljak', 'Durmitor'],
    ['cetinje', 'Cetinje', 'Old Royal Capital'],
  ]),
  ...countryCityOptionEntries('ba', ['070', 'BA', 'Bosnia and Herzegovina', 'Bosnia and Herz.'], [
    ['sarajevo', 'Sarajevo', 'Sarajevo Canton'],
    ['mostar', 'Mostar', 'Herzegovina'],
    ['banja-luka', 'Banja Luka', 'Republika Srpska'],
    ['jajce', 'Jajce', 'Central Bosnia'],
  ]),
  ...countryCityOptionEntries('si', ['705', 'SI', 'Slovenia'], [
    ['ljubljana', 'Ljubljana', 'Central Slovenia'],
    ['bled', 'Bled', 'Upper Carniola'],
    ['piran', 'Piran', 'Slovenian Istria'],
    ['maribor', 'Maribor', 'Styria'],
    ['postojna', 'Postojna', 'Karst'],
  ]),
  ...countryCityOptionEntries('al', ['008', 'AL', 'Albania'], [
    ['tirana', 'Tirana', 'Tirana County'],
    ['berat', 'Berat', 'Berat County'],
    ['gjirokaster', 'Gjirokaster', 'Gjirokaster County'],
    ['saranda', 'Saranda', 'Albanian Riviera'],
    ['shkoder', 'Shkoder', 'Shkoder County'],
  ]),
  ...countryCityOptionEntries('mk', ['807', 'MK', 'Macedonia', 'North Macedonia'], [
    ['skopje', 'Skopje', 'Skopje Region'],
    ['ohrid', 'Ohrid', 'Southwestern Region'],
    ['bitola', 'Bitola', 'Pelagonia'],
  ]),
  ...countryCityOptionEntries('cy', ['196', 'CY', 'Cyprus'], [
    ['nicosia', 'Nicosia', 'Nicosia District'],
    ['limassol', 'Limassol', 'Limassol District'],
    ['paphos', 'Paphos', 'Paphos District'],
    ['larnaca', 'Larnaca', 'Larnaca District'],
    ['ayia-napa', 'Ayia Napa', 'Famagusta District'],
  ]),
  ...countryCityOptionEntries('ru', ['643', 'RU', 'Russia'], [
    ['moscow', 'Moscow', 'Central Russia'],
    ['saint-petersburg', 'Saint Petersburg', 'Northwestern Russia'],
    ['kazan', 'Kazan', 'Tatarstan'],
    ['sochi', 'Sochi', 'Black Sea Coast'],
    ['vladivostok', 'Vladivostok', 'Russian Far East'],
  ]),
  ...countryCityOptionEntries('ua', ['804', 'UA', 'Ukraine'], [
    ['kyiv', 'Kyiv', 'Kyiv'],
    ['lviv', 'Lviv', 'Western Ukraine'],
    ['odesa', 'Odesa', 'Black Sea Coast'],
    ['kharkiv', 'Kharkiv', 'Eastern Ukraine'],
    ['chernivtsi', 'Chernivtsi', 'Bukovina'],
  ]),
  ...countryCityOptionEntries('cr', ['188', 'CR', 'Costa Rica'], [
    ['san-jose', 'San Jose', 'Central Valley'],
    ['la-fortuna', 'La Fortuna', 'Alajuela'],
    ['monteverde', 'Monteverde', 'Puntarenas'],
    ['tamarindo', 'Tamarindo', 'Guanacaste'],
    ['manuel-antonio', 'Manuel Antonio', 'Puntarenas'],
  ]),
  ...countryCityOptionEntries('pa', ['591', 'PA', 'Panama'], [
    ['panama-city', 'Panama City', 'Panama Province'],
    ['boquete', 'Boquete', 'Chiriqui'],
    ['bocas-del-toro', 'Bocas del Toro', 'Bocas del Toro'],
    ['san-blas', 'San Blas', 'Guna Yala'],
  ]),
  ...countryCityOptionEntries('gt', ['320', 'GT', 'Guatemala'], [
    ['antigua', 'Antigua', 'Sacatepequez'],
    ['guatemala-city', 'Guatemala City', 'Guatemala Department'],
    ['lake-atitlan', 'Lake Atitlan', 'Solola'],
    ['flores', 'Flores', 'Peten'],
    ['tikal', 'Tikal', 'Peten'],
  ]),
  ...countryCityOptionEntries('bz', ['084', 'BZ', 'Belize'], [
    ['belize-city', 'Belize City', 'Belize District'],
    ['san-pedro', 'San Pedro', 'Ambergris Caye'],
    ['caye-caulker', 'Caye Caulker', 'Belize District'],
    ['placencia', 'Placencia', 'Stann Creek'],
  ]),
  ...countryCityOptionEntries('cu', ['192', 'CU', 'Cuba'], [
    ['havana', 'Havana', 'La Habana'],
    ['varadero', 'Varadero', 'Matanzas'],
    ['trinidad', 'Trinidad', 'Sancti Spiritus'],
    ['vinales', 'Vinales', 'Pinar del Rio'],
    ['santiago-de-cuba', 'Santiago de Cuba', 'Santiago de Cuba'],
  ]),
  ...countryCityOptionEntries('jm', ['388', 'JM', 'Jamaica'], [
    ['kingston', 'Kingston', 'Kingston'],
    ['montego-bay', 'Montego Bay', 'St. James'],
    ['negril', 'Negril', 'Westmoreland'],
    ['ocho-rios', 'Ocho Rios', 'St. Ann'],
    ['port-antonio', 'Port Antonio', 'Portland'],
  ]),
  ...countryCityOptionEntries('do', ['214', 'DO', 'Dominican Republic', 'Dominican Rep.'], [
    ['santo-domingo', 'Santo Domingo', 'Distrito Nacional'],
    ['punta-cana', 'Punta Cana', 'La Altagracia'],
    ['puerto-plata', 'Puerto Plata', 'Puerto Plata'],
    ['samana', 'Samana', 'Samana'],
  ]),
  ...countryCityOptionEntries('pr', ['630', 'PR', 'Puerto Rico'], [
    ['san-juan', 'San Juan', 'San Juan'],
    ['ponce', 'Ponce', 'Ponce'],
    ['rincon', 'Rincon', 'Western Puerto Rico'],
    ['vieques', 'Vieques', 'Vieques'],
    ['culebra', 'Culebra', 'Culebra'],
  ]),
  ...countryCityOptionEntries('bs', ['044', 'BS', 'Bahamas'], [
    ['nassau', 'Nassau', 'New Providence'],
    ['freeport', 'Freeport', 'Grand Bahama'],
    ['exuma', 'Exuma', 'Out Islands'],
    ['harbour-island', 'Harbour Island', 'Eleuthera'],
  ]),
  ...countryCityOptionEntries('ec', ['218', 'EC', 'Ecuador'], [
    ['quito', 'Quito', 'Pichincha'],
    ['guayaquil', 'Guayaquil', 'Guayas'],
    ['cuenca', 'Cuenca', 'Azuay'],
    ['banos', 'Banos', 'Tungurahua'],
    ['galapagos', 'Galapagos', 'Galapagos Islands'],
  ]),
  ...countryCityOptionEntries('uy', ['858', 'UY', 'Uruguay'], [
    ['montevideo', 'Montevideo', 'Montevideo'],
    ['punta-del-este', 'Punta del Este', 'Maldonado'],
    ['colonia-del-sacramento', 'Colonia del Sacramento', 'Colonia'],
  ]),
  ...countryCityOptionEntries('bo', ['068', 'BO', 'Bolivia'], [
    ['la-paz', 'La Paz', 'La Paz'],
    ['sucre', 'Sucre', 'Chuquisaca'],
    ['uyuni', 'Uyuni', 'Potosi'],
    ['copacabana', 'Copacabana', 'Lake Titicaca'],
    ['santa-cruz', 'Santa Cruz', 'Santa Cruz'],
  ]),
  ...countryCityOptionEntries('py', ['600', 'PY', 'Paraguay'], [
    ['asuncion', 'Asuncion', 'Asuncion'],
    ['encarnacion', 'Encarnacion', 'Itapua'],
    ['ciudad-del-este', 'Ciudad del Este', 'Alto Parana'],
  ]),
  ...countryCityOptionEntries('vn', ['704', 'VN', 'Vietnam'], [
    ['hanoi', 'Hanoi', 'Northern Vietnam'],
    ['ho-chi-minh-city', 'Ho Chi Minh City', 'Southern Vietnam'],
    ['hoi-an', 'Hoi An', 'Central Vietnam'],
    ['da-nang', 'Da Nang', 'Central Vietnam'],
    ['hue', 'Hue', 'Central Vietnam'],
    ['nha-trang', 'Nha Trang', 'South Central Coast'],
    ['sapa', 'Sapa', 'Northern Vietnam'],
  ]),
  ...countryCityOptionEntries('kh', ['116', 'KH', 'Cambodia'], [
    ['phnom-penh', 'Phnom Penh', 'Phnom Penh'],
    ['siem-reap', 'Siem Reap', 'Northwestern Cambodia'],
    ['battambang', 'Battambang', 'Battambang'],
    ['kampot', 'Kampot', 'Southern Cambodia'],
    ['sihanoukville', 'Sihanoukville', 'Coast'],
  ]),
  ...countryCityOptionEntries('la', ['418', 'LA', 'Laos'], [
    ['luang-prabang', 'Luang Prabang', 'Northern Laos'],
    ['vientiane', 'Vientiane', 'Vientiane Prefecture'],
    ['vang-vieng', 'Vang Vieng', 'Vientiane Province'],
    ['pakse', 'Pakse', 'Champasak'],
  ]),
  ...countryCityOptionEntries('mm', ['104', 'MM', 'Myanmar', 'Burma'], [
    ['yangon', 'Yangon', 'Yangon Region'],
    ['bagan', 'Bagan', 'Mandalay Region'],
    ['mandalay', 'Mandalay', 'Mandalay Region'],
    ['inle-lake', 'Inle Lake', 'Shan State'],
    ['naypyidaw', 'Naypyidaw', 'Naypyidaw Union Territory'],
  ]),
  ...countryCityOptionEntries('my', ['458', 'MY', 'Malaysia'], [
    ['kuala-lumpur', 'Kuala Lumpur', 'Federal Territory'],
    ['penang', 'Penang', 'Penang'],
    ['langkawi', 'Langkawi', 'Kedah'],
    ['malacca', 'Malacca', 'Malacca'],
    ['kota-kinabalu', 'Kota Kinabalu', 'Sabah'],
    ['kuching', 'Kuching', 'Sarawak'],
  ]),
  ...countryCityOptionEntries('ph', ['608', 'PH', 'Philippines'], [
    ['manila', 'Manila', 'Metro Manila'],
    ['cebu-city', 'Cebu City', 'Central Visayas'],
    ['boracay', 'Boracay', 'Western Visayas'],
    ['el-nido', 'El Nido', 'Palawan'],
    ['coron', 'Coron', 'Palawan'],
    ['bohol', 'Bohol', 'Central Visayas'],
  ]),
  ...countryCityOptionEntries('tw', ['158', 'TW', 'Taiwan'], [
    ['taipei', 'Taipei', 'Northern Taiwan'],
    ['taichung', 'Taichung', 'Central Taiwan'],
    ['tainan', 'Tainan', 'Southern Taiwan'],
    ['kaohsiung', 'Kaohsiung', 'Southern Taiwan'],
    ['hualien', 'Hualien', 'Eastern Taiwan'],
  ]),
  ...countryCityOptionEntries('np', ['524', 'NP', 'Nepal'], [
    ['kathmandu', 'Kathmandu', 'Bagmati'],
    ['pokhara', 'Pokhara', 'Gandaki'],
    ['bhaktapur', 'Bhaktapur', 'Bagmati'],
    ['patan', 'Patan', 'Bagmati'],
    ['chitwan', 'Chitwan', 'Bagmati'],
  ]),
  ...countryCityOptionEntries('lk', ['144', 'LK', 'Sri Lanka'], [
    ['colombo', 'Colombo', 'Western Province'],
    ['kandy', 'Kandy', 'Central Province'],
    ['galle', 'Galle', 'Southern Province'],
    ['ella', 'Ella', 'Uva Province'],
    ['sigiriya', 'Sigiriya', 'Central Province'],
    ['nuwara-eliya', 'Nuwara Eliya', 'Central Province'],
  ]),
  ...countryCityOptionEntries('jo', ['400', 'JO', 'Jordan'], [
    ['amman', 'Amman', 'Amman Governorate'],
    ['petra', 'Petra', 'Ma an Governorate'],
    ['wadi-rum', 'Wadi Rum', 'Aqaba Governorate'],
    ['aqaba', 'Aqaba', 'Aqaba Governorate'],
    ['jerash', 'Jerash', 'Jerash Governorate'],
    ['dead-sea', 'Dead Sea', 'Jordan Valley'],
  ]),
  ...countryCityOptionEntries('il', ['376', 'IL', 'Israel'], [
    ['jerusalem', 'Jerusalem', 'Jerusalem District'],
    ['tel-aviv', 'Tel Aviv', 'Tel Aviv District'],
    ['haifa', 'Haifa', 'Haifa District'],
    ['eilat', 'Eilat', 'Southern District'],
    ['nazareth', 'Nazareth', 'Northern District'],
  ]),
  ...countryCityOptionEntries('lb', ['422', 'LB', 'Lebanon'], [
    ['beirut', 'Beirut', 'Beirut Governorate'],
    ['byblos', 'Byblos', 'Mount Lebanon'],
    ['baalbek', 'Baalbek', 'Baalbek-Hermel'],
    ['tripoli', 'Tripoli', 'North Governorate'],
    ['tyre', 'Tyre', 'South Governorate'],
  ]),
  ...countryCityOptionEntries('sa', ['682', 'SA', 'Saudi Arabia'], [
    ['riyadh', 'Riyadh', 'Riyadh Province'],
    ['jeddah', 'Jeddah', 'Makkah Province'],
    ['makkah', 'Makkah', 'Makkah Province'],
    ['medina', 'Medina', 'Medina Province'],
    ['alula', 'AlUla', 'Medina Province'],
  ]),
  ...countryCityOptionEntries('qa', ['634', 'QA', 'Qatar'], [
    ['doha', 'Doha', 'Doha'],
    ['al-wakrah', 'Al Wakrah', 'Al Wakrah'],
    ['al-khor', 'Al Khor', 'Al Khor'],
  ]),
  ...countryCityOptionEntries('om', ['512', 'OM', 'Oman'], [
    ['muscat', 'Muscat', 'Muscat Governorate'],
    ['nizwa', 'Nizwa', 'Ad Dakhiliyah'],
    ['salalah', 'Salalah', 'Dhofar'],
    ['sur', 'Sur', 'Ash Sharqiyah'],
  ]),
  ...countryCityOptionEntries('kz', ['398', 'KZ', 'Kazakhstan'], [
    ['almaty', 'Almaty', 'Almaty'],
    ['astana', 'Astana', 'Akmola'],
    ['shymkent', 'Shymkent', 'Southern Kazakhstan'],
    ['turkistan', 'Turkistan', 'Turkistan Region'],
  ]),
  ...countryCityOptionEntries('uz', ['860', 'UZ', 'Uzbekistan'], [
    ['tashkent', 'Tashkent', 'Tashkent'],
    ['samarkand', 'Samarkand', 'Samarkand'],
    ['bukhara', 'Bukhara', 'Bukhara'],
    ['khiva', 'Khiva', 'Khorezm'],
  ]),
  ...countryCityOptionEntries('ge', ['268', 'GE', 'Georgia'], [
    ['tbilisi', 'Tbilisi', 'Tbilisi'],
    ['batumi', 'Batumi', 'Adjara'],
    ['kutaisi', 'Kutaisi', 'Imereti'],
    ['kazbegi', 'Kazbegi', 'Mtskheta-Mtianeti'],
    ['sighnaghi', 'Sighnaghi', 'Kakheti'],
  ]),
  ...countryCityOptionEntries('az', ['031', 'AZ', 'Azerbaijan'], [
    ['baku', 'Baku', 'Absheron'],
    ['sheki', 'Sheki', 'Sheki-Zagatala'],
    ['gabala', 'Gabala', 'Gabala'],
    ['ganja', 'Ganja', 'Ganja'],
  ]),
  ...countryCityOptionEntries('am', ['051', 'AM', 'Armenia'], [
    ['yerevan', 'Yerevan', 'Yerevan'],
    ['gyumri', 'Gyumri', 'Shirak'],
    ['dilijan', 'Dilijan', 'Tavush'],
    ['sevan', 'Sevan', 'Gegharkunik'],
  ]),
  ...countryCityOptionEntries('mn', ['496', 'MN', 'Mongolia'], [
    ['ulaanbaatar', 'Ulaanbaatar', 'Ulaanbaatar'],
    ['kharkhorin', 'Kharkhorin', 'Orkhon Valley'],
    ['gorkhi-terelj', 'Gorkhi-Terelj', 'Tuv'],
  ]),
  ...countryCityOptionEntries('ir', ['364', 'IR', 'Iran'], [
    ['tehran', 'Tehran', 'Tehran'],
    ['isfahan', 'Isfahan', 'Isfahan'],
    ['shiraz', 'Shiraz', 'Fars'],
    ['yazd', 'Yazd', 'Yazd'],
    ['kashan', 'Kashan', 'Isfahan'],
  ]),
  ...countryCityOptionEntries('pk', ['586', 'PK', 'Pakistan'], [
    ['islamabad', 'Islamabad', 'Islamabad Capital Territory'],
    ['lahore', 'Lahore', 'Punjab'],
    ['karachi', 'Karachi', 'Sindh'],
    ['hunza', 'Hunza', 'Gilgit-Baltistan'],
    ['peshawar', 'Peshawar', 'Khyber Pakhtunkhwa'],
  ]),
  ...countryCityOptionEntries('bd', ['050', 'BD', 'Bangladesh'], [
    ['dhaka', 'Dhaka', 'Dhaka Division'],
    ['chittagong', 'Chittagong', 'Chittagong Division'],
    ['sylhet', 'Sylhet', 'Sylhet Division'],
    ['coxs-bazar', "Cox's Bazar", 'Chittagong Division'],
  ]),
  ...countryCityOptionEntries('bt', ['064', 'BT', 'Bhutan'], [
    ['thimphu', 'Thimphu', 'Thimphu'],
    ['paro', 'Paro', 'Paro'],
    ['punakha', 'Punakha', 'Punakha'],
  ]),
  ...countryCityOptionEntries('ke', ['404', 'KE', 'Kenya'], [
    ['nairobi', 'Nairobi', 'Nairobi County'],
    ['mombasa', 'Mombasa', 'Coast'],
    ['diani-beach', 'Diani Beach', 'Coast'],
    ['nakuru', 'Nakuru', 'Rift Valley'],
    ['lamu', 'Lamu', 'Coast'],
  ]),
  ...countryCityOptionEntries('tz', ['834', 'TZ', 'Tanzania'], [
    ['zanzibar-city', 'Zanzibar City', 'Zanzibar'],
    ['arusha', 'Arusha', 'Northern Tanzania'],
    ['dar-es-salaam', 'Dar es Salaam', 'Coast'],
    ['moshi', 'Moshi', 'Kilimanjaro'],
    ['stone-town', 'Stone Town', 'Zanzibar'],
  ]),
  ...countryCityOptionEntries('et', ['231', 'ET', 'Ethiopia'], [
    ['addis-ababa', 'Addis Ababa', 'Addis Ababa'],
    ['lalibela', 'Lalibela', 'Amhara'],
    ['gondar', 'Gondar', 'Amhara'],
    ['axum', 'Axum', 'Tigray'],
    ['bahir-dar', 'Bahir Dar', 'Amhara'],
  ]),
  ...countryCityOptionEntries('rw', ['646', 'RW', 'Rwanda'], [
    ['kigali', 'Kigali', 'Kigali'],
    ['musanze', 'Musanze', 'Northern Province'],
    ['gisenyi', 'Gisenyi', 'Western Province'],
  ]),
  ...countryCityOptionEntries('ug', ['800', 'UG', 'Uganda'], [
    ['kampala', 'Kampala', 'Central Region'],
    ['entebbe', 'Entebbe', 'Central Region'],
    ['jinja', 'Jinja', 'Eastern Region'],
    ['fort-portal', 'Fort Portal', 'Western Region'],
  ]),
  ...countryCityOptionEntries('gh', ['288', 'GH', 'Ghana'], [
    ['accra', 'Accra', 'Greater Accra'],
    ['kumasi', 'Kumasi', 'Ashanti'],
    ['cape-coast', 'Cape Coast', 'Central Region'],
    ['tamale', 'Tamale', 'Northern Region'],
  ]),
  ...countryCityOptionEntries('sn', ['686', 'SN', 'Senegal'], [
    ['dakar', 'Dakar', 'Dakar Region'],
    ['saint-louis', 'Saint-Louis', 'Saint-Louis Region'],
    ['saly', 'Saly', 'Thies Region'],
    ['ziguinchor', 'Ziguinchor', 'Casamance'],
  ]),
  ...countryCityOptionEntries('ng', ['566', 'NG', 'Nigeria'], [
    ['lagos', 'Lagos', 'Lagos State'],
    ['abuja', 'Abuja', 'Federal Capital Territory'],
    ['calabar', 'Calabar', 'Cross River'],
    ['kano', 'Kano', 'Kano State'],
  ]),
  ...countryCityOptionEntries('na', ['516', 'NA', 'Namibia'], [
    ['windhoek', 'Windhoek', 'Khomas'],
    ['swakopmund', 'Swakopmund', 'Erongo'],
    ['walvis-bay', 'Walvis Bay', 'Erongo'],
    ['sossusvlei', 'Sossusvlei', 'Namib Desert'],
    ['etosha', 'Etosha', 'Oshikoto'],
  ]),
  ...countryCityOptionEntries('bw', ['072', 'BW', 'Botswana'], [
    ['gaborone', 'Gaborone', 'South-East District'],
    ['maun', 'Maun', 'North-West District'],
    ['kasane', 'Kasane', 'Chobe District'],
    ['francistown', 'Francistown', 'North-East District'],
  ]),
  ...countryCityOptionEntries('zw', ['716', 'ZW', 'Zimbabwe'], [
    ['harare', 'Harare', 'Harare'],
    ['victoria-falls', 'Victoria Falls', 'Matabeleland North'],
    ['bulawayo', 'Bulawayo', 'Bulawayo'],
    ['great-zimbabwe', 'Great Zimbabwe', 'Masvingo'],
  ]),
  ...countryCityOptionEntries('zm', ['894', 'ZM', 'Zambia'], [
    ['lusaka', 'Lusaka', 'Lusaka Province'],
    ['livingstone', 'Livingstone', 'Southern Province'],
    ['south-luangwa', 'South Luangwa', 'Eastern Province'],
  ]),
  ...countryCityOptionEntries('mg', ['450', 'MG', 'Madagascar'], [
    ['antananarivo', 'Antananarivo', 'Analamanga'],
    ['nosy-be', 'Nosy Be', 'Diana'],
    ['morondava', 'Morondava', 'Menabe'],
    ['toamasina', 'Toamasina', 'Atsinanana'],
  ]),
  ...countryCityOptionEntries('mz', ['508', 'MZ', 'Mozambique'], [
    ['maputo', 'Maputo', 'Maputo Province'],
    ['vilanculos', 'Vilanculos', 'Inhambane'],
    ['tofo', 'Tofo', 'Inhambane'],
    ['ilha-de-mozambique', 'Ilha de Mozambique', 'Nampula'],
  ]),
  ...countryCityOptionEntries('tn', ['788', 'TN', 'Tunisia'], [
    ['tunis', 'Tunis', 'Tunis Governorate'],
    ['sousse', 'Sousse', 'Sousse Governorate'],
    ['hammamet', 'Hammamet', 'Nabeul'],
    ['djerba', 'Djerba', 'Medenine'],
    ['kairouan', 'Kairouan', 'Kairouan Governorate'],
  ]),
  ...countryCityOptionEntries('dz', ['012', 'DZ', 'Algeria'], [
    ['algiers', 'Algiers', 'Algiers Province'],
    ['oran', 'Oran', 'Oran Province'],
    ['constantine', 'Constantine', 'Constantine Province'],
    ['tlemcen', 'Tlemcen', 'Tlemcen Province'],
  ]),
  ...countryCityOptionEntries('fj', ['242', 'FJ', 'Fiji'], [
    ['nadi', 'Nadi', 'Viti Levu'],
    ['suva', 'Suva', 'Viti Levu'],
    ['denarau', 'Denarau', 'Viti Levu'],
    ['savusavu', 'Savusavu', 'Vanua Levu'],
  ]),
  ...countryCityOptionEntries('pg', ['598', 'PG', 'Papua New Guinea'], [
    ['port-moresby', 'Port Moresby', 'National Capital District'],
    ['lae', 'Lae', 'Morobe'],
    ['mount-hagen', 'Mount Hagen', 'Western Highlands'],
    ['kokopo', 'Kokopo', 'East New Britain'],
  ]),
]);

const countryViewportLookup: Record<string, CountryViewportConfig> = Object.fromEntries(
  [
    [['840', 'US', 'USA', 'United States', 'United States of America'], [-98.5795, 39.8283], 4],
    [['124', 'CA', 'Canada'], [-106.3468, 56.1304], 3],
    [['484', 'MX', 'Mexico'], [-102.5528, 23.6345], 5],
    [['076', 'BR', 'Brazil'], [-51.9253, -14.235], 4],
    [['032', 'AR', 'Argentina'], [-63.6167, -38.4161], 4],
    [['152', 'CL', 'Chile'], [-71.543, -35.6751], 4],
    [['604', 'PE', 'Peru'], [-75.0152, -9.19], 5],
    [['170', 'CO', 'Colombia'], [-74.2973, 4.5709], 5],
    [['218', 'EC', 'Ecuador'], [-78.1834, -1.8312], 6],
    [['068', 'BO', 'Bolivia'], [-63.5887, -16.2902], 5],
    [['858', 'UY', 'Uruguay'], [-55.7658, -32.5228], 7],
    [['250', 'FR', 'France'], [2.2137, 46.2276], 6],
    [['380', 'IT', 'Italy'], [12.5674, 41.8719], 6],
    [['724', 'ES', 'Spain'], [-3.7492, 40.4637], 6],
    [['620', 'PT', 'Portugal'], [-8.2245, 39.3999], 6],
    [['276', 'DE', 'Germany'], [10.4515, 51.1657], 6],
    [['826', 'GB', 'UK', 'United Kingdom', 'Great Britain'], [-3.436, 55.3781], 6],
    [['528', 'NL', 'Netherlands'], [5.2913, 52.1326], 7],
    [['056', 'BE', 'Belgium'], [4.4699, 50.5039], 7],
    [['756', 'CH', 'Switzerland'], [8.2275, 46.8182], 7],
    [['040', 'AT', 'Austria'], [14.5501, 47.5162], 7],
    [['300', 'GR', 'Greece'], [21.8243, 39.0742], 6],
    [['792', 'TR', 'Turkey', 'Turkiye'], [35.2433, 38.9637], 5],
    [['203', 'CZ', 'Czechia', 'Czech Republic'], [15.473, 49.8175], 7],
    [['616', 'PL', 'Poland'], [19.1451, 51.9194], 6],
    [['191', 'HR', 'Croatia'], [15.2, 45.1], 7],
    [['348', 'HU', 'Hungary'], [19.5033, 47.1625], 7],
    [['642', 'RO', 'Romania'], [24.9668, 45.9432], 6],
    [['100', 'BG', 'Bulgaria'], [25.4858, 42.7339], 7],
    [['705', 'SI', 'Slovenia'], [14.9955, 46.1512], 8],
    [['008', 'AL', 'Albania'], [20.1683, 41.1533], 7],
    [['578', 'NO', 'Norway'], [8.4689, 60.472], 5],
    [['752', 'SE', 'Sweden'], [18.6435, 60.1282], 5],
    [['246', 'FI', 'Finland'], [25.7482, 61.9241], 5],
    [['208', 'DK', 'Denmark'], [9.5018, 56.2639], 7],
    [['372', 'IE', 'Ireland'], [-8.2439, 53.4129], 7],
    [['352', 'Iceland'], [-19.0208, 64.9631], 6],
    [['643', 'RU', 'Russia'], [105.3188, 61.524], 3],
    [['804', 'UA', 'Ukraine'], [31.1656, 48.3794], 5],
    [['504', 'MA', 'Morocco'], [-7.0926, 31.7917], 5],
    [['818', 'EG', 'Egypt'], [30.8025, 26.8206], 5],
    [['710', 'ZA', 'South Africa'], [22.9375, -30.5595], 5],
    [['404', 'KE', 'Kenya'], [37.9062, -0.0236], 5],
    [['834', 'TZ', 'Tanzania'], [34.8888, -6.369], 5],
    [['288', 'GH', 'Ghana'], [-1.0232, 7.9465], 6],
    [['566', 'NG', 'Nigeria'], [8.6753, 9.082], 5],
    [['516', 'NA', 'Namibia'], [18.4904, -22.9576], 5],
    [['072', 'BW', 'Botswana'], [24.6849, -22.3285], 5],
    [['716', 'ZW', 'Zimbabwe'], [29.1549, -19.0154], 6],
    [['450', 'Madagascar'], [46.8691, -18.7669], 5],
    [['392', 'JP', 'Japan'], [138.2529, 36.2048], 5],
    [['410', 'KR', 'South Korea', 'Korea'], [127.7669, 35.9078], 7],
    [['156', 'CN', 'China'], [104.1954, 35.8617], 4],
    [['356', 'IN', 'India'], [78.9629, 20.5937], 5],
    [['360', 'ID', 'Indonesia'], [113.9213, -0.7893], 4],
    [['764', 'TH', 'Thailand'], [100.9925, 15.87], 5],
    [['704', 'VN', 'Vietnam'], [108.2772, 14.0583], 5],
    [['458', 'MY', 'Malaysia'], [101.9758, 4.2105], 6],
    [['608', 'PH', 'Philippines'], [121.774, 12.8797], 5],
    [['158', 'Taiwan'], [120.9605, 23.6978], 7],
    [['116', 'Cambodia'], [104.991, 12.5657], 6],
    [['418', 'Laos'], [102.4955, 19.8563], 6],
    [['104', 'MM', 'Myanmar', 'Burma'], [95.956, 21.9162], 5],
    [['524', 'Nepal'], [84.124, 28.3949], 6],
    [['144', 'Sri Lanka'], [80.7718, 7.8731], 7],
    [['036', 'AU', 'Australia'], [134.491, -25.734], 4],
    [['554', 'NZ', 'New Zealand'], [171.5, -41.5], 5],
    [['242', 'Fiji'], [178.065, -17.7134], 6],
    [['784', 'AE', 'UAE', 'United Arab Emirates'], [53.8478, 23.4241], 7],
    [['400', 'Jordan'], [36.2384, 30.5852], 7],
    [['376', 'Israel'], [34.8516, 31.0461], 7],
    [['682', 'Saudi Arabia'], [45.0792, 23.8859], 5],
    [['512', 'Oman'], [55.9233, 21.5126], 6],
  ].flatMap(([keys, center, zoom]) =>
    (keys as string[]).map((key) => [
      normalizeCityName(key),
      { center: center as Coordinates, zoom: zoom as number },
    ])
  )
);

function getFallbackCityCoordinates(country: Country, cityIndex: number, cityCount: number): Coordinates {
  const fallbackCenter = getCountryViewport(country, [])?.center ?? [0, 20];
  const [countryLongitude, countryLatitude] = country.coordinates ?? fallbackCenter;
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

function getCityRegionCoordinateKey(cityName: string, region: string) {
  return `${normalizeCityName(cityName)}|${normalizeCityName(region)}`;
}

function getCityCoordinates(cityId: string, cityName: string, region: string) {
  return (
    cityCoordinateLookup[cityId] ??
    cityRegionCoordinateLookup[getCityRegionCoordinateKey(cityName, region)] ??
    cityNameCoordinateLookup[normalizeCityName(cityName)]
  );
}

function createCityId(cityName: string) {
  const slug = normalizeCityName(cityName).replace(/\s+/g, '-');
  return `city-${slug || 'saved'}-${Date.now().toString(36)}`;
}

function getKnownCityCoordinates(city: CountryCity) {
  return city.coordinates ?? getCityCoordinates(city.id, city.name, city.region);
}

function mergeCityOptions(cityOptionGroups: CityOption[][]) {
  const mergedOptions = new Map<string, CityOption>();

  cityOptionGroups.flat().forEach((option) => {
    const optionKey = normalizeCityName(option.name);

    if (!mergedOptions.has(optionKey)) {
      mergedOptions.set(optionKey, {
        ...option,
        coordinates: option.coordinates ?? getCityCoordinates(option.id, option.name, option.region),
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

function getCountryViewportKeys(country: Country) {
  return Array.from(
    new Set(
      [country.id, country.code, country.name]
        .filter(Boolean)
        .map((countryKey) => normalizeCityName(countryKey))
    )
  );
}

function getCountryViewport(country: Country, points: CityPreviewPoint[]) {
  for (const countryKey of getCountryViewportKeys(country)) {
    const countryViewport = countryViewportLookup[countryKey];

    if (countryViewport) {
      return countryViewport;
    }
  }

  if (country.coordinates) {
    return {
      center: country.coordinates,
      zoom: 5,
    };
  }

  const firstPoint = points[0];

  if (firstPoint) {
    return {
      center: firstPoint.coordinates,
      zoom: firstPoint.kind === 'country' ? 5 : 6,
    };
  }

  return null;
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
    (countryKey) => [
      ...(countryCityOptionsLookup[countryKey] ?? []),
      ...(popularCountryCityOptionsLookup[countryKey] ?? []),
    ]
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
    const countryViewport = getCountryViewport(country, []);

    return [
      {
        id: `${country.id}-focus`,
        name: country.name,
        region: 'Country preview',
        visited: country.visited,
        coordinates: country.coordinates ?? countryViewport?.center ?? [0, 20],
        kind: 'country',
        isApproximate: false,
      },
    ];
  }

  return cities.map((city, index) => {
    const knownCoordinates = getKnownCityCoordinates(city);

    return {
      id: city.id,
      name: city.name,
      region: city.region,
      visited: city.visited,
      coordinates: knownCoordinates ?? getFallbackCityCoordinates(country, index, cities.length),
      kind: 'city' as const,
      isApproximate: !knownCoordinates,
    };
  });
}

const tileSize = 256;
const maxMercatorLatitude = 85.05112878;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function projectCoordinates([longitude, latitude]: Coordinates, zoom: number) {
  const scale = tileSize * 2 ** zoom;
  const clampedLatitude = clampNumber(latitude, -maxMercatorLatitude, maxMercatorLatitude);
  const latitudeRadians = (clampedLatitude * Math.PI) / 180;
  const x = ((longitude + 180) / 360) * scale;
  const y =
    (0.5 - Math.log((1 + Math.sin(latitudeRadians)) / (1 - Math.sin(latitudeRadians))) / (4 * Math.PI)) * scale;

  return { x, y };
}

function getFittingZoom(points: CityPreviewPoint[], viewport: TileViewport) {
  if (points.length <= 1) return 8;

  const usableWidth = Math.max(160, viewport.width - 180);
  const usableHeight = Math.max(140, viewport.height - 150);

  for (let zoom = 10; zoom >= 2; zoom -= 1) {
    const projectedPoints = points.map((point) => projectCoordinates(point.coordinates, zoom));
    const xs = projectedPoints.map((point) => point.x);
    const ys = projectedPoints.map((point) => point.y);
    const spanWidth = Math.max(...xs) - Math.min(...xs);
    const spanHeight = Math.max(...ys) - Math.min(...ys);

    if (spanWidth <= usableWidth && spanHeight <= usableHeight) return zoom;
  }

  return 2;
}

function getTileMapLayout(
  points: CityPreviewPoint[],
  viewport: TileViewport,
  countryViewport: CountryViewportConfig | null
) {
  const fittingZoom = getFittingZoom(points, viewport);
  const zoom = countryViewport ? Math.min(countryViewport.zoom, fittingZoom) : fittingZoom;
  const projectedPoints = points.map((point) => ({
    point,
    projected: projectCoordinates(point.coordinates, zoom),
  }));
  const xs = projectedPoints.map(({ projected }) => projected.x);
  const ys = projectedPoints.map(({ projected }) => projected.y);
  const centerPixel =
    countryViewport
      ? projectCoordinates(countryViewport.center, zoom)
      : projectedPoints.length > 1
      ? {
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2,
        }
      : projectedPoints[0]?.projected ?? projectCoordinates([0, 20], zoom);
  const topLeft = {
    x: centerPixel.x - viewport.width / 2,
    y: centerPixel.y - viewport.height / 2,
  };
  const minTileX = Math.floor(topLeft.x / tileSize) - 1;
  const maxTileX = Math.floor((topLeft.x + viewport.width) / tileSize) + 1;
  const minTileY = Math.floor(topLeft.y / tileSize) - 1;
  const maxTileY = Math.floor((topLeft.y + viewport.height) / tileSize) + 1;
  const tileCount = 2 ** zoom;
  const tiles: MapTile[] = [];

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      if (y < 0 || y >= tileCount) continue;

      const wrappedX = ((x % tileCount) + tileCount) % tileCount;

      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * tileSize - topLeft.x,
        top: y * tileSize - topLeft.y,
      });
    }
  }

  const pins: MapPin[] = projectedPoints.map(({ point, projected }) => ({
    ...point,
    left: projected.x - topLeft.x,
    top: projected.y - topLeft.y,
  }));

  return { pins, tiles, zoom };
}

function CityMapPreview({ country, points }: { country: Country; points: CityPreviewPoint[] }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<TileViewport>({ width: 720, height: 380 });
  const cityPoints = useMemo(() => points.filter((point) => point.kind === 'city'), [points]);
  const visibleMapPoints = useMemo(() => (cityPoints.length > 0 ? cityPoints : points), [cityPoints, points]);
  const countryViewport = useMemo(
    () => getCountryViewport(country, visibleMapPoints),
    [country, visibleMapPoints]
  );
  const mapLayout = useMemo(
    () => getTileMapLayout(visibleMapPoints, viewport, countryViewport),
    [visibleMapPoints, viewport, countryViewport]
  );

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let animationFrame = 0;

    const syncViewport = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      setViewport((currentViewport) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        if (currentViewport.width === width && currentViewport.height === height) {
          return currentViewport;
        }

        return { width, height };
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(syncViewport);
    });

    resizeObserver.observe(container);
    animationFrame = window.requestAnimationFrame(syncViewport);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  const exactCityCount = cityPoints.filter((point) => !point.isApproximate).length;
  const estimatedCityCount = cityPoints.filter((point) => point.isApproximate).length;
  const previewLabel = cityPoints.length > 0 ? `${cityPoints.length} pins shown` : 'Country view';

  return (
    <div ref={mapContainerRef} className="relative h-[380px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-200">
      <div className="absolute inset-0 z-0 overflow-hidden">
        {mapLayout.tiles.map((tile) => (
          <div
            key={tile.key}
            className="absolute bg-slate-100"
            style={{
              backgroundImage: `url(${tile.url})`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '256px 256px',
              height: tileSize,
              left: tile.left,
              top: tile.top,
              width: tileSize,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-10">
        {mapLayout.pins.map((point) => {
          const markerColor = point.kind === 'country' ? '#FFD166' : point.isApproximate ? '#FF9F6B' : '#0F766E';

          return (
            <div
              key={`pin-${point.id}`}
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-2"
              style={{ left: point.left, top: point.top }}
            >
              <span
                className="max-w-44 truncate rounded-full border bg-white/95 px-3 py-1.5 text-[13px] font-extrabold leading-none text-ink shadow-soft backdrop-blur"
                style={{ borderColor: markerColor }}
              >
                {point.isApproximate ? `${point.name} estimate` : point.name}
              </span>
              <span
                className="relative h-7 w-7 rotate-[-45deg] rounded-[999px_999px_999px_0] border-[3px] border-white shadow-[0_0_0_10px_rgba(15,118,110,0.16),0_10px_24px_rgba(0,0,0,0.28)]"
                style={{ backgroundColor: markerColor }}
              >
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </span>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 z-20 rounded bg-white/85 px-2 py-1 text-[10px] font-semibold text-ink/70 shadow-soft">
        OpenStreetMap
      </div>
      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-2xl border border-ink/10 bg-white/90 px-3 py-2 text-ink shadow-soft backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-teal-700">Actual map</p>
        <p className="mt-1 text-lg font-semibold">{country.name}</p>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3 text-ink">
        <div className="rounded-2xl border border-ink/10 bg-white/90 px-3 py-2 text-sm font-semibold shadow-soft backdrop-blur">
          {previewLabel}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {exactCityCount > 0 && (
            <div className="rounded-2xl border border-ink/10 bg-white/90 px-3 py-2 text-xs font-semibold text-teal-800 shadow-soft backdrop-blur">
              {exactCityCount} exact
            </div>
          )}
          {estimatedCityCount > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-white/90 px-3 py-2 text-xs font-semibold text-orange-700 shadow-soft backdrop-blur">
              {estimatedCityCount} estimated
            </div>
          )}
        </div>
      </div>
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
      coordinates: selectedCityOption.coordinates ?? getCityCoordinates(selectedCityOption.id, cityName, cityRegion),
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
            <p className="text-sm text-ink/70">A first look at city-level travel, memories, and saved places.</p>
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
                <p className="text-sm text-white/70">Zoom into your favorite places and saved city pins.</p>
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

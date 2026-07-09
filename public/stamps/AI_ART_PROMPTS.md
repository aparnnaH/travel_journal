# AI Stamp Artwork Prompt Pack

Use these prompts to generate the center artwork only. The app already handles the stamp border, paper, cancellation marks, rotation, lock state, and texture overlays.

These prompts are safe to keep in the public repository. When using an external art tool, submit only the prompt text and non-sensitive reference art. Do not upload `.env` files, API keys, app screenshots with real user data, or private travel photos unless you have permission to use them.

Recommended output:

- Transparent PNG
- 1024 x 1024
- No text
- No numbers
- No paper background
- No full stamp border
- No mockup
- Centered emblem with generous padding

Shared style line:

```text
Premium collectible passport stamp centerpiece illustration, transparent background, vintage passport ink style, handcrafted travel ephemera aesthetic, imperfect ink bleed, worn printed texture, elegant emblem composition, strong silhouette, tactile scrapbook feeling, no text, no numbers, no border, no paper background, no mockup.
```

## Reusable Country Prompt Template

Use this template for any country that does not already have a full prompt below. Replace the country name, artwork focus, and palette from the matrix.

```text
Create a premium collectible passport stamp centerpiece illustration for [Country]. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring [Artwork focus]. [Ink palette]. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

Recommended file name:

```text
public/stamps/countries/[stamp-id].png
```

PNG is the default export format. SVG is also supported for legacy assets. For placeholder countries, generate the file first, then point that country stamp metadata at the new asset instead of `placeholder.png`.

## Country Prompt Matrix

Use the artwork focus and ink palette from this table inside the reusable template. The existing full prompts below are still the preferred prompts for Japan, France, Canada, Egypt, Brazil, Italy, Greece, Mexico, Thailand, and Iceland.

| Country | File name | Artwork focus | Ink palette |
| --- | --- | --- | --- |
| Afghanistan | `afghanistan.png` | a mountain pass, almond blossoms, carved lapis tile geometry, and a subtle caravan route curve | Deep indigo ink with muted lapis blue and warm sand accent |
| Albania | `albania.png` | a rugged mountain eagle silhouette, Ottoman arch detail, olive leaves, and Balkan stonework geometry | Dark crimson ink with charcoal black and antique gold accent |
| Algeria | `algeria.png` | Saharan dune forms, a desert arch, palm fronds, and refined North African tile geometry | Desert green ink with warm ochre and aged gold accent |
| Angola | `angola.png` | baobab branches, Kalandula Falls-inspired water shapes, woven textile geometry, and coastal wave marks | Burnt red ink with deep teal and antique gold accent |
| Antarctica | `antarctica.png` | glacier shelves, polar ridge lines, wind-carved ice arcs, and expedition map contours | Cold blue ink with pale cyan and muted silver accent |
| Argentina | `argentina.png` | Andes peaks, pampas grass, tango-inspired curves, and a subtle sun medallion | Deep sky blue ink with warm gold and muted slate accent |
| Armenia | `armenia.png` | Mount Ararat silhouette, pomegranate forms, carved khachkar-inspired geometry, and vine detail | Pomegranate red ink with antique gold and stone gray accent |
| Australia | `australia.png` | eucalyptus leaves, desert rock forms, reef wave curves, and a travel badge medallion | Terracotta ink with eucalyptus green and ocean blue accent |
| Austria | `austria.png` | Alpine peaks, edelweiss, Viennese ornamental scrollwork, and a subtle music-note curve with no readable notation | Deep burgundy ink with alpine green and antique gold accent |
| Azerbaijan | `azerbaijan.png` | flame-shaped architecture, Caspian wave lines, pomegranate detail, and carpet-inspired geometry | Deep teal ink with warm copper and muted red accent |
| Bahamas | `bahamas.png` | shell forms, turquoise reef curves, palm fronds, and island chart lines | Turquoise ink with coral pink and sandy gold accent |
| Bangladesh | `bangladesh.png` | river delta channels, water lilies, woven textile geometry, and monsoon cloud arcs | Deep green ink with warm red and muted clay accent |
| Belarus | `belarus.png` | forest branches, flax flowers, folk textile geometry, and lake-shore linework | Forest green ink with muted red and linen beige accent |
| Belgium | `belgium.png` | Art Nouveau curves, belfry silhouette, lace-like ornament, and a small heraldic shield shape without text | Deep umber ink with antique gold and muted red accent |
| Belize | `belize.png` | reef coral, tropical leaves, Maya-inspired stepped geometry, and lagoon wave marks | Jade green ink with turquoise and warm gold accent |
| Benin | `benin.png` | bronze relief-inspired forms, palm leaves, coastal wave curves, and geometric textile marks | Deep bronze ink with palm green and aged gold accent |
| Bhutan | `bhutan.png` | Himalayan peaks, prayer flag rhythm shapes without text, lotus detail, and ornate cloud curves | Saffron ink with deep red and alpine blue accent |
| Bolivia | `bolivia.png` | Andean peaks, salt-flat polygon shapes, woven textile geometry, and condor wing arcs | Deep red ink with mineral teal and warm gold accent |
| Bosnia and Herz. | `bosnia-and-herz.png` | bridge arch silhouette, mountain river curves, coffee-copper ornament, and Balkan stone pattern | Deep blue ink with copper and antique gold accent |
| Botswana | `botswana.png` | Okavango delta channels, acacia silhouette, basket-weave geometry, and desert grass marks | Deep teal ink with warm sand and charcoal accent |
| Brazil | `brazil.png` | tropical leaves, rainforest shapes, and carnival-inspired geometry | Rich green ink with warm gold accent and tiny deep blue detail |
| Brunei | `brunei.png` | mosque dome silhouette, rainforest leaves, river curves, and refined Malay textile ornament | Deep gold ink with forest green and maroon accent |
| Bulgaria | `bulgaria.png` | rose blossoms, Balkan mountain shapes, monastery arch detail, and folk embroidery geometry | Rose red ink with forest green and antique gold accent |
| Burkina Faso | `burkina-faso.png` | woven textile geometry, savanna grasses, baobab silhouette, and mask-inspired abstract marks | Earth red ink with charcoal and warm ochre accent |
| Burundi | `burundi.png` | drum-inspired circular forms, highland hills, coffee leaves, and woven linework | Deep red ink with leafy green and aged gold accent |
| Cambodia | `cambodia.png` | Angkor temple towers, lotus blossoms, naga-inspired curves, and water reflection shapes | Deep sienna ink with antique gold and lotus pink accent |
| Cameroon | `cameroon.png` | volcanic mountain silhouette, rainforest leaves, woven shield geometry, and river marks | Forest green ink with warm red and gold accent |
| Canada | `canada.png` | a maple leaf, pine branches, and subtle snowfield shapes | Deep red ink with muted forest green accent |
| Central African Rep. | `central-african-rep.png` | rainforest canopy forms, river bends, carved mask-inspired geometry, and savanna grasses | Deep green ink with warm ochre and rust accent |
| Chad | `chad.png` | Sahara dune arcs, Lake Chad water contours, camel caravan curves, and desert textile geometry | Warm ochre ink with deep blue and clay red accent |
| Chile | `chile.png` | Andes ridgelines, desert star shapes, coastal wave marks, and southern glacier curves | Deep navy ink with copper and glacier blue accent |
| China | `china.png` | mountain silhouettes, peony blossoms, cloud-scroll ornament, and carved seal geometry with no characters | Vermilion ink with antique gold and jade accent |
| Colombia | `colombia.png` | coffee branches, Andean ridge lines, tropical bird wing shapes, and river curves | Emerald ink with warm yellow and deep red accent |
| Congo | `congo.png` | Congo River curves, rainforest leaves, carved wood geometry, and woven border marks | Deep green ink with river blue and warm copper accent |
| Costa Rica | `costa-rica.png` | cloud forest leaves, volcano silhouette, toucan wing abstraction, and Pacific wave marks | Jade green ink with coral red and ocean blue accent |
| Cote d'Ivoire | `cote-divoire.png` | cocoa pod forms, Baule mask-inspired geometry, palm fronds, and lagoon curves | Cocoa brown ink with warm orange and deep green accent |
| Croatia | `croatia.png` | Adriatic wave shapes, stone city walls, lavender sprigs, and coastal tile geometry | Adriatic blue ink with muted red and limestone beige accent |
| Cuba | `cuba.png` | palm fronds, old Havana archwork, tobacco leaves, and Caribbean wave curves | Warm red ink with turquoise and aged gold accent |
| Cyprus | `cyprus.png` | olive branch forms, Mediterranean wave curves, ancient pottery geometry, and sun disk detail | Olive green ink with terracotta and antique gold accent |
| Czechia | `czechia.png` | Prague spire silhouettes, Bohemian glass facets, linden leaves, and ornamental bridge arches | Deep garnet ink with slate blue and antique gold accent |
| Dem. Rep. Congo | `dem-rep-congo.png` | rainforest canopy, river delta curves, okapi stripe-inspired marks, and copper mineral geometry | Deep teal ink with copper and forest green accent |
| Denmark | `denmark.png` | coastal lighthouse shape, Nordic wave marks, beech leaves, and clean royal ornament | Deep red ink with navy blue and warm cream accent |
| Djibouti | `djibouti.png` | salt lake crystal geometry, desert ridge lines, dhow sail curves, and Red Sea wave marks | Mineral teal ink with salt white and warm sand accent |
| Dominican Rep. | `dominican-rep.png` | palm leaves, merengue rhythm curves, mountain coast shapes, and colonial arch detail | Deep blue ink with warm red and tropical green accent |
| Ecuador | `ecuador.png` | Andean volcano, orchid detail, Galapagos wave forms, and equator-inspired circular geometry without text | Deep indigo ink with golden yellow and leaf green accent |
| Egypt | `egypt.png` | pyramids, a scarab, sun disk, and subtle hieroglyph-inspired geometry | Warm sienna ink with aged gold accent |
| El Salvador | `el-salvador.png` | volcano silhouettes, coffee leaves, indigo textile geometry, and Pacific wave marks | Deep indigo ink with volcanic red and warm gold accent |
| Eq. Guinea | `eq-guinea.png` | island coastline curves, rainforest leaves, cacao forms, and carved wood geometry | Deep green ink with cacao brown and ocean blue accent |
| Eritrea | `eritrea.png` | Red Sea wave marks, acacia branches, highland ridge lines, and woven ornament | Deep red ink with sea blue and warm gold accent |
| Estonia | `estonia.png` | pine forest silhouettes, Baltic wave marks, folk pattern geometry, and a northern star shape | Deep blue ink with forest green and pale silver accent |
| eSwatini | `eswatini.png` | shield-inspired abstract geometry, mountain grass forms, woven textile marks, and aloe leaves | Deep red ink with cobalt blue and warm ochre accent |
| Ethiopia | `ethiopia.png` | highland terraces, coffee branches, rock-hewn arch shapes, and sunburst geometry | Deep green ink with warm gold and red accent |
| Falkland Is. | `falkland-is.png` | windswept coastal cliffs, tussock grass, wave marks, and expedition map contours | Deep navy ink with muted kelp green and pale gray accent |
| Fiji | `fiji.png` | double-hulled canoe sail forms, palm fronds, coral reef curves, and woven tapa geometry | Ocean teal ink with warm coral and sandy gold accent |
| Finland | `finland.png` | pine branches, lake contours, aurora arcs, and clean Nordic textile geometry | Deep blue ink with pine green and icy silver accent |
| Fr. S. Antarctic Lands | `fr-s-antarctic-lands.png` | subantarctic island ridges, glacier edges, sea-bird wing abstraction, and ocean chart curves | Deep ultramarine ink with ice blue and muted gray accent |
| France | `france.png` | an Eiffel Tower silhouette, fleur-de-lis ornament, and Art Nouveau curves | French blue ink with restrained antique gold accent |
| Gabon | `gabon.png` | rainforest leaves, river estuary curves, carved mask-inspired geometry, and coastal wave marks | Deep green ink with warm yellow and ocean blue accent |
| Gambia | `gambia.png` | river ribbon curves, baobab silhouette, woven basket geometry, and mangrove leaf marks | River blue ink with warm ochre and deep green accent |
| Georgia | `georgia.png` | Caucasus mountain peaks, grapevine forms, monastery arch silhouette, and carved stone ornament | Wine red ink with antique gold and mountain gray accent |
| Germany | `germany.png` | castle tower silhouette, oak leaves, Bauhaus-inspired geometric balance, and river curve detail | Charcoal ink with deep red and antique gold accent |
| Ghana | `ghana.png` | kente-inspired geometry, cocoa leaves, coastal fort arch shapes, and warm sun medallion | Deep gold ink with black and red accent |
| Greece | `greece.png` | classical columns, an olive branch, Aegean wave shapes, and a subtle meander motif | Aegean blue ink with antique gold accent |
| Greenland | `greenland.png` | iceberg silhouettes, fjord contours, aurora arcs, and expedition chart linework | Arctic teal ink with ice blue and muted violet accent |
| Guatemala | `guatemala.png` | volcanic peaks, quetzal feather abstraction, Maya-inspired stepped geometry, and coffee leaves | Jade green ink with warm red and antique gold accent |
| Guinea | `guinea.png` | highland ridge lines, kola nut forms, woven textile geometry, and river source curves | Deep red ink with forest green and warm gold accent |
| Guinea-Bissau | `guinea-bissau.png` | mangrove leaves, island water channels, cashew forms, and woven coastal geometry | Deep green ink with warm red and river blue accent |
| Guyana | `guyana.png` | rainforest canopy, waterfall ribbons, river curves, and diamond mineral geometry | Deep emerald ink with gold and river blue accent |
| Haiti | `haiti.png` | mountain coastline forms, hibiscus petals, ironwork-inspired curves, and Caribbean wave marks | Deep blue ink with warm red and coral accent |
| Honduras | `honduras.png` | cloud forest leaves, Maya-inspired stone geometry, coastal reef curves, and coffee branches | Deep blue ink with jade green and warm gold accent |
| Hungary | `hungary.png` | Danube river curves, thermal bath arch detail, paprika flower forms, and folk embroidery geometry | Deep red ink with teal and antique gold accent |
| Iceland | `iceland.png` | glacier peaks, aurora bands, and volcanic ridge shapes | Teal ink with muted violet accent |
| India | `india.png` | lotus blossom, palace arch forms, monsoon cloud curves, and intricate textile mandala geometry without text | Saffron ink with indigo and deep green accent |
| Indonesia | `indonesia.png` | volcanic island silhouettes, batik-inspired geometry, palm leaves, and ocean wave curves | Deep indigo ink with warm red and antique gold accent |
| Iran | `iran.png` | Persian garden arch, pomegranate forms, tile geometry, and mountain linework | Deep turquoise ink with pomegranate red and antique gold accent |
| Iraq | `iraq.png` | Mesopotamian reed forms, date palm branches, river twin curves, and clay tablet-inspired geometry without writing | Warm clay ink with deep teal and aged gold accent |
| Ireland | `ireland.png` | Celtic knot-inspired geometry, coastal cliff shapes, shamrock leaves, and rain-soft wave marks | Deep green ink with antique gold and slate blue accent |
| Israel | `israel.png` | olive branches, desert hill contours, ancient stone arch forms, and Mediterranean wave marks | Deep blue ink with olive green and warm sand accent |
| Italy | `italy.png` | a Roman column, olive branch, Renaissance medallion shape, and terracotta detail | Deep olive green ink with muted red accent |
| Jamaica | `jamaica.png` | palm leaves, mountain coastline curves, hibiscus petals, and rhythmic sunburst geometry | Deep green ink with golden yellow and black accent |
| Japan | `japan.png` | Mount Fuji, a torii gate, and sakura petals | Deep red ink with subtle warm gold accent |
| Jordan | `jordan.png` | Petra rock-cut arch silhouette, desert canyon lines, olive leaves, and Nabataean-inspired geometry without text | Rose sandstone ink with deep teal and aged gold accent |
| Kazakhstan | `kazakhstan.png` | steppe eagle wing shapes, yurt roof geometry, mountain horizon, and sun medallion detail | Sky blue ink with warm gold and deep ochre accent |
| Kenya | `kenya.png` | acacia tree silhouette, savanna grass marks, Great Rift ridge lines, and beadwork-inspired geometry | Deep red ink with black and savanna gold accent |
| Kosovo | `kosovo.png` | mountain ridge lines, stone tower silhouette, filigree ornament, and river valley curves | Deep blue ink with antique gold and slate gray accent |
| Kuwait | `kuwait.png` | dhow sail forms, desert horizon curves, pearl shell detail, and Gulf wave marks | Deep navy ink with warm sand and muted red accent |
| Kyrgyzstan | `kyrgyzstan.png` | Tien Shan peaks, yurt crown geometry, felt textile motifs, and horse trail curves | Deep red ink with alpine blue and antique gold accent |
| Laos | `laos.png` | Mekong river curves, temple roofline, lotus petals, and mountain mist shapes | Deep indigo ink with antique gold and leaf green accent |
| Latvia | `latvia.png` | Baltic pine branches, river bend curves, folk belt geometry, and amber droplet forms | Deep burgundy ink with amber gold and forest green accent |
| Lebanon | `lebanon.png` | cedar tree silhouette, Mediterranean wave marks, mountain terrace lines, and mosaic geometry | Cedar green ink with deep red and antique gold accent |
| Lesotho | `lesotho.png` | Drakensberg mountain shapes, woven blanket geometry, grassland curves, and circular hat-inspired form | Deep blue ink with warm ochre and green accent |
| Liberia | `liberia.png` | Atlantic wave curves, rubber tree leaves, coastal lighthouse shape, and quilt-like geometry | Deep navy ink with warm red and palm green accent |
| Libya | `libya.png` | Sahara dune arcs, desert arch ruins, palm oasis forms, and Mediterranean wave marks | Warm ochre ink with deep green and black accent |
| Lithuania | `lithuania.png` | oak leaves, Baltic wave marks, amber facets, and folk sash geometry | Deep green ink with amber gold and muted red accent |
| Luxembourg | `luxembourg.png` | castle wall silhouette, river valley curves, vineyard leaves, and refined heraldic geometry without text | Deep blue ink with antique gold and wine red accent |
| Macedonia | `macedonia.png` | mountain lake curves, sunburst medallion geometry, Byzantine arch detail, and grapevine forms | Deep red ink with antique gold and lake blue accent |
| Madagascar | `madagascar.png` | baobab silhouettes, lemur-tail abstract curves, vanilla orchid detail, and island coastline marks | Warm rust ink with leafy green and orchid purple accent |
| Malawi | `malawi.png` | lake wave curves, mountain ridge lines, tea leaves, and woven basket geometry | Deep lake blue ink with warm red and leaf green accent |
| Malaysia | `malaysia.png` | hibiscus flower, rainforest canopy, Islamic geometric ornament, and island wave curves | Deep teal ink with warm red and antique gold accent |
| Mali | `mali.png` | mud-brick mosque silhouette, Niger River curves, desert textile geometry, and baobab detail | Earth brown ink with deep green and warm gold accent |
| Mauritania | `mauritania.png` | Sahara dune arcs, oasis palms, caravan route curves, and Moorish arch geometry | Desert green ink with warm gold and sand accent |
| Mexico | `mexico.png` | Aztec-inspired geometry, agave leaves, and marigold petals | Warm red ink with muted green accent and aged gold flecks |
| Moldova | `moldova.png` | grapevine leaves, rolling hill lines, monastery arch detail, and woven folk geometry | Deep wine ink with leaf green and antique gold accent |
| Mongolia | `mongolia.png` | steppe horizon, yurt silhouette, horse mane arcs, and felt textile geometry | Deep blue ink with warm red and antique gold accent |
| Montenegro | `montenegro.png` | coastal mountain cliffs, Adriatic wave shapes, monastery arch detail, and laurel leaves | Deep teal ink with antique gold and stone gray accent |
| Morocco | `morocco.png` | zellige tile geometry, desert arch, palm fronds, and Atlas mountain linework | Deep indigo ink with terracotta and antique gold accent |
| Mozambique | `mozambique.png` | Indian Ocean wave curves, baobab forms, woven textile geometry, and island shoreline marks | Ocean blue ink with warm red and palm green accent |
| Myanmar | `myanmar.png` | pagoda silhouette, lotus blossoms, Irrawaddy river curves, and lacquerware-inspired ornament | Deep maroon ink with antique gold and jade accent |
| N. Cyprus | `n-cyprus.png` | Mediterranean wave marks, olive branches, castle wall detail, and ancient pottery geometry | Deep teal ink with olive green and terracotta accent |
| Namibia | `namibia.png` | desert dune arcs, quiver tree silhouette, coastal fog curves, and mineral geometry | Rust orange ink with deep blue and charcoal accent |
| Nepal | `nepal.png` | Himalayan peak forms, prayer flag rhythm shapes without text, rhododendron blossoms, and temple roofline | Deep crimson ink with alpine blue and warm gold accent |
| Netherlands | `netherlands.png` | canal bridge curves, tulip forms, windmill silhouette, and Delft tile ornament | Deep blue ink with tulip red and antique cream accent |
| New Caledonia | `new-caledonia.png` | lagoon reef curves, palm fronds, carved post-inspired geometry, and island mountain shapes | Turquoise ink with warm coral and deep green accent |
| New Zealand | `new-zealand.png` | fern fronds, mountain fjord lines, wave curves, and carved koru-inspired spiral geometry | Deep green ink with slate blue and warm gold accent |
| Nicaragua | `nicaragua.png` | twin volcano silhouettes, lake island curves, coffee leaves, and folk pottery geometry | Deep blue ink with volcanic red and leaf green accent |
| Niger | `niger.png` | Sahel dune forms, river bend curves, millet stalks, and desert textile geometry | Warm ochre ink with deep green and clay orange accent |
| Nigeria | `nigeria.png` | Niger River curves, bronze mask-inspired abstraction, palm leaves, and woven textile geometry | Deep green ink with bronze and charcoal accent |
| North Korea | `north-korea.png` | mountain ridgeline, pine branches, river curves, and clean medallion geometry with no symbols or text | Deep red ink with slate blue and muted gold accent |
| Norway | `norway.png` | fjord contours, pine branches, aurora arcs, and Nordic knot geometry | Deep navy ink with icy teal and muted red accent |
| Oman | `oman.png` | desert fort arch silhouette, frankincense branch forms, dhow sail curves, and Gulf wave marks | Deep red ink with warm sand and sea green accent |
| Pakistan | `pakistan.png` | mountain peak silhouettes, Mughal arch detail, jasmine blossoms, and Indus river curves | Deep green ink with ivory and antique gold accent |
| Palestine | `palestine.png` | olive branches, ancient stone arch, terraced hill lines, and embroidered geometry | Deep green ink with warm red and charcoal accent |
| Panama | `panama.png` | isthmus wave curves, tropical leaves, canal lock-inspired geometry, and golden frog abstraction | Deep teal ink with warm gold and leaf green accent |
| Papua New Guinea | `papua-new-guinea.png` | bird-of-paradise feather abstraction, mountain rainforest forms, canoe curves, and barkcloth geometry | Deep black ink with warm red and golden yellow accent |
| Paraguay | `paraguay.png` | yerba mate leaves, river curves, lace-inspired nanduti geometry, and palm forms | Deep red ink with river blue and leafy green accent |
| Peru | `peru.png` | Andean terraces, condor wing arcs, woven textile geometry, and mountain sun shapes | Deep crimson ink with warm gold and alpaca-brown accent |
| Philippines | `philippines.png` | island wave curves, sampaguita flowers, palm leaves, and woven sunburst geometry | Deep blue ink with warm gold and coral accent |
| Poland | `poland.png` | mountain pine forms, folk paper-cut floral geometry, castle silhouette, and river curve detail | Deep red ink with charcoal and antique cream accent |
| Portugal | `portugal.png` | azulejo tile geometry, sailing compass curves, olive leaves, and Atlantic wave marks | Deep cobalt ink with warm terracotta and antique gold accent |
| Puerto Rico | `puerto-rico.png` | tropical hibiscus, old fort silhouette, coqui-inspired abstract curves, and Caribbean wave marks | Deep blue ink with warm red and coral accent |
| Qatar | `qatar.png` | desert dune arcs, pearl shell forms, dhow sail silhouette, and Gulf wave geometry | Deep maroon ink with warm sand and antique gold accent |
| Romania | `romania.png` | Carpathian ridge lines, monastery arch detail, folk embroidery geometry, and sunflower forms | Deep blue ink with warm gold and red accent |
| Russia | `russia.png` | birch branches, onion dome silhouettes, snowfield curves, and folk ornament geometry without text | Deep red ink with icy blue and antique gold accent |
| Rwanda | `rwanda.png` | rolling hill contours, coffee leaves, basket-weave geometry, and lake wave marks | Leaf green ink with sky blue and warm gold accent |
| S. Sudan | `s-sudan.png` | Nile river curves, acacia silhouette, beadwork-inspired geometry, and savanna grasses | Deep blue ink with warm ochre and red accent |
| Saudi Arabia | `saudi-arabia.png` | desert dune arcs, palm oasis forms, geometric mashrabiya ornament, and Red Sea wave marks | Deep green ink with warm gold and sand accent |
| Senegal | `senegal.png` | baobab silhouette, Atlantic wave marks, woven textile geometry, and kora-inspired curve shapes | Deep green ink with warm gold and red accent |
| Serbia | `serbia.png` | monastery arch silhouette, river confluence curves, plum blossom detail, and Balkan textile geometry | Deep red ink with slate blue and antique gold accent |
| Sierra Leone | `sierra-leone.png` | coastal mountain curves, palm leaves, diamond facet geometry, and Atlantic wave marks | Deep blue ink with leaf green and warm gold accent |
| Slovakia | `slovakia.png` | Tatra mountain peaks, folk embroidery geometry, linden leaves, and castle ridge forms | Deep blue ink with warm red and antique gold accent |
| Slovenia | `slovenia.png` | Alpine peaks, lake island church silhouette, linden leaves, and clean folk geometry | Alpine green ink with lake blue and antique gold accent |
| Solomon Is. | `solomon-is.png` | canoe prow curves, reef wave marks, palm leaves, and shell-inlay geometry | Ocean teal ink with warm shell gold and deep green accent |
| Somalia | `somalia.png` | dhow sail forms, acacia branches, Indian Ocean wave marks, and desert star geometry without text | Deep blue ink with warm sand and sea green accent |
| Somaliland | `somaliland.png` | desert ridge lines, camel caravan curves, acacia forms, and woven geometric marks | Deep green ink with warm ochre and charcoal accent |
| South Africa | `south-africa.png` | protea flower, Table Mountain silhouette, savanna grass marks, and beadwork geometry | Deep green ink with gold and coral red accent |
| South Korea | `south-korea.png` | mountain temple roofline, plum blossoms, wave-cloud curves, and hanji-inspired geometry without text | Deep indigo ink with warm red and antique gold accent |
| Spain | `spain.png` | Moorish arch geometry, olive branches, flamenco curve forms, and sun medallion detail | Deep red ink with warm gold and cobalt accent |
| Sri Lanka | `sri-lanka.png` | tea leaves, lotus blossom, coastal wave marks, and temple moonstone-inspired geometry | Deep cinnamon ink with leaf green and antique gold accent |
| Sudan | `sudan.png` | Nile river curves, desert pyramids, acacia forms, and Nubian textile geometry | Warm sienna ink with deep green and black accent |
| Suriname | `suriname.png` | rainforest leaves, river braid curves, carved wood geometry, and tropical flower forms | Deep green ink with warm red and gold accent |
| Sweden | `sweden.png` | pine forest silhouettes, archipelago island curves, folk floral geometry, and northern light arcs | Deep blue ink with golden yellow and pine green accent |
| Switzerland | `switzerland.png` | Alpine peak forms, edelweiss, watch-gear circular geometry, and lake contour lines | Deep red ink with slate gray and alpine blue accent |
| Syria | `syria.png` | ancient arch ruins, olive branches, desert ridge lines, and mosaic geometry without text | Warm clay ink with deep green and antique gold accent |
| Taiwan | `taiwan.png` | mountain ridges, plum blossoms, tea leaves, and ocean wave curves | Deep teal ink with warm red and antique gold accent |
| Tajikistan | `tajikistan.png` | Pamir mountain peaks, cotton blossoms, woven textile geometry, and river valley curves | Deep crimson ink with alpine blue and warm gold accent |
| Tanzania | `tanzania.png` | Kilimanjaro silhouette, acacia branches, coastal dhow sail curves, and savanna grass marks | Deep green ink with warm gold and ocean blue accent |
| Thailand | `thailand.png` | a temple roofline, lotus blossom, and refined gold leaf-inspired ornament | Deep rose ink with soft antique gold accent |
| Timor-Leste | `timor-leste.png` | island mountain forms, tais textile geometry, coffee leaves, and ocean wave marks | Deep red ink with black and warm gold accent |
| Togo | `togo.png` | palm leaves, coastal wave curves, woven textile geometry, and market canopy shapes | Deep green ink with warm yellow and red accent |
| Trinidad and Tobago | `trinidad-and-tobago.png` | steelpan-inspired circular forms without text, tropical bird wing shapes, palm leaves, and Caribbean wave marks | Deep red ink with black and turquoise accent |
| Tunisia | `tunisia.png` | desert arch forms, olive branches, mosaic tile geometry, and Mediterranean wave marks | Deep red ink with turquoise and warm sand accent |
| Turkey | `turkey.png` | Bosphorus wave curves, tulip forms, Ottoman tile geometry, and domed skyline silhouette | Deep crimson ink with turquoise and antique gold accent |
| Turkmenistan | `turkmenistan.png` | desert horse silhouette, carpet medallion geometry, dune arcs, and oasis palm marks | Deep green ink with warm red and antique gold accent |
| Uganda | `uganda.png` | lake wave marks, crane feather abstraction, coffee leaves, and highland hill contours | Deep black ink with warm gold and red accent |
| Ukraine | `ukraine.png` | wheat stalks, sunflower forms, Carpathian ridge lines, and folk embroidery geometry | Deep blue ink with warm yellow and field green accent |
| United Arab Emirates | `united-arab-emirates.png` | desert dune arcs, falcon wing abstraction, palm fronds, and modern geometric skyline forms without text | Deep emerald ink with warm gold and sand accent |
| United Kingdom | `united-kingdom.png` | rose and thistle botanical forms, bridge arch detail, crown-like ornamental geometry without text, and rain wave marks | Deep navy ink with antique gold and muted red accent |
| United States of America | `united-states-of-america.png` | national park mountain forms, eagle wing abstraction, prairie star geometry, and coastal wave marks | Deep navy ink with muted red and antique gold accent |
| Uruguay | `uruguay.png` | pampas grass, coastline wave marks, Art Deco sun medallion, and mate leaf detail | Deep blue ink with warm gold and leaf green accent |
| Uzbekistan | `uzbekistan.png` | Silk Road arch forms, pomegranate detail, ceramic tile geometry, and desert oasis curves | Turquoise ink with warm gold and deep red accent |
| Vanuatu | `vanuatu.png` | volcanic island forms, palm leaves, outrigger canoe curves, and sand drawing-inspired geometry | Deep green ink with warm red and ocean blue accent |
| Venezuela | `venezuela.png` | tepui mountain silhouette, waterfall ribbons, tropical orchid detail, and river curve marks | Deep burgundy ink with golden yellow and teal accent |
| Vietnam | `vietnam.png` | terraced rice fields, lotus blossoms, limestone karst forms, and river delta curves | Deep green ink with warm red and antique gold accent |
| W. Sahara | `w-sahara.png` | desert dune arcs, nomadic tent geometry, camel trail curves, and Atlantic coast marks | Warm sand ink with deep teal and rust accent |
| Yemen | `yemen.png` | mountain village tower silhouettes, coffee branches, desert terrace lines, and geometric window ornament | Deep coffee brown ink with warm red and antique gold accent |
| Zambia | `zambia.png` | waterfall mist curves, copper mineral facets, savanna grass marks, and eagle wing abstraction | Deep green ink with copper and river blue accent |
| Zimbabwe | `zimbabwe.png` | stone ruin tower silhouette, balancing rock forms, savanna grasses, and soapstone bird abstraction | Earth red ink with deep green and antique gold accent |

## Japan

```text
Create a premium collectible passport stamp centerpiece illustration for Japan. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring Mount Fuji, a torii gate, and sakura petals. Deep red ink with subtle warm gold accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## France

```text
Create a premium collectible passport stamp centerpiece illustration for France. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring an Eiffel Tower silhouette, fleur-de-lis ornament, and Art Nouveau curves. French blue ink with restrained antique gold accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Canada

```text
Create a premium collectible passport stamp centerpiece illustration for Canada. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring a maple leaf, pine branches, and subtle snowfield shapes. Deep red ink with muted forest green accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Egypt

```text
Create a premium collectible passport stamp centerpiece illustration for Egypt. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring pyramids, a scarab, sun disk, and subtle hieroglyph-inspired geometry. Warm sienna ink with aged gold accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Brazil

```text
Create a premium collectible passport stamp centerpiece illustration for Brazil. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring tropical leaves, rainforest shapes, and carnival-inspired geometry. Rich green ink with warm gold accent and tiny deep blue detail. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Italy

```text
Create a premium collectible passport stamp centerpiece illustration for Italy. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring a Roman column, olive branch, Renaissance medallion shape, and terracotta detail. Deep olive green ink with muted red accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Greece

```text
Create a premium collectible passport stamp centerpiece illustration for Greece. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring classical columns, an olive branch, Aegean wave shapes, and a subtle meander motif. Aegean blue ink with antique gold accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Mexico

```text
Create a premium collectible passport stamp centerpiece illustration for Mexico. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring Aztec-inspired geometry, agave leaves, and marigold petals. Warm red ink with muted green accent and aged gold flecks. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Thailand

```text
Create a premium collectible passport stamp centerpiece illustration for Thailand. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring a temple roofline, lotus blossom, and refined gold leaf-inspired ornament. Deep rose ink with soft antique gold accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Iceland

```text
Create a premium collectible passport stamp centerpiece illustration for Iceland. Transparent background. Vintage passport ink style. Handcrafted travel ephemera aesthetic. Imperfect ink bleed, worn printed texture, elegant emblem featuring glacier peaks, aurora bands, and volcanic ridge shapes. Teal ink with muted violet accent. Strong centered silhouette with generous padding. No text, no numbers, no border, no paper background, no mockup.
```

## Negative Prompt

```text
Avoid realistic passport pages, full-page mockups, rectangular paper backgrounds, country names, airport codes, dates, random letters, readable text, QR codes, barcodes, flags as the main subject, glossy stickers, cartoon clipart, flat vector icons, overly clean line art, photorealistic scenery, drop shadows, cast shadows, and busy background texture.
```

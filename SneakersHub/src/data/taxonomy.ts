// 3-level marketplace taxonomy: main -> sub -> mini.
// DB columns: category (main label), subcategory (sub label), subcategory2 (mini label).

export type CategoryNode = {
  id: string;
  label: string;
  img?: string;
  icon?: string;
  children?: CategoryNode[];
};

export type TaxonomyPath = {
  main: CategoryNode;
  sub?: CategoryNode;
  mini?: CategoryNode;
};

export const TAXONOMY: CategoryNode[] = [
  {
    id: "phones-tablets",
    label: "Phones & Tablets",
    img: "/categoryimages/phones.jpg",
    children: [
      {
        id: "mobile-phones",
        label: "Mobile Phones",
        icon: "/subcategory-icons/mobile-phones.png",
        children: [
          { id: "smartphones", label: "Smartphones" },
          { id: "ios-phones", label: "iOS Phones" },
          { id: "android-phones", label: "Android Phones" },
          { id: "basic-phones", label: "Basic & Feature Phones" },
          { id: "refurbished-phones", label: "Refurbished & Used" },
        ],
      },
      {
        id: "tablets",
        label: "Tablets",
        icon: "/subcategory-icons/tablets.png",
        children: [
          { id: "ipads", label: "iPads" },
          { id: "android-tablets", label: "Android Tablets" },
          { id: "kids-tablets", label: "Kids' Tablets" },
          { id: "used-tablets", label: "Refurbished & Used" },
          { id: "tablet-accessories", label: "Tablet Accessories" },
        ],
      },
      {
        id: "phone-accessories",
        label: "Phone Accessories",
        icon: "/subcategory-icons/phone-accessories.png",
        children: [
          { id: "cases-covers", label: "Cases & Covers" },
          { id: "screen-protectors", label: "Screen Protectors" },
          { id: "chargers-cables", label: "Chargers & Cables" },
          { id: "power-banks", label: "Power Banks" },
          { id: "earbuds-headsets", label: "Earbuds & Headsets" },
          { id: "memory-cards", label: "Memory Cards & Storage" },
          { id: "stands-holders", label: "Phone Stands & Holders" },
        ],
      },
      {
        id: "phone-parts",
        label: "Phone Parts",
        icon: "/subcategory-icons/phone-parts.png",
        children: [
          { id: "screens", label: "Screens" },
          { id: "batteries", label: "Batteries" },
          { id: "charging-ports", label: "Charging Ports" },
          { id: "back-panels", label: "Back Panels & Housings" },
          { id: "motherboards", label: "Motherboards" },
        ],
      },
    ],
  },
  {
    id: "electronics",
    label: "Electronics",
    img: "/categoryimages/electronics.jpg",
    children: [
      {
        id: "tvs-video",
        label: "TVs & Video",
        icon: "/subcategory-icons/tvs-video.png",
        children: [
          { id: "smart-tvs", label: "Smart TVs" },
          { id: "led-tvs", label: "LED & LCD TVs" },
          { id: "projectors", label: "Projectors" },
          { id: "tv-stands", label: "TV Stands & Mounts" },
          { id: "dvd-players", label: "DVD & Blu-ray Players" },
        ],
      },
      {
        id: "audio-speakers",
        label: "Audio & Speakers",
        icon: "/subcategory-icons/audio-speakers.png",
        children: [
          { id: "bluetooth-speakers", label: "Bluetooth Speakers" },
          { id: "soundbars", label: "Soundbars & Home Theatre" },
          { id: "headphones", label: "Headphones & Earphones" },
          { id: "hi-fi", label: "Hi-Fi & Turntables" },
          { id: "microphones", label: "Microphones & Recording" },
        ],
      },
      {
        id: "cameras-drones",
        label: "Cameras & Drones",
        icon: "/subcategory-icons/cameras-drones.png",
        children: [
          { id: "dslr-mirrorless", label: "DSLR & Mirrorless" },
          { id: "point-shoot", label: "Point & Shoot" },
          { id: "lenses", label: "Lenses & Accessories" },
          { id: "tripods", label: "Camera Bags & Tripods" },
          { id: "drones", label: "Drones & Accessories" },
          { id: "action-cameras", label: "Action Cameras" },
        ],
      },
      {
        id: "gaming",
        label: "Gaming",
        icon: "/subcategory-icons/gaming.png",
        children: [
          { id: "consoles", label: "Consoles" },
          { id: "games", label: "Games" },
          { id: "controllers", label: "Controllers" },
          { id: "gaming-pcs", label: "Gaming PCs & Laptops" },
          { id: "vr", label: "VR Headsets" },
          { id: "gaming-accessories", label: "Gaming Accessories" },
        ],
      },
      {
        id: "wearables",
        label: "Wearables",
        icon: "/subcategory-icons/wearables.png",
        children: [
          { id: "smartwatches", label: "Smartwatches" },
          { id: "fitness-trackers", label: "Fitness Trackers" },
          { id: "smart-bands", label: "Smart Bands" },
          { id: "wearable-accessories", label: "Accessories" },
        ],
      },
      {
        id: "computers",
        label: "Computers & Laptops",
        icon: "/subcategory-icons/computers.png",
        children: [
          { id: "laptops", label: "Laptops" },
          { id: "macbooks", label: "MacBooks" },
          { id: "desktops", label: "Desktops & All-in-Ones" },
          { id: "monitors", label: "Monitors" },
          { id: "used-computers", label: "Refurbished & Used" },
        ],
      },
      {
        id: "computer-accessories",
        label: "Computer Accessories",
        icon: "/subcategory-icons/computer-accessories.png",
        children: [
          { id: "keyboards-mice", label: "Keyboards & Mice" },
          { id: "webcams-headsets", label: "Webcams & Headsets" },
          { id: "hubs-docks", label: "USB Hubs & Docks" },
          { id: "laptop-bags", label: "Laptop Stands & Bags" },
          { id: "storage", label: "SSD & Hard Drives" },
          { id: "components", label: "RAM & Components" },
        ],
      },
      {
        id: "networking-smart-home",
        label: "Networking & Smart Home",
        icon: "/subcategory-icons/networking-smart-home.png",
        children: [
          { id: "routers", label: "Routers & Modems" },
          { id: "wi-fi", label: "Wi-Fi Extenders" },
          { id: "smart-speakers", label: "Smart Speakers" },
          { id: "security-cameras", label: "Security Cameras & CCTV" },
          { id: "smart-home", label: "Smart Home Devices" },
        ],
      },
    ],
  },
  {
    id: "fashion",
    label: "Fashion",
    img: "/categoryimages/clothes.jpg",
    children: [
      {
        id: "womens-clothing",
        label: "Women's Clothing",
        icon: "/subcategory-icons/womens-clothing.png",
        children: [
          { id: "dresses", label: "Dresses & Jumpsuits" },
          { id: "tops-tees", label: "Tops & Tees" },
          { id: "jeans-bottoms", label: "Jeans & Bottoms" },
          { id: "skirts", label: "Skirts & Shorts" },
          { id: "outerwear", label: "Outerwear & Jackets" },
          { id: "sleepwear", label: "Sleepwear & Loungewear" },
          { id: "underwear", label: "Underwear & Lingerie" },
          { id: "maternity", label: "Maternity" },
        ],
      },
      {
        id: "mens-clothing",
        label: "Men's Clothing",
        icon: "/subcategory-icons/mens-clothing.png",
        children: [
          { id: "shirts", label: "Shirts" },
          { id: "t-shirts", label: "T-Shirts & Polos" },
          { id: "jeans-bottoms-men", label: "Jeans & Bottoms" },
          { id: "suits", label: "Suits & Blazers" },
          { id: "outerwear-men", label: "Outerwear & Jackets" },
          { id: "underwear-men", label: "Underwear & Sleepwear" },
        ],
      },
      {
        id: "kids-clothing",
        label: "Kids' Clothing",
        icon: "/subcategory-icons/kids-clothing.png",
        children: [
          { id: "boys", label: "Boys' Clothing" },
          { id: "girls", label: "Girls' Clothing" },
          { id: "baby-toddler", label: "Baby & Toddler" },
          { id: "school-uniforms", label: "School Uniforms" },
        ],
      },
      {
        id: "footwear",
        label: "Footwear",
        icon: "/subcategory-icons/footwear.png",
        children: [
          { id: "sneakers", label: "Sneakers & Trainers" },
          { id: "heels-flats", label: "Heels & Flats" },
          { id: "boots", label: "Boots" },
          { id: "sandals-slippers", label: "Sandals & Slippers" },
          { id: "loafers", label: "Loafers & Dress Shoes" },
          { id: "mens-shoes", label: "Men's Shoes" },
          { id: "womens-shoes", label: "Women's Shoes" },
          { id: "kids-shoes", label: "Kids' Shoes" },
        ],
      },
      {
        id: "bags-luggage",
        label: "Bags & Luggage",
        icon: "/subcategory-icons/bags-luggage.png",
        children: [
          { id: "handbags", label: "Handbags" },
          { id: "backpacks", label: "Backpacks & Rucksacks" },
          { id: "wallets", label: "Wallets & Cardholders" },
          { id: "luggage", label: "Luggage & Travel" },
          { id: "tote-bags", label: "Tote Bags" },
          { id: "clutches", label: "Clutches & Evening Bags" },
        ],
      },
      {
        id: "jewellery-watches",
        label: "Jewellery & Watches",
        icon: "/subcategory-icons/jewellery-watches.png",
        children: [
          { id: "rings", label: "Rings" },
          { id: "necklaces", label: "Necklaces & Pendants" },
          { id: "bracelets", label: "Bracelets & Bangles" },
          { id: "earrings", label: "Earrings" },
          { id: "watches", label: "Watches" },
          { id: "body-jewellery", label: "Body Jewellery" },
        ],
      },
      {
        id: "fashion-accessories",
        label: "Accessories",
        icon: "/subcategory-icons/fashion-accessories.png",
        children: [
          { id: "sunglasses", label: "Sunglasses & Eyewear" },
          { id: "belts", label: "Belts" },
          { id: "hats-caps", label: "Hats & Caps" },
          { id: "scarves-gloves", label: "Scarves & Gloves" },
          { id: "hair-accessories", label: "Hair Accessories" },
          { id: "socks-tights", label: "Socks & Tights" },
        ],
      },
      {
        id: "traditional-wear",
        label: "Traditional & Cultural Wear",
        icon: "/subcategory-icons/traditional-wear.png",
        children: [
          { id: "kente-prints", label: "Kente & Prints" },
          { id: "dashiki", label: "Dashiki & Shirts" },
          { id: "agbada", label: "Agbada & Boubous" },
          { id: "beads", label: "Beads & Adornments" },
        ],
      },
      {
        id: "uniforms-workwear",
        label: "Uniforms & Workwear",
        icon: "/subcategory-icons/uniforms-workwear.png",
        children: [
          { id: "school-uniforms-uniforms", label: "School Uniforms" },
          { id: "scrubs", label: "Scrubs & Medical" },
          { id: "chef-service", label: "Chef & Service Wear" },
          { id: "safety-workwear", label: "Safety & Construction" },
        ],
      },
    ],
  },
  {
    id: "health-beauty",
    label: "Health & Beauty",
    img: "/categoryimages/beauty.jpg",
    children: [
      {
        id: "skin-care",
        label: "Skin Care",
        icon: "/subcategory-icons/skin-care.png",
        children: [
          { id: "moisturizers", label: "Moisturizers & Creams" },
          { id: "cleansers", label: "Cleansers & Toners" },
          { id: "serums", label: "Serums & Treatments" },
          { id: "sun-care", label: "Sun Care & Tanning" },
          { id: "face-masks", label: "Face Masks & Sheets" },
        ],
      },
      {
        id: "makeup",
        label: "Makeup",
        icon: "/subcategory-icons/makeup.png",
        children: [
          { id: "face-makeup", label: "Face Makeup" },
          { id: "lip-makeup", label: "Lip Makeup" },
          { id: "eye-makeup", label: "Eye Makeup" },
          { id: "makeup-tools", label: "Makeup Tools & Bags" },
          { id: "makeup-sets", label: "Makeup Sets & Kits" },
        ],
      },
      {
        id: "hair-care",
        label: "Hair Care & Wigs",
        icon: "/subcategory-icons/hair-care.png",
        children: [
          { id: "shampoo-conditioner", label: "Shampoo & Conditioner" },
          { id: "wigs-extensions", label: "Wigs & Extensions" },
          { id: "styling", label: "Styling Products" },
          { id: "hair-tools", label: "Hair Tools & Dryers" },
          { id: "hair-color", label: "Hair Color" },
        ],
      },
      {
        id: "fragrances",
        label: "Fragrances & Perfumes",
        icon: "/subcategory-icons/fragrances.png",
        children: [
          { id: "womens-fragrance", label: "Women's Fragrances" },
          { id: "mens-fragrance", label: "Men's Fragrances" },
          { id: "unisex-fragrance", label: "Unisex Fragrances" },
          { id: "deodorants", label: "Deodorants & Body Sprays" },
        ],
      },
      {
        id: "mens-grooming",
        label: "Men's Grooming",
        icon: "/subcategory-icons/mens-grooming.png",
        children: [
          { id: "shaving", label: "Shaving & Razors" },
          { id: "beard-care", label: "Beard Care" },
          { id: "trimmers", label: "Trimmers & Clippers" },
        ],
      },
      {
        id: "bath-body",
        label: "Bath & Body",
        icon: "/subcategory-icons/bath-body.png",
        children: [
          { id: "body-wash", label: "Body Wash & Shower Gel" },
          { id: "soaps", label: "Bar Soaps" },
          { id: "body-lotion", label: "Body Lotion & Oil" },
          { id: "oral-care", label: "Oral Care" },
          { id: "nail-care", label: "Nail Care" },
        ],
      },
      {
        id: "health-wellness",
        label: "Health Care & Wellness",
        icon: "/subcategory-icons/health-wellness.png",
        children: [
          { id: "first-aid", label: "First Aid" },
          { id: "medical-equipment", label: "Medical Equipment & Monitors" },
          { id: "mobility-aids", label: "Mobility Aids" },
          { id: "massage", label: "Massage & Relaxation" },
          { id: "sexual-wellness", label: "Sexual Wellness" },
        ],
      },
      {
        id: "vitamins-supplements",
        label: "Vitamins & Supplements",
        icon: "/subcategory-icons/vitamins-supplements.png",
        children: [
          { id: "vitamins", label: "Vitamins & Minerals" },
          { id: "herbal", label: "Herbal & Natural" },
          { id: "weight-management", label: "Weight Management" },
          { id: "sports-supplements", label: "Sports Supplements" },
        ],
      },
      {
        id: "beauty-tools",
        label: "Beauty Tools",
        icon: "/subcategory-icons/beauty-tools.png",
        children: [
          { id: "mirrors", label: "Mirrors & Lighting" },
          { id: "devices", label: "Beauty Devices" },
          { id: "brushes", label: "Brushes & Sponges" },
        ],
      },
    ],
  },
  {
    id: "home-garden",
    label: "Home & Garden",
    img: "/categoryimages/furniture.jpg",
    children: [
      {
        id: "furniture",
        label: "Furniture",
        icon: "/subcategory-icons/furniture.png",
        children: [
          { id: "living-room", label: "Living Room Furniture" },
          { id: "bedroom", label: "Bedroom Furniture" },
          { id: "dining", label: "Dining & Kitchen Furniture" },
          { id: "office-furniture", label: "Office Furniture" },
          { id: "outdoor-furniture", label: "Outdoor & Garden Furniture" },
          { id: "mattresses", label: "Mattresses & Bedding Bases" },
        ],
      },
      {
        id: "kitchen-dining",
        label: "Kitchen & Dining",
        icon: "/subcategory-icons/kitchen-dining.png",
        children: [
          { id: "cookware", label: "Cookware & Pots" },
          { id: "cutlery", label: "Cutlery & Knives" },
          { id: "utensils", label: "Utensils & Gadgets" },
          { id: "dinnerware", label: "Dinnerware & Serveware" },
          { id: "kitchen-storage", label: "Kitchen Storage" },
          { id: "coffee-tea", label: "Coffee, Tea & Espresso" },
        ],
      },
      {
        id: "appliances",
        label: "Appliances",
        icon: "/subcategory-icons/appliances.png",
        children: [
          { id: "refrigerators", label: "Refrigerators & Freezers" },
          { id: "cookers", label: "Cookers & Ovens" },
          { id: "washing-machines", label: "Washing Machines" },
          { id: "microwaves", label: "Microwaves" },
          { id: "air-conditioners", label: "Air Conditioners" },
          { id: "small-appliances", label: "Small Appliances" },
          { id: "fans", label: "Fans & Air Purifiers" },
          { id: "water-dispensers", label: "Water Dispensers" },
        ],
      },
      {
        id: "bedding-bath",
        label: "Bedding & Bath",
        icon: "/subcategory-icons/bedding-bath.png",
        children: [
          { id: "bed-sheets", label: "Bed Sheets & Covers" },
          { id: "blankets", label: "Blankets & Throws" },
          { id: "pillows", label: "Pillows & Cushions" },
          { id: "towels", label: "Towels" },
          { id: "bath-accessories", label: "Bath Accessories" },
        ],
      },
      {
        id: "home-decor",
        label: "Home Decor",
        icon: "/subcategory-icons/home-decor.png",
        children: [
          { id: "wall-art", label: "Wall Art & Frames" },
          { id: "vases", label: "Vases & Decorative Accessories" },
          { id: "clocks", label: "Clocks & Mirrors" },
          { id: "candles", label: "Candles & Home Fragrance" },
          { id: "rugs", label: "Rugs & Carpets" },
          { id: "party-supplies", label: "Party & Event Supplies" },
        ],
      },
      {
        id: "lighting",
        label: "Lighting",
        icon: "/subcategory-icons/lighting.png",
        children: [
          { id: "lamps", label: "Lamps & Floor Lights" },
          { id: "ceiling", label: "Ceiling & Pendant Lights" },
          { id: "bulbs", label: "Light Bulbs" },
          { id: "string-lights", label: "String & Decorative Lights" },
        ],
      },
      {
        id: "tools-improvement",
        label: "Tools & Home Improvement",
        icon: "/subcategory-icons/tools-improvement.png",
        children: [
          { id: "power-tools", label: "Power Tools" },
          { id: "hand-tools", label: "Hand Tools" },
          { id: "plumbing", label: "Plumbing & Fixtures" },
          { id: "electrical", label: "Electrical Supplies" },
          { id: "paint", label: "Paint & Wallpaper" },
          { id: "hardware", label: "Hardware & Fasteners" },
        ],
      },
      {
        id: "garden-outdoor",
        label: "Garden & Outdoor",
        icon: "/subcategory-icons/garden-outdoor.png",
        children: [
          { id: "garden-tools", label: "Garden Tools & Equipment" },
          { id: "plants", label: "Plants & Seeds" },
          { id: "pools", label: "Pools & Spas" },
          { id: "barbecues", label: "Barbecues & Outdoor Cooking" },
          { id: "storage-sheds", label: "Storage & Sheds" },
        ],
      },
      {
        id: "storage-organization",
        label: "Storage & Organization",
        icon: "/subcategory-icons/storage-organization.png",
        children: [
          { id: "boxes", label: "Storage Boxes & Baskets" },
          { id: "shelving", label: "Shelving & Racks" },
          { id: "wardrobes", label: "Wardrobes & Closets" },
          { id: "organizers", label: "Organizers" },
        ],
      },
    ],
  },
  {
    id: "baby-kids",
    label: "Baby & Kids",
    img: "/categoryimages/baby.jpg",
    children: [
      {
        id: "baby-clothing",
        label: "Baby Clothing",
        icon: "/subcategory-icons/baby-clothing.png",
        children: [
          { id: "onesies", label: "Onesies & Bodysuits" },
          { id: "baby-outfits", label: "Outfits & Sets" },
          { id: "baby-shoes", label: "Baby Shoes" },
          { id: "baby-accessories", label: "Baby Accessories" },
        ],
      },
      {
        id: "strollers",
        label: "Strollers & Prams",
        icon: "/subcategory-icons/strollers.png",
        children: [
          { id: "strollers", label: "Strollers" },
          { id: "prams", label: "Prams & Travel Systems" },
          { id: "stroller-parts", label: "Stroller Parts & Accessories" },
        ],
      },
      {
        id: "feeding",
        label: "Feeding",
        icon: "/subcategory-icons/feeding.png",
        children: [
          { id: "bottles", label: "Bottles & Cups" },
          { id: "breastfeeding", label: "Breastfeeding" },
          { id: "baby-food", label: "Baby Food & Formulas" },
          { id: "highchairs", label: "Highchairs & Booster Seats" },
          { id: "utensils-baby", label: "Baby Utensils & Dishes" },
        ],
      },
      {
        id: "diapering",
        label: "Diapering",
        icon: "/subcategory-icons/diapering.png",
        children: [
          { id: "diapers", label: "Diapers" },
          { id: "wipes", label: "Wipes & Holders" },
          { id: "diaper-bags", label: "Diaper Bags" },
          { id: "changing", label: "Changing Pads & Mats" },
        ],
      },
      {
        id: "nursery",
        label: "Nursery & Furniture",
        icon: "/subcategory-icons/nursery.png",
        children: [
          { id: "cribs", label: "Cribs & Cradles" },
          { id: "nursery-bedding", label: "Nursery Bedding" },
          { id: "changing-tables", label: "Changing Tables" },
          { id: "nursery-decor", label: "Nursery Decor" },
        ],
      },
      {
        id: "baby-care",
        label: "Baby Care & Safety",
        icon: "/subcategory-icons/baby-care.png",
        children: [
          { id: "bathing", label: "Bathing & Grooming" },
          { id: "car-seats", label: "Car Seats" },
          { id: "carriers", label: "Carriers, Slings & Backpacks" },
          { id: "safety", label: "Safety Gates & Guards" },
          { id: "monitors", label: "Baby Monitors" },
        ],
      },
      {
        id: "kids-toys",
        label: "Kids' Toys",
        icon: "/subcategory-icons/kids-toys.png",
        children: [
          { id: "baby-toys", label: "Baby Toys" },
          { id: "educational-toys", label: "Educational Toys" },
          { id: "building-toys", label: "Building Toys" },
          { id: "stuffed-toys", label: "Stuffed Animals & Dolls" },
        ],
      },
      {
        id: "bikes-rideons",
        label: "Bikes & Ride-ons",
        icon: "/subcategory-icons/bikes-rideons.png",
        children: [
          { id: "bicycles-kids", label: "Kids' Bicycles" },
          { id: "scooters-kids", label: "Scooters" },
          { id: "rideons", label: "Ride-on Cars & Toys" },
          { id: "balance-bikes", label: "Balance & Training Bikes" },
        ],
      },
      {
        id: "school-stationery",
        label: "School & Stationery",
        icon: "/subcategory-icons/school-stationery.png",
        children: [
          { id: "backpacks-kids", label: "Backpacks & Bags" },
          { id: "stationery", label: "Stationery & Supplies" },
          { id: "lunch-boxes", label: "Lunch Boxes" },
        ],
      },
    ],
  },
  {
    id: "toys-games",
    label: "Toys & Games",
    img: "/categoryimages/toys.jpg",
    children: [
      {
        id: "action-figures",
        label: "Action Figures",
        icon: "/subcategory-icons/action-figures.png",
        children: [
          { id: "action-figures", label: "Action Figures" },
          { id: "playsets", label: "Playsets & Vehicles" },
          { id: "collectible-figures", label: "Collectible Figures" },
        ],
      },
      {
        id: "building-blocks",
        label: "Building & Blocks",
        icon: "/subcategory-icons/building-blocks.png",
        children: [
          { id: "lego", label: "LEGO & Bricks" },
          { id: "blocks", label: "Blocks & Construction" },
          { id: "model-kits", label: "Model Kits" },
        ],
      },
      {
        id: "board-games",
        label: "Board & Card Games",
        icon: "/subcategory-icons/board-games.png",
        children: [
          { id: "board-games", label: "Board Games" },
          { id: "card-games", label: "Card Games" },
          { id: "chess", label: "Chess & Strategy" },
          { id: "dice", label: "Dice & Party Games" },
        ],
      },
      {
        id: "puzzles",
        label: "Puzzles",
        icon: "/subcategory-icons/puzzles.png",
        children: [
          { id: "jigsaw", label: "Jigsaw Puzzles" },
          { id: "3d-puzzles", label: "3D Puzzles" },
          { id: "brain-teasers", label: "Brain Teasers" },
        ],
      },
      {
        id: "dolls-playsets",
        label: "Dolls & Playsets",
        icon: "/subcategory-icons/dolls-playsets.png",
        children: [
          { id: "dolls", label: "Dolls & Dollhouses" },
          { id: "pretend-play", label: "Pretend Play" },
          { id: "kitchen-sets", label: "Play Kitchens & Food" },
        ],
      },
      {
        id: "remote-control",
        label: "Remote Control",
        icon: "/subcategory-icons/remote-control.png",
        children: [
          { id: "rc-cars", label: "RC Cars & Trucks" },
          { id: "rc-drones", label: "RC Drones & Helicopters" },
          { id: "rc-boats", label: "RC Boats" },
        ],
      },
      {
        id: "outdoor-play",
        label: "Outdoor Play",
        icon: "/subcategory-icons/outdoor-play.png",
        children: [
          { id: "trampolines", label: "Trampolines" },
          { id: "slides-swings", label: "Slides & Swings" },
          { id: "water-toys", label: "Water & Sand Toys" },
          { id: "sport-toys", label: "Sport Toys & Games" },
        ],
      },
      {
        id: "educational",
        label: "Educational & STEM",
        icon: "/subcategory-icons/educational.png",
        children: [
          { id: "stem-kits", label: "STEM & Science Kits" },
          { id: "learning", label: "Learning & Alphabet Toys" },
          { id: "art-supplies", label: "Art & Craft Supplies" },
          { id: "musical-toys", label: "Musical Toys" },
        ],
      },
    ],
  },
  {
    id: "sports-outdoors",
    label: "Sports & Outdoors",
    img: "/categoryimages/sports.jpg",
    children: [
      {
        id: "fitness-gym",
        label: "Fitness & Gym",
        icon: "/subcategory-icons/fitness-gym.png",
        children: [
          { id: "weights", label: "Weights & Dumbbells" },
          { id: "home-gym", label: "Home Gym Equipment" },
          { id: "yoga", label: "Yoga & Pilates" },
          { id: "treadmills", label: "Treadmills & Bikes" },
        ],
      },
      {
        id: "sports-clothing",
        label: "Sports Clothing & Shoes",
        icon: "/subcategory-icons/sports-clothing.png",
        children: [
          { id: "activewear", label: "Activewear & Gym Wear" },
          { id: "jerseys-kits", label: "Jerseys & Kits" },
          { id: "sports-shoes", label: "Sports Shoes" },
          { id: "sports-accessories", label: "Sports Accessories" },
        ],
      },
      {
        id: "football",
        label: "Football (Soccer)",
        icon: "/subcategory-icons/football.png",
        children: [
          { id: "footballs", label: "Football Boots" },
          { id: "balls", label: "Football Boots" },
          { id: "kit", label: "Kits & Uniforms" },
          { id: "goalpost", label: "Goals & Accessories" },
        ],
      },
      {
        id: "basketball",
        label: "Basketball",
        icon: "/subcategory-icons/basketball.png",
        children: [
          { id: "basketballs", label: "Basketballs" },
          { id: "basketball-shoes", label: "Basketball Shoes" },
          { id: "hoops", label: "Hoops & Backboards" },
        ],
      },
      {
        id: "cycling",
        label: "Cycling",
        icon: "/subcategory-icons/cycling.png",
        children: [
          { id: "bicycles", label: "Bicycles" },
          { id: "accessories-cycling", label: "Cycling Accessories" },
          { id: "helmets", label: "Helmets & Safety" },
          { id: "parts-cycling", label: "Bike Parts" },
        ],
      },
      {
        id: "swimming",
        label: "Swimming",
        icon: "/subcategory-icons/swimming.png",
        children: [
          { id: "swimwear", label: "Swimwear" },
          { id: "goggles", label: "Goggles & Caps" },
          { id: "pool-gear", label: "Pool & Water Gear" },
        ],
      },
      {
        id: "camping-hiking",
        label: "Camping & Hiking",
        icon: "/subcategory-icons/camping-hiking.png",
        children: [
          { id: "tents", label: "Tents & Shelters" },
          { id: "sleeping", label: "Sleeping Bags & Mats" },
          { id: "backpacks-camping", label: "Backpacks & Gear" },
          { id: "hiking", label: "Hiking & Trekking" },
        ],
      },
      {
        id: "fishing",
        label: "Fishing",
        icon: "/subcategory-icons/fishing.png",
        children: [
          { id: "rods", label: "Rods & Reels" },
          { id: "tackle", label: "Tackle & Lures" },
          { id: "accessories-fishing", label: "Fishing Accessories" },
        ],
      },
      {
        id: "other-sports",
        label: "Other Sports",
        icon: "/subcategory-icons/other-sports.png",
        children: [
          { id: "tennis", label: "Tennis & Racquet Sports" },
          { id: "boxing", label: "Boxing & Martial Arts" },
          { id: "golf", label: "Golf" },
          { id: "running", label: "Running & Jogging" },
          { id: "outdoor-recreation", label: "Outdoor Recreation" },
        ],
      },
    ],
  },
  {
    id: "vehicles",
    label: "Vehicles",
    img: "/categoryimages/vehicles.jpg",
    children: [
      {
        id: "cars",
        label: "Cars",
        icon: "/subcategory-icons/cars.png",
        children: [
          { id: "sedans", label: "Sedans" },
          { id: "suvs", label: "SUVs & Crossovers" },
          { id: "hatchbacks", label: "Hatchbacks" },
          { id: "trucks-pickups", label: "Trucks & Pickups" },
          { id: "vans", label: "Vans & Minivans" },
          { id: "luxury", label: "Luxury Cars" },
          { id: "electric", label: "Electric & Hybrid" },
        ],
      },
      {
        id: "motorcycles",
        label: "Motorcycles",
        icon: "/subcategory-icons/motorcycles.png",
        children: [
          { id: "scooters", label: "Scooters & Mopeds" },
          { id: "motorcycles", label: "Motorcycles" },
          { id: "atvs", label: "ATVs & Off-road" },
          { id: "motorcycle-gear", label: "Helmets & Gear" },
        ],
      },
      {
        id: "trucks-buses",
        label: "Buses & Trucks",
        icon: "/subcategory-icons/trucks-buses.png",
        children: [
          { id: "commercial-trucks", label: "Commercial Trucks" },
          { id: "buses", label: "Buses" },
          { id: "trailers", label: "Trailers" },
          { id: "construction", label: "Construction & Farm Vehicles" },
        ],
      },
      {
        id: "boats",
        label: "Boats & Watercraft",
        icon: "/subcategory-icons/boats.png",
        children: [
          { id: "boats", label: "Boats" },
          { id: "jet-skis", label: "Jet Skis & Watercraft" },
          { id: "boat-parts", label: "Boat Parts & Accessories" },
        ],
      },
      {
        id: "vehicle-parts",
        label: "Vehicle Parts & Accessories",
        icon: "/subcategory-icons/vehicle-parts.png",
        children: [
          { id: "car-parts", label: "Car Parts" },
          { id: "tyres", label: "Tyres & Wheels" },
          { id: "car-accessories", label: "Car Accessories" },
          { id: "audio-electronics", label: "Car Audio & Electronics" },
          { id: "motorcycle-parts", label: "Motorcycle Parts" },
        ],
      },
      {
        id: "vehicle-care",
        label: "Vehicle Care & Tools",
        icon: "/subcategory-icons/vehicle-care.png",
        children: [
          { id: "tools", label: "Automotive Tools" },
          { id: "detailing", label: "Detailing & Care Products" },
          { id: "diagnostics", label: "Diagnostics & Testing" },
        ],
      },
    ],
  },
  {
    id: "books-music",
    label: "Books, Movies & Music",
    img: "/categoryimages/books.jpg",
    children: [
      {
        id: "books",
        label: "Books",
        icon: "/subcategory-icons/books.png",
        children: [
          { id: "fiction", label: "Fiction" },
          { id: "nonfiction", label: "Non-Fiction" },
          { id: "textbooks", label: "Textbooks & Academic" },
          { id: "childrens-books", label: "Children's Books" },
          { id: "comics", label: "Comics & Graphic Novels" },
          { id: "religious", label: "Religious & Inspirational" },
        ],
      },
      {
        id: "movies",
        label: "Movies & DVDs",
        icon: "/subcategory-icons/movies.png",
        children: [
          { id: "movies", label: "Movies" },
          { id: "series", label: "TV Series" },
          { id: "documentaries", label: "Documentaries" },
        ],
      },
      {
        id: "music",
        label: "Music & Vinyl",
        icon: "/subcategory-icons/music.png",
        children: [
          { id: "cds", label: "CDs & Albums" },
          { id: "vinyl", label: "Vinyl Records" },
          { id: "streaming-cards", label: "Streaming & Gift Cards" },
        ],
      },
      {
        id: "instruments",
        label: "Musical Instruments",
        icon: "/subcategory-icons/instruments.png",
        children: [
          { id: "guitars", label: "Guitars & Bass" },
          { id: "keyboards", label: "Keyboards & Pianos" },
          { id: "drums", label: "Drums & Percussion" },
          { id: "african-instruments", label: "African Instruments" },
          { id: "pro-audio", label: "Studio & DJ Equipment" },
        ],
      },
    ],
  },
  {
    id: "pet-supplies",
    label: "Pet Supplies",
    img: "/categoryimages/pets.jpg",
    children: [
      {
        id: "dogs",
        label: "Dogs",
        icon: "/subcategory-icons/dogs.png",
        children: [
          { id: "dog-food", label: "Dog Food & Treats" },
          { id: "dog-accessories", label: "Collars, Leashes & Accessories" },
          { id: "dog-toys", label: "Dog Toys" },
          { id: "dog-health", label: "Dog Health & Grooming" },
        ],
      },
      {
        id: "cats",
        label: "Cats",
        icon: "/subcategory-icons/cats.png",
        children: [
          { id: "cat-food", label: "Cat Food & Treats" },
          { id: "cat-litter", label: "Litter & Litter Boxes" },
          { id: "cat-toys", label: "Cat Toys & Scratching" },
          { id: "cat-health", label: "Cat Health & Grooming" },
        ],
      },
      {
        id: "birds",
        label: "Birds",
        icon: "/subcategory-icons/birds.png",
        children: [
          { id: "bird-food", label: "Bird Food" },
          { id: "cages", label: "Cages & Aviaries" },
          { id: "bird-accessories", label: "Bird Accessories" },
        ],
      },
      {
        id: "fish-aquariums",
        label: "Fish & Aquariums",
        icon: "/subcategory-icons/fish-aquariums.png",
        children: [
          { id: "aquariums", label: "Aquariums & Tanks" },
          { id: "fish-food", label: "Fish Food" },
          { id: "aquarium-supplies", label: "Filters & Accessories" },
        ],
      },
      {
        id: "small-animals",
        label: "Small Animals",
        icon: "/subcategory-icons/small-animals.png",
        children: [
          { id: "small-animal-food", label: "Food & Treats" },
          { id: "cages-habitats", label: "Cages & Habitats" },
        ],
      },
      {
        id: "livestock",
        label: "Livestock & Farm",
        icon: "/subcategory-icons/livestock.png",
        children: [
          { id: "poultry", label: "Poultry & Fowl" },
          { id: "livestock-supplies", label: "Farm Supplies" },
        ],
      },
    ],
  },
  {
    id: "food-beverages",
    label: "Food & Beverages",
    img: "/categoryimages/food.jpg",
    children: [
      {
        id: "groceries",
        label: "Groceries & Pantry",
        icon: "/subcategory-icons/groceries.png",
        children: [
          { id: "grains", label: "Grains, Rice & Staples" },
          { id: "canned", label: "Canned & Jarred Foods" },
          { id: "spices", label: "Spices & Cooking Ingredients" },
          { id: "cereals", label: "Cereals & Breakfast" },
          { id: "snacks", label: "Snacks & Sweets" },
        ],
      },
      {
        id: "beverages",
        label: "Beverages",
        icon: "/subcategory-icons/beverages.png",
        children: [
          { id: "soft-drinks", label: "Soft Drinks & Juices" },
          { id: "coffee-tea", label: "Coffee & Tea" },
          { id: "milk", label: "Milk & Cream" },
          { id: "water", label: "Water & Sachet" },
        ],
      },
      {
        id: "household-supplies",
        label: "Household Supplies",
        icon: "/subcategory-icons/household-supplies.png",
        children: [
          { id: "cleaning", label: "Cleaning Supplies" },
          { id: "laundry", label: "Laundry" },
          { id: "toiletries", label: "Toiletries" },
          { id: "air-fresheners", label: "Air Fresheners" },
        ],
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    img: "/categoryimages/services.jpg",
    children: [
      {
        id: "airtime-data",
        label: "Airtime & Data",
        icon: "/subcategory-icons/airtime-data.png",
        children: [
          { id: "mobile-top-up", label: "Mobile Top-up" },
          { id: "data-bundles", label: "Data Bundles" },
          { id: "subscriptions", label: "Subscriptions & Vouchers" },
        ],
      },
      {
        id: "repairs",
        label: "Repair Services",
        icon: "/subcategory-icons/repairs.png",
        children: [
          { id: "phone-repairs", label: "Phone & Tablet Repairs" },
          { id: "electronics-repairs", label: "Electronics Repairs" },
          { id: "car-repairs", label: "Auto Repairs" },
          { id: "appliance-repairs", label: "Appliance Repairs" },
        ],
      },
      {
        id: "home-services",
        label: "Home & Salon Services",
        icon: "/subcategory-icons/home-services.png",
        children: [
          { id: "cleaning-services", label: "Cleaning & Janitorial" },
          { id: "beauty-services", label: "Beauty & Salon" },
          { id: "tailoring", label: "Tailoring & Fashion" },
          { id: "plumbing-electric", label: "Plumbing & Electrical" },
        ],
      },
      {
        id: "lessons",
        label: "Lessons & Tutoring",
        icon: "/subcategory-icons/lessons.png",
        children: [
          { id: "academic", label: "Academic Tutoring" },
          { id: "music-lessons", label: "Music Lessons" },
          { id: "driving", label: "Driving Lessons" },
          { id: "fitness-coaching", label: "Fitness & Coaching" },
        ],
      },
      {
        id: "events-weddings",
        label: "Events & Weddings",
        icon: "/subcategory-icons/events-weddings.png",
        children: [
          { id: "photography", label: "Photography & Videography" },
          { id: "catering", label: "Catering & Event Planning" },
          { id: "decor", label: "Decor & Rentals" },
        ],
      },
      {
        id: "web-design",
        label: "Web & Design",
        icon: "/subcategory-icons/web-design.png",
        children: [
          { id: "graphic-design", label: "Graphic Design" },
          { id: "web-development", label: "Web Development" },
          { id: "printing", label: "Printing & Branding" },
          { id: "digital-marketing", label: "Digital Marketing" },
        ],
      },
    ],
  },
  {
    id: "other",
    label: "Other",
    img: "/categoryimages/other.jpg",
    children: [
      {
        id: "other-items",
        label: "Other Items",
        icon: "/subcategory-icons/other-items.png",
        children: [
          { id: "miscellaneous", label: "Miscellaneous" },
          { id: "gift-cards", label: "Gift Cards & Vouchers" },
          { id: "collectibles", label: "Collectibles" },
          { id: "industrial", label: "Industrial & Office" },
        ],
      },
    ],
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export const findMain = (mainId: string | null | undefined): CategoryNode | undefined =>
  TAXONOMY.find((m) => m.id === mainId);

export const findSub = (
  mainId: string | null | undefined,
  subId: string | null | undefined,
): CategoryNode | undefined => findMain(mainId)?.children?.find((s) => s.id === subId);

export const findMini = (
  mainId: string | null | undefined,
  subId: string | null | undefined,
  miniId: string | null | undefined,
): CategoryNode | undefined => findSub(mainId, subId)?.children?.find((m) => m.id === miniId);

export const resolvePath = (
  mainId: string | null | undefined,
  subId: string | null | undefined,
  miniId: string | null | undefined,
): TaxonomyPath | null => {
  const main = findMain(mainId);
  if (!main) return null;
  const sub = subId ? findSub(mainId, subId) : undefined;
  const mini = sub && miniId ? findMini(mainId, subId, miniId) : undefined;
  if (subId && !sub) return null;
  if (miniId && !mini) return null;
  return { main, sub, mini };
};

// Resolve a path from the stored DB labels (category/subcategory/subcategory2).
export const resolvePathByLabels = (
  category?: string | null,
  subcategory?: string | null,
  subcategory2?: string | null,
): TaxonomyPath | null => {
  if (!category) return null;
  const main = TAXONOMY.find((m) => m.label === category);
  if (!main) return null;
  const sub = subcategory ? main.children?.find((s) => s.label === subcategory) : undefined;
  const mini = sub && subcategory2 ? sub.children?.find((m) => m.label === subcategory2) : undefined;
  return { main, sub, mini };
};

export const isLeaf = (node: CategoryNode): boolean => !node.children || node.children.length === 0;

// Matches a listing (labelled category/subcategory/subcategory2) against a path.
export const matchesPath = (
  listing: { category?: string; subcategory?: string | null; subcategory2?: string | null },
  path: TaxonomyPath,
): boolean => {
  if (!listing.category || listing.category !== path.main.label) return false;
  if (path.sub && listing.subcategory !== path.sub.label) return false;
  if (path.mini && listing.subcategory2 !== path.mini.label) return false;
  return true;
};

// Matches any listing tagged under a node (used when a parent is selected).
export const matchesUnder = (
  listing: { category?: string; subcategory?: string | null; subcategory2?: string | null },
  path: TaxonomyPath,
): boolean => {
  if (listing.category !== path.main.label) return false;
  if (path.sub && listing.subcategory !== path.sub.label) return false;
  return true;
};

// Old flat category label -> new (category, subcategory, subcategory2).
// Used to backfill existing listings after the taxonomy migration.
export const BACKFILL_MAP: Record<
  string,
  { category: string; subcategory: string | null; subcategory2: string | null }
> = {
  Sneakers:    { category: "Fashion",               subcategory: "Footwear",                 subcategory2: "Sneakers & Trainers" },
  Phones:      { category: "Phones & Tablets",      subcategory: "Mobile Phones",            subcategory2: null },
  Clothes:     { category: "Fashion",               subcategory: null,                       subcategory2: null },
  Tops:        { category: "Fashion",               subcategory: "Women's Clothing",         subcategory2: "Tops & Tees" },
  Bottoms:     { category: "Fashion",               subcategory: "Women's Clothing",         subcategory2: "Jeans & Bottoms" },
  Outerwear:   { category: "Fashion",               subcategory: "Women's Clothing",         subcategory2: "Outerwear & Jackets" },
  Activewear:  { category: "Sports & Outdoors",     subcategory: "Sports Clothing & Shoes",  subcategory2: "Activewear & Gym Wear" },
  Electronics: { category: "Electronics",            subcategory: null,                       subcategory2: null },
  Watches:     { category: "Fashion",               subcategory: "Jewellery & Watches",      subcategory2: "Watches" },
  Bags:        { category: "Fashion",               subcategory: "Bags & Luggage",           subcategory2: null },
  Accessories: { category: "Fashion",               subcategory: "Accessories",              subcategory2: null },
  Jewellery:   { category: "Fashion",               subcategory: "Jewellery & Watches",      subcategory2: null },
  Furniture:   { category: "Home & Garden",         subcategory: "Furniture",                subcategory2: null },
  Other:       { category: "Other",                 subcategory: null,                       subcategory2: null },
};

// Size helper: which size grid applies to a category selection.
export type SizeKind = "sneaker" | "clothing" | null;

export const sizeKindFor = (
  main: string | null | undefined,
  sub: string | null | undefined,
  mini: string | null | undefined,
): SizeKind => {
  if (main === "Fashion" && sub === "Footwear") return "sneaker";
  if (main === "Fashion" && sub === "Kids' Clothing" && mini === "Kids' Shoes") return "sneaker";
  if (main === "Sports & Outdoors" && sub === "Sports Clothing & Shoes") return "clothing";
  if (main === "Fashion" && sub && sub.endsWith("Clothing")) return "clothing";
  if (main === "Fashion" && sub === "Uniforms & Workwear") return "clothing";
  return null;
};

// Main categories with images (for grids/home).
export const MAIN_CATEGORIES = TAXONOMY.map((m) => ({
  label: m.label,
  id: m.id,
  img: m.img ?? "/categoryimages/other.jpg",
}));
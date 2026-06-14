"""Seed demo: agents + properties + media (images + placeholder floor plans)."""
from __future__ import annotations
import io, random
from decimal import Decimal

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image, ImageDraw, ImageFont

from apps.properties.models import Property, PropertyMedia
from apps.users.models import AgentProfile, User


AGENTS = [
    dict(email="pratima@sansar-realty.np", name="Pratima Karki",   phone="+977-9841000111",
         agency="Sansar Realty",  bio="15 years in Kathmandu valley residential sales.", tier="premium"),
    dict(email="bikram@himal-homes.np",    name="Bikram Thapa",    phone="+977-9851000222",
         agency="Himal Homes",    bio="Commercial and mixed-use specialist.",              tier="standard"),
    dict(email="anjali@valley-land.np",    name="Anjali Maharjan", phone="+977-9861000333",
         agency="Valley Land Co.", bio="Land sales across the valley and Pokhara.",        tier="standard"),
    dict(email="rajiv@luxe-nepal.np",      name="Rajiv Shrestha",  phone="+977-9801000444",
         agency="Luxe Nepal",     bio="Boutique luxury and hospitality properties.",       tier="premium"),
]

AMENITIES = {
    "Kathmandu": [
        {"type":"school","name":"St. Xavier's School","distance_m":800},
        {"type":"hospital","name":"Grande International Hospital","distance_m":2100},
        {"type":"bus_stop","name":"Ratna Park Bus Stop","distance_m":350},
        {"type":"mall","name":"Civil Mall","distance_m":1800},
        {"type":"grocery","name":"Bhat-Bhateni Supermarket","distance_m":600},
        {"type":"bank","name":"Nabil Bank ATM","distance_m":200},
        {"type":"park","name":"Garden of Dreams","distance_m":1500},
    ],
    "Lalitpur": [
        {"type":"school","name":"Little Angels School","distance_m":650},
        {"type":"hospital","name":"Patan Hospital","distance_m":900},
        {"type":"bus_stop","name":"Lagankhel Bus Stop","distance_m":500},
        {"type":"mall","name":"Labim Mall","distance_m":1200},
        {"type":"grocery","name":"Bhat-Bhateni Jhamsikhel","distance_m":400},
        {"type":"bank","name":"NIC Asia ATM","distance_m":150},
    ],
    "Bhaktapur": [
        {"type":"school","name":"Khwopa College","distance_m":800},
        {"type":"hospital","name":"Siddhi Memorial Hospital","distance_m":1500},
        {"type":"bus_stop","name":"Kamal Binayak Bus Stop","distance_m":300},
        {"type":"temple","name":"Nyatapola Temple","distance_m":600},
    ],
    "Pokhara": [
        {"type":"hospital","name":"Manipal Teaching Hospital","distance_m":2500},
        {"type":"bus_stop","name":"Tourist Bus Park","distance_m":1200},
        {"type":"grocery","name":"Bhat-Bhateni Pokhara","distance_m":600},
        {"type":"park","name":"Phewa Lake Promenade","distance_m":400},
    ],
    "Biratnagar": [
        {"type":"school","name":"Biratnagar Public School","distance_m":500},
        {"type":"hospital","name":"Nobel Medical College","distance_m":2000},
        {"type":"grocery","name":"Big Mart","distance_m":350},
    ],
}

PROPERTIES = [
    dict(title="4BHK bungalow with garden, Pulchowk",description="Characterful corner bungalow on 8 aana. Spacious living, modern kitchen, wraparound garden.",listing_type="sale",category="residential",property_type="bungalow",city="Lalitpur",address="Pulchowk, Ward 3",lat=27.6794,lng=85.3168,price_lakh=485,area_aana=8,bedrooms=4,bathrooms=3,living_rooms=2,kitchens=1,floors=2,agent=0),
    dict(title="3BHK flat with valley view, Naxal",description="Eighth-floor flat near Naxal Bhagwati. Sweeping valley views, modular kitchen, two car parks.",listing_type="sale",category="residential",property_type="flat",city="Kathmandu",address="Naxal, Ward 1",lat=27.7146,lng=85.3262,price_lakh=215,area_aana=3.5,bedrooms=3,bathrooms=2,living_rooms=1,kitchens=1,floors=1,agent=0),
    dict(title="Modern duplex, Budhanilkantha",description="South-facing duplex on 6 aana with marble flooring and private terrace.",listing_type="sale",category="residential",property_type="house",city="Kathmandu",address="Budhanilkantha, Ward 11",lat=27.7649,lng=85.3621,price_lakh=325,area_aana=6,bedrooms=4,bathrooms=3,living_rooms=2,kitchens=1,floors=3,agent=0),
    dict(title="Heritage Newari house, Bhaktapur",description="Restored traditional Newari house near Durbar Square. Carved windows, modern bathrooms.",listing_type="sale",category="residential",property_type="house",city="Bhaktapur",address="Tachapal Tole",lat=27.6724,lng=85.4290,price_lakh=175,area_aana=4,bedrooms=3,bathrooms=2,living_rooms=1,kitchens=1,floors=3,agent=0),
    dict(title="Furnished 2BHK flat, Jhamsikhel",description="Fully furnished two-bedroom flat. Walking distance to cafes and shopping.",listing_type="rent",category="residential",property_type="flat",city="Lalitpur",address="Jhamsikhel, Ward 3",lat=27.6776,lng=85.3115,price_lakh=0.65,area_aana=2.2,bedrooms=2,bathrooms=2,living_rooms=1,kitchens=1,floors=1,agent=0),
    dict(title="3BHK house for rent, Baluwatar",description="Independent house with garden, suitable for family or expatriate.",listing_type="rent",category="residential",property_type="house",city="Kathmandu",address="Baluwatar, Ward 4",lat=27.7307,lng=85.3289,price_lakh=1.2,area_aana=7,bedrooms=3,bathrooms=3,living_rooms=2,kitchens=1,floors=2,agent=0),
    dict(title="Studio apartment, Thamel",description="Compact modern studio steps from Thamel's main strip.",listing_type="rent",category="residential",property_type="flat",city="Kathmandu",address="Thamel, Ward 26",lat=27.7156,lng=85.3123,price_lakh=0.32,area_aana=1,bedrooms=1,bathrooms=1,living_rooms=1,kitchens=1,floors=1,agent=0),
    dict(title="Ground-floor shop, New Road",description="High footfall corner shop. Suitable for retail or services.",listing_type="sale",category="commercial",property_type="shop",city="Kathmandu",address="New Road, Ward 22",lat=27.7041,lng=85.3110,price_lakh=145,area_aana=1.5,bedrooms=0,bathrooms=1,living_rooms=0,kitchens=0,floors=1,agent=1),
    dict(title="Office space, Hattisar",description="2,200 sqft office floor. Open-plan layout, conference room.",listing_type="rent",category="commercial",property_type="office",city="Kathmandu",address="Hattisar, Ward 1",lat=27.7150,lng=85.3296,price_lakh=2.5,area_aana=6.5,bedrooms=0,bathrooms=2,living_rooms=0,kitchens=0,floors=1,agent=1),
    dict(title="Residential plot, Bhaisepati",description="Flat 6 aana plot in developed residential pocket. 20-foot road access.",listing_type="sale",category="land",property_type="plot",city="Lalitpur",address="Bhaisepati, Ward 26",lat=27.6498,lng=85.3084,price_lakh=180,area_aana=6,bedrooms=0,bathrooms=0,living_rooms=0,kitchens=0,floors=0,agent=2),
    dict(title="Corner plot near Ring Road, Kalanki",description="Commercial-residential corner plot on a 30-foot road. Excellent visibility.",listing_type="sale",category="land",property_type="plot",city="Kathmandu",address="Kalanki, Ward 13",lat=27.6939,lng=85.2785,price_lakh=240,area_aana=8,bedrooms=0,bathrooms=0,living_rooms=0,kitchens=0,floors=0,agent=2),
    dict(title="Agricultural land, Lekhnath",description="1 ropani of fertile flat land with year-round water access.",listing_type="sale",category="land",property_type="plot",city="Pokhara",address="Lekhnath, Ward 28",lat=28.1812,lng=84.0445,price_lakh=42,area_aana=16,bedrooms=0,bathrooms=0,living_rooms=0,kitchens=0,floors=0,agent=2),
    # Luxury
    dict(title="Sky penthouse with panoramic views, Naxal",description="4,500 sqft penthouse with 360° valley and Himalayan vistas. Three terraces, private elevator, smart home.",listing_type="sale",category="luxury",property_type="penthouse",is_luxury=True,city="Kathmandu",address="Naxal Heights, Ward 1",lat=27.7163,lng=85.3270,price_lakh=1850,area_aana=14,bedrooms=4,bathrooms=5,living_rooms=2,kitchens=2,floors=1,agent=3),
    dict(title="Lakeside luxury villa with pool, Pokhara",description="7-bedroom villa on Phewa Lake. Heated infinity pool, private jetty, helicopter pad.",listing_type="sale",category="luxury",property_type="villa",is_luxury=True,city="Pokhara",address="Lakeside, Baidam-6",lat=28.2105,lng=83.9610,price_lakh=2400,area_aana=24,bedrooms=7,bathrooms=8,living_rooms=3,kitchens=2,floors=3,agent=3),
    dict(title="Boutique 28-room heritage hotel, Bhaktapur",description="Fully operational boutique hotel in a restored 19th-century palace. Rooftop bar with Himalayan views.",listing_type="sale",category="luxury",property_type="hotel",is_luxury=True,city="Bhaktapur",address="Durbar Square Vicinity",lat=27.6713,lng=85.4280,price_lakh=8500,area_aana=42,bedrooms=28,bathrooms=30,living_rooms=4,kitchens=3,floors=4,agent=3),
    dict(title="Mountain resort, Nagarkot",description="18-cottage resort with restaurant, conference hall, spa. Strong off-season revenue.",listing_type="sale",category="luxury",property_type="resort",is_luxury=True,city="Bhaktapur",address="Nagarkot Ridge",lat=27.7159,lng=85.5208,price_lakh=6200,area_aana=80,bedrooms=18,bathrooms=20,living_rooms=4,kitchens=3,floors=2,agent=3),
]


def _amenities(city, seed):
    rng = random.Random(seed)
    pool = AMENITIES.get(city, AMENITIES["Kathmandu"])
    return sorted(
        [{**a, "distance_m": max(50, a["distance_m"] + rng.randint(-100, 200))}
         for a in rng.sample(pool, min(len(pool), rng.randint(4, 6)))],
        key=lambda x: x["distance_m"],
    )


def _placeholder_image(seed, title):
    rng = random.Random(seed)
    img = Image.new("RGB", (800, 600), (248, 250, 246))
    draw = ImageDraw.Draw(img)
    base = (rng.randint(80, 130), rng.randint(130, 180), rng.randint(70, 110))
    for y in range(600):
        t = y / 600
        c = tuple(int(base[i] * (1 - t) + 248 * t) for i in range(3))
        draw.line([(0, y), (800, y)], fill=c)
    for x in range(0, 800, 80):
        ph = rng.randint(60, 180)
        draw.polygon([(x, 600), (x+40, 600-ph), (x+80, 600)], fill=(40, 60, 35))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 26)
    except Exception:
        font = ImageFont.load_default()
    draw.text((40, 40), title[:40], fill=(248, 250, 246), font=font)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=85); return buf.getvalue()


def _floor_plan_image(seed):
    rng = random.Random(seed)
    img = Image.new("RGB", (800, 600), (248, 250, 246))
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 60, 740, 540], outline=(30, 70, 40), width=6)
    mx = 800 // 2 + rng.randint(-80, 80)
    my = 600 // 2 + rng.randint(-60, 60)
    draw.line([(mx, 60), (mx, my)], fill=(30, 70, 40), width=4)
    draw.line([(60, my), (mx, my)], fill=(30, 70, 40), width=4)
    draw.line([(mx + 100, my), (740, my)], fill=(30, 70, 40), width=4)
    draw.rectangle([mx - 20, my - 4, mx + 20, my + 4], fill=(248, 250, 246))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
    draw.text((100, 100), "LIVING", fill=(30, 70, 40), font=font)
    draw.text((mx + 30, 100), "KITCHEN", fill=(30, 70, 40), font=font)
    draw.text((100, my + 30), "BEDROOM", fill=(30, 70, 40), font=font)
    draw.text((mx + 30, my + 30), "BATH", fill=(30, 70, 40), font=font)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=85); return buf.getvalue()


def _fetch(seed, title):
    try:
        r = requests.get(f"https://picsum.photos/seed/{seed}/800/600", timeout=8, allow_redirects=True)
        if r.ok and r.content[:2] in (b"\xff\xd8", b"\x89P"):
            return r.content
    except Exception:
        pass
    return _placeholder_image(seed, title)


class Command(BaseCommand):
    help = "Seed demo with agents + properties + media."

    def handle(self, *args, **opts):
        with transaction.atomic():
            self.stdout.write("Clearing demo data…")
            Property.objects.filter(agent__email__endswith=".np").delete()

            self.stdout.write("Creating agents…")
            agent_users = []
            for a in AGENTS:
                user, created = User.objects.get_or_create(
                    email=a["email"],
                    defaults={"full_name": a["name"], "phone": a["phone"], "is_agent": True},
                )
                if created:
                    user.set_password("demo1234"); user.is_agent = True; user.save()
                AgentProfile.objects.update_or_create(
                    user=user,
                    defaults={"agency_name": a["agency"], "bio": a["bio"],
                              "contact_phone": a["phone"], "whatsapp_number": a["phone"],
                              "pricing_tier": a["tier"]},
                )
                agent_users.append(user)
                self.stdout.write(f"  • {user.email}")

            self.stdout.write("Creating properties…")
            for i, p in enumerate(PROPERTIES, start=1):
                prop = Property.objects.create(
                    title=p["title"], description=p["description"],
                    agent=agent_users[p["agent"]],
                    listing_type=p["listing_type"], category=p["category"],
                    property_type=p["property_type"], status=Property.Status.ACTIVE,
                    city=p["city"], address=p["address"],
                    latitude=Decimal(str(p["lat"])), longitude=Decimal(str(p["lng"])),
                    price=int(p["price_lakh"] * 100_000 * 100),
                    area_sqm=Decimal(str(round(p["area_aana"] * 31.7951, 2))),
                    bedrooms=p["bedrooms"], bathrooms=p["bathrooms"],
                    living_rooms=p["living_rooms"], kitchens=p["kitchens"], floors=p["floors"],
                    is_featured=(i <= 4),
                    is_luxury=p.get("is_luxury", False),
                    nearby_amenities=_amenities(p["city"], i),
                )
                # 2 gallery images
                for j in range(2):
                    blob = _fetch(i * 10 + j, p["title"])
                    m = PropertyMedia(
                        listing=prop, order=j, is_primary=(j == 0),
                        media_type=PropertyMedia.MediaType.GALLERY,
                        mime_type="image/jpeg",
                        file_size_bytes=len(blob),
                        processing_status=PropertyMedia.ProcessingStatus.READY,
                    )
                    m.file.save(f"demo_{prop.pk}_{j}.jpg", ContentFile(blob), save=True)

                # 1 floor plan for non-land / non-hotel
                if p["property_type"] not in ("plot", "hotel", "resort"):
                    fp_blob = _floor_plan_image(i * 7)
                    m = PropertyMedia(
                        listing=prop, order=99, is_primary=False,
                        media_type=PropertyMedia.MediaType.FLOORPLAN,
                        mime_type="image/jpeg",
                        file_size_bytes=len(fp_blob),
                        caption="Floor plan",
                        processing_status=PropertyMedia.ProcessingStatus.READY,
                    )
                    m.file.save(f"plan_{prop.pk}.jpg", ContentFile(fp_blob), save=True)

                self.stdout.write(f"  • [{p['city']}] {p['title'][:55]}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Seeded {len(AGENTS)} agents and {len(PROPERTIES)} properties."
        ))
        self.stdout.write("  Passwords: demo1234")

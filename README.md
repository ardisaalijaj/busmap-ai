# BusMap AI Pro

Version i zgjeruar dhe më profesional i prototipit BusMap AI.

## Çfarë ka të re
- Dizajn më modern dhe më i përshtatshëm për prezantim hackathoni
- Statistika në krye të faqes
- Kërkim i linjave
- Planifikues i thjeshtë i udhëtimit
- Chatbot me sugjerime të shpejta
- Më shumë stacione dhe linja demo
- OpenStreetMap + Leaflet pa pagesë

## Nisja lokale
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
flask --app app run
```

Për ta hapur edhe në telefon në të njëjtin Wi‑Fi:
```bash
flask --app app run --host=0.0.0.0
```

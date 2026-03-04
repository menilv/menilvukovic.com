# Strukturna Analiza - Objekt Pofalici

## 1. Pregled Zgrade

| Sprat | Povrsina (m²) | Broj soba |
|-------|----------------|-----------|
| Podrum (Suteren) | 54.64 | 7 |
| Prizemlje | 51.53 | 6 |
| 1. Sprat | 47.16 | 6 |
| 2. Sprat (Potkrovlje) | 58.93 | 8 |
| **Ukupno** | **~212 m²** | 27 |

**Procjenjene dimenzije**: ~10m × 6m (60 m² po spratu)

---

## 2. Konstrukcijski Okvir (Procjena)

Pretpostavka: Residential frame s tipicnim rasponom do 4m:

| Smjer | Polja | Razmak |
|-------|-------|--------|
| X-smijer | 3 polja | ~3.3m |
| Y-smijer | 2 polja | ~3.0m |

**Stupovi**: ~6-8 stupova na presjecima  
**Gredje**: 4-6 greda po spratu

---

## 3. Opterecenja

### 3.1 Vlastita tezina (Dead Load)

| Element | Opterecenje (kN/m²) |
|---------|---------------------|
| RC ploca (20cm) | 5.0 |
| Podna obrada | 1.5 |
| Pregradni zidovi | 2.0 |
| Strop/MEP | 0.5 |
| **Ukupno** | **9.0 kN/m²** |

### 3.2 Korisno opterecenje (Live Load)

| Namjena | Opterecenje (kN/m²) |
|---------|---------------------|
| Stambeni prostor | 2.0 |
| Spremliste | 3.0 |

### 3.3 Ukupno Proracunsko Opterecenje

```
Povrsina po polju: ~10 m²
Ukupno opterecenje po polju = (9.0 + 2.0) × 10 = 110 kN

Po stupu (4 polja dijele):
Maksimalno opterecenje stupa ≈ 220 kN
```

---

## 4. Raspodjela Tezine po Spratovima

| Sprat | Ukupno Opterecenje (kN) | Napomena |
|-------|-------------------------|----------|
| Krov (2. sprat) | 650 | + snijeg ako treba |
| 1. Sprat | 510 | prenosi na stupove |
| Prizemlje | 510 | prenosi na temelje |
| Podrum | 490 | nosivi zidovi |

**Ukupna tezina zgrade**: ~2,160 kN (~220 tona)

---

## 5. Dimenzioniranje Stupova (Prelimarno)

Za 220 kN aksijalnog opterecenja (C30/37 beton):
- **Minimalni stup**: 250×250 mm (ili Ø300 okrugli)
- **Preporuceno**: 300×300 mm za rezervu

---

## 6. Analiza Zidova - Prizemlje

### 6.1 Detekcija debljine zidova (slika)

Na osnovu analize slike:
- **Vanjski zidovi**: ~98px = 25-30cm (noseci)
- **Unutarnji zidovi**: 7-34px = 10-15cm (pregradni)

### 6.2 Zidovi za uklanjanje

| Lokacija | Debljina | Procjena | Preporuka |
|----------|-----------|----------|-----------|
| Izmedju 18.18m² i 10.34m² | ~18px (tanak) | Pregradni zid 10-15cm | **VJEROJATNO UKLONJIVO** |
| Izmedju 18.18m² i 13.80m² | ~19-34px (srednji) | Deblji pregradni 15-20cm | **VJEROJATNO UKLONJIVO** |

---

## 7. Zakljucak

### Moze li se otvoriti prizemlje?

**Da, vjerojatno.** Oba zida izmedju soba su pregradni zidovi, ne noseci stupovi ili grede.

### Sto je potrebno za potvrdu:

1. **Najeti konstrukcijski nacrt** - da se vidi nema li greda iznad zidova
2. **Geotehnicki izvjestaj** - nosivost tla
3. **Proracun potresa** - BiH je seizmicka zona

### Sto ako zelite otvoriti:

- **Celicne/RSJ grede** - za premostenje gdje su zidovi bili
- **Novi stupovi** - za podrsku krajeva greda
- **Provjera temelja** - nove tockaste sile mogu zahtijevati prosirenje

---

## 8. Napomena

**OVO SU PROCJENE NA OSNOVU SLIKE.** Za stvarnu gradnju potrebno je:

1. Konacne arhitektonske dimenzije
2. Geotehnicki izvjestaj (nosivost tla)
3. Klasifikacija seizmicke zone
4. Provjera lokalnih gradjevinskih propisa

**Preporuka: Angažirajte konstruktera za konacnu potvrdu.**

---

*Document created: Mart 2026*
*Data source: Floor plan PDF "objekat pofalici - sa kotama osnove.pdf"*

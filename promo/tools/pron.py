"""Spoken form for the id-ID voice: English/IT terms respelled so they are pronounced the English way.
Subtitles keep the written text from vo.json."""
import re
PRON = [
 ("ERP-Pack", "I Ar Pi Pek"), ("erp dot creativework dot asia", "I Ar Pi, dot, kriyetif werk, dot, eisya"),
 ("ERP", "I Ar Pi"), ("Point of Sale", "Poin of Seil"), ("POS", "Pi O Es"), ("dashboard", "desbor"),
 ("Android app", "Endroid ep"), ("sales", "seils"), ("purchase", "percis"), ("inventory", "inventori"),
 ("finance", "fainens"), ("invoice", "invois"), ("scan barcode", "sken barkod"), ("barcode label", "barkod leibel"),
 ("barcode", "barkod"), ("cart", "kart"), ("cash", "kesy"), ("card", "kard"), ("QRIS", "kyuris"),
 ("Classic", "Klasik"), ("touch grid", "tac grid"), ("compact list", "kompek list"), ("night shift", "nait syif"),
 ("accent color", "eksen kaler"), ("brand color", "brend kaler"), ("brand", "brend"), ("variant", "verian"),
 ("unit", "yunit"), ("price group", "prais grup"), ("product catalog", "prodak ketalog"), ("print", "print"),
 ("payment status", "peimen status"), ("customer", "kastemer"), ("supplier", "saplaier"), ("Stock report", "Stok riport"),
 ("gross profit", "gros profit"), ("net profit", "net profit"), ("expense", "ekspens"), ("balance sheet", "belens syit"),
 ("credit limit", "kredit limit"), ("go online", "go onlain"), ("website", "websait"), ("template", "templet"),
 ("coding", "koding"), ("AI assistant", "Ei Ai esisten"), ("provider", "provaider"), ("Light mode", "Lait mod"),
 ("dark mode", "dark mod"), ("font", "fon"), ("tenant", "tenen"), ("platform", "pletform"), ("domain", "domein"),
 ("build", "bild"), ("scale up", "skel ap"), ("login", "log-in"), ("Profit", "Profit"),
]
def spoken(text):
    for a, b in PRON:
        text = re.sub(r'(?<![\w-])' + re.escape(a) + r'(?![\w])', b, text, flags=re.I)
    return text
if __name__ == '__main__':
    import json
    for k, t in json.load(open('vo.json')):
        print(k, spoken(t))

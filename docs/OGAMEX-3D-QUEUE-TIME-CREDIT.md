# Zeitverkürzer für vollständige Warteschlangen

Branch: `codex/ogamex-3d-queue-time-boosters`.

Die ausdrücklich gewünschte Regel ersetzt bei KRAKEN und NEWTRON die bisherige Beschränkung auf den laufenden Auftrag: Alle neun Shop-Zeitverkürzer rechnen ihre Zeit nacheinander auf die bereits vorhandene passende Warteschlange an.

| Gegenstand | Warteschlange | Stufen |
| --- | --- | --- |
| KRAKEN | Gebäude und Anlagen des ausgewählten Planeten/Mondes | 30 Minuten, 2 Stunden, 6 Stunden |
| NEWTRON | Globale Forschungswarteschlange des Spielers, auch mit Folgeaufträgen auf anderen eigenen Planeten | 30 Minuten, 2 Stunden, 6 Stunden |
| DETROID | Schiffs- und Verteidigungsproduktion des ausgewählten Planeten/Mondes | 30 Minuten, 2 Stunden, 6 Stunden |

Beispiel: Der erste Gebäudeauftrag braucht noch sechs Minuten. Bei einem 6-Stunden-KRAKEN werden nur diese sechs Minuten dafür verbraucht; die übrigen fünf Stunden und 54 Minuten werden auf den nächsten Auftrag angewendet und anschließend auf den übernächsten. Reicht das Guthaben nicht für den aktuellen Auftrag, läuft dieser mit seiner verkürzten Restzeit weiter. Sind alle vorhandenen Aufträge zusammen schneller als sechs Stunden, werden alle abgeschlossen. Nach einer leeren Warteschlange wird kein Guthaben für später neu hinzugefügte Aufträge gespeichert.

## Verarbeitung

`QueueAccelerationService` sperrt die bereits eingereihten Aufträge und verarbeitet die aktive Position zuerst. Nach jedem verkürzten Gebäude- oder Forschungsauftrag übernehmen die vorhandenen OGameX-Prozessoren den Abschluss und starten den nächsten Auftrag. Die Schleife setzt erst danach mit dessen tatsächlicher Laufzeit fort. Dadurch gelten weiterhin:

- Rohstoffkosten beim Start jedes Folgeauftrags;
- ursprüngliche Voraussetzungen, Zielfelder und Zielstufen;
- neu berechnete Bauzeiten nach abgeschlossenen Anlagen-Upgrades;
- ursprüngliche Behandlung ungültiger oder unbezahlbarer Folgeaufträge;
- Gebäude- und Forschungsboni sowie die Trennung der eigenen Welten und Warteschlangen.

Nicht startbare Aufträge werden weiterhin nach den Originalregeln abgebrochen. Die Zeit wird dafür nicht verbraucht; ein danach regulär gestarteter Folgeauftrag kann sie nutzen. Es gibt keine fiktive Rohstoffproduktion während der übersprungenen Stunden: Abschlüsse erfolgen zur Aktivierungszeit, nicht in der Zukunft.

DETROID verschiebt weiterhin die Zeitstempel aller bereits bezahlten Werftaufträge gleichmäßig. Start, Ende und Fortschrittszeit werden zusammen angepasst, damit bereits ausgegebene Einheiten nicht erneut vergeben werden und die Restzeit auch innerhalb eines großen Produktionsauftrags korrekt wirkt.

Die vorhandene Premium-Transaktion hält Spieler-, Welten-, Inventar- und Warteschlangensperren bis zum Abschluss. Erst danach werden genau ein Gegenstand abgezogen und die Aktivierung protokolliert. Wiederholungen derselben Anfrage bleiben idempotent; parallele unterschiedliche Anfragen können nur den vorhandenen Inventarbestand verwenden. Ohne laufenden passenden Auftrag bleibt der Gegenstand erhalten. Urlaub und Besitzprüfung bleiben unverändert.

## Oberfläche und Abgrenzung

Shop und Inventar erklären die Anrechnung auf Folgeaufträge auf Deutsch und Englisch. KRAKEN- und NEWTRON-Beschreibungen wurden an die gewünschte Regel angepasst. Das ist eine bewusste Anpassung dieser Installation gegenüber der vorherigen Einzelauftragswirkung. Die direkten DM-Halbieren-/Fertigstellen-Funktionen bleiben unverändert.

Keine Migration, keine Preisänderung und kein Dienstneustart erforderlich. Die bestehende Testinstallation kann den Branch mit dem gewohnten Updatehelfer übernehmen; `main` bleibt unverändert.

## Prüfung

`QueueTimeCreditTest` prüft alle neun Produkte mit je drei Aufträgen, genaue Budgetgrenzen, teilweise beschleunigte Folgeaufträge, Rohstoffabzug, unbezahlbare Aufträge, planetenübergreifende Forschung, teilweise fertige Schiffsmengen, die Abgrenzung anderer Welten und späterer Aufträge sowie wiederholte Aktivierungsanfragen. Ergänzend laufen die vorhandenen Shop-, Gebäude-, Forschungs- und Einheitenwarteschlangentests.

`live3d-queue-credit.browser.mjs` prüft den wirklichen Kauf und Inventar-Button, den Abschluss von drei Bauaufträgen, vier parallele Wiederholungen einer Aktivierung und vier unterschiedliche Aktivierungen bei nur zwei vorhandenen Gegenständen. Letztere dürfen zusammen exakt eine Stunde mit zwei Bronze-NEWTRONs verkürzen. Dafür ein isoliertes Testkonto mit ausreichend Rohstoffen, Metallmine Stufe 6, Forschungslabor Stufe 3 und Energietechnik Stufe 10 verwenden. Der Test kauft Gegenstände und startet Aufträge auf diesem Konto.

Die originalen Race-Condition-Kommandos für Einheitenwarteschlangen und Flottenmissionen werden zusätzlich in der lokalen Entwicklungsumgebung ausgeführt. Interne Docker-Adressen müssen dort vom ausgehenden HTTP-Proxy ausgenommen werden.

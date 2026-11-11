# OGameX-3D v0.5 – variable Planetengrößen und automatische Bebauung

## Arbeitsauftrag
Implementiere einen **voll funktionsfähigen Prototypen v0.5** auf diesem Branch (`codex/ogamex-3d-v0.5`), basierend auf der funktionierenden Version 0.4. Nicht direkt in `main` entwickeln und nichts ohne Freigabe mergen. Prüfe zunächst `docs/OGAMEX-3D.md`, `resources/js/prototype3d/`, die vorhandenen Tests und die OGameX-Planetendaten und -Bauregeln.

## Zentrale Produktentscheidung
Die neue 3D-Ansicht soll **keine Städtebau-Simulation** sein: Gebäude werden **automatisch**, stabil und optisch sinnvoll angeordnet; der Spieler wählt nicht manuell eine Baufläche aus. Der ursprüngliche OGameX-Spielkern (Forschung, Bauen, Baukosten, Baufelder, Rohstoffe, Terraformer usw.) bleibt später maßgeblich.

## Funktionen
1. **Mehrere Demo-Planeten** mit deutlich unterschiedlichen Durchmessern und nutzbaren Baufeldkapazitäten anbieten; auf der 3D-Kugel sollen sich ihre Größe, die Koloniedichte und die jeweils vorhandene Infrastruktur unterscheiden. Beispielwerte explizit als Demodaten kennzeichnen, nicht als OGameX-Regel behaupten.
2. **Baufeldmodell getrennt von grafischen Gebäuden:** OGameX verwendet bereits `Planet.diameter`, `field_current`, `field_max` und `terraformer`. Bisherige 16 geometrische Bauplätze in `catalog.js` sind *nicht* identisch mit 16 Spiel-Baufeldern. Lege im Demo-Provider einen klaren, testbaren Kapazitätszustand und ggf. einen separaten visualisierten Belegungsplan an. Bau-/Ausbauvorgänge sollen nicht über die vorhandenen Felder hinausgehen. Prüfe die existierenden OGameX-Feldregeln zuerst, insbesondere wann ein Ausbau ein Feld beansprucht; erfinde dafür keine produktiven Regeln.
3. **Automatische Platzierung:** Das UI soll künftig den Bautyp auswählen lassen und die Darstellung selbst einen passenden Standort ermitteln; keine obligatorische Liste `plot-01` bis `plot-16`. Bereits vorhandene Anlagen sollen bei neuen Gebäuden und Ausbauten möglichst ihre Position beibehalten. Für Verteidigung mit mehreren gleichen Typen muss die Lösung ebenso funktionieren wie für einmalige Gebäude.
4. **Terraformer:** Als eigenständiger Bestandteil im Demo-Konzept berücksichtigen, sodass eine höhere Kapazität demonstrierbar ist. Für echte Regeln später ausschließlich die serverseitige OGameX-Logik verwenden. Unterscheide verfügbare Baukapazität von physischem Planetendurchmesser.
5. **UI:** Planetenauswahl, Anzeige von Planetendurchmesser, `belegte/maximale Baufelder`, verbleibende Kapazität und nachvollziehbare Fehlermeldungen bei Baugrenzen. Klare deutschsprachige Beschriftungen. Bei bereits laufenden Bauanimationen, Orbitwechsel, Reset und Kamerafokus dürfen keine Daten-/Anzeigefehler entstehen.
6. **Echte WebGL-Anzeige** beibehalten, nicht durch Bilder ersetzen. Verfügbare Modelle, Betriebsanimationen, Baugerüste, Infrastruktur, Orbit-Ansicht und barrierearm reduzierte Animationen aus v0.4 sollen weiter funktionieren. Angemessene Performance auch bei größeren Demo-Planeten.
7. **Architektur:** Demodaten bleiben vom 3D-Renderer getrennt. Bereite ein Provider-Interface vor, mit dem später authentifizierte echte OGameX-Planetendaten geliefert werden können. Keine Änderungen der bestehenden produktiven OGameX-Datenbank, Baukosten- oder Produktionslogik.

## Abnahme
- Bei Auswahl kleiner/mittlerer/großer Demo-Planeten ändern sich Aussehen, Baufelder und Kapazität nachvollziehbar.
- Baumenü benötigt **keine manuelle Platzwahl**.
- Bau und Ausbau respektieren die vorhandene Demo-Kapazitätsgrenze; ohne freie Felder gibt es eine verständliche Meldung.
- Terraformer-Effekt wird getrennt und nachvollziehbar dargestellt.
- Vorhandene 0.4-Funktionen bleiben nutzbar.
- Automatisierte Frontend- und möglichst Browser-Tests für Grenzfälle (z. B. volle Kapazität, deterministische Positionen, Planetenwechsel, Reset und Abbruch) ergänzen und ausführen.

## Ergebnis
- Erstelle die vollständige Version 0.5 samt aktualisierter Dokumentation und **eigenständig offline öffnbarer HTML-ZIP** analog zu `downloads/OGameX-3D-0.4.zip`; die vorhandenen Versionen 0.1–0.4 nicht entfernen.
- Führe relevante Code-/Test-/Browserchecks aus und berichte ehrlich, welche liefen.
- Committe den Code auf dem v0.5-Branch. Erstelle, falls technisch möglich, einen Pull Request **als Entwurf** mit Ziel `main`; wenn die GitHub-API aus Codex gesperrt ist, genügt Branch und Commit-SHA, und der PR wird aus ChatGPT angelegt.
- Mache keine eigenständige Änderung an `main`.

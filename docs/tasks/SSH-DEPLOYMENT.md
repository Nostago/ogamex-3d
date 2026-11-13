# OGameX-3D: Bestehende Installation sicher per SSH aktualisieren

## Verbindliche Korrektur des Auftrags
**Der Nutzer hat bestätigt: OGameX ist auf dem Zielserver BEREITS installiert. Er besitzt einen funktionierenden SSH-Schlüssel.**
Daher **KEINE Neuinstallation**, **KEINE neue Datenbank**, **KEINE neuen Docker-Volumes**, **KEINE neue Standard-Compose-Installation** und keine Änderung an bestehender Domain/Spielwelt, sofern die Bestandsprüfung nicht ausdrückliche Notwendigkeit belegt und die Änderung freigegeben wurde.

Ziel ist ein eigenständig von Codex vorbereiteter, **wiederholbarer, sicherer Deployment-/Updateprozess**, der die bestehende OGameX-Installation inklusive Accounts, Planeten, Ressourcen, Konfiguration und Datenbanken erhält und das neue Live-3D-UI aus `Nostago/ogamex-3d` nutzbar macht. Bot- und Admin-Erweiterungen bleiben separate Entwicklungsbranches und sind noch nicht automatisch Teil eines Rollouts.

Der aktuelle Branch `codex/ogamex-3d-ssh-deployment` basiert auf `codex/ogamex-3d-live-backend`. Arbeite nur hier, keine direkten Änderungen an `main`, kein automatischer Merge.

## Verbindliche Architekturentscheidung des Nutzers (13.11.2026): Nur Codex Cloud, KEIN Mac als Brücke
Der Nutzer hat ausdrücklich festgelegt:
- **Codex Cloud** soll nach einmaliger Konfiguration autonom über SSH die bestehende OGameX-Installation bearbeiten und freigegebene Updates deployen.
- Der Mac darf hierfür **nicht** eingeschaltet bleiben und darf **weder SSH-Bastion, VPN-Gateway noch selbstgehosteter Runner** sein.
- `ssh ogame` ist nur ein funktionierender Zugriff des Nutzers zur einmaligen Diagnose, **kein** Cloud-Zugangsweg.

**Bevorzugte direkte Lösung: Tailscale-VPN für Codex Cloud plus einen dauerhaft laufenden Tailscale-Knoten auf dem OGameX-Server oder einem anderen ohnehin ständig erreichbaren Rechner im Zielnetz.** Die offizielle Dokumentation https://learn.chatgpt.com/docs/environments/cloud-environments beschreibt in aktuellen Codex-Cloud-Umgebungen die Tailscale-Einrichtung in der Umgebungskonfiguration sowie private TCP-/SSH-Verbindungen über `proxy:8088` (HTTP CONNECT). TCP/SSH erfordert einen Proxy-fähigen SSH-Client oder lokalen Forwarder, authentifiziert mit eigenem eingeschränkten SSH-Deploy-Schlüssel, verifiziertem SSH-Hostkey und Tailscale-ACL auf alleinigen Zielport 22. **Keine öffentliche SSH-Portöffnung, keine Mac-Abhängigkeit.**

### Einmalige Infrastrukturvoraussetzungen, von Codex Cloud NICHT selbst beschaffbar
1. Auf dem OGameX-Server prüfen, ob Tailscale mit seinen Container-/Host-Rechten installiert und betrieben werden kann. Der Login `ogamedev` hat möglicherweise keinen `sudo`-Zugriff; auch ein LXC-Container könnte TUN-Anforderungen haben. `command -v tailscale` gab bislang keine Ausgabe. Falls nicht auf diesem Host möglich: ein vorhandenes **dauerhaft eingeschaltetes** Tailscale-Gateway mit restriktiver IPv4-Subnetzroute zu `10.77.0.10/32`. **Nicht** den Mac dafür verwenden.
2. In Codex Cloud **Settings > Codex Cloud > Environments > gewünschte Umgebung > Edit > Tailscale (Stiftsymbol)** eine Tailscale-Verbindung einrichten; hierfür nach offizieller Vorgabe einen geeigneten **Reusable + Ephemeral** Auth-Key sicher im Umgebungsdialog hinterlegen. Save/Publish/Republish und mit neuer Aufgabe testen.
3. Berechtigung nur `Codex-Cloud-Tailscale-Identität -> OGameX-SSH-Ziel-IP:22` erlauben; keine globale Erreichbarkeit des privaten Netzes oder der Docker-Datenbank.
4. Einen separaten, minimal berechtigten **SSH-Deploy-Key** nur für Codex erzeugen. Dessen Public Key mit eingeschränkten Account-Rechten auf dem Host autorisieren. Private Key nur in einem passend geschützten persönlichen oder Umgebungs-Secret von Codex Cloud hinterlegen, **nicht** im Chat/GitHub-Commit/PR/Deployment-Log. In Codex Cloud benötigen SSH-Schlüssel direkte Environment-Variablen/Secret-Delivery; ein HTTPS-Network-Secret ersetzt keine SSH-Authentifizierung.
5. Hostkey des Zielservers über unabhängigen vertrauenswürdigen Weg vorab prüfen; `StrictHostKeyChecking=yes`. SSH durch den von der Plattform geforderten HTTP CONNECT-Proxy `proxy:8088` führen. Verbindung nur dann als eingerichtet melden, wenn eine **echte read-only SSH-Probe aus einer neuen Codex-Cloud-Aufgabe** erfolgreich war.
6. Erst danach Update-Workflow ausführen: Prüfen von Git-Remote und aktiver Compose-Kombination, Backup der Spiel-DB, Build/Test, 3D-Live-UI deployen, Healthchecks, ggf. Code-Rollback (DB nicht blind zurückrollen). Keine neue OGameX-Installation, keine neuen Volumes.

**Fallback nur falls direktes VPN nicht möglich:** Ein GitHub Actions Self-hosted Runner auf einem unabhängig vom Mac ständig erreichbaren vertrauenswürdigen Rechner **in diesem privaten Netzwerk** kann als Deploy-Ausführungsort dienen. Aber nicht ohne ausdrückliche Sicherheitsmaßnahmen/Review untrusted PR-Code auf einem produktiven Host ausführen. Kein externer Standard-GitHub-Runner kann `10.77.0.10` direkt routen. GitHub Actions ist **nicht** mehr die bevorzugte Architektur gegen den Nutzerwunsch nach direktem Cloud-Zugriff.

## Bekannte ältere Bestandsinformationen – NICHT als heutigen Zustand voraussetzen
Frühere Serverausgaben des Nutzers (Stand August 2026) nannten:
- Hostname am Shellprompt: `24fire` (nicht notwendigerweise eine öffentlich auflösbare SSH-Adresse).
- OGameX-Verzeichnis: `/opt/ogamex`.
- Produktions-Compose-Datei: `/opt/ogamex/docker-compose.prod.yml`.
- Compose-Dienste für PHP, Webserver, MariaDB, Scheduler, Queue, Reverb und phpMyAdmin.
- Persistentes Datenbank-Volume: `ogamex_ogame-dbdata`.
- Früherer Serverzugang als `root`; für Automatisierung nach Möglichkeit einen getrennten Deploy-Account mit minimalen Rechten nutzen.
**Vor jeder Änderung alle Angaben und deren Aktualität lesend per SSH bestätigen.** Insbesondere keine Daten oder Volumes mit diesen alten Namen überschreiben, entfernen oder neu initialisieren.

## Bestätigte SSH-Konfiguration des Nutzers (13.11.2026)
Der Nutzer verbindet sich von seinem **Mac** über `ssh ogame`. Ausgabe von `ssh -G ogame | grep -E '^(hostname|user|port) '`: **`user ogamedev`**, **`hostname 10.77.0.10`**, **`port 22`**. Die Adresse `10.77.0.10` ist eine nicht öffentlich routbare RFC1918-IPv4-Adresse. `ogame` ist ein lokaler OpenSSH-Host-Alias, den Codex Cloud und GitHub Actions nicht automatisch kennen. Ein funktionierender persönlicher SSH-Schlüssel liegt beim Nutzer auf dem Mac, **nicht** in der Cloud; keine Schlüssel oder Passwortmaterial im Chat oder Git verlangen.

**Wichtig für die Architekturentscheidung:** Standardmäßig kann ein GitHub-hosted Runner den Zielhost unter `10.77.0.10` nicht erreichen. Bevor Deployment-Workflows SSH-Befehle ausführen, muss der konkrete Netzwerkpfad geprüft werden. Als nächster read-only Mac-Test: `route -n get 10.77.0.10 | grep -E '(gateway|interface):'`, außerdem bei Bedarf `ssh -G ogame | grep -E '^(proxycommand|proxyjump) '`. Die Mac-Ausgabe kann einen LAN-/VPN-Tunnel belegen, ersetzt aber **keinen** erfolgreichen End-to-End-Test vom tatsächlichen Runner aus. Bevorzugte Optionen: (a) explizit eingerichteter, restriktiv auf das Zielnetz beschränkter VPN-Zugang für GitHub Actions; (b) abgesicherter separater Self-hosted Runner im privaten Netz, nicht als frei privilegierter Agent auf Produktionssystem; (c) manueller Bootstrap-Deploy-Schritt, um ein Pull-basiertes Deployment mit geringer Angriffsfläche einzurichten. Keine Freigabe des SSH-Ports ins öffentliche Internet allein für Codex.

Separaten Deploy-Schlüssel mit minimalen Berechtigungen verwenden und dessen öffentlichen Teil am Host autorisieren, privaten Teil ausschließlich als geschütztes Secret der Deploy-Umgebung; Hostkey-Fingerprint gegen vertrauenswürdige Quelle prüfen. Keine Behauptung, der Server sei bereits erreicht oder aktualisiert worden.

## Aktueller lokaler Routing-Befund (13.11.2026)
Der Nutzer hat auf seinem Mac `route -n get 10.77.0.10 | grep -E '(gateway|interface):'` ausgeführt:
```text
gateway: 192.168.178.1
interface: en0
```
Das heißt ausschließlich, dass macOS die Pakete über die lokale Netzwerkschnittstelle `en0` an das Gateway `192.168.178.1` übergibt. Es belegt **weder** einen öffentlich erreichbaren Server **noch** bereits eine spezifische WireGuard-/Tailscale-Verbindung; das weitere Routing liegt am Gateway oder wird durch mögliche SSH-Proxykonfiguration bestimmt. Die tatsächliche Verbindung kann mit einem read-only `ssh ogame`-Befehl und einer Kontrolle auf `ProxyJump`/`ProxyCommand` überprüft werden.

Für diesen privaten Host zunächst den Zugang vom Mac aus verifizieren und dann eine Lösung mit **ausgehender** Verbindung bzw. einem eingeschränkten internen Runner oder genehmigter VPN-Verbindung auswählen, nicht einfach einen GitHub-hosted Runner gegen `10.77.0.10:22` schicken. Die SSH-Schlüssel des Nutzers befinden sich lokal auf seinem Mac und dürfen nicht im Chat/Git veröffentlicht werden.

## Bestätigter SSH-Preflight durch den Nutzer (13.11.2026)
Auf dem Mac wurde erfolgreich `ssh ogame 'hostname; whoami; pwd; ls -ld /opt/ogamex'` ausgeführt. Ergebnis: `hostname=ogame`, `whoami=ogamedev`, `pwd=/home/ogamedev`, und `/opt/ogamex` existiert **auf diesem Zielhost nicht** (`No such file or directory`). Damit gilt die historische Angabe `/opt/ogamex` für diese konkrete SSH-Verbindung als widerlegt; es könnte eine andere Maschine bzw. ein abweichender Installationspfad gewesen sein. **Nicht annehmen, dass OGameX fehlt oder neu installiert werden muss.** Vor Deployment tatsächlichen Code- und Datenbankpfad per lesenden `find`/Docker-Containerinspektionen ermitteln und Nutzerinformation mit diesem Host abgleichen. Der Server wurde bislang nur über den lokalen Mac-SSH-Zugang erreicht, **nicht** direkt von Codex Cloud oder GitHub Actions. Keine Veränderungen an produktiven Dateien vorgenommen.

## Bestätigte OGameX-Installation und Container (13.11.2026)
Der Nutzer hat in seinem Mac-Terminal den read-only SSH-Aufruf `ssh ogame` ausgeführt. Laut Nutzer führt der Login als `ogamedev` direkt in eine containerisierte SSH-/Entwicklungsumgebung. Ergebnis der serverseitigen Verzeichnissuche:
- **Tatsächlicher Quellcode:** `/home/ogamedev/OGameX` (existiert; nicht `/opt/ogamex`).
- `/home/ogamedev/.codex` existiert (dies beweist **nicht**, dass Codex CLI installiert oder autorisiert ist); `/home/ogamedev/MAC-SETUP.md` und `/home/ogamedev/README.md` existieren. Diese können bereits existierende Setup-Anleitungen enthalten. `/home/ogamedev/WEBSITE-LOGIN.txt` enthält möglicherweise Zugangsdaten: **niemals öffnen, ausgeben, protokollieren oder in Chat/Repository kopieren**. Das gleiche gilt für `.ssh`, `.npmrc`, `.env`.
- `docker ps` gelang unter Benutzer `ogamedev` und zeigte:
  - `ogamex-ogamex-webserver-1` / `nginx:alpine` / Up
  - `ogamex-ogamex-scheduler-1` / Up
  - `ogamex-ogamex-reverb-1` / Up
  - `ogamex-ogamex-queue-worker-1` / Up
  - `ogamex-ogamex-app-1` / Up (healthy)
  - `ogamex-ogamex-phpmyadmin-1` / `phpmyadmin` / Up
  - `ogamex-ogamex-db-1` / `mariadb:11.3.2-jammy` / Up
- Container liefen zum Prüfzeitpunkt ca. 24 Stunden. Das beweist **nicht** allein erfolgreiche HTTP-Funktion, Datenbankintegrität oder öffentliches TLS; separat verifizieren.
- Die über `ssh ogame` erreichte Maschine identifizierte sich als Hostname `ogame`, Benutzer `ogamedev`, Home `/home/ogamedev`.
- **Keine Neuinstallation**, kein neues Docker-Projekt, keine neuen Volumes; für alle Deploy-Skripte diesen Projektpfad nach erneuter Prüfung nutzen. Vor Änderungen `git status`, aktive Compose-Datei, reale Container-Volumes, aktuelle Branch-/Commit-Zuordnung und Backups klären.

### Empfohlene nächste rein lesende Prüfung
Auf dem **Mac** folgenden Befehl ausführen und ausschließlich die Ausgabe prüfen:
```sh
ssh ogame 'cd /home/ogamedev/OGameX && printf "=== GIT ===\n" && git status --short && git branch --show-current && git rev-parse --short HEAD && printf "=== COMPOSE ===\n" && ls -l docker-compose*.yml && printf "=== CODEX ===\n" && (command -v codex || true) && printf "=== CONTAINER ===\n" && (test -f /.dockerenv && echo "Docker environment detected" || echo "No /.dockerenv")'
```
**Keine** Ausgabe der `env`, Konfiguration mit Schlüsseln oder sensibler Dateien anfordern. Erst prüfen, ob mit bereits vorhandenem Codex CLI/Cloud-Integrationsweg ein **pull-basiertes** Deployment möglich ist, bevor zusätzlicher SSH-Zugang in GitHub Actions eingerichtet wird. Nutzer möchte möglichst nur eine einmalige Einrichtung und anschließend autonome Updates; ohne erreichbaren Netzwerkkanal und explizit konfigurierte Zugangsdaten kann Codex Cloud den privaten Host nicht direkt erreichen.

## Zusätzliche tatsächliche Bestandsprüfung (13.11.2026, 12:55 UTC)
Der Nutzer hat den nur lesenden SSH-Prüfbefehl im Ordner `/home/ogamedev/OGameX` erfolgreich ausgeführt. Bestätigt:
- `git status --short` hat **keine Einträge** angezeigt, also keine gemeldeten lokalen getrackten/unge-trackten Änderungen (ignorierte Dateien sind dabei nicht erfasst).
- Git-Branch `main`, HEAD-Kurz-SHA `3a6612bd`.
- `docker-compose.prod.yml`, `docker-compose.yml` und eine bestehende **private** `docker-compose.override.yml` sind vorhanden.
- `command -v codex` gibt **nichts** aus: Codex CLI liegt nicht im Standard-PATH.
- Keine `/.dockerenv`-Kennung: dieser SSH-Zugang befindet sich zumindest nicht in einer auf diese Weise erkennbaren Docker-Umgebung.

Wichtige Folgen:
1. Nicht behaupten, dass die Codex-CLI auf dem Server bereits läuft. `.codex`-Ordner allein reicht nicht.
2. **Git-Remote `origin` noch unbekannt.** `main` auf dem Host kann upstream OGameX statt des Forks `Nostago/ogamex-3d` sein; vor Änderungen remotes sicher feststellen. Kein `git pull` aus falschem Remote.
3. **Aktive Compose-Dateienkombination ist noch unbekannt.** Das Vorhandensein einer benutzerspezifischen Override-Datei beweist nicht, dass diese mit der produktiven Compose-Datei geladen wird. Containerlabels `com.docker.compose.project.config_files` und `com.docker.compose.project.working_dir` nur lesend ermitteln. `docker compose config` kann Secrets enthalten und darf nicht ungefiltert ins Chat-Protokoll kopiert werden. Private `docker-compose.override.yml` **nicht** veröffentlichen.
4. Keine Neuinstallation oder ungefragte Änderung der Produktionsdatenbank; sicheren Update-Prozess für die bereits laufenden Dienste vorbereiten.
5. **Nächster sicherer Read-only-Test** auf dem Mac:
```sh
ssh ogame '
cd /home/ogamedev/OGameX || exit 1
printf "=== GIT REMOTE ===\\n"
git remote get-url origin | sed -E "s#(https?://)[^/@]+@#\\1[REDACTED]@#"
printf "=== COMPOSE CONFIG FILES ===\\n"
docker inspect ogamex-ogamex-app-1 --format "{{ index .Config.Labels \\"com.docker.compose.project.config_files\\" }}"
printf "=== COMPOSE WORKDIR ===\\n"
docker inspect ogamex-ogamex-app-1 --format "{{ index .Config.Labels \\"com.docker.compose.project.working_dir\\" }}"
printf "=== TAILSCALE ===\\n"
command -v tailscale || true
'
```
Bei Copy/Paste können Shell-Verschachtelungen von Anführungszeichen problematisch sein; alternativ jeden `docker inspect --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}'`-Befehl separat ausführen. Niemals `.env`, private SSH-Schlüssel oder die Inhalte vertraulicher Dateien ausgeben.

## SSH-Verbindung / Secrets
Die private SSH-Schlüsseldatei des Nutzers liegt auf seinem Gerät; sie ist nicht automatisch in Codex Cloud oder GitHub Actions verfügbar. Keine Aufforderung, sie im Chat oder Repository zu teilen. Bevorzugt einen **separaten auf diesen Host beschränkten Deploy-Schlüssel** auf dem Client erstellen, dessen öffentlichen Teil autorisiert hinterlegen und den privaten Teil ausschließlich als geschütztes Secret eines GitHub Actions Environments verwalten. Wenn bereits ein dedizierter Deploy-Schlüssel vorhanden ist, kann er stattdessen verwendet werden. Zugriff nur auf das nötige Repository/Environment beschränken. Schlüsselrotation dokumentieren.

GitHub Actions ist der bevorzugte SSH-Transport für regulär erreichbare Server: Codex erstellt Workflow/Skripte und prüft sie; der Workflow verbindet sich per SSH. Direkter SSH/TCP-Zugriff von Codex Cloud ist **nicht automatisch gegeben** und erfordert gegebenenfalls VPN/Proxy-Konfiguration. Nicht so tun, als könne Codex ohne hergestellten und geprüften Kanal eine SSH-Verbindung öffnen. Bei nur privater Erreichbarkeit vor Freigabe eine passende sichere VPN-/Runner-Lösung wählen, keine unaufgeforderte SSH-Portfreigabe.

Secrets: `DEPLOY_SSH_KEY`, validierter `DEPLOY_KNOWN_HOSTS`; geschützte Variablen `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH` und ggf. Ziel-Domain. Hostschlüssel-Fingerprint über einen unabhängigen, vertrauenswürdigen Weg vergleichen; niemals `StrictHostKeyChecking=no` oder ungesehenes Vertrauen auf `ssh-keyscan`. Keine Schlüssel/Passwörter/`.env` in Git/Logs/Chat.

## Phase A: Nur lesende Bestandsaufnahme (ohne Downtime)
Nach Einrichtung der einmaligen Verbindung zuerst per SSH verifizieren und protokollieren:
1. System, Rechte, verfügbare Ressourcen, laufende Dienste, Docker-/Compose-Version und tatsächliche Prozesse/Portbindungen.
2. Vorhandene OGameX-Dateien und Git-Status unter dem **ermittelten** Installationspfad (historisch `/opt/ogamex`), tatsächliches Deployment-Ref, uncommittete Serveränderungen, Dateirechte.
3. Aktive Produktions-Compose-Datei, Volumes, Datenbank, Backup-Stand und Speicherplatz, ohne `.env`/Secrets offenzulegen.
4. Domain/HTTPS, Webserver/Reverse Proxy, Registrierung, laufender Login, Datenbank-/Migrationsstatus und Authentifizierung des aktuellen Universums.
5. Prüfen, ob ein Release direkt aus einem Git-Checkout läuft und ob bisherige Anpassungen im Repository fehlen. Keine ungefragte Übernahme von Upstream-Versionen, keine Überschreibung lokaler Dateien.
6. Ausgangszustand der bestehenden Accounts/Planeten/Queues/Flotten für spätere Integritätsvergleiche protokollieren, ohne private Inhalte zu exportieren.

**Stop-Regel:** Bei unklaren Volumes, bestehenden lokalen Änderungen, fehlendem Backup, falschen Zugriffsrechten oder Gefahr für den laufenden Server keine schreibenden Aktionen.

## Phase B: Bestehende Anwendung auf das neue Live-3D-UI aktualisieren
- Die Originalinstallation **in place oder mit explizit dokumentiertem Release-Verzeichnis** sicher aktualisieren; vorhandene Datenbank, Persistent Volumes, `.env`, APP_KEY, Docker-Projektname, Webserverkonfiguration, Domains, Nutzer und realen Spielstand bewahren.
- Basis ist der geprüfte Live-3D-Featurestand. Bot-/Admin-Branches nur nach separater Integration/Tests und explizitem Deployment-Entscheid aufnehmen. Keine unkontrollierten Merges.
- Alle neuen Artefakte (Vite Assets/PHP/3D-Routen) vorher reproduzierbar bauen und testen. Nach Möglichkeit getrennte Staging-Prüfung über Kopie/isolierte Daten ohne aktuelle Produktiv-DB, aber keine zweite öffentliche OGameX-Installation als ungebetenen Ersatz.
- Für einen produktiven Updatevorgang zuerst verifizierbares DB-Backup und gesicherten Ausgangscommit bereitstellen. **Nicht** `docker compose down -v`, keine Datenvolumes löschen und keine laufenden fremden Dienste neu konfigurieren.
- Anwendung bei Bedarf kurz in Wartungsmodus setzen, migrationsbezogene Kompatibilität vorab prüfen; irreversible oder destruktive Migrationen niemals automatisch an Echtdaten ausführen.
- Die vorhandene Compose-Konfiguration respektieren. Niemals Entwicklungsdateien `scripts/codex/install.sh` oder `scripts/codex/start.sh` in Production ausführen; sie enthalten Entwicklungs-DB/Proxyeinstellungen.
- Vorhandene Secrets nicht blind ändern, keine standardisierten `toor`-Beispielpasswörter, `APP_DEBUG=false`; öffentlich zugängliches phpMyAdmin/DB-Ports im Rahmen der Bestandsprüfung identifizieren und Risiken zunächst dokumentieren, nicht unerwartet produktive Zugänge abschalten.
- Deployment muss idempotent, versioniert und nachprüfbar sein; Login, klassisches OGameX, Auth/CSRF, /play-3d, /play-3d/state, PHP-FPM, MariaDB, Scheduler, Queue, Reverb und originale Spielfunktionen prüfen. Kein uneingeschränkter Test mit echten Nutzeraktionen.

## Phase C: Eigenständige Updates aus Codex Cloud über den privaten Tailscale-Zugang (GitHub Actions nur optionaler Fallback)
Entwickle für die **direkte SSH-Ausführung aus Codex Cloud** einen wiederholbaren, geprüften Ablauf mit diesen Modi:
- `preflight`: nur lesende Bestandsaufnahme und Gesundheitsprüfungen;
- `deploy`: nur freigegebene Commits, Vorabtests, Backup, geordneter Deploy, Smoke Tests, dokumentierter Rollback;
- optional `rollback`: kontrollierter Code-Rollback auf vorherigen Stand, ohne Migrationen blind zurückzudrehen.

Geschützte Codex-Cloud-Umgebung mit Tailscale-ACLs und Secret-Variablen sowie enger Branch-/SHA-Zulassung und Sperre gleichzeitiger Deployments. Keine SSH-Secrets bei untrusted PRs. Geschützten Host-Key verifizieren. Bei GitHub-Actions-Fallback zusätzlich ein `ogamex-production` Deployment-Environment verwenden. Logs ohne Secrets, aber mit Commit, Backup-Referenz und Prüfresultaten. Der Nutzer möchte künftig wenig manuelle Bedienung: Codex soll alle **nicht privilegierten Vorarbeiten** eigenständig erledigen; der einmalige Schlüssel-/Zielzugang und die Freigabe eines produktiven Deployments sind notwendige Sicherheitsgrenzen.

## Tests, Dokumentation und Ergebnis
- Dokumentiere vorhandene Serverarchitektur und safe update procedure auf Deutsch, mit Notfall-Rollback.
- Reproduziere und teste den Workflow soweit möglich ohne Produktionszugang; setze keine vorgetäuschten Erfolgsmeldungen ab.
- Ziel ist: vorhandene Installation auf die 3D-Spieloberfläche aktualisiert, historische Spieldaten erhalten, Server erreichbar; Quellcode und tatsächliches Live-Deployment sind getrennt zu verifizieren.
- Ein Draft PR gegen `codex/ogamex-3d-live-backend`, kein Merge ohne Freigabe.
- Falls SSH-Zugang noch nicht bereitgestellt ist: Workflow und Skripte fertigstellen, danach konkrete fehlende Verbindungsvoraussetzungen benennen. **Nicht** behaupten, Codex habe den Server bereits erreicht oder aktualisiert.

## Kurzer Codex-Startauftrag
> Implementiere `docs/tasks/SSH-DEPLOYMENT.md` auf Branch `codex/ogamex-3d-ssh-deployment`. OGameX ist auf dem Server bereits installiert (früher `/opt/ogamex` auf Host `24fire`). Erstelle die sichere SSH-gestützte Update-Automation statt einer Neuinstallation, validiere alle Annahmen read-only, teste alles ohne Zwischenabnahmen und richte den Rollout des Live-3D-UI vor. Keine neue Datenbank, keine neuen Produktionsvolumes und keine ungeprüften Änderungen an echten Accounts.

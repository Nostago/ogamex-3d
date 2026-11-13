# OGameX-3D: Sichere Installation und Updates auf eigenem Server per SSH

## Nutzerziel und Priorität
Codex soll die vorhandene OGameX-3D-Installation auf einem vom Nutzer bereitgestellten Linux-Server **eigenständig per SSH installieren, aktualisieren, prüfen und bei Fehlern kontrolliert zurückrollen können**. Der Nutzer möchte möglichst keine manuellen Kopier-/Befehlsabläufe. Hauptziel bleibt ein nutzbares neues 3D-UI; Bot- und Admin-Featurebranches sind **noch nicht integriert** und dürfen nicht als fertig angenommen werden.

Quellbasis: `Nostago/ogamex-3d`, dieser Deployment-Branch auf `codex/ogamex-3d-live-backend`. Bitte keinen Merge in `main`, bevor Änderungen und produktive Bereitstellung geprüft sind.

## Technische Realität Codex Cloud
Die aktuelle Codex-Cloud-Dokumentation (https://learn.chatgpt.com/docs/environments/cloud-environments) beschreibt SSH/TCP-Zugriff aus der Cloud über konfiguriertes Tailscale-VPN, IPv4-Routen und einen HTTP-CONNECT-Proxy `proxy:8088`. Eine bloße Domain-Freigabe oder ein HTTP-Network-Secret für Port 443 ergibt **keinen normalen TCP/SSH-Kanal**. Nicht behaupten, eine direkte SSH-Verbindung aus Codex Cloud funktioniere ungeprüft.

**Bevorzugte Lösung für gewöhnliche öffentliche SSH-Server:** Codex erstellt in diesem Repository einen **sicheren GitHub-Actions-Deployment-Workflow**, der bei expliziter Anforderung und nur nach den nötigen Freigaben einen SSH-Zugriff auf den Host nutzt. Codex kann Code, Tests und Deploymentvorbereitung autonom bearbeiten; der GitHub Actions Runner führt die SSH-Befehle aus. GitHub Environment `ogamex-staging` und später `ogamex-production` mit getrennten Secrets, Berechtigungsschutz und sinnvoller Branchbeschränkung. SSH-Daten im Repository werden nur als Variablennamen referenziert. Workflows nicht auf untrusted PRs mit Secrets laufen lassen. Production Deploy nur bei expliziter Nutzerfreigabe. Verwende möglichst GitHub-eigene Standardwerkzeuge (openssh-client) statt fremder Actions ohne Pinning.

**Falls der Host nur über ein privates Heimnetz erreichbar ist:** Verbindungen und Sicherheitsanforderungen prüfen. Sinnvolle Alternativen (vom Codex-Agenten nach Evidenz wählen): ein vom Nutzer genehmigtes Tailscale-GitHub-Actions-Setup mit restriktiven ACLs; Tailscale-Anbindung der Codex-Cloud-Umgebung falls für das Konto verfügbar; oder ein abgesicherter Self-Hosted-Runner/Agent auf der Zielmaschine mit expliziter Freigabe. **Keine heimliche oder unnötige globale SSH-Portöffnung.**

## Vorbedingungen / benötigte Informationen
Ohne geheime Daten im Chat/Repo den SSH-Zielhost, Port, SSH-Benutzernamen, öffentliche URL/Subdomain und Ziel-Umgebung (staging/production) erfahren. Falls vorhanden, Pfad und Zustand einer alten OGameX-Installation erkennen. Zugangsdaten als GitHub Actions **Environment Secrets** (z. B. `DEPLOY_SSH_KEY`) ablegen. `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH` als passend geschützte Environment Variables; verbindlichen SSH-Hostkey-Fingerprint als `DEPLOY_KNOWN_HOSTS` oder vorher verifizierten `known_hosts`-Eintrag bereitstellen. Keine Passwörter/Private Keys in Logs, `git`, Shell-History oder Chatnachrichten. Keinen SSH-Hostkey unvalidiert über `ssh-keyscan` akzeptieren; `StrictHostKeyChecking=no` verboten. Privater Deploy-Schlüssel muss spezifisch für die Bereitstellung sein und minimale Rechte haben. Sichere Aufbewahrung/Rotation dokumentieren.

## Schritt 1 – Nur lesende Bestandsaufnahme vor jeder Installation
Per abgesichertem SSH zunächst nur prüfen: OS/Architektur, Benutzerrechte, RAM/CPU/Plattenplatz, Docker/Compose, vorhandene Webserver/Reverse Proxy/Ports, bestehende Spielserver/Container, Firewall/SSH, freie Ressourcen, OGameX-Checkout und Git-Status, Datenbank-Volumes und Backups, Domain/TLS, DNS, bestehende OGameX-Konfiguration. **Keine Änderung**, solange unklar ist, ob bereits produktive Dienste dort laufen. Ergebnis knapp dokumentieren. Falls Kollisionen/Backups/Ressourcenprobleme auftreten, vor riskantem Eingriff stoppen.

## Schritt 2 – Sichere Zielarchitektur
- Bestehendes OGameX-README lesen: offizieller Produktionsweg ist `docker-compose.prod.yml`, mit Laravel 13/PHP 8.5, MariaDB, Nginx, Scheduler, Queue, Reverb (und Rust/FFI).
- Niemals `scripts/codex/install.sh` oder `scripts/codex/start.sh` unbesehen gegen Produktionsdaten ausführen: sie sind ausschließlich für isolierte Cloud-Entwicklung gedacht.
- Keine unsicheren Produktionsvorlagen übernehmen: Standarddatenbankpasswort `toor` ersetzen, Applikations-/DB-/Reverb-Schlüssel einzigartig erzeugen, `APP_ENV=production`, `APP_DEBUG=false`, nur HTTPS. Standard-PhpMyAdmin **nicht öffentlich**, am besten deaktivieren. Keine öffentliche MariaDB-Anbindung. Dienste/Ports gezielt an Loopback oder interne Compose-Netze binden.
- Bei vorhandenen Diensten standardmäßig **separates Compose-Projekt und eigene Volumes** unter eigenem Verzeichnis verwenden; vorhandene Dienste auf 80/443 nicht überschreiben. Wenn ein geeigneter Reverse Proxy existiert, OGameX auf lokalen Port 127.0.0.1:... binden und über die vereinbarte Domain mit gültigem TLS/HTTP->HTTPS-Rewrite bereitstellen. Existierende nginx/Apache/andere Gameserver-Konfigurationen nicht ungefragt verändern.
- Eindeutig zwischen `staging` und `production` trennen. Keine stillschweigende Migration/Übernahme einer fremden Datenbank.
- Assets mit reproduzierbarem Lockfile-Build; PHP-Dependencies mit gesperrten Versionen. Nutze `npm ci`/`composer install` passend zur bestehenden Architektur, kein unkontrolliertes Update.
- Bei Rollout der Live-3D-Oberfläche zwingend Login/CSRF, `/play-3d` und `/play-3d/state` mit autorisiertem Testkonto verifizieren. Erreichbarkeit der klassischen Oberfläche sicherstellen.
- Scheduler/Queue/Reverb müssen laufen und kontrollierbar sein. Laravel `APP_KEY` und Volumes dürfen bei Updates nicht neu erstellt/gelöscht werden.

## Schritt 3 – Automatisierung und Deploy-Rollback
1. GitHub Actions Workflow mit manueller Auslösung (`workflow_dispatch`), Umgebungsschranken und parametrisierbarem **festem Commit-SHA**, statt automatisch jedes experimentelle Codex-Branch-Update live zu schalten. Wiederholbare SSH-Preflight-/Install-/Update-/Verify- und Rollback-Skripte im Repository.
2. Installation muss **idempotent** sein: erneutes Ausführen verändert nur erlaubte Artefakte, nicht alte Accounts/Datenbanken.
3. Vor jedem datenverändernden Update: Datenbank-Backup plus sichere Metadaten zu Dateistand/.env (Secrets nicht im CI-Artifact veröffentlichen) auf dem Server, restriktive Zugriffsrechte und Aufbewahrung. Restore-Prozedur tatsächlich in Testumgebung prüfen. Achtung: Rollback von Datenbankmigrationen nicht blind automatisch durchführen; vor irreversiblen Migrationen stoppen.
4. Deploy per versioniertem Release-Verzeichnis oder gleichwertig atomarer Commit-Versionierung, Health Checks/Smoke Tests, automatische Rücknahme auf vorherigen Code bei fehlgeschlagenem Health Check. Keine `docker compose down -v`, kein `rm -rf` auf unbestätigten Pfaden, keine Änderung fremder Docker-Stacks.
5. Logs/Zustand (Spezifikation, ausgewählter Commit, Komponenten, Health Checks, Backup-ID, Deploymentergebnis) maschinen- und menschenlesbar liefern. Keine Secrets in Workflow-Ausgaben.
6. Für GitHub Actions GitHub-Umgebungssecrets und ggf. Required Reviewers nach https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments nutzen.
7. Trenne `deploy:prepare` (lokal ohne Serververänderung), `deploy:preflight` (SSH read-only), `deploy:staging` (staging), `deploy:production` (nur nach explizitem Approval), `deploy:rollback` (auf abgesicherten vorherigen Stand) oder sinnvolle funktionale Äquivalente.
8. Server darf nicht durch Build-lastige parallele Jobs überlastet werden; wenn nötig Assets/Container vorbauen und signierte Images/Artefakte verteilen.

## Test- und Abnahmekriterien
- SSH-Verbindung nur via korrekt validiertem Host-Key und dafür vorgesehenem Deploy-Account; Credentials nie in Ausgaben/Git.
- Staging-Installation erreichbar, TLS korrekt (sofern Domain verfügbar), Start/Login funktioniert, realer 3D-Client `/play-3d` erreichbar, originale OGameX-Oberfläche weiterhin verfügbar.
- Migrationsstatus/DB, PHP-FPM, MariaDB, Nginx, Scheduler, Queue und WebSocket-Handshake geprüft.
- Ausgewählte relevanten Featuretests/Browsertests (separater Testaccount, nicht mit Echtdaten) bestanden; Browser-Screenshots optional.
- Wiederholter Deploy identisch; bewusst fehlerhafter Release löst geordneten Rollback aus, DB-Daten bleiben erhalten.
- Bot/Admin-Funktionen **nicht** vorgeben, produktiv aktiv zu sein, solange separate Branches nicht integriert und getestet wurden.
- Nicht versehentlich eine öffentlich erreichbare Installation mit Standard-Admin-/Testkonten oder Debug-/PhpMyAdmin-Zugang veröffentlichen. Keine öffentlichen Registrierungen vor Freigabe öffnen.
- Dokumentation in Deutsch mit minimalem einmaligem Setup (Github Secrets, DNS, SSH-Deployuser), Notfallzugang, Backup und Restore.

## Was Codex selbständig leisten und wo es stoppen soll
- Repository untersuchen, sicheren Workflow und Skripte entwickeln, lokal/CI testen, alle unkritischen Automatisierungsschritte eigenständig ausführen und einen einzigen Draft Pull Request gegen `codex/ogamex-3d-live-backend` vorbereiten.
- **Sobald die einmalige SSH-Verbindung und Zielinformationen bereitstehen:** lesenden Preflight ausführen, gefundene Ressourcen prüfen, dann **nach ausdrücklicher Zustimmung zur Staging-Installation** eine isolierte Instanz installieren und testen. Die ausdrückliche Zustimmung des Nutzers, dass Codex OGameX installieren soll, ist gegeben, aber **nicht** die Zustimmung, bestehende Dienste/Daten zu löschen oder bestehende produktive OGameX-Instanzen zu ersetzen.
- Keine stillschweigende öffentliche Produktivinstallation oder DNS-/Firewalländerung, solange die genauen Folgen nicht aus der Bestandsaufnahme geklärt sind.
- Ergebnis als einheitlichen Statusbericht liefern: Hostvoraussetzungen, installierter Commit, URL, Gesundheit, Tests, Admin-Erstanmeldung, Deployment-/Rollback-Anleitung, offene Punkte. Niemals erfolgreiche Installation behaupten, bevor dies auf dem echten Host verifiziert wurde.

## Kurzer Codex-Ausführungsauftrag
> Lies `docs/tasks/SSH-DEPLOYMENT.md`. Implementiere vollständig den sicheren GitHub-Actions-gestützten SSH-Deploy-Ablauf, prüfe unsere bestehende OGameX-3D-Live-Architektur und starte mit einem lesenden Server-Preflight, sobald die SSH-Umgebungssecrets verfügbar sind. Selbstständig installieren und testen, falls isoliertes Staging sicher möglich und freigegeben ist. Keine Eingriffe in andere Dienste und keine ungeprüfte Produktivschaltung. Entwickle ausschließlich auf `codex/ogamex-3d-ssh-deployment` und erstelle einen Draft PR.

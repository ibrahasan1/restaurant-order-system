# 🚀 Installationsanleitung

## 1. Server vorbereiten

### Ubuntu Server installieren
1. Ubuntu Server 24.04 LTS herunterladen: https://ubuntu.com/download/server
2. Auf USB-Stick flashen (z.B. mit Balena Etcher)
3. Auf dem Mini-PC installieren
4. SSH aktivieren bei der Installation

### Node.js installieren
```bash
# Node.js 20 LTS installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Überprüfen
node -v    # Sollte v20.x.x zeigen
npm -v     # Sollte 10.x.x zeigen
```

### Git installieren
```bash
sudo apt install git
```

## 2. Projekt einrichten

```bash
# Repository klonen
cd /home/$USER
git clone https://github.com/DEIN-USERNAME/restaurant-order-system.git
cd restaurant-order-system

# Setup ausführen
chmod +x scripts/*.sh
./scripts/setup.sh
```

## 3. Statische IP vergeben

### Am Server
```bash
sudo nano /etc/netplan/01-network.yaml
```

Inhalt:
```yaml
network:
  version: 2
  wifis:
    wlan0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      access-points:
        "DEIN-WLAN-NAME":
          password: "DEIN-WLAN-PASSWORT"
```

```bash
sudo netplan apply
```

### Im Router
Alternativ: Im Router eine feste IP für die MAC-Adresse des Servers vergeben.

## 4. Produktion starten

```bash
# Client bauen + Server mit PM2 starten
./scripts/start-production.sh
```

## 5. Autostart einrichten

```bash
# PM2 Autostart bei Systemstart
pm2 startup
# Den angezeigten Befehl mit sudo ausführen
pm2 save
```

## 6. Geräte einrichten

### Auf jedem Gerät
1. Verbinde mit dem WLAN
2. Öffne Chrome/Safari
3. Navigiere zu:
   - Kellner: `http://192.168.1.100:3000/waiter`
   - Küche: `http://192.168.1.100:3000/kitchen`
   - Bar: `http://192.168.1.100:3000/bar`
4. Tippe auf "Zum Startbildschirm hinzufügen"

### Tablet-Einstellungen (Küche/Bar)
- Display-Timeout: Nie / Maximale Dauer
- Helligkeit: Maximum
- Lautstärke: Hoch (für Benachrichtigungstöne)
- Browser-Kiosk-Modus aktivieren (optional)

## 7. Tägliches Backup einrichten

```bash
# Cron-Job für tägliches Backup um 3:00 Uhr
crontab -e
# Folgende Zeile hinzufügen:
0 3 * * * /home/$USER/restaurant-order-system/scripts/backup.sh
```

## 8. Monitoring

```bash
# Server-Status
pm2 status

# Logs anzeigen
pm2 logs restaurant-api

# System-Monitor
pm2 monit
```

## Fehlerbehebung

### Server nicht erreichbar
```bash
# Ist der Server aktiv?
pm2 status

# Server-IP prüfen
ip addr show

# Port offen?
sudo ss -tlnp | grep 3000
```

### Geräte verbinden sich nicht
1. Gleiches WLAN-Netzwerk?
2. Richtige IP-Adresse?
3. Firewall prüfen: `sudo ufw allow 3000`

### Datenbank zurücksetzen
```bash
npm run db:init
npm run db:seed
```

# 📡 API-Dokumentation

Base URL: `http://SERVER-IP:3000/api`

## Menü

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/menu` | Komplette Speisekarte (gruppiert nach Kategorie) |
| GET | `/menu?all=true` | Inkl. nicht verfügbare Items |
| GET | `/menu/categories` | Alle Kategorien |
| GET | `/menu/search?q=text` | Menü durchsuchen |
| GET | `/menu/:id` | Einzelnes Item |
| POST | `/menu/categories` | Kategorie erstellen |
| POST | `/menu/items` | Menü-Item erstellen |
| PUT | `/menu/items/:id` | Item aktualisieren |
| PUT | `/menu/items/:id/toggle` | Verfügbarkeit umschalten |

## Bestellungen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/orders` | Neue Bestellung erstellen |
| GET | `/orders` | Alle aktiven Bestellungen |
| GET | `/orders/kitchen` | Küchen-Bestellungen |
| GET | `/orders/bar` | Bar-Bestellungen |
| GET | `/orders/table/:id` | Bestellungen eines Tischs |
| GET | `/orders/:id` | Einzelne Bestellung |
| PUT | `/orders/:id/status` | Status ändern |
| GET | `/orders/today` | Heutige Bestellungen |
| GET | `/orders/today/stats` | Tagesstatistiken |

## Tische

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/tables` | Alle Tische (mit Bestellanzahl) |
| GET | `/tables/:id` | Einzelner Tisch |
| POST | `/tables` | Tisch erstellen |
| PUT | `/tables/:id/status` | Status ändern |

## Health Check

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/health` | Serverstatus + Verbindungszähler |

## WebSocket Events

### Client → Server

| Event | Daten | Beschreibung |
|-------|-------|--------------|
| `device:register` | `{role, name, deviceId}` | Gerät anmelden |
| `order:create` | `{table_id, target, items, notes}` | Bestellung aufgeben |
| `order:updateStatus` | `{orderId, status}` | Status ändern |
| `order:cancel` | `{orderId}` | Stornieren |
| `orders:getActive` | `{target?}` | Aktive Bestellungen laden |
| `ping` | — | Heartbeat |

### Server → Client

| Event | Daten | Beschreibung |
|-------|-------|--------------|
| `device:registered` | `{id, role, name}` | Registrierung bestätigt |
| `order:new` | Order-Objekt | Neue Bestellung |
| `order:statusUpdate` | `{orderId, status, order}` | Status-Update |
| `order:ready` | `{orderId, tableNumber, target}` | Bestellung fertig |
| `order:cancelled` | `{orderId, orderNumber}` | Stornierung |
| `order:created` | `{orderId, orderNumber}` | Bestätigung für Kellner |
| `sound:play` | `{type}` | Sound-Signal |
| `device:list` | `{devices, count}` | Geräteliste (Admin) |
| `server:shutdown` | `{message}` | Server fährt herunter |

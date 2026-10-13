# DCE Bus Tracking — Raspberry Pi 5 Hardware, Automotive Power, RFID Attendance & 4G Multi-Bus Deployment Guide

## 1. Hardware Inventory & Missing Components Identification

### Currently Available Hardware (Per Bus)
- **Compute Unit:** Raspberry Pi 5 (4 GB RAM) running Raspberry Pi OS (64-bit Bookworm)
- **GPS Receiver:** u-blox NEO-6M GPS module with external active ceramic patch antenna (`MP510_GPS_V02_WWXL` PCB)
- **Cabin Speaker:** Bus announcement speaker
- **Cellular Uplink:** 4G LTE modem with active SIM/data plan
- **Primary Power Source:** Bus electrical battery (12V or 24V automotive lead-acid system)

### Missing Hardware Required Before Physical Bus Installation
Because the Raspberry Pi 5, passive cabin speaker, and raw 12V/24V bus battery cannot be wired directly without interface and protection electronics, the following components must be procured per bus:

| Component | Recommended Specification | Purpose |
| :--- | :--- | :--- |
| **1. Automotive DC-DC Buck Converter (USB-C PD)** | Input: **9V–36V DC** (supports both 12V and 24V buses) -> Output: **5.1V DC @ 5A (25W) USB-C PD** | Steps down raw vehicle voltage cleanly without triggering Pi 5 under-voltage throttling. |
| **2. Automotive Fuse Holder + TVS Protection** | **5A Automotive Blade Fuse** inline on $+12\text{V}/+24\text{V}$ input + **36V bidirectional TVS Diode** (e.g., `SMBJ36CA` / `1.5KE36CA`) + Schottky reverse-polarity diode | Protects against alternator load-dump spikes ($+80\text{V}$ to $+120\text{V}$), starter motor cranking dips, and short circuits. |
| **3. Safe Ignition Shutdown Controller / UPS HAT** | Automotive Ignition Sense Relay / Pi 5 UPS HAT (or optocoupler from Ignition `ACC` line to `GPIO 17`) | Detects when the driver turns off the bus key (`ACC` OFF) and executes `sudo poweroff` before cutting 5V power, preventing microSD/NVMe corruption. |
| **4. USB Audio DAC + 12V Class-D Cabin Amplifier** | **USB Audio Adapter** (CM108 / PCM2902) + **12V/24V Class-D Mono/Stereo Amplifier** (e.g., TPA3116D2 50W) | **Critical:** The Raspberry Pi 5 **does NOT have a 3.5mm analog audio jack**, and GPIO pins cannot drive a speaker directly. |
| **5. Student Identification Reader** | **13.56 MHz Mifare USB HID RFID Reader** (primary) OR **USB 2D QR Barcode Desktop Scanner** (alternative) | Reads student ID cards (`RFID-XXXXXXXX` or `QR-DCE-XXXX`) via plug-and-play USB `/dev/input/event*` or `/dev/ttyACM0`. |

---

## 2. Safe Vehicle Battery Power & Ignition Shutdown Architecture

> **WARNING:** Never connect a 12V or 24V bus battery directly to the Raspberry Pi 5 USB-C port or 5V GPIO header. Doing so will immediately destroy the Raspberry Pi.

```text
[Bus Battery +12V / +24V] ──► [5A Inline Blade Fuse] ──► [TVS Surge Protector + Reverse Polarity Diode]
                                                                    │
                                                                    ▼
[Bus Chassis Ground (GND)] ───────────────────────────► [9V-36V to 5.1V 5A Automotive Buck Converter]
                                                                    │
                                                                    ▼
                                                        [Raspberry Pi 5 USB-C Power Port]
```

### Safe Shutdown on Bus Ignition Off
1. Connect the bus **Constant Battery ($B+$)** through the 5A fuse to the DC-DC converter input.
2. Connect the bus **Ignition Accessory ($ACC$)** line through an optocoupler (e.g., PC817 with $4.7\text{k}\Omega$ series resistor) to **Raspberry Pi 5 Pin 11 (`GPIO 17`)** with internal pull-up.
3. When the driver turns off the ignition key, `GPIO 17` transitions state; after a 30-second debounce (to ignore brief engine restarts), the Pi flushes the SQLite queue (`PRAGMA wal_checkpoint(FULL)`) and issues a clean shutdown.

---

## 3. NEO-6M (`MP510_GPS_V02_WWXL`) UART Wiring to Raspberry Pi 5

The `MP510_GPS_V02_WWXL` board includes an onboard 3.3V LDO regulator on `VCC`, and its `TXD`/`RXD` pins operate at **3.3V CMOS logic**, which is directly compatible with the Raspberry Pi 5 40-pin header.

| NEO-6M (`MP510_GPS_V02_WWXL`) Pin | Raspberry Pi 5 Physical Pin | GPIO / Function | Notes |
| :--- | :--- | :--- | :--- |
| **VCC** | **Pin 1** (`3.3V`) or **Pin 2** (`5V`) | Power Supply | Pin 1 (`3.3V`) or Pin 2 (`5V` via onboard LDO) |
| **GND** | **Pin 6** (`GND`) | Common Ground | Must share common ground with Pi 5 |
| **TXD** (Module Transmit) | **Pin 10** (`GPIO 15 / RXD0`) | Pi UART Receive | **Cross-over:** Module `TXD` -> Pi `RXD0` |
| **RXD** (Module Receive) | **Pin 8** (`GPIO 14 / TXD0`) | Pi UART Transmit | **Cross-over:** Module `RXD` -> Pi `TXD0` |
| **PPS** (Pulse Per Second) | **Pin 12** (`GPIO 18`) *(Optional)* | 1Hz Timing Pulse | Flashes at 1Hz once 3D satellite lock is achieved |

### Enabling UART0 on Raspberry Pi 5 (`Bookworm`)
Add the following lines to `/boot/firmware/config.txt` and reboot:
```ini
dtparam=uart0=on
enable_uart=1
```
Remove `console=serial0,115200` from `/boot/firmware/cmdline.txt` so the Linux kernel serial login console does not conflict with the NEO-6M NMEA stream on `/dev/ttyAMA0` (9600 baud).

---

## 4. 4G LTE Modem Inspection & Automatic Reconnection on Raspberry Pi OS

Different 4G USB modems and HATs expose different Linux network interfaces:
- **HiLink / CDC-ECM USB Modems (e.g., Huawei E3372h-320):** Appear as a USB Ethernet interface (`eth1` or `usb0`) with an onboard NAT router (`192.168.8.1`).
- **QMI / MBIM Modems (e.g., SIM7600E-H, Quectel EC25):** Appear as `wwan0` + `/dev/cdc-wdm0` managed via `ModemManager` and `NetworkManager`.
- **Legacy Serial Modems:** Use PPP over `/dev/ttyUSB2`.

### Step 1: Inspect Connected Modem on Raspberry Pi OS
```bash
lsusb
ip link show
mmcli -L
nmcli device status
```

### Step 2: Configure Persistent Auto-Reconnect via `NetworkManager`
For QMI/MBIM modems (`wwan0` / `cdc-wdm0`):
```bash
sudo nmcli connection add type gsm ifname "*" con-name "dce-4g-uplink" apn "airtelgprs.com"
sudo nmcli connection modify "dce-4g-uplink" connection.autoconnect yes
sudo nmcli connection modify "dce-4g-uplink" connection.autoconnect-retries 0
sudo nmcli connection up "dce-4g-uplink"
```
Setting `connection.autoconnect-retries 0` instructs `NetworkManager` to retry infinitely whenever the bus passes through cellular dead-zones. Meanwhile, `pi_bus_agent` stores all GPS fixes and RFID taps in its local SQLite database (`pending_gps` and `pending_attendance`) and synchronizes them with exponential backoff once the link recovers.

---

## 5. Central Server Production Deployment (PostgreSQL + HTTPS)

1. **PostgreSQL Database Configuration:**
   Set `DATABASE_URL=postgresql+psycopg2://dce_user:STRONG_PASSWORD@localhost:5432/dce_transit` in `/etc/dce-transit/backend.env`. SQLAlchemy automatically creates all tables (`buses`, `routes`, `stops`, `gps_history`, `bus_latest_locations`, `students`, `attendance_records`, `devices`, `audit_logs`).
2. **Authorized Remote Reachability Over 4G:**
   - **Option A (Recommended — Zero Open Firewall Ports):** Use **Cloudflare Tunnel (`cloudflared`)** or **Tailscale VPN** between the central college server and each bus Raspberry Pi 5.
   - **Option B (Reverse Proxy with TLS):** Run **Caddy** or **Nginx** in front of `uvicorn` (`127.0.0.1:5000`) with automatic Let's Encrypt TLS certificates (`https://transit.dce.edu.in`). Never expose port `5000` or PostgreSQL port `5432` directly to the public internet.
3. **Installing the Raspberry Pi Systemd Service:**
   ```bash
   sudo mkdir -p /opt/dce-bus-agent /etc/dce-bus-agent /var/lib/dce-bus-agent
   sudo cp -r pi_bus_agent /opt/dce-bus-agent/
   sudo cp pi_bus_agent/agent.env.example /etc/dce-bus-agent/agent.env
   sudo chmod 600 /etc/dce-bus-agent/agent.env
   sudo cp pi_bus_agent/dce-bus-agent.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now dce-bus-agent.service
   ```

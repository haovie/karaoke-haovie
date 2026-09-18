# Hướng dẫn cấu hình và Deploy Karaoke Haovie — Chi tiết từ A-Z

Tài liệu này tổng hợp toàn bộ quy trình cấu hình, build, deploy bằng Docker Compose trên Ubuntu/EC2, kèm chẩn đoán chi tiết cho từng lỗi đã gặp trong quá trình triển khai thực tế.

> **Môi trường tham chiếu:** Ubuntu trên EC2 `ip-172-26-2-193`, IP public `18.142.10.223`, thư mục deploy `/opt/karaoke-haovie`, Docker + Docker Compose v2.

---

## 1. Tổng quan kiến trúc

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| `apps/web` | React + Vite, build ra static, serve bằng `nginx:alpine` | Giao diện TV/Remote, SPA |
| `apps/server` | Node 20 + Express + Socket.IO | REST API (`/api/*`), WebSocket (`/socket.io/*`), YouTube Data API |
| `packages/shared` | TypeScript + Zod | Types/schemas dùng chung |
| `docker-compose.yml` | 2 service: `server` và `web` | Orchestrate |

Luồng request khi chạy Docker:

```
Browser -> Nginx (web:80) -> /api/*, /socket.io/, /healthz -> server:3001
                         -> / (static) -> /usr/share/nginx/html
```

File quan trọng:

- [docker-compose.yml](docker-compose.yml) — định nghĩa 2 service
- [apps/web/Dockerfile](apps/web/Dockerfile) — multi-stage: deps → build (Vite) → runtime (nginx:alpine, `EXPOSE 80`)
- [apps/server/Dockerfile](apps/server/Dockerfile) — multi-stage: deps → build (`tsc`) → runtime (`node:20-alpine`, `EXPOSE 3001`)
- [apps/web/nginx.conf](apps/web/nginx.conf) — `listen 80;`, proxy `/api/`, `/socket.io/`, `/healthz` về `http://server:3001`
- [.env.example](.env.example) — template biến môi trường

---

## 2. Yêu cầu hệ thống

- Ubuntu 22.04 / 24.04 (EC2 AMI tương đương)
- Docker Engine ≥ 24, Docker Compose v2 (`docker compose` — không phải `docker-compose`)
- Node.js ≥ 18 + pnpm ≥ 9 (chỉ cần nếu build local, không cần khi build bằng Docker)
- YouTube Data API v3 key

Cài Docker trên Ubuntu (nếu chưa có):

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# đăng nhập lại để nhận group docker
```

---

## 3. Chuẩn bị mã nguồn trên server

```bash
sudo mkdir -p /opt/karaoke-haovie
sudo chown $USER:$USER /opt/karaoke-haovie
cd /opt/karaoke-haovie

# Cách 1: clone từ git
git clone <repo-url> .

# Cách 2: copy từ máy local (ví dụ dùng scp/rsync)
# scp -r ./karaoke/* ubuntu@18.142.10.223:/opt/karaoke-haovie/
```

---

## 4. Cấu hình biến môi trường

```bash
cp .env.example .env
nano .env
```

Nội dung `.env` khi deploy production trên EC2 (ví dụ):

```env
PORT=3001
PUBLIC_BASE_URL=http://18.142.10.223:8080
YOUTUBE_API_KEY=AIza..._key_thật_của_bạn
CORS_ORIGIN=http://18.142.10.223:8080
SEARCH_CACHE_TTL=21600000
```

Giải thích:

| Biến | Ý nghĩa | Lưu ý |
|---|---|---|
| `PORT` | Port server lắng nghe trong container | Luôn là `3001` khớp `EXPOSE 3001` và `nginx.conf` |
| `PUBLIC_BASE_URL` | URL public mà browser/phone gọi tới | **Phải là IP/domain public, không phải localhost**. Build-time `ARG VITE_PUBLIC_BASE_URL` trong `apps/web/Dockerfile` sẽ bake vào JS |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | Tạo tại console.cloud.google.com → APIs & Services → Library → YouTube Data API v3 → Enable → Credentials → Create API key |
| `CORS_ORIGIN` | Origin cho phép CORS | Để `http://18.142.10.223:8080` hoặc `*` nếu muốn nới lỏng (không khuyến nghị prod) |
| `SEARCH_CACHE_TTL` | TTL cache tìm kiếm (ms) | Mặc định 6h |

> **Quan trọng:** `VITE_PUBLIC_BASE_URL` là build-arg, nên mỗi lần đổi `PUBLIC_BASE_URL` phải rebuild image web: `docker compose build web` hoặc `docker compose up -d --build`.

---

## 5. Cấu hình `docker-compose.yml` — chọn port host

File gốc:

```yaml
services:
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    expose:
      - "3001"
    environment:
      - PORT=3001
      - PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost}
      - SEARCH_CACHE_TTL=${SEARCH_CACHE_TTL:-21600000}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3001/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}
    ports:
      - "80:80"
    depends_on:
      server:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:80/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

Ý nghĩa `ports: - "HOST:CONTAINER"`:

- `80:80` = host port 80 → container port 80 (nginx `listen 80`)
- Nếu host port 80 đã bị chiếm, đổi thành `8080:80` (host 8080 → container 80). **Không đổi thành `8080:8080`** vì container không hề nghe 8080.

Quyết định:

- **Chỉ có 1 dự án trên server:** giữ `80:80`, truy cập `http://18.142.10.223`
- **Có nhiều dự án chung server/IP:** đổi karaoke sang `8080:80`, truy cập `http://18.142.10.223:8080`

Sửa:

```bash
nano docker-compose.yml
# đổi dòng ports của web thành:
#   ports:
#     - "8080:80"
```

---

## 6. Build và chạy

```bash
cd /opt/karaoke-haovie
sudo docker compose up -d --build
```

Kiểm tra:

```bash
sudo docker compose ps
# web phải là healthy hoặc running, server healthy
sudo docker compose logs --tail=50
sudo docker compose logs --tail=50 web
sudo docker compose logs --tail=50 server
```

Test ngay trên server:

```bash
# healthcheck nội bộ container
sudo docker exec karaoke-haovie-web-1 wget -qO- http://127.0.0.1:80/ | head -20
sudo docker exec karaoke-haovie-server-1 wget -qO- http://127.0.0.1:3001/healthz

# qua published port trên host
curl -i http://127.0.0.1:8080      # nếu dùng 8080:80
# hoặc
curl -i http://127.0.0.1:80        # nếu dùng 80:80
```

Nếu `curl` trả `200 OK` là Docker đã OK, vấn đề còn lại chỉ là firewall/network.

---

## 7. Mở firewall

### 7.1 UFW (Ubuntu firewall)

```bash
sudo ufw status verbose
# Nếu Status: active và Default deny incoming thì phải allow port đang dùng

sudo ufw allow 8080/tcp   # nếu dùng 8080:80
# hoặc
sudo ufw allow 80/tcp     # nếu dùng 80:80

# 443 chỉ cần nếu có HTTPS
sudo ufw allow 443/tcp
sudo ufw status
```

### 7.2 AWS Security Group (EC2)

Bắt buộc, độc lập với UFW:

1. AWS Console → EC2 → Instances → chọn instance `18.142.10.223` → tab **Security** → click Security Group
2. **Inbound rules** → **Edit inbound rules** → **Add rule**
3. Thêm rule:

| Type | Protocol | Port range | Source | Mô tả |
|---|---|---:|---|---|
| Custom TCP | TCP | `8080` | `0.0.0.0/0` | Karaoke web |
| Custom TCP | TCP | `8080` | `::/0` | IPv6 (nếu VPC có IPv6) |

4. Save rules

> Nếu dùng `80:80` thì rule là port `80` thay vì `8080`. Port trong Security Group luôn là **host port** (bên trái dấu `:`).

---

## 8. Kiểm tra truy cập public

```bash
# từ máy local hoặc phone cùng internet
curl -i http://18.142.10.223:8080
# mở browser: http://18.142.10.223:8080
```

Nếu vẫn không vào được, đi tới phần 9 để chẩn đoán.

---

## 9. Tổng hợp lỗi đã gặp — nguyên nhân và cách khắc phục

### Lỗi 1: `failed to bind host port 0.0.0.0:80/tcp: address already in use`

**Log đầy đủ:**

```
Error response from daemon: failed to set up container networking: driver failed
programming external connectivity on endpoint karaoke-haovie-web-1 (...):
failed to bind host port 0.0.0.0:80/tcp: address already in use
```

**Nguyên nhân:**

- Một tiến trình khác trên host đã chiếm port 80. Thường là một container Docker khác, hoặc nginx/apache cài trực tiếp trên host, hoặc một dự án khác cũng map `80:80`.
- Nhiều dự án có thể chung địa chỉ IP, nhưng **không thể chung host port**. Mỗi host port chỉ bind cho 1 container/tiến trình tại một thời điểm.
- Không liên quan đến trùng IP giữa các dự án.

**Chẩn đoán:**

```bash
sudo ss -ltnp '( sport = :80 )'
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}'
# tìm dòng có 0.0.0.0:80->...
```

**Cách khắc phục — 3 phương án:**

**A. Đổi host port cho karaoke (khuyến nghị khi muốn giữ cả 2 dự án chạy):**

```yaml
# docker-compose.yml -> web.ports
ports:
  - "8080:80"
```

```bash
cd /opt/karaoke-haovie
sudo docker compose down
sudo docker compose up -d
# truy cập http://18.142.10.223:8080
# nhớ mở 8080 ở UFW + Security Group
```

**B. Dừng dự án đang chiếm port 80 (chỉ khi dự án kia không cần chạy):**

```bash
sudo docker stop <container-name-dang-chiem-80>
# hoặc nếu là nginx host:
sudo systemctl stop nginx
cd /opt/karaoke-haovie && sudo docker compose up -d
```

**C. Dùng reverse proxy chung (khi muốn cả 2 dự án cùng chạy trên port 80, phân biệt bằng domain):**

- Chỉ 1 reverse proxy (nginx) bind port 80 trên host
- Các app chỉ expose nội bộ, ví dụ `127.0.0.1:8080:80` và `127.0.0.1:8081:80`
- Reverse proxy route theo `server_name` (domain)

```
karaoke.example.com -> 127.0.0.1:8080
other.example.com   -> 127.0.0.1:8081
```

---

### Lỗi 2: Đã đổi sang `8080` nhưng vẫn không truy cập được `http://18.142.10.223:8080`

**Triệu chứng:** `docker compose ps` cho thấy container running, nhưng browser báo timeout / không kết nối được.

**Nguyên nhân thực tế trong case này:** Có 2 lớp firewall chặn, cần mở cả 2:

1. **UFW** trên Ubuntu đang `Status: active`, `Default: deny (incoming)` nhưng chỉ allow `22,80,443` — thiếu `8080`.
2. **AWS Security Group** inbound rules chưa có rule cho `8080`.

Chỉ mở 1 trong 2 là chưa đủ — request phải đi qua cả Security Group (AWS) rồi mới tới UFW (OS).

**Chẩn đoán:**

```bash
sudo ufw status verbose
# Thấy thiếu 8080/tcp

# test nội bộ bypass firewall
curl -i http://127.0.0.1:8080
# nếu trả 200 thì Docker OK, vấn đề là firewall/network
```

**Cách khắc phục:**

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

Và trong AWS Console thêm inbound rule `Custom TCP 8080 0.0.0.0/0` như mục 7.2.

---

### Lỗi 3: `curl: (56) Recv failure: Connection reset by peer` khi gọi `http://127.0.0.1:8080`

**Log quan sát được:**

```bash
$ sudo docker inspect karaoke-haovie-web-1 --format '{{json .NetworkSettings.Ports}}'
{"80/tcp":null,"8080/tcp":[{"HostIp":"0.0.0.0","HostPort":"8080"}]}

$ sudo docker exec karaoke-haovie-web-1 nginx -T 2>/dev/null | grep listen
    listen 80;

$ curl -i http://127.0.0.1:8080
curl: (56) Recv failure: Connection reset by peer

# nhưng gọi trực tiếp IP container lại OK:
$ curl -i http://172.20.0.3:80
HTTP/1.1 200 OK
```

**Nguyên nhân:**

Mapping port bị sai thứ tự. Docker đang publish `host 8080 -> container 8080`:

```json
"8080/tcp": [{"HostPort":"8080"}]
```

Nhưng nginx trong container chỉ `listen 80`, không có gì nghe ở `8080`. Docker nhận kết nối ở host 8080, forward vào container port 8080 — nơi không có service — nên kết nối bị reset.

Healthcheck trong log vẫn `200` vì healthcheck chạy **bên trong container** (`wget http://127.0.0.1:80/`), không đi qua published port.

**Cách khắc phục:**

Sửa `docker-compose.yml` — thứ tự đúng là `HOST:CONTAINER`:

```yaml
# SAI:
ports:
  - "8080:8080"
# hoặc
ports:
  - "80:8080"

# ĐÚNG:
ports:
  - "8080:80"
```

Áp dụng:

```bash
nano docker-compose.yml
# sửa thành "8080:80"

cd /opt/karaoke-haovie
sudo docker compose up -d --force-recreate web

# xác nhận
sudo docker inspect karaoke-haovie-web-1 --format '{{json .NetworkSettings.Ports}}'
# phải ra: {"80/tcp":[{"HostIp":"0.0.0.0","HostPort":"8080"}]}

sudo docker port karaoke-haovie-web-1
# phải ra: 80/tcp -> 0.0.0.0:8080

curl -i http://127.0.0.1:8080
# phải ra HTTP/1.1 200 OK
```

> **Mẹo nhớ:** `EXPOSE` trong Dockerfile và `listen` trong `nginx.conf` quyết định **container port** (bên phải). Host port (bên trái) là port bạn muốn người dùng gõ trên URL.

---

### Lỗi 4 (liên quan): Healthcheck `200` nhưng published port không hoạt động

**Hiểu lầm thường gặp:** Thấy log `127.0.0.1 - - [...] "GET / HTTP/1.1" 200` nghĩ là app đã sẵn sàng public.

**Thực tế:** Đó là healthcheck nội bộ (`test: ["CMD", "wget", "-qO-", "http://127.0.0.1:80/"]`) chạy trong network namespace của container, không chứng minh published port hoạt động. Phải kiểm tra riêng:

```bash
# 1. Container tự gọi chính nó (bypass published port)
sudo docker exec karaoke-haovie-web-1 wget -qO- http://127.0.0.1:80/

# 2. Host gọi qua published port
curl -i http://127.0.0.1:8080

# 3. Host gọi trực tiếp IP container (bypass published port, đi qua docker bridge)
sudo docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' karaoke-haovie-web-1
curl -i http://<container-ip>:80

# 4. Kiểm tra mapping
sudo docker port karaoke-haovie-web-1
sudo docker inspect --format '{{json .NetworkSettings.Ports}}' karaoke-haovie-web-1
sudo ss -ltnp '( sport = :8080 )'
```

Nếu (1) và (3) OK nhưng (2) fail → sai mapping hoặc docker-proxy lỗi. Nếu (2) OK nhưng public IP fail → firewall/Security Group.

---

## 10. Checklist chẩn đoán nhanh

Khi không truy cập được, chạy lần lượt:

```bash
cd /opt/karaoke-haovie

# 1. Container có chạy không?
sudo docker compose ps
sudo docker inspect karaoke-haovie-web-1 --format 'status={{.State.Status}} restart={{.RestartCount}}'

# 2. Mapping port đúng chưa?
sudo docker port karaoke-haovie-web-1
sudo docker inspect --format '{{json .NetworkSettings.Ports}}' karaoke-haovie-web-1
# kỳ vọng: 80/tcp -> 0.0.0.0:8080 (nếu dùng 8080:80)

# 3. Nginx trong container nghe đúng port chưa?
sudo docker exec karaoke-haovie-web-1 nginx -T 2>/dev/null | grep -E 'listen|server_name'

# 4. Container tự phục vụ được không?
sudo docker exec karaoke-haovie-web-1 wget -qO- http://127.0.0.1:80/ | head -20

# 5. Host gọi qua published port được không?
curl -i http://127.0.0.1:8080

# 6. Host có đang listen port đó không?
sudo ss -ltnp '( sport = :8080 )'

# 7. UFW có chặn không?
sudo ufw status verbose

# 8. Log lỗi?
sudo docker compose logs --tail=100 web
sudo docker compose logs --tail=100 server
sudo docker events --since 10m --until 0s --filter container=karaoke-haovie-web-1

# 9. AWS Security Group đã mở inbound cho host port chưa?
# Kiểm tra trong Console: EC2 -> Instances -> Security -> Inbound rules
```

---

## 11. Các lệnh vận hành thường dùng

```bash
cd /opt/karaoke-haovie

# xem trạng thái
sudo docker compose ps
sudo docker compose logs -f              # follow tất cả
sudo docker compose logs -f web
sudo docker compose logs -f server

# restart
sudo docker compose restart
sudo docker compose restart web

# rebuild sau khi đổi .env hoặc code
sudo docker compose up -d --build
sudo docker compose up -d --build --force-recreate

# chỉ rebuild 1 service
sudo docker compose build web
sudo docker compose up -d --force-recreate web

# dừng / xóa
sudo docker compose down
sudo docker compose down -v              # kèm xóa volumes (cẩn thận)

# kiểm tra tài nguyên
sudo docker stats --no-stream
df -h
```

---

## 12. Lưu ý khi chạy nhiều dự án chung server

- Mỗi Compose project nên ở thư mục riêng (`/opt/karaoke-haovie`, `/opt/other-project`) — Compose tự tạo network riêng theo tên thư mục.
- Không để 2 project cùng map 1 host port. Dùng port khác nhau (`8080`, `8081`, ...) hoặc reverse proxy chung.
- Đặt `container_name` tường minh nếu muốn `docker ps` dễ đọc, hoặc để Compose tự đặt `<folder>-<service>-1`.
- Khi đổi host port, nhớ đồng bộ 3 nơi: `docker-compose.yml` → `UFW` → `AWS Security Group`, và thông báo URL mới cho người dùng.

---

## 13. Gỡ lỗi nâng cao (khi các bước trên chưa đủ)

```bash
# kiểm tra iptables do Docker tạo
sudo iptables -L -n -v | head -60
sudo iptables -t nat -L -n -v | grep 8080

# kiểm tra docker-proxy còn sống không
ps aux | grep docker-proxy

# thử publish trên IP cụ thể thay vì 0.0.0.0
# docker-compose.yml: "127.0.0.1:8080:80" rồi test curl 127.0.0.1:8080

# kiểm tra xem có service host nào chiếm port không
sudo lsof -i :8080
sudo ss -ltnp
```

---

*Tài liệu được tổng hợp từ quá trình deploy thực tế ngày 2026-09-18, bao gồm toàn bộ lỗi đã gặp và cách xử lý đã xác minh trên server EC2.*
